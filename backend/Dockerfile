# backend/Dockerfile

# Multi-stage Dockerfile for building and running a Node.js TypeScript application

# --- Build Stage ---
FROM node:22-alpine AS build-stage
WORKDIR /usr/src/app

# Copy package.json and lock files to leverage Docker caching for dependencies
COPY package*.json ./

# Install all dependencies, including those needed for TypeScript compilation
RUN npm install

# Copy the entire source code into the container
COPY . .

# Execute the TypeScript build command defined in package.json scripts
RUN npm run build

# --- Run Stage ---
FROM node:22-alpine AS run-stage
WORKDIR /usr/src/app

# Copy package.json and lock files for production dependency installation
COPY package*.json ./

# Install only production dependencies to minimize image size
RUN npm install --only=production

# Copy the compiled output (dist directory) from the build stage
COPY --from=build-stage /usr/src/app/dist ./dist

# Optionally copy the .env file (alternatively, pass via docker-compose environment)
# COPY .env . # Uncomment to include the .env file

# Expose the application's port
EXPOSE 3333

# Define the command to start the application using the compiled entry point
CMD [ "node", "dist/server.js" ]