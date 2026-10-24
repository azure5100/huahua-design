import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { platform } from 'node:process';

function resolveDataDirectory() {
  if (process.env.HUAHUA_DESIGN_DATA_DIR) return process.env.HUAHUA_DESIGN_DATA_DIR;
  if (platform === 'darwin') return join(homedir(), 'Library', 'Application Support', 'HuaHua Design');
  if (platform === 'win32') return join(process.env.APPDATA || homedir(), 'HuaHua Design');
  return join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'huahua-design');
}

export const dataDirectory = resolveDataDirectory();
mkdirSync(dataDirectory, { recursive: true });
