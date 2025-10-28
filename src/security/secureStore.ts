import type { App, SafeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const STORE_FILE_NAME = 'secure-store.json';
const KEY_FILE_NAME = 'secure-store.key';
const AES_ALGORITHM = 'aes-256-gcm';
const AES_KEY_SIZE = 32;
const AES_IV_SIZE = 12;

let electronApp: App | undefined;
let electronSafeStorage: SafeStorage | undefined;

try {
  const electron = require('electron') as typeof import('electron');
  const remoteApp = (electron as unknown as { remote?: { app?: App } }).remote?.app;
  electronApp = electron.app ?? remoteApp;
  electronSafeStorage = electron.safeStorage;
} catch (error) {
  electronApp = undefined;
  electronSafeStorage = undefined;
}

function getBaseDirectory(): string {
  if (electronApp) {
    try {
      return electronApp.getPath('userData');
    } catch (error) {
      // Fallback below if Electron app path is not yet available.
    }
  }

  return path.join(os.homedir(), '.modgen');
}

function ensureDirectoryExists(directory: string): void {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function getStoreFilePath(): string {
  const baseDir = getBaseDirectory();
  ensureDirectoryExists(baseDir);
  return path.join(baseDir, STORE_FILE_NAME);
}

function getKeyFilePath(): string {
  const baseDir = getBaseDirectory();
  ensureDirectoryExists(baseDir);
  return path.join(baseDir, KEY_FILE_NAME);
}

function writeFileSecurely(filePath: string, data: string | Buffer): void {
  fs.writeFileSync(filePath, data, { mode: 0o600 });
  try {
    fs.chmodSync(filePath, 0o600);
  } catch (error) {
    // Ignore chmod errors (e.g., on Windows) since permissions may be managed by the OS.
  }
}

function getAesKey(): Buffer {
  const keyPath = getKeyFilePath();

  if (fs.existsSync(keyPath)) {
    const stored = fs.readFileSync(keyPath, 'utf8');
    const keyBuffer = Buffer.from(stored, 'base64');
    if (keyBuffer.length === AES_KEY_SIZE) {
      return keyBuffer;
    }
  }

  const newKey = randomBytes(AES_KEY_SIZE);
  writeFileSecurely(keyPath, newKey.toString('base64'));
  return newKey;
}

function encryptWithAes(value: string): { type: 'aes-256-gcm'; iv: string; tag: string; data: string } {
  const key = getAesKey();
  const iv = randomBytes(AES_IV_SIZE);
  const cipher = createCipheriv(AES_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    type: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: authTag.toString('base64'),
    data: encrypted.toString('base64'),
  };
}

function decryptWithAes(payload: { iv: string; tag: string; data: string }): string {
  const key = getAesKey();
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const encrypted = Buffer.from(payload.data, 'base64');
  const decipher = createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function encrypt(value: string): Record<string, string> {
  if (electronSafeStorage?.isEncryptionAvailable()) {
    const encrypted = electronSafeStorage.encryptString(value);
    return {
      type: 'dpapi',
      payload: encrypted.toString('base64'),
    };
  }

  return encryptWithAes(value);
}

function decrypt(payload: Record<string, string>): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if (payload.type === 'dpapi' && electronSafeStorage?.isEncryptionAvailable() && typeof payload.payload === 'string') {
    try {
      const buffer = Buffer.from(payload.payload, 'base64');
      return electronSafeStorage.decryptString(buffer);
    } catch (error) {
      return '';
    }
  }

  if (payload.type === 'aes-256-gcm' && typeof payload.iv === 'string' && typeof payload.tag === 'string' && typeof payload.data === 'string') {
    try {
      return decryptWithAes({ iv: payload.iv, tag: payload.tag, data: payload.data });
    } catch (error) {
      return '';
    }
  }

  return '';
}

export function saveKey(key: string): void {
  if (!key) {
    return;
  }

  const encryptedPayload = encrypt(key);
  const filePath = getStoreFilePath();
  writeFileSecurely(filePath, JSON.stringify(encryptedPayload));
}

export function loadKey(): string {
  const filePath = getStoreFilePath();

  if (!fs.existsSync(filePath)) {
    return '';
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw) {
      return '';
    }
    const payload = JSON.parse(raw) as Record<string, string>;
    return decrypt(payload);
  } catch (error) {
    return '';
  }
}
