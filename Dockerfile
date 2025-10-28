# Use official Node.js image
FROM node:16

# Set working directory
WORKDIR /app

# Copy package files
COPY apiendpoint/node/package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY apiendpoint/node .

# Expose port
ENV PORT=8080

# Start the service
CMD ["node", "server.js"]