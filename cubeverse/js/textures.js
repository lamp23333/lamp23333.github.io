'use strict';

const TILE = 16;
const ATLAS_COLS = 8;

function createTextureAtlas() {
  const cols = ATLAS_COLS;
  const rows = 6;
  const canvas = document.createElement('canvas');
  canvas.width = cols * TILE;
  canvas.height = rows * TILE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const atlas = {};

  function tileIndex(name) {
    if (!(name in atlas)) throw new Error('No tile ' + name);
    return atlas[name];
  }

  function drawTile(col, row, draw) {
    const idx = row * cols + col;
    const x = col * TILE, y = row * TILE;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, TILE, TILE);
    ctx.clip();
    draw(ctx, x, y);
    ctx.restore();
    atlas[idx] = idx;
  }

  function makeNoise(ctx, x, y, base, colors, density = 0.5) {
    ctx.fillStyle = base;
    ctx.fillRect(x, y, TILE, TILE);
    for (let px = 0; px < TILE; px++) {
      for (let py = 0; py < TILE; py++) {
        if (Math.random() < density) {
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          ctx.fillRect(x + px, y + py, 1, 1);
        }
      }
    }
  }

  // 0 grass top
  drawTile(0, 0, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#4a8f3c', ['#59a84a', '#3e7a32', '#6cbd58', '#2f6628'], 0.6);
  });
  // 1 grass side
  drawTile(1, 0, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#6b4f37', ['#5d4430', '#7a5b40', '#4e3826'], 0.55);
    ctx.fillStyle = '#4a8f3c';
    ctx.fillRect(x, y, TILE, 3);
    for (let i = 0; i < TILE; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? '#59a84a' : '#3e7a32';
      ctx.fillRect(x + i, y + 2 + (Math.random() < 0.5 ? 0 : 1), 1, 1);
    }
  });
  // 2 dirt
  drawTile(2, 0, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#6b4f37', ['#5d4430', '#7a5b40', '#4e3826', '#8a6a4d'], 0.6);
  });
  // 3 stone
  drawTile(3, 0, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#8a8a8a', ['#7a7a7a', '#9a9a9a', '#6f6f6f', '#a8a8a8'], 0.55);
  });
  // 4 sand
  drawTile(4, 0, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#d9c07a', ['#c8ae68', '#e6d08b', '#b89e5e'], 0.5);
  });
  // 5 log side
  drawTile(5, 0, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#5d432c', ['#4f3724', '#6d4f34', '#573e29'], 0.6);
    ctx.fillStyle = '#3a2719';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 2, y + i * 6, 12, 1);
  });
  // 6 log top
  drawTile(6, 0, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#8f6a42', ['#7c5a36', '#a17a4c', '#6e4e30'], 0.5);
    ctx.fillStyle = '#5d432c';
    ctx.beginPath(); ctx.arc(x + 8, y + 8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2719'; ctx.lineWidth = 1; ctx.strokeRect(x + 5, y + 5, 6, 6);
  });
  // 7 leaves
  drawTile(7, 0, (ctx, x, y) => {
    ctx.clearRect(x, y, TILE, TILE);
    for (let px = 0; px < TILE; px++) {
      for (let py = 0; py < TILE; py++) {
        if (Math.random() < 0.82) {
          ctx.fillStyle = Math.random() < 0.5 ? '#3f8f3a' : '#2f7a2c';
          ctx.fillRect(x + px, y + py, 1, 1);
        }
      }
    }
    // occasional highlights
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = '#67c554';
      ctx.fillRect(x + Math.floor(Math.random() * TILE), y + Math.floor(Math.random() * TILE), 1, 1);
    }
  });
  // 8 plank
  drawTile(0, 1, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#a4763f', ['#946a35', '#b6824b', '#8a5f2f'], 0.4);
    ctx.strokeStyle = '#5d3f20';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(x, y + i * 4); ctx.lineTo(x + TILE, y + i * 4); ctx.stroke();
    }
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  });
  // 9 metal
  drawTile(1, 1, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#9aa7b4', ['#8896a4', '#aebcc9', '#7d8b99'], 0.4);
    ctx.fillStyle = '#5c6b78';
    for (let i = 0; i < 4; i++) ctx.fillRect(x, y + i * 4, TILE, 1);
  });
  // 10 pad
  drawTile(2, 1, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#4b5661', ['#3f4954', '#58636e'], 0.5);
    ctx.fillStyle = '#7fffd4';
    ctx.fillRect(x + 4, y + 4, 8, 8);
    ctx.fillStyle = '#26323c';
    ctx.fillRect(x + 7, y + 7, 2, 2);
  });
  // 11 snow
  drawTile(3, 1, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#eef6ff', ['#dfeaf8', '#ffffff', '#cfe0f2'], 0.45);
  });
  // 12 ice
  drawTile(4, 1, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#a8d8ff', ['#8fc6f2', '#c2e7ff', '#7fb8ec'], 0.35);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(x, y + Math.random() * TILE); ctx.lineTo(x + TILE, y + Math.random() * TILE); ctx.stroke();
    }
  });
  // 13 cactus side
  drawTile(5, 1, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#3e8e4a', ['#357d40', '#4aa356', '#2e7038'], 0.4);
    ctx.strokeStyle = '#1f5428'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x + 3, y + i * 5); ctx.lineTo(x + TILE - 3, y + i * 5); ctx.stroke();
    }
  });
  // 14 cactus top
  drawTile(6, 1, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#3e8e4a', ['#357d40', '#4aa356'], 0.4);
    ctx.fillStyle = '#ff5c7a';
    ctx.fillRect(x + 4, y + 4, 8, 8);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x + 6, y + 6, 4, 4);
  });
  // 15 sodium flower
  drawTile(7, 1, (ctx, x, y) => {
    ctx.clearRect(x, y, TILE, TILE);
    ctx.fillStyle = '#4a8f3c';
    ctx.fillRect(x + 7, y + 10, 2, 6);
    for (let i = 0; i < 5; i++) {
      const ang = i / 5 * Math.PI * 2;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(x + 8 + Math.cos(ang) * 5, y + 7 + Math.sin(ang) * 5, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(x + 8, y + 7, 2, 0, Math.PI * 2); ctx.fill();
  });
  // 16 crystal blue
  drawTile(0, 2, (ctx, x, y) => {
    ctx.clearRect(x, y, TILE, TILE);
    ctx.fillStyle = 'rgba(80,220,255,0.9)';
    for (let i = 0; i < 5; i++) {
      const sx = x + 2 + Math.floor(Math.random() * 10);
      const sy = y + 2 + Math.floor(Math.random() * 8);
      ctx.beginPath();
      ctx.moveTo(sx, sy + 10);
      ctx.lineTo(sx + 5, sy + 2);
      ctx.lineTo(sx + 10, sy + 10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(sx + 2, sy + 3, 2, 1);
      ctx.fillStyle = 'rgba(80,220,255,0.9)';
    }
  });
  // 17 copper
  drawTile(1, 2, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#6f6658', ['#5e564a', '#827766'], 0.5);
    ctx.fillStyle = '#ff9f43';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 2 + Math.floor(Math.random() * 10), y + 2 + Math.floor(Math.random() * 10), 3, 3);
    }
  });
  // 18 stardust
  drawTile(2, 2, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#2b2f4a', ['#232740', '#343a5a'], 0.5);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? '#fff3b0' : '#b388ff';
      ctx.fillRect(x + Math.floor(Math.random() * TILE), y + Math.floor(Math.random() * TILE), 1, 1);
    }
  });
  // 19 glass
  drawTile(3, 2, (ctx, x, y) => {
    ctx.clearRect(x, y, TILE, TILE);
    ctx.fillStyle = 'rgba(180,230,255,0.45)';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + 8, y + TILE); ctx.stroke();
  });
  // 20 bedrock
  drawTile(4, 2, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#3c3c3c', ['#2f2f2f', '#4a4a4a'], 0.65);
  });
  // 21 stone brick
  drawTile(5, 2, (ctx, x, y) => {
    makeNoise(ctx, x, y, '#7e7e7e', ['#707070', '#8c8c8c'], 0.35);
    ctx.strokeStyle = '#565656';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x + TILE, y + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + 8, y + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 3, y + 8); ctx.lineTo(x + 3, y + TILE); ctx.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  function tileUv(index, flipX = false) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const u0 = col / cols, v1 = 1 - row / rows;
    const u1 = (col + 1) / cols, v0 = 1 - (row + 1) / rows;
    return flipX ? [u1, v0, u1, v1, u0, v1, u0, v0] : [u0, v0, u0, v1, u1, v1, u1, v0];
  }

  function tileFor(texName) {
    const map = {
      grass_top: 0, grass_side: 1, dirt: 2, stone: 3, sand: 4, log_side: 5, log_top: 6,
      leaves: 7, plank: 8, metal: 9, pad: 10, snow: 11, ice: 12, cactus: 13, cactus_top: 14,
      sodium_flower: 15, crystal_blue: 16, copper: 17, stardust: 18, glass: 19, bedrock: 20, stone_brick: 21
    };
    return map[texName];
  }

  return { canvas, texture, tileUv, tileFor, atlas, rows, cols };
}
