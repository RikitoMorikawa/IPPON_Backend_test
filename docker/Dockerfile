# Use a Node.js base image
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies (including dev dependencies)
RUN npm install --force

# Copy the rest of the application code to the container
COPY . .

# Build the application (compile TypeScript)
RUN npm run build

# Copy the templates into the dist folder
RUN cp -r src/templates dist/

# Expose port 3000 for the application
EXPOSE 3000

# Command to start the application in production
CMD ["npm", "run", "start:prod"]
