from fastapi import FastAPI
import threading
from worker_script import process_queue
import logging

app = FastAPI()

@app.get("/worker")
async def run_worker():
    logging.info("Cron job started.")
    try:
        thread = threading.Thread(target=process_queue)
        thread.start()
        return {"status": "Worker started"}
    except Exception as e:
        logging.error(f"Error in cron job: {e}")
        return {"error": str(e)}
