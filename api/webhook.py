from fastapi import FastAPI, BackgroundTasks, Request
from upstash_redis import Redis
import httpx
import os

# Initialize FastAPI
app = FastAPI()

# Access environment variables directly from Vercel environment
REDIS_API_URL = os.getenv("KV_REST_API_URL")
REDIS_API_TOKEN = os.getenv("KV_REST_API_TOKEN")

# Initialize Redis using the environment variables
redis = Redis(REDIS_API_URL, REDIS_API_TOKEN)

# Telegram Bot Token
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

async def send_telegram_reply(chat_id: int, message: str):
    """Send a reply to Telegram"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient() as client:
        await client.post(url, json={"chat_id": chat_id, "text": message})

@app.post("/")
async def webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle Telegram webhook updates"""
    data = await request.json()
    
    # Extract message info
    chat_id = data.get("message", {}).get("chat", {}).get("id")
    text = data.get("message", {}).get("text")

    if not chat_id or not text:
        return {"status": "ignored"}  # Ignore non-message updates

    # Store the message in Redis queue
    redis.lpush("telegram_messages", str(data))

    # Send a Telegram reply asynchronously
    background_tasks.add_task(send_telegram_reply, chat_id, "Message received and queued!")

    return {"status": "ok"}
