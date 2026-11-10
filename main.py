"""AI Mesang — FastAPI мессенджер"""
import os
import random
from typing import Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import database as db
from auth import AuthManager

# ── Config ──
PORT = int(os.getenv("PORT", 8765))
HOST = os.getenv("HOST", "0.0.0.0")
BASE = os.path.dirname(os.path.abspath(__file__))
auth = AuthManager()

# ── WebSocket connections ──
connected_users: Dict[int, WebSocket] = {}

# ── AI responses ──
AI_RESPONSES = [
    "Привет! Я AI-помощник AI Mesang. Чем могу помочь? 🤖",
    "Интересный вопрос! Давай разберёмся вместе. 💡",
    "Я всегда готов пообщаться! Расскажи больше. 😊",
    "Отличная мысль! Я согласен с тобой. 👍",
    "Хм, дай подумать... Вот что я думаю об этом. 🤔",
    "Спасибо за сообщение! Я здесь, чтобы помочь. ✨",
    "Это любопытно! Расскажи подробнее. 🔍",
    "Я обрабатываю ваш запрос... Готово! ✅",
    "Здорово! Рад нашему разговору. 🎉",
    "Понимаю тебя. Давай обсудим это подробнее. 💬",
]

# ── Models ──
class RegisterIn(BaseModel):
    username: str
    password: str
    email: str = ""

class LoginIn(BaseModel):
    username: str
    password: str

class ProfileUpdate(BaseModel):
    username: str = ""
    bio: str = ""
    birth_date: str = ""
    avatar: str = ""

class ChatCreate(BaseModel):
    name: str = ""
    member_ids: list = []

class AdminAction(BaseModel):
    action: str
    target_id: int

# ── App ──
app = FastAPI(title="AI Mesang", version="4.0.0")


@app.on_event("startup")
def startup():
    """Запуск при старте"""
    db.init_db()
    # Создаём админа если нет
    if not db.get_user_by_username("admin"):
        db.create_user("admin@mesang.ai", "admin", auth.hash_password("admin1111"), is_admin=1)
    # Гарантируем AI-чат
    db.get_ai_chat()


# ── Auth ──
@app.post("/api/register")
def api_register(body: RegisterIn):
    """Регистрация"""
    if db.get_user_by_username(body.username):
        raise HTTPException(400, "Username already taken")
    if body.email and db.get_user_by_email(body.email):
        raise HTTPException(400, "Email already registered")
    uid = db.create_user(body.email, body.username, auth.hash_password(body.password))
    return {"token": auth.create_token(uid), "id": uid, "email": body.email, "username": body.username}


@app.post("/api/login")
def api_login(body: LoginIn):
    """Вход"""
    user = db.get_user_by_username(body.username)
    if not user:
        user = db.get_user_by_email(body.username)
    if not user or not auth.verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Неверный логин или пароль")
    if user["is_banned"]:
        raise HTTPException(403, "Аккаунт заблокирован")
    return {
        "token": auth.create_token(user["id"]),
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "is_verified": bool(user["is_verified"]),
        "is_admin": bool(user["is_admin"])
    }


# ── Profile ──
@app.get("/api/me")
def api_me(user_id: int):
    """Получить свой профиль"""
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "avatar": user["avatar"],
        "bio": user["bio"],
        "birth_date": user["birth_date"],
        "is_admin": bool(user["is_admin"]),
        "is_verified": bool(user["is_verified"]),
        "is_banned": bool(user["is_banned"]),
        "created_at": user["created_at"]
    }


@app.put("/api/profile")
def api_update_profile(body: ProfileUpdate, user_id: int):
    """Обновить профиль"""
    db.update_profile(user_id, **{k: v for k, v in body.model_dump().items() if v})
    return {"ok": True}


# ── Users ──
@app.get("/api/users")
def api_search_users(q: str = "", user_id: int = 0):
    """Поиск пользователей"""
    if not db.get_user_by_id(user_id):
        raise HTTPException(404, "Not found")
    rows = db.search_users(q)
    return [
        {
            "id": r["id"],
            "email": r["email"],
            "username": r["username"],
            "avatar": r["avatar"],
            "bio": r["bio"],
            "is_verified": bool(r["is_verified"]),
            "is_admin": bool(r["is_admin"])
        }
        for r in rows
        if r["id"] != user_id
    ]


@app.get("/api/users/{user_id}")
def api_get_user_profile(user_id: int):
    """Получить профиль пользователя"""
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "Not found")
    return {
        "id": user["id"], "email": user["email"], "username": user["username"],
        "avatar": user["avatar"], "bio": user["bio"], "birth_date": user["birth_date"],
        "is_verified": bool(user["is_verified"]),
        "is_admin": bool(user["is_admin"]),
        "is_banned": bool(user["is_banned"]),
        "is_online": bool(user["is_online"]),
        "last_seen": user["last_seen"],
        "created_at": user["created_at"]
    }


# ── Chats ──
@app.get("/api/chats")
def api_get_chats(user_id: int):
    """Получить список чатов"""
    rows = db.get_chats(user_id)
    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "name": r["name"],
            "type": r["type"],
            "last_message": r["last_msg"],
            "last_message_time": r["last_time"]
        })
    # AI-чат всегда первый
    result.insert(0, {"id": 0, "name": "AI Assistant", "type": "ai",
                      "last_message": None, "last_message_time": None})
    return result


@app.post("/api/chats")
def api_create_chat(body: ChatCreate, user_id: int):
    """Создать чат"""
    chat = db.create_chat(user_id, body.name)
    for uid in body.member_ids:
        db.add_member(chat["id"], uid)
    return chat


# ── Messages ──
@app.get("/api/chats/{chat_id}/messages")
def api_get_messages(chat_id: int, limit: int = 50):
    """Получить сообщения чата"""
    rows = db.get_messages(chat_id, limit)
    return [
        {
            "id": r["id"], "chat_id": r["chat_id"], "sender_id": r["sender_id"],
            "content": r["content"], "timestamp": r["timestamp"],
            "username": r["username"], "avatar": r["avatar"],
            "is_verified": bool(r["is_verified"]),
            "is_admin": bool(r["is_admin"])
        }
        for r in rows
    ]


@app.post("/api/chats/{chat_id}/messages")
def api_send_message(chat_id: int, request: Request, user_id: int = 0):
    """Отправить сообщение (текст или файл)"""
    import datetime
    ts = datetime.datetime.utcnow().isoformat()
    
    # Проверяем, является ли запрос multipart
    content_type = request.headers.get("content-type", "")
    
    if "multipart/form-data" in content_type:
        # Multipart запрос для файлов
        form_data = request.form()
        content = ""
        msg_type = "text"
        file_data = None
        file_name = ""
        
        if "content" in form_data:
            content = form_data["content"]
        if "type" in form_data:
            msg_type = form_data["type"]
        if "file" in form_data:
            file = form_data["file"]
            file_content = file.file.read()
            file_name = file.filename or "file"
            msg_type = file.content_type.split("/")[0] if "/" in file.content_type else "file"
            file_data = file_content.decode("latin1")
    
    else:
        # JSON запрос
        body = await request.json()
        content = body.get("content", "")
        msg_type = body.get("type", "text")
        file_data = body.get("file")
        file_name = body.get("file_name", "")
    
    if not content and not file_data:
        raise HTTPException(400, "Empty message")

    # AI-чат
    if chat_id == 0:
        resp = random.choice(AI_RESPONSES)
        msg_id = db.create_message(chat_id, user_id, content, msg_type, file_data)
        msg_data = {"id": msg_id, "chat_id": chat_id, "sender_id": user_id,
                    "content": content, "timestamp": ts,
                    "type": msg_type, "file": file_data,
                    "is_circle": body.get("is_circle", False) if "multipart" not in content_type else False,
                    "duration": body.get("duration") if "multipart" not in content_type else None,
                    "file_name": file_name}
        ai_id = db.create_message(chat_id, 0, resp, "text", None)
        ai_ts = datetime.datetime.utcnow().isoformat()
        ai_msg = {"id": ai_id, "chat_id": chat_id, "sender_id": 0,
                  "content": resp, "timestamp": ai_ts, "username": "AI Assistant"}
        return {"message": msg_data, "ai_reply": ai_msg}

    # Обычный чат
    msg_id = db.create_message(chat_id, user_id, content, msg_type, file_data)
    broadcast = {
        "type": "new_message",
        "message": {"id": msg_id, "chat_id": chat_id, "sender_id": user_id,
                    "content": content, "timestamp": ts,
                    "type": msg_type, "file": file_data,
                    "is_circle": body.get("is_circle", False) if "multipart" not in content_type else False,
                    "duration": body.get("duration") if "multipart" not in content_type else None,
                    "file_name": file_name},
        "chat_id": chat_id
    }
    members = db.get_members(chat_id)
    for m in members:
        ws = connected_users.get(m["id"])
        if ws:
            import asyncio
            try:
                asyncio.get_event_loop().create_task(ws.send_json(broadcast))
            except Exception:
                pass
    return {"message": {"id": msg_id, "chat_id": chat_id, "sender_id": user_id,
                        "content": content, "timestamp": ts,
                        "type": msg_type, "file": file_data,
                        "is_circle": body.get("is_circle", False) if "multipart" not in content_type else False,
                        "duration": body.get("duration") if "multipart" not in content_type else None,
                        "file_name": file_name}}


@app.get("/api/chats/{chat_id}/members")
def api_get_members(chat_id: int):
    """Получить участников чата"""
    members = db.get_members(chat_id)
    return [
        {
            "id": m["id"], "username": m["username"], "email": m["email"],
            "avatar": m["avatar"], "is_verified": bool(m["is_verified"]),
            "is_admin": bool(m["is_admin"]), "is_banned": bool(m["is_banned"]),
            "bio": m["bio"], "birth_date": m["birth_date"]
        }
        for m in members
    ]


# ── WebSocket ──
@app.websocket("/ws/{user_id}")
async def ws_endpoint(ws: WebSocket, user_id: int):
    """WebSocket подключение"""
    await ws.accept()
    connected_users[user_id] = ws
    # Обновляем статус онлайн
    db.update_online_status(user_id, True)
    try:
        while True:
            data = await ws.receive_json()
            if data.get("type") == "typing":
                members = db.get_members(data["chat_id"])
                for m in members:
                    if m["id"] != user_id:
                        s = connected_users.get(m["id"])
                        if s:
                            await s.send_json({
                                "type": "user_typing",
                                "user_id": user_id,
                                "chat_id": data["chat_id"]
                            })
    except WebSocketDisconnect:
        connected_users.pop(user_id, None)
        # Обновляем статус оффлайн
        db.update_online_status(user_id, False)


# ── Admin ──
@app.get("/api/admin/stats")
def api_admin_stats(user_id: int):
    """Статистика для админа"""
    user = db.get_user_by_id(user_id)
    if not user or not user.get("is_admin"):
        raise HTTPException(403, "Admin only")
    return db.get_stats()


@app.get("/api/admin/users")
def api_admin_users(user_id: int):
    """Все пользователи для админа"""
    user = db.get_user_by_id(user_id)
    if not user or not user.get("is_admin"):
        raise HTTPException(403, "Admin only")
    users = db.get_all_users()
    return [
        {
            "id": u["id"], "email": u["email"], "username": u["username"],
            "avatar": u["avatar"], "bio": u["bio"], "birth_date": u["birth_date"],
            "is_admin": bool(u["is_admin"]), "is_verified": bool(u["is_verified"]),
            "is_banned": bool(u["is_banned"]), "created_at": u["created_at"]
        }
        for u in users
    ]


@app.post("/api/admin/action")
def api_admin_action(body: AdminAction, user_id: int):
    """Действие админа"""
    admin = db.get_user_by_id(user_id)
    if not admin or not admin.get("is_admin"):
        raise HTTPException(403, "Admin only")

    if body.action == "toggle_verify":
        db.toggle_verify(body.target_id)
    elif body.action == "toggle_admin":
        if body.target_id == user_id:
            raise HTTPException(400, "Cannot remove own admin")
        db.toggle_admin(body.target_id)
    elif body.action == "toggle_ban":
        db.toggle_ban(body.target_id)
    else:
        raise HTTPException(400, "Unknown action")
    return {"ok": True}


# ── SPA Frontend ──
app.mount("/static", StaticFiles(directory=os.path.join(BASE, "static")), name="static")


@app.get("/{path:path}")
async def serve(path: str = ""):
    """Отдача статических файлов и SPA"""
    if path == "" or path == "index.html":
        return FileResponse(os.path.join(BASE, "templates", "index.html"))
    static_file = os.path.join(BASE, "static", path)
    if os.path.isfile(static_file):
        return FileResponse(static_file)
    # Всё остальное — index.html для SPA
    return FileResponse(os.path.join(BASE, "templates", "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
