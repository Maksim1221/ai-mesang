"""AI Mesang — база данных (синхронная SQLite)"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mesang.db")


def _get_conn():
    """Получить соединение с БД"""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Инициализация таблиц"""
    conn = _get_conn()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        username TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        birth_date TEXT DEFAULT '',
        is_admin INTEGER DEFAULT 0,
        is_verified INTEGER DEFAULT 0,
        is_banned INTEGER DEFAULT 0,
        is_online INTEGER DEFAULT 0,
        last_seen TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT DEFAULT '',
        type TEXT DEFAULT 'private',
        owner_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS chat_members (
        chat_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        PRIMARY KEY (chat_id, user_id),
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        msg_type TEXT DEFAULT 'text',
        file_data TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    )""")
    c.execute("CREATE INDEX IF NOT EXISTS idx_msg ON messages(chat_id, timestamp DESC)")
    conn.commit()
    conn.close()


# ── Users ──
def get_user_by_username(username):
    conn = _get_conn()
    u = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    conn.close()
    return u


def get_user_by_email(email):
    conn = _get_conn()
    u = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()
    return u


def get_user_by_id(user_id):
    conn = _get_conn()
    u = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    conn.close()
    return u


def update_online_status(user_id, is_online):
    """Обновить статус онлайн"""
    import datetime
    conn = _get_conn()
    now = datetime.datetime.utcnow().isoformat()
    conn.execute(
        "UPDATE users SET is_online=?, last_seen=? WHERE id=?",
        (1 if is_online else 0, now if is_online else now, user_id)
    )
    conn.commit()
    conn.close()


def create_user(email, username, password_hash, is_admin=0):
    """Создать пользователя"""
    conn = _get_conn()
    email = email if email else None  # None вместо пустой строки
    cur = conn.execute(
        "INSERT INTO users (email, username, password_hash, is_admin) VALUES (?,?,?,?)",
        (email, username, password_hash, is_admin)
    )
    conn.commit()
    uid = cur.lastrowid
    conn.close()
    return uid


def update_profile(user_id, **kwargs):
    """Обновить профиль"""
    conn = _get_conn()
    fields = [f"{k}=?" for k in kwargs]
    conn.execute(
        f"UPDATE users SET {', '.join(fields)} WHERE id=?",
        list(kwargs.values()) + [user_id]
    )
    conn.commit()
    conn.close()


def search_users(query, limit=20):
    """Поиск пользователей"""
    conn = _get_conn()
    q = f"%{query}%"
    rows = conn.execute(
        "SELECT id, email, username, avatar, bio, is_verified, is_admin "
        "FROM users WHERE (email LIKE ? OR username LIKE ?) AND username != 'admin' "
        "ORDER BY id DESC LIMIT ?",
        (q, q, limit)
    ).fetchall()
    conn.close()
    return rows


def get_all_users():
    """Все пользователи (для админа)"""
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    conn.close()
    return rows


def toggle_verify(user_id):
    conn = _get_conn()
    val = conn.execute("SELECT is_verified FROM users WHERE id=?", (user_id,)).fetchone()["is_verified"]
    conn.execute("UPDATE users SET is_verified=? WHERE id=?", (0 if val else 1, user_id))
    conn.commit()
    conn.close()


def toggle_admin(user_id):
    conn = _get_conn()
    val = conn.execute("SELECT is_admin FROM users WHERE id=?", (user_id,)).fetchone()["is_admin"]
    conn.execute("UPDATE users SET is_admin=? WHERE id=?", (0 if val else 1, user_id))
    conn.commit()
    conn.close()


def toggle_ban(user_id):
    conn = _get_conn()
    val = conn.execute("SELECT is_banned FROM users WHERE id=?", (user_id,)).fetchone()["is_banned"]
    conn.execute("UPDATE users SET is_banned=? WHERE id=?", (0 if val else 1, user_id))
    conn.commit()
    conn.close()


# ── Chats ──
def create_chat(owner_id, name=""):
    conn = _get_conn()
    t = "group" if name else "private"
    cur = conn.execute(
        "INSERT INTO chats (name, type, owner_id) VALUES (?,?,?)", (name, t, owner_id)
    )
    chat_id = cur.lastrowid
    conn.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (?,?)", (chat_id, owner_id))
    conn.commit()
    conn.close()
    return {"id": chat_id, "name": name, "type": t}


def get_chats(user_id):
    conn = _get_conn()
    rows = conn.execute(
        "SELECT c.id, c.name, c.type, "
        "(SELECT content FROM messages WHERE chat_id=c.id ORDER BY timestamp DESC LIMIT 1) as last_msg, "
        "(SELECT timestamp FROM messages WHERE chat_id=c.id ORDER BY timestamp DESC LIMIT 1) as last_time "
        "FROM chats c JOIN chat_members cm ON cm.chat_id=c.id "
        "WHERE cm.user_id=? AND c.id != 0 "
        "ORDER BY last_time DESC NULLS LAST",
        (user_id,)
    ).fetchall()
    conn.close()
    return rows


def add_member(chat_id, user_id):
    conn = _get_conn()
    conn.execute("INSERT OR IGNORE INTO chat_members (chat_id, user_id) VALUES (?,?)",
                 (chat_id, user_id))
    conn.commit()
    conn.close()


def get_members(chat_id):
    conn = _get_conn()
    rows = conn.execute(
        "SELECT u.id, u.username, u.email, u.avatar, u.is_verified, u.is_admin, u.is_banned, "
        "u.bio, u.birth_date FROM users u "
        "JOIN chat_members cm ON cm.user_id=u.id WHERE cm.chat_id=?",
        (chat_id,)
    ).fetchall()
    conn.close()
    return rows


# ── Messages ──
def get_messages(chat_id, limit=50):
    conn = _get_conn()
    rows = conn.execute(
        "SELECT m.id, m.chat_id, m.sender_id, m.content, m.timestamp, "
        "m.msg_type, m.file_data, u.username, u.avatar, u.is_verified, u.is_admin "
        "FROM messages m JOIN users u ON u.id=m.sender_id "
        "WHERE m.chat_id=? ORDER BY m.timestamp DESC LIMIT ?",
        (chat_id, limit)
    ).fetchall()
    rows.reverse()
    result = []
    for r in rows:
        result.append({
            "id": r["id"], "chat_id": r["chat_id"], "sender_id": r["sender_id"],
            "content": r["content"], "timestamp": r["timestamp"],
            "username": r["username"], "avatar": r["avatar"],
            "is_verified": bool(r["is_verified"]),
            "is_admin": bool(r["is_admin"]),
            "type": r["msg_type"] or "text",
            "file": r["file_data"]
        })
    conn.close()
    return result


def create_message(chat_id, sender_id, content, msg_type="text", file_data=None):
    """Создать сообщение"""
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO messages (chat_id, sender_id, content, msg_type, file_data) VALUES (?,?,?,?,?)",
        (chat_id, sender_id, content, msg_type, file_data)
    )
    conn.commit()
    mid = cur.lastrowid
    conn.close()
    return mid


def get_ai_chat():
    """Гарантировать существование AI-чата"""
    conn = _get_conn()
    row = conn.execute("SELECT id FROM chats WHERE id=0 LIMIT 1").fetchone()
    if not row:
        conn.execute("INSERT INTO chats (id, name, type) VALUES (0, 'AI Assistant', 'ai')")
        conn.commit()
    conn.close()


# ── Stats ──
def get_stats():
    conn = _get_conn()
    users = conn.execute("SELECT COUNT(*) as cnt FROM users").fetchone()["cnt"]
    chats = conn.execute("SELECT COUNT(*) as cnt FROM chats WHERE id != 0").fetchone()["cnt"]
    messages = conn.execute("SELECT COUNT(*) as cnt FROM messages").fetchone()["cnt"]
    admins = conn.execute("SELECT COUNT(*) as cnt FROM users WHERE is_admin=1").fetchone()["cnt"]
    verified = conn.execute("SELECT COUNT(*) as cnt FROM users WHERE is_verified=1").fetchone()["cnt"]
    banned = conn.execute("SELECT COUNT(*) as cnt FROM users WHERE is_banned=1").fetchone()["cnt"]
    conn.close()
    return {
        "users": users, "chats": chats, "messages": messages,
        "admins": admins, "verified": verified, "banned": banned
    }
