"""Найти свободный порт и запустить сервер"""
import socket
import uvicorn
from main import app

def find_free_port(start=8765, end=8780):
    for port in range(start, end + 1):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind(('127.0.0.1', port))
            s.close()
            return port
        except OSError:
            continue
    return 8765

PORT = find_free_port()
print(f"🚀 AI Mesang запущен на порту: {PORT}")
print(f"📍 http://localhost:{PORT}")
uvicorn.run(app, host="127.0.0.1", port=PORT)
