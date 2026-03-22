import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  EARTH_EQUATORIAL_RADIUS, MOON_MEAN_RADIUS, EARTH_MOON_DISTANCE,
  HUMAN_EYE_HEIGHT, DEG
} from '../constants.js';

export const ViewMode = {
  ORBITAL: 'orbital',
  EARTH_SURFACE: 'earth-surface',
  MOON_SURFACE: 'moon-surface',
  LUNAR_ORBIT: 'lunar-orbit'
};

export class CameraManager {
  constructor(renderer) {
    this.rendererDom = renderer.domElement;
    this.mode = ViewMode.ORBITAL;
    this.fov = 60;

    // Main camera
    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      window.innerWidth / window.innerHeight,
      100,
      300000000 // 300 million km
    );

    // Orbital controls
    this.orbitControls = new OrbitControls(this.camera, this.rendererDom);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.minDistance = EARTH_EQUATORIAL_RADIUS * 1.5;
    this.orbitControls.maxDistance = EARTH_MOON_DISTANCE * 3;
    this.orbitControls.zoomSpeed = 1.5;

    // Surface view look direction
    this.surfaceLookAz = 0;
    this.surfaceLookEl = 0;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Surface mouse look handlers
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);

    // Set initial orbital position
    this.camera.position.set(
      EARTH_MOON_DISTANCE * 0.8,
      EARTH_EQUATORIAL_RADIUS * 15,
      EARTH_MOON_DISTANCE * 0.5
    );
    this.camera.lookAt(0, 0, 0);

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  setFOV(fov) {
    this.fov = fov;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Switch camera mode.
   */
  setMode(mode) {
    const prevMode = this.mode;
    this.mode = mode;

    if (mode === ViewMode.ORBITAL) {
      this.orbitControls.enabled = true;
      this._disableSurfaceControls();

      this.camera.near = 100;
      this.camera.far = 300000000;
      this.camera.updateProjectionMatrix();

      // Reset to a good orbital view position
      if (prevMode !== ViewMode.ORBITAL) {
        this.camera.position.set(
          EARTH_MOON_DISTANCE * 0.5,
          EARTH_EQUATORIAL_RADIUS * 20,
          EARTH_MOON_DISTANCE * 0.3
        );
        this.orbitControls.target.set(0, 0, 0);
        this.orbitControls.update();
      }
    } else if (mode === ViewMode.LUNAR_ORBIT) {
      // Lunar orbit: position set by simulation, mouse look for adjustments
      this.orbitControls.enabled = false;
      this._enableSurfaceControls();

      this.camera.near = 1;
      this.camera.far = 500000;
      this.camera.updateProjectionMatrix();

      // Reset look offsets
      this.surfaceLookAz = 0;
      this.surfaceLookEl = 0;
    } else {
      this.orbitControls.enabled = false;
      this._enableSurfaceControls();

      // Near plane must be tiny for surface views (0.1 meters = 0.0001 km)
      this.camera.near = 0.0001;
      this.camera.far = 300000000;
      this.camera.updateProjectionMatrix();

      // Reset look direction — horizontal (0 elevation = looking at the horizon)
      this.surfaceLookAz = 0;
      this.surfaceLookEl = 0;
    }
  }

  /**
   * Update camera for surface view.
   * Positions camera on the body's surface and computes look direction.
   *
   * @param {object} surfacePos - { x, y, z, nx, ny, nz } world position and normal
   */
  updateSurfaceView(surfacePos) {
    if (this.mode === ViewMode.ORBITAL) return;

    // Camera at surface position + eye height along normal
    const eyeHeight = HUMAN_EYE_HEIGHT;
    const camX = surfacePos.x + surfacePos.nx * eyeHeight;
    const camY = surfacePos.y + surfacePos.ny * eyeHeight;
    const camZ = surfacePos.z + surfacePos.nz * eyeHeight;

    this.camera.position.set(camX, camY, camZ);

    // Compute look direction from azimuth/elevation relative to local horizon
    // "Up" is the surface normal
    const up = new THREE.Vector3(surfacePos.nx, surfacePos.ny, surfacePos.nz).normalize();

    // Create a local coordinate frame on the surface
    // "East" direction - perpendicular to up and roughly aligned with world Y-cross
    let east = new THREE.Vector3();
    const worldUp = new THREE.Vector3(0, 1, 0);
    // If up is nearly parallel to world Y, use world Z instead
    if (Math.abs(up.dot(worldUp)) > 0.99) {
      east.crossVectors(new THREE.Vector3(0, 0, 1), up).normalize();
    } else {
      east.crossVectors(worldUp, up).normalize();
    }
    const north = new THREE.Vector3().crossVectors(up, east).normalize();

    // Look direction from azimuth (around up) and elevation (above horizon)
    const cosEl = Math.cos(this.surfaceLookEl);
    const sinEl = Math.sin(this.surfaceLookEl);
    const cosAz = Math.cos(this.surfaceLookAz);
    const sinAz = Math.sin(this.surfaceLookAz);

    const lookDir = new THREE.Vector3()
      .addScaledVector(north, cosEl * cosAz)
      .addScaledVector(east, cosEl * sinAz)
      .addScaledVector(up, sinEl);

    const target = new THREE.Vector3(
      camX + lookDir.x,
      camY + lookDir.y,
      camZ + lookDir.z
    );

    this.camera.up.copy(up);
    this.camera.lookAt(target);
  }

  /**
   * Update per frame.
   */
  update() {
    if (this.mode === ViewMode.ORBITAL) {
      this.orbitControls.update();
    }
  }

  _enableSurfaceControls() {
    this.rendererDom.addEventListener('mousedown', this._onMouseDown);
    this.rendererDom.addEventListener('mousemove', this._onMouseMove);
    this.rendererDom.addEventListener('mouseup', this._onMouseUp);
    this.rendererDom.addEventListener('mouseleave', this._onMouseUp);
    this.rendererDom.style.cursor = 'grab';
  }

  _disableSurfaceControls() {
    this.rendererDom.removeEventListener('mousedown', this._onMouseDown);
    this.rendererDom.removeEventListener('mousemove', this._onMouseMove);
    this.rendererDom.removeEventListener('mouseup', this._onMouseUp);
    this.rendererDom.removeEventListener('mouseleave', this._onMouseUp);
    this.rendererDom.style.cursor = 'default';
  }

  _onMouseDown(e) {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.rendererDom.style.cursor = 'grabbing';
  }

  _onMouseMove(e) {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    // Sensitivity scales with FOV (lower FOV = slower movement for precision)
    const sensitivity = 0.003 * (this.fov / 60);
    this.surfaceLookAz -= dx * sensitivity;
    this.surfaceLookEl += dy * sensitivity;

    // Clamp elevation: allow looking from -45° (ground) to +89° (zenith)
    this.surfaceLookEl = Math.max(-Math.PI * 0.25, Math.min(Math.PI * 0.49, this.surfaceLookEl));
  }

  _onMouseUp() {
    this.isDragging = false;
    if (this.mode !== ViewMode.ORBITAL) {
      this.rendererDom.style.cursor = 'grab';
    }
  }
}
