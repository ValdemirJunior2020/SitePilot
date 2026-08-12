import dns from 'node:dns/promises';
import net from 'node:net';

const blockedHostnames = new Set(['localhost', 'localhost.localdomain', '0.0.0.0', '::1']);

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, part) => ((acc << 8) + Number(part)) >>> 0, 0);
}

function inV4Range(ip, base, bits) {
  const value = ipv4ToInt(ip);
  const baseValue = ipv4ToInt(base);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) === (baseValue & mask);
}

export function isPrivateIp(ip) {
  if (!ip) return true;
  const clean = ip.toLowerCase().split('%')[0];
  if (clean.startsWith('::ffff:')) return isPrivateIp(clean.slice(7));

  const version = net.isIP(clean);
  if (version === 4) {
    return [
      ['0.0.0.0', 8],
      ['10.0.0.0', 8],
      ['100.64.0.0', 10],
      ['127.0.0.0', 8],
      ['169.254.0.0', 16],
      ['172.16.0.0', 12],
      ['192.0.0.0', 24],
      ['192.0.2.0', 24],
      ['192.168.0.0', 16],
      ['198.18.0.0', 15],
      ['198.51.100.0', 24],
      ['203.0.113.0', 24],
      ['224.0.0.0', 4],
      ['240.0.0.0', 4]
    ].some(([base, bits]) => inV4Range(clean, base, bits));
  }

  if (version === 6) {
    return clean === '::' || clean === '::1' || clean.startsWith('fc') || clean.startsWith('fd') ||
      clean.startsWith('fe8') || clean.startsWith('fe9') || clean.startsWith('fea') || clean.startsWith('feb') ||
      clean.startsWith('ff') || clean.startsWith('2001:db8:');
  }

  return true;
}

export async function assertSafeUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    const error = new Error('Enter a valid website URL including http:// or https://.');
    error.status = 400;
    throw error;
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    const error = new Error('Only http:// and https:// URLs can be scanned.');
    error.status = 400;
    throw error;
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[/, '').replace(/\]$/, '');
  if (!hostname || blockedHostnames.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    const error = new Error('Local or internal network addresses cannot be scanned.');
    error.status = 400;
    throw error;
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      const error = new Error('Private or internal IP addresses cannot be scanned.');
      error.status = 400;
      throw error;
    }
    return url;
  }

  let records;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    const error = new Error('The website hostname could not be resolved.');
    error.status = 400;
    throw error;
  }

  if (!records.length || records.some(({ address }) => isPrivateIp(address))) {
    const error = new Error('The website resolves to a private or internal network address.');
    error.status = 400;
    throw error;
  }
  return url;
}

export async function installRequestGuard(page) {
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    try {
      const url = request.url();
      if (url === 'about:blank') return request.continue();
      await assertSafeUrl(url);
      return request.continue();
    } catch {
      return request.abort('blockedbyclient');
    }
  });
}
