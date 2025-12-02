# Use Node.js 20 LTS
FROM node:20-alpine

# Install font packages for text rendering with Sharp
# fontconfig: Font configuration library
# ttf-dejavu: DejaVu font family (good Arial alternative)
# ttf-liberation: Liberation fonts (metric-compatible with Arial, Times, Courier)
RUN apk add --no-cache \
    fontconfig \
    ttf-dejavu \
    ttf-liberation

# Refresh font cache
RUN fc-cache -f

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps for compatibility
RUN npm ci --legacy-peer-deps

# Copy source code and data
COPY . .

# Create necessary directories for RAG system
RUN mkdir -p /app/data/rag /app/uploads

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
