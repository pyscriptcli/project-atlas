export const ICON_SVGS: Record<string, string> = {
  pin: '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle>',
  star: '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8-6.1-3.4-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z"></path>',
  circle: '<circle cx="12" cy="12" r="8"></circle>',
  square: '<rect x="5" y="5" width="14" height="14"></rect>',
  flag: '<path d="M6 21V4"></path><path d="M6 4l12 3-12 3"></path>',
  heart: '<path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.4-7 10-7 10z"></path>',
  pinball: '<circle cx="12" cy="10" r="7"></circle><line x1="12" y1="17" x2="12" y2="22"></line>',
  'center-pinball': '<circle cx="12" cy="10" r="7"></circle><line x1="12" y1="17" x2="12" y2="22"></line>',
};

/**
 * Adjust color brightness by percentage (-1.0 to 1.0)
 */
function adjustColorBrightness(hex: string, percent: number): string {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  let r = (num >> 16) + Math.round(255 * percent);
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * percent);
  let b = (num & 0x0000ff) + Math.round(255 * percent);

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Draws a 3D Pinball with realistic ground drop shadow, needle, and specular highlight.
 * Color palette is strictly Dark Navy Blue (#002244 / #0a192f), Black, and Gold (#d4af37 / #fbbf24).
 */
export function draw3DPinball(
  ctx: CanvasRenderingContext2D,
  color: string,
  isCenter: boolean = false
) {
  // 1. Realistic ground contact drop shadow
  ctx.save();
  const shadowGrad = ctx.createRadialGradient(32, 57, 1, 32, 57, isCenter ? 15 : 12);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  shadowGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.4)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(32, 57, isCenter ? 15 : 12, isCenter ? 5 : 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // If center marker, draw a subtle glowing pulse target ring at ground in gold
  if (isCenter) {
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(32, 57, 16, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Metallic needle stem (Gold for center, dark gold/black for standard)
  ctx.save();
  const needleGrad = ctx.createLinearGradient(29, 36, 35, 36);
  if (isCenter) {
    needleGrad.addColorStop(0, '#854d0e');
    needleGrad.addColorStop(0.35, '#fef08a');
    needleGrad.addColorStop(0.7, '#d4af37');
    needleGrad.addColorStop(1, '#713f12');
  } else {
    needleGrad.addColorStop(0, '#000000');
    needleGrad.addColorStop(0.35, '#d4af37');
    needleGrad.addColorStop(0.7, '#1e293b');
    needleGrad.addColorStop(1, '#000000');
  }

  ctx.fillStyle = needleGrad;
  ctx.beginPath();
  ctx.moveTo(30.5, 35);
  ctx.lineTo(33.5, 35);
  ctx.lineTo(32.5, 57);
  ctx.lineTo(31.5, 57);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.restore();

  // 3. 3D Ball Sphere: Navy Blue for standard, Gold for center
  const cx = 32;
  const cy = 23;
  const r = isCenter ? 16 : 14;

  const baseColor = isCenter ? '#d4af37' : '#002244';
  const lightColor = isCenter ? '#fef08a' : '#1e3a8a';
  const darkColor = isCenter ? '#854d0e' : '#020c1b';
  const rimColor = isCenter ? '#451a03' : '#000000';

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;

  // 3D Spherical gradient
  const sphereGrad = ctx.createRadialGradient(
    cx - r * 0.35,
    cy - r * 0.35,
    1,
    cx,
    cy,
    r
  );
  sphereGrad.addColorStop(0, '#ffffff');
  sphereGrad.addColorStop(0.2, lightColor);
  sphereGrad.addColorStop(0.65, baseColor);
  sphereGrad.addColorStop(0.9, darkColor);
  sphereGrad.addColorStop(1.0, rimColor);

  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. Outer rim outline in crisp Gold or Black
  ctx.save();
  ctx.strokeStyle = isCenter ? '#ffffff' : '#d4af37';
  ctx.lineWidth = isCenter ? 2 : 1.25;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 5. Specular highlight glints for pure 3D glass/metallic sheen
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.38, cy - r * 0.38, r * 0.35, r * 0.2, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Secondary soft bounce glint at bottom-right
  ctx.fillStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.beginPath();
  ctx.arc(cx + r * 0.4, cy + r * 0.4, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

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

  // Dedicated 3D Pinball with Drop Shadow
  if (shape === 'pinball') {
    draw3DPinball(ctx, color, false);
    return c;
  }

  if (shape === 'center-pinball') {
    draw3DPinball(ctx, color || '#fbbf24', true);
    return c;
  }

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
