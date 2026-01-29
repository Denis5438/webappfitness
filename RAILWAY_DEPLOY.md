# Деплой на Railway через веб-интерфейс

## Шаг 1: Создайте проект

1. Откройте https://railway.app
2. Нажмите **Start a New Project**
3. Выберите **Deploy from GitHub repo** (или **Empty Project**)

## Шаг 2: Загрузите код

Если нет GitHub:
1. Создайте репозиторий на GitHub
2. Загрузите папку `backend`
3. Подключите к Railway

Или используйте Railway CLI (если авторизовались):
```bash
cd backend
railway init
railway up
```

## Шаг 3: Настройте переменные окружения

В Railway Dashboard → Variables:

```
PORT=3000
NODE_ENV=production
DATABASE_PATH=./fitness.db
OPENAI_API_KEY=sk-ваш-ключ
TELEGRAM_BOT_TOKEN=7576095198:AAEWmBEM2bXA581tljYv7UF1BixDIGlTcWM
WEBAPP_URL=https://fitness-webapp-tg.netlify.app
CORS_ORIGINS=https://fitness-webapp-tg.netlify.app
AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=500
AI_TEMPERATURE=0.7
FREE_TIER_AI_REQUESTS=10
PRO_TIER_AI_REQUESTS=-1
```

## Шаг 4: Деплой

Railway автоматически задеплоит проект.

После деплоя получите URL (например: `https://fitness-backend-production.up.railway.app`)

## Шаг 5: Обновите frontend

1. Откройте `frontend/.env.production`
2. Замените:
   ```
   VITE_API_URL=https://ваш-railway-url.up.railway.app/api
   ```

3. Пересоберите и задеплойте:
   ```bash
   cd frontend
   npm run build
   netlify deploy --prod --dir=dist
   ```

## Готово!

Теперь всё работает полностью.
