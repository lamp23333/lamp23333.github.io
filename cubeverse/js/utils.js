'use strict';

// Deterministic PRNG
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Simple 2D value noise with smooth interpolation
function createNoise2D(seed) {
  const rand = mulberry32(seed);
  const size = 256;
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rand() * 2 - 1;
  const wrap = size;
  function at(x, y) {
    x = ((x % wrap) + wrap) % wrap;
    y = ((y % wrap) + wrap) % wrap;
    return grid[(y | 0) * size + (x | 0)];
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function sample(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = at(xi, yi), b = at(xi + 1, yi);
    const c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    const u = smooth(xf), v = smooth(yf);
    return (a * (1-u) + b * u) * (1-v) + (c * (1-u) + d * u) * v;
  }
  function fbm(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * sample(x * freq, y * freq);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }
  return { sample, fbm };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

function vec3Equal(a, b) { return a.x === b.x && a.y === b.y && a.z === b.z; }
function keyFromPos(x, y, z) { return x + ',' + y + ',' + z; }

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return Math.floor(n).toString();
}

function randomName(seed, prefix = '') {
  const r = mulberry32(seed);
  const syl = ['ra','ve','no','ku','xan','or','eth','zy','lu','mar','tir','qua','hel','dru','vak','sol','nyx','aur','bri','kas'];
  let name = prefix;
  for (let i = 0; i < 3; i++) name += syl[Math.floor(r() * syl.length)];
  const suffixes = [' Prime', ' Minor', ' X', '', ' IV', ' Beta'];
  name += suffixes[Math.floor(r() * suffixes.length)];
  return name;
}

// ---------- Resources & inventory ----------
const RESOURCE_DEFS = {
  carbon:       { name: '碳',       icon: '⬛', color: '#39424e' },
  ferrite:      { name: '铁氧体粉', icon: '🧱', color: '#a08b7a' },
  sodium:       { name: '钠',       icon: '⚡', color: '#ffd166' },
  dihydrogen:   { name: '二氢',     icon: '💎', color: '#4cc9f0' },
  oxygen:       { name: '氧',       icon: '💨', color: '#7fd8ff' },
  metalPlate:   { name: '金属板',   icon: '🔩', color: '#c0c0c0' },
  launchFuel:   { name: '起飞燃料', icon: '⛽', color: '#ff9f43' },
  warpCell:     { name: '脉冲电池', icon: '🌀', color: '#b388ff' },
  glass:        { name: '玻璃',     icon: '🪟', color: '#b3e5fc' },
  starDust:     { name: '星尘',     icon: '✨', color: '#fff3b0' },
  copper:       { name: '铜',       icon: '🟠', color: '#ff9f43' }
};

const RECIPES = [
  { id: 'metalPlate', name: '金属板', out: { metalPlate: 1 }, cost: { ferrite: 50 }, desc: '基础飞船部件' },
  { id: 'launchFuel', name: '起飞燃料', out: { launchFuel: 1 }, cost: { dihydrogen: 40, metalPlate: 1 }, desc: '飞船起飞必需' },
  { id: 'glass', name: '玻璃', out: { glass: 1 }, cost: { ferrite: 20, oxygen: 10 }, desc: '精炼透明材料' },
  { id: 'warpCell', name: '脉冲电池', out: { warpCell: 1 }, cost: { dihydrogen: 50, copper: 20, starDust: 5 }, desc: '用于空间脉冲跳跃' }
];

const BLOCK_INFO = {
  grass:    { name: '草方块', type: 'block', tex: 'grass', resource: null },
  dirt:     { name: '泥土',   type: 'block', tex: 'dirt', resource: null },
  stone:    { name: '石头',   type: 'block', tex: 'stone', resource: { id: 'ferrite', amount: 1 } },
  sand:     { name: '沙子',   type: 'block', tex: 'sand', resource: { id: 'ferrite', amount: 1 } },
  log:      { name: '原木',   type: 'block', tex: 'log', resource: { id: 'carbon', amount: 2 } },
  leaves:   { name: '树叶',   type: 'block', tex: 'leaves', resource: { id: 'oxygen', amount: 1 } },
  snow:     { name: '雪块',   type: 'block', tex: 'snow', resource: null },
  ice:      { name: '冰',     type: 'block', tex: 'ice', resource: { id: 'dihydrogen', amount: 2 } },
  cactus:   { name: '仙人掌', type: 'block', tex: 'cactus', resource: { id: 'carbon', amount: 1 } },
  sodium:   { name: '钠花',   type: 'plant', tex: 'sodium_flower', resource: { id: 'sodium', amount: 2 } },
  crystal:  { name: '二氢晶体', type: 'ore', tex: 'crystal_blue', resource: { id: 'dihydrogen', amount: 3 } },
  copper:   { name: '铜矿',   type: 'ore', tex: 'copper', resource: { id: 'copper', amount: 2 } },
  stardust: { name: '星尘矿', type: 'ore', tex: 'stardust', resource: { id: 'starDust', amount: 1 } },
  basalt:   { name: '玄武岩', type: 'block', tex: 'stone', resource: { id: 'copper', amount: 1 } },
  red_sand: { name: '红沙',   type: 'block', tex: 'sand', resource: { id: 'ferrite', amount: 1 } },
  plank:    { name: '木板',   type: 'block', tex: 'plank', resource: null },
  metal:    { name: '合金板', type: 'block', tex: 'metal', resource: null },
  pad:      { name: '着陆台', type: 'block', tex: 'pad', resource: null }
};

const BLOCK_IDS = Object.keys(BLOCK_INFO);
const BLOCK_INDEX = {};
BLOCK_IDS.forEach((id, i) => BLOCK_INDEX[id] = i);

const BLOCK_SOLID = new Set(['grass','dirt','stone','sand','log','leaves','snow','ice','cactus','plank','metal','pad','glass','copper','stardust','crystal','basalt','red_sand']);
const BLOCK_REPLACEABLE = new Set([null, 'air']);
const HOTBAR_ITEMS = [
  { type: 'block', id: 'plank', count: 0 },
  { type: 'block', id: 'metal', count: 0 },
  { type: 'block', id: 'stone', count: 0 },
  { type: 'block', id: 'sand', count: 0 },
  { type: 'block', id: 'glass', count: 0 },
  { type: 'resource', id: 'launchFuel', count: 0 },
  { type: 'resource', id: 'metalPlate', count: 0 },
  { type: 'resource', id: 'warpCell', count: 0 }
];

function makeInventory() {
  return {
    resources: { carbon: 0, ferrite: 0, sodium: 0, dihydrogen: 0, oxygen: 0, metalPlate: 0, launchFuel: 0, warpCell: 0, glass: 0, starDust: 0, copper: 0 },
    blocks: { plank: 0, metal: 0, stone: 0, sand: 0, glass: 0 },
    hotbar: HOTBAR_ITEMS.map(x => ({ ...x }))
  };
}

function addResource(inv, id, amount) {
  if (!(id in inv.resources)) inv.resources[id] = 0;
  inv.resources[id] += amount;
}
function addBlock(inv, id, amount) {
  if (!(id in inv.blocks)) inv.blocks[id] = 0;
  inv.blocks[id] += amount;
}
function addItem(inv, item) {
  if (item.type === 'block') addBlock(inv, item.id, item.count);
  else addResource(inv, item.id, item.count);
}
function countItem(inv, type, id) {
  return type === 'block' ? (inv.blocks[id] || 0) : (inv.resources[id] || 0);
}
function canAfford(inv, cost) {
  for (const k in cost) if ((inv.resources[k] || 0) < cost[k]) return false;
  return true;
}
function spend(inv, cost) {
  for (const k in cost) inv.resources[k] -= cost[k];
}
function craftRecipe(inv, recipe) {
  if (!canAfford(inv, recipe.cost)) return false;
  spend(inv, recipe.cost);
  for (const k in recipe.out) {
    if (BLOCK_INFO[k] && BLOCK_INFO[k].type === 'block') addBlock(inv, k, recipe.out[k]);
    else if (k in inv.resources) addResource(inv, k, recipe.out[k]);
    else if (k in inv.blocks) addBlock(inv, k, recipe.out[k]);
  }
  return true;
}

// Simple AABB collision helper (substepped for stability)
function moveWithCollision(position, velocity, halfWidth, height, isBlockSolid) {
  const pos = { x: position.x, y: position.y, z: position.z };

  function collides() {
    const minX = Math.floor(pos.x - halfWidth), maxX = Math.floor(pos.x + halfWidth);
    const minY = Math.floor(pos.y), maxY = Math.floor(pos.y + height - 0.001);
    const minZ = Math.floor(pos.z - halfWidth), maxZ = Math.floor(pos.z + halfWidth);
    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          if (isBlockSolid(bx, by, bz)) return true;
        }
      }
    }
    return false;
  }

  // Cap the per-substep movement to avoid tunneling through thin walls/floors.
  const maxStep = 0.2;
  const steps = Math.max(1, Math.ceil(Math.max(
    Math.abs(velocity.x), Math.abs(velocity.y), Math.abs(velocity.z)
  ) / maxStep));
  const stepX = velocity.x / steps;
  const stepY = velocity.y / steps;
  const stepZ = velocity.z / steps;

  for (let i = 0; i < steps; i++) {
    // Y axis first: landing and head bumps are more important.
    pos.y += stepY;
    if (stepY < 0 && collides()) {
      pos.y = Math.floor(pos.y) + 1;
      if (collides()) pos.y += 1;
      velocity.y = 0;
    } else if (stepY > 0 && collides()) {
      pos.y = Math.floor(pos.y + height) - height;
      if (collides()) pos.y -= 1;
      velocity.y = 0;
    }

    // X axis
    pos.x += stepX;
    if (stepX > 0 && collides()) {
      pos.x = Math.floor(pos.x + halfWidth) - halfWidth - 0.001;
      velocity.x = 0;
    } else if (stepX < 0 && collides()) {
      pos.x = Math.floor(pos.x - halfWidth) + 1 + halfWidth + 0.001;
      velocity.x = 0;
    }

    // Z axis
    pos.z += stepZ;
    if (stepZ > 0 && collides()) {
      pos.z = Math.floor(pos.z + halfWidth) - halfWidth - 0.001;
      velocity.z = 0;
    } else if (stepZ < 0 && collides()) {
      pos.z = Math.floor(pos.z - halfWidth) + 1 + halfWidth + 0.001;
      velocity.z = 0;
    }
  }

  return { x: pos.x, y: pos.y, z: pos.z };
}
