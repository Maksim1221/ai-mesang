import asyncio, aiosqlite
async def main():
    db = await aiosqlite.connect("ai_mesang.db")
    db.row_factory = aiosqlite.Row
    c = await db.execute("SELECT * FROM users")
    rows = await c.fetchall()
    for r in rows:
        print(dict(r))
    await db.close()
asyncio.run(main())
