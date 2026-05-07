import os
import ssl
import uuid
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Annotated, Any, Literal
from urllib.parse import urlparse, urlunparse

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, create_async_engine


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

load_dotenv(dotenv_path=Path(__file__).with_name(".env"), override=False)


def _get_env(name: str, default: str | None = None) -> str:
    val = os.getenv(name, default)
    if val is None or val.strip() == "":
        raise RuntimeError(f"Missing required env var: {name}")
    return val


def _parse_cors_origins(raw: str | None) -> list[str]:
    if raw is None or raw.strip() == "":
        return ["*"]
    parts = [p.strip() for p in raw.split(",")]
    parts = [p for p in parts if p]
    return parts or ["*"]


_engine: AsyncEngine | None = None


def _force_supabase_port_6543(database_url: str) -> str:
    parsed = urlparse(database_url)
    if not parsed.hostname:
        return database_url
    if not parsed.hostname.endswith("supabase.co"):
        return database_url

    username = parsed.username or ""
    password = parsed.password or ""
    host = parsed.hostname
    port = 6543
    auth = username
    if password:
        auth = f"{username}:{password}"
    netloc = f"{auth}@{host}:{port}" if auth else f"{host}:{port}"
    return urlunparse(parsed._replace(netloc=netloc))


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is not None:
        return _engine

    database_url = os.getenv("DATABASE_URL")  # e.g. postgresql+asyncpg://user:pass@localhost:5432/db
    if database_url is None or database_url.strip() == "":
        # Optional alternative: build from PG* env vars
        pg_host = os.getenv("PGHOST")
        pg_user = os.getenv("PGUSER")
        pg_password = os.getenv("PGPASSWORD")
        pg_db = os.getenv("PGDATABASE")
        pg_port = os.getenv("PGPORT", "5432")
        if all([pg_host, pg_user, pg_password, pg_db]):
            database_url = f"postgresql+asyncpg://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_db}"

    if database_url is None or database_url.strip() == "":
        raise RuntimeError(
            "DATABASE_URL is not set. Example: postgresql+asyncpg://user:pass@localhost:5432/food_ordering"
        )

    database_url = _force_supabase_port_6543(database_url)

    # NOTE: connect_args={"ssl": False} disables SSL/certificate verification for asyncpg.
    # This is insecure for production; use only for local/dev troubleshooting.
    _engine = create_async_engine(database_url, pool_pre_ping=True, connect_args={"ssl": False})
    return _engine

app = FastAPI(title="Food Ordering API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://food-ordering-frontend-web.onrender.com",
        "http://localhost:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_conn() -> AsyncConnection:
    engine = get_engine()
    async with engine.connect() as conn:
        yield conn


DbConn = Annotated[AsyncConnection, Depends(get_conn)]


class RegisterRequest(BaseModel):
    phone: str = Field(min_length=3, max_length=20)
    password: str | None = Field(default=None, min_length=6, max_length=200)
    email: str | None = Field(default=None, max_length=255)
    name: str | None = Field(default=None, max_length=100)
    birth_date: date | None = None


class UserResponse(BaseModel):
    id: int
    phone: str
    email: str | None
    name: str | None
    birth_date: date | None
    role: str
    is_phone_verified: bool
    created_at: Any


@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, conn: DbConn) -> UserResponse:
    # Запись в БД выполняем только при полноценной регистрации.
    if not req.name or req.birth_date is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="name and birth_date are required for registration",
        )

    password_hash = pwd_context.hash(req.password) if req.password else None

    try:
        res = await conn.execute(
            text(
                """
                INSERT INTO users (phone, email, name, birth_date, password_hash)
                VALUES (:phone, :email, :name, :birth_date, :password_hash)
                RETURNING id, phone, email, name, birth_date, role, is_phone_verified, created_at
                """
            ),
            {
                "phone": req.phone,
                "email": req.email,
                "name": req.name,
                "birth_date": req.birth_date,
                "password_hash": password_hash,
            },
        )
        await conn.commit()
        row = res.mappings().one()
        return UserResponse(**row)
    except Exception as e:  # unique violation etc.
        await conn.rollback()
        msg = str(e).lower()
        if "unique" in msg and "phone" in msg:
            raise HTTPException(status_code=409, detail="Phone already registered") from e
        raise


class DishResponse(BaseModel):
    id: int
    category_id: int
    name: str
    description: str | None
    price: Decimal
    old_price: Decimal | None
    ingredients: str | None
    nutrition_info: Any | None
    weight_grams: int | None
    is_available: bool
    is_recommended: bool
    is_spicy: bool
    popularity_score: int
    image_url: str | None
    preparation_time_min: int | None
    created_at: Any
    updated_at: Any


@app.get("/dishes", response_model=list[DishResponse])
async def list_dishes(
    conn: DbConn,
    restaurant_id: int | None = None,
    category_id: int | None = None,
    available_only: bool = True,
    limit: int = 100,
    offset: int = 0,
) -> list[DishResponse]:
    limit = max(1, min(limit, 200))
    offset = max(0, offset)

    where = []
    params: dict[str, Any] = {"limit": limit, "offset": offset}

    if category_id is not None:
        where.append("d.category_id = :category_id")
        params["category_id"] = category_id
    if restaurant_id is not None:
        where.append("c.restaurant_id = :restaurant_id")
        params["restaurant_id"] = restaurant_id
    if available_only:
        where.append("d.is_available = true")

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    res = await conn.execute(
        text(
            f"""
            SELECT
              d.id, d.category_id, d.name, d.description, d.price, d.old_price,
              d.ingredients, d.nutrition_info, d.weight_grams,
              d.is_available, d.is_recommended, d.is_spicy, d.popularity_score,
              d.image_url, d.preparation_time_min, d.created_at, d.updated_at
            FROM dishes d
            JOIN categories c ON c.id = d.category_id
            {where_sql}
            ORDER BY d.popularity_score DESC, d.id DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    )
    rows = res.mappings().all()
    return [DishResponse(**r) for r in rows]


class OrderItemCreate(BaseModel):
    dish_id: int
    quantity: int = Field(gt=0)
    special_instructions: str | None = None


class OrderCreateRequest(BaseModel):
    user_id: int
    restaurant_id: int
    delivery_type: Literal["at_table", "pickup"] = "at_table"
    table_number: str | None = Field(default=None, max_length=20)
    customer_phone: str = Field(min_length=3, max_length=20)
    customer_name: str | None = Field(default=None, max_length=100)
    special_instructions: str | None = None
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderCreateResponse(BaseModel):
    id: int
    order_number: str
    status: str
    total_amount: Decimal
    created_at: Any


@app.post("/orders", response_model=OrderCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_order(req: OrderCreateRequest, conn: DbConn) -> OrderCreateResponse:
    if req.delivery_type == "at_table" and (req.table_number is None or req.table_number.strip() == ""):
        raise HTTPException(status_code=422, detail="table_number is required for at_table orders")

    dish_ids = sorted({it.dish_id for it in req.items})
    res = await conn.execute(
        text(
            """
            SELECT d.id, d.price, d.is_available
            FROM dishes d
            JOIN categories c ON c.id = d.category_id
            WHERE d.id = ANY(:dish_ids) AND c.restaurant_id = :restaurant_id
            """
        ),
        {"dish_ids": dish_ids, "restaurant_id": req.restaurant_id},
    )
    dish_rows = res.mappings().all()
    dish_map: dict[int, dict[str, Any]] = {int(r["id"]): dict(r) for r in dish_rows}

    missing = [d for d in dish_ids if d not in dish_map]
    if missing:
        raise HTTPException(status_code=404, detail={"message": "Some dishes not found", "dish_ids": missing})

    unavailable = [d for d in dish_ids if not dish_map[d].get("is_available", True)]
    if unavailable:
        raise HTTPException(
            status_code=409, detail={"message": "Some dishes are not available", "dish_ids": unavailable}
        )

    total = Decimal("0")
    for it in req.items:
        unit_price = Decimal(str(dish_map[it.dish_id]["price"]))
        total += unit_price * it.quantity

    order_number = uuid.uuid4().hex[:12].upper()

    try:
        await conn.begin()
        order_res = await conn.execute(
            text(
                """
                INSERT INTO orders (
                  user_id, order_number, restaurant_id, status, delivery_type,
                  table_number, total_amount, customer_phone, customer_name, special_instructions
                )
                VALUES (
                  :user_id, :order_number, :restaurant_id, 'pending', :delivery_type,
                  :table_number, :total_amount, :customer_phone, :customer_name, :special_instructions
                )
                RETURNING id, order_number, status, total_amount, created_at
                """
            ),
            {
                "user_id": req.user_id,
                "order_number": order_number,
                "restaurant_id": req.restaurant_id,
                "delivery_type": req.delivery_type,
                "table_number": req.table_number,
                "total_amount": total,
                "customer_phone": req.customer_phone,
                "customer_name": req.customer_name,
                "special_instructions": req.special_instructions,
            },
        )
        order_row = order_res.mappings().one()
        order_id = int(order_row["id"])

        for it in req.items:
            unit_price = Decimal(str(dish_map[it.dish_id]["price"]))
            await conn.execute(
                text(
                    """
                    INSERT INTO order_items (order_id, dish_id, quantity, unit_price, special_instructions)
                    VALUES (:order_id, :dish_id, :quantity, :unit_price, :special_instructions)
                    """
                ),
                {
                    "order_id": order_id,
                    "dish_id": it.dish_id,
                    "quantity": it.quantity,
                    "unit_price": unit_price,
                    "special_instructions": it.special_instructions,
                },
            )

        await conn.commit()
        return OrderCreateResponse(**order_row)
    except HTTPException:
        await conn.rollback()
        raise
    except Exception:
        await conn.rollback()
        raise


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
