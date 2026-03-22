# Earth-Moon-Sun Simulation

Physically accurate 3D simulation of the Earth-Moon-Sun system with verified orbital mechanics, built with Three.js.

**[Live Demo](https://spokvulcan.github.io/earth-moon-sun-simulation/)**

![Simulation Screenshot](https://img.shields.io/badge/Tests-68%20passed-brightgreen)

## Features

- **Exact physical parameters** — All sizes, distances, and orbital mechanics match NASA/IAU values (68 tests verify correctness)
- **Meeus ELP-2000/82 lunar theory** — 59+ periodic terms for accurate Moon position at any date
- **Kepler equation solver** — Newton-Raphson iteration for elliptical orbits
- **Time machine** — Jump to any date past or future, watch orbital evolution at adjustable speed
- **Human-perspective surface views** — Stand at 1.6m height on Earth or Moon, see the sky at correct angular sizes
- **Apollo mission presets** — Exact landing coordinates and UTC times for all 6 lunar surface missions
- **Apollo 8 Earthrise recreation** — Mathematically verified camera geometry from lunar orbit (110 km altitude, 250mm telephoto lens)
- **Adjustable ambient lighting** — Control dark-side visibility

## Physical Accuracy

| Parameter | Value | Source |
|---|---|---|
| Earth radius | 6,378.137 km | WGS84 |
| Moon radius | 1,737.4 km | IAU |
| Earth-Moon distance | 356,500–406,700 km | Meeus ephemeris |
| Moon angular diameter | 0.489°–0.558° | Computed |
| Earth axial tilt | 23.44° | IAU J2000 |
| Moon orbital period | 27.322 days | Verified by test |
| Eclipse alignment | < 5° error | Tested against known eclipses |

## Running Locally

```bash
npm install
npm run dev
```

## Tests

```bash
node src/tests/physics.test.js          # 56 physics verification tests
node src/orbit/earthrise-geometry.test.js  # 12 Earthrise geometry tests
```

## Apollo Mission Presets

| Mission | Date (UTC) | Coordinates | Earth Elevation |
|---|---|---|---|
| Apollo 11 — First Step | 1969-07-21 02:56 | 0.67°N, 23.47°E | 66.5° |
| Apollo 12 — EVA 1 | 1969-11-19 11:32 | 3.01°S, 23.42°W | 66.4° |
| Apollo 14 — EVA 1 | 1971-02-05 14:42 | 3.65°S, 17.47°W | 72.2° |
| Apollo 15 — First Rover | 1971-07-31 13:12 | 26.13°N, 3.63°E | 63.6° |
| Apollo 16 — Descartes | 1972-04-21 16:47 | 8.97°S, 15.50°E | 72.1° |
| Apollo 17 — Last Humans | 1972-12-14 05:40 | 20.19°N, 30.77°E | 53.7° |
| Apollo 8 — Earthrise | 1968-12-24 16:39 | Lunar orbit, 110 km | — |

## Tech Stack

- [Three.js](https://threejs.org/) — 3D rendering with logarithmic depth buffer
- [Vite](https://vite.dev/) — Build tool
- Textures from [Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0)
