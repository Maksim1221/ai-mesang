// AI Mesang v6 - Modern Messenger with localStorage
const API = "/api";
const WS_URL = "ws://" + window.location.host + "/ws";
const $ = function(s) { return document.querySelector(s); };
var S = {
  uid: null,
  email: "",
  uname: "",
  isAdmin: false,
  isVerified: false,
  chats: [],
  chat: null,
  msgs: [],
  users: [],
  ws: null,
  typing: false,
  tTO: null,
  bio: "",
  birth_date: "",
  members: [],
  token: null,
  avatar: ""
};

// ── Local Storage Functions ──
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

function saveChats() {
  if (S.chats && S.chats.length) {
    localStorage.setItem("mesang_chats", JSON.stringify(S.chats));
  }
}

function loadChats() {
  var saved = localStorage.getItem("mesang_chats");
  if (saved) {
    try {
      S.chats = JSON.parse(saved);
      return true;
    } catch(e) {
      return false;
    }
  }
  return false;
}

// ── Auth ──
$("#authUsername").addEventListener("input", checkAuth);
$("#authPassword").addEventListener("input", checkAuth);
$("#authUsernameReg").addEventListener("input", checkAuth);
$("#authEmailReg").addEventListener("input", checkAuth);
$("#authPasswordReg").addEventListener("input", checkAuth);

function checkAuth() {
  var u1 = $("#authUsername").value.trim();
  var p1 = $("#authPassword").value;
  $("#authLogin").disabled = !u1 || !p1;
  var u2 = $("#authUsernameReg").value.trim();
  var p2 = $("#authPasswordReg").value;
  $("#authReg").disabled = !u2 || !p2;
}

// Tabs
$("#loginTab").addEventListener("click", function() {
  $("#loginTab").classList.add("active");
  $("#registerTab").classList.remove("active");
  $("#authLogin").classList.remove("hidden");
  $("#authReg").classList.add("hidden");
});

$("#registerTab").addEventListener("click", function() {
  $("#registerTab").classList.add("active");
  $("#loginTab").classList.remove("active");
  $("#authReg").classList.remove("hidden");
  $("#authLogin").classList.add("hidden");
});

// Login
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

// Register
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
  // Загружаем чаты из localStorage или с сервера
  if (loadChats()) {
    renderChats();
  }
  fetchChats();
}

function showAuthScreen() {
  $("#authScreen").classList.remove("hidden");
  $("#msgScreen").classList.add("hidden");
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

// ── Auto Login ──
(function() {
  if (loadSession()) {
    loadProfile().then(function() {
      showApp();
    }).catch(function() {
      showAuthScreen();
    });
  }
})();

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
  ws.onclose = function() { 
    setTimeout(function() { if (S.uid) connectWS(); }, 1500); 
  };
}

// ── Chats ──
function fetchChats() {
  fetch(API + "/chats?user_id=" + S.uid).then(function(r) { 
    return r.json(); 
  }).then(function(chats) {
    S.chats = chats;
    saveChats();
    renderChats();
  }).catch(function(e) { console.error(e); });
}

function renderChats() {
  var list = $("#chatList");
  if (!S.chats.length) {
    list.innerHTML = '<div class="empty-chats"><div class="empty-icon">💬</div><p>Начните общение</p></div>';
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
    $("#cAvatar").style.background = "linear-gradient(135deg, #667eea, #764ba2)";
  } else {
    $("#cAvatar").style.background = "";
  }
  fetch(API + "/chats/" + c.id + "/messages").then(function(r) { 
    return r.json(); 
  }).then(function(msgs) {
    S.msgs = msgs;
    renderMsgs();
  }).catch(function(e) { console.error(e); });
  fetchMembers(c.id);
}

function fetchMembers(chatId) {
  fetch(API + "/chats/" + chatId + "/members").then(function(r) { 
    return r.json(); 
  }).then(function(members) {
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
    var onlineStatus = m.is_online ? '<span class="online-indicator" title="Онлайн">🟢</span>' :
                       (m.last_seen ? '<span class="offline-indicator" title="Был(а) ' + fmtLastSeen(m.last_seen) + '">⚫</span>' : '');
    return '<div class="member-item" data-user-id="' + m.id + '">' +
      (m.avatar ? '<img src="' + m.avatar + '" class="member-avatar">' : '<div class="member-avatar">' + (m.username || m.email)[0].toUpperCase() + '</div>') +
      '<div class="member-info">' +
      '<span class="member-name">' + esc(m.username || m.email) + ' ' + onlineStatus + '</span>' +
      (m.is_admin ? '<span class="badge badge-admin">🛡️</span>' : '') +
      (m.is_verified ? '<span class="badge badge-verified">✓</span>' : '') +
      '</div></div>';
  }).join("");
  
  container.querySelectorAll(".member-item").forEach(function(el) {
    el.onclick = function() {
      var userId = parseInt(el.dataset.userId);
      openUserProfile(userId);
    };
  });
}

function openChatMembers() {
  if (S.chat) {
    $("#membersPanel").style.display = "flex";
  }
}

function closeMembers() {
  $("#membersPanel").style.display = "none";
}

function fmtLastSeen(timestamp) {
  if (!timestamp) return "не в сети";
  var date = new Date(timestamp);
  var now = new Date();
  var diff = now - date;
  var minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return minutes + " мин. назад";
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + " ч. назад";
  return date.toLocaleDateString();
}

function openUserProfile(userId) {
  fetch(API + "/users/" + userId).then(function(r) { 
    return r.json(); 
  }).then(function(user) {
    var modal = $("#modalContent");
    var avatarBg = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    var onlineStatus = user.is_online ? '<span class="online-status">🟢 В сети</span>' :
                       '<span class="offline-status">⚫ Был(а) ' + (user.last_seen ? fmtLastSeen(user.last_seen) : "не в сети") + '</span>';
    modal.innerHTML = '<div class="profile-page">' +
      '<div class="profile-bg" style="background:' + avatarBg + '"></div>' +
      '<div class="profile-content">' +
      '<div class="profile-avatar-large" id="profileAvatarLarge">' +
        (user.avatar ? '<img src="' + user.avatar + '">' : (user.username || user.email)[0].toUpperCase()) +
      '</div>' +
      '<div class="profile-name">' + esc(user.username || user.email) + ' ' + onlineStatus + '</div>' +
      '<div class="profile-email">' + (user.email || "Email не указан") + '</div>' +
      '<div class="profile-badges">' +
        (user.is_admin ? '<span class="badge badge-admin">🛡️ Админ</span>' : '') +
        (user.is_verified ? '<span class="badge badge-verified">✓ Верифицирован</span>' : '') +
        (!user.is_admin && !user.is_verified ? '<span class="badge">Обычный пользователь</span>' : '') +
      '</div>' +
      '<div class="profile-details">' +
        (user.bio ? '<div class="detail-item"><span class="detail-label">О себе</span><span class="detail-value">' + esc(user.bio) + '</span></div>' : '') +
        (user.birth_date ? '<div class="detail-item"><span class="detail-label">Дата рождения</span><span class="detail-value">' + user.birth_date + '</span></div>' : '') +
        '<div class="detail-item"><span class="detail-label">В системе с</span><span class="detail-value">' + (user.created_at ? user.created_at.split("T")[0] : "неизвестно") + '</span></div>' +
        '<div class="detail-item"><span class="detail-label">Последний вход</span><span class="detail-value">' + (user.last_seen ? user.last_seen.replace("T", " ") : "неизвестно") + '</span></div>' +
      '</div>' +
      '<div class="profile-actions">' +
        '<button class="btn-primary" id="startChatBtn">💬 Написать сообщение</button>' +
        '<button class="btn-secondary" onclick="closeModal()">Закрыть</button>' +
      '</div>' +
      '</div></div>';
    $("#modalOverlay").classList.remove("hidden");
    
    $("#startChatBtn").onclick = function() {
      fetch(API + "/chats?user_id=" + S.uid, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name: "", member_ids: [userId]})
      }).then(function() {
        closeModal();
        fetchChats();
      }).catch(function(e) { console.error(e); });
    };
  }).catch(function(e) { console.error("Profile error:", e); });
}

// ── Messages ──
function renderMsgs() {
  var container = $("#msgContainer");
  var html = '';
  for (var i = 0; i < S.msgs.length; i++) {
    var m = S.msgs[i];
    var isAI = m.sender_id === 0 || m.username === "AI Assistant";
    var isOut = m.sender_id === S.uid;
    var type = m.type || "text";
    var file = m.file || "";
    
    html += '<div class="message ' + (isOut ? 'outgoing' : '') + (isAI ? ' ai-message' : '') + '">';
    if (!isOut && m.sender_id !== 0) {
      html += '<div class="sender-avatar">' + (m.username || "?")[0].toUpperCase() + '</div>';
    }
    html += '<div class="message-bubble"><div class="message-content">';
    
    if (type === "image" && file) {
      html += '<img src="' + file + '" onclick="openImage(this.src)">';
    } else if (type === "video" && file) {
      if (m.is_circle) {
        html += '<video class="video-circle" controls src="' + file + '"></video>';
      } else {
        html += '<video controls src="' + file + '"></video>';
      }
    } else if (type === "audio" && file) {
      html += '<div class="voice-msg">';
      html += '<button class="voice-play" onclick="playAudio(\'' + file + '\')">▶</button>';
      html += '<audio src="' + file + '" id="audio_' + m.id + '"></audio>';
      html += '<span>' + (m.duration || "0:00") + '</span>';
      html += '</div>';
    } else if (type === "file" && file) {
      html += '<div class="file-attachment" onclick="downloadFile(\'' + file + '\',\'' + (m.file_name || 'file') + '\')">';
      html += '📎 ' + (m.file_name || 'Файл');
      html += '</div>';
    } else {
      html += esc(m.content);
    }
    
    html += '</div>';
    html += '<div class="message-time">' + fmt(m.timestamp) + '</div></div></div>';
  }
  container.innerHTML = html;
  setTimeout(function() { container.scrollTop = container.scrollHeight; }, 50);
}

function openImage(src) {
  var overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.9);z-index:2000;display:flex;align-items:center;justify-content:center;cursor:pointer";
  overlay.onclick = function() { document.body.removeChild(overlay); };
  var img = document.createElement("img");
  img.src = src;
  img.style.cssText = "max-width:90%;max-height:90%;border-radius:8px";
  overlay.appendChild(img);
  document.body.appendChild(overlay);
}

function playAudio(src) {
  var audio = document.getElementById("audio_" + src.split("_").pop());
  if (audio) {
    if (audio.paused) {
      audio.play();
      event.target.textContent = "⏸";
    } else {
      audio.pause();
      event.target.textContent = "▶";
    }
  }
}

function downloadFile(url, name) {
  var a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function sendMsg(content, type, file, extra) {
  var data = {content: content || "", type: type || "text"};
  if (file) data.file = file;
  if (extra) Object.assign(data, extra);
  
  fetch(API + "/chats/" + S.chat.id + "/messages?user_id=" + S.uid, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data)
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

$("#sendBtn").addEventListener("click", function() {
  var t = $("#msgInput").value.trim();
  if (t) sendMsg(t, "text");
});

$("#msgInput").addEventListener("input", function() {
  $("#sendBtn").disabled = !$("#msgInput").value.trim();
});

$("#msgInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter" && $("#msgInput").value.trim()) {
    sendMsg($("#msgInput").value.trim());
  }
});

// ── Photo ──
$("#photoBtn").addEventListener("click", function() {
  $("#photoInput").click();
});

$("#photoInput").addEventListener("change", function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    sendMsg("", "image", ev.target.result);
  };
  reader.readAsDataURL(file);
});

// ── File ──
$("#fileBtn").addEventListener("click", function() {
  $("#fileInput").click();
});

$("#fileInput").addEventListener("change", function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    sendMsg(file.name, "file", ev.target.result, {file_name: file.name});
  };
  reader.readAsDataURL(file);
});

// ── Voice ──
var mediaRecorder;
var audioChunks = [];
var isRecording = false;

$("#voiceBtn").addEventListener("mousedown", function() {
  if (isRecording) return;
  navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream) {
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = function(e) {
      audioChunks.push(e.data);
    };
    
    mediaRecorder.onstop = function() {
      var audioBlob = new Blob(audioChunks, {type: 'audio/webm'});
      var reader = new FileReader();
      reader.onload = function(ev) {
        sendMsg("🎤 Голосовое", "audio", ev.target.result, {duration: "0:05"});
      };
      reader.readAsDataURL(audioBlob);
      stream.getTracks().forEach(function(track) { track.stop(); });
    };
    
    mediaRecorder.start();
    isRecording = true;
    $("#voiceBtn").classList.add("recording");
    $("#voiceRecording").style.display = "flex";
  }).catch(function(err) {
    alert("❌ Нет доступа к микрофону");
  });
});

$("#voiceBtn").addEventListener("mouseup", function() {
  if (!isRecording || !mediaRecorder) return;
  mediaRecorder.stop();
  isRecording = false;
  $("#voiceBtn").classList.remove("recording");
  $("#voiceRecording").style.display = "none";
});

$("#voiceCancel").addEventListener("click", function() {
  if (!isRecording || !mediaRecorder) return;
  mediaRecorder.cancel();
  isRecording = false;
  $("#voiceBtn").classList.remove("recording");
  $("#voiceRecording").style.display = "none";
});

// ── Video Circle ──
$("#videoBtn").addEventListener("click", function() {
  navigator.mediaDevices.getUserMedia({video: true, audio: true}).then(function(stream) {
    var video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.muted = true;
    video.style.cssText = "position:fixed;bottom:80px;left:20px;width:120px;height:120px;border-radius:50%;border:3px solid var(--accent);z-index:2000;object-fit:cover";
    document.body.appendChild(video);
    
    var stopBtn = document.createElement("button");
    stopBtn.textContent = "⏹ Отправить";
    stopBtn.style.cssText = "position:fixed;bottom:100px;right:20px;background:var(--grad);color:#fff;border:none;padding:10px 20px;border-radius:20px;cursor:pointer;z-index:2000";
    document.body.appendChild(stopBtn);
    
    stopBtn.onclick = function() {
      var canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, 300, 300);
      var videoBase64 = canvas.toDataURL("image/jpeg");
      sendMsg("📹 Видеокружочек", "video", videoBase64, {is_circle: true});
      document.body.removeChild(video);
      document.body.removeChild(stopBtn);
      stream.getTracks().forEach(function(track) { track.stop(); });
    };
    
    document.addEventListener("keydown", function cancelVideo(e) {
      if (e.key === "Escape") {
        document.body.removeChild(video);
        document.body.removeChild(stopBtn);
        stream.getTracks().forEach(function(track) { track.stop(); });
        document.removeEventListener("keydown", cancelVideo);
      }
    });
  }).catch(function(err) {
    alert("❌ Нет доступа к камере");
  });
});

// ── Modal ──
function closeModal() { $("#modalOverlay").classList.add("hidden"); }
$("#modalOverlay").addEventListener("click", function(e) {
  if (e.target === $("#modalOverlay")) closeModal();
});

// ── Profile Modal ──
$("#profileBtn").addEventListener("click", function() {
  var modal = $("#modalContent");
  var avatarBg = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  modal.innerHTML = '<div class="profile-page">' +
    '<div class="profile-bg" style="background:' + avatarBg + '"></div>' +
    '<div class="profile-content">' +
    '<div class="profile-avatar-large" id="profileAvatarLarge">' +
      (S.avatar ? '<img src="' + S.avatar + '">' : S.uname[0].toUpperCase()) +
    '</div>' +
    '<input type="file" id="avatarInput" accept="image/*" style="display:none" onchange="handleAvatar(event)">' +
    '<div class="profile-name">' + esc(S.uname) + '</div>' +
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
          (S.avatar ? '<img src="' + S.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : S.uname[0].toUpperCase()) +
          '<div class="camera-icon">📷</div>' +
        '</div>' +
        '<input type="file" id="avatarInput2" accept="image/*" style="display:none" onchange="handleAvatar(event)">' +
        '<p>Нажмите чтобы сменить фото</p>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">О себе</label><input type="text" id="profBio" placeholder="Расскажите о себе" value="' + esc(S.bio || '') + '"></div>' +
      '<div class="form-group"><label class="form-label">Дата рождения</label><input type="date" id="profBirth" value="' + (S.birth_date || '') + '"></div>' +
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
    '<div class="form-group"><label class="form-label">Имя пользователя</label><input type="text" id="sInput" placeholder="Введите имя" autocomplete="off"></div>' +
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
      fetch(API + "/users?q=" + encodeURIComponent(q) + "&user_id=" + S.uid).then(function(r) { 
        return r.json(); 
      }).then(function(us) {
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
    '<div class="form-group"><label class="form-label">Название чата</label><input type="text" id="ncName" placeholder="Введите название"></div>' +
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
  fetch(API + "/admin/stats?user_id=" + S.uid).then(function(r) { 
    return r.json(); 
  }).then(function(stats) {
    return fetch(API + "/admin/users?user_id=" + S.uid).then(function(r2) { 
      return r2.json(); 
    }).then(function(users) {
      var userList = users.map(function(u) {
        return '<div class="admin-user-row">' +
          '<div class="avatar sm">' + (u.username || u.email)[0].toUpperCase() + '</div>' +
          '<div class="admin-user-info"><span class="admin-username">' + esc(u.username || u.email.split("@")[0]) + '</span>' +
          '<span class="admin-email">' + esc(u.email) + '</span></div>' +
          '<div class="admin-badges">' + (u.is_verified ? '<span class="verified-badge">✓</span>' : '') +
          (u.is_admin ? '<span class="admin-badge">🛡️</span>' : '') +
          (u.is_banned ? '<span style="color:var(--error)">🚫</span>' : '') + '</div>' +
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
  {id:1, title:"Как создать мессенджер за 5 минут", author:"@ai_mesang", color:"#667eea", emoji:"🚀"},
  {id:2, title:"10 лайфхаков для программиста", author:"@code_master", color:"#8b5cf6", emoji:"💻"},
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
    if (currentShort < shorts.length - 1) {
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
