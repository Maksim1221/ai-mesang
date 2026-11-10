# AI Mesang v4.0 — Мессенджер

Мессенджер с регистрацией, чатами, ИИ-помощником и админ-панелью.

## 🚀 Быстрый старт

### Локально

```bash
cd messenger-backend
pip install -r requirements.txt
python main.py
```

Открыть: http://localhost:8765

### На хостинг (Python Anywhere, Heroku, Railway и т.д.)

```bash
cd messenger-backend
pip install -r requirements.txt
# Установить переменную окружения PORT
PORT=8000 gunicorn main:app --workers 2 --bind 0.0.0.0:$PORT
```

## 📁 Структура проекта

```
messenger-backend/
├── main.py          # FastAPI сервер
├── database.py      # Работа с БД (SQLite)
├── auth.py          # Авторизация
├── requirements.txt # Зависимости
├── Procfile         # Для хостинга
├── README.md        # Эта инструкция
├── templates/
│   └── index.html   # HTML интерфейс
└── static/
    ├── style.css    # Стили
    └── app.js       # JavaScript клиента
```

## 🎯 Функции

- ✅ Регистрация/Вход по логину и паролю
- ✅ Профиль: avatar, bio, date of birth
- ✅ Чаты в реальном времени (WebSocket)
- ✅ ИИ-помощник (автоответы)
- ✅ Админ-панель: бан, верификация, роли
- ✅ Тёмная тема
- ✅ Адаптивный дизайн

## 🔐 Админ-аккаунт

По умолчанию создаётся:
- Логин: `admin`
- Пароль: `admin1111`

## 🌐 Переменные окружения

| Переменная | По умолчанию | Описание |
|-----------|-------------|----------|
| PORT | 8000 | Порт сервера |
| HOST | 0.0.0.0 | Хост сервера |

## 🚀 Деплой

### PythonAnywhere
1. Создать аккаунт на pythonanywhere.com
2. Загрузить файлы в `/home/username/messenger-backend/`
3. Создать Web App → Manual → Python 3.10
4. Настроить WSGI:
   ```python
   import sys
   path = '/home/username/messenger-backend'
   if path not in sys.path:
       sys.path.append(path)
   from main import app as application
   ```
5. Установить зависимости в Conda или Pip
6. Перезагрузить веб-апп

### Heroku
```bash
heroku create your-app-name
git push heroku main
heroku config:set PORT=8000
heroku ps:scale web=1
```

### Railway
1. Создать аккаунт на railway.app
2. Impортировать репозиторий
3. Railway автоматически определит Procfile
4. Настроить переменную PORT=8000

## 🛠️ troubleshooting

**Ошибка "Address already in use"**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /F /PID <PID>
```

**Ошибка импорта**
```bash
pip install -r requirements.txt --force-reinstall
```

**База данных не создаётся**
```bash
rm mesang.db  # Удалить старую БД
python main.py
```

## 📝 License

MIT
