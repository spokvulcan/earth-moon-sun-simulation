import * as THREE from 'three';

/**
 * Procedural ground plane for surface views.
 * Provides realistic near-field terrain detail that the planetary sphere
 * (with 64-128 segment faces spanning hundreds of km) cannot show.
 *
 * Without this, standing 1.6m above a 1737 km sphere with one texture
 * stretched over 170 km triangles looks like a satellite view, not ground-level.
 */
export class Ground {
  constructor() {
    this.earthGroup = new THREE.Group();
    this.earthGroup.name = 'EarthGround';
    this.earthGroup.visible = false;

    this.moonGroup = new THREE.Group();
    this.moonGroup.name = 'MoonGround';
    this.moonGroup.visible = false;

    this._createEarthGround();
    this._createMoonGround();
  }

  _createEarthGround() {
    // Earth ground: green/brown terrain
    const size = 20; // 20 km across — well beyond 4.5 km horizon distance from 1.6m
    const geometry = new THREE.PlaneGeometry(size, size, 64, 64);

    // Add slight height variation for terrain feel
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i); // PlaneGeometry Y becomes our Z
      // Gentle terrain undulation (hills of ~2-5 meters)
      const height = (
        Math.sin(x * 2.0) * Math.cos(z * 1.5) * 0.003 +
        Math.sin(x * 5.0 + 1.0) * Math.cos(z * 4.0 + 2.0) * 0.001 +
        Math.sin(x * 12.0 + 3.0) * Math.cos(z * 10.0 + 1.0) * 0.0004
      );
      positions.setZ(i, height);
    }
    geometry.computeVertexNormals();

    const texture = this._createEarthGroundTexture();
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide,
      shininess: 5,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // PlaneGeometry is in XY by default, rotate to XZ (horizontal)
    mesh.rotation.x = -Math.PI / 2;
    this.earthGroup.add(mesh);
  }

  _createMoonGround() {
    const size = 10; // 10 km — beyond 2.36 km Moon horizon
    const geometry = new THREE.PlaneGeometry(size, size, 64, 64);

    // Moon terrain: more irregular, with small craters
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i);
      let height = 0;

      // Gentle undulation
      height += Math.sin(x * 1.5) * Math.cos(z * 2.0) * 0.002;
      height += Math.sin(x * 4.0 + 1.0) * Math.cos(z * 3.0 + 2.0) * 0.001;

      // Small craters (depressions)
      for (let c = 0; c < 15; c++) {
        const cx = Math.sin(c * 7.3) * 4;
        const cz = Math.cos(c * 11.1) * 4;
        const cr = 0.05 + Math.abs(Math.sin(c * 3.7)) * 0.15; // radius 50-200m
        const dist = Math.sqrt((x - cx) ** 2 + (z - cz) ** 2);
        if (dist < cr) {
          const depth = 0.0003 * (1 - (dist / cr) ** 2); // ~0.3m deep
          height -= depth;
        }
      }

      positions.setZ(i, height);
    }
    geometry.computeVertexNormals();

    const texture = this._createMoonGroundTexture();
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide,
      shininess: 1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    this.moonGroup.add(mesh);
  }

  _createEarthGroundTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base green/brown ground
    ctx.fillStyle = '#3a5a2a';
    ctx.fillRect(0, 0, 512, 512);

    // Add noise/variation
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const shade = Math.random();
      if (shade > 0.7) {
        ctx.fillStyle = `rgba(80, 120, 50, ${Math.random() * 0.4})`;
      } else if (shade > 0.4) {
        ctx.fillStyle = `rgba(100, 80, 40, ${Math.random() * 0.3})`;
      } else {
        ctx.fillStyle = `rgba(60, 90, 35, ${Math.random() * 0.3})`;
      }
      ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }

    // Some darker patches (shadows/rocks)
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(30, 40, 20, ${0.2 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 512, Math.random() * 512,
        3 + Math.random() * 10, 2 + Math.random() * 5,
        Math.random() * Math.PI, 0, Math.PI * 2
      );
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40); // Repeat to fill the 20km plane
    return texture;
  }

  _createMoonGroundTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base gray regolith
    ctx.fillStyle = '#8a8a85';
    ctx.fillRect(0, 0, 512, 512);

    // Fine grain noise (regolith texture)
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const brightness = 120 + Math.random() * 40;
      ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness - 5}, ${Math.random() * 0.5})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    // Small rocks
    for (let i = 0; i < 50; i++) {
      const brightness = 60 + Math.random() * 60;
      ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness - 3})`;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 512, Math.random() * 512,
        1 + Math.random() * 4, 1 + Math.random() * 3,
        Math.random() * Math.PI, 0, Math.PI * 2
      );
      ctx.fill();
    }

    // Subtle footprint-like impressions (darker spots)
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(70, 70, 65, ${0.15 + Math.random() * 0.15})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(60, 60); // Repeat to fill the 10km plane
    return texture;
  }

  /**
   * Update ground position and orientation to match the camera's surface location.
   * The ground plane sits exactly at the surface point (origin in re-centered frame)
   * and is oriented perpendicular to the surface normal.
   *
   * @param {'earth-surface' | 'moon-surface' | 'orbital'} mode
   * @param {{ nx: number, ny: number, nz: number }} surfaceNormal
   */
  update(mode, surfaceNormal) {
    if (mode === 'earth-surface') {
      this.earthGroup.visible = true;
      this.moonGroup.visible = false;

      // Orient ground perpendicular to surface normal
      const up = new THREE.Vector3(surfaceNormal.nx, surfaceNormal.ny, surfaceNormal.nz);
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), up
      );
      this.earthGroup.quaternion.copy(quat);
      this.earthGroup.position.set(0, 0, 0);

    } else if (mode === 'moon-surface') {
      this.earthGroup.visible = false;
      this.moonGroup.visible = true;

      const up = new THREE.Vector3(surfaceNormal.nx, surfaceNormal.ny, surfaceNormal.nz);
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), up
      );
      this.moonGroup.quaternion.copy(quat);
      this.moonGroup.position.set(0, 0, 0);

    } else {
      this.earthGroup.visible = false;
      this.moonGroup.visible = false;
    }
  }
}
