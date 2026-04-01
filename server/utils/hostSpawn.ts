import fs from 'fs';

/**
 * Detect if we're running inside a Flatpak sandbox.
 * The /.flatpak-info file exists only inside Flatpak containers.
 */
let _isFlatpak: boolean | null = null;
export function isFlatpak(): boolean {
  if (_isFlatpak === null) {
    _isFlatpak = fs.existsSync('/.flatpak-info');
  }
  return _isFlatpak;
}

/**
 * Wrap a command to run on the host when inside a Flatpak.
 * Inside Flatpak: `flatpak-spawn --host <cmd> <args...>`
 * Outside Flatpak: `<cmd> <args...>` (unchanged)
 */
export function hostCommand(cmd: string, args: string[]): { cmd: string; args: string[] } {
  if (isFlatpak()) {
    return {
      cmd: 'flatpak-spawn',
      args: ['--host', cmd, ...args],
    };
  }
  return { cmd, args };
}

/**
 * Spawn a process, routing through flatpak-spawn --host if in Flatpak.
 * Drop-in replacement for Bun.spawn with host passthrough.
 */
export function hostSpawn(command: string[], options?: {
  cwd?: string;
  stdout?: 'pipe' | 'inherit';
  stderr?: 'pipe' | 'inherit';
}) {
  const [cmd, ...args] = command;
  const wrapped = hostCommand(cmd, args);
  return Bun.spawn([wrapped.cmd, ...wrapped.args], options);
}
