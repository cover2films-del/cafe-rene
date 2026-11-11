import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import sharp from 'sharp';
export interface ObjectStore {
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
}
export const mediaRoot =
  process.env.MEDIA_DIR || fileURLToPath(new URL('../../../work/media', import.meta.url));
// Private local demonstration implementation. Replace with an authorised object bucket adapter for deployment.
export class LocalMedia implements ObjectStore {
  async put(key: string, bytes: Buffer, _contentType: string) {
    if (!/^[a-f0-9-]+\.webp$/.test(key)) throw Error('Invalid object key');
    await mkdir(mediaRoot, { recursive: true });
    await writeFile(resolve(mediaRoot, key), bytes, { flag: 'wx' });
  }
  async remove(key: string) {
    if (/^[a-f0-9-]+\.webp$/.test(key)) await unlink(resolve(mediaRoot, key)).catch(() => {});
  }
}
export async function optimiseImage(base64: string) {
  const input = Buffer.from(base64, 'base64');
  if (input.length > 800000 || input.length < 8) throw Error('Image must be under 800 KB');
  const image = sharp(input, { limitInputPixels: 20_000_000, failOn: 'error' });
  const meta = await image.metadata();
  if (!['png', 'jpeg', 'webp'].includes(meta.format || ''))
    throw Error('Use a PNG, JPEG or WebP image');
  return image
    .rotate()
    .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
}
