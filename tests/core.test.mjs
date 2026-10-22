import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parseNodes, renderConfig, customizeTemplate, profilePath} from '../docs/assets/config-core.mjs';
import {PROFILES} from '../docs/assets/profiles.mjs';
import {links, legacySS} from './fixtures.mjs';

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
    for (const [name, link] of Object.entries({...links, legacySS})) {
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
      ['custom-dns', 'windows', 'mixed', {directDns: '1.1.1.1', proxyDns: '8.8.8.8'}],
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
