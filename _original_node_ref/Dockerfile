FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Build the app if necessary (though server.ts might run directly)
# Based on package.json: "dev": "tsx server.ts"
RUN npm install -g tsx

EXPOSE 3000

CMD ["tsx", "server.ts"]
