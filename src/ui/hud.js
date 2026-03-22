import { formatNumber } from '../utils/math-utils.js';
import { jdToJSDate } from '../orbit/julian.js';
import { AU } from '../constants.js';
import { ViewMode } from '../camera/camera-manager.js';

const PHASE_NAMES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'
];

export class HUD {
  constructor() {
    this.elDate = document.getElementById('hud-date');
    this.elSpeed = document.getElementById('hud-speed');
    this.elDistMoon = document.getElementById('hud-distance-moon');
    this.elDistSun = document.getElementById('hud-distance-sun');
    this.elPhase = document.getElementById('hud-moon-phase');
    this.elCamera = document.getElementById('hud-camera');
  }

  update(state) {
    const { jd, timeSpeed, moonDistance, sunDistance, phaseAngle, viewMode, lat, lng, fov } = state;

    const date = jdToJSDate(jd);
    const dateStr = date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    this.elDate.innerHTML = `<span class="hud-label">Date:</span> <span class="hud-value">${dateStr}</span>`;

    let speedLabel;
    const absSpeed = Math.abs(timeSpeed);
    if (absSpeed === 0) speedLabel = 'Paused';
    else if (absSpeed === 1) speedLabel = 'Real-time';
    else if (absSpeed < 60) speedLabel = `${absSpeed}x`;
    else if (absSpeed < 3600) speedLabel = `${(absSpeed / 60).toFixed(1)} min/s`;
    else if (absSpeed < 86400) speedLabel = `${(absSpeed / 3600).toFixed(1)} hr/s`;
    else if (absSpeed < 604800) speedLabel = `${(absSpeed / 86400).toFixed(1)} day/s`;
    else speedLabel = `${(absSpeed / 604800).toFixed(1)} wk/s`;
    if (timeSpeed < 0) speedLabel += ' (reverse)';
    this.elSpeed.innerHTML = `<span class="hud-label">Speed:</span> <span class="hud-value">${speedLabel}</span>`;

    this.elDistMoon.innerHTML = `<span class="hud-label">Earth-Moon:</span> <span class="hud-value">${formatNumber(moonDistance)} km</span>`;

    const sunDistAU = sunDistance / AU;
    this.elDistSun.innerHTML = `<span class="hud-label">Earth-Sun:</span> <span class="hud-value">${sunDistAU.toFixed(5)} AU</span>`;

    // Phase angle is computed from existing positions in main.js (no extra ephemeris call)
    const phaseIdx = Math.round(phaseAngle / (Math.PI / 4)) % 8;
    const illumination = ((1 - Math.cos(phaseAngle)) / 2 * 100).toFixed(1);
    this.elPhase.innerHTML = `<span class="hud-label">Moon:</span> <span class="hud-value">${PHASE_NAMES[phaseIdx]} (${illumination}%)</span>`;

    let camInfo;
    if (viewMode === ViewMode.ORBITAL) {
      camInfo = 'Orbital view';
    } else if (viewMode === ViewMode.LUNAR_ORBIT) {
      camInfo = `Lunar orbit (110 km) | FOV ${fov}\u00B0`;
    } else if (viewMode === ViewMode.EARTH_SURFACE) {
      camInfo = `Earth ${lat.toFixed(1)}\u00B0, ${lng.toFixed(1)}\u00B0 | FOV ${fov}\u00B0`;
    } else {
      camInfo = `Moon ${lat.toFixed(1)}\u00B0, ${lng.toFixed(1)}\u00B0 | FOV ${fov}\u00B0`;
    }
    this.elCamera.innerHTML = `<span class="hud-label">Camera:</span> <span class="hud-value">${camInfo}</span>`;
  }
}
