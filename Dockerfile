FROM node:20-slim

# Install only necessary dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build the frontend React app
RUN npm run build

# Create output directory
RUN mkdir -p /app/output

# Expose port 3001 for the server
EXPOSE 3001

# Command to run the app (serves backend + frontend)
CMD ["node", "server.js"]