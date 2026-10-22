import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync as read, statSync, rmSync, symlinkSync, linkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {parseNodes, validateNodes, renderConfig, customizeTemplate, profilePath, errorMessage, ConfigError, PLATFORMS, CORES} from '../docs/assets/config-core.mjs';
import {PROFILES} from '../docs/assets/profiles.mjs';
import {clone, MAX_JSON_DEPTH} from '../docs/assets/core/values.mjs';
import {uuid, links, tcp, udp, legacyPassword, legacySS} from './fixtures.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
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

test('application policies are identical for TCP and UDP, with capability-aware automatic selection', () => {
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
    assert.deepEqual(config.route.rules, template.route.rules);
    assert.equal(config.route.rules.some(r => r.network === 'udp'), false, path);
    assert.deepEqual(config.outbounds.find(n => n.tag === 'auto').outbounds, ['tcp']);
    const mixed = renderConfig(template, {outbounds: [tcp, udp]});
    assert.deepEqual(mixed.outbounds.find(n => n.tag === 'auto').outbounds, ['udp']);
    assert.ok(mixed.outbounds.find(n => n.tag === 'select').outbounds.includes('tcp'));
    assert.deepEqual(mixed.route.rules, template.route.rules);
  }
});

test('profile selection rejects path traversal and unsupported combinations', () => {
  for (const [platform, scenarios] of Object.entries(PLATFORMS)) {
    assert.ok(PROFILES[profilePath(platform)]);
    for (const core of CORES) {
      for (const scenario of scenarios) {
        const path = `platforms/${platform}/${core}/${scenario}.json`;
        assert.equal(profilePath(platform, core, scenario), path);
        assert.deepEqual(PROFILES[path], JSON.parse(read(join(ROOT, path), 'utf8')));
      }
    }
  }
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
    const dnsSource = join(ROOT, profilePath('android', '1.14', 'fakeip'));
    const dnsBefore = read(dnsSource, 'utf8');
    const dnsAlias = join(directory, 'dns-source-alias.json');
    symlinkSync(dnsSource, dnsAlias);
    const dnsOverwrite = run(['--platform', 'linux', '--access', 'tun', '--dns', 'fakeip', '--input', source, '--output', dnsAlias]);
    assert.notEqual(dnsOverwrite.status, 0);
    assert.match(dnsOverwrite.stderr, /must not overwrite an input file/);
    assert.equal(read(dnsSource, 'utf8'), dnsBefore);
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
    for (const options of [
      ['--platform', 'android', '--access', 'system'],
      ['--access', 'invalid'], ['--dns', 'invalid'],
      ['--platform', 'linux', '--access', 'local', '--dns', 'fakeip'],
      ['--scenario', 'realip', '--access', 'tun'], ['--port', '12.5'],
      ['--direct-dns', '192.0.2.53'], ['--scenario', 'udp-first'],
    ]) {
      const before = read(output, 'utf8');
      assert.notEqual(run(['--input', source, '--output', output, ...options]).status, 0, options.join(' '));
      assert.equal(read(output, 'utf8'), before);
    }
    const templatePath = join(directory, 'private-template.json');
    const template = structuredClone(PROFILES[profilePath('linux', '1.14', 'mixed')]);
    template.log.level = 'debug';
    writeFileSync(templatePath, JSON.stringify(template), {mode: 0o600});
    assert.notEqual(run(['--template', templatePath, '--ipv6', '--input', source, '--output', output]).status, 0);
    const privateResult = run(['--template', templatePath, '--input', source, '--output', output]);
    assert.equal(privateResult.status, 0, privateResult.stderr);
    const rendered = JSON.parse(read(output, 'utf8'));
    assert.equal(rendered.log.level, 'debug');
    assert.equal(rendered.inbounds[0].type, 'mixed');
    assert.equal(rendered.outbounds.find(node => node.type === 'naive').password, 'p@ss:word');
    assert.deepEqual(JSON.parse(read(templatePath, 'utf8')), template);
  } finally { rmSync(directory, {recursive: true, force: true}); }
});


test('advanced ingress and DNS configuration is real, isolated and validated', () => {
  const sample = PROFILES[profilePath('linux', '1.14', 'mixed')];
  const original = JSON.stringify(sample);
  const edited = customizeTemplate(sample, {
    systemProxy: true, listenPort: 3128, directDns: '1.1.1.1', proxyDns: '8.8.8.8',
    dnsTemplate: PROFILES[profilePath('android', '1.14', 'realip')]
  });
  assert.equal(edited.inbounds[0].set_system_proxy, true);
  assert.equal(edited.inbounds[0].listen_port, 3128);
  assert.equal(edited.dns.servers.find(item => item.tag === 'direct-dns').server, '1.1.1.1');
  assert.equal(edited.dns.servers.find(item => item.tag === 'direct-dns-bootstrap').server, '1.1.1.1');
  assert.equal(edited.dns.servers.find(item => item.tag === 'proxy-dns').server, '8.8.8.8');
  assert.equal(JSON.stringify(sample), original, 'preset must not be mutated');
  assert.equal(renderConfig(edited, {outbounds: [udp]}).inbounds[0].set_system_proxy, true);
  const local = customizeTemplate(sample);
  assert.equal(local.inbounds[0].set_system_proxy, false);
  assert.equal(local.inbounds[0].listen_port, 2080);
  for (const invalid of [0, -1, 65536, 100.5, '2080']) {
    assert.throws(() => customizeTemplate(sample, {listenPort: invalid}), ConfigError);
  }
  for (const invalid of ['999.1.1.1', 'a.example', '127.0.0.1:53', '1.1.1.1\n0.0.0.0', '01.1.1.1', '192.0.2.53']) {
    assert.throws(() => customizeTemplate(sample, {directDns: invalid}), ConfigError);
  }
  assert.throws(() => customizeTemplate(sample, {systemProxy: true, listenPort: 3000,
    dnsTemplate: PROFILES[profilePath('android', '1.14', 'fakeip')]}), ConfigError);
  const tun = PROFILES[profilePath('linux', '1.14', 'tun')];
  const fake = customizeTemplate(tun, {dnsTemplate: PROFILES[profilePath('android', '1.14', 'fakeip')]});
  assert.equal(fake.experimental.cache_file.store_fakeip, true);
  assert.equal(fake.dns.servers.some(server => server.type === 'fakeip'), true);
  assert.equal(renderConfig(fake, {outbounds: [udp]}).inbounds[0].type, 'tun');
  assert.throws(() => customizeTemplate(tun, {systemProxy: true}), ConfigError);
});

test('IPv6 settings update DNS, routing and TUN together without bypassing virtual ranges', () => {
  for (const [path, base] of Object.entries(PROFILES)) {
    const before = JSON.stringify(base);
    const dual = customizeTemplate(base, {ipv6: true});
    assert.equal(JSON.stringify(base), before);
    assert.equal(dual.dns.strategy, 'prefer_ipv4', path);
    assert.equal(dual.dns.rules.some(r => r.action === 'predefined' && r.query_type.includes('AAAA')), false);
    assert.equal(dual.route.rules.some(r => r.ip_version === 6 && r.action === 'reject'), false);
    assert.ok(dual.route.rules.filter(r => r.action === 'resolve').every(r => r.strategy === 'prefer_ipv4'));
    for (const server of dual.dns.servers.filter(s => s.type === 'fakeip')) {
      assert.equal(server.inet6_range, 'fc00::/18');
      assert.ok(dual.dns.rules.some(r => r.server === server.tag && r.query_type.includes('AAAA')));
    }
    for (const inbound of dual.inbounds.filter(i => i.type === 'tun')) {
      assert.ok(inbound.address.includes('fdfe:dcba:9876::1/126'));
      assert.equal(inbound.route_exclude_address.some(address => /^f[cd]/i.test(address)), false);
    }
    const captured = customizeTemplate(base, {ipv6: true, lanBypass: false});
    assert.ok(captured.inbounds.every(inbound => !Object.hasOwn(inbound, 'route_exclude_address')));
    assert.deepEqual(captured.route.rules, dual.route.rules);
    assert.deepEqual(customizeTemplate(base).dns, base.dns);
  }
});
