# Telegram Fitness Web App

Фитнес-приложение внутри Telegram с AI-ассистентом.

## Возможности

- 📝 Дневник тренировок (логгирование подходов, весов, повторений)
- 📊 Аналитика прогресса (графики, статистика)
- 🤖 AI-ассистент (персонализированные рекомендации)
- 🛍️ Маркетплейс программ тренировок

## Технологический стек

### Backend
- Node.js 20+ + TypeScript
- Express.js
- SQLite (better-sqlite3)
- OpenAI API (для AI ассистента)

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS
- Telegram WebApp SDK

## Структура проекта

```
webapp/
├── backend/           # FastAPI приложение
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── models/   # Pydantic модели
│   │   ├── services/ # Бизнес-логика
│   │   └── database/ # SQLite настройки
│   ├── requirements.txt
│   └── main.py
├── frontend/         # React приложение
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Быстрый старт

### 1. Backend
```bash
cd backend
npm install

# Создайте .env файл
cp .env.example .env
# Отредактируйте .env и добавьте ваши API ключи

# Инициализируйте базу данных
npm run db:init

# Запустите сервер
npm run dev
```

Backend запустится на `http://localhost:3000`

### 2. Frontend
```bash
cd frontend
npm install

# Создайте .env файл (опционально)
cp .env.example .env

# Запустите dev сервер
npm run dev
```

Frontend запустится на `http://localhost:5173`

## Переменные окружения

### Backend (.env)
```env
PORT=3000
DATABASE_PATH=./fitness.db
OPENAI_API_KEY=sk-your-openai-key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
CORS_ORIGINS=http://localhost:5173
AI_MODEL=gpt-4o-mini
FREE_TIER_AI_REQUESTS=10
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
```

## Создание Telegram бота

Подробная инструкция в файле [SETUP_BOT.md](./SETUP_BOT.md)

**Быстрый старт:**

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Получите токен и добавьте в `backend/.env`
3. Установите зависимости: `npm install telegraf concurrently`
4. Запустите бота: `npm run bot` или `npm run dev:all`

## Запуск бота

```bash
# Только бот
npm run bot

# Бот + API сервер одновременно
npm run dev:all
```
