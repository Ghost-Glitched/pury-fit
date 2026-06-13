// Downscale an image data URL / blob to a max dimension and re-encode as JPEG
// to dramatically shrink upload size for AI analysis.
export async function downscaleDataUrl(
  src: string,
  maxDim = 1280,
  quality = 0.82,
): Promise<string> {
  try {
    const img = await loadImage(src);
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxDim);
    if (width === img.naturalWidth && height === img.naturalHeight && src.startsWith("data:image/jpeg")) {
      return src;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return src;
  }
}

export function videoFrameToDataUrl(
  video: HTMLVideoElement,
  maxDim = 1280,
  quality = 0.82,
): string {
  const vw = video.videoWidth || 720;
  const vh = video.videoHeight || 1280;
  const { width, height } = fitWithin(vw, vh, maxDim);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function fitWithin(w: number, h: number, maxDim: number) {
  if (w <= maxDim && h <= maxDim) return { width: w, height: h };
  const ratio = w > h ? maxDim / w : maxDim / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
