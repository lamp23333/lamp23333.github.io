'use strict';

(function() {
  // ---------- Core setup ----------
  const canvas = document.getElementById('game-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const globalAmbient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(globalAmbient);
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 9000);
  camera.position.set(0, 8, 30);
  camera.lookAt(0, 0, 0);

  const audio = new AudioManager();
  const atlas = createTextureAtlas();

  // ---------- UI Elements ----------
  const $ = id => document.getElementById(id);
  const loadingScreen = $('loading-screen');
  const mainMenu = $('main-menu');
  const controlsModal = $('controls-modal');
  const hud = $('hud');
  const inventoryModal = $('inventory-modal');
  const pauseMenu = $('pause-menu');
  const transitionOverlay = $('transition-overlay');
  const transitionLabel = $('transition-label');
  const hotbarEl = $('hotbar');
  const interactHint = $('interact-hint');
  const speedometer = $('speedometer');
  const toastContainer = $('toast-container');
  const scanOverlay = $('scan-overlay');
  const touchControls = $('touch-controls');
  const joyBase = $('joy-base');
  const joyThumb = $('joy-thumb');
  const lookArea = $('touch-look-area');
  const errorBox = $('error-box');

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }
  window.addEventListener('error', e => {
    showError(e.message || 'Unknown error');
  });
  window.addEventListener('unhandledrejection', e => {
    showError((e.reason && e.reason.message) || e.reason || 'Promise error');
  });

  function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  function updateTouchControls() {
    const inGame = (GAME.state === 'planet' || GAME.state === 'space') && !GAME.inventoryOpen && pauseMenu.classList.contains('hidden');
    touchControls.classList.toggle('hidden', !isTouchDevice() || !inGame);
  }

  // ---------- Game state ----------
  const GAME = {
    state: 'menu', // menu, planet, space, transition
    seed: 20260815,
    currentPlanet: null,
    world: null,
    space: null,
    inventory: makeInventory(),
    player: {
      x: 0.5, y: 12, z: 0.5,
      vx: 0, vy: 0, vz: 0,
      onGround: false,
      yaw: 0, pitch: 0,
      health: 100, oxygen: 100, jetpack: 100,
      shipFuel: 0, shipShield: 100, shipHull: 100,
      selectedSlot: 0,
      thirdPerson: false,
      mineCooldown: 0,
      scannerT: 0,
      oxygenTick: 0
    },
    keys: {},
    input: { mouseDX: 0, mouseDY: 0, keyW:false,keyS:false,keyA:false,keyD:false,keyQ:false,keyE:false,shift:false,space:false },
    mouseLeft: false,
    mouseRight: false,
    inventoryOpen: false,
    lastTimestamp: 0,
    transitionTimer: 0,
    worldGroup: null,
    shipModelOnPlanet: null,
    shipPosition: new THREE.Vector3(0.5, 8, 0.5),
    playerModel: null
  };

  // ---------- Space menu background ----------
  const space = new Space(scene, GAME.seed);
  space.build();
  space.setVisible(true);
  GAME.space = space;

  // ---------- Utilities ----------
  function setLoadingText(text) {
    document.querySelector('.loader-text').textContent = text;
  }
  function setLoadingProgress(p) {
    document.querySelector('.loader-fill').style.width = (p * 100) + '%';
  }
  function toast(msg, duration = 2800) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastContainer.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.4s';
      setTimeout(() => el.remove(), 400);
    }, duration);
  }

  function updateHUD() {
    const p = GAME.player;
    $('bar-hp').style.width = p.health + '%';
    $('bar-o2').style.width = p.oxygen + '%';
    $('bar-jet').style.width = p.jetpack + '%';
    $('num-hp').textContent = Math.round(p.health);
    $('num-o2').textContent = Math.round(p.oxygen);
    $('num-jet').textContent = Math.round(p.jetpack);
    const fuelCount = GAME.inventory.resources.launchFuel || 0;
    $('bar-fuel').style.width = clamp(fuelCount * 33.3, 0, 100) + '%';
    $('num-fuel').textContent = fuelCount;
    $('bar-shield').style.width = p.shipShield + '%';
    $('num-shield').textContent = Math.round(p.shipShield);
    if (GAME.state === 'space') {
      $('speed-value').textContent = formatNumber(space.speed || 0);
      $('pulse-status').textContent = GAME.input.shift ? '脉冲驱动' : '常规飞行';
    }
  }

  function renderHotbar() {
    const inv = GAME.inventory;
    hotbarEl.style.display = 'flex';
    hotbarEl.style.flexDirection = 'row';
    hotbarEl.style.alignItems = 'center';
    hotbarEl.style.gap = '6px';
    hotbarEl.innerHTML = '';
    for (let i = 0; i < inv.hotbar.length; i++) {
      const item = inv.hotbar[i];
      const count = item.type === 'block' ? (inv.blocks[item.id] || 0) : (inv.resources[item.id] || 0);
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot' + (i === GAME.player.selectedSlot ? ' selected' : '');
      const icon = item.type === 'block' ? blockIcon(item.id) : (RESOURCE_DEFS[item.id]?.icon || '•');
      const name = item.type === 'block' ? BLOCK_INFO[item.id]?.name : RESOURCE_DEFS[item.id]?.name;
      slot.innerHTML = `<div class="slot-key">${i + 1}</div><div class="slot-icon">${icon}</div><div class="slot-count">${count}</div>`;
      slot.title = name;
      slot.addEventListener('click', () => {
        GAME.player.selectedSlot = i;
        renderHotbar();
      });
      hotbarEl.appendChild(slot);
    }
  }

  function blockIcon(id) {
    const map = {
      plank: '🪵', metal: '🔩', stone: '🪨', sand: '🏜️', glass: '🪟',
      grass: '🌿', dirt: '🟫', log: '🪵', leaves: '🍃', snow: '❄️',
      ice: '🧊', cactus: '🌵', sodium: '⚡', crystal: '💎', copper: '🟠',
      stardust: '✨', pad: '🛬'
    };
    return map[id] || '⬜';
  }

  function updateLocation() {
    if (GAME.state === 'space') {
      $('hud-location').textContent = '深空轨道';
      $('hud-objective').textContent = '接近星球按 F 降落 · 扫描按 Q';
    } else if (GAME.world) {
      $('hud-location').textContent = GAME.currentPlanet?.name || '未知星球';
      $('hud-objective').textContent = GAME.currentPlanet?.desc || '收集资源，修复飞船';
    }
  }

  // ---------- World creation ----------
  function createWorldForPlanet(planetData) {
    if (GAME.world) {
      GAME.world.dispose();
      GAME.world = null;
    }
    if (GAME.worldGroup) {
      if (GAME.shipModelOnPlanet) GAME.worldGroup.remove(GAME.shipModelOnPlanet);
      if (GAME.playerModel) GAME.worldGroup.remove(GAME.playerModel);
      scene.remove(GAME.worldGroup);
      GAME.shipModelOnPlanet = null;
      GAME.playerModel = null;
    }
    GAME.worldGroup = new THREE.Group();
    GAME.worldGroup.visible = true;
    scene.add(GAME.worldGroup);
    const world = new PlanetWorld(GAME.worldGroup, planetData.seed, planetData.typeKey, atlas);
    GAME.world = world;
    if (world.group.parent !== GAME.worldGroup) GAME.worldGroup.add(world.group);
    world.updateAround(0, 0);
    // Add ship model on landing pad
    const ship = createShipModel();
    ship.scale.setScalar(1.1);
    const spawn = world.spawnPosition();
    ship.position.set(spawn.x + 3, spawn.y - 0.1, spawn.z);
    ship.rotation.y = Math.PI;
    GAME.worldGroup.add(ship);
    GAME.shipModelOnPlanet = ship;
    GAME.shipPosition.set(spawn.x + 3, spawn.y - 0.1, spawn.z);

    // Atmosphere / fog
    scene.fog = new THREE.Fog(world.type.fog, 30, 120);
    scene.background = new THREE.Color(world.type.sky);
    const hemi = new THREE.HemisphereLight(world.type.sky, 0x3a3a3a, 0.9);
    hemi.name = 'planetHemi';
    const sun = new THREE.DirectionalLight(0xfff3d6, 1.2);
    sun.position.set(50, 100, 30);
    sun.name = 'planetSun';
    GAME.worldGroup.add(hemi); GAME.worldGroup.add(sun);
    GAME.worldGroup.userData.hemi = hemi;
    GAME.worldGroup.userData.sun = sun;
    return world;
  }

  function spawnPlayerModel() {
    if (GAME.playerModel) {
      if (GAME.worldGroup) GAME.worldGroup.remove(GAME.playerModel);
      GAME.playerModel = null;
    }
    if (!GAME.worldGroup) return;
    GAME.playerModel = createPlayerModel();
    GAME.worldGroup.add(GAME.playerModel);
  }

  function startNewGame() {
    audio.ensure();
    audio.uiClick();
    mainMenu.classList.add('hidden');
    controlsModal.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
    setLoadingProgress(0.15); setLoadingText('生成起始星球...');
    const planetData = createPlanetData(0, GAME.seed);
    GAME.currentPlanet = planetData;
    GAME.inventory = makeInventory();
    // Give some starting resources to avoid soft-lock? NMS starts with enough.
    addResource(GAME.inventory, 'ferrite', 60);
    addResource(GAME.inventory, 'dihydrogen', 40);
    addResource(GAME.inventory, 'metalPlate', 1);
    addResource(GAME.inventory, 'launchFuel', 1);
    addBlock(GAME.inventory, 'plank', 20);
    addBlock(GAME.inventory, 'metal', 20);
    addBlock(GAME.inventory, 'stone', 20);

    setTimeout(() => {
      space.setVisible(false);
      createWorldForPlanet(planetData);
      const spawn = GAME.world.spawnPosition();
      const p = GAME.player;
      p.x = spawn.x; p.y = spawn.y; p.z = spawn.z;
      p.vx = 0; p.vy = 0; p.vz = 0; p.yaw = Math.PI; p.pitch = -0.35;
      p.health = 100; p.oxygen = 100; p.jetpack = 100; p.shipShield = 100;
      p.oxygenTick = 0;
      p.selectedSlot = 0;
      GAME.state = 'planet';
      camera.position.set(p.x, p.y + 1.6, p.z);
      camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
      spawnPlayerModel();
      GAME.inventoryOpen = false;
      renderer.render(scene, camera);
      setLoadingProgress(1);
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        hud.classList.remove('hidden');
        speedometer.classList.add('hidden');
        updateHUD(); updateLocation(); renderHotbar();
        updateTouchControls();
        requestPointerLock();
        toast('欢迎来到「方块深空」！先去采集资源，修理飞船。', 4000);
        toast('按 Q 扫描附近资源 · Tab 打开背包合成', 4000);
      }, 250);
    }, 400);
  }

  // ---------- Pointer lock & input ----------
  function requestPointerLock() {
    if (isTouchDevice()) return;
    if (document.pointerLockElement !== renderer.domElement) {
      try { renderer.domElement.requestPointerLock(); } catch(e) {}
    }
  }

  function releasePointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === renderer.domElement;
    if (!locked && (GAME.state === 'planet' || GAME.state === 'space') && !GAME.inventoryOpen && GAME.state !== 'transition') {
      GAME.input.mouseDX = 0;
      GAME.input.mouseDY = 0;
      pauseMenu.classList.remove('hidden');
      updateTouchControls();
    }
    if (locked) {
      pauseMenu.classList.add('hidden');
      updateTouchControls();
    }
  });

  document.addEventListener('mousemove', e => {
    if (document.pointerLockElement === renderer.domElement) {
      GAME.input.mouseDX = e.movementX;
      GAME.input.mouseDY = e.movementY;
    }
  });

  document.addEventListener('mousedown', e => {
    if (document.pointerLockElement !== renderer.domElement) return;
    if (e.button === 0) GAME.mouseLeft = true;
    if (e.button === 2) GAME.mouseRight = true;
    audio.ensure();
  });
  document.addEventListener('mouseup', e => {
    if (e.button === 0) GAME.mouseLeft = false;
    if (e.button === 2) GAME.mouseRight = false;
  });
  document.addEventListener('contextmenu', e => e.preventDefault());
  renderer.domElement.addEventListener('click', () => {
    if (isTouchDevice()) return;
    if ((GAME.state === 'planet' || GAME.state === 'space') && !GAME.inventoryOpen && pauseMenu.classList.contains('hidden')) {
      requestPointerLock();
    }
  });

  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    GAME.keys[k] = true;
    if (['tab',' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault();
    if (k === 'tab' && (GAME.state === 'planet' || GAME.state === 'space')) {
      e.preventDefault();
      toggleInventory();
    }
    if (k === 'escape') {
      if (GAME.inventoryOpen) toggleInventory();
      else if (!pauseMenu.classList.contains('hidden')) pauseMenu.classList.add('hidden');
    }
    if (k === 'f' && (GAME.state === 'planet' || GAME.state === 'space')) handleAction();
    if (k === 'q' && (GAME.state === 'planet' || GAME.state === 'space')) handleScan();
    if (k === 'v' && GAME.state === 'planet') {
      GAME.player.thirdPerson = !GAME.player.thirdPerson;
      audio.uiClick();
    }
    if (k >= '1' && k <= '8') {
      GAME.player.selectedSlot = Number(k) - 1;
      renderHotbar();
      audio.uiHover();
    }
  });
  document.addEventListener('keyup', e => {
    GAME.keys[e.key.toLowerCase()] = false;
  });

  // ---------- Mobile touch controls ----------
  let joyTouchId = null;
  let joyOrigin = { x: 0, y: 0 };
  const JOY_RADIUS = 48;

  function updateJoyFromTouch(t) {
    let dx = t.clientX - joyOrigin.x;
    let dy = t.clientY - joyOrigin.y;
    const len = Math.hypot(dx, dy);
    if (len > JOY_RADIUS) {
      dx = dx / len * JOY_RADIUS;
      dy = dy / len * JOY_RADIUS;
    }
    joyThumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const dead = 0.16;
    const nx = dx / JOY_RADIUS;
    const ny = dy / JOY_RADIUS;
    GAME.keys['w'] = ny < -dead;
    GAME.keys['s'] = ny > dead;
    GAME.keys['a'] = nx < -dead;
    GAME.keys['d'] = nx > dead;
  }

  function resetJoystick() {
    joyTouchId = null;
    joyThumb.style.transform = 'translate(-50%, -50%)';
    GAME.keys['w'] = false;
    GAME.keys['s'] = false;
    GAME.keys['a'] = false;
    GAME.keys['d'] = false;
  }

  joyBase.addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    if (joyTouchId !== null) return;
    const t = e.changedTouches[0];
    joyTouchId = t.identifier;
    const rect = joyBase.getBoundingClientRect();
    joyOrigin.x = rect.left + rect.width / 2;
    joyOrigin.y = rect.top + rect.height / 2;
    updateJoyFromTouch(t);
  }, { passive: false });

  joyBase.addEventListener('touchmove', e => {
    e.preventDefault();
    e.stopPropagation();
    if (joyTouchId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier === joyTouchId) {
        updateJoyFromTouch(t);
        break;
      }
    }
  }, { passive: false });

  joyBase.addEventListener('touchend', e => {
    e.preventDefault();
    e.stopPropagation();
    for (const t of e.changedTouches) {
      if (t.identifier === joyTouchId) {
        resetJoystick();
        break;
      }
    }
  }, { passive: false });
  joyBase.addEventListener('touchcancel', e => {
    e.preventDefault();
    e.stopPropagation();
    resetJoystick();
  }, { passive: false });

  // Look area (right side / remaining screen)
  let lookTouchId = null;
  let lastLookX = 0, lastLookY = 0;
  lookArea.addEventListener('touchstart', e => {
    if (lookTouchId !== null) return;
    const t = e.changedTouches[0];
    lookTouchId = t.identifier;
    lastLookX = t.clientX;
    lastLookY = t.clientY;
    e.preventDefault();
  }, { passive: false });

  lookArea.addEventListener('touchmove', e => {
    if (lookTouchId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier === lookTouchId) {
        const dx = t.clientX - lastLookX;
        const dy = t.clientY - lastLookY;
        GAME.input.mouseDX += dx * 0.28;
        GAME.input.mouseDY += dy * 0.28;
        lastLookX = t.clientX;
        lastLookY = t.clientY;
        break;
      }
    }
    e.preventDefault();
  }, { passive: false });

  function endLook(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === lookTouchId) {
        lookTouchId = null;
        break;
      }
    }
  }
  lookArea.addEventListener('touchend', e => { endLook(e); e.preventDefault(); }, { passive: false });
  lookArea.addEventListener('touchcancel', e => { endLook(e); e.preventDefault(); }, { passive: false });

  function bindTouchHold(id, onStart, onEnd) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('pressed');
      audio.ensure();
      onStart();
    }, { passive: false });
    el.addEventListener('touchend', e => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('pressed');
      onEnd();
    }, { passive: false });
    el.addEventListener('touchcancel', e => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('pressed');
      onEnd();
    }, { passive: false });
  }

  function bindTouchTap(id, fn) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('pressed');
      audio.ensure();
    }, { passive: false });
    el.addEventListener('touchend', e => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('pressed');
      fn();
    }, { passive: false });
    el.addEventListener('touchcancel', e => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('pressed');
    }, { passive: false });
  }

  bindTouchHold('btn-touch-mine', () => { GAME.mouseLeft = true; }, () => { GAME.mouseLeft = false; });
  bindTouchHold('btn-touch-place', () => { GAME.mouseRight = true; }, () => { GAME.mouseRight = false; });
  bindTouchHold('btn-touch-jump', () => { GAME.keys[' '] = true; }, () => { GAME.keys[' '] = false; });
  bindTouchHold('btn-touch-sprint', () => { GAME.keys['shift'] = true; }, () => { GAME.keys['shift'] = false; });
  bindTouchTap('btn-touch-interact', () => handleAction());
  bindTouchTap('btn-touch-scan', () => handleScan());
  bindTouchTap('btn-touch-inventory', () => toggleInventory());
  bindTouchTap('btn-touch-camera', () => {
    if (GAME.state === 'planet') {
      GAME.player.thirdPerson = !GAME.player.thirdPerson;
      audio.uiClick();
    }
  });
  bindTouchTap('btn-touch-pause', () => {
    if (GAME.state === 'planet' || GAME.state === 'space') {
      audio.uiClick();
      pauseMenu.classList.remove('hidden');
      updateTouchControls();
    }
  });

  // ---------- Actions ----------
  function handleAction() {
    audio.ensure();
    if (GAME.state === 'space') {
      const nearest = space.nearestPlanet;
      if (nearest) {
        startLanding(nearest.data);
      } else {
        toast('附近没有可降落的天体');
      }
      return;
    }
    if (GAME.state === 'planet') {
      const dist = distancePlayerToShip();
      if (dist < 3.5) {
        const fuel = GAME.inventory.resources.launchFuel || 0;
        if (fuel >= 1) {
          startLaunch();
        } else {
          toast('飞船缺少起飞燃料！按 Tab 合成「起飞燃料」');
          audio.warning();
        }
      } else {
        toast('靠近飞船才能互动');
      }
    }
  }

  function distancePlayerToShip() {
    const p = GAME.player;
    return Math.sqrt((p.x - GAME.shipPosition.x) ** 2 + ((p.y + 1) - GAME.shipPosition.y) ** 2 + (p.z - GAME.shipPosition.z) ** 2);
  }

  function handleScan() {
    audio.ensure();
    audio.scan();
    if (GAME.state === 'space') {
      const nearest = space.nearestPlanet;
      if (nearest) {
        const d = Math.round(space.ship.position.distanceTo(nearest.data.position));
        toast(`📡 ${nearest.data.name} · ${nearest.data.type.name} · ${d}u`, 3000);
      } else {
        toast('📡 未发现附近天体', 1800);
      }
      scanOverlay.classList.remove('hidden');
      setTimeout(() => scanOverlay.classList.add('hidden'), 800);
      return;
    }
    if (GAME.world) {
      const found = findNearbyResources(GAME.player, 10);
      if (found.length) {
        const names = [...new Set(found.map(f => BLOCK_INFO[f.block]?.name || f.block))].slice(0, 4).join('、');
        toast(`📡 扫描到：${names}`, 3000);
      } else {
        toast('📡 附近没有可采集资源', 1800);
      }
      scanOverlay.classList.remove('hidden');
      setTimeout(() => scanOverlay.classList.add('hidden'), 900);
    }
  }

  function findNearbyResources(player, radius) {
    const res = [];
    const cx = Math.floor(player.x), cz = Math.floor(player.z);
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const x = cx + dx, z = cz + dz;
        const h = GAME.world.heightAt(x, z);
        for (let y = Math.max(1, h - 2); y <= h + 2; y++) {
          const b = GAME.world.getBlock(x, y, z);
          if (b && BLOCK_INFO[b] && (BLOCK_INFO[b].resource || BLOCK_INFO[b].type === 'ore' || b === 'crystal' || b === 'sodium' || b === 'log' || b === 'leaves')) {
            res.push({ block: b, x, y, z, dist: Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2 + (z - player.z) ** 2) });
          }
        }
      }
    }
    res.sort((a,b) => a.dist - b.dist);
    return res.slice(0, 12);
  }

  // ---------- Transitions ----------
  function startLaunch() {
    GAME.state = 'transition';
    releasePointerLock();
    transitionLabel.textContent = '启动飞船 · 进入轨道';
    transitionOverlay.classList.remove('hidden');
    transitionOverlay.classList.add('active');
    audio.launch();
    const fuel = GAME.inventory.resources.launchFuel;
    GAME.inventory.resources.launchFuel = Math.max(0, fuel - 1);
    GAME.transitionTimer = 0;
    updateTouchControls();
    const prevState = { type: 'launch' };
    setTimeout(() => finishLaunch(), 1900);
  }

  function finishLaunch() {
    // Hide planet world
    if (GAME.worldGroup) GAME.worldGroup.visible = false;
    space.setVisible(true);
    space.homePlanetIndex = GAME.currentPlanet ? GAME.currentPlanet.index : 0;
    space.resetShip();
    GAME.state = 'space';
    scene.background = new THREE.Color(0x010208);
    scene.fog = null;
    transitionOverlay.classList.add('hidden');
    transitionOverlay.classList.remove('active');
    speedometer.classList.remove('hidden');
    updateLocation(); updateHUD();
    updateTouchControls();
    requestPointerLock();
    toast('已进入轨道。飞向其他星球按 F 降落。');
  }

  function startLanding(planetData) {
    audio.stopEngine();
    GAME.state = 'transition';
    releasePointerLock();
    GAME.currentPlanet = planetData;
    transitionLabel.textContent = '进入大气层 · ' + planetData.name;
    transitionOverlay.classList.remove('hidden');
    transitionOverlay.classList.add('active');
    audio.landing();
    updateTouchControls();
    setTimeout(() => finishLanding(planetData), 2100);
  }

  function finishLanding(planetData) {
    space.setVisible(false);
    if (GAME.worldGroup) GAME.worldGroup.visible = false;
    createWorldForPlanet(planetData);
    const spawn = GAME.world.spawnPosition();
    const p = GAME.player;
    p.x = spawn.x; p.y = spawn.y; p.z = spawn.z;
    p.vx = 0; p.vy = 0; p.vz = 0; p.yaw = Math.PI; p.pitch = -0.35;
    p.oxygen = 100; p.health = 100;
    GAME.state = 'planet';
    camera.position.set(p.x, p.y + 1.6, p.z);
    camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
    spawnPlayerModel();
    renderer.render(scene, camera);
    transitionOverlay.classList.add('hidden');
    transitionOverlay.classList.remove('active');
    speedometer.classList.add('hidden');
    updateLocation(); updateHUD(); renderHotbar();
    updateTouchControls();
    requestPointerLock();
    toast('已降落 ' + planetData.name + ' · ' + planetData.desc, 3500);
  }

  // ---------- Inventory & Crafting ----------
  function toggleInventory() {
    if (GAME.state !== 'planet' && GAME.state !== 'space') return;
    try {
      audio.ensure(); audio.uiClick();
      GAME.inventoryOpen = !GAME.inventoryOpen;
      if (GAME.inventoryOpen) {
        if (!isTouchDevice()) releasePointerLock();
        GAME.input.mouseDX = 0;
        GAME.input.mouseDY = 0;
        renderInventory();
        inventoryModal.classList.remove('hidden');
        updateTouchControls();
      } else {
        inventoryModal.classList.add('hidden');
        updateTouchControls();
        if (!isTouchDevice()) requestPointerLock();
      }
    } catch (err) {
      GAME.inventoryOpen = false;
      inventoryModal.classList.add('hidden');
      showError('背包错误: ' + err.message);
      console.error(err);
    }
  }

  function renderInventory() {
    const inv = GAME.inventory;
    const resEl = $('resource-list');
    resEl.innerHTML = '';
    const list = Object.keys(RESOURCE_DEFS);
    for (const id of list) {
      if (BLOCK_INFO[id] && BLOCK_INFO[id].type === 'block') continue;
      const def = RESOURCE_DEFS[id];
      const count = inv.resources[id] || 0;
      const row = document.createElement('div');
      row.className = 'resource-item';
      row.innerHTML = `<span class="r-icon">${def.icon}</span><span class="r-name">${def.name}</span><span class="r-count">${count}</span>`;
      resEl.appendChild(row);
    }
    // blocks summary
    for (const id of Object.keys(inv.blocks)) {
      const def = BLOCK_INFO[id];
      if (!def) continue;
      const count = inv.blocks[id] || 0;
      const row = document.createElement('div');
      row.className = 'resource-item';
      row.innerHTML = `<span class="r-icon">${blockIcon(id)}</span><span class="r-name">${def.name}</span><span class="r-count">${count}</span>`;
      resEl.appendChild(row);
    }

    const recipeEl = $('recipe-list');
    recipeEl.innerHTML = '';
    for (const recipe of RECIPES) {
      const afford = canAfford(inv, recipe.cost);
      const el = document.createElement('div');
      el.className = 'recipe-item' + (afford ? '' : ' disabled');
      const costStr = Object.entries(recipe.cost).map(([k,v]) => `${RESOURCE_DEFS[k]?.name || k}×${v}`).join(' + ');
      el.innerHTML = `<div class="recipe-name">${recipe.name}</div><div class="recipe-cost">${costStr}</div><div class="recipe-status">${afford ? '可合成' : '材料不足'}</div>`;
      if (afford) {
        el.addEventListener('click', () => {
          craftRecipe(inv, recipe);
          audio.craft();
          toast('合成了 ' + recipe.name);
          renderInventory(); renderHotbar(); updateHUD();
        });
      }
      recipeEl.appendChild(el);
    }
  }

  // ---------- Planet update ----------
  function updatePlanet(dt) {
    const p = GAME.player;
    const world = GAME.world;
    if (!world) return;

    // Input axes from camera yaw
    const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    let moveX = 0, moveZ = 0;
    if (GAME.keys['w']) moveZ -= 1;
    if (GAME.keys['s']) moveZ += 1;
    if (GAME.keys['a']) moveX -= 1;
    if (GAME.keys['d']) moveX += 1;
    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.hypot(moveX, moveZ);
      moveX /= len; moveZ /= len;
    }
    const speed = GAME.keys['shift'] ? 5.4 : 3.6;
    // Camera-relative movement
    let vx = (moveX * cos + moveZ * sin) * speed;
    let vz = (-moveX * sin + moveZ * cos) * speed;
    p.vx = vx;
    p.vz = vz;

    // Gravity & jump / jetpack
    p.vy -= 20 * dt;
    if (GAME.keys[' '] && p.onGround) {
      p.vy = 7.0;
      p.onGround = false;
      audio._blip(300, 0.1, 'sine', 0.08, 120);
    } else if (GAME.keys[' '] && !p.onGround && p.jetpack > 0) {
      p.vy += 14 * dt;
      p.jetpack = Math.max(0, p.jetpack - 18 * dt);
    }
    if (!GAME.keys[' ']) p.jetpack = Math.min(100, p.jetpack + 9 * dt);

    // Apply movement + collision (velocity is per-second; convert to per-frame displacement)
    const disp = { x: p.vx * dt, y: p.vy * dt, z: p.vz * dt };
    const res = moveWithCollision(
      { x: p.x, y: p.y, z: p.z },
      disp,
      0.3, 1.8,
      (bx,by,bz) => world.isSolid(bx,by,bz)
    );
    p.x = res.x; p.y = res.y; p.z = res.z;
    p.vx = disp.x / dt; p.vy = disp.y / dt; p.vz = disp.z / dt;
    p.onGround = false;
    if (Math.abs(p.vy) < 0.0001) p.onGround = true;

    // O2 drain
    p.oxygen -= dt * 0.8;
    if (p.oxygen < 90 && p.oxygenTick <= 0 && (GAME.inventory.resources.oxygen || 0) > 0) {
      GAME.inventory.resources.oxygen -= 1;
      p.oxygen = Math.min(100, p.oxygen + 20);
      p.oxygenTick = 0.6;
      audio.pickup();
    }
    p.oxygenTick -= dt;
    if (p.oxygen <= 0) {
      p.oxygen = 0;
      p.health -= dt * 3;
      if (Math.floor(p.health) % 10 === 0) audio.warning();
    } else {
      p.health = Math.min(100, p.health + dt * 0.6);
    }
    if (p.health <= 0) {
      p.health = 1; p.oxygen = 50;
      toast('生命体征危急！已启动应急维生');
    }

    // Mining cooldown
    p.mineCooldown -= dt;
    const hit = mineRaycast();
    if (hit && GAME.mouseLeft && p.mineCooldown <= 0) {
      p.mineCooldown = 0.14;
      mineBlock(hit);
    }
    if (GAME.mouseRight && p.mineCooldown <= 0) {
      p.mineCooldown = 0.18;
      placeBlock();
    }

    // Update chunks
    world.updateAround(p.x, p.z);

    // Ship interaction hint
    const distShip = distancePlayerToShip();
    if (distShip < 3.5) {
      const fuel = GAME.inventory.resources.launchFuel || 0;
      interactHint.classList.remove('hidden');
      interactHint.textContent = fuel > 0 ? '按 F 登船起飞' : '按 F 查看飞船 · 需要起飞燃料';
    } else {
      interactHint.classList.add('hidden');
    }

    // Player model
    if (GAME.playerModel) {
      GAME.playerModel.position.set(p.x, p.y, p.z);
      GAME.playerModel.rotation.y = p.yaw + Math.PI;
      GAME.playerModel.visible = p.thirdPerson;
    }

    // Camera
    const eyeY = p.y + 1.6;
    if (p.thirdPerson) {
      const dist = 4.5;
      const cx = p.x + Math.sin(p.yaw) * Math.cos(p.pitch) * dist;
      const cy = eyeY + Math.sin(p.pitch) * dist;
      const cz = p.z + Math.cos(p.yaw) * Math.cos(p.pitch) * dist;
      camera.position.lerp(new THREE.Vector3(cx, cy, cz), 1 - Math.pow(0.001, dt));
      camera.lookAt(p.x, eyeY, p.z);
    } else {
      camera.position.set(p.x, eyeY, p.z);
      camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
    }
  }

  function mineRaycast() {
    const eye = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    return GAME.world.raycast(eye, dir, 5.5);
  }

  function mineBlock(hit) {
    const block = hit.block;
    const info = BLOCK_INFO[block];
    if (!info) return;
    audio.mine();
    // Break particles: simple add small debris? skip or use CSS? We'll add a few temporary sprites.
    spawnBreakParticles(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, info.tex);
    GAME.world.setBlockIndex(hit.x, hit.y, hit.z, null);
    audio.breakBlock();
    if (info.resource) {
      addResource(GAME.inventory, info.resource.id, info.resource.amount);
      audio.pickup();
      toast(`获得 ${RESOURCE_DEFS[info.resource.id]?.name} ×${info.resource.amount}`, 1200);
    } else if (info.type === 'block' && block !== 'pad' && block !== 'bedrock') {
      addBlock(GAME.inventory, block, 1);
      audio.pickup();
    }
    updateHUD(); renderHotbar();
  }

  function placeBlock() {
    const hit = mineRaycast();
    if (!hit) return;
    const item = GAME.inventory.hotbar[GAME.player.selectedSlot];
    if (!item || item.type !== 'block') return;
    if ((GAME.inventory.blocks[item.id] || 0) <= 0) return;
    const px = hit.x + hit.nx;
    const py = hit.y + hit.ny;
    const pz = hit.z + hit.nz;
    // Don't place inside player
    const playerBox = { minX: GAME.player.x - 0.3, maxX: GAME.player.x + 0.3, minY: GAME.player.y, maxY: GAME.player.y + 1.8, minZ: GAME.player.z - 0.3, maxZ: GAME.player.z + 0.3 };
    if (px + 1 > playerBox.minX && px < playerBox.maxX && py + 1 > playerBox.minY && py < playerBox.maxY && pz + 1 > playerBox.minZ && pz < playerBox.maxZ) {
      toast('不能放在自己身上');
      return;
    }
    if (GAME.world.getBlock(px, py, pz)) return;
    GAME.world.setBlockIndex(px, py, pz, item.id);
    GAME.inventory.blocks[item.id]--;
    audio.placeBlock();
    updateHUD(); renderHotbar();
  }

  function spawnBreakParticles(x, y, z, texName) {
    const color = texName ? 0xffffff : 0xffffff;
    const points = createParticles(scene, '#' + (texName ? 'ffffff' : 'ffffff'), 12, 0.18);
    points.position.set(x, y, z);
    points.visible = true;
    const geo = points.geometry;
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.array[i * 3] = (Math.random() - 0.5) * 0.8;
      posAttr.array[i * 3 + 1] = Math.random() * 0.8;
      posAttr.array[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }
    posAttr.needsUpdate = true;
    setTimeout(() => {
      scene.remove(points);
      points.geometry.dispose();
      points.material.dispose();
    }, 400);
  }

  // ---------- Space update ----------
  function updateSpace(dt) {
    const p = GAME.player;
    GAME.input.keyW = !!GAME.keys['w'];
    GAME.input.keyS = !!GAME.keys['s'];
    GAME.input.keyA = !!GAME.keys['a'];
    GAME.input.keyD = !!GAME.keys['d'];
    GAME.input.shift = !!GAME.keys['shift'];
    GAME.input.space = !!GAME.keys[' '];
    space.update(dt, GAME.input, camera, audio);

    // Interact hint
    if (space.nearestPlanet) {
      interactHint.classList.remove('hidden');
      interactHint.textContent = '按 F 进入 ' + space.nearestPlanet.data.name;
    } else if (space.nearestAsteroid) {
      interactHint.classList.remove('hidden');
      interactHint.textContent = '左键开采小行星';
    } else {
      interactHint.classList.add('hidden');
    }

    // Asteroid mining
    p.mineCooldown -= dt;
    if (GAME.mouseLeft && p.mineCooldown <= 0 && space.nearestAsteroid) {
      p.mineCooldown = 0.25;
      mineAsteroid(space.nearestAsteroid);
    }
  }

  function mineAsteroid(asteroid) {
    audio.mine();
    const r = Math.random();
    if (r < 0.6) {
      addResource(GAME.inventory, 'ferrite', 3);
      toast('获得 铁氧体粉 ×3', 1200);
    } else if (r < 0.85) {
      addResource(GAME.inventory, 'copper', 2);
      toast('获得 铜 ×2', 1200);
    } else {
      addResource(GAME.inventory, 'dihydrogen', 2);
      toast('获得 二氢 ×2', 1200);
    }
    audio.breakBlock();
    asteroid.mesh.scale.multiplyScalar(0.92);
    updateHUD(); renderHotbar();
  }

  // ---------- Main loop ----------
  function animate(time) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (time - GAME.lastTimestamp) / 1000 || 0.016);
    GAME.lastTimestamp = time;

    if (GAME.state === 'menu') {
      space.group.visible = true;
      if (GAME.worldGroup) GAME.worldGroup.visible = false;
      const t = time * 0.00008;
      camera.position.set(Math.sin(t) * 260, 48 + Math.sin(t * 0.7) * 14, Math.cos(t) * 260);
      camera.lookAt(0, 0, 0);
      for (const pl of space.planets) pl.visual.rotation.y += dt * 0.02;
    }

    const uiPaused = !pauseMenu.classList.contains('hidden') || GAME.inventoryOpen;

    // Ensure correct scene visibility for current state
    if (GAME.state === 'planet' && GAME.worldGroup) {
      if (GAME.worldGroup.parent !== scene) scene.add(GAME.worldGroup);
      GAME.worldGroup.visible = true;
      space.group.visible = false;
      if (GAME.world) scene.background = new THREE.Color(GAME.world.type.sky);
    } else if (GAME.state === 'space') {
      space.group.visible = true;
      if (GAME.worldGroup) GAME.worldGroup.visible = false;
      scene.background = new THREE.Color(0x010208);
    }

    if (GAME.state === 'planet' && !uiPaused) {
      // smooth mouse
      const p = GAME.player;
      const sens = 0.0028;
      p.yaw -= GAME.input.mouseDX * sens;
      p.pitch -= GAME.input.mouseDY * sens;
      p.pitch = clamp(p.pitch, -Math.PI / 2.1, Math.PI / 2.1);
      GAME.input.mouseDX = 0;
      GAME.input.mouseDY = 0;
      updatePlanet(dt);
    }

    if (GAME.state === 'space' && !uiPaused) {
      updateSpace(dt);
      GAME.input.mouseDX = 0;
      GAME.input.mouseDY = 0;
    }

    if (GAME.state === 'transition') {
      GAME.transitionTimer += dt;
      // camera shake or zoom handled by CSS
    }

    updateHUD();
    renderer.render(scene, camera);
  }

  // ---------- Window resize ----------
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- Menu handlers ----------
  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      if (audio.ctx) audio.uiHover();
    });
  });
  $('btn-new-game').addEventListener('click', () => {
    audio.ensure();
    audio.uiClick();
    startNewGame();
  });
  $('btn-controls').addEventListener('click', () => {
    audio.ensure(); audio.uiClick();
    controlsModal.classList.remove('hidden');
  });
  $('btn-close-controls').addEventListener('click', () => {
    audio.uiClick();
    controlsModal.classList.add('hidden');
  });
  $('btn-audio').addEventListener('click', () => {
    audio.ensure();
    audio.setEnabled(!audio.enabled);
    if (audio.enabled) audio.ensure();
    audio.uiClick();
    const btn = $('btn-audio');
    btn.textContent = audio.enabled ? '音效开关：开' : '音效开关：关';
  });
  $('btn-close-inventory').addEventListener('click', () => toggleInventory());
  $('btn-resume').addEventListener('click', () => {
    pauseMenu.classList.add('hidden');
    updateTouchControls();
    requestPointerLock();
    audio.uiClick();
  });
  $('btn-save').addEventListener('click', () => {
    audio.uiClick();
    toast('进度已保存在本局内存中');
  });
  $('btn-main-menu').addEventListener('click', () => {
    audio.stopEngine();
    audio.uiClick();
    pauseMenu.classList.add('hidden');
    inventoryModal.classList.add('hidden');
    GAME.inventoryOpen = false;
    mainMenu.classList.remove('hidden');
    hud.classList.add('hidden');
    if (GAME.worldGroup) GAME.worldGroup.visible = false;
    scene.background = null;
    scene.fog = null;
    space.setVisible(true);
    GAME.state = 'menu';
    updateTouchControls();
    // cleanup world? keep but hidden
  });

  // Prevent default on Tab etc
  window.addEventListener('blur', () => {
    GAME.keys = {};
    GAME.mouseLeft = false;
    GAME.mouseRight = false;
    if (joyTouchId !== null) resetJoystick();
    if (lookTouchId !== null) lookTouchId = null;
    document.querySelectorAll('.tbtn.pressed').forEach(el => el.classList.remove('pressed'));
  });

  // Loader initial
  setTimeout(() => {
    setLoadingProgress(0.6);
    setLoadingText('加载方块材质与音频引擎...');
  }, 50);
  setTimeout(() => {
    setLoadingProgress(1);
    setLoadingText('就绪');
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
      audio.ensure();
    }, 200);
  }, 300);

  updateHUD();
  renderHotbar();
  $('btn-audio').textContent = audio.enabled ? '音效开关：开' : '音效开关：关';
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js?v=17').catch(() => {});
  }
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
})();
