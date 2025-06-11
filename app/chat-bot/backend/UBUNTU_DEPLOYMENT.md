# Ubuntu VPS Deployment Guide

This guide helps you deploy the chatbot backend on an Ubuntu VPS with proper environment variable loading.

## Quick Start

1. **Make scripts executable:**
```bash
cd app/chat-bot/backend
chmod +x *.py
```

2. **Check deployment readiness:**
```bash
python deploy_check.py
```

3. **Test environment loading:**
```bash
python test_env.py
```

4. **Start the server:**
```bash
python run_server.py
```

## Environment File Location

The system will automatically search for your `.env` file in the following locations (in order):

1. `PROJECT_ROOT/.env` (recommended)
2. `PROJECT_ROOT/app/.env`
3. `PROJECT_ROOT/app/chat-bot/.env`
4. `PROJECT_ROOT/app/chat-bot/backend/.env`
5. Current working directory

## Required Environment Variables

### Critical (Required)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Optional (Recommended)
- `COHERE_API_KEY` - Cohere API key for LLM
- `OPENROUTER_API_KEY` - OpenRouter API key for alternative LLM
- `HOST` - Server host (default: 0.0.0.0)
- `PORT` - Server port (default: 8000)
- `DEBUG` - Debug mode (default: True)

## Deployment Commands

### Option 1: Using the deployment check script
```bash
python deploy_check.py && python run_server.py
```

### Option 2: Direct start (original method)
```bash
python start.py
```

### Option 3: Direct uvicorn (advanced)
```bash
cd app/chat-bot/backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Troubleshooting

### 1. Environment variables not loading
- Run `python test_env.py` to check environment loading
- Ensure `.env` file is in the project root
- Check file permissions: `chmod 644 .env`

### 2. Import errors
- Install dependencies: `pip install -r requirements.txt`
- Check Python version: `python --version` (need 3.8+)

### 3. Port already in use
- Change PORT in `.env` file
- Or kill existing process: `sudo lsof -t -i:8000 | xargs kill -9`

### 4. Permission denied
- Make scripts executable: `chmod +x *.py`
- Check file ownership: `ls -la`

## Systemd Service (Production)

Create a systemd service for automatic startup:

```bash
sudo nano /etc/systemd/system/chatbot-api.service
```

```ini
[Unit]
Description=Chatbot API
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/your/project/app/chat-bot/backend
ExecStart=/usr/bin/python3 run_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable chatbot-api
sudo systemctl start chatbot-api
sudo systemctl status chatbot-api
```

## Logs

Check logs with:
```bash
# If using systemd
sudo journalctl -u chatbot-api -f

# If running directly
python run_server.py 2>&1 | tee chatbot.log
``` 