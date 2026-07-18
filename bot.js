const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is running! 🤖'));
app.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const fs = require('fs');
const config = require('./config');
const queue = require('./queue');
const { downloadMedia, cleanup } = require('./downloader');

const bot = new TelegramBot(config.TOKEN, { polling: true });
const URL_REGEX = /(https?:\/\/[^\s]+)/;

// រក្សាទុក Link បណ្តោះអាសន្នមុនពេលអ្នកប្រើជ្រើសរើស Format
const pendingLinks = new Map(); // key: messageId, value: url

function isAllowed(chatId) {
  if (config.ALLOWED_CHAT_IDS.length === 0) return true;
  return config.ALLOWED_CHAT_IDS.includes(chatId);
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    '👋 សួស្តី! ផ្ញើ Link វីដេអូមកខ្ញុំ (YouTube, TikTok, Instagram, Facebook, Twitter/X) ខ្ញុំនឹងជួយទាញយកឱ្យ។'
  );
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  if (text.startsWith('/')) return;

  const match = text.match(URL_REGEX);
  if (!match) return;

  if (!isAllowed(chatId)) {
    return bot.sendMessage(chatId, '🚫 អ្នកមិនមានសិទ្ធិប្រើប្រាស់ Bot នេះទេ។');
  }

  const url = match[0];

  // ជំហានទី ១: ផ្ញើសារធម្មតាសិន (គ្មានប៊ូតុង)
  const sentMsg = await bot.sendMessage(chatId, '🎬 ជ្រើសរើសទម្រង់ដែលអ្នកចង់ទាញយក៖');

  // ជំហានទី ២: ចងវាទៅនឹង message_id ដែលទទួលបានមកវិញ
  pendingLinks.set(sentMsg.message_id, url);

  // ជំហានទី ៣: បន្ថែមប៊ូតុងចូលទៅសារនោះ
  await bot.editMessageReplyMarkup({
    inline_keyboard: [
      [
        { text: '📹 វីដេអូ', callback_data: `dl:video:${sentMsg.message_id}` },
        { text: '🎵 សំឡេង (MP3)', callback_data: `dl:audio:${sentMsg.message_id}` },
      ],
    ],
  }, { chat_id: chatId, message_id: sentMsg.message_id });
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const [, type, refMsgId] = query.data.split(':');
  const url = pendingLinks.get(Number(refMsgId));

  bot.answerCallbackQuery(query.id);

  if (!url) {
    return bot.editMessageText('⚠️ Link នេះផុតកំណត់ សូមផ្ញើម្តងទៀត។', {
      chat_id: chatId, message_id: query.message.message_id,
    });
  }
  pendingLinks.delete(Number(refMsgId));

  const posInQueue = queue.position;
  await bot.editMessageText(
    posInQueue > 0
      ? `⏳ ក្នុងជួរ (${posInQueue} នាក់មុនអ្នក)...`
      : '⏳ កំពុងទាញយក 0%...',
    { chat_id: chatId, message_id: query.message.message_id }
  );

  try {
    const filePath = await queue.add(() =>
      downloadMedia(url, type, async (percent) => {
        try {
          await bot.editMessageText(`⏳ កំពុងទាញយក ${percent}%...`, {
            chat_id: chatId, message_id: query.message.message_id,
          });
        } catch (_) { /* ignore edit rate-limit errors */ }
      })
    );

    const stats = fs.statSync(filePath);
    if (stats.size > config.MAX_FILE_SIZE) {
      await bot.editMessageText('⚠️ ឯកសារធំជាង 50MB មិនអាចផ្ញើបានទេ។', {
        chat_id: chatId, message_id: query.message.message_id,
      });
    } else {
      await bot.editMessageText('📤 កំពុងផ្ញើឯកសារ...', {
        chat_id: chatId, message_id: query.message.message_id,
      });
      if (type === 'audio') {
        await bot.sendAudio(chatId, filePath);
      } else {
        await bot.sendVideo(chatId, filePath, {}, { contentType: 'video/mp4' });
      }
      await bot.deleteMessage(chatId, query.message.message_id);
    }
    cleanup(filePath);
  } catch (err) {
    console.error(err);
    const errMsg = err.message === 'TIMEOUT'
      ? '⏱️ ការទាញយកយូរពេក សូមសាកល្បង Link ផ្សេង។'
      : '❌ មិនអាចទាញយកបានទេ។ Link ប្រហែលមិនត្រូវបានគាំទ្រ ឬឯកជន។';
    bot.editMessageText(errMsg, { chat_id: chatId, message_id: query.message.message_id });
  }
});

console.log('🤖 Bot កំពុងដំណើរការ...');