import sharp from 'sharp';
import { previewWidths, storedPreviewPath } from '../../../shared/imageVariants.js';
export async function storeImagePreviews(
  input: Buffer,
  bucket: string,
  path: string,
  put: (name: string, data: Buffer) => Promise<void>,
) {
  for (const width of previewWidths) {
    const data = await sharp(input, { limitInputPixels: 50000000 })
      .rotate()
      .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: width >= 1920 ? 88 : 80 })
      .toBuffer();
    await put(storedPreviewPath(bucket, path, width), data);
  }
}
