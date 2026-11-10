// AI Mesang - Client Script
var API = "/api";
var WS_URL = "ws://" + window.location.host + "/ws";
var $ = function(s) { return document.querySelector(s); };
var S = {uid:null,email:"",uname:"",isAdmin:false,isVerified:false,chats:[],chat:null,msgs:[],users:[],ws:null,typing:false,tTO:null,bio:"",birth_date:"",members:[]};

// ── Auth ──
$("#authUsername").addEventListener("input",checkAuth);
$("#authPassword").addEventListener("input",checkAuth);
$("#authUsernameReg").addEventListener("input",checkAuth);
$("#authEmailReg").addEventListener("input",checkAuth);
$("#authPasswordReg").addEventListener("input",checkAuth);

function checkAuth() {
    var u1 = $("#authUsername").value.trim();
    var p1 = $("#authPassword").value;
    $("#authLogin").disabled = !u1 || !p1;
    var u2 = $("#authUsernameReg").value.trim();
    var p2 = $("#authPasswordReg").value;
    $("#authReg").disabled = !u2 || !p2;
}

// Toggle between login and registration
$("#toggleMode").addEventListener("click", function() {
    $("#authUsername").parentElement.classList.add("hidden");
    $("#authPassword").parentElement.classList.add("hidden");
    $("#authLogin").classList.add("hidden");
    $("#toggleMode").classList.add("hidden");
    $("#authError").parentElement.querySelector("h2").textContent = "Регистрация";
    $("#regSection").classList.remove("hidden");
});

$("#backToLogin").addEventListener("click", function() {
    $("#authUsername").parentElement.classList.remove("hidden");
    $("#authPassword").parentElement.classList.remove("hidden");
    $("#authLogin").classList.remove("hidden");
    $("#toggleMode").classList.remove("hidden");
    $("#authError").parentElement.querySelector("h2").textContent = "Вход";
    $("#regSection").classList.add("hidden");
});

$("#authLogin").addEventListener("click", function() {
    showAuthError("");
    var username = $("#authUsername").value.trim();
    var pass = $("#authPassword").value;
    fetch(API + "/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username: username, password: pass})
    }).then(function(r) {
        if (!r.ok) return r.json().then(function(d) { throw new Error(d.detail); });
        return r.json();
    }).then(function(data) {
        S.uid = data.id;
        S.email = data.email || "";
        S.uname = data.username || data.email;
        S.isAdmin = data.is_admin;
        S.isVerified = data.is_verified;
        loadProfile().then(function() { showApp(); });
    }).catch(function(e) { showAuthError(e.message); });
});

$("#authReg").addEventListener("click", function() {
    showAuthError("");
    var username = $("#authUsernameReg").value.trim();
    var email = $("#authEmailReg").value.trim();
    var pass = $("#authPasswordReg").value;
    fetch(API + "/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username: username, password: pass, email: email})
    }).then(function(r) {
        if (!r.ok) return r.json().then(function(d) { throw new Error(d.detail); });
        return r.json();
    }).then(function(data) {
        S.uid = data.id;
        S.email = data.email || "";
        S.uname = username;
        loadProfile().then(function() { showApp(); });
    }).catch(function(e) { showAuthError(e.message); });
});

function showAuthError(msg) {
    var e = $("#authError");
    e.textContent = msg;
    e.style.display = msg ? "block" : "none";
}

// ── App ──
function loadProfile() {
    return fetch(API + "/me?user_id=" + S.uid).then(function(r) { return r.json(); }).then(function(me) {
        S.uname = me.username || S.uname;
        S.email = me.email || "";
        S.bio = me.bio || "";
        S.birth_date = me.birth_date || "";
        updateMyAvatar(me.avatar);
        updateBadges();
    });
}

function showApp() {
    $("#authScreen").classList.add("hidden");
    $("#msgScreen").classList.remove("hidden");
    $("#myName").textContent = S.uname;
    connectWS();
    fetchChats();
}

function updateMyAvatar(avatar) {
    var el = $("#myAvatar");
    if (avatar) {
        el.innerHTML = '<img src="' + avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
    } else {
        el.textContent = S.uname[0].toUpperCase();
    }
}

function updateBadges() {
    var badge = $("#myBadge");
    if (S.isAdmin) badge.innerHTML = "🛡️";
    else if (S.isVerified) badge.innerHTML = "✓";
    else badge.textContent = "";
    if (S.isAdmin) $("#adminPanelBtn").style.display = "flex";
}

// ── WebSocket ──
function connectWS() {
    if (S.ws) S.ws.close();
    var ws = new WebSocket(WS_URL + "/" + S.uid);
    S.ws = ws;
    ws.onmessage = function(e) {
        var d = JSON.parse(e.data);
        if (d.type === "new_message") {
            if (S.chat && d.chat_id === S.chat.id) {
                S.msgs.push(d.message);
                renderMsgs();
            }
            fetchChats();
        } else if (d.type === "user_typing" && S.chat && d.chat_id === S.chat.id) {
            showTyping("Кто-то печатает...");
        }
    };
    ws.onclose = function() { setTimeout(function() { if (S.uid) connectWS(); }, 1500); };
}

// ── Chats ──
function fetchChats() {
    fetch(API + "/chats?user_id=" + S.uid).then(function(r) { return r.json(); }).then(function(chats) {
        S.chats = chats;
        renderChats();
    }).catch(function(e) { console.error(e); });
}

function renderChats() {
    var list = $("#chatList");
    if (!S.chats.length) {
        list.innerHTML = '<div class="empty-chats"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Начните общение</p></div>';
        return;
    }
    list.innerHTML = S.chats.map(function(c) {
        var isAI = c.type === "ai";
        return '<div class="chat-item ' + (S.chat && S.chat.id === c.id ? 'active' : '') + (isAI ? ' ai-chat' : '') + '" data-id="' + c.id + '">' +
            '<div class="avatar">' + (isAI ? '🤖' : (c.name ? c.name[0].toUpperCase() : "?")) + '</div>' +
            '<div class="chat-info"><div class="chat-name">' + esc(c.name || "Чат") + '</div><div class="chat-preview">' + esc(c.last_message || "Начните общение") + '</div></div>' +
            '<div class="chat-meta">' + (c.last_message_time ? fmt(c.last_message_time) : "") + '</div>' +
            '</div>';
    }).join("");
    list.querySelectorAll(".chat-item").forEach(function(el) {
        el.onclick = function() { openChat(S.chats.find(function(c) { return c.id == el.dataset.id; })); };
    });
}

// ── Open Chat ──
function openChat(c) {
    if (!c) return;
    S.chat = c;
    $("#noChat").classList.add("hidden");
    $("#chatView").classList.remove("hidden");
    $("#cTitle").textContent = c.name || "Чат";
    $("#cAvatar").textContent = (c.name || "?")[0].toUpperCase();
    hideTyping();
    var isAI = c.type === "ai";
    $("#cStatus").textContent = isAI ? "AI-помощник" : "онлайн";
    if (isAI) {
        $("#cAvatar").textContent = "🤖";
        $("#cAvatar").style.background = "linear-gradient(135deg,#06b6d4,#6366f1)";
    } else {
        $("#cAvatar").style.background = "";
    }
    fetch(API + "/chats/" + c.id + "/messages").then(function(r) { return r.json(); }).then(function(msgs) {
        S.msgs = msgs;
        renderMsgs();
    }).catch(function(e) { console.error(e); });
    
    // Загружаем участников чата
    fetchMembers(c.id);
}

function fetchMembers(chatId) {
    fetch(API + "/chats/" + chatId + "/members").then(function(r) { return r.json(); }).then(function(members) {
        S.members = members;
        renderMembers(members);
    }).catch(function(e) { console.error("Members error:", e); });
}

function renderMembers(members) {
    var container = $("#membersList");
    var countEl = $("#membersCount");
    if (!container) return;
    if (countEl) countEl.textContent = members.length;
    container.innerHTML = members.map(function(m) {
        return '<div class="member-item">' +
            (m.avatar ? '<img src="' + m.avatar + '" class="member-avatar">' : '<div class="member-avatar">' + (m.username || m.email)[0].toUpperCase() + '</div>') +
            '<div class="member-info">' +
            '<span class="member-name">' + esc(m.username || m.email) + '</span>' +
            (m.is_admin ? '<span class="badge badge-admin">🛡️</span>' : '') +
            (m.is_verified ? '<span class="badge badge-verified">✓</span>' : '') +
            '</div></div>';
    }).join("");
}

// ── Messages ──
function renderMsgs() {
    var container = $("#msgContainer");
    container.innerHTML = S.msgs.map(function(m) {
        var isAI = m.sender_id === 0 || m.username === "AI Assistant";
        return '<div class="message ' + (m.sender_id === S.uid ? 'outgoing' : '') + (isAI ? ' ai-message' : '') + '">' +
            (m.sender_id !== S.uid && m.sender_id !== 0 ? '<div class="sender-avatar">' + (m.username || "?")[0].toUpperCase() + '</div>' : "") +
            '<div class="message-bubble"><div class="message-content">' + esc(m.content) + '</div><div class="message-time">' + fmt(m.timestamp) + '</div></div>' +
            '</div>';
    }).join("");
    var mc = $("#msgContainer");
    mc.scrollTop = mc.scrollHeight;
}

function sendMsg() {
    var t = $("#msgInput").value.trim();
    if (!t || !S.chat) return;
    
    // Отправляем через REST API (надёжнее)
    fetch(API + "/chats/" + S.chat.id + "/messages", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({content: t})
    }).then(function(r) { return r.json(); }).then(function(data) {
        // Обновляем сообщения
        if (data.ai_reply) {
            S.msgs.push(data.message, data.ai_reply);
        } else {
            S.msgs.push(data.message);
        }
        renderMsgs();
        fetchChats(); // Обновляем превью в списке
        $("#msgInput").value = "";
        $("#sendBtn").disabled = true;
    }).catch(function(e) { console.error("Send error:", e); });
}

$("#sendBtn").addEventListener("click", sendMsg);
$("#msgInput").addEventListener("input", function() {
    $("#sendBtn").disabled = !$("#msgInput").value.trim();
});
$("#msgInput").addEventListener("keydown", function(e) {
    if (e.key === "Enter") sendMsg();
});

function showTyping(text) {
    var el = $("#typingIndicator");
    $("#typingText").textContent = text;
    el.style.display = "block";
    setTimeout(hideTyping, 2500);
}
function hideTyping() { $("#typingIndicator").style.display = "none"; }

// ── Modal ──
function closeModal() { $("#modalOverlay").classList.add("hidden"); }
$("#modalOverlay").addEventListener("click", function(e) {
    if (e.target === $("#modalOverlay")) closeModal();
});

// ── Profile Modal ──
$("#profileBtn").addEventListener("click", function() {
    var modal = $("#modalContent");
    var avatarHtml = S.uname[0].toUpperCase();
    modal.innerHTML = '<h3>👤 Профиль</h3>' +
        '<div class="profile-header"><div class="profile-avatar" id="profileAvatar">' +
        avatarHtml + '<div class="avatar-overlay">📷</div></div>' +
        '<input type="file" id="avatarInput" accept="image/*" style="display:none" onchange="handleAvatar(event)">' +
        '<div class="profile-name">' + esc(S.uname) + '</div>' +
        '<div class="profile-badges">' + (S.isAdmin ? '<span class="badge badge-admin">🛡️ Админ</span>' : '') +
        (S.isVerified ? '<span class="badge badge-verified">✓ Верифицирован</span>' : '') +
        (!S.isAdmin && !S.isVerified ? '<span class="badge" style="color:var(--text3)">Обычный пользователь</span>' : '') + '</div></div>' +
        '<div class="input-group"><input type="text" id="profBio" placeholder="О себе..." value="' + esc(S.bio) + '"></div>' +
        '<div class="input-group"><input type="date" id="profBirth" value="' + S.birth_date + '"></div>' +
        '<button class="btn-primary" id="profSave">💾 Сохранить</button>' +
        '<button class="btn-secondary" onclick="closeModal()">Закрыть</button>';
    $("#modalOverlay").classList.remove("hidden");
    $("#profSave").onclick = function() {
        var bio = $("#profBio").value.trim();
        var birth = $("#profBirth").value;
        fetch(API + "/profile?user_id=" + S.uid, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({bio: bio, birth_date: birth})
        }).then(function() { closeModal(); alert("✅ Сохранено!"); }).catch(function() { alert("Ошибка!"); });
    };
});

function handleAvatar(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        var base64 = ev.target.result;
        fetch(API + "/profile?user_id=" + S.uid, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({avatar: base64})
        }).then(function() { updateMyAvatar(base64); closeModal(); alert("✅ Аватарка обновлена!"); }).catch(function() { alert("Ошибка!"); });
    };
    reader.readAsDataURL(file);
}

// ── Search Users ──
$("#searchBtn").addEventListener("click", function() {
    var modal = $("#modalContent");
    modal.innerHTML = '<h3>👥 Найти пользователя</h3>' +
        '<input type="text" id="sInput" placeholder="Имя пользователя..." autocomplete="off">' +
        '<div class="user-list" id="uList"><div class="no-results">Начните вводить имя</div></div>' +
        '<button class="btn-secondary" onclick="closeModal()">Закрыть</button>';
    $("#modalOverlay").classList.remove("hidden");
    var inp = $("#sInput"), list = $("#uList");
    inp.focus();
    var tTO2;
    inp.addEventListener("input", function() {
        clearTimeout(tTO2);
        tTO2 = setTimeout(function() {
            var q = inp.value.trim();
            if (!q) { list.innerHTML = '<div class="no-results">Начните вводить имя</div>'; return; }
            fetch(API + "/users?q=" + encodeURIComponent(q) + "&user_id=" + S.uid)
                .then(function(r) { return r.json(); }).then(function(us) {
                if (!us.length) { list.innerHTML = '<div class="no-results">Не найдено</div>'; return; }
                list.innerHTML = us.map(function(u) {
                    return '<div class="user-item" data-uid="' + u.id + '">' +
                        '<div class="avatar sm">' + (u.username || u.email)[0].toUpperCase() + '</div>' +
                        '<div><span class="admin-username">' + esc(u.username || u.email.split("@")[0]) + '</span>' +
                        '<span class="admin-email">' + esc(u.email) + '</span></div>' +
                        (u.is_verified ? '<span class="verified-badge">✓</span>' : '') +
                        (u.is_admin ? '<span class="admin-badge">🛡️</span>' : '') +
                        '</div>';
                }).join("");
                list.querySelectorAll(".user-item").forEach(function(el) {
                    el.onclick = function() {
                        var uid = parseInt(el.dataset.uid);
                        fetch(API + "/chats?user_id=" + S.uid, {
                            method: "POST",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify({name: "Чат", member_ids: [uid]})
                        }).then(function() { fetchChats(); }).catch(function(e) { console.error(e); });
                    };
                });
            }).catch(function(e) { console.error(e); });
        }, 300);
    });
    inp.onkeydown = function(e) { if (e.key === "Enter") inp.dispatchEvent(new Event("input")); };
});

// ── New Chat ──
$("#newChatBtn").addEventListener("click", function() {
    $("#modalContent").innerHTML = '<h3>✨ Новый чат</h3>' +
        '<input type="text" id="ncName" placeholder="Название чата">' +
        '<div class="modal-actions"><button onclick="closeModal()">Отмена</button><button id="ncCreate">Создать</button></div>';
    $("#modalOverlay").classList.remove("hidden");
    $("#ncName").focus();
    $("#ncCreate").onclick = function() {
        var n = $("#ncName").value.trim();
        if (!n) return;
        fetch(API + "/chats?user_id=" + S.uid, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name: n})
        }).then(function() { closeModal(); fetchChats(); }).catch(function(e) { console.error(e); });
    };
    $("#ncName").onkeydown = function(e) { if (e.key === "Enter") $("#ncCreate").click(); };
});

// ── Admin Panel ──
$("#adminPanelBtn").addEventListener("click", function() {
    fetch(API + "/admin/stats?user_id=" + S.uid)
        .then(function(r) { return r.json(); }).then(function(stats) {
        return fetch(API + "/admin/users?user_id=" + S.uid).then(function(r2) { return r2.json(); }).then(function(users) {
            var userList = users.map(function(u) {
                return '<div class="admin-user-row">' +
                    '<div class="avatar sm">' + (u.username || u.email)[0].toUpperCase() + '</div>' +
                    '<div class="admin-user-info"><span class="admin-username">' + esc(u.username || u.email.split("@")[0]) + '</span>' +
                    '<span class="admin-email">' + esc(u.email) + '</span></div>' +
                    '<div class="admin-badges">' + (u.is_verified ? '<span class="verified-badge">✓</span>' : '') +
                    (u.is_admin ? '<span class="admin-badge">🛡️</span>' : '') +
                    (u.is_banned ? '<span style="color:var(--red)">🚫</span>' : '') + '</div>' +
                    '<div class="admin-user-actions">' +
                    (u.is_verified ? '<button class="btn-sm btn-verify" onclick="doAdmin(' + u.id + ',\'toggle_verify\')" title="Снять верификацию">✗</button>' :
                        '<button class="btn-sm btn-verify" onclick="doAdmin(' + u.id + ',\'toggle_verify\')" title="Верифицировать">✓</button>') +
                    (u.is_admin ? '<button class="btn-sm btn-admin" onclick="doAdmin(' + u.id + ',\'toggle_admin\')" title="Снять админку">✗</button>' :
                        '<button class="btn-sm btn-admin" onclick="doAdmin(' + u.id + ',\'toggle_admin\')" title="Сделать админом">🛡️</button>') +
                    (u.is_banned ? '<button class="btn-sm btn-verify" onclick="doAdmin(' + u.id + ',\'toggle_ban\')" title="Разбанить">🔓</button>' :
                        '<button class="btn-sm btn-ban" onclick="doAdmin(' + u.id + ',\'toggle_ban\')" title="Забанить">🚫</button>') +
                    '</div></div>';
            }).join("");
            $("#modalContent").innerHTML = '<h3>🛡️ Панель администратора</h3>' +
                '<div class="admin-stats">' +
                '<div class="stat-card"><span class="stat-number">' + stats.users + '</span><span class="stat-label">Пользователи</span></div>' +
                '<div class="stat-card"><span class="stat-number">' + stats.chats + '</span><span class="stat-label">Чаты</span></div>' +
                '<div class="stat-card"><span class="stat-number">' + stats.messages + '</span><span class="stat-label">Сообщения</span></div>' +
                '<div class="stat-card"><span class="stat-number">' + stats.verified + '</span><span class="stat-label">Верифицированы</span></div>' +
                '<div class="stat-card"><span class="stat-number">' + stats.admins + '</span><span class="stat-label">Админы</span></div>' +
                '<div class="stat-card"><span class="stat-number">' + stats.banned + '</span><span class="stat-label">Заблокированы</span></div>' +
                '</div>' +
                '<h4 style="margin:16px 0 8px">Пользователи (' + users.length + ')</h4>' +
                '<div class="admin-users-list">' + (userList || '<div class="no-results">Нет пользователей</div>') + '</div>' +
                '<button class="btn-secondary" id="adminClose">Закрыть</button>';
            $("#modalOverlay").classList.remove("hidden");
            $("#adminClose").onclick = closeModal;
        });
    }).catch(function(e) { console.error(e); });
});

function doAdmin(targetId, action) {
    if (action === "toggle_ban" && !confirm("Заблокировать пользователя?")) return;
    fetch(API + "/admin/action?user_id=" + S.uid, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({action: action, target_id: targetId})
    }).then(function() { $("#adminPanelBtn").click(); }).catch(function(e) { console.error(e); });
}

// ── Shorts ──
var shorts = [
    {id:1, title:"Как создать мессенджер", author:"AI Mesang", color:"#6366f1"},
    {id:2, title:"10 лайфхаков для программирования", author:"CodeMaster", color:"#8b5cf6"},
    {id:3, title:"Тренды 2024 года", author:"TrendWatch", color:"#ec4899"},
    {id:4, title:"Смешные коты 🐱", author:"CatLover", color:"#f59e0b"},
    {id:5, title:"Как выучить Python за неделю", author:"PythonPro", color:"#10b981"},
    {id:6, title:"Лучшие мемы недели", author:"MemeKing", color:"#ef4444"}
];
var currentShort = 0;

function showShorts() {
    $("#chatView").classList.add("hidden");
    $("#noChat").classList.add("hidden");
    $("#shortsView").classList.remove("hidden");
    renderShorts();
}

function hideShorts() {
    $("#shortsView").classList.add("hidden");
    if (S.chat) {
        $("#chatView").classList.remove("hidden");
    } else {
        $("#noChat").classList.remove("hidden");
    }
}

function renderShorts() {
    var container = $("#shortsContainer");
    container.innerHTML = shorts.map(function(s, i) {
        return '<div class="shorts-item ' + (i === currentShort ? 'active' : '') + '" data-id="' + s.id + '" style="transform:translateY(' + ((i - currentShort) * 100) + '%)">
            <div class="shorts-video" style="background:' + s.color + ';display:flex;align-items:center;justify-content:center;font-size:48px;">🎬</div>
            <div class="shorts-info">
                <div class="shorts-title">' + esc(s.title) + '</div>
                <div class="shorts-author">@' + esc(s.author) + '</div>
            </div>
            <div class="shorts-actions">
                <button class="shorts-action-btn" onclick="likeShort(' + s.id + ')">❤️</button>
                <button class="shorts-action-btn" onclick="commentShort(' + s.id + ')">💬</button>
                <button class="shorts-action-btn" onclick="shareShort(' + s.id + ')">📤</button>
            </div>
        </div>';
    }).join("");
    updateShortsProgress();
}

function updateShortsProgress() {
    var progressEl = $("#shortsProgress");
    if (progressEl) progressEl.style.width = ((currentShort / (shorts.length - 1)) * 100) + "%";
}

$("#shortsBtn").addEventListener("click", showShorts);
$("#shortsNext").addEventListener("click", function() {
    if (currentShort < shorts.length - 1) { currentShort++; renderShorts(); }
});
$("#shortsPrev").addEventListener("click", function() {
    if (currentShort > 0) { currentShort--; renderShorts(); }
});

function likeShort(id) { alert("❤️ Видео добавлено в избранное!"); }
function commentShort(id) { alert("💬 Комментарии скоро будут доступны!"); }
function shareShort(id) { alert("📤 Ссылка скопирована!"); }

// ── Helpers ──
function fmt(t) { if (!t) return ""; return new Date(t).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}); }
function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
