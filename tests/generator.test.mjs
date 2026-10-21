import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync as read, statSync, rmSync, symlinkSync, linkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {parseNodes, validateNodes, renderConfig, profilePath, errorMessage, ConfigError, PLATFORMS} from '../docs/assets/config-core.mjs';
import {PROFILES} from '../docs/assets/profiles.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const uuid = '00000000-0000-4000-8000-000000000001';
const links = {
  naive: 'naive+https://user:p%40ss%3Aword@example.com:443?sni=example.com#Test',
  hy2: 'hy2://user%3Apassword@example.com:443?sni=example.com&obfs=salamander&obfs-password=example-password#Test',
  trojan: 'trojan://p%40ss%3Aword@example.com:443?security=tls&type=ws&host=example.com&path=%2Fproxy#Test',
  ss: 'ss://' + btoa('aes-128-gcm:example-password') + '@example.com:8388#Test',
  vless: `vless://${uuid}@example.com:443?security=tls&type=grpc&serviceName=example&encryption=none#Test`,
};
const tcp = {type: 'http', tag: 'tcp', server: 'example.com', server_port: 443};
const udp = {type: 'hysteria2', tag: 'udp', server: 'example.com', server_port: 443, password: 'example-password', tls: {enabled: true}};

test('five link adapters preserve decoded credentials, TLS and transport', () => {
  const document = parseNodes(Object.values(links).join('\n'));
  assert.equal(document.outbounds.length, 5);
  assert.equal(document.outbounds[0].password, 'p@ss:word');
  assert.equal(document.outbounds[1].password, 'user:password');
  assert.deepEqual(document.outbounds[1].obfs, {type: 'salamander', password: 'example-password'});
  assert.deepEqual(document.outbounds[2].transport, {type: 'ws', path: '/proxy', headers: {Host: 'example.com'}});
  assert.equal(document.outbounds[3].method, 'aes-128-gcm');
  assert.deepEqual(document.outbounds[4].transport, {type: 'grpc', service_name: 'example'});
  assert.equal(new Set(document.outbounds.map(n => n.tag)).size, 5);
  assert.equal(document.udp_outbounds.length, 4);
  assert.equal(document.udp_outbounds.includes(document.outbounds[0].tag), false);
});

test('legacy SS, IPv6, Unicode names and colliding link names', () => {
  const legacy = 'ss://' + btoa('aes-128-gcm:example-password@203.0.113.7:8388') + '#Legacy';
  assert.equal(parseNodes(legacy).outbounds[0].server, '203.0.113.7');
  const document = parseNodes('hy2://password@[2001:db8::1]:443#%E8%8A%82%E7%82%B9\n' + links.naive.replace('#Test', '#select'));
  assert.equal(document.outbounds[0].server, '2001:db8::1');
  assert.equal(document.outbounds[0].tag, '节点');
  assert.equal(document.outbounds[1].tag, 'select-2');
});

test('invalid or unsupported link options fail without exposing input', () => {
  const secret = 'PRIVATE-PASSWORD-FIXTURE';
  const invalid = [
    `https://example.com/sub?token=${secret}`,
    `naive+https://user:${secret}@example.com:443?quic=1`,
    `naive+https://user:${secret}@example.com:443?sni=a&sni=b`,
    `naive+https://user:${secret}@example.com:0`,
    `naive+https://user:${secret}@example.com:70000`,
    `naive+https://user:${secret}@example.com/path`,
    `naive+https://user:${secret}@example.com#%ZZ`,
    `trojan://${secret}@example.com:443?type=xhttp`,
    `trojan://${secret}@example.com:443?type=tcp&headerType=http`,
    `trojan://${secret}@example.com:443?security=none`,
    `hy2://${secret}@example.com:443?pinSHA256=abc`,
    `ss://${btoa('aes-128-gcm:' + secret)}@example.com:8388?plugin=unknown`,
    `vless://${uuid}@example.com:443?security=none&sni=example.com`,
    `vless://${uuid}@example.com:443?security=reality&pbk=invalid`,
  ];
  for (const input of invalid) {
    assert.throws(() => parseNodes(input), error => {
      assert.ok(error instanceof ConfigError);
      assert.equal(error.position, 1);
      assert.equal(errorMessage(error).includes(secret), false);
      assert.equal(errorMessage(error, 'en').includes(secret), false);
      return true;
    });
  }
  assert.throws(() => parseNodes('{"password":"' + secret + '",}'), {code: 'json'});
});

test('native JSON shapes, automatic UDP inference and explicit override', () => {
  for (const document of [udp, [udp], {outbounds: [udp]}]) {
    assert.deepEqual(parseNodes(JSON.stringify(document)).udp_outbounds, ['udp']);
  }
  assert.deepEqual(validateNodes({outbounds: [tcp, udp]}).udp_outbounds, ['udp']);
  assert.deepEqual(validateNodes({outbounds: [tcp, udp], udp_outbounds: []}).udp_outbounds, []);
  assert.throws(() => validateNodes({outbounds: [tcp], udp_outbounds: ['tcp']}), {code: 'udp-tcp'});
  for (const document of [
    {outbounds: []}, {outbounds: [tcp, tcp]}, {outbounds: [{...tcp, tag: 'select'}]},
    {outbounds: [tcp], udp_outbounds: ['missing']}, {outbounds: [tcp], udp_outbounds: 'tcp'},
    {outbounds: [udp], udp_outbounds: ['udp', 'udp']},
    {outbounds: [udp], udp_outbounds: null},
    {outbounds: [{...tcp, tag: '   '}]},
    {outbounds: [{...udp, tls: {enabled: false}}]},
    {outbounds: [{...tcp, server_port: 0}]},
  ]) assert.throws(() => validateNodes(document), ConfigError);
});

test('all presets preserve route ordering, direct UDP and TCP-only behavior', () => {
  assert.equal(Object.keys(PROFILES).length, 34);
  const nodes = {outbounds: [tcp], udp_outbounds: []};
  const snapshot = JSON.stringify(nodes);
  for (const [path, template] of Object.entries(PROFILES)) {
    const before = JSON.stringify(template);
    const config = renderConfig(template, nodes);
    assert.equal(JSON.stringify(template), before);
    assert.equal(JSON.stringify(nodes), snapshot);
    assert.equal(JSON.stringify(config).includes('udp-auto'), false, path);
    assert.deepEqual(config.route.rules.filter(r => r.outbound === 'direct'), template.route.rules.filter(r => r.outbound === 'direct'));
    const block = config.route.rules.findIndex(r => r.network === 'udp' && r.action === 'reject' && !r.clash_mode);
    const china = config.route.rules.findIndex(r => r.rule_set === 'geosite-cn');
    assert.ok(block > china, path);
    assert.equal(config.route.rules.find(r => r.clash_mode === 'Global').action, 'reject');
    const mixed = renderConfig(template, {outbounds: [tcp, udp]});
    assert.deepEqual(mixed.outbounds.find(n => n.tag === 'udp-auto').outbounds, ['udp']);
  }
});

test('profile selection rejects path traversal and unsupported combinations', () => {
  for (const platform of Object.keys(PLATFORMS)) assert.ok(PROFILES[profilePath(platform)]);
  for (const args of [['../../private'], ['android', '1.12'], ['ios', '1.14', 'mixed'], ['__proto__']]) assert.throws(() => profilePath(...args), {code: 'profile'});
});

test('missing node references do not produce downloadable configurations', () => {
  assert.throws(() => renderConfig(PROFILES[profilePath('android')], {outbounds: [{...tcp, detour: 'missing'}]}), {code: 'reference'});
  assert.throws(() => renderConfig(PROFILES[profilePath('android')], {outbounds: [{...tcp, domain_resolver: 'dns_direct'}]}), {code: 'reference'});
  assert.throws(() => renderConfig(PROFILES[profilePath('android')], {outbounds: [{...tcp, detour: 'select'}]}), {code: 'reference-cycle'});
});

test('CLI output is private and atomic, preserves old files and refuses input aliases', () => {
  const directory = mkdtempSync(join(tmpdir(), 'sing-box-cli-'));
  const source = join(directory, 'nodes.txt'), output = join(directory, 'sing-box.json');
  const run = (args, input) => spawnSync(process.execPath, [join(ROOT, 'scripts/generate.mjs'), ...args], {encoding: 'utf8', input});
  try {
    writeFileSync(source, links.naive);
    assert.equal(run(['--input', source, '--output', output]).status, 0);
    assert.equal(statSync(output).mode & 0o777, 0o600);
    const original = read(output, 'utf8');
    writeFileSync(source, 'not-a-node');
    assert.notEqual(run(['--input', source, '--output', output]).status, 0);
    assert.equal(read(output, 'utf8'), original);
    writeFileSync(source, links.naive);
    for (const alias of [source, join(directory, 'symlink'), join(directory, 'hardlink')]) {
      if (alias.endsWith('symlink')) symlinkSync(source, alias);
      if (alias.endsWith('hardlink')) linkSync(source, alias);
      const result = run(['--input', source, '--output', alias]);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /must not overwrite an input file/);
      assert.equal(read(source, 'utf8'), links.naive);
    }
    assert.equal(run(['--input', '-', '--output', output, '--platform', 'linux'], links.hy2).status, 0);
    assert.equal(JSON.parse(read(output, 'utf8')).inbounds[0].type, 'mixed');
  } finally { rmSync(directory, {recursive: true, force: true}); }
});

test('generated links pass the selected real sing-box core on every maintained preset', {skip: !process.env.SING_BOX}, () => {
  const core = process.env.SING_BOX;
  const version = spawnSync(core, ['version'], {encoding: 'utf8'});
  assert.equal(version.status, 0);
  const line = version.stdout.match(/sing-box version (1\.(?:13|14))\./)?.[1];
  assert.ok(line);
  const directory = mkdtempSync(join(tmpdir(), 'sing-box-core-'));
  try {
    for (const [name, link] of Object.entries(links)) {
      const nodes = parseNodes(link);
      for (const [path, template] of Object.entries(PROFILES).filter(([path]) => path.includes(`/${line}/`))) {
        const file = join(directory, 'config.json');
        writeFileSync(file, JSON.stringify(renderConfig(template, nodes)), {mode: 0o600});
        const result = spawnSync(core, ['check', '-c', file], {cwd: directory, encoding: 'utf8'});
        assert.equal(result.status, 0, `${name} ${path}: ${result.stdout}${result.stderr}`);
      }
    }
  } finally { rmSync(directory, {recursive: true, force: true}); }
});
