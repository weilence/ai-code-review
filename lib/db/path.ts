/**
 * 数据库路径配置
 *
 * 统一管理数据库文件路径，供运行时和 Drizzle Kit 使用
 */

import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * 应用数据目录名称
 */
const APP_DATA_DIR = 'ai-code-review';

/**
 * 获取用户数据目录
 * 跨平台支持：Linux/macOS/Windows
 *
 * - Linux:   ~/.local/share/ai-code-review
 * - macOS:   ~/Library/Application Support/ai-code-review
 * - Windows: %APPDATA%\ai-code-review
 */
export function getUserDataDir(): string {
  const platform = process.platform;

  let baseDir: string;

  if (platform === 'win32') {
    // Windows: %APPDATA%
    baseDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  } else if (platform === 'darwin') {
    // macOS: ~/Library/Application Support
    baseDir = path.join(os.homedir(), 'Library', 'Application Support');
  } else {
    // Linux/其他: ~/.local/share (遵循 XDG Base Directory Specification)
    baseDir = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  }

  return path.join(baseDir, APP_DATA_DIR);
}

/**
 * 获取数据库文件路径
 * 优先使用环境变量 DATABASE_PATH，否则使用用户数据目录
 */
export function getDatabasePath(): string {
  // 如果设置了环境变量，直接使用
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  // 使用用户数据目录
  const dataDir = getUserDataDir();

  return path.join(dataDir, 'ai-code-review.db');
}

/**
 * 确保数据目录存在
 * 如果不存在则递归创建
 */
export function ensureDataDir(): string {
  const dataDir = getUserDataDir();

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return dataDir;
}
