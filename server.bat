@echo off
cd /d "%~dp0"
echo Starting AI Mesang on http://localhost:8080
python -m uvicorn main:app --host 127.0.0.1 --port 8080 --log-level info
