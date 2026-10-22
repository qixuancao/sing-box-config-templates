// Synthetic public node fixtures shared by unit and real-core tests.
export const uuid = '00000000-0000-4000-8000-000000000001';
export const links = {
  naive: 'naive+https://user:p%40ss%3Aword@example.com:443?sni=example.com#Test',
  hy2: 'hy2://user%3Apassword@example.com:443?sni=example.com&obfs=salamander&obfs-password=example-password#Test',
  trojan: 'trojan://p%40ss%3Aword@example.com:443?security=tls&type=ws&host=example.com&path=%2Fproxy#Test',
  ss: 'ss://' + btoa('aes-128-gcm:example-password') + '@example.com:8388#Test',
  vless: `vless://${uuid}@example.com:443?security=tls&type=grpc&serviceName=example&encryption=none#Test`,
};
export const tcp = {type: 'http', tag: 'tcp', server: 'example.com', server_port: 443};
export const udp = {type: 'hysteria2', tag: 'udp', server: 'example.com', server_port: 443, password: 'example-password', tls: {enabled: true}};
export const legacyPassword = 'p#?%41% +@:/\\密码';
export const legacySS = 'ss://' + Buffer.from(`aes-128-gcm:${legacyPassword}@example.com:8388`).toString('base64') + '#Legacy';
