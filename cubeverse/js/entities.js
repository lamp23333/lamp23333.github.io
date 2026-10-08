'use strict';

function createShipModel() {
  const group = new THREE.Group();
  const matBody = new THREE.MeshLambertMaterial({ color: 0xd8e8f0, emissive: 0x112233 });
  const matDark = new THREE.MeshLambertMaterial({ color: 0x2a3540 });
  const matAccent = new THREE.MeshLambertMaterial({ color: 0xff9f43, emissive: 0xaa4400 });
  const matGlass = new THREE.MeshLambertMaterial({ color: 0x9fe8ff, emissive: 0x226688, transparent: true, opacity: 0.75 });

  // Main fuselage
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 4.2), matBody);
  body.position.y = 0.7;
  group.add(body);

  // Cockpit canopy
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 1.5), matGlass);
  cockpit.position.set(0, 1.25, -0.6);
  group.add(cockpit);

  // Nose
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 1.2), matBody);
  nose.position.set(0, 0.7, -2.6);
  group.add(nose);
  const noseTip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.7), matAccent);
  noseTip.position.set(0, 0.7, -3.3);
  group.add(noseTip);

  // Wings
  const wingMat = matDark;
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 1.8), wingMat);
  wingL.position.set(-1.9, 0.72, 0.6);
  group.add(wingL);
  const wingR = wingL.clone();
  wingR.position.x = 1.9;
  group.add(wingR);

  // Wingtip accents
  const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 1.2), matAccent);
  tipL.position.set(-3.4, 0.72, 0.6);
  group.add(tipL);
  const tipR = tipL.clone();
  tipR.position.x = 3.4;
  group.add(tipR);

  // Tail fins
  const finL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.8), matDark);
  finL.position.set(-0.7, 1.6, 2.2);
  group.add(finL);
  const finR = finL.clone();
  finR.position.x = 0.7;
  group.add(finR);
  const finV = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.15), matDark);
  finV.position.set(0, 1.65, 2.3);
  group.add(finV);

  // Engines
  const engL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.9), matDark);
  engL.position.set(-0.9, 0.6, 2.3);
  group.add(engL);
  const engR = engL.clone();
  engR.position.x = 0.9;
  group.add(engR);
  const engC = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.7), matDark);
  engC.position.set(0, 0.7, 2.3);
  group.add(engC);

  // Engine glow sprites
  function makeGlow() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(150,255,255,1)');
    grad.addColorStop(0.3, 'rgba(80,180,255,0.8)');
    grad.addColorStop(1, 'rgba(0,80,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.4, 1.4, 1);
    sprite.position.z = 0.4;
    return sprite;
  }
  const glowL = makeGlow(); glowL.position.set(-0.9, 0.6, 2.75); group.add(glowL);
  const glowR = makeGlow(); glowR.position.set(0.9, 0.6, 2.75); group.add(glowR);
  const glowC = makeGlow(); glowC.position.set(0, 0.7, 2.7); group.add(glowC);
  group.userData.glowSprites = [glowL, glowR, glowC];

  // Landing gear (legs)
  const legMat = new THREE.MeshLambertMaterial({ color: 0x666f7a });
  const gearL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 0.5), legMat);
  gearL.position.set(-0.6, 0.2, 0.8);
  group.add(gearL);
  const gearR = gearL.clone();
  gearR.position.x = 0.6;
  group.add(gearR);
  const gearB = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), legMat);
  gearB.position.set(0, 0.02, 1.0);
  group.add(gearB);

  group.userData.engineGlow = [glowL, glowR, glowC];
  return group;
}

function createAsteroid(radius = 1) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x8a7f72, flatShading: true });
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), mat);
  core.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
  group.add(core);
  const chunks = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < chunks; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(radius * (0.3 + Math.random() * 0.5), radius * (0.3 + Math.random() * 0.5), radius * (0.3 + Math.random() * 0.5)), mat);
    s.position.set(
      (Math.random() - 0.5) * radius * 1.4,
      (Math.random() - 0.5) * radius * 1.4,
      (Math.random() - 0.5) * radius * 1.4
    );
    group.add(s);
  }
  group.userData.radius = radius;
  return group;
}

function createPlanetVisual(planetData, scene) {
  const group = new THREE.Group();
  const r = planetData.radius;
  const color = planetData.color;
  const mat = new THREE.MeshLambertMaterial({ color, flatShading: true });

  // Blocky cube planet (Minecraft-like)
  const cube = new THREE.Mesh(new THREE.BoxGeometry(r * 2, r * 2, r * 2), mat);
  cube.rotation.y = Math.random() * Math.PI * 2;
  group.add(cube);

  // Random blocky surface bumps
  const bumpMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(0.82) });
  const lightMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(1.12) });
  const faces = [
    { axis: 'x', sign: 1 }, { axis: 'x', sign: -1 },
    { axis: 'y', sign: 1 }, { axis: 'y', sign: -1 },
    { axis: 'z', sign: 1 }, { axis: 'z', sign: -1 }
  ];
  const count = 24;
  for (let i = 0; i < count; i++) {
    const f = faces[i % faces.length];
    const size = r * (0.08 + Math.random() * 0.16);
    const pos = new THREE.Vector3();
    if (f.axis === 'x') pos.set(f.sign * r, (Math.random() - 0.5) * r * 1.7, (Math.random() - 0.5) * r * 1.7);
    else if (f.axis === 'y') pos.set((Math.random() - 0.5) * r * 1.7, f.sign * r, (Math.random() - 0.5) * r * 1.7);
    else pos.set((Math.random() - 0.5) * r * 1.7, (Math.random() - 0.5) * r * 1.7, f.sign * r);
    const box = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), Math.random() < 0.5 ? bumpMat : lightMat);
    box.position.copy(pos);
    group.add(box);
  }

  // Atmosphere glow
  const atmoMat = new THREE.MeshBasicMaterial({
    color: planetData.atmosphere,
    transparent: true,
    opacity: 0.22,
    side: THREE.BackSide,
    depthWrite: false
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(r * 1.12, 20, 20), atmoMat);
  group.add(atmo);

  // Cloud belt maybe
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const cloud = new THREE.Mesh(new THREE.BoxGeometry(r * 2.18, r * 0.5, r * 2.18), cloudMat);
  cloud.rotation.x = 0.6;
  group.add(cloud);

  group.userData.planetData = planetData;
  scene.add(group);
  return group;
}

function createSpaceStation() {
  const group = new THREE.Group();
  const main = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 20, 6), new THREE.MeshLambertMaterial({ color: 0x9fb4c8, flatShading: true }));
  main.rotation.z = Math.PI / 2;
  group.add(main);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(14, 0.8, 6, 16), new THREE.MeshLambertMaterial({ color: 0x7fffd4, emissive: 0x114444, transparent: true, opacity: 0.8 }));
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const hub = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshLambertMaterial({ color: 0xff9f43, emissive: 0x552200 }));
  group.add(hub);
  for (let i = 0; i < 6; i++) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 3), new THREE.MeshLambertMaterial({ color: 0x2a5f8a, emissive: 0x112233 }));
    const ang = i / 6 * Math.PI * 2;
    panel.position.set(Math.cos(ang) * 17, 0, Math.sin(ang) * 17);
    panel.rotation.y = -ang;
    group.add(panel);
  }
  return group;
}

function createParticles(scene, color, count = 80, size = 0.15) {
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.4, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.PointsMaterial({ map: tex, color: 0xffffff, size, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) pos[i] = 0;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, mat);
  points.visible = false;
  scene.add(points);
  return points;
}

function createPlayerModel() {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0x8fd8ff });
  const suit = new THREE.MeshLambertMaterial({ color: 0xe8f4f8 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a3540 });
  const visor = new THREE.MeshLambertMaterial({ color: 0x1e2a3a, emissive: 0x112233 });

  // Legs
  const legGeo = new THREE.BoxGeometry(0.22, 0.6, 0.24);
  const legL = new THREE.Mesh(legGeo, dark);
  legL.position.set(-0.16, 0.3, 0);
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, dark);
  legR.position.set(0.16, 0.3, 0);
  group.add(legR);

  // Body / spacesuit
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.3), suit);
  body.position.set(0, 0.93, 0);
  group.add(body);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.16, 0.55, 0.2);
  const armL = new THREE.Mesh(armGeo, skin);
  armL.position.set(-0.35, 0.95, 0);
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, skin);
  armR.position.set(0.35, 0.95, 0);
  group.add(armR);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.set(0, 1.42, 0);
  group.add(head);

  // Helmet visor
  const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.1), visor);
  visorMesh.position.set(0, 1.42, 0.17);
  group.add(visorMesh);

  // Backpack / jetpack
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.18), suit);
  pack.position.set(0, 1.0, -0.23);
  group.add(pack);

  group.userData.armL = armL;
  group.userData.armR = armR;
  group.userData.legL = legL;
  group.userData.legR = legR;
  return group;
}
