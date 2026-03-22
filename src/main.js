import * as THREE from 'three';
import { Renderer } from './renderer.js';
import { CameraManager, ViewMode } from './camera/camera-manager.js';
import { Earth } from './celestial/earth.js';
import { Moon } from './celestial/moon.js';
import { Sun } from './celestial/sun.js';
import { Starfield } from './celestial/starfield.js';
import { Ground } from './celestial/ground.js';
import { HUD } from './ui/hud.js';
import { Controls } from './ui/controls.js';
import { jsDateToJD } from './orbit/julian.js';
import { EARTH_MOON_DISTANCE, EARTH_EQUATORIAL_RADIUS, MOON_MEAN_RADIUS, HUMAN_EYE_HEIGHT } from './constants.js';

class Simulation {
  constructor() {
    // Time state
    this.jd = jsDateToJD(new Date());
    this._lastJD = 0; // force first update
    this.timeSpeed = 86400;
    this.isPaused = false;

    // View state
    this.viewMode = ViewMode.ORBITAL;
    this.surfaceLat = 0;
    this.surfaceLng = 0;
    this.lunarOrbitAltitude = 110; // km, for lunar-orbit view mode

    // Scene
    this.scene = new THREE.Scene();

    this.orbitLine = null;
    this.labels = { earth: null, moon: null, sun: null };
    this.labelsVisible = true;
    this.axesHelper = null;
  }

  async init() {
    const canvas = document.getElementById('canvas');
    this.renderer = new Renderer(canvas);
    this.cameraManager = new CameraManager(this.renderer.renderer);

    // Show loading progress
    const loadingFill = document.getElementById('loading-fill');
    let loadedCount = 0;
    const totalItems = 4;
    const updateProgress = () => {
      loadedCount++;
      loadingFill.style.width = `${(loadedCount / totalItems) * 100}%`;
    };

    // Initialize celestial bodies
    this.earth = new Earth();
    this.moon = new Moon();
    this.sun = new Sun();
    this.starfield = new Starfield();

    await this.earth.init();
    updateProgress();
    this.scene.add(this.earth.group);

    await this.moon.init();
    updateProgress();
    this.scene.add(this.moon.group);

    await this.sun.init(this.scene);
    updateProgress();
    this.scene.add(this.sun.group);

    await this.starfield.init(this.scene);
    updateProgress();

    // Ground detail planes for surface views
    this.ground = new Ground();
    this.scene.add(this.ground.earthGroup);
    this.scene.add(this.ground.moonGroup);

    // Create orbit path
    this._createOrbitPath();

    // Create labels
    this._createLabels();

    // Create axes helper
    this.axesHelper = new THREE.AxesHelper(EARTH_EQUATORIAL_RADIUS * 3);
    this.axesHelper.visible = false;
    this.scene.add(this.axesHelper);

    // Initialize UI
    this.hud = new HUD();
    this.controls = new Controls(this);

    // Hide loading screen
    document.getElementById('loading').classList.add('hidden');

    // Initial update
    this._updateBodies();

    // Start animation
    this.lastTime = performance.now();
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); // seconds, capped
    this.lastTime = now;

    if (!this.isPaused) {
      const simDeltaDays = (deltaTime * this.timeSpeed) / 86400;
      this.jd += simDeltaDays;
    }

    // Only recompute ephemeris when time has changed
    if (this.jd !== this._lastJD) {
      this._updateBodies();
      this._lastJD = this.jd;
    }

    this._updateCamera();
    this._updateScenePositions();
    this.renderer.renderSingle(this.scene, this.cameraManager.camera);
    this._updateHUD();
  }

  _updateBodies() {
    this.earth.update(this.jd);
    this.moon.update(this.jd);
    this.sun.update(this.jd);

    // Update Earth night lights sun direction
    if (this.earth.nightSunDir) {
      this.earth.nightSunDir.set(
        this.sun.truePosition.x,
        this.sun.truePosition.y,
        this.sun.truePosition.z
      ).normalize();
    }
  }

  _updateCamera() {
    if (this.viewMode === ViewMode.EARTH_SURFACE) {
      this._currentSurfacePos = this.earth.getSurfacePosition(this.surfaceLat, this.surfaceLng, this.jd);
      this.earth.setAtmosphereVisible(false);
    } else if (this.viewMode === ViewMode.MOON_SURFACE) {
      this._currentSurfacePos = this.moon.getSurfacePosition(this.surfaceLat, this.surfaceLng, this.jd);
      this.earth.setAtmosphereVisible(true);
    } else if (this.viewMode === ViewMode.LUNAR_ORBIT) {
      this._currentSurfacePos = null;
      this.earth.setAtmosphereVisible(true);
    } else {
      this._currentSurfacePos = null;
      this.earth.setAtmosphereVisible(true);
      this.cameraManager.update();
    }
  }

  _updateScenePositions() {
    if (this.viewMode === ViewMode.LUNAR_ORBIT) {
      // Apollo 8 Earthrise recreation.
      //
      // Key geometry: Earth is at the horizon when the camera-to-Earth line
      // is tangent to the Moon sphere. This happens when the camera is at
      // angle θ₀ = arcsin(R/camDist) = 70.1° from the Moon-to-Earth direction.
      // At θ = 75°, Earth is ~5° above the horizon → fits in 12° FOV.
      //
      // θ = 90° (limb): Earth is 19.9° above horizon → doesn't fit 12° FOV
      // θ = 75° (near limb): Earth is ~5° above horizon → perfect composition

      const mp = this.moon.truePosition;
      const altitude = this.lunarOrbitAltitude || 110;
      const camDist = MOON_MEAN_RADIUS + altitude; // 1847 km from Moon center

      // Direction from Moon toward Earth (normalized)
      const toEarthX = -mp.x, toEarthY = -mp.y, toEarthZ = -mp.z;
      const eDist = Math.sqrt(toEarthX * toEarthX + toEarthY * toEarthY + toEarthZ * toEarthZ);
      const edx = toEarthX / eDist, edy = toEarthY / eDist, edz = toEarthZ / eDist;

      // "Right" = perpendicular to Earth-Moon line
      let rx = -edz, ry = 0, rz = edx;
      const rLen = Math.sqrt(rx * rx + ry * ry + rz * rz);
      if (rLen > 0.001) { rx /= rLen; ry /= rLen; rz /= rLen; }

      // Camera at angle θ = 105° from Moon-to-Earth direction.
      // At θ=105°, Earth is 5° above the lunar horizon → fits in 12.8° FOV.
      // Verified by earthrise-geometry.test.js:
      //   θ_horizon = 90° + arccos(R/(R+h)) = 109.9° (Earth at geometric horizon)
      //   θ = 109.9° - 5° = 104.9° ≈ 105° (Earth 5° above horizon)
      //   At θ=75° (WRONG): Earth 15° ABOVE horizontal, 35° from horizon → doesn't fit
      //   At θ=105° (CORRECT): Earth 15° BELOW horizontal, 5° above horizon → fits ✓
      const theta = 105 * Math.PI / 180;
      const cosT = Math.cos(theta), sinT = Math.sin(theta);

      const camAbsX = mp.x + (cosT * edx + sinT * rx) * camDist;
      const camAbsY = mp.y + (cosT * edy + sinT * ry) * camDist;
      const camAbsZ = mp.z + (cosT * edz + sinT * rz) * camDist;

      // Radial outward at camera position (for "up" reference)
      const radX = cosT * edx + sinT * rx;
      const radY = cosT * edy + sinT * ry;
      const radZ = cosT * edz + sinT * rz;

      // Camera "up" = cross(right_at_camera, radial)
      // Right at camera position (perpendicular to radial and to ed)
      // Use cross(radial, worldUp) then cross(right, radial)
      let cRightX = radY * 0 - radZ * 1; // cross(rad, (0,0,1))... no, use (0,1,0)
      // cross((radX,radY,radZ), (0,1,0)) = (radZ, 0, -radX)... wait
      // cross(a,b) = (ay*bz - az*by, az*bx - ax*bz, ax*by - ay*bx)
      // cross(rad, (0,1,0)) = (radY*0 - radZ*1, radZ*0 - radX*0, radX*1 - radY*0)
      cRightX = -radZ;
      let cRightY = 0;
      let cRightZ = radX;
      const crLen = Math.sqrt(cRightX * cRightX + cRightY * cRightY + cRightZ * cRightZ);
      if (crLen > 0.001) { cRightX /= crLen; cRightY /= crLen; cRightZ /= crLen; }

      // Up = cross(right, radial)
      let upX = cRightY * radZ - cRightZ * radY;
      let upY = cRightZ * radX - cRightX * radZ;
      let upZ = cRightX * radY - cRightY * radX;

      // Re-center scene on camera
      this.earth.group.position.set(-camAbsX, -camAbsY, -camAbsZ);
      this.moon.group.position.set(mp.x - camAbsX, mp.y - camAbsY, mp.z - camAbsZ);
      this.sun.group.position.set(
        this.sun.truePosition.x - camAbsX,
        this.sun.truePosition.y - camAbsY,
        this.sun.truePosition.z - camAbsZ
      );

      this.cameraManager.camera.position.set(0, 0, 0);

      // Look toward Earth with a small downward tilt to center Earth+horizon in frame.
      // From θ=105°: Earth is 15° below horizontal, horizon is 19.9° below.
      // Midpoint = 17.4° below horizontal = 2.5° past Earth direction toward Moon.
      // tiltDown = tan(2.5°) = 0.0437 (verified in earthrise-geometry.test.js)
      // "Down" relative to camera = -radial direction
      const tiltDown = 0.0437;
      const baseLookX = edx - radX * tiltDown;
      const baseLookY = edy - radY * tiltDown;
      const baseLookZ = edz - radZ * tiltDown;

      // Apply user mouse-look adjustments
      const az = this.cameraManager.surfaceLookAz;
      const el = this.cameraManager.surfaceLookEl;

      // Rotate base look by elevation (around cRight axis) and azimuth (around up axis)
      let lookX = baseLookX, lookY = baseLookY, lookZ = baseLookZ;

      if (Math.abs(el) > 0.001) {
        const ce = Math.cos(el), se = Math.sin(el);
        // Rodrigues rotation around cRight axis by angle el
        const dotR = lookX * cRightX + lookY * cRightY + lookZ * cRightZ;
        const crossX = cRightY * lookZ - cRightZ * lookY;
        const crossY = cRightZ * lookX - cRightX * lookZ;
        const crossZ = cRightX * lookY - cRightY * lookX;
        lookX = lookX * ce + crossX * se + cRightX * dotR * (1 - ce);
        lookY = lookY * ce + crossY * se + cRightY * dotR * (1 - ce);
        lookZ = lookZ * ce + crossZ * se + cRightZ * dotR * (1 - ce);
      }
      if (Math.abs(az) > 0.001) {
        const ca = Math.cos(az), sa = Math.sin(az);
        const dotU = lookX * upX + lookY * upY + lookZ * upZ;
        const crossX = upY * lookZ - upZ * lookY;
        const crossY = upZ * lookX - upX * lookZ;
        const crossZ = upX * lookY - upY * lookX;
        lookX = lookX * ca + crossX * sa + upX * dotU * (1 - ca);
        lookY = lookY * ca + crossY * sa + upY * dotU * (1 - ca);
        lookZ = lookZ * ca + crossZ * sa + upZ * dotU * (1 - ca);
      }

      this.cameraManager.camera.up.set(upX, upY, upZ);
      this.cameraManager.camera.lookAt(lookX, lookY, lookZ);

      this.starfield.updatePosition(new THREE.Vector3(0, 0, 0));
      if (this.orbitLine) this.orbitLine.position.set(-camAbsX, -camAbsY, -camAbsZ);
      this.ground.update('orbital', null);
      this._updateLabels();
      return;

    } else if (this.viewMode === ViewMode.ORBITAL) {
      // Earth is at origin
      this.earth.group.position.set(0, 0, 0);
      this.moon.group.position.set(
        this.moon.truePosition.x,
        this.moon.truePosition.y,
        this.moon.truePosition.z
      );
      this.sun.group.position.set(
        this.sun.truePosition.x,
        this.sun.truePosition.y,
        this.sun.truePosition.z
      );
      if (this.orbitLine) this.orbitLine.position.set(0, 0, 0);
      this.starfield.updatePosition(this.cameraManager.camera.position);
      this.ground.update('orbital', null);
    } else {
      // Surface view: re-center everything so the surface point is at origin
      // Camera sits at eye height above origin
      const sp = this._currentSurfacePos;
      if (!sp) return;

      // All objects shift by -surfacePos (surface point becomes origin)
      this.earth.group.position.set(-sp.x, -sp.y, -sp.z);

      this.moon.group.position.set(
        this.moon.truePosition.x - sp.x,
        this.moon.truePosition.y - sp.y,
        this.moon.truePosition.z - sp.z
      );

      this.sun.group.position.set(
        this.sun.truePosition.x - sp.x,
        this.sun.truePosition.y - sp.y,
        this.sun.truePosition.z - sp.z
      );

      // Camera at the re-centered surface point (origin).
      // updateSurfaceView will add HUMAN_EYE_HEIGHT along the normal.
      const camSurfacePos = {
        x: 0,
        y: 0,
        z: 0,
        nx: sp.nx,
        ny: sp.ny,
        nz: sp.nz
      };
      this.cameraManager.updateSurfaceView(camSurfacePos);

      // Update ground plane orientation and visibility
      this.ground.update(this.viewMode, sp);

      this.starfield.updatePosition(this.cameraManager.camera.position);

      if (this.orbitLine) {
        this.orbitLine.position.set(-sp.x, -sp.y, -sp.z);
      }
    }

    this._updateLabels();
  }

  _updateHUD() {
    if (!this.hud) return;

    // Compute phase angle from existing positions (avoids re-running ephemeris)
    const mp = this.moon.truePosition;
    const sp = this.sun.truePosition;
    const moonLon = Math.atan2(-mp.z, mp.x); // Three.js back to ecliptic
    const sunLon = Math.atan2(-sp.z, sp.x);
    let phaseAngle = moonLon - sunLon;
    phaseAngle = ((phaseAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    this.hud.update({
      jd: this.jd,
      timeSpeed: this.timeSpeed * (this.isPaused ? 0 : 1),
      moonDistance: this.moon.currentDistance,
      sunDistance: this.sun.currentDistance,
      phaseAngle,
      viewMode: this.viewMode,
      lat: this.surfaceLat,
      lng: this.surfaceLng,
      fov: this.cameraManager.fov
    });
  }

  _createOrbitPath() {
    // Create a circular orbit path for visual reference
    // (approximate - the actual orbit is elliptical)
    const points = [];
    const segments = 256;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * EARTH_MOON_DISTANCE,
        0,
        Math.sin(angle) * EARTH_MOON_DISTANCE
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x444466,
      transparent: true,
      opacity: 0.4
    });
    this.orbitLine = new THREE.Line(geometry, material);
    this.orbitLine.visible = false;
    this.scene.add(this.orbitLine);
  }

  _createLabels() {
    this.labels.earth = this._makeLabel('Earth');
    this.labels.moon = this._makeLabel('Moon');
    this.labels.sun = this._makeLabel('Sun');

    this.scene.add(this.labels.earth);
    this.scene.add(this.labels.moon);
    this.scene.add(this.labels.sun);
  }

  _makeLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = '24px Courier New';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(20000, 5000, 1);
    return sprite;
  }

  _updateLabels() {
    if (!this.labelsVisible) return;

    // Position labels above each body
    const earthPos = this.earth.group.position;
    this.labels.earth.position.set(
      earthPos.x,
      earthPos.y + EARTH_EQUATORIAL_RADIUS * 1.5,
      earthPos.z
    );

    const moonPos = this.moon.group.position;
    this.labels.moon.position.set(
      moonPos.x,
      moonPos.y + MOON_MEAN_RADIUS * 3,
      moonPos.z
    );

    // Sun label - place it along the sun direction but at a visible distance
    const sunDir = new THREE.Vector3(
      this.sun.group.position.x,
      this.sun.group.position.y,
      this.sun.group.position.z
    ).normalize();
    this.labels.sun.position.copy(sunDir.multiplyScalar(EARTH_MOON_DISTANCE * 2));
    this.labels.sun.position.y += 20000;
  }

  // === Public API (called by Controls) ===

  setViewMode(mode) {
    this.viewMode = mode;
    this.cameraManager.setMode(mode);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
  }

  setTimeSpeed(speed) {
    this.timeSpeed = speed;
    this.isPaused = false;
  }

  multiplySpeed(factor) {
    this.timeSpeed *= factor;
    // Clamp to reasonable range
    this.timeSpeed = Math.max(1, Math.min(604800 * 52, Math.abs(this.timeSpeed)));
    if (this.isPaused) this.isPaused = false;
  }

  reverseTime() {
    this.timeSpeed = -Math.abs(this.timeSpeed);
  }

  setJulianDate(jd) {
    this.jd = jd;
    this._updateBodies();
  }

  setFOV(fov) {
    this.cameraManager.setFOV(fov);
  }

  setSurfaceLatLng(lat, lng) {
    this.surfaceLat = lat;
    this.surfaceLng = lng;
  }

  setOrbitPathVisible(visible) {
    this.orbitPathVisible = visible;
    if (this.orbitLine) {
      this.orbitLine.visible = visible;
    }
  }

  setLabelsVisible(visible) {
    this.labelsVisible = visible;
    if (this.labels.earth) this.labels.earth.visible = visible;
    if (this.labels.moon) this.labels.moon.visible = visible;
    if (this.labels.sun) this.labels.sun.visible = visible;
  }

  setAxesVisible(visible) {
    this.axesVisible = visible;
    if (this.axesHelper) this.axesHelper.visible = visible;
  }

  setAmbientBrightness(intensity) {
    if (this.sun) {
      this.sun.setAmbientIntensity(intensity);
    }
  }

  /**
   * Orient the camera on the Moon's surface to look toward Earth.
   * Computes the azimuth and elevation from the current surface position
   * to Earth's position (the origin in our geocentric frame).
   */
  lookAtEarthFromMoon() {
    if (this.viewMode !== ViewMode.MOON_SURFACE) return;

    // Force an update cycle to get current positions
    this._updateBodies();

    // Get the surface position on the Moon
    const sp = this.moon.getSurfacePosition(this.surfaceLat, this.surfaceLng, this.jd);

    // Earth is at origin (0,0,0). Direction from surface point to Earth:
    const toEarthX = -sp.x;
    const toEarthY = -sp.y;
    const toEarthZ = -sp.z;

    // Compute the surface normal (up direction)
    const nx = sp.nx, ny = sp.ny, nz = sp.nz;

    // Project the Earth direction onto the local tangent plane to get azimuth
    // and compute elevation above the horizon

    // Dot product with normal gives the component along "up"
    const dotUp = toEarthX * nx + toEarthY * ny + toEarthZ * nz;
    const len = Math.sqrt(toEarthX * toEarthX + toEarthY * toEarthY + toEarthZ * toEarthZ);

    // Elevation angle
    const sinEl = dotUp / len;
    const elevation = Math.asin(Math.max(-1, Math.min(1, sinEl)));

    // For azimuth, we need the tangent plane components
    // Remove the normal component to get the horizontal projection
    const horizX = toEarthX - dotUp * nx;
    const horizY = toEarthY - dotUp * ny;
    const horizZ = toEarthZ - dotUp * nz;

    // Build the same local coordinate frame as the camera manager
    // Must match CameraManager.updateSurfaceView exactly
    let eastX, eastY, eastZ;
    if (Math.abs(ny) > 0.99) {
      // Near poles: east = cross((0,0,1), up) = (-ny, nx, 0)... simplified
      eastX = -ny;
      eastY = nx;
      eastZ = 0;
    } else {
      // cross((0,1,0), (nx,ny,nz)) = (1*nz - 0*ny, 0*nx - 0*nz, 0*ny - 1*nx) = (nz, 0, -nx)
      eastX = nz;
      eastY = 0;
      eastZ = -nx;
    }
    // Normalize east
    const eastLen = Math.sqrt(eastX * eastX + eastY * eastY + eastZ * eastZ);
    if (eastLen > 0.0001) {
      eastX /= eastLen; eastY /= eastLen; eastZ /= eastLen;
    }

    // North = cross(up, east)
    const northX = ny * eastZ - nz * eastY;
    const northY = nz * eastX - nx * eastZ;
    const northZ = nx * eastY - ny * eastX;

    // Project horizontal component onto north and east
    const horizDotEast = horizX * eastX + horizY * eastY + horizZ * eastZ;
    const horizDotNorth = horizX * northX + horizY * northY + horizZ * northZ;

    // Azimuth (measured from north, clockwise = positive)
    const azimuth = Math.atan2(horizDotEast, horizDotNorth);

    // Set the camera manager's look direction
    this.cameraManager.surfaceLookAz = azimuth;
    this.cameraManager.surfaceLookEl = elevation;
  }
}

// Launch
const sim = new Simulation();
sim.init().catch(console.error);
