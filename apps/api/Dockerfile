FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev
ENV PORT=8080
EXPOSE 8080
CMD ["node", "lib/server.js"]
