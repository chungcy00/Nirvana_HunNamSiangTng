import { supabase } from './client';
import { previewBucket, previewWidths, storedPreviewPath } from '../../../shared/imageVariants';

export async function prepareUploadPreviews(file: Blob, bucket: string, path: string, onProgress?: (completed:number,total:number)=>void) {
  const bitmap = await createImageBitmap(file);
  let placeholder: string | undefined;
  let completed=0;
  try {
    const results = await Promise.allSettled(previewWidths.map(async (width) => {
      const ratio = Math.min(1, width / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('无法准备图片预览。');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (data) => (data ? resolve(data) : reject(new Error('无法准备图片预览。'))),
          'image/webp',
          width >= 1920 ? 0.88 : 0.8,
        ),
      );
      const result = await supabase!.storage
        .from(previewBucket)
        .upload(storedPreviewPath(bucket, path, width), blob, {
          contentType: 'image/webp',
          upsert: false,
          cacheControl: '0',
        });
      if (result.error) throw result.error;
      if (width === 160) {
        placeholder = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const cached = await supabase!.schema('api').rpc('cache_image_placeholder', {
          p_bucket: bucket, p_path: path, p_data: placeholder,
        });
        if (cached.error) throw cached.error;
      }
      onProgress?.(++completed,previewWidths.length);
    }));
    for (const result of results) if (result.status === 'rejected') throw result.reason;
  } finally {
    bitmap.close();
  }
  return placeholder;
}
