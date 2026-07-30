# Deployment & Server Setup Guide

This document explains how to deploy the Jerry Home Assistant app to a production or home server.

## 🐳 Docker Deployment (Recommended)

The project is optimized for Docker Compose. This ensures both the Frontend and the Node Server run in a unified environment.

### 1. Prerequisites
- **Docker** and **Docker Compose** installed.
- **Git** (to clone the repo).
- A **Gemini API Key** (for Voice features).

### 2. Launch
```bash
# Clone the repository
git clone <your-repo-url>
cd JerryHomeAssistant-app

# Set your API Key
echo "GEMINI_API_KEY=your_key_here" > .env

# Start the services
docker-compose up -d --build
```

### 3. Ports
- **Frontend**: Accessible on port `3001`.
- **Node Server**: Internal to the Docker network (proxied via Frontend).

---

## 🛠 Manual Deployment (No Docker)

If you prefer to run services manually using `pm2` or `node` directly:

### 1. Run Node Server
```bash
cd _original_node_ref
npm install
# Set GEMINI_API_KEY in your environment
PORT=3000 npm start
```

### 2. Run Frontend
```bash
cd frontend
npm install
npm run build
# Serve the 'build' folder using any web server (nginx, apache, or 'serve' package)
npx serve -s build -l 3001
```

---

## ⚙️ Network Configuration

> [!IMPORTANT]
> **Internal Proxy**: The Frontend is configured to proxy all `/api/*` requests to `http://node-server:3000`. This allows you to point the app to a single IP/domain without worrying about CORS or multiple ports.

### Troubleshooting
- **Microphone Access**: Modern browsers require **HTTPS** to use the microphone. If you are accessing the server over a public network, you should set up an SSL certificate (e.g., using Certbot/Let's Encrypt).
- **Local IP**: If running at home, ensure your server has a static local IP so you don't have to reconfigure the app if your router reassigns it.
