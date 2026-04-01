import os from 'os';
import { db } from './db/index.js';

interface SettingRow {
  value: string;
}

/**
 * Get the server's reachable address for other devices on the LAN.
 * Priority:
 *   1. Staff-configured override (server_address setting)
 *   2. SERVER_ADDRESS environment variable
 *   3. Auto-detected LAN IP
 */
export function getServerAddress(port: number | string): string {
  // Check for staff-configured override
  try {
    const override = db.prepare(
      "SELECT value FROM settings WHERE key = 'server_address'"
    ).get() as SettingRow | undefined;

    if (override?.value) {
      return override.value;
    }
  } catch {
    // DB may not be initialized yet
  }

  // Check environment variable
  if (process.env.SERVER_ADDRESS) {
    return process.env.SERVER_ADDRESS;
  }

  // Auto-detect LAN IP
  const lanIp = detectLanIP();
  return `http://${lanIp}:${port}`;
}

/**
 * Detect the machine's LAN IP address.
 * Returns the first non-internal IPv4 address found.
 */
export function detectLanIP(): string {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const addrs = interfaces[name];
    if (!addrs) continue;

    for (const addr of addrs) {
      // Skip internal (loopback) and IPv6
      if (addr.internal || addr.family !== 'IPv4') continue;
      return addr.address;
    }
  }

  // Fallback — shouldn't happen on a networked machine
  return '127.0.0.1';
}
