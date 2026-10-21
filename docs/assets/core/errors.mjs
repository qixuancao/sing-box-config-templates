// Error codes and safe messages never include input values.
export class ConfigError extends Error {
  constructor(code, position = null) { super(code); this.name = 'ConfigError'; this.code = code; this.position = position; }
}
export const fail = code => { throw new ConfigError(code); };
export const requireValue = (condition, code) => { if (!condition) fail(code); };

const MESSAGES = {
  empty: ['请粘贴节点分享链接，或选择节点 JSON 文件。', 'Paste node links or choose a nodes JSON file.'],
  'too-large': ['输入超过 1 MB，请减少节点数量。', 'Input exceeds 1 MB; use fewer nodes.'],
  'too-many': ['一次最多生成 200 个节点。', 'Use up to 200 nodes at a time.'],
  json: ['JSON 格式有误，请检查逗号和引号。', 'Invalid JSON; check commas and quotes.'],
  nodes: ['需要至少一个节点；JSON 应包含非空的 outbounds 数组。', 'Provide at least one node in an outbounds array.'],
  scheme: ['支持 Naive HTTPS、Hysteria2、Trojan、Shadowsocks、VLESS 分享链接；其他类型可用 sing-box 节点 JSON。', 'Use Naive HTTPS, Hysteria2, Trojan, Shadowsocks or VLESS links, or native sing-box nodes JSON.'],
  link: ['分享链接格式不正确，请检查地址、端口及百分号编码。', 'Invalid share link; check the address, port and percent encoding.'],
  encoding: ['链接编码不正确，请重新复制完整的分享链接。', 'Invalid encoding; copy the complete share link again.'],
  parameters: ['链接有不支持或重复的参数；可改用客户端导出的 sing-box 节点 JSON。', 'Unsupported or duplicate link parameters; use native sing-box nodes JSON.'],
  credentials: ['节点缺少用户名或密码。', 'Missing node username or password.'],
  uuid: ['节点 UUID 格式不正确。', 'Invalid node UUID.'],
  tag: ['节点名称须非空、唯一且不占用内部策略组名称。', 'Node names must be nonempty, unique and different from internal policy group names.'],
  server: ['节点服务器或 TLS 名称格式不正确。', 'Invalid node server address or TLS name.'],
  port: ['端口必须是 1 到 65535 的整数。', 'Port must be an integer from 1 to 65535.'],
  'node-type': ['节点类型不受支持；请使用 sing-box 出站对象，策略组不能作为节点导入。', 'Unsupported node type; import sing-box node outbounds, not policy groups.'],
  method: ['Shadowsocks 加密方式不受支持或未填写。', 'Missing or unsupported Shadowsocks cipher.'],
  security: ['TLS 设置有误；请检查 security 与 TLS 字段。', 'Invalid TLS settings; check security and TLS fields.'],
  reality: ['Reality 公钥、short ID 或 TLS 设置有误。', 'Invalid Reality public key, short ID or TLS settings.'],
  flow: ['不支持此 flow，Vision 需要 TCP 和 TLS。', 'Unsupported flow; Vision requires TCP and TLS.'],
  transport: ['不支持此传输设置；可使用 TCP、WebSocket、gRPC 或 HTTPUpgrade，或导入节点 JSON。', 'Unsupported transport; use TCP, WebSocket, gRPC, HTTPUpgrade or native nodes JSON.'],
  obfs: ['Hysteria2 混淆需要 salamander 和对应密码。', 'Hysteria2 obfuscation requires salamander and its password.'],
  network: ['network 只能是 tcp 或 udp。', 'network must be tcp or udp.'],
  udp: ['udp_outbounds 必须是节点名称数组，且名称存在、不重复。', 'udp_outbounds must contain unique, existing node names.'],
  'udp-tcp': ['UDP 策略组包含只支持 TCP 的节点，请调整 udp_outbounds。', 'A TCP-only node is listed in udp_outbounds; correct the list.'],
  profile: ['请选择有效的平台、版本和使用场景。', 'Choose a supported platform, core version and scenario.'],
  template: ['模板不完整，请更新页面后重试。', 'Incomplete template; update the page and retry.'],
  reference: ['节点引用了不存在的出站、DNS 或规则集，请检查节点 JSON。', 'A node references a missing outbound, DNS server or rule set; check the nodes JSON.'],
  'reference-cycle': ['节点与策略组形成循环引用，请检查节点的 detour 设置。', 'A node and policy group form a cycle; check node detour settings.'],
};
export function errorMessage(error, language = 'zh') {
  const english = language === 'en';
  const message = MESSAGES[error?.code]?.[english ? 1 : 0] || (english ? 'Unable to generate configuration; check the input.' : '无法生成配置，请检查输入。');
  return error?.position ? `${english ? 'Node / line' : '节点／行'} ${error.position}：${message}` : message;
}
