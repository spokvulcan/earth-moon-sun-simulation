import { jsDateToJD, jdToJSDate } from '../orbit/julian.js';
import { HISTORICAL_EVENTS, earthElevationFromMoon } from './historical.js';

export class Controls {
  constructor(simulation) {
    this.sim = simulation;
    this.speedPresets = [1, 60, 3600, 86400, 604800];
    this.currentPresetIndex = 3; // Default: 86400 (1 day/s)

    this._setupViewButtons();
    this._setupTimeControls();
    this._setupTimeMachine();
    this._setupFOV();
    this._setupToggles();
    this._setupLatLng();
    this._setupHistoricalEvents();
  }

  _setupViewButtons() {
    const buttons = document.querySelectorAll('.view-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        this.sim.setViewMode(view);
      });
    });
  }

  _setupTimeControls() {
    document.getElementById('btn-pause').addEventListener('click', () => {
      this.sim.togglePause();
      this._updatePauseButton();
    });

    document.getElementById('btn-faster').addEventListener('click', () => {
      this.sim.multiplySpeed(3);
      this._updateSpeedPresetHighlight();
    });

    document.getElementById('btn-slower').addEventListener('click', () => {
      this.sim.multiplySpeed(1 / 3);
      this._updateSpeedPresetHighlight();
    });

    document.getElementById('btn-reverse').addEventListener('click', () => {
      this.sim.reverseTime();
    });

    document.getElementById('btn-forward').addEventListener('click', () => {
      this.sim.multiplySpeed(10);
      this._updateSpeedPresetHighlight();
    });

    // Speed presets
    const presetButtons = document.querySelectorAll('.speed-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseInt(btn.dataset.speed);
        this.sim.setTimeSpeed(speed);
        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  _setupTimeMachine() {
    const dateInput = document.getElementById('input-datetime');

    // Set to current date
    const now = new Date();
    dateInput.value = this._dateToInputValue(now);

    document.getElementById('btn-now').addEventListener('click', () => {
      const now = new Date();
      dateInput.value = this._dateToInputValue(now);
      this.sim.setJulianDate(jsDateToJD(now));
    });

    document.getElementById('btn-goto').addEventListener('click', () => {
      const date = new Date(dateInput.value + 'Z');
      if (!isNaN(date.getTime())) {
        this.sim.setJulianDate(jsDateToJD(date));
      }
    });

    dateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const date = new Date(dateInput.value + 'Z');
        if (!isNaN(date.getTime())) {
          this.sim.setJulianDate(jsDateToJD(date));
        }
      }
    });
  }

  _setupFOV() {
    const fovSlider = document.getElementById('input-fov');
    const fovValue = document.getElementById('fov-value');

    fovSlider.addEventListener('input', () => {
      const fov = parseInt(fovSlider.value);
      fovValue.textContent = `${fov}\u00B0`;
      this.sim.setFOV(fov);
    });

    // Ambient brightness slider
    const ambientSlider = document.getElementById('input-ambient');
    const ambientValue = document.getElementById('ambient-value');

    ambientSlider.addEventListener('input', () => {
      const val = parseInt(ambientSlider.value);
      ambientValue.textContent = `${val}%`;
      this.sim.setAmbientBrightness(val / 100);
    });
  }

  _setupToggles() {
    document.getElementById('toggle-orbits').addEventListener('change', (e) => {
      this.sim.setOrbitPathVisible(e.target.checked);
    });

    document.getElementById('toggle-labels').addEventListener('change', (e) => {
      this.sim.setLabelsVisible(e.target.checked);
    });

    document.getElementById('toggle-axes').addEventListener('change', (e) => {
      this.sim.setAxesVisible(e.target.checked);
    });
  }

  _setupLatLng() {
    const latInput = document.getElementById('input-lat');
    const lngInput = document.getElementById('input-lng');

    const update = () => {
      this.sim.setSurfaceLatLng(
        parseFloat(latInput.value) || 0,
        parseFloat(lngInput.value) || 0
      );
    };

    latInput.addEventListener('change', update);
    lngInput.addEventListener('change', update);
  }

  _setupHistoricalEvents() {
    const container = document.getElementById('historical-events');

    HISTORICAL_EVENTS.forEach(event => {
      const btn = document.createElement('button');
      btn.className = 'event-btn';

      // Compute Earth elevation for Moon surface events
      let earthInfo = '';
      if (event.view === 'moon-surface') {
        const elev = earthElevationFromMoon(event.lat, event.lng);
        if (elev > 5) {
          earthInfo = `Earth: ${elev.toFixed(1)}\u00B0 above horizon`;
        } else if (elev > 0) {
          earthInfo = `Earth: near horizon (${elev.toFixed(1)}\u00B0)`;
        } else {
          earthInfo = `Earth: below horizon`;
        }
      }

      // Format date
      let dateStr = '';
      if (event.date) {
        const d = new Date(event.date);
        dateStr = d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
      } else {
        dateStr = 'Dynamic (current date)';
      }

      btn.innerHTML = `
        <div class="event-name">${event.name}</div>
        <div class="event-desc">${event.description}</div>
        <div class="event-date">${dateStr}</div>
        ${earthInfo ? `<div class="event-earth-info">${earthInfo}</div>` : ''}
      `;

      btn.addEventListener('click', () => this._activateEvent(event));
      container.appendChild(btn);
    });
  }

  _activateEvent(event) {
    // Set date (if specified)
    if (event.date) {
      const date = new Date(event.date);
      this.sim.setJulianDate(jsDateToJD(date));
      // Pause so user can observe the exact moment
      this.sim.isPaused = true;
      this._updatePauseButton();
    }

    // Set lat/lng
    this.sim.setSurfaceLatLng(event.lat, event.lng);
    document.getElementById('input-lat').value = event.lat;
    document.getElementById('input-lng').value = event.lng;

    // Set FOV if specified (e.g., 250mm telephoto for Apollo 8)
    if (event.fov) {
      this.sim.setFOV(event.fov);
      document.getElementById('input-fov').value = event.fov;
      document.getElementById('fov-value').textContent = `${event.fov}\u00B0`;
    }

    // Set lunar orbit altitude if specified
    if (event.orbitAltitude) {
      this.sim.lunarOrbitAltitude = event.orbitAltitude;
    }

    // Set view mode
    this.sim.setViewMode(event.view);
    // Update view buttons (lunar-orbit highlights none since it's a special mode)
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === event.view);
    });

    // If lookAtEarth, orient the camera toward Earth
    if (event.lookAtEarth && event.view === 'moon-surface') {
      requestAnimationFrame(() => {
        this.sim.lookAtEarthFromMoon();
      });
    }
  }

  _updatePauseButton() {
    const btn = document.getElementById('btn-pause');
    btn.innerHTML = this.sim.isPaused ? '&#9654;' : '&#9646;&#9646;';
  }

  _updateSpeedPresetHighlight() {
    const presetButtons = document.querySelectorAll('.speed-btn');
    const absSpeed = Math.abs(this.sim.timeSpeed);
    presetButtons.forEach(btn => {
      const speed = parseInt(btn.dataset.speed);
      btn.classList.toggle('active', Math.abs(speed - absSpeed) < 0.01);
    });
  }

  updateDateInput(jd) {
    const dateInput = document.getElementById('input-datetime');
    const date = jdToJSDate(jd);
    dateInput.value = this._dateToInputValue(date);
  }

  _dateToInputValue(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  }
}
