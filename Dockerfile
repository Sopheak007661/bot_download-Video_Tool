FROM node:20-slim

# ដំឡើង Python, pip, ffmpeg
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

# ដំឡើង yt-dlp
RUN pip3 install -U yt-dlp --break-system-packages

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "bot.js"]