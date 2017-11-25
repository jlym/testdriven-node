FROM node:carbon
WORKDIR /app

# Use a wildcard to ensure both package.json AND package-lock.json are copied.
COPY package*.json ./
RUN npm install --only=production
COPY ./dist ./dist

EXPOSE 3000
CMD [ "node", "./dist/server.js" ]
