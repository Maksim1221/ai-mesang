"""Launcher для AI Mesang"""
import logging
import sys
import uvicorn
from main import app

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout, format="%(levelname)s: %(message)s")
print("="*60)
print("🚀 AI Mesang запущен!")
print("📍 http://localhost:8080")
print("="*60)
uvicorn.run(app, host="127.0.0.1", port=8080, log_level="debug")
