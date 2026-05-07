# Инструкция по установке и запуску проекта

## 1. Ссылки на размещённый проект

Frontend:

https://food-ordering-frontend-web.onrender.com

Backend API:

https://food-ordering-backend-jx2z.onrender.com

Swagger-документация API:

https://food-ordering-backend-jx2z.onrender.com/docs

Health-check backend:

https://food-ordering-backend-jx2z.onrender.com/health

## 2. Требования для локального запуска

Для локального запуска проекта необходимо установить:

- Git
- Docker Desktop

## 3. Клонирование репозитория

Команды:

git clone https://github.com/StKekc/project-09-food-ordering.git
cd project-09-food-ordering

## 4. Запуск проекта через Docker

Перед запуском необходимо открыть Docker Desktop и дождаться, пока Docker будет запущен.

Команда запуска:

docker compose up --build

После успешного запуска будут доступны:

- frontend: http://localhost:3000
- backend Swagger: http://127.0.0.1:8000/docs
- backend health-check: http://127.0.0.1:8000/health

## 5. Проверка backend

Команда:

curl http://127.0.0.1:8000/health

Ожидаемый ответ:

{"status":"ok"}

## 6. Остановка проекта

Для остановки проекта нажать:

Ctrl + C

После этого выполнить:

docker compose down

## 7. Состав проекта

Проект состоит из двух основных частей:

- frontend — пользовательский интерфейс приложения;
- backend — серверная часть приложения.

Для совместного запуска используется файл docker-compose.yml.

## 8. Размещение проекта

Frontend и backend размещены на Render.

Особенность бесплатного тарифа Render: при долгом отсутствии активности сервис может переходить в спящий режим. Первый запрос после простоя может выполняться дольше обычного.
