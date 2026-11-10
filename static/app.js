// Определяем API URL автоматически (работает локально и на хостинге)
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE = isLocalhost ? "" : `${window.location.protocol}//${window.location.hostname}`;
const API = `${API_BASE}/api`;
const WS = isLocalhost ? `ws://localhost:8765/ws` : `ws://${window.location.host}/ws`;
const $=s=>document.querySelector(s);
const S={uid:null,email:"",uname:"",isAdmin:false,isVerified:false,chats:[],chat:null,msgs:[],users:[],ws:null,typing:false,tTO:null,bio:"",birth_date:""};

// ── Auth ──
$("#authUsername").addEventListener("input",checkAuth);
$("#authPassword").addEventListener("input",checkAuth);
$("#authUsernameReg").addEventListener("input",checkAuth);
$("#authEmailReg").addEventListener("input",checkAuth);
$("#authPasswordReg").addEventListener("input",checkAuth);

function checkAuth(){
  // Login
  const u1=$.("#authUsername").value.trim();
  const p1=$.("#authPassword").value;
  $("#authLogin").disabled=!u1||!p1;
  // Register
  const u2=$.("#authUsernameReg").value.trim();
  const p2=$.("#authPasswordReg").value;
  $("#authReg").disabled=!u2||!p2;
}

// Toggle between login and registration
let isRegisterMode = false;
$("#toggleMode").addEventListener("click",()=>{
  isRegisterMode=true;
  $("#authUsername").parentElement.classList.add("hidden");
  $("#authPassword").parentElement.classList.add("hidden");
  $("#authLogin").classList.add("hidden");
  $("#toggleMode").classList.add("hidden");
  $("#authError").parentElement.querySelector("h2").textContent="Регистрация";
  $("#regSection").classList.remove("hidden");
});
$("#backToLogin").addEventListener("click",()=>{
  isRegisterMode=false;
  $("#authUsername").parentElement.classList.remove("hidden");
  $("#authPassword").parentElement.classList.remove("hidden");
  $("#authLogin").classList.remove("hidden");
  $("#toggleMode").classList.remove("hidden");
  $("#authError").parentElement.querySelector("h2").textContent="Вход";
  $("#regSection").classList.add("hidden");
});

$("#authLogin").addEventListener("click",async()=>{
  showAuthError("");
  const username=$.("#authUsername").value.trim();
  const pass=$.("#authPassword").value;
  try{
    const r=await fetch(API+"/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password:pass})});
    if(!r.ok){const d=await r.json();throw new Error(d.detail)}
    const data=await r.json();
    S.uid=data.id;S.email=data.email||"";S.uname=data.username||data.email;
    S.isAdmin=data.is_admin;S.isVerified=data.is_verified;
    await loadProfile();showApp();
  }catch(e){showAuthError(e.message)}
});

$("#authReg").addEventListener("click",async()=>{
  showAuthError("");
  const username=$.("#authUsernameReg").value.trim();
  const email=$.("#authEmailReg").value.trim();
  const pass=$.("#authPasswordReg").value;
  try{
    const r=await fetch(API+"/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password:pass,email})});
    if(!r.ok){const d=await r.json();throw new Error(d.detail)}
    const data=await r.json();
    S.uid=data.id;S.email=data.email||"";S.uname=username;
    await loadProfile();showApp();
  }catch(e){showAuthError(e.message)}
});

function showAuthError(msg){const e=$.("#authError");e.textContent=msg;e.style.display=msg?"block":"none"}

// ── App ──
async function loadProfile(){
  try{
    const r=await fetch(API+"/me?user_id="+S.uid);
    const me=await r.json();
    S.uname=me.username||S.uname;S.email=me.email||"";
    S.bio=me.bio||"";S.birth_date=me.birth_date||"";
    updateMyAvatar(me.avatar);updateBadges();
  }catch(e){console.error(e)}
}

async function showApp(){
  $.("#authScreen").classList.add("hidden");
  $.("#msgScreen").classList.remove("hidden");
  $.("#myName").textContent=S.uname;
  connectWS();await fetchChats();
}

function updateMyAvatar(avatar){
  const el=$.("#myAvatar");
  if(avatar){el.innerHTML=`<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`}
  else{el.textContent=S.uname[0].toUpperCase()}
}

function updateBadges(){
  const badge=$.("#myBadge");
  if(S.isAdmin)badge.innerHTML="🛡️";
  else if(S.isVerified)badge.innerHTML="✓";
  else badge.textContent="";
  if(S.isAdmin)$.("#adminPanelBtn").style.display="flex";
}

// ── WebSocket ──
function connectWS(){
  if(S.ws)S.ws.close();
  const ws=new WebSocket(WS+"/"+S.uid);S.ws=ws;
  ws.onmessage=e=>{
    const d=JSON.parse(e.data);
    if(d.type==="new_message"){
      if(S.chat&&d.chat_id===S.chat.id){S.msgs.push(d.message);renderMsgs()}
      fetchChats();
    }else if(d.type==="user_typing"&&S.chat&&d.chat_id===S.chat.id){
      showTyping("Кто-то печатает...");
    }
  };
  ws.onclose=()=>setTimeout(()=>{if(S.uid)connectWS()},1500);
}

// ── Chats ──
async function fetchChats(){
  try{
    const r=await fetch(API+"/chats?user_id="+S.uid);
    S.chats=await r.json();renderChats();
  }catch(e){console.error(e)}
}

function renderChats(){
  const list=$.("#chatList");
  if(!S.chats.length){list.innerHTML='<div class="empty-chats"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Начните общение</p></div>';return}
  list.innerHTML=S.chats.map(c=>{
    const isAI=c.type==="ai";
    return`<div class="chat-item ${S.chat?.id===c.id?'active':''} ${isAI?'ai-chat':''}" data-id="${c.id}">
      <div class="avatar">${isAI?'🤖':(c.name?c.name[0].toUpperCase():"?")}</div>
      <div class="chat-info"><div class="chat-name">${esc(c.name||"Чат")}</div><div class="chat-preview">${esc(c.last_message||"Начните общение")}</div></div>
      <div class="chat-meta">${c.last_message_time?fmt(c.last_message_time):""}</div>
    </div>`}).join("");
  list.querySelectorAll(".chat-item").forEach(el=>el.onclick=()=>openChat(S.chats.find(c=>c.id==el.dataset.id)));
}

// ── Open Chat ──
async function openChat(c){
  if(!c)return;S.chat=c;$.("#noChat").classList.add("hidden");$.("#chatView").classList.remove("hidden");
  $.("#cTitle").textContent=c.name||"Чат";$.("#cAvatar").textContent=(c.name||"?")[0].toUpperCase();
  hideTyping();
  const isAI=c.type==="ai";$.("#cStatus").textContent=isAI?"AI-помощник":"онлайн";
  if(isAI){$.("#cAvatar").textContent="🤖";$.("#cAvatar").style.background="linear-gradient(135deg,#06b6d4,#6366f1)"}
  else{$.("#cAvatar").style.background=""}
  try{const r=await fetch(API+"/chats/"+c.id+"/messages");S.msgs=await r.json();renderMsgs()}catch(e){console.error(e)}
}

// ── Messages ──
function renderMsgs(){
  $.("#msgContainer").innerHTML=S.msgs.map(m=>{
    const isAI=m.sender_id===0||m.username==="AI Assistant";
    return`<div class="message ${m.sender_id==S.uid?'outgoing':''} ${isAI?'ai-message':''}">
      ${m.sender_id!==S.uid&&m.sender_id!==0?`<div class="sender-avatar">${(m.username||"?")[0].toUpperCase()}</div>`:""}
      <div class="message-bubble"><div class="message-content">${esc(m.content)}</div><div class="message-time">${fmt(m.timestamp)}</div></div>
    </div>`}).join("");
  const mc=$.("#msgContainer");mc.scrollTop=mc.scrollHeight;
}

function sendMsg(){
  const t=$.("#msgInput").value.trim();if(!t||!S.ws||!S.chat)return;
  S.ws.send(JSON.stringify({type:"send_message",chat_id:S.chat.id,content:t}));
  $.("#msgInput").value="";$.("#sendBtn").disabled=true;S.typing=false;
  if(S.tTO)clearTimeout(S.tTO);
}

$("#sendBtn").addEventListener("click",sendMsg);
$("#msgInput").addEventListener("input",()=>{$.("#sendBtn").disabled=!$.("#msgInput").value.trim()});
$("#msgInput").addEventListener("keydown",e=>{if(e.key==="Enter")sendMsg()});
$("#msgInput").addEventListener("input",()=>{
  if(!S.ws||!S.chat||S.typing)return;S.typing=true;
  S.ws.send(JSON.stringify({type:"typing",chat_id:S.chat.id}));
  if(S.tTO)clearTimeout(S.tTO);S.tTO=setTimeout(()=>{S.typing=false},2000);
});

function showTyping(text){const el=$.("#typingIndicator");$.("#typingText").textContent=text;el.style.display="block";setTimeout(hideTyping,2500)}
function hideTyping(){$.("#typingIndicator").style.display="none"}

// ── Modal ──
function closeModal(){$.("#modalOverlay").classList.add("hidden")}
$("#modalOverlay").addEventListener("click",e=>{if(e.target===$.("#modalOverlay"))closeModal()});

// ── Profile Modal ──
$("#profileBtn").addEventListener("click",()=>{
  const modal=$.("#modalContent");
  const avatarHtml=S.uname[0].toUpperCase();
  modal.innerHTML=`
    <h3>👤 Профиль</h3>
    <div class="profile-header">
      <div class="profile-avatar" id="profileAvatar">
        ${avatarHtml}
        <div class="avatar-overlay">📷</div>
      </div>
      <input type="file" id="avatarInput" accept="image/*" style="display:none" onchange="handleAvatar(event)">
      <div class="profile-name">${esc(S.uname)}</div>
      <div class="profile-badges">${S.isAdmin?'<span class="badge badge-admin">🛡️ Админ</span>':''}${S.isVerified?'<span class="badge badge-verified">✓ Верифицирован</span>':''}${!S.isAdmin&&!S.isVerified?'<span class="badge" style="color:var(--text3)">Обычный пользователь</span>':''}</div>
    </div>
    <div class="input-group"><input type="text" id="profBio" placeholder="О себе..." value="${esc(S.bio)}"></div>
    <div class="input-group"><input type="date" id="profBirth" value="${S.birth_date||""}"></div>
    <button class="btn-primary" id="profSave">💾 Сохранить</button>
    <button class="btn-secondary" onclick="closeModal()">Закрыть</button>`;
  $.("#modalOverlay").classList.remove("hidden");
  $("#profSave").onclick=async()=>{
    const bio=$.("#profBio").value.trim();
    const birth=$.("#profBirth").value;
    try{await fetch(API+"/profile?user_id="+S.uid,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({bio,birth_date:birth})});closeModal();alert("✅ Сохранено!")}catch(e){console.error(e)}
  };
});

function handleAvatar(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async(ev)=>{
    const base64=ev.target.result;
    try{await fetch(API+"/profile?user_id="+S.uid,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({avatar:base64})});updateMyAvatar(base64);closeModal();alert("✅ Аватарка обновлена!")}catch(err){console.error(err)}
  };
  reader.readAsDataURL(file);
}

// ── Search Users ──
$("#searchBtn").addEventListener("click",()=>{
  const modal=$.("#modalContent");
  modal.innerHTML=`<h3>👥 Найти пользователя</h3>
    <input type="text" id="sInput" placeholder="Имя пользователя..." autocomplete="off">
    <div class="user-list" id="uList"><div class="no-results">Начните вводить имя</div></div>
    <button class="btn-secondary" onclick="closeModal()">Закрыть</button>`;
  $.("#modalOverlay").classList.remove("hidden");
  const inp=$.("#sInput"),list=$.("#uList");inp.focus();let tTO2;
  inp.addEventListener("input",()=>{
    clearTimeout(tTO2);tTO2=setTimeout(async()=>{
      const q=inp.value.trim();if(!q){list.innerHTML='<div class="no-results">Начните вводить имя</div>';return}
      try{const r=await fetch(API+"/users?q="+encodeURIComponent(q)+"&user_id="+S.uid);const us=await r.json();
      if(!us.length){list.innerHTML='<div class="no-results">Не найдено</div>';return}
      list.innerHTML=us.map(u=>`<div class="user-item" data-uid="${u.id}">
        <div class="avatar sm">${(u.username||u.email)[0].toUpperCase()}</div>
        <div><span class="admin-username">${esc(u.username||u.email.split("@")[0])}</span>
        <span class="admin-email">${esc(u.email)}</span></div>
        <div class="admin-badges">${u.is_verified?'<span class="verified-badge">✓</span>':''}${u.is_admin?'<span class="admin-badge">🛡️</span>':''}</div>
      </div>`).join("");
      list.querySelectorAll(".user-item").forEach(el=>{el.onclick=async()=>{
        const uid=parseInt(el.dataset.uid);
        try{
          const r=await fetch(API+"/chats?user_id="+S.uid,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"Чат",member_ids:[uid]})});
          const chat=await r.json();fetchChats();openChat(S.chats.find(c=>c.id===chat.id));
        }catch(e){console.error(e)}
      }});
      }catch(e){console.error(e)}
    },300)});
  inp.onkeydown=e=>{if(e.key==="Enter")inp.dispatchEvent(new Event("input"))};
});

// ── New Chat ──
$("#newChatBtn").addEventListener("click",()=>{
  $.("#modalContent").innerHTML=`<h3>✨ Новый чат</h3>
    <input type="text" id="ncName" placeholder="Название чата">
    <div class="modal-actions"><button onclick="closeModal()">Отмена</button><button id="ncCreate">Создать</button></div>`;
  $.("#modalOverlay").classList.remove("hidden");
  $("#ncName").focus();
  $("#ncCreate").onclick=async()=>{
    const n=$.("#ncName").value.trim();if(!n)return;
    await fetch(API+"/chats?user_id="+S.uid,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n})});
    closeModal();await fetchChats();
  };
  $("#ncName").onkeydown=e=>{if(e.key==="Enter")$("#ncCreate").click()};
});

// ── Admin Panel ──
$("#adminPanelBtn").addEventListener("click",async()=>{
  try{
    const stats=await fetch(API+"/admin/stats?user_id="+S.uid);
    const statsData=await stats.json();
    const usersR=await fetch(API+"/admin/users?user_id="+S.uid);
    const users=await usersR.json();
    const userList=users.map(u=>`<div class="admin-user-row">
      <div class="avatar sm">${(u.username||u.email)[0].toUpperCase()}</div>
      <div class="admin-user-info"><span class="admin-username">${esc(u.username||u.email.split("@")[0])}</span>
      <span class="admin-email">${esc(u.email)}</span></div>
      <div class="admin-badges">${u.is_verified?'<span class="verified-badge">✓</span>':''}${u.is_admin?'<span class="admin-badge">🛡️</span>':''}${u.is_banned?'<span style="color:var(--red)">🚫</span>':''}</div>
      <div class="admin-user-actions">
        ${u.is_verified?`<button class="btn-sm btn-verify" onclick="doAdmin(${u.id},'toggle_verify')" title="Снять верификацию">✗</button>`
          :`<button class="btn-sm btn-verify" onclick="doAdmin(${u.id},'toggle_verify')" title="Верифицировать">✓</button>`}
        ${u.is_admin?`<button class="btn-sm btn-admin" onclick="doAdmin(${u.id},'toggle_admin')" title="Снять админку">✗</button>`
          :`<button class="btn-sm btn-admin" onclick="doAdmin(${u.id},'toggle_admin')" title="Сделать админом">🛡️</button>`}
        ${u.is_banned?`<button class="btn-sm btn-verify" onclick="doAdmin(${u.id},'toggle_ban')" title="Разбанить">🔓</button>`
          :`<button class="btn-sm btn-ban" onclick="doAdmin(${u.id},'toggle_ban')" title="Забанить">🚫</button>`}
      </div>
    </div>`).join("");
    $.("#modalContent").innerHTML=`<h3>🛡️ Панель администратора</h3>
      <div class="admin-stats">
        <div class="stat-card"><span class="stat-number">${statsData.users}</span><span class="stat-label">Пользователи</span></div>
        <div class="stat-card"><span class="stat-number">${statsData.chats}</span><span class="stat-label">Чаты</span></div>
        <div class="stat-card"><span class="stat-number">${statsData.messages}</span><span class="stat-label">Сообщения</span></div>
        <div class="stat-card"><span class="stat-number">${statsData.verified}</span><span class="stat-label">Верифицированы</span></div>
        <div class="stat-card"><span class="stat-number">${statsData.admins}</span><span class="stat-label">Админы</span></div>
        <div class="stat-card"><span class="stat-number">${statsData.banned}</span><span class="stat-label">Заблокированы</span></div>
      </div>
      <h4 style="margin:16px 0 8px">Пользователи (${users.length})</h4>
      <div class="admin-users-list">${userList||'<div class="no-results">Нет пользователей</div>'}</div>
      <button class="btn-secondary" id="adminClose">Закрыть</button>`;
    $.("#modalOverlay").classList.remove("hidden");
    $("#adminClose").onclick=closeModal;
  }catch(e){console.error(e)}
});

async function doAdmin(targetId,action){
  if(action==="toggle_ban"&&!confirm("Заблокировать пользователя?"))return;
  try{await fetch(API+"/admin/action?user_id="+S.uid,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,target_id:targetId})});
  await $("#adminPanelBtn").click();
  }catch(e){console.error(e)}
}

// ── Helpers ──
function fmt(t){if(!t)return"";return new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
function esc(s){const d=document.createElement("div");d.textContent=s;return d.innerHTML}
