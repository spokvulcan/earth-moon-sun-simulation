import * as THREE from 'three';
import {
  MOON_MEAN_RADIUS, DEG, SPHERE_SEGMENTS_MED
} from '../constants.js';
import { loadTexture } from '../utils/texture-loader.js';
import { getMoonPosition } from '../orbit/ephemeris.js';

export class Moon {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Moon';
    this.mesh = null;
    this.truePosition = { x: 0, y: 0, z: 0 };
    this.currentDistance = 384400;
  }

  async init() {
    const [moonMap, bumpMap] = await Promise.all([
      loadTexture(import.meta.env.BASE_URL + 'textures/moon_map.jpg'),
      loadTexture(import.meta.env.BASE_URL + 'textures/moon_bump.jpg')
    ]);

    const geometry = new THREE.SphereGeometry(
      MOON_MEAN_RADIUS,
      SPHERE_SEGMENTS_MED,
      SPHERE_SEGMENTS_MED / 2
    );

    const material = new THREE.MeshPhongMaterial({
      map: moonMap,
      bumpMap: bumpMap,
      bumpScale: 3,
      shininess: 2
    });

    this.mesh = new THREE.Mesh(geometry, material);
    // Disable frustum culling — when viewed from lunar orbit at the limb,
    // the Moon center is 72° off-axis but the visible surface (horizon) is within the FOV.
    // Standard bounding sphere culling can incorrectly hide it.
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);

    return this;
  }

  /**
   * Update Moon position and rotation for the given Julian Date.
   * The Moon's position comes from the Meeus ephemeris.
   * Tidal locking means the Moon's rotation matches its orbital angle.
   *
   * @param {number} jd - Current Julian Date
   */
  update(jd) {
    const pos = getMoonPosition(jd);

    // The ephemeris returns geocentric ecliptic coordinates (in km)
    this.truePosition.x = pos.x;
    this.truePosition.y = pos.z; // ecliptic Z -> Y (up)
    this.truePosition.z = -pos.y; // ecliptic Y -> -Z (into screen)
    // Note: Three.js uses Y-up, ecliptic uses Z-up
    // Convention: ecliptic X -> Three.js X, ecliptic Y -> Three.js -Z, ecliptic Z -> Three.js Y

    this.currentDistance = pos.distance;

    // Tidal locking: Moon always shows same face to Earth
    // The Moon's rotation angle equals its orbital longitude
    if (this.mesh) {
      // Point the Moon's -Z face toward Earth (0,0,0)
      // We compute the angle from the Moon to Earth in the orbital plane
      const angle = Math.atan2(-this.truePosition.z, this.truePosition.x);
      this.mesh.rotation.y = angle + Math.PI;
    }
  }

  /**
   * Get surface position in world coordinates for a given lat/lng on the Moon.
   */
  getSurfacePosition(lat, lng, jd) {
    const latRad = lat * DEG;
    const lngRad = lng * DEG;

    // Unit normal on Moon surface
    const nx = Math.cos(latRad) * Math.cos(lngRad);
    const ny = Math.sin(latRad);
    const nz = Math.cos(latRad) * Math.sin(lngRad);

    const r = MOON_MEAN_RADIUS;

    // Apply tidal locking rotation (Moon's Y rotation)
    const angle = Math.atan2(-this.truePosition.z, this.truePosition.x) + Math.PI;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const x = (nx * cosA + nz * sinA) * r;
    const y = ny * r;
    const z = (-nx * sinA + nz * cosA) * r;

    return {
      x: x + this.truePosition.x,
      y: y + this.truePosition.y,
      z: z + this.truePosition.z,
      nx: x / r,
      ny: y / r,
      nz: z / r
    };
  }
}
