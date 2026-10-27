// Turns the Streamer.bot screenshots in _scenes/get-started/ into the WebP pictures the "Get started"
// popovers play (assets/img/get-started/). Edge or Chrome does the encoding, so nothing has to be installed.
// Run it after adding or replacing a screenshot:  node _tools/demo-images.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
process.chdir(path.join(__dirname, '..'));

const QUALITY = 0.9;
// source in _scenes/get-started/, picture in assets/img/get-started/, crop [x, y, width, height]
const jobs = [
  ['sb-actions.png', 'sb-actions.webp'],
  ['sb-actions-chatcalendar.png', 'sb-actions-chatcalendar.webp', [300, 140, 500, 560]],
  ['sb-import.png', 'sb-import.webp'],
  ['sb-import-chatcalendar.png', 'sb-import-chatcalendar.webp'],
  ['sb-execute-code.png', 'sb-execute-code.webp'],
  ['sb-command-import.png', 'sb-command-import.webp'],
  ['sb-commands.png', 'sb-commands.webp'],
  ['sb-commands-menu.png', 'sb-commands-menu.webp', [384, 248, 158, 234]],
  ['sb-commands-enabled.png', 'sb-commands-enabled.webp', [336, 284, 764, 358]],
  ['sb-actions-settings.png', 'sb-actions-settings.webp'],
  ['sb-actions-settings.png', 'sb-trigger-menu.webp', [1003, 250, 167, 470]],
  ['chatcalendar-settings.png', 'chatcalendar-settings.webp'],
  ['chatcalendar-calendar.png', 'chatcalendar-calendar.webp'],
  ['chatcalendar-calendar-me.png', 'chatcalendar-me-badge.webp', [696, 36, 28, 28]],
  ['chatcalendar-calendar-me.png', 'chatcalendar-me-country.webp', [128, 128, 270, 22]],
  ['chatcalendar-calendar-me.png', 'chatcalendar-unsaved.webp', [374, 660, 122, 20]],
  ['chatcalendar-downloading.png', 'chatcalendar-downloading.webp', [120, 420, 616, 128]],
  ['chatcalendar-downloaded.png', 'chatcalendar-downloaded.webp', [120, 420, 616, 128]],
];

const browser = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(file => fs.existsSync(file));
if (!browser) throw new Error('Edge or Chrome not found');
const fileUrl = file => 'file:///' + path.resolve(file).replace(/\\/g, '/');
const sleep = ms => new Promise(done => setTimeout(done, ms));

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-images-'));
const list = jobs.map(([from, to, crop]) => ({ src: fileUrl(path.join('_scenes/get-started', from)), to, crop }));
fs.writeFileSync(path.join(work, 'encode.html'), `<!doctype html><script>
window.encoded = (async () => {
  const out = [];
  for (const job of ${JSON.stringify(list)}) {
    const img = new Image();
    img.src = job.src;
    await img.decode();
    const [x, y, w, h] = job.crop || [0, 0, img.naturalWidth, img.naturalHeight];
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
    out.push([job.to, canvas.toDataURL('image/webp', ${QUALITY}).split(',')[1]]);
  }
  return out;
})();
</script>`);

// one call over the DevTools protocol
function call(socketUrl, method, params) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(socketUrl);
    socket.onopen = () => socket.send(JSON.stringify({ id: 1, method, params }));
    socket.onmessage = event => {
      const answer = JSON.parse(event.data);
      if (answer.id !== 1) return;
      socket.close();
      answer.error ? reject(new Error(answer.error.message)) : resolve(answer.result);
    };
    socket.onerror = () => reject(new Error(`no answer to ${method}`));
  });
}

(async () => {
  const port = 9300 + Math.floor(Math.random() * 600);
  spawn(browser, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(work, 'profile')}`, 'about:blank'], { stdio: 'ignore', detached: true }).unref();
  let version;
  for (let i = 0; i < 100 && !version; i++) {
    version = await fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.json(), () => null);
    if (!version) await sleep(200);
  }
  if (!version) throw new Error('the browser did not start');
  try {
    const page = await fetch(`http://127.0.0.1:${port}/json/new?${fileUrl(path.join(work, 'encode.html'))}`, { method: 'PUT' })
      .then(r => r.json());
    let result;
    for (let i = 0; i < 50 && !result; i++) {
      const answer = await call(page.webSocketDebuggerUrl, 'Runtime.evaluate',
        { expression: 'window.encoded', awaitPromise: true, returnByValue: true });
      if (answer.exceptionDetails) throw new Error(answer.exceptionDetails.exception?.description || 'encoding failed');
      result = answer.result.value;
      if (!result) await sleep(200);
    }
    if (!result) throw new Error('the page did not load');
    for (const [name, data] of result) {
      const file = path.join('assets/img/get-started', name);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      console.log(`${file}  ${Math.round(fs.statSync(file).size / 1024)} KB`);
    }
  } finally {
    await call(version.webSocketDebuggerUrl, 'Browser.close').catch(() => {});
    await sleep(500);
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
})().catch(e => {
  console.error(e.message);
  process.exitCode = 1;
});
