FROM node:20-slim

# ដំឡើង Python, pip, ffmpeg, curl, unzip
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl unzip && \
    rm -rf /var/lib/apt/lists/*

# ដំឡើង Deno (JS Runtime សម្រាប់ yt-dlp ដោះស្រាយ YouTube challenges)
RUN curl -fsSL https://deno.land/install.sh | sh -s -- -y
ENV PATH="/root/.deno/bin:${PATH}"

# ដំឡើង yt-dlp (Version ចុងក្រោយ)
RUN pip3 install -U yt-dlp --break-system-packages

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "bot.js"]