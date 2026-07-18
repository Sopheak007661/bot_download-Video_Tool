const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

/**
 * @param {string} url - Link វីដេអូ
 * @param {'video'|'audio'} type - ប្រភេទឯកសារ
 * @param {function} onProgress - Callback(percent)
 */
function downloadMedia(url, type, onProgress) {
  return new Promise((resolve, reject) => {
    const fileId = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const outputTemplate = path.join(DOWNLOAD_DIR, `${fileId}.%(ext)s`);

    let args;
    if (type === 'audio') {
  args = [
    '--cookies', '/etc/secrets/cookies.txt',
    '-f', 'bestaudio',
    '-x', '--audio-format', 'mp3', '--audio-quality', '0',
    '-o', outputTemplate,
    '--newline',
    url,
  ];
} else {
  args = [
    '--cookies', '/etc/secrets/cookies.txt',
    '-f', 'best[filesize<45M]/best',
    '-o', outputTemplate,
    '--newline',
    url,
  ];
}

    const proc = spawn('yt-dlp', args);
    let lastPercent = -1;
    let stderrBuf = '';

    proc.stdout.on('data', (data) => {
      const str = data.toString();
      // yt-dlp output ឧទាហរណ៍: "[download]  45.2% of 10.00MiB at 1.2MiB/s"
      const match = str.match(/(\d{1,3}\.\d)%/);
      if (match) {
        const percent = Math.floor(parseFloat(match[1]));
        if (percent !== lastPercent && percent % 10 === 0) {
          lastPercent = percent;
          onProgress(percent);
        }
      }
    });

    proc.stderr.on('data', (data) => { stderrBuf += data.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('TIMEOUT'));
    }, require('./config').DOWNLOAD_TIMEOUT);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(stderrBuf || `yt-dlp exited with code ${code}`));
      }
      const files = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.startsWith(fileId));
      if (files.length === 0) return reject(new Error('NO_OUTPUT_FILE'));
      resolve(path.join(DOWNLOAD_DIR, files[0]));
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function cleanup(filePath) {
  fs.unlink(filePath, () => {});
}

module.exports = { downloadMedia, cleanup, DOWNLOAD_DIR };