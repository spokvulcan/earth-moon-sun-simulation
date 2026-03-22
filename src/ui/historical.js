/**
 * Historical Apollo mission data with exact coordinates and UTC times.
 * Sources: NASA NSSDC, Apollo Lunar Surface Journal
 */
export const HISTORICAL_EVENTS = [
  {
    id: 'apollo11-step',
    name: 'Apollo 11 — First Step',
    description: 'Neil Armstrong becomes the first human to walk on the Moon',
    date: '1969-07-21T02:56:15Z',
    lat: 0.67416,
    lng: 23.47314,
    view: 'moon-surface',
    lookAtEarth: true
  },
  {
    id: 'apollo11-flag',
    name: 'Apollo 11 — Flag Planting',
    description: 'Armstrong and Aldrin plant the American flag in the Sea of Tranquility',
    date: '1969-07-21T03:41:00Z',
    lat: 0.67416,
    lng: 23.47314,
    view: 'moon-surface',
    lookAtEarth: true
  },
  {
    id: 'apollo12',
    name: 'Apollo 12 — EVA 1',
    description: 'Conrad and Bean explore the Ocean of Storms near Surveyor 3',
    date: '1969-11-19T11:32:35Z',
    lat: -3.01239,
    lng: -23.42157,
    view: 'moon-surface',
    lookAtEarth: true
  },
  {
    id: 'apollo14',
    name: 'Apollo 14 — EVA 1',
    description: 'Shepard and Mitchell explore Fra Mauro highlands',
    date: '1971-02-05T14:42:00Z',
    lat: -3.64530,
    lng: -17.47136,
    view: 'moon-surface',
    lookAtEarth: true
  },
  {
    id: 'apollo15',
    name: 'Apollo 15 — First Lunar Rover',
    description: 'Scott and Irwin drive the first Lunar Roving Vehicle at Hadley-Apennine',
    date: '1971-07-31T13:12:00Z',
    lat: 26.13222,
    lng: 3.63386,
    view: 'moon-surface',
    lookAtEarth: true
  },
  {
    id: 'apollo16',
    name: 'Apollo 16 — Descartes Highlands',
    description: 'Young and Duke explore the lunar highlands',
    date: '1972-04-21T16:47:00Z',
    lat: -8.97301,
    lng: 15.49812,
    view: 'moon-surface',
    lookAtEarth: true
  },
  {
    id: 'apollo17-eva1',
    name: 'Apollo 17 — First EVA',
    description: 'Cernan and Schmitt begin exploring Taurus-Littrow valley',
    date: '1972-12-11T23:54:00Z',
    lat: 20.19080,
    lng: 30.77168,
    view: 'moon-surface',
    lookAtEarth: true
  },
  {
    id: 'apollo17-last',
    name: 'Apollo 17 — Last Humans on Moon',
    description: 'Cernan speaks final words on the Moon before ascending',
    date: '1972-12-14T05:40:56Z',
    lat: 20.19080,
    lng: 30.77168,
    view: 'moon-surface',
    lookAtEarth: true
  },
  {
    id: 'earthrise-point',
    name: 'Earthrise from Lunar Surface',
    description: 'View from the Moon\'s limb where Earth appears near the horizon due to libration',
    date: null, // Use current date — libration makes this dynamic
    lat: 0,
    lng: 85, // Near the limb — Earth appears close to the horizon
    view: 'moon-surface',
    lookAtEarth: true
  },
  {
    id: 'apollo8-earthrise',
    name: 'Apollo 8 — Earthrise Photo',
    description: 'William Anders captures the iconic Earthrise from lunar orbit (110 km altitude), 250mm telephoto lens',
    date: '1968-12-24T16:39:39Z',
    lat: 0,
    lng: 0,
    view: 'lunar-orbit',
    lookAtEarth: true,
    // Apollo 8 specific: camera in lunar orbit, looking across the limb
    orbitAltitude: 110,  // km above Moon surface
    fov: 13             // 250mm lens on 56×56mm film: 2*atan(56/(2*250)) = 12.78° ≈ 13°
  }
];

/**
 * Compute the expected elevation angle of Earth above the lunar horizon
 * from a given selenographic position. Ignores libration for simplicity.
 *
 * @param {number} lat - Selenographic latitude in degrees
 * @param {number} lng - Selenographic longitude in degrees
 * @returns {number} Elevation angle in degrees (90° = directly overhead)
 */
export function earthElevationFromMoon(lat, lng) {
  const DEG = Math.PI / 180;
  const sinEl = Math.cos(lat * DEG) * Math.cos(lng * DEG);
  return Math.asin(Math.max(-1, Math.min(1, sinEl))) / DEG;
}
