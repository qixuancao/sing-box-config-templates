// End-to-end checks using an isolated local Chrome profile; no npm dependencies.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp, readFile, writeFile, rm, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PLATFORMS, CORES, profilePath} from '../docs/assets/config-core.mjs';

const docs = fileURLToPath(new URL('../docs/', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'sing-box-browser-'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async operation => {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) { const value = await operation(); if (value) return value; await pause(50); }
  throw new Error('Browser check timed out');
};
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith('/sing-box-config-templates/')) { res.writeHead(404); res.end(); return; }
    const relative = decodeURIComponent(pathname.slice('/sing-box-config-templates/'.length));
    const file = resolve(docs, relative + (relative.endsWith('/') || !relative ? 'index.html' : ''));
    if (!file.startsWith(docs)) throw new Error('Invalid path');
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type': {'.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.xml': 'application/xml'}[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
let chrome, ws, closeBrowser;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const profile = join(temporary, 'chrome');
  chrome = spawn(process.env.CHROME || 'google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], {stdio: 'ignore'});
  let launchError;
  chrome.on('error', error => { launchError = error; });
  const port = await until(async () => {
    if (launchError) throw new Error('Chrome unavailable; set CHROME to its executable');
    try { return (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { return false; }
  });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, {once: true}); ws.addEventListener('error', reject, {once: true}); });
  let counter = 0;
  const pending = new Map(), exceptions = [], requests = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const item = pending.get(message.id); if (!item) return;
      pending.delete(message.id);
      if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++counter;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timed out: ${method}`)); }, 30000);
    pending.set(id, {resolve: value => {clearTimeout(timer); resolve(value);}, reject: error => {clearTimeout(timer); reject(error);}});
    ws.send(JSON.stringify({id, method, params}));
  });
  closeBrowser = () => send('Browser.close');
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true, userGesture: true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const navigate = async suffix => {
    await send('Page.navigate', {url: `${origin}/sing-box-config-templates/${suffix}`});
    await until(() => evaluate(`document.readyState === 'complete' && document.documentElement.lang === ${JSON.stringify(suffix ? 'en' : 'zh-CN')} && Boolean(document.getElementById('scenario')?.options.length)`));
  };
  const input = async text => evaluate(`document.getElementById('nodes-input').value=${JSON.stringify(text)}; document.getElementById('nodes-input').dispatchEvent(new Event('input'));`);
  const generated = () => evaluate("!document.getElementById('download-json').disabled && document.getElementById('status').classList.contains('success')");
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: 1280, height: 1100, deviceScaleFactor: 1, mobile: false});
  const downloads = join(temporary, 'downloads'); await mkdir(downloads);
  await send('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: downloads, eventsEnabled: true});
  const sample = 'hy2://example-password@example.com:443#Browser-UDP\nnaive+https://example-user:example-password@example.com:443#Browser-TCP';
  let combinations = 0;
  for (const suffix of ['', 'en/']) {
    console.log(`Checking browser ${suffix ? 'English' : 'Chinese'} page...`);
    await navigate(suffix);
    assert.equal(await evaluate("document.getElementById('core').value"), '1.14');
    const experimentalLabel = suffix ? /Experimental/ : /实验版/;
    assert.match(await evaluate("document.querySelector('#core option[value=\"1.15\"]').textContent"), experimentalLabel);
    assert.equal(await evaluate("document.getElementById('nodes-input').value"), '');
    assert.equal(await evaluate("document.getElementById('download-json').disabled"), true);
    const before = requests.length;
    await input(sample);
    for (const [platform, scenarios] of Object.entries(PLATFORMS)) {
      for (const core of CORES) {
        for (const scenario of scenarios) {
          const mode = scenario === 'mixed' ? 'local' : 'tun';
          const dnsMode = platform === 'macos' && scenario === 'realip' ? 'realip' : 'auto';
          await evaluate(`for (const [id,value] of ${JSON.stringify([['platform', platform], ['core', core], ['scenario', scenario], ['access-mode', mode], ['dns-mode', dnsMode]])}) {const el=document.getElementById(id); el.value=value; el.dispatchEvent(new Event('change'));} document.getElementById('generate').click();`);
          assert.equal(await generated(), true, `${suffix} ${platform} ${core} ${scenario}: ${await evaluate("document.getElementById('status').textContent")} | ${await evaluate("document.getElementById('dns-mode').value")} | ${await evaluate("document.getElementById('access-mode').value")}`);
          const output = JSON.parse(await evaluate("document.getElementById('json-preview').value"));
          assert.deepEqual(output.outbounds.find(n => n.tag === 'udp-auto').outbounds, ['Browser-UDP']);
          assert.equal(output.outbounds.find(n => n.tag === 'Browser-TCP').type, 'naive');
          const path = `platforms/${platform}/${core}/${scenario}.json`;
          assert.equal(profilePath(platform, core, scenario), path);
          assert.equal(await evaluate("document.getElementById('out-path').value"), path);
          assert.equal(await evaluate("document.getElementById('out-raw').value"), `https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/${path}`);
          if (core === '1.15') {
            assert.match(await evaluate("document.getElementById('warnings').textContent"), /1\.15/);
            assert.match(await evaluate("document.getElementById('result-summary').textContent"), experimentalLabel);
            assert.ok(output.inbounds.every(inbound => !Object.hasOwn(inbound, 'stack')));
          }
          combinations++;
        }
      }
    }
    // Advanced settings must affect the JSON, not only on-screen descriptions.
    await evaluate("document.getElementById('platform').value='linux'; document.getElementById('platform').dispatchEvent(new Event('change'))");
    await evaluate("document.getElementById('core').value='1.14'; document.getElementById('core').dispatchEvent(new Event('change'))");
    await evaluate("document.getElementById('access-mode').value='system'; document.getElementById('access-mode').dispatchEvent(new Event('change'))");
    await evaluate("document.getElementById('dns-mode').value='realip'; document.getElementById('dns-mode').dispatchEvent(new Event('change'))");
    await evaluate("document.getElementById('direct-dns').value='custom'; document.getElementById('direct-dns').dispatchEvent(new Event('change'))");
    await evaluate("document.getElementById('direct-custom').value='1.1.1.1'; document.getElementById('direct-custom').dispatchEvent(new Event('input'))");
    await evaluate("document.getElementById('proxy-dns').value='8.8.8.8'; document.getElementById('proxy-dns').dispatchEvent(new Event('change'))");
    await evaluate("document.getElementById('listen-port').value='3128'; document.getElementById('listen-port').dispatchEvent(new Event('input'))");
    assert.equal(await evaluate("document.getElementById('dns-mode').querySelector('[value=fakeip]').disabled"), true);
    await evaluate("document.getElementById('generate').click()");
    assert.equal(await generated(), true);
    const customized = JSON.parse(await evaluate("document.getElementById('json-preview').value"));
    assert.equal(customized.inbounds[0].set_system_proxy, true);
    assert.equal(customized.inbounds[0].listen_port, 3128);
    assert.equal(customized.dns.servers.find(server => server.tag === 'direct-dns').server, '1.1.1.1');
    assert.equal(customized.dns.servers.find(server => server.tag === 'direct-dns-bootstrap').server, '1.1.1.1');
    assert.equal(customized.dns.servers.find(server => server.tag === 'proxy-dns').server, '8.8.8.8');
    assert.match(await evaluate("document.getElementById('import-help').textContent"), /3128/);
    await evaluate("document.getElementById('direct-custom').value='999.999.999.999';document.getElementById('direct-custom').dispatchEvent(new Event('input')); document.getElementById('generate').click()");
    assert.equal(await evaluate("document.getElementById('download-json').disabled"), true);
    await evaluate("document.getElementById('direct-custom').value='1.1.1.1'; document.getElementById('direct-custom').dispatchEvent(new Event('input'))");
    await evaluate("document.getElementById('access-mode').value='local';document.getElementById('access-mode').dispatchEvent(new Event('change'));document.getElementById('generate').click()");
    const listener = JSON.parse(await evaluate("document.getElementById('json-preview').value"));
    assert.equal(listener.inbounds[0].set_system_proxy, false);
    await evaluate("document.getElementById('access-mode').value='tun';document.getElementById('access-mode').dispatchEvent(new Event('change'));document.getElementById('dns-mode').value='fakeip';document.getElementById('dns-mode').dispatchEvent(new Event('change'));document.getElementById('generate').click()");
    const tunFake = JSON.parse(await evaluate("document.getElementById('json-preview').value"));
    assert.equal(tunFake.inbounds[0].type, 'tun');
    assert.ok(tunFake.dns.servers.some(server => server.type === 'fakeip'));
    assert.equal(tunFake.experimental.cache_file.store_fakeip, true);
    assert.equal(requests.length, before, 'Generation must make no network requests');
    // A changed input or device must invalidate an earlier successful result.
    const deep = '{"type":"http","tag":"DO-NOT-ECHO","server":"example.com","server_port":443,"extra":' + '['.repeat(60000) + '0' + ']'.repeat(60000) + '}';
    for (const invalid of [
      'naive+https://example-user:DO-NOT-ECHO@example.com:443?unknown=1',
      'trojan://DO-NOT-ECHO@example.com:443?type=ws&host=a%0D%0Ab',
      deep,
    ]) {
      await input(invalid);
      assert.equal(await evaluate("document.getElementById('download-json').disabled"), true);
      await evaluate("document.getElementById('generate').click()");
      const error = await evaluate("document.getElementById('status').textContent");
      assert.ok(error.length > 5); assert.equal(error.includes('DO-NOT-ECHO'), false);
      if (invalid === deep) assert.match(error, /100/);
      assert.equal(await evaluate("document.getElementById('download-json').disabled"), true);
      assert.equal(await evaluate("document.getElementById('download-nodes').disabled"), true);
      assert.equal(await evaluate("document.getElementById('copy-json').disabled"), true);
      assert.equal(await evaluate("document.getElementById('json-preview').value"), '');
    }
    const password = 'p#?%41% +@:/\\密码';
    const legacy = 'ss://' + Buffer.from(`aes-128-gcm:${password}@example.com:8388`).toString('base64') + '#Browser-SS';
    await input(legacy);
    await evaluate("document.getElementById('generate').click()");
    assert.equal(await generated(), true);
    const legacyOutput = JSON.parse(await evaluate("document.getElementById('json-preview').value"));
    assert.equal(legacyOutput.outbounds.find(node => node.tag === 'Browser-SS').password, password);
    await input('naive+https://example-user:example-password@example.com:443#Browser-TCP');
    await evaluate("document.getElementById('generate').click()"); assert.equal(await generated(), true);
    assert.equal((await evaluate("document.getElementById('json-preview').value")).includes('udp-auto'), false);
    await evaluate("document.getElementById('platform').value='android'; document.getElementById('platform').dispatchEvent(new Event('change'))");
    assert.equal(await evaluate("document.getElementById('download-json').disabled"), true);
    const previousDocument = await evaluate('performance.timeOrigin');
    await send('Page.reload');
    await until(() => evaluate(`performance.timeOrigin !== ${previousDocument} && document.readyState === 'complete' && Boolean(document.getElementById('scenario')?.options.length)`));
    assert.equal(await evaluate("document.getElementById('nodes-input').value"), '', 'Refresh must clear node material');
  }
  console.log('Checking JSON downloads and node file re-import...');
  await navigate(''); await input(sample);
  await evaluate("document.getElementById('generate').click();document.getElementById('download-json').click()");
  const saved = await until(async () => { try { return JSON.parse(await readFile(join(downloads, 'sing-box.json'), 'utf8')); } catch { return false; } });
  assert.equal(saved.outbounds.find(n => n.tag === 'Browser-UDP').password, 'example-password');
  assert.equal(saved.outbounds.find(n => n.tag === 'Browser-TCP').username, 'example-user');
  await evaluate("document.getElementById('download-nodes').click()");
  const savedNodes = await until(async () => { try { return JSON.parse(await readFile(join(downloads, 'nodes.json'), 'utf8')); } catch { return false; } });
  assert.deepEqual(savedNodes.udp_outbounds, ['Browser-UDP']);
  await evaluate("document.getElementById('clear').click()");
  const {root} = await send('DOM.getDocument');
  const {nodeId} = await send('DOM.querySelector', {nodeId: root.nodeId, selector: '#nodes-file'});
  await send('DOM.setFileInputFiles', {nodeId, files: [join(downloads, 'nodes.json')]});
  await until(() => evaluate("document.getElementById('nodes-input').value.includes('Browser-UDP')"));
  await evaluate("document.getElementById('generate').click()"); assert.equal(await generated(), true);
  assert.equal(await evaluate("document.getElementById('node-list').children.length"), 2);
  assert.equal(await evaluate("localStorage.length + sessionStorage.length"), 0);
  const screenshotDirectory = process.env.SCREENSHOT_DIR;
  if (screenshotDirectory) {
    await mkdir(screenshotDirectory, {recursive: true});
    const picture = await send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true});
    await writeFile(join(screenshotDirectory, 'desktop.png'), Buffer.from(picture.data, 'base64'));
  }
  await send('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'Mobile layout must not scroll horizontally');
  if (screenshotDirectory) {
    const picture = await send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true});
    await writeFile(join(screenshotDirectory, 'mobile.png'), Buffer.from(picture.data, 'base64'));
  }
  assert.deepEqual(exceptions, [], 'No browser runtime exceptions');
  assert.equal(requests.some(request => request.postData || request.method !== 'GET'), false);
  assert.equal(requests.some(request => request.url.includes('example-password')), false);
  console.log(`Browser passed: ${combinations} bilingual presets, real JSON and nodes downloads, file re-import, stale output, refresh privacy and mobile layout.`);
} finally {
  // Graceful shutdown lets Chrome's child processes finish their profile writes.
  if (ws?.readyState === WebSocket.OPEN && closeBrowser) await closeBrowser().catch(() => {});
  ws?.close();
  if (chrome?.pid && chrome.exitCode === null && chrome.signalCode === null) {
    const exited = new Promise(resolve => chrome.once('exit', resolve));
    await Promise.race([exited, pause(2000)]);
    if (chrome.exitCode === null && chrome.signalCode === null) { chrome.kill('SIGKILL'); await exited; }
  }
  await new Promise(resolve => server.close(resolve));
  await rm(temporary, {recursive: true, force: true, maxRetries: 10, retryDelay: 100});
}
