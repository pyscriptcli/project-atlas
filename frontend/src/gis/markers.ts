export const ICON_SVGS: Record<string, string> = {
  pin: '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle>',
  star: '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8-6.1-3.4-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z"></path>',
  circle: '<circle cx="12" cy="12" r="8"></circle>',
  square: '<rect x="5" y="5" width="14" height="14"></rect>',
  flag: '<path d="M6 21V4"></path><path d="M6 4l12 3-12 3"></path>',
  heart: '<path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.4-7 10-7 10z"></path>',
  pinball: '<circle cx="12" cy="10" r="7"></circle><line x1="12" y1="17" x2="12" y2="22"></line>',
};

/**
 * Draws a marker icon procedurally on a 64x64 canvas
 */
export function renderIconCanvas(shape: string, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.fillStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();

  if (shape === 'pin') {
    ctx.arc(32, 24, 16, Math.PI * 0.8, Math.PI * 0.2, false);
    ctx.lineTo(32, 58);
    ctx.closePath();
  } else if (shape === 'star') {
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 12 : 26;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = 32 + r * Math.cos(a);
      const py = 32 + r * Math.sin(a);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  } else if (shape === 'circle') {
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
  } else if (shape === 'square') {
    ctx.rect(12, 12, 40, 40);
  } else if (shape === 'flag') {
    ctx.moveTo(18, 58);
    ctx.lineTo(18, 10);
    ctx.lineTo(48, 22);
    ctx.lineTo(18, 34);
  } else if (shape === 'heart') {
    ctx.moveTo(32, 54);
    ctx.bezierCurveTo(6, 34, 14, 10, 32, 22);
    ctx.bezierCurveTo(50, 10, 58, 34, 32, 54);
  } else if (shape === 'pinball') {
    ctx.arc(32, 26, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(28, 42);
    ctx.lineTo(36, 42);
    ctx.lineTo(32, 56);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(32, 26, 6, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  ctx.fill();
  ctx.stroke();

  // Draw inner dot
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(32, shape === 'pin' ? 24 : 32, 5, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

/**
 * Registers a dynamic sprite into MapLibre GL instance if not already cached
 */
export function getIconKey(shape: string, color: string, map: any): string {
  const cleanColor = color.replace('#', '');
  const key = `ico_${shape}_${cleanColor}`;
  if (!map.hasImage(key)) {
    const cv = renderIconCanvas(shape, color);
    const ctx = cv.getContext('2d');
    if (ctx) {
      const imgData = ctx.getImageData(0, 0, 64, 64);
      try {
        map.addImage(key, imgData, { pixelRatio: 2 });
      } catch (e) {
        console.warn('Failed to add image to map:', e);
      }
    }
  }
  return key;
}

/**
 * Loads a user uploaded custom image and registers it as a custom pin
 */
export async function registerCustomImageMarker(dataUrl: string, map: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d');
      if (!ctx) return reject('Canvas context missing');
      ctx.drawImage(img, 0, 0, 64, 64);
      const key = `custom_marker_${Date.now()}`;
      const imgData = ctx.getImageData(0, 0, 64, 64);
      try {
        if (map.hasImage(key)) map.removeImage(key);
        map.addImage(key, imgData, { pixelRatio: 2 });
        resolve(key);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
