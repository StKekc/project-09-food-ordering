# Food Ordering App

Учебный командный проект: приложение для заказа еды в ресторане.

## Ссылки на проект

Frontend:

https://food-ordering-frontend-web.onrender.com

Backend API:

https://food-ordering-backend-jx2z.onrender.com

Swagger API:

https://food-ordering-backend-jx2z.onrender.com/docs

Health-check:

https://food-ordering-backend-jx2z.onrender.com/health

## Описание

Приложение позволяет пользователю:

- авторизоваться по номеру телефона;
- просматривать меню ресторана;
- добавлять блюда в корзину;
- выбирать способ получения заказа;
- оформлять заказ;
- просматривать статус оформленного заказа.

## Состав проекта

- `frontend` — пользовательский интерфейс приложения;
- `backend` — серверная часть приложения;
- `docs` — документация проекта;
- `docker-compose.yml` — запуск frontend и backend через Docker.

## Локальный запуск

Для запуска проекта необходимо установить Docker Desktop.

Команды:

git clone https://github.com/StKekc/project-09-food-ordering.git
cd project-09-food-ordering
docker compose up --build

После запуска:

- frontend: http://localhost:3000
- backend Swagger: http://127.0.0.1:8000/docs
- health-check: http://127.0.0.1:8000/health

## Документация

- `docs/install.md` — инструкция по установке и запуску;
- `docs/testing.md` — тестовые сценарии;
- `docs/test-report.md` — отчёт о тестировании;
- `docs/user-guide.md` — руководство пользователя.

## Роли в проекте

В рамках проекта были выполнены:

- разработка пользовательского интерфейса;
- разработка backend и API;
- настройка Docker-запуска;
- размещение проекта на Render;
- ручное тестирование;
- подготовка пользовательской и технической документации.
