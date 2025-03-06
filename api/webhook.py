from fastapi import FastAPI, HTTPException
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, CallbackContext
import logging
import os
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables
load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Setup logging
logging.basicConfig(level=logging.INFO)

# FastAPI app initialization
app = FastAPI()

# Pydantic model to match Telegram's update data structure
class TelegramUpdate(BaseModel):
    update_id: int
    message: dict

# Telegram message handler
async def handle_message(update: Update, context: CallbackContext) -> None:
    """Process incoming messages."""
    logging.info(f"Received message: {update.message.text}")
    await update.message.reply_text("Received!")

@app.post("/")
async def webhook(update: TelegramUpdate):
    """Process incoming updates from Telegram."""
    try:
        # Initialize the Telegram bot application
        bot_app = Application.builder().token(TOKEN).build()

        # Initialize the application asynchronously
        await bot_app.initialize()

        # Log the incoming update for debugging
        logging.info(f"Received webhook update: {update.dict()}")  # Log incoming data

        # Convert the incoming update to the correct format for python-telegram-bot
        telegram_update = Update.de_json(update.dict(), bot_app.bot)

        # Add message handler
        bot_app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

        # Process the update (this is needed to trigger the message handler)
        await bot_app.process_update(telegram_update)

        return {"status": "ok"}

    except Exception as e:
        logging.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
	