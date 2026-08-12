import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIp, assertSafeUrl } from '../src/utils/urlSecurity.js';

test('blocks private IPv4 ranges', () => {
  for (const ip of ['127.0.0.1','10.1.2.3','172.16.0.1','172.31.255.255','192.168.1.2','169.254.2.3']) assert.equal(isPrivateIp(ip), true);
  assert.equal(isPrivateIp('8.8.8.8'), false);
});

test('blocks unsafe protocols and localhost', async () => {
  await assert.rejects(() => assertSafeUrl('file:///etc/passwd'));
  await assert.rejects(() => assertSafeUrl('http://localhost:5000'));
  await assert.rejects(() => assertSafeUrl('http://127.0.0.1'));
});
