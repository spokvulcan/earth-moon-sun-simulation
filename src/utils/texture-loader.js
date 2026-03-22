import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const cache = new Map();

/**
 * Load a texture with caching and progress tracking.
 * @param {string} path - Path to texture file
 * @returns {Promise<THREE.Texture>}
 */
export function loadTexture(path) {
  if (cache.has(path)) {
    return Promise.resolve(cache.get(path));
  }

  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        cache.set(path, texture);
        resolve(texture);
      },
      undefined,
      (err) => {
        console.warn(`Failed to load texture: ${path}`, err);
        // Return a fallback colored texture
        const fallback = createFallbackTexture(path);
        cache.set(path, fallback);
        resolve(fallback);
      }
    );
  });
}

/**
 * Load multiple textures with progress callback.
 * @param {string[]} paths
 * @param {function} onProgress - Called with (loaded, total)
 * @returns {Promise<Map<string, THREE.Texture>>}
 */
export async function loadTextures(paths, onProgress) {
  const results = new Map();
  let loaded = 0;

  const promises = paths.map(async (path) => {
    const tex = await loadTexture(path);
    results.set(path, tex);
    loaded++;
    if (onProgress) onProgress(loaded, paths.length);
  });

  await Promise.all(promises);
  return results;
}

/**
 * Create a simple colored fallback texture when real textures aren't available.
 */
function createFallbackTexture(path) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (path.includes('earth_daymap') || path.includes('earth_day')) {
    // Blue-green Earth
    ctx.fillStyle = '#1a4a7a';
    ctx.fillRect(0, 0, 512, 256);
    // Add some "continents"
    ctx.fillStyle = '#2d6b3f';
    ctx.beginPath();
    ctx.ellipse(320, 100, 60, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(150, 80, 40, 50, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(350, 170, 50, 30, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(100, 180, 35, 25, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (path.includes('earth_night')) {
    ctx.fillStyle = '#000008';
    ctx.fillRect(0, 0, 512, 256);
    // City lights
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(255, 200, 100, ${Math.random() * 0.8})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 256, 1 + Math.random() * 2, 1);
    }
  } else if (path.includes('cloud')) {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 512, Math.random() * 256,
        20 + Math.random() * 60, 10 + Math.random() * 20,
        Math.random() * Math.PI, 0, Math.PI * 2
      );
      ctx.fill();
    }
  } else if (path.includes('moon')) {
    // Gray Moon
    const gradient = ctx.createRadialGradient(256, 128, 0, 256, 128, 200);
    gradient.addColorStop(0, '#a0a0a0');
    gradient.addColorStop(1, '#707070');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);
    // Craters
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const r = 3 + Math.random() * 15;
      ctx.fillStyle = `rgba(80, 80, 80, ${0.3 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (path.includes('sun')) {
    const gradient = ctx.createRadialGradient(256, 128, 0, 256, 128, 200);
    gradient.addColorStop(0, '#fff8e0');
    gradient.addColorStop(0.5, '#ffcc00');
    gradient.addColorStop(1, '#ff8800');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);
  } else if (path.includes('star') || path.includes('milky')) {
    ctx.fillStyle = '#000005';
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 500; i++) {
      const brightness = Math.random();
      ctx.fillStyle = `rgba(255, 255, ${200 + Math.random() * 55}, ${brightness * 0.8})`;
      const size = brightness > 0.95 ? 2 : 1;
      ctx.fillRect(Math.random() * 512, Math.random() * 256, size, size);
    }
  } else if (path.includes('specular')) {
    // Water = white (specular), land = black (matte)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(320, 100, 60, 40, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (path.includes('normal') || path.includes('bump')) {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, 512, 256);
  } else {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
