# Инструкция по установке и запуску проекта

## 1. Требования

Для запуска проекта необходимо установить:

- Git
- Docker Desktop

## 2. Клонирование репозитория

Команды:

git clone https://github.com/usmanov1806/project-09-food-ordering.git
cd project-09-food-ordering

## 3. Запуск проекта через Docker

Перед запуском необходимо открыть Docker Desktop и дождаться, пока Docker будет запущен.

Команда запуска:

docker compose up --build

После успешного запуска будут доступны:

- frontend: http://localhost:3000
- backend Swagger: http://127.0.0.1:8000/docs
- backend health-check: http://127.0.0.1:8000/health

## 4. Проверка backend

Команда:

curl http://127.0.0.1:8000/health

Ожидаемый ответ:

{"status":"ok"}

## 5. Остановка проекта

Для остановки проекта нажать:

Ctrl + C

После этого выполнить:

docker compose down

## 6. Состав проекта

Проект состоит из двух основных частей:

- frontend — пользовательский интерфейс приложения;
- backend — серверная часть приложения.

Для совместного запуска используется файл docker-compose.yml.

## 7. Продакшен на Render

Развёрнутые сервисы:

- backend: https://food-ordering-backend-jx2z.onrender.com
- frontend: https://food-ordering-frontend-web.onrender.com
- Swagger: https://food-ordering-backend-jx2z.onrender.com/docs
- health-check: https://food-ordering-backend-jx2z.onrender.com/health

На Render для **frontend** задайте (или используйте `frontend/.env.production`):

`NEXT_PUBLIC_API_URL=https://food-ordering-backend-jx2z.onrender.com`

На Render для **backend** (опционально, иначе подставится URL фронтенда по умолчанию):

`FRONTEND_URL=https://food-ordering-frontend-web.onrender.com`

Проверка:

```bash
curl https://food-ordering-backend-jx2z.onrender.com/health
```
