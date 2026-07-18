module.exports = {
  TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  MAX_FILE_SIZE: 49 * 1024 * 1024, // 49MB (Telegram limit ~50MB)
  MAX_CONCURRENT_DOWNLOADS: 2,      // ដំណើរការក្នុងពេលតែមួយ
  DOWNLOAD_TIMEOUT: 180000,         // 3 នាទី
  // ទុកទទេ = អនុញ្ញាតគ្រប់គ្នា, ឬដាក់ Chat ID ដើម្បីកំណត់
  ALLOWED_CHAT_IDS: [], // ឧទាហរណ៍: [123456789, -100987654321]
MAX_REQUESTS_PER_USER_PER_HOUR: 5,
};