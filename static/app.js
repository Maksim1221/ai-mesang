// AI Mesang v5 - Telegram Style
var API = "/api";
var WS_URL = "ws://" + window.location.host + "/ws";
var $ = function(s) { return document.querySelector(s); };
var S = {uid:null,email:"",uname:"",isAdmin:false,isVerified:false,chats:[],chat:null,msgs:[],users:[],ws:null,typing:false,tTO:null,bio:"",birth_date:"",members:[],token:null,avatar:""};

// ── Local Storage (Сохранение сессии) ──
function saveSession() {
    if (S.uid && S.token) {
        localStorage.setItem("mesang_token", S.token);
        localStorage.setItem("mesang_uid", S.uid);
        localStorage.setItem("mesang_uname", S.uname);
        localStorage.setItem("mesang_email", S.email);
        localStorage.setItem("mesang_admin", S.isAdmin);
        localStorage.setItem("mesang_verified", S.isVerified);
        localStorage.setItem("mesang_avatar", S.avatar);
        localStorage.setItem("mesang_bio", S.bio);
        localStorage.setItem("mesang_birth", S.birth_date);
    }
}

function loadSession() {
    var token = localStorage.getItem("mesang_token");
    var uid = localStorage.getItem("mesang_uid");
    if (token && uid) {
        S.token = token;
        S.uid = parseInt(uid);
        S.uname = localStorage.getItem("mesang_uname") || "User";
        S.email = localStorage.getItem("mesang_email") || "";
        S.isAdmin = localStorage.getItem("mesang_admin") === "true";
        S.isVerified = localStorage.getItem("mesang_verified") === "true";
        S.avatar = localStorage.getItem("mesang_avatar") || "";
        S.bio = localStorage.getItem("mesang_bio") || "";
        S.birth_date = localStorage.getItem("mesang_birth") || "";
        return true;
    }
    return false;
}

function clearSession() {
    localStorage.removeItem("mesang_token");
    localStorage.removeItem("mesang_uid");
    localStorage.removeItem("mesang_uname");
    localStorage.removeItem("mesang_email");
    localStorage.removeItem("mesang_admin");
    localStorage.removeItem("mesang_verified");
    localStorage.removeItem("mesang_avatar");
    localStorage.removeItem("mesang_bio");
    localStorage.removeItem("mesang_birth");
}

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
        S.token = data.token;
        S.email = data.email || "";
        S.uname = data.username || data.email;
        S.isAdmin = data.is_admin;
        S.isVerified = data.is_verified;
        saveSession();
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
        S.token = data.token;
        S.email = data.email || "";
        S.uname = username;
        saveSession();
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
    return fetch(API + "/me?user_id=" + S.uid).then(function(r) { 
        if (!r.ok && r.status === 401) {
            clearSession();
            showAuthScreen();
            throw new Error("Session expired");
        }
        return r.json(); 
    }).then(function(me) {
        S.uname = me.username || S.uname;
        S.email = me.email || "";
        S.bio = me.bio || "";
        S.birth_date = me.birth_date || "";
        S.avatar = me.avatar || "";
        updateMyAvatar(S.avatar);
        updateBadges();
        saveSession();
    });
}

function showApp() {
    $("#authScreen").classList.add("hidden");
    $("#msgScreen").classList.remove("hidden");
    $("#myName").textContent = S.uname;
    connectWS();
    fetchChats();
}

function showAuthScreen() {
    $("#authScreen").classList.remove("hidden");
    $("#msgScreen").classList.add("hidden");
}

// ── Auto Login on Page Load ──
(function() {
    if (loadSession()) {
        loadProfile().then(function() {
            showApp();
        }).catch(function() {
            // Если токен невалидный, показываем экран входа
            showAuthScreen();
        });
    }
})();

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
    $("#shortsView").classList.add("hidden");
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
    var html = '';
    for (var i = 0; i < S.msgs.length; i++) {
        var m = S.msgs[i];
        var isAI = m.sender_id === 0 || m.username === "AI Assistant";
        var isOut = m.sender_id === S.uid;
        html += '<div class="message ' + (isOut ? 'outgoing' : '') + (isAI ? ' ai-message' : '') + '">';
        if (!isOut && m.sender_id !== 0) {
            html += '<div class="sender-avatar">' + (m.username || "?")[0].toUpperCase() + '</div>';
        }
        html += '<div class="message-bubble"><div class="message-content">' + esc(m.content) + '</div>';
        html += '<div class="message-time">' + fmt(m.timestamp) + '</div></div></div>';
    }
    container.innerHTML = html;
    setTimeout(function() { container.scrollTop = container.scrollHeight; }, 50);
}

function sendMsg() {
    var t = $("#msgInput").value.trim();
    if (!t || !S.chat) return;
    fetch(API + "/chats/" + S.chat.id + "/messages?user_id=" + S.uid, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({content: t})
    }).then(function(r) { 
        if (!r.ok && r.status === 401) {
            clearSession();
            showAuthScreen();
            throw new Error("Session expired");
        }
        return r.json(); 
    }).then(function(data) {
        if (data.ai_reply) {
            S.msgs.push(data.message, data.ai_reply);
        } else {
            S.msgs.push(data.message);
        }
        renderMsgs();
        fetchChats();
        $("#msgInput").value = "";
        $("#sendBtn").disabled = true;
    }).catch(function(e) { 
        if (e.message !== "Session expired") {
            console.error("Send error:", e);
        }
    });
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

// ── Profile Modal (Telegram Style) ──
$("#profileBtn").addEventListener("click", function() {
    var modal = $("#modalContent");
    var avatarBg = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    modal.innerHTML = '<div class="profile-page">' +
        '<div class="profile-bg" style="background:' + avatarBg + '"></div>' +
        '<div class="profile-content">' +
        '<div class="profile-avatar-large" id="profileAvatarLarge" style="background:#fff">' + (S.uname[0].toUpperCase()) + '</div>' +
        '<input type="file" id="avatarInput" accept="image/*" style="display:none" onchange="handleAvatar(event)">' +
        '<div class="profile-name">' + esc(S.uname) + '</div>' +
        '<div class="profile-email">' + (S.email || "Email не указан") + '</div>' +
        '<div class="profile-badges">' +
            (S.isAdmin ? '<span class="badge badge-admin">🛡️ Админ</span>' : '') +
            (S.isVerified ? '<span class="badge badge-verified">✓ Верифицирован</span>' : '') +
            (!S.isAdmin && !S.isVerified ? '<span class="badge">Обычный пользователь</span>' : '') +
        '</div>' +
        '<div class="profile-details">' +
            (S.bio ? '<div class="detail-item"><span class="detail-label">О себе</span><span class="detail-value">' + esc(S.bio) + '</span></div>' : '') +
            (S.birth_date ? '<div class="detail-item"><span class="detail-label">Дата рождения</span><span class="detail-value">' + S.birth_date + '</span></div>' : '') +
        '</div>' +
        '<div class="profile-actions">' +
            '<button class="btn-primary" id="editProfileBtn">✏️ Редактировать</button>' +
            '<button class="btn-secondary" onclick="closeModal()">Закрыть</button>' +
        '</div>' +
        '</div></div>';
    $("#modalOverlay").classList.remove("hidden");
    
    if (S.avatar) {
        $("#profileAvatarLarge").innerHTML = '<img src="' + S.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
    }
    
    $("#editProfileBtn").onclick = function() {
        var modal = $("#modalContent");
        modal.innerHTML = '<div class="edit-profile">' +
            '<h3>✏️ Редактировать профиль</h3>' +
            '<div class="profile-photo-section">' +
                '<div class="profile-photo-circle" onclick="document.getElementById(\'avatarInput2\').click()">' +
                    (S.avatar ? '<img src="' + S.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : (S.uname[0].toUpperCase())) +
                    '<div class="camera-icon">📷</div>' +
                '</div>' +
                '<input type="file" id="avatarInput2" accept="image/*" style="display:none" onchange="handleAvatar(event)">' +
                '<p>Нажмите чтобы сменить фото</p>' +
            '</div>' +
            '<div class="input-group"><input type="text" id="profBio" placeholder="О себе..." value="' + esc(S.bio || '') + '"></div>' +
            '<div class="input-group"><input type="date" id="profBirth" value="' + (S.birth_date || '') + '"></div>' +
            '<button class="btn-primary" id="profSave">💾 Сохранить</button>' +
            '<button class="btn-secondary" onclick="closeModal()">Отмена</button>';
        
        $("#profSave").onclick = function() {
            var bio = $("#profBio").value.trim();
            var birth = $("#profBirth").value;
            fetch(API + "/profile?user_id=" + S.uid, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({bio: bio, birth_date: birth})
            }).then(function() { closeModal(); alert("✅ Сохранено!"); }).catch(function() { alert("Ошибка!"); });
        };
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
        }).then(function() { 
            S.avatar = base64;
            updateMyAvatar(base64);
            closeModal(); 
            alert("✅ Аватарка обновлена!"); 
        }).catch(function() { alert("Ошибка!"); });
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

// ── Shorts (TikTok Style) ──
var shorts = [
    {id:1, title:"Как создать мессенджер за 5 минут", author:"@ai_mesang", color:"#6366f1", emoji:"🚀"},
    {id:2, title:"Топ 10 лайфхаков для программиста", author:"@code_master", color:"#8b5cf6", emoji:"💻"},
    {id:3, title:"Тренды 2024 что нужно знать", author:"@trend_watch", color:"#ec4899", emoji:"📈"},
    {id:4, title:"Смешные коты сборник", author:"@cat_lover", color:"#f59e0b", emoji:"🐱"},
    {id:5, title:"Как выучить Python за неделю", author:"@python_pro", color:"#10b981", emoji:"🐍"},
    {id:6, title:"Мемы недели выпуск 42", author:"@meme_king", color:"#ef4444", emoji:"😂"}
];
var currentShort = 0;
var shortInterval;

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
    var s = shorts[currentShort];
    container.innerHTML = '<div class="shorts-fullscreen">' +
        '<div class="shorts-item active" style="background:' + s.color + '">' +
            '<div class="shorts-video">' + s.emoji + '</div>' +
            '<div class="shorts-overlay">' +
                '<div class="shorts-info">' +
                    '<div class="shorts-title">' + esc(s.title) + '</div>' +
                    '<div class="shorts-author">' + esc(s.author) + '</div>' +
                    '<div class="shorts-desc">Добро пожаловать в AI Mesang Shorts! 🎬</div>' +
                '</div>' +
                '<div class="shorts-actions-side">' +
                    '<button class="shorts-action-btn" onclick="likeShort(' + s.id + ')"><span class="action-icon">❤️</span><span class="action-count">0</span></button>' +
                    '<button class="shorts-action-btn" onclick="commentShort(' + s.id + ')"><span class="action-icon">💬</span><span class="action-count">0</span></button>' +
                    '<button class="shorts-action-btn" onclick="shareShort(' + s.id + ')"><span class="action-icon">📤</span><span class="action-count">0</span></button>' +
                    '<button class="shorts-action-btn" onclick="followAuthor(' + s.id + ')"><span class="action-icon">👤</span></button>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="shorts-nav">' +
            '<button class="shorts-nav-btn next" onclick="nextShort()">▼</button>' +
            '<button class="shorts-nav-btn prev" onclick="prevShort()">▲</button>' +
        '</div>' +
        '<div class="shorts-dots">' + shorts.map(function(_, i) {
            return '<span class="shorts-dot ' + (i === currentShort ? 'active' : '') + '" onclick="goToShort(' + i + ')"></span>';
        }).join('') + '</div>' +
    '</div>';
    
    clearInterval(shortInterval);
    shortInterval = setInterval(function() {
        if ($(currentShort === shorts.length - 1 ? '.shorts-nav-btn.prev' : '.shorts-nav-btn.next')) {
            nextShort();
        }
    }, 15000);
}

function nextShort() {
    if (currentShort < shorts.length - 1) {
        currentShort++;
        renderShorts();
    }
}

function prevShort() {
    if (currentShort > 0) {
        currentShort--;
        renderShorts();
    }
}

function goToShort(index) {
    currentShort = index;
    renderShorts();
}

function likeShort(id) { alert("❤️ Вам понравилось!"); }
function commentShort(id) { alert("💬 Комментарии скоро!"); }
function shareShort(id) { alert("📤 Ссылка скопирована!"); }
function followAuthor(id) { alert("👤 Вы подписались!"); }

$("#shortsBtn").addEventListener("click", function() {
    if ($("#shortsView").classList.contains("hidden")) {
        showShorts();
    } else {
        hideShorts();
    }
});

// ── Logout ──
$("#logoutBtn").addEventListener("click", function() {
    if (confirm("Выйти из аккаунта?")) {
        if (S.ws) S.ws.close();
        clearSession();
        showAuthScreen();
    }
});

// ── Helpers ──
function fmt(t) { if (!t) return ""; return new Date(t).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}); }
function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }