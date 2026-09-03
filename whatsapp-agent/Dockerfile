FROM node:20-bookworm-slim

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV WWEBJS_AUTH_PATH=/data/.wwebjs_auth

RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation patch \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY scripts/patch-wwebjs-201832.cjs scripts/wwebjs-201832.patch ./scripts/
RUN npm install --omit=dev \
  && node scripts/patch-wwebjs-201832.cjs

COPY . .

CMD ["sh", "-c", "if [ -d \"$WWEBJS_AUTH_PATH\" ]; then find \"$WWEBJS_AUTH_PATH\" -maxdepth 4 -name 'Singleton*' -delete; fi && exec npm start"]
