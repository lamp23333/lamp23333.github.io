'use strict';

class Space {
  constructor(scene, seed) {
    this.scene = scene;
    this.seed = seed;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.planets = [];
    this.asteroids = [];
    this.ship = null;
    this.station = null;
    this.rotX = 0;
    this.rotY = 0;
    this.rotZ = 0;
    this.velocity = new THREE.Vector3();
    this.speed = 0;
    this.pulse = false;
    this.nearestPlanet = null;
    this.nearestAsteroid = null;
    this.engineOn = false;
    this.wasShift = false;
    this.homePlanetIndex = 0;
  }

  build() {
    const g = this.group;
    // Starfield
    const starCount = 1600;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 2600 + Math.random() * 1800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, sizeAttenuation: true, transparent: true, opacity: 0.9 });
    const stars = new THREE.Points(starGeo, starMat);
    g.add(stars);

    // Central sun (origin) + light
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(34, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff3b0 })
    );
    g.add(sunMesh);
    const sunGlow = createGlowSprite(0xffe28a, 190);
    sunGlow.position.set(0, 0, 0);
    g.add(sunGlow);
    const sunLight = new THREE.PointLight(0xfff3d6, 2.6, 0, 2);
    sunLight.position.set(0, 0, 0);
    g.add(sunLight);
    const ambient = new THREE.AmbientLight(0x445566, 0.9);
    g.add(ambient);

    // Planets orbit the central sun.
    const orbitRadii = [520, 760, 1000, 1240, 1480, 1720, 1960, 2200];
    const rnd = mulberry32(this.seed + 777);
    for (let i = 0; i < 8; i++) {
      const data = createPlanetData(i, this.seed);
      const visual = createPlanetVisual(data, g);
      const planet = {
        data,
        visual,
        orbitRadius: orbitRadii[i],
        orbitAngle: rnd() * Math.PI * 2,
        orbitSpeed: 0.012 + rnd() * 0.012,
        orbitPhase: rnd() * Math.PI * 2,
        orbitY: (rnd() - 0.5) * 0.16
      };
      this.planets.push(planet);
      // Set initial position
      this._updatePlanetOrbit(planet, 0);
    }

    // Asteroids
    for (let i = 0; i < 70; i++) {
      const radius = 1 + Math.random() * 4;
      const asteroid = createAsteroid(radius);
      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 700;
      asteroid.position.set(Math.cos(angle) * dist, (Math.random() - 0.5) * 220, Math.sin(angle) * dist);
      asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      g.add(asteroid);
      this.asteroids.push({ mesh: asteroid, radius });
    }

    // Space station
    this.station = createSpaceStation();
    this.station.position.set(180, 0, -120);
    g.add(this.station);

    // Ship
    this.ship = createShipModel();
    this.ship.position.set(0, 0, 0);
    g.add(this.ship);
    this.rotY = Math.PI;
  }

  setVisible(v) { this.group.visible = v; }

  _updatePlanetOrbit(p, dt) {
    if (dt > 0) p.orbitAngle += p.orbitSpeed * dt;
    const r = p.orbitRadius;
    const x = Math.cos(p.orbitAngle) * r;
    const z = Math.sin(p.orbitAngle) * r;
    const y = Math.sin(p.orbitAngle * 0.6 + p.orbitPhase) * r * p.orbitY;
    p.data.position.set(x, y, z);
    p.visual.position.set(x, y, z);
  }

  resetShip() {
    const home = this.planets.find(p => p.data.index === this.homePlanetIndex) || this.planets[0];
    const dir = home.data.position.clone();
    if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
    dir.normalize();
    this.ship.position.copy(home.data.position).addScaledVector(dir, home.data.radius + 55);
    this.velocity.set(0, 0, 0);
    this.rotX = 0; this.rotY = Math.PI; this.rotZ = 0;
    this.wasShift = false;
    this.engineOn = false;
  }

  update(dt, input, camera, audio) {
    if (!this.ship) return;
    const ship = this.ship;
    const sens = 0.0028;
    if (input.mouseDX || input.mouseDY) {
      this.rotY -= input.mouseDX * sens;
      this.rotX -= input.mouseDY * sens;
      this.rotX = clamp(this.rotX, -Math.PI / 2.2, Math.PI / 2.2);
    }
    if (input.keyA) this.rotZ += dt * 1.8;
    if (input.keyD) this.rotZ -= dt * 1.8;
    this.rotZ *= 0.92;

    ship.quaternion.setFromEuler(new THREE.Euler(this.rotX, this.rotY, this.rotZ, 'YXZ'));

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
    const accel = input.shift ? 70 : 26;
    const maxSpeed = input.shift ? 240 : 75;

    if (input.keyW) this.velocity.addScaledVector(forward, accel * dt);
    if (input.keyS) this.velocity.addScaledVector(forward, -accel * 0.7 * dt);
    if (!input.keyW && !input.keyS) this.velocity.multiplyScalar(0.985);

    const speed = this.velocity.length();
    if (speed > maxSpeed) this.velocity.setLength(maxSpeed);
    this.speed = this.velocity.length();
    ship.position.addScaledVector(this.velocity, dt);

    // Move planets along their orbits around the sun
    for (const p of this.planets) {
      this._updatePlanetOrbit(p, dt);
      p.visual.rotation.y += dt * 0.06;
    }

    // Engine audio
    if (audio) {
      if (input.shift && !this.wasShift) audio.pulse();
      this.wasShift = input.shift;
      const throttle = clamp(this.speed / maxSpeed, 0, 1);
      if ((input.keyW || input.shift || this.speed > 1) && !this.engineOn) {
        audio.startEngine(); this.engineOn = true;
      } else if (!input.keyW && !input.shift && this.speed < 0.5 && this.engineOn) {
        audio.stopEngine(); this.engineOn = false;
      }
      if (this.engineOn) audio.setEngine(throttle);
    }

    // Asteroid collision bounce
    for (const a of this.asteroids) {
      const diff = ship.position.clone().sub(a.mesh.position);
      const dist = diff.length();
      const minDist = a.radius + 2.5;
      if (dist < minDist && dist > 0.001) {
        diff.normalize();
        ship.position.copy(a.mesh.position).addScaledVector(diff, minDist);
        const dot = this.velocity.dot(diff);
        if (dot < 0) this.velocity.addScaledVector(diff, -dot * 1.6);
        if (audio) audio.hit();
      }
      a.mesh.rotation.x += dt * 0.05;
      a.mesh.rotation.y += dt * 0.08;
    }

    // Asteroid proximity
    this.nearestAsteroid = null;
    let minAsteroidDist = Infinity;
    for (const a of this.asteroids) {
      const d = ship.position.distanceTo(a.mesh.position);
      if (d < 8 && d < minAsteroidDist) {
        minAsteroidDist = d;
        this.nearestAsteroid = a;
      }
    }

    // Planet proximity
    this.nearestPlanet = null;
    let minDist = Infinity;
    for (const p of this.planets) {
      const d = ship.position.distanceTo(p.data.position);
      const threshold = p.data.radius * 2.1;
      if (d < threshold && d < minDist) {
        minDist = d;
        this.nearestPlanet = p;
      }
    }

    // Camera chase
    const back = new THREE.Vector3(0, 0, 1).applyQuaternion(ship.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(ship.quaternion);
    const camPos = ship.position.clone().addScaledVector(back, 8.5).addScaledVector(up, 2.4);
    camera.position.lerp(camPos, 1 - Math.pow(0.001, dt));
    const lookTarget = ship.position.clone().addScaledVector(forward, 12);
    camera.lookAt(lookTarget);
  }

  // Return data for HUD
  getSpeed() { return this.speed; }
  getPulse() { return this.pulse; }
}

function createGlowSprite(color, size) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  const css = typeof color === 'number' ? '#' + color.toString(16).padStart(6, '0') : color;
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, css);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}
