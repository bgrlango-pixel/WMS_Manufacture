# Use official Node.js image as base for Node.js service
FROM node:16 as node-builder

# Set working directory
WORKDIR /app/node

# Copy Node.js service files
COPY apiendpoint/node/package*.json ./
RUN npm install

COPY apiendpoint/node .

# Use official Python image for Python service
FROM python:3.8

# Set working directory
WORKDIR /app

# Copy Python service files
COPY apiendpoint/requirements.txt .
RUN pip install -r requirements.txt

# Copy the rest of the application
COPY apiendpoint .

# Copy Node.js build from previous stage
COPY --from=node-builder /app/node /app/node

# Set environment variables
ENV PORT=8080
ENV HOST=0.0.0.0

# Start both services using a shell script
COPY start.sh .
RUN chmod +x start.sh

CMD ["./start.sh"]