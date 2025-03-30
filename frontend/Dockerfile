# Multi-stage Dockerfile for building and serving a Vue/Vite frontend application

# --- Build Stage ---
FROM node:22-alpine AS build-stage
WORKDIR /app

# Copy package.json and lock files to leverage Docker caching for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code into the container
COPY . .

# Execute the Vue/Vite build command
# VITE_API_BASE_URL is read at build time and baked into the code
# To change the API URL at runtime, configure a reverse proxy in Nginx (requires more complex setup)
RUN npm run build

# --- Serve Stage ---
FROM nginx:stable-alpine

# Copy static files generated from the build stage to Nginx's web root directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Replace the default Nginx configuration with a custom config file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose Nginx's default port
EXPOSE 80

# Explicitly define the command to start Nginx (though the base image does this by default)
CMD ["nginx", "-g", "daemon off;"]