import os
import re
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

import models


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

PRODUCTION_FRONTEND_URL = "https://food-ordering-frontend-web.onrender.com"

load_dotenv(dotenv_path=Path(__file__).with_name(".env"), override=False)


def _get_env(name: str, default: str | None = None) -> str:
    val = os.getenv(name, default)
    if val is None or val.strip() == "":
        raise RuntimeError(f"Missing required env var: {name}")
    return val


def _parse_cors_origins(raw: str) -> list[str]:
    parts = [p.strip().rstrip("/") for p in raw.split(",")]
    parts = [p for p in parts if p]
    if len(parts) == 1 and parts[0] == "*":
        return ["*"]
    return parts or ["*"]


def _get_cors_origins() -> list[str]:
    """CORS allowlist from env; permissive on Render until CORS_ORIGINS is set."""
    raw = os.environ.get("CORS_ORIGINS")
    if raw is not None and raw.strip():
        return _parse_cors_origins(raw)

    frontend_url = os.environ.get("FRONTEND_URL", "").strip()
    if frontend_url:
        return [frontend_url.rstrip("/")]

    is_render = os.environ.get("RENDER", "").lower() in ("true", "1", "yes")
    is_prod = os.environ.get("ENVIRONMENT", "").lower() in ("production", "prod")
    if is_render or is_prod:
        return [PRODUCTION_FRONTEND_URL]

    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        PRODUCTION_FRONTEND_URL,
    ]


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
    _engine = create_async_engine(database_url, pool_pre_ping=True, connect_args={"ssl": "require"})
    return _engine

app = FastAPI(title="Food Ordering API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _create_tables_on_startup() -> None:
    engine = get_engine()

    # Ensure all model classes are imported/registered on Base.metadata
    _ = (
        models.User,
        models.Category,
        models.Dish,
        models.Order,
        models.OrderItem,
        models.CartItem,
        models.RestaurantSettings,
    )

    def _create_all(sync_engine) -> None:
        models.Base.metadata.create_all(bind=sync_engine)

    async with engine.begin() as conn:
        await conn.run_sync(_create_all)
        await conn.execute(
            text(
                """
                ALTER TABLE restaurant_settings
                ADD COLUMN IF NOT EXISTS restaurant_name VARCHAR(255) NOT NULL DEFAULT 'MUCHACHO'
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE restaurant_settings
                ADD COLUMN IF NOT EXISTS restaurant_phone VARCHAR(32) NOT NULL DEFAULT '+79001102003'
                """
            )
        )
        await conn.execute(
            text(
                """
                DO $$
                BEGIN
                  IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'restaurant_settings' AND column_name = 'admin_phone'
                  ) THEN
                    UPDATE restaurant_settings
                    SET restaurant_phone = admin_phone
                    WHERE restaurant_phone IS NULL OR restaurant_phone = '+79001102003';
                    ALTER TABLE restaurant_settings DROP COLUMN admin_phone;
                  END IF;
                END $$;
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE restaurant_settings
                ALTER COLUMN address SET DEFAULT 'Большой проспект П.С., 39'
                """
            )
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


class UserProfileUpsertRequest(BaseModel):
    phone: str = Field(min_length=3, max_length=20)
    email: str | None = Field(default=None, max_length=255)
    name: str | None = Field(default=None, max_length=100)
    birth_date: date | None = None


@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, conn: DbConn) -> UserResponse:
    password_hash = pwd_context.hash(req.password) if req.password else None

    try:
        existing = await conn.execute(
            text(
                """
                SELECT id
                FROM users
                WHERE phone = :phone
                """
            ),
            {"phone": req.phone},
        )
        existing_row = existing.mappings().first()

        if existing_row:
            res = await conn.execute(
                text(
                    """
                    UPDATE users
                    SET
                        email = COALESCE(:email, email),
                        name = COALESCE(:name, name),
                        birth_date = COALESCE(:birth_date, birth_date),
                        password_hash = COALESCE(:password_hash, password_hash)
                    WHERE phone = :phone
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
        else:
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
        raise


@app.put("/users/profile", response_model=UserResponse)
async def upsert_user_profile(req: UserProfileUpsertRequest, conn: DbConn) -> UserResponse:
    try:
        res = await conn.execute(
            text(
                """
                INSERT INTO users (phone, email, name, birth_date)
                VALUES (:phone, :email, :name, :birth_date)
                ON CONFLICT (phone) DO UPDATE
                SET
                  email = COALESCE(EXCLUDED.email, users.email),
                  name = COALESCE(EXCLUDED.name, users.name),
                  birth_date = COALESCE(EXCLUDED.birth_date, users.birth_date)
                RETURNING id, phone, email, name, birth_date, role, is_phone_verified, created_at
                """
            ),
            {
                "phone": req.phone,
                "email": req.email,
                "name": req.name,
                "birth_date": req.birth_date,
            },
        )
        await conn.commit()
        row = res.mappings().one()
        return UserResponse(**row)
    except Exception:
        await conn.rollback()
        raise


DEFAULT_RESTAURANT_ID = int(os.getenv("DEFAULT_RESTAURANT_ID", "1"))


def _slugify_category_name(name: str) -> str:
    slug = name.strip().lower()
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"[^a-z0-9\-а-яё]", "", slug)
    return slug or f"category-{uuid.uuid4().hex[:8]}"


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class CategoryUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class CategoryResponse(BaseModel):
    id: int
    name: str


@app.get("/categories", response_model=list[CategoryResponse])
async def list_categories(conn: DbConn) -> list[CategoryResponse]:
    res = await conn.execute(
        text("SELECT id, name FROM categories ORDER BY id ASC")
    )
    rows = res.mappings().all()
    return [CategoryResponse(**r) for r in rows]


@app.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(req: CategoryCreate, conn: DbConn) -> CategoryResponse:
    try:
        res = await conn.execute(
            text(
                """
                INSERT INTO categories (restaurant_id, name, slug)
                VALUES (:restaurant_id, :name, :slug)
                RETURNING id, name
                """
            ),
            {
                "restaurant_id": DEFAULT_RESTAURANT_ID,
                "name": req.name.strip(),
                "slug": _slugify_category_name(req.name),
            },
        )
        await conn.commit()
        row = res.mappings().one()
        return CategoryResponse(**row)
    except Exception:
        await conn.rollback()
        raise


@app.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int, req: CategoryUpdate, conn: DbConn
) -> CategoryResponse:
    try:
        res = await conn.execute(
            text(
                """
                UPDATE categories
                SET name = :name, slug = :slug
                WHERE id = :category_id
                RETURNING id, name
                """
            ),
            {
                "category_id": category_id,
                "name": req.name.strip(),
                "slug": _slugify_category_name(req.name),
            },
        )
        row = res.mappings().one_or_none()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
        await conn.commit()
        return CategoryResponse(**row)
    except HTTPException:
        await conn.rollback()
        raise
    except Exception:
        await conn.rollback()
        raise


@app.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: int, conn: DbConn) -> None:
    try:
        res = await conn.execute(
            text("DELETE FROM categories WHERE id = :category_id RETURNING id"),
            {"category_id": category_id},
        )
        row = res.mappings().one_or_none()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
        await conn.commit()
    except HTTPException:
        await conn.rollback()
        raise
    except Exception:
        await conn.rollback()
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
    is_active: bool
    is_recommended: bool
    is_spicy: bool
    popularity_score: int
    image_url: str | None
    preparation_time_min: int | None
    created_at: Any
    updated_at: Any


class DishCreate(BaseModel):
    category_id: int
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    price: Decimal
    old_price: Decimal | None = None
    ingredients: str | None = None
    nutrition_info: Any | None = None
    weight_grams: int | None = None
    is_available: bool = True
    is_recommended: bool = False
    is_spicy: bool = False
    popularity_score: int = 0
    image_url: str | None = None
    preparation_time_min: int | None = None
    is_active: bool = True


class DishUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    price: Decimal | None = None
    old_price: Decimal | None = None
    ingredients: str | None = None
    nutrition_info: Any | None = None
    weight_grams: int | None = None
    is_available: bool | None = None
    is_recommended: bool | None = None
    is_spicy: bool | None = None
    popularity_score: int | None = None
    image_url: str | None = None
    preparation_time_min: int | None = None
    is_active: bool | None = None


@app.post("/dishes", response_model=DishResponse, status_code=status.HTTP_201_CREATED)
async def create_dish(req: DishCreate, conn: DbConn) -> DishResponse:
    try:
        res = await conn.execute(
            text(
                """
                INSERT INTO dishes (
                  category_id, name, description, price, old_price, ingredients,
                  nutrition_info, weight_grams, is_available, is_recommended, is_spicy,
                  popularity_score, image_url, preparation_time_min, is_active
                )
                VALUES (
                  :category_id, :name, :description, :price, :old_price, :ingredients,
                  :nutrition_info, :weight_grams, :is_available, :is_recommended, :is_spicy,
                  :popularity_score, :image_url, :preparation_time_min, :is_active
                )
                RETURNING
                  id, category_id, name, description, price, old_price,
                  ingredients, nutrition_info, weight_grams,
                  is_available, is_active, is_recommended, is_spicy, popularity_score,
                  image_url, preparation_time_min, created_at, updated_at
                """
            ),
            req.model_dump(),
        )
        await conn.commit()
        row = res.mappings().one()
        return DishResponse(**row)
    except Exception:
        await conn.rollback()
        raise


@app.put("/dishes/{dish_id}", response_model=DishResponse)
async def update_dish(dish_id: int, req: DishUpdate, conn: DbConn) -> DishResponse:
    data = req.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=422, detail="No fields to update")

    try:
        res = await conn.execute(
            text(
                """
                UPDATE dishes
                SET
                  category_id = COALESCE(:category_id, category_id),
                  name = COALESCE(:name, name),
                  description = COALESCE(:description, description),
                  price = COALESCE(:price, price),
                  old_price = COALESCE(:old_price, old_price),
                  ingredients = COALESCE(:ingredients, ingredients),
                  nutrition_info = COALESCE(:nutrition_info, nutrition_info),
                  weight_grams = COALESCE(:weight_grams, weight_grams),
                  is_available = COALESCE(:is_available, is_available),
                  is_recommended = COALESCE(:is_recommended, is_recommended),
                  is_spicy = COALESCE(:is_spicy, is_spicy),
                  popularity_score = COALESCE(:popularity_score, popularity_score),
                  image_url = COALESCE(:image_url, image_url),
                  preparation_time_min = COALESCE(:preparation_time_min, preparation_time_min),
                  is_active = COALESCE(:is_active, is_active),
                  updated_at = NOW()
                WHERE id = :dish_id
                RETURNING
                  id, category_id, name, description, price, old_price,
                  ingredients, nutrition_info, weight_grams,
                  is_available, is_active, is_recommended, is_spicy, popularity_score,
                  image_url, preparation_time_min, created_at, updated_at
                """
            ),
            {"dish_id": dish_id, **{k: data.get(k) for k in DishUpdate.model_fields.keys()}},
        )
        row = res.mappings().first()
        if row is None:
            await conn.rollback()
            raise HTTPException(status_code=404, detail="Dish not found")
        await conn.commit()
        return DishResponse(**row)
    except HTTPException:
        raise
    except Exception:
        await conn.rollback()
        raise


@app.delete("/dishes/{dish_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dish(dish_id: int, conn: DbConn) -> None:
    try:
        res = await conn.execute(text("DELETE FROM dishes WHERE id = :dish_id"), {"dish_id": dish_id})
        if res.rowcount == 0:
            await conn.rollback()
            raise HTTPException(status_code=404, detail="Dish not found")
        await conn.commit()
        return None
    except HTTPException:
        raise
    except Exception:
        await conn.rollback()
        raise


@app.get("/dishes", response_model=list[DishResponse])
async def list_dishes(
    conn: DbConn,
    restaurant_id: int | None = None,
    category_id: int | None = None,
    available_only: bool = True,
    include_inactive: bool = False,
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
    if not include_inactive:
        where.append("d.is_active = true")
    if available_only:
        where.append("d.is_available = true")

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    res = await conn.execute(
        text(
            f"""
            SELECT
              d.id, d.category_id, d.name, d.description, d.price, d.old_price,
              d.ingredients, d.nutrition_info, d.weight_grams,
              d.is_available, d.is_active, d.is_recommended, d.is_spicy, d.popularity_score,
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


class OrderHistoryItem(BaseModel):
    dish_id: int
    dish_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal
    special_instructions: str | None = None


class OrderHistoryEntry(BaseModel):
    id: int
    order_number: str
    status: str
    total_amount: Decimal
    created_at: Any
    delivery_type: str
    table_number: str | None
    items: list[OrderHistoryItem]


class RestaurantSettingsResponse(BaseModel):
    restaurant_name: str = "MUCHACHO"
    restaurant_phone: str = "+79001102003"
    address: str = "Большой проспект П.С., 39"
    working_hours: str = ""


class RestaurantSettingsUpdateRequest(BaseModel):
    restaurant_name: str = "MUCHACHO"
    restaurant_phone: str = "+79001102003"
    address: str = "Большой проспект П.С., 39"
    working_hours: str = ""


@app.post("/orders", response_model=OrderCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_order(req: OrderCreateRequest, conn: DbConn) -> OrderCreateResponse:
    if req.delivery_type == "at_table" and (req.table_number is None or req.table_number.strip() == ""):
        raise HTTPException(status_code=422, detail="table_number is required for at_table orders")

    dish_ids = sorted({it.dish_id for it in req.items})
    res = await conn.execute(
        text(
            """
            SELECT d.id, d.price, d.is_available, d.is_active
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
    inactive = [d for d in dish_ids if not dish_map[d].get("is_active", True)]
    if inactive:
        raise HTTPException(status_code=409, detail={"message": "Some dishes are hidden", "dish_ids": inactive})

    total = Decimal("0")
    for it in req.items:
        unit_price = Decimal(str(dish_map[it.dish_id]["price"]))
        total += unit_price * it.quantity

    order_number = uuid.uuid4().hex[:12].upper()

    try:
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


async def _require_admin(conn: DbConn, phone: str) -> None:
    res = await conn.execute(text("SELECT role FROM users WHERE phone = :phone"), {"phone": phone})
    row = res.mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Admin user not found")
    if str(row["role"]) != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


_DEFAULT_RESTAURANT_NAME = "MUCHACHO"
_DEFAULT_RESTAURANT_PHONE = "+79001102003"
_DEFAULT_RESTAURANT_ADDRESS = "Большой проспект П.С., 39"


def _settings_response_from_row(row: Any) -> RestaurantSettingsResponse:
    return RestaurantSettingsResponse(
        restaurant_name=row["restaurant_name"] or _DEFAULT_RESTAURANT_NAME,
        restaurant_phone=row["restaurant_phone"] or _DEFAULT_RESTAURANT_PHONE,
        address=row["address"] or _DEFAULT_RESTAURANT_ADDRESS,
        working_hours=row["working_hours"] or "",
    )


@app.get("/restaurant/settings", response_model=RestaurantSettingsResponse)
async def get_restaurant_settings(conn: DbConn) -> RestaurantSettingsResponse:
    res = await conn.execute(
        text(
            """
            SELECT restaurant_name, restaurant_phone, address, working_hours
            FROM restaurant_settings
            ORDER BY id ASC
            LIMIT 1
            """
        )
    )
    row = res.mappings().first()
    if row is not None:
        return _settings_response_from_row(row)

    try:
        ins = await conn.execute(
            text(
                """
                INSERT INTO restaurant_settings (
                  restaurant_name, restaurant_phone, address, working_hours
                )
                VALUES (
                  :restaurant_name, :restaurant_phone, :address, :working_hours
                )
                RETURNING restaurant_name, restaurant_phone, address, working_hours
                """
            ),
            {
                "restaurant_name": _DEFAULT_RESTAURANT_NAME,
                "restaurant_phone": _DEFAULT_RESTAURANT_PHONE,
                "address": _DEFAULT_RESTAURANT_ADDRESS,
                "working_hours": "",
            },
        )
        await conn.commit()
        return _settings_response_from_row(ins.mappings().one())
    except Exception:
        await conn.rollback()
        raise


@app.put("/restaurant/settings", response_model=RestaurantSettingsResponse)
async def update_restaurant_settings(req: RestaurantSettingsUpdateRequest, conn: DbConn) -> RestaurantSettingsResponse:
    try:
        upd = await conn.execute(
            text(
                """
                UPDATE restaurant_settings
                SET restaurant_name = :restaurant_name,
                    restaurant_phone = :restaurant_phone,
                    address = :address,
                    working_hours = :working_hours
                WHERE id = (
                  SELECT id FROM restaurant_settings ORDER BY id ASC LIMIT 1
                )
                RETURNING restaurant_name, restaurant_phone, address, working_hours
                """
            ),
            {
                "restaurant_name": req.restaurant_name.strip(),
                "restaurant_phone": req.restaurant_phone.strip(),
                "address": req.address.strip(),
                "working_hours": req.working_hours.strip(),
            },
        )
        row = upd.mappings().first()
        if row is None:
            ins = await conn.execute(
                text(
                    """
                    INSERT INTO restaurant_settings (
                      restaurant_name, restaurant_phone, address, working_hours
                    )
                    VALUES (
                      :restaurant_name, :restaurant_phone, :address, :working_hours
                    )
                    RETURNING restaurant_name, restaurant_phone, address, working_hours
                    """
                ),
                {
                    "restaurant_name": req.restaurant_name.strip(),
                    "restaurant_phone": req.restaurant_phone.strip(),
                    "address": req.address.strip(),
                    "working_hours": req.working_hours.strip(),
                },
            )
            row = ins.mappings().one()

        await conn.commit()
        return _settings_response_from_row(row)
    except Exception:
        await conn.rollback()
        raise


@app.get("/orders/history", response_model=list[OrderHistoryEntry])
async def get_orders_history(conn: DbConn, phone: str) -> list[OrderHistoryEntry]:
    user_res = await conn.execute(text("SELECT id FROM users WHERE phone = :phone"), {"phone": phone})
    user_row = user_res.mappings().first()
    if user_row is None:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = int(user_row["id"])

    res = await conn.execute(
        text(
            """
            SELECT
              o.id,
              o.order_number,
              o.status,
              o.total_amount,
              o.created_at,
              o.delivery_type,
              o.table_number,
              COALESCE(
                json_agg(
                  json_build_object(
                    'dish_id', d.id,
                    'dish_name', d.name,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'line_total', (oi.unit_price * oi.quantity),
                    'special_instructions', oi.special_instructions
                  )
                  ORDER BY oi.id
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'::json
              ) AS items
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.id
            LEFT JOIN dishes d ON d.id = oi.dish_id
            WHERE o.user_id = :user_id
            GROUP BY o.id
            ORDER BY o.created_at DESC, o.id DESC
            """
        ),
        {"user_id": user_id},
    )

    rows = res.mappings().all()
    out: list[OrderHistoryEntry] = []
    for r in rows:
        items_raw = r["items"] or []
        items: list[OrderHistoryItem] = [OrderHistoryItem(**it) for it in items_raw]
        out.append(
            OrderHistoryEntry(
                id=int(r["id"]),
                order_number=str(r["order_number"]),
                status=str(r["status"]),
                total_amount=Decimal(str(r["total_amount"])),
                created_at=r["created_at"],
                delivery_type=str(r["delivery_type"]),
                table_number=r["table_number"],
                items=items,
            )
        )

    return out


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


class MakeAdminRequest(BaseModel):
    phone: str = Field(min_length=3, max_length=20)


@app.post("/make-admin")
async def make_admin(req: MakeAdminRequest, conn: DbConn) -> dict[str, Any]:
    """Временный эндпоинт: назначить пользователю role = admin."""
    try:
        res = await conn.execute(
            text(
                """
                UPDATE users
                SET role = 'admin'
                WHERE phone = :phone
                RETURNING id, phone, role
                """
            ),
            {"phone": req.phone},
        )
        row = res.mappings().first()
        if row is None:
            await conn.rollback()
            raise HTTPException(status_code=404, detail="User not found")
        await conn.commit()
        return {
            "id": int(row["id"]),
            "phone": row["phone"],
            "role": str(row["role"]),
            "message": "User is now admin",
        }
    except HTTPException:
        raise
    except Exception:
        await conn.rollback()
        raise


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host=host, port=port)
