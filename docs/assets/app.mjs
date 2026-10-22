import {PLATFORMS, profilePath, parseNodes, renderConfig, ConfigError, errorMessage} from './config-core.mjs';
import {PROFILES} from './profiles.mjs';

const english = document.documentElement.lang === 'en';
const t = (zh, en) => english ? en : zh;
const byId = id => document.getElementById(id);
const input = byId('nodes-input'), platform = byId('platform'), core = byId('core'), scenario = byId('scenario');
const status = byId('status'), download = byId('download-json'), copy = byId('copy-json');
let config = null, parsed = null, example = false, revision = 0;
const scenarios = {
  fakeip: ['日常推荐 · FakeIP', 'Recommended · FakeIP', '适合日常分流；局域网和国内流量保留直连。', 'Everyday routing; local and mainland China traffic retain direct routes.'],
  realip: ['兼容模式 · RealIP', 'Compatibility · RealIP', '应用不兼容 FakeIP 时使用；DNS 返回真实 IP。', 'Use when an app has trouble with FakeIP; DNS returns real IPs.'],
  mixed: ['日常推荐 · 本地 HTTP / SOCKS', 'Recommended · local HTTP / SOCKS', '在应用中设置本地代理 127.0.0.1:2080，无需开启 TUN。', 'Set your app proxy to 127.0.0.1:2080; no TUN required.'],
  tun: ['TUN · 系统流量接管', 'TUN · system traffic', '需要系统 VPN / TUN 权限。远程操作设备前，先确认有其他管理通道。', 'Requires VPN / TUN privileges. Keep another management path when configuring a remote device.'],
  'tcp-stable': ['TCP 稳定', 'TCP stability', '阻断 QUIC、DoT、STUN；部分语音和游戏功能会受影响。', 'Blocks QUIC, DoT and STUN; some calls and games will be affected.'],
  'privacy-strict': ['严格 DNS 隔离', 'Strict DNS isolation', 'DNS 经代理，关闭 ECS，阻断 QUIC、DoT、STUN。', 'Proxy DNS, no ECS, and blocked QUIC, DoT and STUN.'],
  'dual-stack': ['IPv4 / IPv6 双栈', 'IPv4 / IPv6 dual stack', '本地网络和节点均有可靠 IPv6 时使用。', 'Use when both your network and nodes have reliable IPv6.'],
  'no-adblock': ['关闭广告拦截', 'Without ad blocking', '排查广告规则误杀时使用，保留其他分流。', 'For troubleshooting ad-rule false positives; keeps routing rules.'],
  'battery-saver': ['省电常驻', 'Battery saver', '降低自动测速频率和日志量。', 'Less frequent automatic probing and fewer logs.'],
  'udp-first': ['UDP 优先', 'Prefer UDP', '优先选择支持 UDP 的节点；没有 UDP 节点时自动使用 TCP 方案。', 'Prefers UDP-capable nodes; falls back to the TCP policy when none are available.'],
};

function showStatus(text = '', kind = '') { status.textContent = text; status.className = `status ${kind}`; }
function invalidate() {
  revision++; config = null; parsed = null;
  download.disabled = true; copy.disabled = true; byId('download-nodes').disabled = true;
  byId('json-preview').value = ''; byId('result-summary').replaceChildren();
  byId('node-list').replaceChildren(); byId('warnings').hidden = true;
  byId('result-empty').hidden = false;
  showStatus();
}
function updatePreset(reset = false) {
  const current = scenario.value;
  scenario.replaceChildren();
  PLATFORMS[platform.value].forEach(key => {
    const option = document.createElement('option'); option.value = key;
    option.textContent = scenarios[key][english ? 1 : 0]; scenario.append(option);
  });
  if (!reset && PLATFORMS[platform.value].includes(current)) scenario.value = current;
  updateDetails();
}
function updateDetails() {
  invalidate();
  const path = profilePath(platform.value, core.value, scenario.value);
  byId('scenario-desc').textContent = scenarios[scenario.value][english ? 3 : 2];
  byId('out-path').value = path;
  byId('out-raw').value = `https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/${path}`;
  byId('out-cmd').value = `node scripts/generate.mjs --platform ${platform.value} --core ${core.value} --scenario ${scenario.value} --input nodes.txt --output generated/sing-box.json\nsing-box check -c generated/sing-box.json`;
  const mobile = ['android', 'ios', 'macos'].includes(platform.value) && scenario.value !== 'mixed';
  byId('import-help').textContent = mobile
    ? t('下载后，在 sing-box 客户端的配置页面导入本地 JSON 文件，再启用连接。', 'Download the JSON, import it as a local profile in your sing-box client, then connect.')
    : scenario.value === 'mixed'
      ? t('运行 sing-box run -c sing-box.json，然后将应用 HTTP / SOCKS 代理设为 127.0.0.1:2080。', 'Run sing-box run -c sing-box.json, then set your app HTTP / SOCKS proxy to 127.0.0.1:2080.')
      : t('先运行 sing-box check -c sing-box.json 检查，再以系统所需权限运行 sing-box run -c sing-box.json。', 'Run sing-box check -c sing-box.json, then run sing-box run -c sing-box.json with the required system privileges.');
}

function generate() {
  invalidate();
  try {
    const nodes = parseNodes(input.value);
    const path = profilePath(platform.value, core.value, scenario.value);
    const result = renderConfig(PROFILES[path], nodes);
    config = result; parsed = nodes;
    byId('json-preview').value = JSON.stringify(result, null, 2) + '\n';
    byId('result-empty').hidden = true;
    const coreLabel = core.value === '1.15' ? t('1.15 · 实验版', '1.15 · Experimental') : core.value;
    [t(`${nodes.outbounds.length} 个节点`, `${nodes.outbounds.length} nodes`), `${nodes.udp_outbounds.length} UDP`, `${coreLabel} · ${platform.value}`].forEach(text => {
      const badge = document.createElement('span'); badge.textContent = text; byId('result-summary').append(badge);
    });
    nodes.outbounds.forEach(node => {
      const li = document.createElement('li');
      const name = document.createElement('span'); name.className = 'node-label'; name.textContent = node.tag;
      const kind = document.createElement('span'); kind.className = 'node-type';
      kind.textContent = `${node.type} · ${nodes.udp_outbounds.includes(node.tag) ? 'TCP / UDP' : 'TCP'}`;
      li.append(name, kind); byId('node-list').append(li);
    });
    const warnings = [];
    if (core.value === '1.15') warnings.push(t('1.15 实验配置，按 1.15.0-alpha.12 验证；测试版后续更新可能需要重新适配。', 'Experimental 1.15 presets, checked against 1.15.0-alpha.12; later testing releases may need updates.'));
    if (example) warnings.push(t('当前是演示节点。请替换成自己的节点后再连接。', 'These are demonstration nodes. Replace them with your own before connecting.'));
    if (!nodes.udp_outbounds.length) warnings.push(t('这些节点仅用于 TCP；需要代理的 UDP 已设为拒绝，国内与局域网直连规则保留。', 'TCP-only nodes: proxied UDP is rejected; existing mainland China and local direct routes are retained.'));
    if (nodes.outbounds.some(node => node.tls?.insecure)) warnings.push(t('部分节点关闭了证书校验，请确认这是你的预期设置。', 'Some nodes disable TLS certificate verification; confirm this is intentional.'));
    if (nodes.outbounds.some(node => node.type === 'naive')) warnings.push(t('Naive 需要客户端内核包含 Naive 支持；Linux / Windows 请保留官方包内的 Cronet 库。', 'Naive requires a compatible core; keep the bundled Cronet library on Linux / Windows.'));
    byId('warnings').textContent = warnings.join(' '); byId('warnings').hidden = !warnings.length;
    download.disabled = false; copy.disabled = false; byId('download-nodes').disabled = false;
    showStatus(t('配置已生成，可以下载 JSON。', 'Configuration ready. Download the JSON file.'), 'success');
  } catch (error) { showStatus(errorMessage(error, english ? 'en' : 'zh'), 'error'); input.focus(); }
}
function saveJSON(value, filename) {
  const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], {type: 'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function clear() {
  input.value = ''; byId('nodes-file').value = ''; example = false; invalidate();
}

input.addEventListener('input', () => { example = false; byId('nodes-file').value = ''; invalidate(); });
platform.addEventListener('change', () => updatePreset(true));
core.addEventListener('change', updateDetails); scenario.addEventListener('change', updateDetails);
byId('generate').addEventListener('click', generate);
download.addEventListener('click', () => { if (config) saveJSON(config, 'sing-box.json'); });
byId('download-nodes').addEventListener('click', () => { if (parsed) saveJSON(parsed, 'nodes.json'); });
copy.addEventListener('click', async () => {
  if (!config) return;
  const current = revision;
  try {
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2) + '\n');
    if (revision === current) showStatus(t('JSON 已复制。', 'JSON copied.'), 'success');
  } catch {
    if (revision === current) showStatus(t('浏览器未允许复制，请使用下载 JSON。', 'Clipboard unavailable; use Download JSON.'), 'error');
  }
});
byId('clear').addEventListener('click', () => { clear(); input.focus(); });
byId('example').addEventListener('click', () => {
  clear(); example = true;
  input.value = 'hy2://demo-password@example.com:443?sni=example.com#Demo-Hysteria2\nnaive+https://demo-user:demo-password@example.com:443#Demo-Naive';
  showStatus(t('已填入演示节点，可点击生成预览。', 'Demo nodes loaded; generate a preview.')); input.focus();
});
byId('nodes-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  invalidate(); example = false;
  if (!file) return;
  const current = revision;
  try {
    if (file.size > 1024 * 1024) throw new ConfigError('too-large');
    const text = await file.text();
    if (revision !== current) return;
    input.value = text;
    showStatus(t('文件已读入。选择设备后点击生成配置。', 'File loaded. Choose your device and generate.'));
  } catch (error) {
    if (revision === current) showStatus(errorMessage(error, english ? 'en' : 'zh'), 'error');
  }
});
// Prevent form restoration and back/forward cache from retaining node material.
window.addEventListener('pagehide', clear);
clear(); updatePreset(true);
