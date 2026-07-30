# Build stage
FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Use 'build' script to generate static files for Nginx
RUN npm run build

# Production stage
FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
