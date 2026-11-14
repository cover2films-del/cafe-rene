import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const keyFor = (secret: string) => createHash('sha256').update(secret).digest();
export function sealEposConfig(value: unknown, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(secret), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return JSON.stringify({ iv: iv.toString('base64url'), tag: cipher.getAuthTag().toString('base64url'), body: body.toString('base64url') });
}
export function openEposConfig(raw: string, secret: string): any {
  try {
    const saved = JSON.parse(raw);
    const decipher = createDecipheriv('aes-256-gcm', keyFor(secret), Buffer.from(saved.iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(saved.tag, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(saved.body, 'base64url')), decipher.final()]).toString('utf8'));
  } catch {
    return null;
  }
}
