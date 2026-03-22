import * as THREE from 'three';
import {
  EARTH_EQUATORIAL_RADIUS, EARTH_POLAR_RADIUS, EARTH_OBLATENESS, EARTH_AXIAL_TILT,
  DEG, SPHERE_SEGMENTS_HIGH
} from '../constants.js';
import { loadTexture } from '../utils/texture-loader.js';
import { gmst } from '../orbit/julian.js';

export class Earth {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Earth';

    // Apply axial tilt (rotate around Z axis in ecliptic frame)
    this.tiltGroup = new THREE.Group();
    this.tiltGroup.rotation.z = EARTH_AXIAL_TILT * DEG;
    this.group.add(this.tiltGroup);

    // Earth is at origin in our geocentric coordinate system
    this.truePosition = { x: 0, y: 0, z: 0 };

    this.mainMesh = null;
    this.cloudMesh = null;
    this.atmosphereMesh = null;
    this.nightMesh = null;
  }

  async init() {
    const [dayMap, nightMap, cloudMap, specMap, bumpMap] = await Promise.all([
      loadTexture('/textures/earth_daymap.jpg'),
      loadTexture('/textures/earth_nightmap.jpg'),
      loadTexture('/textures/earth_clouds.jpg'),
      loadTexture('/textures/earth_specular.jpg'),
      loadTexture('/textures/earth_bump.jpg')
    ]);

    const geometry = new THREE.SphereGeometry(
      EARTH_EQUATORIAL_RADIUS,
      SPHERE_SEGMENTS_HIGH,
      SPHERE_SEGMENTS_HIGH / 2
    );

    // Main Earth mesh (day side)
    const material = new THREE.MeshPhongMaterial({
      map: dayMap,
      bumpMap: bumpMap,
      bumpScale: 5,
      specularMap: specMap,
      specular: new THREE.Color(0x333333),
      shininess: 25
    });

    this.mainMesh = new THREE.Mesh(geometry, material);
    // Apply oblateness (polar flattening)
    this.mainMesh.scale.y = EARTH_OBLATENESS;
    this.tiltGroup.add(this.mainMesh);

    // Night lights (ShaderMaterial with sun direction uniform)
    this.nightSunDir = new THREE.Vector3(1, 0, 0);
    const nightMaterial = new THREE.ShaderMaterial({
      uniforms: {
        nightMap: { value: nightMap },
        sunDirection: { value: this.nightSunDir }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalW;
        void main() {
          vUv = uv;
          vNormalW = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D nightMap;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vNormalW;
        void main() {
          vec3 sunDir = normalize(sunDirection);
          float lightIntensity = dot(vNormalW, sunDir);
          float nightFade = 1.0 - smoothstep(-0.1, 0.3, lightIntensity);
          vec4 nightColor = texture2D(nightMap, vUv);
          gl_FragColor = vec4(nightColor.rgb * nightFade, nightFade * nightColor.a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.nightMesh = new THREE.Mesh(geometry.clone(), nightMaterial);
    this.nightMesh.scale.y = EARTH_OBLATENESS;
    this.tiltGroup.add(this.nightMesh);

    // Cloud layer
    const cloudGeometry = new THREE.SphereGeometry(
      EARTH_EQUATORIAL_RADIUS * 1.003,
      SPHERE_SEGMENTS_HIGH,
      SPHERE_SEGMENTS_HIGH / 2
    );
    const cloudMaterial = new THREE.MeshPhongMaterial({
      map: cloudMap,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    this.cloudMesh.scale.y = EARTH_OBLATENESS;
    this.tiltGroup.add(this.cloudMesh);

    // Atmosphere glow
    const atmosGeometry = new THREE.SphereGeometry(
      EARTH_EQUATORIAL_RADIUS * 1.015,
      64, 32
    );
    const atmosMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float fresnel = 1.0 - dot(viewDir, vNormal);
          fresnel = pow(fresnel, 3.0);
          vec3 color = vec3(0.3, 0.6, 1.0);
          gl_FragColor = vec4(color, fresnel * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.atmosphereMesh = new THREE.Mesh(atmosGeometry, atmosMaterial);
    this.atmosphereMesh.scale.y = EARTH_OBLATENESS;
    this.tiltGroup.add(this.atmosphereMesh);

    return this;
  }

  /**
   * Update Earth rotation based on Julian Date.
   * @param {number} jd - Current Julian Date
   */
  update(jd) {
    // GMST gives Earth's rotation angle in degrees
    const rotationDeg = gmst(jd);
    const rotationRad = rotationDeg * DEG;

    // Rotate the Earth meshes around Y axis (polar axis after tilt)
    if (this.mainMesh) {
      this.mainMesh.rotation.y = rotationRad;
    }
    if (this.nightMesh) {
      this.nightMesh.rotation.y = rotationRad;
    }
    if (this.cloudMesh) {
      // Clouds rotate slightly differently (offset for visual effect)
      this.cloudMesh.rotation.y = rotationRad + 0.001 * (jd - 2451545.0);
    }
  }

  /**
   * Set atmosphere visibility (hide when camera is inside).
   */
  setAtmosphereVisible(visible) {
    if (this.atmosphereMesh) {
      this.atmosphereMesh.visible = visible;
    }
  }

  /**
   * Get the surface normal at a given lat/lng (in Earth's body frame, before tilt).
   * After tilt, must apply tiltGroup rotation.
   */
  getSurfacePosition(lat, lng, jd) {
    const latRad = lat * DEG;
    const lngRad = lng * DEG;
    const gmstDeg = gmst(jd);
    const gmstRad = gmstDeg * DEG;

    // Local position on sphere (before Earth rotation)
    const nx = Math.cos(latRad) * Math.cos(lngRad);
    const ny = Math.sin(latRad) * EARTH_OBLATENESS;
    const nz = Math.cos(latRad) * Math.sin(lngRad);

    const r = EARTH_EQUATORIAL_RADIUS;
    let x = nx * r;
    let y = ny * r;
    let z = nz * r;

    // Apply Earth's rotation (GMST)
    const cosG = Math.cos(gmstRad);
    const sinG = Math.sin(gmstRad);
    const rx = x * cosG + z * sinG;
    const rz = -x * sinG + z * cosG;
    x = rx;
    z = rz;

    // Apply axial tilt (23.44° rotation around Z axis)
    // Matches the Three.js tiltGroup which has rotation.z = 23.44°
    const tilt = EARTH_AXIAL_TILT * DEG;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    const finalX = x * cosT - y * sinT;
    const finalY = x * sinT + y * cosT;

    // Compute normalized surface normal
    // (oblateness makes the raw direction non-unit-length)
    const nnx = finalX / r;
    const nny = finalY / r;
    const nnz = z / r;
    const nLen = Math.sqrt(nnx * nnx + nny * nny + nnz * nnz);

    return {
      x: finalX,
      y: finalY,
      z: z,
      nx: nnx / nLen,
      ny: nny / nLen,
      nz: nnz / nLen
    };
  }
}
