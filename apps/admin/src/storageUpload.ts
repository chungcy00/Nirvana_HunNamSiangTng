// XHR exposes actual transmitted bytes; fetch-based uploads cannot report them.
export function uploadWithProgress(options: {
  base: string; bucket: string; path: string; file: Blob;
  key: string; token: string;
  onProgress: (loaded: number, total: number) => void;
}) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.upload.onprogress = event => {
      if (event.lengthComputable) options.onProgress(event.loaded,event.total);
    };
    const path = [options.bucket,...options.path.split('/')].map(encodeURIComponent).join('/');
    request.open('POST',`${options.base}/storage/v1/object/${path}`);
    request.setRequestHeader('apikey',options.key);
    request.setRequestHeader('Authorization',`Bearer ${options.token}`);
    request.setRequestHeader('Content-Type',options.file.type);
    request.setRequestHeader('Cache-Control','max-age=0');
    request.setRequestHeader('x-upsert','false');
    request.onload = () => {
      if(request.status>=200 && request.status<300) resolve();
      else {
        let message='照片上传失败，请重试。';
        try {const error=JSON.parse(request.responseText);message=error.message || error.error || message;} catch { /* Use the readable fallback. */ }
        reject(Object.assign(new Error(message),{status:request.status}));
      }
    };
    request.onerror = () => reject(new Error('连接失败，照片尚未上传，请检查网络后重试。'));
    request.onabort = () => reject(new Error('照片上传已取消。'));
    request.send(options.file);
  });
}
