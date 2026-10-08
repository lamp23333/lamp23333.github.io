'use strict';

const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 40;
const CHUNK_RADIUS = 2;
const BLOCK = 1;

const PLANET_TYPES = {
  lush: {
    id: 'lush', name: '繁茂星球', surface: 'grass', sub: 'dirt', stone: 'stone',
    heightBase: 10, heightAmp: 4, trees: 0.06, crystals: 0.01, flowers: 0.02, ores: 0.012,
    sky: 0x8fd8ff, fog: 0xc8ecff, sun: 0xfff3b0, biomeColor: 0x4a8f3c,
    desc: '氧气充足，适合采集碳与钠。'
  },
  desert: {
    id: 'desert', name: '沙漠星球', surface: 'sand', sub: 'sand', stone: 'stone',
    heightBase: 7, heightAmp: 3, trees: 0.01, crystals: 0.02, flowers: 0.03, ores: 0.015,
    sky: 0xffc87a, fog: 0xf2d9a8, sun: 0xfff0c0, biomeColor: 0xd9c07a,
    desc: '高温干旱，仙人掌提供碳，沙中富含铁氧体。'
  },
  frozen: {
    id: 'frozen', name: '冰冻星球', surface: 'snow', sub: 'ice', stone: 'stone',
    heightBase: 8, heightAmp: 4, trees: 0.02, crystals: 0.05, flowers: 0.01, ores: 0.02,
    sky: 0xa8d8ff, fog: 0xd8f0ff, sun: 0xe0f0ff, biomeColor: 0x8fc6f2,
    desc: '极寒环境，冰中蕴含二氢。'
  },
  toxic: {
    id: 'toxic', name: '剧毒星球', surface: 'grass', sub: 'dirt', stone: 'stone',
    heightBase: 9, heightAmp: 4, trees: 0.04, crystals: 0.03, flowers: 0.05, ores: 0.02,
    sky: 0x9fe06a, fog: 0xc6f2a8, sun: 0xf0ffc0, biomeColor: 0x5da84a,
    desc: '大气有毒，但资源丰富。'
  },
  volcanic: {
    id: 'volcanic', name: '火山星球', surface: 'basalt', sub: 'basalt', stone: 'basalt',
    heightBase: 8, heightAmp: 5, trees: 0.0, crystals: 0.04, flowers: 0.0, ores: 0.05,
    sky: 0xff7a4a, fog: 0xf2b08a, sun: 0xffd0a0, biomeColor: 0x9a4a2a,
    desc: '地表是冷却的玄武岩，富含铜矿与星尘。'
  },
  crystal: {
    id: 'crystal', name: '晶体星球', surface: 'snow', sub: 'ice', stone: 'stone',
    heightBase: 9, heightAmp: 5, trees: 0.0, crystals: 0.08, flowers: 0.02, ores: 0.02,
    sky: 0xc8a8ff, fog: 0xe8d8ff, sun: 0xf8f0ff, biomeColor: 0xb388ff,
    desc: '二氢晶体遍布，是飞船燃料的重要来源。'
  },
  jungle: {
    id: 'jungle', name: '丛林星球', surface: 'grass', sub: 'dirt', stone: 'stone',
    heightBase: 11, heightAmp: 5, trees: 0.12, crystals: 0.02, flowers: 0.05, ores: 0.01,
    sky: 0x7fd8a8, fog: 0xb8f0d0, sun: 0xe0ffd0, biomeColor: 0x2f8f4a,
    desc: '茂密的方块丛林，碳、氧与钠花非常丰富。'
  },
  barren: {
    id: 'barren', name: '荒芜星球', surface: 'red_sand', sub: 'red_sand', stone: 'stone',
    heightBase: 6, heightAmp: 3, trees: 0.0, crystals: 0.02, flowers: 0.0, ores: 0.045,
    sky: 0xffb878, fog: 0xf2d0a8, sun: 0xfff0d0, biomeColor: 0xc96a3a,
    desc: '红色荒漠，铁氧体与铜矿裸露在地表。'
  }
};

const PLANET_TYPE_KEYS = Object.keys(PLANET_TYPES);

const BLOCK_COLORS = {
  grass:   0x59a84a,
  dirt:    0x6b4f37,
  stone:   0x8a8a8a,
  sand:    0xd9c07a,
  log:     0x5d432c,
  leaves:  0x3f8f3a,
  snow:    0xeef6ff,
  ice:     0xa8d8ff,
  cactus:  0x3e8e4a,
  sodium:  0xffd166,
  crystal: 0x4cc9f0,
  copper:  0xff9f43,
  stardust:0xb388ff,
  basalt:  0x4a4a52,
  red_sand:0xc96a3a,
  plank:   0xa4763f,
  metal:   0x9aa7b4,
  pad:     0x4b5661,
  glass:   0xb3e5fc,
  bedrock: 0x3c3c3c
};

function blockColor(block, face) {
  let base = BLOCK_COLORS[block] || 0xcccccc;
  if (block === 'grass') {
    if (face === 'top') base = 0x59a84a;
    else if (face === 'bottom') base = 0x6b4f37;
    else base = 0x7daa5a;
  } else if (block === 'log') {
    if (face === 'top' || face === 'bottom') base = 0x8f6a42;
    else base = 0x5d432c;
  } else if (block === 'cactus') {
    if (face === 'top') base = 0x3e8e4a;
    else base = 0x357d40;
  }
  const c = new THREE.Color(base);
  if (face === 'top') c.multiplyScalar(1.12);
  else if (face === 'bottom') c.multiplyScalar(0.72);
  else c.multiplyScalar(0.92);
  return [c.r, c.g, c.b];
}

function hash2(x, z, seed) {
  let h = seed + x * 374761393 + z * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return h >>> 0;
}

function createPlanetData(index, seed) {
  const r = mulberry32(seed + index * 101);
  const typeKey = PLANET_TYPE_KEYS[index % PLANET_TYPE_KEYS.length];
  const type = PLANET_TYPES[typeKey];
  const angle = r() * Math.PI * 2;
  const dist = 320 + r() * 420;
  return {
    index,
    seed: seed + index * 7919,
    type,
    typeKey,
    name: randomName(seed + index * 977, ''),
    position: new THREE.Vector3(Math.cos(angle) * dist, (r() - 0.5) * 160, Math.sin(angle) * dist),
    radius: 58 + r() * 26,
    color: type.biomeColor,
    atmosphere: type.sky,
    desc: type.desc,
    resources: type
  };
}

class PlanetWorld {
  constructor(scene, seed, typeKey, atlas) {
    this.scene = scene;
    this.seed = seed;
    this.type = PLANET_TYPES[typeKey] || PLANET_TYPES.lush;
    this.atlas = atlas;
    this.chunks = new Map();
    this.blockData = new Map();
    this.group = new THREE.Group();
    scene.add(this.group);
    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide
    });
    this.initialized = false;
    this.noise = createNoise2D(seed);
    this.heightCache = new Map();
  }

  heightAt(x, z) {
    const key = x + ':' + z;
    if (this.heightCache.has(key)) return this.heightCache.get(key);
    const type = this.type;
    const n = this.noise.fbm(x * 0.045, z * 0.045, 4);
    const n2 = this.noise.fbm(x * 0.12 + 100, z * 0.12 + 100, 2);
    let h = type.heightBase + n * type.heightAmp + n2 * 0.8;
    // Landing zone flat area
    const dx = x, dz = z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 14) h = 7;
    else if (dist < 20) h = lerp(h, 7, smoothstep(14, 20, dist));
    h = Math.floor(h);
    if (h < 2) h = 2;
    if (h > WORLD_HEIGHT - 6) h = WORLD_HEIGHT - 6;
    this.heightCache.set(key, h);
    return h;
  }

  blockIndexAt(x, y, z) {
    if (y < 0 || y >= WORLD_HEIGHT) return null;
    return this.blockData.get((x & 15) + ',' + y + ',' + (z & 15) + ',' + Math.floor(x / CHUNK_SIZE) + ',' + Math.floor(z / CHUNK_SIZE)) || null;
  }

  setBlockIndex(x, y, z, blockId) {
    if (y < 0 || y >= WORLD_HEIGHT) return;
    const cx = Math.floor(x / CHUNK_SIZE), cz = Math.floor(z / CHUNK_SIZE);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const key = lx + ',' + y + ',' + lz + ',' + cx + ',' + cz;
    if (blockId == null || blockId === 'air') {
      this.blockData.delete(key);
    } else {
      this.blockData.set(key, blockId);
    }
    this.requestChunkUpdate(cx, cz);
  }

  getBlock(x, y, z) {
    if (y < 0 || y >= WORLD_HEIGHT) return null;
    return this.blockIndexAt(Math.floor(x), Math.floor(y), Math.floor(z));
  }

  isSolid(x, y, z) {
    const b = this.getBlock(x, y, z);
    if (!b) return false;
    return BLOCK_SOLID.has(b);
  }

  isOpaque(b) {
    if (!b) return false;
    if (b === 'glass' || b === 'leaves') return false;
    return true;
  }

  generateChunkData(cx, cz) {
    const data = new Map();
    const baseX = cx * CHUNK_SIZE, baseZ = cz * CHUNK_SIZE;
    const type = this.type;
    const rng = mulberry32(hash2(cx, cz, this.seed));
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = baseX + lx, wz = baseZ + lz;
        const h = this.heightAt(wx, wz);
        const dist = Math.sqrt(wx * wx + wz * wz);
        for (let y = 0; y <= h; y++) {
          let block = null;
          if (y === 0) block = 'bedrock';
          else if (y === h) {
            block = type.surface;
            if (type.surface === 'snow' && h > 12) block = 'snow';
            else if (type.surface === 'sand' && h < 3) block = 'stone';
            if (dist < 8) block = 'pad';
          } else if (y > h - 3) block = type.sub;
          else block = type.stone;
          if (block) data.set(lx + ',' + y + ',' + lz, block);
        }
        // decorations
        if (dist < 8) {
          // keep landing pad clear
        } else {
          // trees
          const r = rng();
          if ((type.surface === 'grass' || type.surface === 'snow') && r < type.trees && h < WORLD_HEIGHT - 8 && h > 5) {
            const treeH = 3 + Math.floor(rng() * 3);
            const topY = h + treeH;
            for (let i = 0; i < treeH; i++) data.set(lx + ',' + (h + 1 + i) + ',' + lz, 'log');
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                for (let dz = -2; dz <= 2; dz++) {
                  if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && rng() < 0.45) continue;
                  if (dx === 0 && dz === 0 && dy <= 0) continue;
                  const lx2 = lx + dx, lz2 = lz + dz;
                  const ly = topY + dy;
                  if (lx2 >= 0 && lx2 < CHUNK_SIZE && lz2 >= 0 && lz2 < CHUNK_SIZE && ly >= 0 && ly < WORLD_HEIGHT) {
                    data.set(lx2 + ',' + ly + ',' + lz2, 'leaves');
                  }
                }
              }
            }
          }
          // flowers / crystals / ores
          if (rng() < type.flowers) data.set(lx + ',' + (h + 1) + ',' + lz, 'sodium');
          if (rng() < type.crystals) data.set(lx + ',' + (h + 1) + ',' + lz, 'crystal');
          if (rng() < type.ores) {
            const oy = 2 + Math.floor(rng() * (h - 2));
            data.set(lx + ',' + oy + ',' + lz, rng() < 0.6 ? 'copper' : 'stardust');
          }
          if (type.surface === 'sand' && rng() < 0.04 && h > 5) {
            data.set(lx + ',' + (h + 1) + ',' + lz, 'cactus');
            data.set(lx + ',' + (h + 2) + ',' + lz, 'cactus');
          }
        }
      }
    }
    // merge into global blockData
    for (const [key, block] of data) {
      const parts = key.split(',');
      const lx = Number(parts[0]), y = Number(parts[1]), lz = Number(parts[2]);
      this.blockData.set(lx + ',' + y + ',' + lz + ',' + cx + ',' + cz, block);
    }
  }

  getChunkData(cx, cz) {
    // Ensure data exists by generating (could cache but okay)
    if (!this.chunkDataGenerated) this.chunkDataGenerated = new Set();
    const ck = cx + ',' + cz;
    if (!this.chunkDataGenerated.has(ck)) {
      this.generateChunkData(cx, cz);
      this.chunkDataGenerated.add(ck);
    }
    return this.blockData;
  }

  ensureChunk(cx, cz) {
    if (this.chunks.has(cx + ',' + cz)) return;
    this.getChunkData(cx, cz);
    this.buildChunkMesh(cx, cz);
  }

  requestChunkUpdate(cx, cz) {
    if (this.chunks.has(cx + ',' + cz)) {
      this.buildChunkMesh(cx, cz);
    }
  }

  buildChunkMesh(cx, cz) {
    const key = cx + ',' + cz;
    if (this.chunks.has(key)) {
      const old = this.chunks.get(key);
      if (old.mesh) {
        this.group.remove(old.mesh);
        old.mesh.geometry.dispose();
      }
    }
    const positions = [];
    const normals = [];
    const colors = [];
    const uvs = [];
    const indices = [];
    const baseX = cx * CHUNK_SIZE, baseZ = cz * CHUNK_SIZE;
    const atlas = this.atlas;

    const dirs = [
      { nx: 0, ny: 1, nz: 0, corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], face: 'top' },
      { nx: 0, ny: -1, nz: 0, corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], face: 'bottom' },
      { nx: -1, ny: 0, nz: 0, corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], face: 'left' },
      { nx: 1, ny: 0, nz: 0, corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], face: 'right' },
      { nx: 0, ny: 0, nz: -1, corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]], face: 'front' },
      { nx: 0, ny: 0, nz: 1, corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], face: 'back' }
    ];

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let ly = 0; ly < WORLD_HEIGHT; ly++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          const block = this.blockData.get(lx + ',' + ly + ',' + lz + ',' + cx + ',' + cz);
          if (!block) continue;
          const wx = baseX + lx, wz = baseZ + lz;
          for (const d of dirs) {
            const nx = wx + d.nx, ny = ly + d.ny, nz = wz + d.nz;
            const neighbor = this.getBlock(nx, ny, nz);
            if (this.isOpaque(neighbor)) continue;
            let tileName;
            if (block === 'grass') {
              if (d.face === 'top') tileName = 'grass_top';
              else if (d.face === 'bottom') tileName = 'dirt';
              else tileName = 'grass_side';
            } else if (block === 'log') {
              tileName = d.face === 'top' || d.face === 'bottom' ? 'log_top' : 'log_side';
            } else if (block === 'cactus') {
              tileName = d.face === 'top' ? 'cactus_top' : 'cactus';
            } else {
              tileName = BLOCK_INFO[block] ? BLOCK_INFO[block].tex : 'stone';
            }
            const tile = atlas.tileFor(tileName);
            const uv = atlas.tileUv(tile, d.face === 'left' || d.face === 'back');
            const base = positions.length / 3;
            const col = blockColor(block, d.face);
            for (const c of d.corners) {
              positions.push(wx + c[0], ly + c[1], wz + c[2]);
              normals.push(d.nx, d.ny, d.nz);
              colors.push(col[0], col[1], col[2]);
            }
            // uv order from tileUv: 4 uv pairs
            for (let i = 0; i < 4; i++) {
              uvs.push(uv[i * 2], uv[i * 2 + 1]);
            }
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
          }
        }
      }
    }

    let mesh = null;
    if (positions.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeBoundingSphere();
      mesh = new THREE.Mesh(geometry, this.material);
      mesh.matrixAutoUpdate = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.chunks.set(key, { mesh, cx, cz });
  }

  updateAround(px, pz) {
    const ccx = Math.floor(px / CHUNK_SIZE), ccz = Math.floor(pz / CHUNK_SIZE);
    const needed = new Set();
    for (let dx = -CHUNK_RADIUS; dx <= CHUNK_RADIUS; dx++) {
      for (let dz = -CHUNK_RADIUS; dz <= CHUNK_RADIUS; dz++) {
        const cx = ccx + dx, cz = ccz + dz;
        needed.add(cx + ',' + cz);
        this.ensureChunk(cx, cz);
      }
    }
    for (const key of this.chunks.keys()) {
      if (!needed.has(key)) {
        const chunk = this.chunks.get(key);
        if (chunk.mesh) this.group.remove(chunk.mesh);
        if (chunk.mesh && chunk.mesh.geometry) chunk.mesh.geometry.dispose();
        this.chunks.delete(key);
      }
    }
  }

  // DDA voxel raycast
  raycast(origin, dir, maxDist = 6) {
    let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
    const stepX = dir.x > 0 ? 1 : -1;
    const stepY = dir.y > 0 ? 1 : -1;
    const stepZ = dir.z > 0 ? 1 : -1;
    const tDeltaX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity;
    const tDeltaY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity;
    const tDeltaZ = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity;
    let tMaxX = dir.x !== 0 ? ((stepX > 0 ? x + 1 - origin.x : origin.x - x) * tDeltaX) : Infinity;
    let tMaxY = dir.y !== 0 ? ((stepY > 0 ? y + 1 - origin.y : origin.y - y) * tDeltaY) : Infinity;
    let tMaxZ = dir.z !== 0 ? ((stepZ > 0 ? z + 1 - origin.z : origin.z - z) * tDeltaZ) : Infinity;
    let nx = 0, ny = 0, nz = 0;
    let t = 0;
    while (t <= maxDist) {
      const block = this.getBlock(x, y, z);
      if (block) return { x, y, z, nx, ny, nz, block, t };
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        x += stepX; t = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0;
      } else if (tMaxY < tMaxZ) {
        y += stepY; t = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0;
      } else {
        z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ;
      }
    }
    return null;
  }

  spawnPosition() {
    return { x: 0.5, y: this.heightAt(0, 0) + 1.2, z: 0.5 };
  }

  dispose() {
    for (const chunk of this.chunks.values()) {
      if (chunk.mesh) this.group.remove(chunk.mesh);
      if (chunk.mesh && chunk.mesh.geometry) chunk.mesh.geometry.dispose();
    }
    this.chunks.clear();
    this.group.removeFromParent();
    this.material.dispose();
  }
}
