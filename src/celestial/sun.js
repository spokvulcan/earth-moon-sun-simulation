import * as THREE from 'three';
import { SUN_RADIUS, AU, DEG } from '../constants.js';
import { loadTexture } from '../utils/texture-loader.js';
import { getSunPosition } from '../orbit/ephemeris.js';

export class Sun {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Sun';
    this.mesh = null;
    this.light = null;
    this.truePosition = { x: 0, y: 0, z: 0 };
    this.currentDistance = AU;
    this.glowSprite = null;
  }

  async init(scene) {
    // Sun mesh (emissive, self-lit)
    const geometry = new THREE.SphereGeometry(SUN_RADIUS, 64, 32);
    const sunMap = await loadTexture(import.meta.env.BASE_URL + 'textures/sun_map.jpg');

    const material = new THREE.MeshBasicMaterial({
      map: sunMap,
      color: 0xffffff
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.group.add(this.mesh);

    // Sun glow (sprite for lens flare effect)
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const ctx = glowCanvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1.0)');
    gradient.addColorStop(0.1, 'rgba(255, 255, 150, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 200, 50, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    this.glowSprite = new THREE.Sprite(glowMaterial);
    this.glowSprite.scale.set(SUN_RADIUS * 6, SUN_RADIUS * 6, 1);
    this.group.add(this.glowSprite);

    // Directional light (illuminates Earth and Moon)
    this.light = new THREE.DirectionalLight(0xffffff, 2.0);
    this.light.castShadow = true;
    // Shadow camera configured for Earth-Moon system
    this.light.shadow.mapSize.width = 2048;
    this.light.shadow.mapSize.height = 2048;
    this.light.shadow.camera.near = 100000;
    this.light.shadow.camera.far = 500000;
    this.light.shadow.camera.left = -10000;
    this.light.shadow.camera.right = 10000;
    this.light.shadow.camera.top = 10000;
    this.light.shadow.camera.bottom = -10000;
    scene.add(this.light);
    scene.add(this.light.target);

    // Ambient light for dark side visibility
    // Use white color so the slider gives true brightness control (0=black, 100%=fully lit)
    this.ambient = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(this.ambient);

    return this;
  }

  /**
   * Update Sun position from ephemeris.
   * @param {number} jd - Julian Date
   */
  update(jd) {
    const pos = getSunPosition(jd);

    // Convert from ecliptic (Z-up) to Three.js (Y-up)
    this.truePosition.x = pos.x;
    this.truePosition.y = pos.z;
    this.truePosition.z = -pos.y;
    this.currentDistance = pos.distance;

    // Update directional light direction (from Sun toward origin/Earth)
    if (this.light) {
      const dir = new THREE.Vector3(
        this.truePosition.x,
        this.truePosition.y,
        this.truePosition.z
      ).normalize();
      // Position the light far along the Sun direction
      this.light.position.copy(dir.multiplyScalar(500000));
      this.light.target.position.set(0, 0, 0);
    }
  }

  /**
   * Set ambient light intensity (controls dark side visibility).
   * @param {number} intensity - 0 to 1
   */
  setAmbientIntensity(intensity) {
    if (this.ambient) {
      this.ambient.intensity = intensity;
    }
  }
}
