import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync as read, statSync, rmSync, symlinkSync, linkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {parseNodes, validateNodes, renderConfig, profilePath, errorMessage, ConfigError, PLATFORMS, CORES} from '../docs/assets/config-core.mjs';
import {PROFILES} from '../docs/assets/profiles.mjs';
import {clone, MAX_JSON_DEPTH} from '../docs/assets/core/values.mjs';

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
const legacyPassword = 'p#?%41% +@:/\\密码';
const legacySS = 'ss://' + Buffer.from(`aes-128-gcm:${legacyPassword}@example.com:8388`).toString('base64') + '#Legacy';
const deepNodes = depth => '{"outbounds":[{"type":"http","tag":"test","server":"example.com","server_port":443,"extra":' + '['.repeat(depth) + '0' + ']'.repeat(depth) + '}]}';

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

test('legacy and SIP002 SS preserve literal special characters without a URL round trip', () => {
  for (const password of ['p#ss', 'p?ss', 'p%41ss', 'p%ss', 'pass word', legacyPassword]) {
    for (const server of ['example.com', '[2001:db8::1]']) {
      const credential = `aes-128-gcm:${password}`;
      const tag = '#%E8%8A%82%E7%82%B9%20+%25';
      const variants = [
        'ss://' + Buffer.from(`${credential}@${server}:8388`).toString('base64') + tag,
        'ss://' + Buffer.from(`${credential}@${server}:8388`).toString('base64url') + tag,
        'ss://' + Buffer.from(credential).toString('base64url') + `@${server}:8388` + tag,
        `ss://aes-128-gcm:${encodeURIComponent(password)}@${server}:8388` + tag,
      ];
      for (const link of variants) {
        const node = parseNodes(link).outbounds[0];
        assert.equal(node.password, password);
        assert.equal(node.server, server.replace(/^\[|\]$/g, ''));
        assert.equal(node.server_port, 8388);
        assert.equal(node.tag, '节点 +%');
      }
    }
  }
  for (const authority of [
    'aes-128-gcm:example-password', 'aes-128-gcm:@example.com:8388',
    'aes-128-gcm:example-password@example.com',
    'aes-128-gcm:example-password@example.com:8388/path',
    'aes-128-gcm:example-password@example.com:8388?hidden=1',
    'aes-128-gcm:example-password@example.com:8388#hidden',
  ]) assert.throws(() => parseNodes('ss://' + Buffer.from(authority).toString('base64')), ConfigError);
  assert.throws(() => parseNodes(legacySS.replace('#Legacy', '?plugin=unknown')), {code: 'parameters'});
  assert.throws(() => parseNodes(legacySS.replace('#Legacy', '#%ZZ')), ConfigError);
});

test('transport Host rejects control characters in links and native JSON without exposing input', () => {
  const secret = 'PRIVATE-PASSWORD-FIXTURE';
  const node = parseNodes(links.trojan).outbounds[0];
  const rejected = operation => assert.throws(operation, error => {
    assert.ok(error instanceof ConfigError);
    assert.equal(error.code, 'transport');
    assert.equal(error.position, 1);
    for (const language of ['zh', 'en']) assert.equal(errorMessage(error, language).includes(secret), false);
    return true;
  });
  for (const code of [...Array(32).keys(), 127]) {
    const host = `example.com${String.fromCharCode(code)}${secret}`;
    for (const type of ['ws', 'httpupgrade']) {
      rejected(() => parseNodes(`trojan://${secret}@example.com:443?type=${type}&host=${encodeURIComponent(host)}`));
    }
    for (const key of ['Host', 'host', 'hOsT']) {
      for (const value of [host, [host], ['example.com', host]]) {
        const document = {outbounds: [{...node, transport: {type: 'ws', headers: {[key]: value}}}]};
        rejected(() => validateNodes(document));
        rejected(() => parseNodes(JSON.stringify(document)));
      }
    }
    rejected(() => validateNodes({outbounds: [{...node, transport: {type: 'httpupgrade', host}}]}));
  }
  for (const host of ['', 'example.com', 'example.com:443', '[2001:db8::1]:443']) {
    for (const transport of [
      {type: 'ws', path: '/proxy', headers: {Host: host, 'X-Test': 'retained'}},
      {type: 'ws', headers: {host: [host]}},
      {type: 'httpupgrade', host},
    ]) assert.deepEqual(validateNodes({outbounds: [{...node, transport}]}).outbounds[0].transport, transport);
  }
});

test('deep or non-JSON structures fail with safe ConfigError codes rather than stack errors', () => {
  const nested = depth => JSON.parse('['.repeat(depth) + '0' + ']'.repeat(depth));
  assert.deepEqual(clone(nested(MAX_JSON_DEPTH)), nested(MAX_JSON_DEPTH));
  assert.throws(() => clone(nested(MAX_JSON_DEPTH + 1)), {code: 'too-deep'});
  const deep = deepNodes(60000);
  assert.ok(Buffer.byteLength(deep) < 1024 * 1024);
  const nodes = JSON.parse(deep);
  const template = {...PROFILES[profilePath('android')], extra: nodes.outbounds[0].extra};
  for (const operation of [
    () => parseNodes(deep), () => validateNodes(nodes),
    () => renderConfig(template, {outbounds: [tcp]}),
    () => renderConfig(PROFILES[profilePath('android')], nodes),
  ]) assert.throws(operation, error => {
    assert.ok(error instanceof ConfigError);
    assert.equal(error.code, 'too-deep');
    assert.match(errorMessage(error, 'en'), /100 levels/);
    assert.match(errorMessage(error, 'zh'), /100 层/);
    return true;
  });
  const cyclic = {...tcp}; cyclic.extra = cyclic;
  assert.throws(() => validateNodes({outbounds: [cyclic]}), {code: 'json'});
  const shared = {extension: {value: 1}};
  const document = {outbounds: [{...tcp, extra: shared, another: {extra: shared}}]};
  assert.deepEqual(validateNodes(document).outbounds, document.outbounds);
  const prototypeKey = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.equal(Object.hasOwn(clone(prototypeKey), '__proto__'), true);
  assert.equal(Object.prototype.polluted, undefined);
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
  assert.equal(Object.keys(PROFILES).length, Object.values(PLATFORMS).flat().length * CORES.length);
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
    for (const invalid of ['not-a-node', deepNodes(60000), 'trojan://DO-NOT-ECHO@example.com:443?type=ws&host=a%0D%0Ab']) {
      writeFileSync(source, invalid);
      const result = run(['--input', source, '--output', output]);
      assert.notEqual(result.status, 0);
      assert.equal(read(output, 'utf8'), original);
      assert.equal(result.stderr.includes('DO-NOT-ECHO'), false);
      if (invalid.startsWith('{')) assert.match(result.stderr, /100 levels/);
    }
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
    const templatePath = join(directory, 'private-template.json');
    const template = structuredClone(PROFILES[profilePath('linux', '1.14', 'mixed')]);
    template.log.level = 'debug';
    writeFileSync(templatePath, JSON.stringify(template), {mode: 0o600});
    const privateResult = run(['--template', templatePath, '--input', source, '--output', output]);
    assert.equal(privateResult.status, 0, privateResult.stderr);
    const rendered = JSON.parse(read(output, 'utf8'));
    assert.equal(rendered.log.level, 'debug');
    assert.equal(rendered.inbounds[0].type, 'mixed');
    assert.equal(rendered.outbounds.find(node => node.type === 'naive').password, 'p@ss:word');
    assert.deepEqual(JSON.parse(read(templatePath, 'utf8')), template);
  } finally { rmSync(directory, {recursive: true, force: true}); }
});

test('platform synchronization supports empty arguments on the selected Bash', () => {
  const directory = mkdtempSync(join(tmpdir(), 'sing-box-sync-'));
  const log = join(directory, 'calls');
  try {
    writeFileSync(join(directory, 'python3'), '#!/bin/sh\nprintf "%s\\n" "$#" "$@" >> "$SYNC_LOG"\n', {mode: 0o700});
    for (const args of [[], ['write'], ['--check']]) {
      writeFileSync(log, '');
      const result = spawnSync(process.env.TEST_BASH || 'bash', [join(ROOT, 'scripts/sync-platforms.sh'), ...args], {
        encoding: 'utf8', env: {...process.env, PATH: directory + delimiter + process.env.PATH, SYNC_LOG: log},
      });
      assert.equal(result.status, 0, result.stderr);
      const flags = args[0] === '--check' ? ['--check'] : [];
      const expected = ['build-configs.py', 'sync-web-profiles.py'].flatMap(script => [String(2 + flags.length), '-B', join(ROOT, 'scripts', script), ...flags]);
      assert.deepEqual(read(log, 'utf8').trim().split('\n'), expected);
    }
  } finally { rmSync(directory, {recursive: true, force: true}); }
});

test('generated links pass the selected real sing-box core on every maintained preset', {skip: !process.env.SING_BOX}, () => {
  const core = process.env.SING_BOX;
  const version = spawnSync(core, ['version'], {encoding: 'utf8'});
  assert.equal(version.status, 0);
  const line = version.stdout.match(/sing-box version (1\.(?:13|14|15))\./)?.[1];
  assert.ok(line);
  const directory = mkdtempSync(join(tmpdir(), 'sing-box-core-'));
  try {
    for (const [name, link] of Object.entries({...links, legacySS})) {
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
