class DownloadQueue {
  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.next();
    });
  }

  async next() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;
    this.running++;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.running--;
      this.next();
    }
  }

  get position() {
    return this.queue.length;
  }
}

module.exports = new DownloadQueue(require('./config').MAX_CONCURRENT_DOWNLOADS);