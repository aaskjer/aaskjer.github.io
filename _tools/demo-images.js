// Turns the Streamer.bot screenshots in _scenes/get-started/ into the WebP pictures the "Get started"
// popovers play (assets/img/get-started/). Edge or Chrome does the encoding, so nothing has to be installed.
// Run it after adding or replacing a screenshot:  node _tools/demo-images.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
process.chdir(path.join(__dirname, '..'));

const QUALITY = 0.9;
// The last Chat Calendar screenshot was taken with Denmark chosen but Dominica's holidays downloaded
// before: its "DM · 2026" becomes "DK · 2026", the rest of the line moving up to the narrower K.
const DM_TO_DK = `g => {
  const rest = g.getImageData(160, 424, 52, 18);
  g.fillStyle = 'rgb(52, 52, 52)';
  g.fillRect(146, 424, 66, 18);
  g.putImageData(rest, 156, 424);
  g.fillRect(208, 424, 4, 18);
  g.fillStyle = 'rgb(236, 236, 236)';
  g.font = '600 13px "Segoe UI"';
  g.fillText('K', 146, 438);
}`;
// source in _scenes/get-started/, picture in assets/img/get-started/, crop [x, y, width, height],
// and a change drawn on the screenshot first
const jobs = [
  // step 2, "Import it"
  ['sb-actions.png', 'sb-actions.webp'],
  ['sb-actions-chatcalendar.png', 'sb-actions-chatcalendar.webp', [300, 140, 500, 560]],
  ['sb-import.png', 'sb-import.webp'],
  ['sb-import-chatcalendar.png', 'sb-import-chatcalendar.webp'],
  ['sb-execute-code.png', 'sb-execute-code.webp'],
  ['sb-command-import.png', 'sb-command-import.webp'],
  // step 3, "Make it yours", in the order it plays
  ['setup-01-commands.png', 'setup-commands.webp'],
  ['setup-02-commands-menu.png', 'setup-commands-menu.webp', [412, 244, 152, 232]],
  ['setup-03-commands-enabled.png', 'setup-commands-enabled.webp', [330, 282, 780, 362]],
  ['setup-04-actions-queues.png', 'setup-actions-queues.webp'],
  ['setup-05-actions.png', 'setup-actions.webp'],
  ['setup-06-actions-settings.png', 'setup-actions-settings.webp', [304, 196, 962, 416]],
  ['setup-07-trigger-menu.png', 'setup-trigger-menu.webp', [1008, 238, 170, 470]],
  ['setup-08-settings-chat.png', 'setup-settings-chat.webp'],
  ['setup-09-settings-calendar.png', 'setup-settings-calendar.webp'],
  ['setup-10-country-open.png', 'setup-country-open.webp', [118, 148, 350, 376]],
  ['setup-11-country-denmark.png', 'setup-country-denmark.webp', [118, 124, 350, 400]],
  ['setup-11-country-denmark.png', 'setup-badge-dk.webp', [692, 36, 36, 30]],
  ['setup-12-downloading.png', 'setup-country-dk.webp', [124, 124, 302, 32]],
  ['setup-13-downloaded.png', 'setup-unsaved.webp', [366, 656, 136, 26]],
  ['setup-12-downloading.png', 'setup-downloading.webp', [120, 420, 616, 128]],
  ['setup-13-downloaded.png', 'setup-downloaded.webp', [120, 420, 616, 128], DM_TO_DK],
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
const patches = jobs.map(job => job[3] || 'null');
fs.writeFileSync(path.join(work, 'encode.html'), `<!doctype html><script>
const patches = [${patches.join(',\n')}];
window.encoded = (async () => {
  await document.fonts.load('600 13px "Segoe UI"');
  const out = [];
  for (const [i, job] of ${JSON.stringify(list)}.entries()) {
    const img = new Image();
    img.src = job.src;
    await img.decode();
    const full = document.createElement('canvas');
    full.width = img.naturalWidth;
    full.height = img.naturalHeight;
    const g = full.getContext('2d');
    g.drawImage(img, 0, 0);
    if (patches[i]) patches[i](g);
    const [x, y, w, h] = job.crop || [0, 0, img.naturalWidth, img.naturalHeight];
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(full, x, y, w, h, 0, 0, w, h);
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
