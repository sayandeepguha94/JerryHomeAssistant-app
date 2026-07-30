FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Install tsx to run the TypeScript server directly
RUN npm install -g tsx

EXPOSE 3000

# Run the server
CMD ["tsx", "server.ts"]
