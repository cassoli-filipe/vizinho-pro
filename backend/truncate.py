import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres')
    async with engine.begin() as conn:
        await conn.execute(text('TRUNCATE TABLE reviews, providers, profiles CASCADE'))
    print("Database truncated successfully.")

asyncio.run(run())
