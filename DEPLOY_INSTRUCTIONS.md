# Инструкция по деплою backend

## Вариант 1: Render.com (Рекомендуется)

1. Зарегистрируйтесь на https://render.com
2. Нажмите **New** → **Web Service**
3. Подключите GitHub или загрузите код
4. Настройки:
   - **Name**: `fitness-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Environment Variables**:
     ```
     PORT=3000
     NODE_ENV=production
     DATABASE_PATH=./fitness.db
     OPENAI_API_KEY=ваш_ключ
     TELEGRAM_BOT_TOKEN=7576095198:AAEWmBEM2bXA581tljYv7UF1BixDIGlTcWM
     WEBAPP_URL=https://fitness-webapp-tg.netlify.app
     CORS_ORIGINS=https://fitness-webapp-tg.netlify.app
     ```
5. Нажмите **Create Web Service**
6. Дождитесь деплоя (3-5 минут)
7. Скопируйте URL (например: `https://fitness-backend.onrender.com`)

## Вариант 2: Railway.app

1. Зарегистрируйтесь на https://railway.app
2. Создайте новый проект
3. Выберите **Deploy from GitHub repo**
4. Добавьте переменные окружения
5. Railway автоматически задеплоит

## Вариант 3: Glitch.com (Самый простой)

1. Откройте https://glitch.com
2. Нажмите **New Project** → **Import from GitHub**
3. Загрузите папку `backend`
4. Glitch автоматически запустит проект
5. Получите URL

## После деплоя

1. Обновите `frontend/.env.production`:
   ```
   VITE_API_URL=https://ваш-backend-url.com/api
   ```

2. Пересоберите и задеплойте frontend:
   ```bash
   cd frontend
   npm run build
   netlify deploy --prod --dir=dist
   ```

3. Готово! Приложение полностью работает.
