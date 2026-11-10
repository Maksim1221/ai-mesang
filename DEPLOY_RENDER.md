# 🚀 Инструкция по деплою на Render

## Шаг 1: Создаём репозиторий на GitHub

1. Зайди на [github.com](https://github.com) и войди в аккаунт
2. Нажми **"+"** → **"New repository"**
3. Название: `ai-mesang` (или любое другое)
4. Публичный (Public) или приватный (Private) — не важно
5. **НЕ** ставь галочки "Initialize with README"
6. Нажми **"Create repository"**

## Шаг 2: Загружаем проект в GitHub

Открой **PowerShell** или **CMD** и выполни по очереди:

```powershell
cd C:\Users\макс\messenger-backend

# Инициализируем git
git init

# Добавляем все файлы
git add .

# Создаём первый коммит
git commit -m "Initial commit - AI Mesang messenger"

# Подключаем к репозиторию GitHub
# Замени URL на свой (скопируй с GitHub)
git remote add origin https://github.com/ТВОЙ_НИК/ai-mesang.git

# Отправляем на GitHub
git branch -M main
git push -u origin main
```

## Шаг 3: Создаём проект на Render

1. Зайди на [render.com](https://render.com) и войди через GitHub
2. Нажми **"New +"** → **"Web Service"**
3. Выбери свой репозиторий `ai-mesang`
4. Заполни настройки:

| Поле | Значение |
|------|----------|
| **Name** | `ai-mesang` |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Root Directory** | (пусто) |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn main:app --workers 2 --bind 0.0.0.0:$PORT --timeout 120` |
| **Instance Type** | `Free` |

5. Нажми **"Advanced"** и добавь переменные окружения (если есть):
   - `PORT` = `8000` (не обязательно, Render сам подставит)

6. Нажми **"Create Web Service"**

## Шаг 4: Ждём деплой

- Build займёт **2-5 минут**
- Когда появится зелёная галочка ✅ — всё готово
- Твой мессенджер доступен по ссылке вида:
  ```
  https://ai-mesang.onrender.com
  ```

## Шаг 5: Проверяем

1. Открой ссылку в браузере
2. Зарегистрируйся
3. Попробуй войти
4. Напиши в AI-чат

## 🎉 Готово!

## ❗ Важно

### Бесплатный тариф Render
- ⏰ **Спящий режим**: если 30 минут没人 заходить, сервис "засыпает"
- ⏱️ **Первый запрос после сна**: 30 секунд загрузка
- 💾 **Хранилище**: БД хранится, но при free тарифе может сброситься

### Как избежать спящего режима
1. **Upgrade to Paid** — $7/мес (always on)
2. **Использовать мониторинг** — сервисы типа UptimeRobot проверяют сайт каждые 5 минут
3. **Свой домен** — подключи свой домен в Render settings

### Подключение домена
1. В настройках сервиса на Render → **"Domains"**
2. Введи свой домен (например `mesang.ru`)
3. В настройках DNS прописывай CNAME на `cname.onrender.com`

## 🔧 Troubleshooting

### Ошибка "Build failed"
```bash
# Проверь что requirements.txt существует
# Проверь что main.py существует
# Убедись что Procfile есть
```

### Сайт не открывается
1. Зайди в Render → свой сервис → **"Logs"**
2. Посмотри ошибки
3. Перезапусти сервис кнопкой **"Manual Deploy"**

### WebSocket не работает
- Убедись что использешь `wss://` (не `ws://`) на HTTPS
- Render автоматически поддерживает WebSocket

## 📞 Админ-аккаунт

Первый пользователь автоматически становится админом:
- **Логин**: `admin`
- **Пароль**: `admin1111`

## 📁 Структура файлов

```
ai-mesang/
├── main.py              # FastAPI сервер
├── database.py          # SQLite БД
├── auth.py              # Авторизация
├── requirements.txt     # Зависимости
├── Procfile             # Для Render
├── .gitignore           # Игнорировать файлы
├── README.md            # Документация
├── templates/
│   └── index.html       # HTML
└── static/
    ├── style.css        # Стили
    └── app.js           # JavaScript
```

## 💡 Советы

1. **Делай коммиты** после каждого изменения:
   ```bash
   git add .
   git commit -m "Описание изменений"
   git push
   ```
   Render автоматически обновит сайт!

2. **Бэкап БД** — скачивай `mesang.db` периодически

3. **Мониторинг** — используй [uptimerobot.com](https://uptimerobot.com) для проверки доступности

## ❓ Частые вопросы

**Q: Сайт спит и долго загружается?**
A: На бесплатном тарифе так и есть. Установи UptimeRobot для автоматических проверок.

**Q: Можно ли удалить admin и создать нового?**
A: Да, но нужно будет через консоль или создать другого админа через БД.

**Q: Сколько пользователей может выдержать?**
A: Free тариф: ~100 активных пользователей. Для большего — платный тариф.

**Q: БД сохраняется при перезапуске?**
A: Да, но на free тарифе есть ограничения. Для продакшена — плати $7/мес.

---

Нужна помощь? Пиши, помогу! 🚀
