#!/usr/bin/env node
// Local CLI entry point for the same parser and renderer used by GitHub Pages.
import {readFile, mkdir, stat, open, rename, rm} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {parseNodes, renderConfig, customizeTemplate, profilePath, PLATFORMS, errorMessage, ConfigError} from '../docs/assets/config-core.mjs';

const HELP = `Generate a private sing-box JSON file locally (Node.js 22+).

node scripts/generate.mjs --input nodes.txt --output generated/sing-box.json
  [--platform android|ios|macos|linux|windows] [--core 1.14|1.13|1.15]
  [--access local|system|tun] [--dns fakeip|realip] [--ipv6] [--no-lan-bypass]
  [--port 2080] [--direct-dns IP] [--proxy-dns IP]
  [--scenario fakeip|realip|mixed|tun | --template PATH]

DNS providers: 223.5.5.5, 1.1.1.1 or 8.8.8.8 (HTTPS).
--scenario selects a public base; it cannot be combined with --access.
--template uses a private config as-is; customization flags are not accepted.

Input: node share links (one per line) or sing-box nodes JSON; --input - reads stdin.
Defaults: Android, core 1.14, recommended scenario for the selected platform.
Core 1.15 uses experimental presets pinned to 1.15.0-alpha.12.
Output is written atomically with mode 0600. Input files are never overwritten.
`;
const root = fileURLToPath(new URL('../', import.meta.url));
let temporary;
try {
  const {values} = parseArgs({options: {
    input: {type: 'string'}, output: {type: 'string'}, platform: {type: 'string', default: 'android'},
    core: {type: 'string', default: '1.14'}, scenario: {type: 'string'}, template: {type: 'string'}, help: {type: 'boolean'},
    access: {type: 'string'}, dns: {type: 'string'}, ipv6: {type: 'boolean'}, 'no-lan-bypass': {type: 'boolean'},
    port: {type: 'string'}, 'direct-dns': {type: 'string'}, 'proxy-dns': {type: 'string'},
  }});
  if (values.help) { process.stdout.write(HELP); process.exit(0); }
  if (!values.input || !values.output) { process.stderr.write(HELP); process.exit(2); }
  const custom = ['access', 'dns', 'ipv6', 'no-lan-bypass', 'port', 'direct-dns', 'proxy-dns'].some(key => values[key] !== undefined);
  if (values.template && (custom || values.scenario) || values.access && values.scenario) throw new ConfigError('profile');
  if (values.access && !['local', 'system', 'tun'].includes(values.access) || values.dns && !['fakeip', 'realip'].includes(values.dns)) throw new ConfigError('profile');
  const desktop = ['linux', 'windows', 'macos'].includes(values.platform);
  const access = values.access || (['linux', 'windows'].includes(values.platform) ? 'local' : 'tun');
  if (!desktop && access !== 'tun') throw new ConfigError('profile');
  let scenario = values.scenario;
  if (!scenario && !values.template) {
    scenario = access !== 'tun' ? 'mixed' : ['linux', 'windows'].includes(values.platform) ? 'tun' : (values.dns || 'fakeip');
  }
  const templatePath = values.template ? resolve(values.template) : resolve(root, profilePath(values.platform, values.core, scenario));
  const dnsPlatform = values.dns && PLATFORMS[values.platform]?.includes(values.dns) ? values.platform : 'android';
  const dnsPath = values.dns ? resolve(root, profilePath(dnsPlatform, values.core, values.dns)) : null;
  const output = resolve(values.output);
  const inputs = [templatePath, ...(dnsPath ? [dnsPath] : []), ...(values.input === '-' ? [] : [resolve(values.input)])];
  const identity = async path => { try { return await stat(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };
  const target = await identity(output);
  for (const input of inputs) {
    const source = await identity(input);
    if (output === input || target && source && target.dev === source.dev && target.ino === source.ino) throw new Error('input-alias');
  }
  if (target && !target.isFile()) throw new Error('output-not-file');
  let text;
  if (values.input === '-') {
    let bytes = 0; const chunks = [];
    for await (const chunk of process.stdin) {
      bytes += chunk.length;
      if (bytes > 1024 * 1024) throw new ConfigError('too-large');
      chunks.push(chunk);
    }
    text = Buffer.concat(chunks).toString('utf8');
  } else {
    const source = await stat(values.input);
    if (source.size > 1024 * 1024) throw new ConfigError('too-large');
    text = await readFile(values.input, 'utf8');
  }
  let template = JSON.parse(await readFile(templatePath, 'utf8'));
  if (!values.template) {
    const dnsTemplate = dnsPath ? JSON.parse(await readFile(dnsPath, 'utf8')) : null;
    if (values.port !== undefined && !/^\d+$/.test(values.port)) throw new ConfigError('template');
    template = customizeTemplate(template, {
      dnsTemplate, systemProxy: values.access === 'system', listenPort: values.port === undefined ? 2080 : Number(values.port),
      directDns: values['direct-dns'] ?? null, proxyDns: values['proxy-dns'] ?? null,
      ipv6: values.ipv6 ?? false, lanBypass: !values['no-lan-bypass']
    });
  }
  const config = renderConfig(template, parseNodes(text));
  await mkdir(dirname(output), {recursive: true, mode: 0o700});
  temporary = resolve(dirname(output), `.render.${process.pid}.${crypto.randomUUID()}`);
  const handle = await open(temporary, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(config, null, 2) + '\n'); } finally { await handle.close(); }
  await rename(temporary, output); temporary = undefined;
  process.stdout.write('Generated private configuration (mode 600).\n');
} catch (error) {
  if (temporary) await rm(temporary, {force: true}).catch(() => {});
  const message = error instanceof ConfigError ? errorMessage(error, 'en')
    : error.message === 'input-alias' ? 'output must not overwrite an input file'
    : 'Unable to read inputs or write output; check arguments, file paths and permissions.';
  process.stderr.write(`error: ${message}\n`); process.exitCode = 1;
}
