import os
import json
import httpx
from upstash_redis import Redis
import logging

# Access environment variables directly from Vercel environment
REDIS_API_URL = os.getenv("KV_REST_API_URL")
REDIS_API_TOKEN = os.getenv("KV_REST_API_TOKEN")

# Initialize Redis using the environment variables
redis = Redis(REDIS_API_URL, REDIS_API_TOKEN)

# Load Telegram Bot Token
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Logging setup
logging.basicConfig(level=logging.INFO)

async def process_message(message_data: dict):
    """Processes a single message from Redis."""
    chat_id = message_data.get("message", {}).get("chat", {}).get("id")
    text = message_data.get("message", {}).get("text")

    if not chat_id or not text:
        return

    # Simulate processing (e.g., saving media, further parsing, etc.)
    logging.info(f"Processing message: {text}")

    # Example: Send a processed response to the chat
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={"chat_id": chat_id, "text": f"Processed message: {text}"}
        )

async def worker():
    """Fetch and process one message from Redis when triggered by cron job."""
    message = redis.lpop("telegram_messages")

    if message:
        message_data = json.loads(message)
        await process_message(message_data)
    else:
        logging.info("No messages to process.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(worker())
