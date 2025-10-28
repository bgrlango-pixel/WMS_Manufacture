# Use official Node.js 16 slim image
FROM node:16-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Start the service
CMD ["npm", "start"]