import * as THREE from 'three';
import { loadTexture } from '../utils/texture-loader.js';

export class Starfield {
  constructor() {
    this.mesh = null;
  }

  async init(scene) {
    const starMap = await loadTexture(import.meta.env.BASE_URL + 'textures/stars_milky_way.jpg');
    starMap.colorSpace = THREE.SRGBColorSpace;

    // Large sphere surrounding the entire scene
    const geometry = new THREE.SphereGeometry(400000000, 32, 16);
    const material = new THREE.MeshBasicMaterial({
      map: starMap,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.renderOrder = -1000;
    scene.add(this.mesh);

    return this;
  }

  /**
   * Keep starfield centered on camera to prevent clipping.
   */
  updatePosition(cameraWorldPos) {
    if (this.mesh) {
      this.mesh.position.set(cameraWorldPos.x, cameraWorldPos.y, cameraWorldPos.z);
    }
  }
}
