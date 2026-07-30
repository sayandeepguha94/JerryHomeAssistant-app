FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Environment variables will be provided via docker-compose
ENV MONGO_URL=mongodb://mongodb:27017/jerry
ENV DB_NAME=jerry
ENV JWT_SECRET=change-me-in-production
ENV DEFAULT_NODE_SERVER_URL=http://node-server:3000

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
