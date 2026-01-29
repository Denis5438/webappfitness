# Деплой на Glitch.com (Самый простой способ - БЕЗ Git)

## Преимущества Glitch
- ✅ Не нужен Git
- ✅ Не нужен GitHub
- ✅ Загрузка файлов через браузер
- ✅ Бесплатно
- ✅ Мгновенный деплой

## Инструкция

### Шаг 1: Создайте проект

1. Откройте https://glitch.com
2. Нажмите **New Project** → **glitch-hello-node**
3. Проект создастся автоматически

### Шаг 2: Загрузите файлы

1. В левой панели Glitch нажмите **Assets**
2. Загрузите все файлы из папки `backend`:
   - `package.json`
   - Папку `src/` (все файлы)
   - `.env.example` (переименуйте в `.env`)

Или проще:

1. Нажмите **Tools** → **Import from GitHub**
2. Вставьте: `https://github.com/Denis5438/fitness-backend`
3. Glitch автоматически импортирует код

### Шаг 3: Настройте .env

1. В Glitch откройте файл `.env`
2. Добавьте переменные:

```
PORT=3000
NODE_ENV=production
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

### Шаг 4: Получите URL

Glitch автоматически запустит проект и даст URL:
`https://ваш-проект.glitch.me`

### Шаг 5: Обновите frontend

После получения URL от Glitch, обновите frontend и редеплойте на Netlify.

## Готово!

Всё работает без Git и GitHub.

## Ограничения Glitch

- Проект "засыпает" после 5 минут неактивности
- Первый запрос может быть медленным (cold start)
- Для production лучше использовать платный хостинг
