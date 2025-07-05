# Use a Node.js base image
FROM node:22-alpine
# Set the working directory inside the container
WORKDIR /usr/src/app
# Copy package.json and package-lock.json to the container
COPY package*.json ./
# Install dependencies (including dev dependencies)
RUN npm install --force
# Copy Prisma schema and generate Prisma Client
COPY prisma ./prisma
RUN npx prisma generate
# Copy the rest of the application code
COPY . .
# Build the application (compile TypeScript to JavaScript)
RUN npm run build
# Copy templates into the built dist folder
RUN cp -r src/templates dist/
# Expose port 3000
EXPOSE 3000
# Start the application in production mode
CMD ["npm", "run", "start:prod"]