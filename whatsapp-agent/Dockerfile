FROM node:20-bookworm-slim

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV WWEBJS_AUTH_PATH=/data/.wwebjs_auth

RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

CMD ["npm", "start"]
