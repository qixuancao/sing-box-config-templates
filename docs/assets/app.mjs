import {PLATFORMS, profilePath, parseNodes, renderConfig, customizeTemplate, ConfigError, errorMessage} from './config-core.mjs';
import {PROFILES} from './profiles.mjs';

const english = document.documentElement.lang === 'en';
const t = (zh, en) => english ? en : zh;
const byId = id => document.getElementById(id);
const input = byId('nodes-input'), platform = byId('platform'), core = byId('core');
const access = byId('access-mode'), dnsMode = byId('dns-mode'), directDns = byId('direct-dns'), proxyDns = byId('proxy-dns'), listenPort = byId('listen-port');
const desktop = () => ['linux', 'windows', 'macos'].includes(platform.value);
const ipv6 = byId('ipv6'), lanBypass = byId('lan-bypass');
const chosenScenario = () => desktop() && access.value !== 'tun' ? 'mixed'
  : ['linux', 'windows'].includes(platform.value) ? 'tun' : dnsMode.value;
const resolvedDNS = select => select.value === 'default' ? null : select.value;
const dnsTemplateFor = () => {
  const from = PLATFORMS[platform.value].includes(dnsMode.value) ? platform.value : 'android';
  return PROFILES[profilePath(from, core.value, dnsMode.value)];
};
const status = byId('status'), download = byId('download-json'), copy = byId('copy-json');
let config = null, parsed = null, example = false, revision = 0;

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
  if (reset) {
    access.value = ['linux', 'windows'].includes(platform.value) ? 'local' : 'tun';
    dnsMode.value = ['linux', 'windows'].includes(platform.value) ? 'realip' : 'fakeip';
  }
  updateDetails();
}
function updateDetails() {
  invalidate();
  const isDesktop = desktop(), isTun = !isDesktop || access.value === 'tun';
  byId('access-setting').hidden = !isDesktop;
  byId('lan-setting').hidden = !isTun;
  byId('port-setting').hidden = isTun;
  byId('listen-port').disabled = isTun;
  byId('access-desc').textContent = access.value === 'system'
    ? t('启动 sing-box 时自动写入系统 HTTP 代理，退出时恢复。并非 TUN，未遵循系统代理的应用和 UDP 不保证接管。', 'sing-box sets the OS HTTP proxy on startup and restores it on shutdown. This is not TUN; applications that ignore OS proxy settings and UDP may bypass it.')
    : access.value === 'tun'
      ? t('使用虚拟网卡接管流量，需系统权限或客户端 VPN 授权；不等同于系统 HTTP 代理。', 'Routes traffic through a virtual interface. Requires OS privileges or VPN authorization; it does not toggle the HTTP system proxy.')
      : t('只在 127.0.0.1 监听 HTTP / SOCKS，既不设置系统代理，也不接管全局流量。', 'Only listens for HTTP / SOCKS on 127.0.0.1; does not enable OS proxy or capture all traffic.');
  const fakeOption = dnsMode.querySelector('option[value="fakeip"]');
  fakeOption.disabled = isDesktop && !isTun;
  if (fakeOption.disabled && dnsMode.value === 'fakeip') dnsMode.value = 'realip';
  byId('dns-desc').textContent = fakeOption.disabled
    ? t('纯端口 / 系统代理模式不接管系统 DNS，因此禁用 FakeIP；可以选择 RealIP 和上游 DNS。', 'Local / system proxy does not capture OS DNS, so FakeIP is disabled. RealIP and upstream DNS remain configurable.')
    : t('RealIP 返回真实地址，FakeIP 返回虚拟地址。TUN / VPN 模式需要正确接管 DNS 才能使用 FakeIP。', 'RealIP returns real addresses; FakeIP returns synthetic addresses and requires working TUN / VPN DNS capture.');
  const selected = chosenScenario(), path = profilePath(platform.value, core.value, selected);
  byId('out-path').value = path;
  byId('out-raw').value = `https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/${path}`;
  const options = [`--platform ${platform.value}`, `--core ${core.value}`, `--access ${isDesktop ? access.value : 'tun'}`, `--dns ${dnsMode.value}`];
  if (ipv6.checked) options.push('--ipv6');
  if (isTun && !lanBypass.checked) options.push('--no-lan-bypass');
  if (!isTun) options.push(`--port ${listenPort.value}`);
  if (resolvedDNS(directDns)) options.push(`--direct-dns ${directDns.value}`);
  if (resolvedDNS(proxyDns)) options.push(`--proxy-dns ${proxyDns.value}`);
  byId('out-cmd').value = `node scripts/generate.mjs ${options.join(' ')} --input nodes.txt --output generated/sing-box.json\nsing-box check -c generated/sing-box.json`;
  const port = listenPort.value || '2080';
  byId('import-help').textContent = isDesktop && !isTun
    ? access.value === 'system'
      ? t(`启动 sing-box run -c sing-box.json，会尝试将系统 HTTP 代理指向 127.0.0.1:${port}，停止时恢复；具体取决于操作系统与桌面环境。`, `Start sing-box run -c sing-box.json to set the OS proxy to 127.0.0.1:${port} (restored on shutdown); support depends on your OS and desktop environment.`)
      : t(`启动 sing-box run -c sing-box.json，并手动将应用代理设置为 127.0.0.1:${port}；不会自动修改系统代理。`, `Start sing-box run -c sing-box.json and manually configure app HTTP / SOCKS proxy to 127.0.0.1:${port}. No OS proxy is changed.`)
    : isDesktop && platform.value !== 'macos'
      ? t('先使用 sing-box check 检查，再以系统所需权限启动 TUN；远程设备必须保留其他管理通道。', 'Run sing-box check first, then start TUN with the required privileges; keep another management channel for remote devices.')
      : t('下载并在 sing-box 客户端中导入 JSON，随后授予 VPN / TUN 权限并连接。', 'Import the JSON into your sing-box client, grant VPN / TUN permissions, and connect.');
}

function generate() {
  invalidate();
  try {
    const nodes = parseNodes(input.value);
    const path = profilePath(platform.value, core.value, chosenScenario());
    const port = desktop() && access.value !== 'tun' ? Number(listenPort.value) : 2080;
    if (desktop() && access.value !== 'tun' &&
      (!/^\d+$/.test(listenPort.value) || !Number.isInteger(port) || port < 1 || port > 65535)) throw new Error('bad-port');
    const direct = resolvedDNS(directDns), proxy = resolvedDNS(proxyDns);
    const template = customizeTemplate(PROFILES[path], {
      dnsTemplate: dnsTemplateFor(), systemProxy: desktop() && access.value === 'system',
      listenPort: port, directDns: direct, proxyDns: proxy, ipv6: ipv6.checked, lanBypass: lanBypass.checked
    });
    const result = renderConfig(template, nodes);
    config = result; parsed = nodes;
    byId('json-preview').value = JSON.stringify(result, null, 2) + '\n';
    byId('result-empty').hidden = true;
    const coreLabel = core.value === '1.15' ? t('1.15 · 实验版', '1.15 · Experimental') : core.value;
    const modeText = desktop() ? (access.value === 'tun' ? 'TUN' : access.value === 'system' ? t('自动系统代理', 'Auto OS proxy') : t('仅监听端口', 'Listener only')) : 'VPN / TUN';
    const fake = result.dns.servers.some(server => server.type === 'fakeip');
    [t(`${nodes.outbounds.length} 个节点`, `${nodes.outbounds.length} nodes`), `${nodes.udp_outbounds.length} UDP`, `${coreLabel} · ${platform.value}`, modeText, fake ? 'FakeIP' : 'RealIP'].forEach(text => {
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
    if (!nodes.udp_outbounds.length) warnings.push(t('这些节点未声明 UDP 能力；代理 UDP 无法保证可用，不会自动改走直连。', 'These nodes have no declared UDP capability; proxied UDP may fail and will not fall back to direct.'));
    else if (nodes.udp_outbounds.length < nodes.outbounds.length) warnings.push(t('自动选择仅使用支持 UDP 的节点，以保持 TCP/UDP 出口一致；其他节点可手动选择。', 'Automatic selection uses UDP-capable nodes for a consistent TCP/UDP exit; other nodes remain available manually.'));
    if (nodes.outbounds.some(node => node.tls?.insecure)) warnings.push(t('部分节点关闭了证书校验，请确认这是你的预期设置。', 'Some nodes disable TLS certificate verification; confirm this is intentional.'));
    if (nodes.outbounds.some(node => node.type === 'naive')) warnings.push(t('Naive 需要客户端内核包含 Naive 支持；Linux / Windows 请保留官方包内的 Cronet 库。', 'Naive requires a compatible core; keep the bundled Cronet library on Linux / Windows.'));
    byId('warnings').textContent = warnings.join(' '); byId('warnings').hidden = !warnings.length;
    download.disabled = false; copy.disabled = false; byId('download-nodes').disabled = false;
    showStatus(t('配置已生成，可以下载 JSON。', 'Configuration ready. Download the JSON file.'), 'success');
  } catch (error) {
    const message = error.message === 'bad-port'
        ? t('监听端口必须是 1 到 65535 的整数。', 'Listener port must be an integer from 1 to 65535.')
        : errorMessage(error, english ? 'en' : 'zh');
    showStatus(message, 'error');
  }
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
core.addEventListener('change', updateDetails);
ipv6.addEventListener('change', updateDetails); lanBypass.addEventListener('change', updateDetails);
access.addEventListener('change', updateDetails); dnsMode.addEventListener('change', updateDetails);
for (const select of [directDns, proxyDns]) select.addEventListener('change', updateDetails);
listenPort.addEventListener('input', updateDetails);
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
