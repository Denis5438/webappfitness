# Деплой на Render.com (Бесплатно)

## Шаг 1: Создайте аккаунт

1. Откройте https://render.com
2. Зарегистрируйтесь через GitHub/Google/Email

## Шаг 2: Создайте Web Service

1. Нажмите **New** → **Web Service**
2. Подключите GitHub репозиторий ИЛИ выберите "Public Git repository"

### Если нет GitHub:

Создайте репозиторий:
```bash
cd backend
git init
git add .
git commit -m "Initial commit"
# Создайте репозиторий на GitHub
git remote add origin https://github.com/ваш-username/fitness-backend.git
git push -u origin main
```

Затем подключите к Render.

### Или используйте публичный Git URL

Если код уже в GitHub, укажите URL репозитория.

## Шаг 3: Настройте сервис

**Name**: `fitness-backend`  
**Root Directory**: `backend` (если весь проект в одном репо) или оставьте пустым  
**Environment**: `Node`  
**Build Command**: `npm install`  
**Start Command**: `node src/index.js`

## Шаг 4: Добавьте переменные окружения

В разделе **Environment Variables** добавьте:

```
NODE_ENV=production
PORT=3000
DATABASE_PATH=./fitness.db
TELEGRAM_BOT_TOKEN=7576095198:AAEWmBEM2bXA581tljYv7UF1BixDIGlTcWM
WEBAPP_URL=https://fitness-webapp-tg.netlify.app
CORS_ORIGINS=https://fitness-webapp-tg.netlify.app
AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=500
AI_TEMPERATURE=0.7
FREE_TIER_AI_REQUESTS=10
PRO_TIER_AI_REQUESTS=-1
```

**ВАЖНО:** Добавьте `OPENAI_API_KEY` если хотите использовать AI ассистента.

## Шаг 5: Деплой

1. Нажмите **Create Web Service**
2. Render начнёт деплой (займёт 3-5 минут)
3. После завершения получите URL: `https://fitness-backend.onrender.com`

## Шаг 6: Обновите frontend

1. Откройте `frontend/.env.production`
2. Измените:
   ```
   VITE_API_URL=https://fitness-backend.onrender.com/api
   ```

3. Пересоберите frontend:
   ```bash
   cd frontend
   npm run build
   netlify deploy --prod --dir=dist
   ```

## Готово!

Теперь:
- Backend работает на Render
- Frontend на Netlify
- Telegram бот открывает WebApp
- Всё работает полностью

## Бесплатный план Render

- 750 часов/месяц
- Автоматический sleep после 15 минут неактивности
- Первый запрос может быть медленным (cold start)
- Для production рекомендуется платный план ($7/мес)
