# Stage 1: Build the React Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Node Server
FROM node:20-slim
WORKDIR /app

# Install build tools
RUN npm install -g esbuild

# Copy server dependencies
COPY _original_node_ref/package*.json ./
RUN npm install

# Copy server source
COPY _original_node_ref/ ./

# Build the server (outputs to dist/server.cjs)
# Note: vite build is skipped here because we are using the frontend/ app
RUN esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs

# Copy the built frontend from Stage 1 into the server's 'dist' folder
# server.ts serves static files from the 'dist' folder in production
COPY --from=frontend-build /app/frontend/build ./dist

EXPOSE 3000

ENV NODE_ENV=production

# Run the server using the compiled output
CMD ["node", "dist/server.cjs"]
