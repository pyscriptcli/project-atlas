import { MarkerShape } from '../types/gis';

export interface ShapeOption {
  id: MarkerShape;
  label: string;
  category: 'Pins' | 'Pinball Drop' | 'Stars' | 'Circles & Badges';
}

export const SHAPE_OPTIONS: ShapeOption[] = [
  { id: 'pin', label: 'Classic Pin', category: 'Pins' },
  { id: 'pin-drop', label: '3D Drop Pin', category: 'Pins' },
  { id: 'pinball', label: '3D Pinball', category: 'Pinball Drop' },
  { id: 'center-pinball', label: 'Pulse Pinball', category: 'Pinball Drop' },
  { id: 'pinball-glow', label: 'Glow Pinball', category: 'Pinball Drop' },
  { id: 'circle', label: 'Circle', category: 'Circles & Badges' },
  { id: 'circle-dot', label: 'Bullseye Circle', category: 'Circles & Badges' },
  { id: 'star', label: '5-Point Star', category: 'Stars' },
  { id: 'star-four', label: 'Sparkle Star', category: 'Stars' },
  { id: 'diamond', label: 'Diamond Gem', category: 'Circles & Badges' },
  { id: 'square', label: 'Square Badge', category: 'Circles & Badges' },
  { id: 'flag', label: 'Flag', category: 'Circles & Badges' },
  { id: 'heart', label: 'Heart', category: 'Circles & Badges' },
  { id: 'navigation', label: 'Nav Beacon', category: 'Circles & Badges' },
  { id: 'shield', label: 'Shield', category: 'Circles & Badges' },
];

export const ICON_SVGS: Record<string, string> = {
  pin: '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle>',
  'pin-drop': '<path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z"></path><circle cx="12" cy="9" r="2.5"></circle>',
  pinball: '<circle cx="12" cy="9" r="6.5"></circle><line x1="12" y1="15.5" x2="12" y2="22"></line><ellipse cx="12" cy="22" rx="3.5" ry="1"></ellipse>',
  'center-pinball': '<circle cx="12" cy="9" r="6.5"></circle><line x1="12" y1="15.5" x2="12" y2="22"></line><circle cx="12" cy="9" r="2"></circle><ellipse cx="12" cy="22" rx="4.5" ry="1.5"></ellipse>',
  'pinball-glow': '<circle cx="12" cy="9" r="7"></circle><line x1="12" y1="16" x2="12" y2="22"></line><circle cx="12" cy="9" r="3.5"></circle>',
  circle: '<circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3.5"></circle>',
  'circle-dot': '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="2"></circle>',
  star: '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8-6.1-3.4-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z"></path>',
  'star-four': '<path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z"></path>',
  diamond: '<path d="M12 2L21 12L12 22L3 12Z"></path><circle cx="12" cy="12" r="3"></circle>',
  square: '<rect x="4" y="4" width="16" height="16" rx="4"></rect><circle cx="12" cy="12" r="3"></circle>',
  flag: '<path d="M6 22V3"></path><path d="M6 4h11l-2 4 2 4H6"></path>',
  heart: '<path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.4-7 10-7 10z"></path>',
  navigation: '<polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
};

/**
 * Adjust color brightness by percentage (-1.0 to 1.0)
 */
export function adjustColorBrightness(hex: string, percent: number): string {
  let clean = (hex || '#1e40af').replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16) || 0;
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
 */
export function draw3DPinball(
  ctx: CanvasRenderingContext2D,
  color: string,
  variant: 'standard' | 'center' | 'glow' = 'standard'
) {
  const isCenter = variant === 'center';
  const isGlow = variant === 'glow';

  // 1. Realistic ground contact drop shadow
  ctx.save();
  const shadowGrad = ctx.createRadialGradient(32, 57, 1, 32, 57, isCenter ? 16 : 13);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  shadowGrad.addColorStop(0.45, 'rgba(0, 0, 0, 0.45)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(32, 57, isCenter ? 16 : 13, isCenter ? 5 : 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // If center marker or glow, draw subtle pulse target ring at ground
  if (isCenter || isGlow) {
    ctx.strokeStyle = isGlow ? (color || '#38bdf8') : '#ffffff';
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.ellipse(32, 57, 16, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Metallic needle stem (Pure chrome/steel gradient)
  ctx.save();
  const needleGrad = ctx.createLinearGradient(29, 36, 35, 36);
  needleGrad.addColorStop(0, '#18181b');
  needleGrad.addColorStop(0.35, '#ffffff');
  needleGrad.addColorStop(0.7, '#71717a');
  needleGrad.addColorStop(1, '#000000');

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

  // 3. 3D Ball Sphere
  const cx = 32;
  const cy = 23;
  const r = isCenter ? 16 : 14;

  const baseColor = isCenter && !color ? '#fbbf24' : (color || '#1e40af');
  const lightColor = adjustColorBrightness(baseColor, 0.45);
  const darkColor = adjustColorBrightness(baseColor, -0.45);
  const rimColor = adjustColorBrightness(baseColor, -0.7);

  // Outer glow aura for 'pinball-glow'
  if (isGlow) {
    ctx.save();
    const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.5);
    glowGrad.addColorStop(0, adjustColorBrightness(baseColor, 0.2) + 'aa');
    glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 6;
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

  // 4. Outer rim outline in crisp silver/white
  ctx.save();
  ctx.strokeStyle = isCenter ? '#ffffff' : adjustColorBrightness(baseColor, 0.6);
  ctx.lineWidth = isCenter ? 2 : 1.25;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 5. Specular highlight glints for pure 3D glass/chrome sheen
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.38, cy - r * 0.38, r * 0.35, r * 0.2, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Secondary soft bounce glint at bottom-right
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(cx + r * 0.4, cy + r * 0.4, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a 3D Sleek Drop Pin with needle tip and shadow
 */
export function draw3DDropPin(ctx: CanvasRenderingContext2D, color: string) {
  // Ground contact shadow
  ctx.save();
  const shadowGrad = ctx.createRadialGradient(32, 59, 1, 32, 59, 12);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  shadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(32, 59, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const baseColor = color || '#1e40af';
  const lightColor = adjustColorBrightness(baseColor, 0.3);
  const darkColor = adjustColorBrightness(baseColor, -0.3);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  const pinGrad = ctx.createLinearGradient(16, 8, 48, 58);
  pinGrad.addColorStop(0, lightColor);
  pinGrad.addColorStop(0.5, baseColor);
  pinGrad.addColorStop(1, darkColor);

  ctx.fillStyle = pinGrad;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(32, 22, 16, Math.PI * 0.82, Math.PI * 0.18, false);
  ctx.lineTo(32, 58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Specular sheen
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.ellipse(26, 17, 7, 3, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Center core
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(32, 22, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(32, 22, 2.5, 0, Math.PI * 2);
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
  const baseColor = color || '#1e40af';

  // 1. 3D Pinball Drop Variants
  if (shape === 'pinball') {
    draw3DPinball(ctx, baseColor, 'standard');
    return c;
  }
  if (shape === 'center-pinball') {
    draw3DPinball(ctx, baseColor, 'center');
    return c;
  }
  if (shape === 'pinball-glow') {
    draw3DPinball(ctx, baseColor, 'glow');
    return c;
  }

  // 2. 3D Drop Pin
  if (shape === 'pin-drop') {
    draw3DDropPin(ctx, baseColor);
    return c;
  }

  // Ground contact shadow for all pins / badges
  ctx.save();
  const shadowGrad = ctx.createRadialGradient(32, 58, 1, 32, 58, 11);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(32, 58, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.fillStyle = baseColor;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();

  if (shape === 'pin') {
    ctx.arc(32, 24, 16, Math.PI * 0.8, Math.PI * 0.2, false);
    ctx.lineTo(32, 58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(32, 24, 5, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  if (shape === 'star') {
    // 5-Point Star
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 10 : 22;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = 32 + r * Math.cos(a);
      const py = 30 + r * Math.sin(a);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(32, 30, 4.5, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  if (shape === 'star-four') {
    // 4-Point Sparkle Star
    const points = [
      [32, 8], [37, 24], [53, 30], [37, 36],
      [32, 52], [27, 36], [11, 30], [27, 24]
    ];
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(32, 30, 4, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  if (shape === 'circle') {
    // Solid circular badge
    ctx.arc(32, 32, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(32, 32, 7, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  if (shape === 'circle-dot') {
    // Bullseye / target concentric circles
    ctx.arc(32, 32, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Middle ring
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.arc(32, 32, 13, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(32, 32, 5, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  if (shape === 'diamond') {
    // Faceted diamond / rhombus
    ctx.moveTo(32, 9);
    ctx.lineTo(53, 31);
    ctx.lineTo(32, 53);
    ctx.lineTo(11, 31);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(32, 31, 5, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  if (shape === 'square') {
    // Rounded square badge
    const x = 12, y = 11, w = 40, h = 40, rad = 8;
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(32, 31, 5, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  if (shape === 'flag') {
    ctx.moveTo(18, 56);
    ctx.lineTo(18, 10);
    ctx.lineTo(48, 22);
    ctx.lineTo(18, 34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return c;
  }

  if (shape === 'heart') {
    ctx.moveTo(32, 52);
    ctx.bezierCurveTo(6, 32, 14, 8, 32, 20);
    ctx.bezierCurveTo(50, 8, 58, 32, 32, 52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return c;
  }

  if (shape === 'navigation') {
    ctx.moveTo(32, 8);
    ctx.lineTo(51, 52);
    ctx.lineTo(32, 42);
    ctx.lineTo(13, 52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return c;
  }

  if (shape === 'shield') {
    ctx.moveTo(32, 10);
    ctx.lineTo(50, 16);
    ctx.lineTo(50, 32);
    ctx.quadraticCurveTo(50, 48, 32, 54);
    ctx.quadraticCurveTo(14, 48, 14, 32);
    ctx.lineTo(14, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(32, 28, 4.5, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  // Fallback pin
  ctx.arc(32, 24, 16, Math.PI * 0.8, Math.PI * 0.2, false);
  ctx.lineTo(32, 58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(32, 24, 5, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/**
 * Registers a dynamic sprite into MapLibre GL instance if not already cached
 */
export function getIconKey(shape: string, color: string, map: any): string {
  const cleanColor = (color || '#1e40af').replace('#', '');
  const key = `ico_${shape || 'pin'}_${cleanColor}`;
  if (map && !map.hasImage(key)) {
    const cv = renderIconCanvas(shape, color);
    const ctx = cv.getContext('2d');
    if (ctx) {
      const imgData = ctx.getImageData(0, 0, 64, 64);
      try {
        if (map.hasImage(key)) map.removeImage(key);
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
