# Use the official Bun image
FROM oven/bun:latest

# Set the working directory inside the container
WORKDIR /app

# Copy application files
COPY . .

# Install dependencies
RUN bun install

# Build the application (if applicable)
RUN bun run build

# Expose the port your app will run on
EXPOSE 3000

# Set the command to run the app in production mode
CMD ["bun", "run", "start"]