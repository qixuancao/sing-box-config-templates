import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parseNodes, renderConfig, customizeTemplate, profilePath} from '../docs/assets/config-core.mjs';
import {PROFILES} from '../docs/assets/profiles.mjs';
import {uuid, links, legacySS} from './fixtures.mjs';

const extraLinks = {
  vmess: 'vmess://' + Buffer.from(JSON.stringify({
    v: '2', ps: 'VMess', add: 'example.com', port: 443, id: uuid, aid: 0,
    scy: 'auto', net: 'ws', host: 'example.com', path: '/ws?ed=2048', tls: 'tls', sni: 'example.com',
  })).toString('base64'),
  tuic: `tuic://${uuid}:example-password@example.com:443?sni=example.com&alpn=h3&congestion_control=bbr#TUIC`,
  anytls: 'anytls://example-password@example.com:443?sni=example.com&fp=chrome#AnyTLS',
  hy2Hop: 'hy2://example-password@example.com:443?sni=example.com&mport=20000-30000&upmbps=100&downmbps=200#Hy2Hop',
  socks5: 'socks5://user:example-password@example.com:1080#SOCKS5',
};

test('generated links pass the selected real sing-box core on every maintained preset', () => {
  const core = process.env.SING_BOX;
  assert.ok(core, 'SING_BOX is required; use python3 scripts/check.py core');
  const version = spawnSync(core, ['version'], {encoding: 'utf8'});
  assert.equal(version.status, 0);
  const line = version.stdout.match(/sing-box version (1\.(?:13|14|15))\./)?.[1];
  assert.ok(line);
  const profiles = Object.entries(PROFILES).filter(([path]) => path.includes(`/${line}/`));
   assert.equal(profiles.length, 11);
  const directory = mkdtempSync(join(tmpdir(), 'sing-box-core-'));
  try {
    for (const [name, link] of Object.entries({...links, legacySS, ...extraLinks})) {
      const nodes = parseNodes(link);
      for (const [path, template] of profiles) {
        const file = join(directory, 'config.json');
        writeFileSync(file, JSON.stringify(renderConfig(template, nodes)), {mode: 0o600});
        const result = spawnSync(core, ['check', '-c', file], {cwd: directory, encoding: 'utf8'});
        assert.equal(result.status, 0, `${name} ${path}: ${result.stdout}${result.stderr}`);
      }
    }
    // Real kernel validates the advanced UI's new combinations as well as public presets.
    for (const [path, base] of profiles) {
      for (const dns of ['realip', 'fakeip']) {
        if (path.endsWith('/mixed.json') && dns === 'fakeip') continue;
        const template = customizeTemplate(base, {
          dnsTemplate: PROFILES[profilePath('android', line, dns)], ipv6: true, lanBypass: false
        });
        const file = join(directory, 'ipv6.json');
        writeFileSync(file, JSON.stringify(renderConfig(template, parseNodes(links.hy2))));
        const result = spawnSync(core, ['check', '-c', file], {cwd: directory, encoding: 'utf8'});
        assert.equal(result.status, 0, `${path} ${dns} IPv6: ${result.stdout}${result.stderr}`);
      }
    }
    for (const [name, platform, scenario, options] of [
      ['system', 'linux', 'mixed', {systemProxy: true, listenPort: 3128}],
      ['mac-system', 'macos', 'mixed', {systemProxy: true, listenPort: 3128}],
      ['fakeip-tun', 'linux', 'tun', {dnsTemplate: PROFILES[profilePath('android', line, 'fakeip')]}],
      ['custom-dns', 'windows', 'mixed', {directDns: '1.12.12.12', proxyDns: '8.8.8.8', adblock: true, ruleSetProxy: true, clashApiPort: 9090}],
      ['adblock-tun', 'android', 'fakeip', {adblock: true, ruleSetProxy: true}],
      ['overlay-quic-tun', 'linux', 'tun', {blockQuic: true, overlay: true}],
      ['overlay-fakeip-win', 'windows', 'tun', {dnsTemplate: PROFILES[profilePath('android', line, 'fakeip')], blockQuic: true, overlay: true, ipv6: true}],
      ['overlay-mac', 'macos', 'fakeip', {overlay: true}],
      ['overlay-system', 'macos', 'mixed', {systemProxy: true, overlay: true, blockQuic: true}],
      ['quic-mobile', 'ios', 'realip', {blockQuic: true}],
    ]) {
      const template = customizeTemplate(PROFILES[profilePath(platform, line, scenario)], options);
      const result = renderConfig(template, parseNodes(Object.values(links)[0]));
      const file = join(directory, 'config.json');
      writeFileSync(file, JSON.stringify(result), {mode: 0o600});
      const checked = spawnSync(core, ['check', '-c', file], {cwd: directory, encoding: 'utf8'});
      assert.equal(checked.status, 0, `${name}: ${checked.stdout}${checked.stderr}`);
    }
  } finally { rmSync(directory, {recursive: true, force: true}); }
});
