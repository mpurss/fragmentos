/* =====================================================================
   7. MUNDO 2 — MUSEO: obras que cobran vida, ROMPECABEZAS 3D real,
      botón rojo físico, láseres y Fragmento 2 (sin caja)
   ===================================================================== */
const PZ = { cols: 3, rows: 2, cell: 0.26 };

/** contorno de una pieza de rompecabezas con pestañas (+1) y huecos (-1) */
function jigsawShape(c, r, tabs) {
  const s = PZ.cell, x0 = c * s, y0 = r * s;
  const corners = [[x0, y0], [x0 + s, y0], [x0 + s, y0 + s], [x0, y0 + s]];
  const shape = new THREE.Shape(); shape.moveTo(x0, y0);
  for (let e = 0; e < 4; e++) {
    const [ax, ay] = corners[e], [bx, by] = corners[(e + 1) % 4]; const dir = tabs[e];
    const ux = (bx - ax) / s, uy = (by - ay) / s, nx = uy, ny = -ux; // normal hacia afuera (recorrido antihorario)
    const P = (t, o) => [ax + ux * s * t + nx * s * o * dir, ay + uy * s * t + ny * s * o * dir];
    if (dir) {
      const pts = [P(0.36, 0), P(0.4, 0.05), P(0.38, 0.13)];
      for (let k = 0; k <= 8; k++) { const a = Math.PI + 0.55 - (k / 8) * (Math.PI + 1.1); pts.push(P(0.5 + Math.cos(a) * 0.13, 0.2 - Math.sin(a) * 0.12)); }
      pts.push(P(0.62, 0.13), P(0.6, 0.05), P(0.64, 0));
      pts.forEach(([x, y]) => shape.lineTo(x, y));
    }
    shape.lineTo(bx, by);
  }
  return shape;
}
function puzzleTexture() {
  return canvasTex(768, 512, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.6); sky.addColorStop(0, '#1b1446'); sky.addColorStop(0.55, '#7b2f6b'); sky.addColorStop(1, '#ff9a4a'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(560, 150, 70, 0, TAU); g.fill();
    for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.8 + ')'; g.fillRect(Math.random() * w, Math.random() * h * 0.35, 2, 2); }
    const mount = (col, base, amp, seed) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 32) g.lineTo(x, base - Math.abs(Math.sin(x * 0.009 + seed)) * amp - Math.sin(x * 0.03 + seed) * amp * 0.2); g.lineTo(w, h); g.fill(); };
    mount('#4a2160', 300, 130, 1); mount('#2a1240', 340, 90, 4);
    const lake = g.createLinearGradient(0, 340, 0, h); lake.addColorStop(0, '#0e2a5e'); lake.addColorStop(1, '#03122b'); g.fillStyle = lake; g.fillRect(0, 340, w, h - 340);
    g.strokeStyle = '#3aa0ff'; g.lineWidth = 16; g.shadowColor = '#3aa0ff'; g.shadowBlur = 30; g.beginPath(); g.ellipse(230, 250, 85, 120, 0, 0, TAU); g.stroke(); g.shadowBlur = 0;
    const pg = g.createRadialGradient(230, 250, 5, 230, 250, 110); pg.addColorStop(0, '#dff3ff'); pg.addColorStop(1, '#0b3b8c'); g.fillStyle = pg; g.beginPath(); g.ellipse(230, 250, 76, 110, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffe2a0aa'; for (let i = 0; i < 12; i++) g.fillRect(500 + Math.random() * 120, 360 + i * 12, 60 - i * 4, 3);
    g.fillStyle = '#fff'; g.font = 'bold 30px Unbounded, sans-serif'; g.fillText('MVSEVM', 470, 470);
    g.strokeStyle = '#c9a24a'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
  });
}

class MuseumWorld extends BaseWorld {
  build() {
    const s = this.scene; this.boxes = []; this.inter = [];
    s.background = new THREE.Color(0x120d0a); s.fog = new THREE.Fog(0x120d0a, 12, 40);
    s.add(new THREE.HemisphereLight(0xffe6c4, 0x2a1d14, 0.9));
    this.buildRooms(); this.buildArt(); this.buildDino(); this.buildPuzzle(); this.buildButton(); this.buildLasers(); this.buildVault();
    Player.reset(0, 4, 0, this.boxes); this.prev = Player.pos.clone();
    this.puzzleDone = false; this.lasersOn = true; this.fragTaken = false; this.drag = null;
  }
  wall(x, z, w, d, h, mat, collide = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, h / 2, z); m.receiveShadow = true; this.scene.add(m);
    if (collide) this.boxes.push(box(x, z, w, d)); return m;
  }
  buildRooms() {
    const s = this.scene;
    const floorTex = canvasTex(512, 512, (g) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#d9d2c4' : '#2b2622'; g.fillRect(i * 128, j * 128, 128, 128); } g.globalAlpha = 0.15; for (let k = 0; k < 40; k++) { g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(Math.random() * 512, Math.random() * 512); g.bezierCurveTo(Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512); g.stroke(); } }, [12, 50]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 50), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -19); floor.receiveShadow = true; s.add(floor);
    const wallTex = canvasTex(256, 256, (g) => { g.fillStyle = '#b9a88c'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#8b6f4e'; g.fillRect(0, 200, 256, 56); g.fillStyle = '#5a4430'; g.fillRect(0, 196, 256, 6); for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(80,60,40,${Math.random() * 0.06})`; g.fillRect(Math.random() * 256, Math.random() * 196, 3, 3); } }, [3, 1]);
    const W = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 }), H = 5;
    this.wall(0, 6, 12, 0.3, H, W); this.wall(-6, -8, 0.3, 28, H, W); this.wall(6, -8, 0.3, 28, H, W);
    this.wall(-3.7, -10, 4.6, 0.3, H, W); this.wall(3.7, -10, 4.6, 0.3, H, W);
    this.wall(-3.8, -22, 4.4, 0.3, H, W); this.wall(3.8, -22, 4.4, 0.3, H, W);
    const C = M.std(0x3a3d44, { metalness: 0.4, roughness: 0.5 });
    this.wall(-1.6, -28, 0.3, 12, 3.2, C); this.wall(1.6, -28, 0.3, 12, 3.2, C);
    this.wall(-3.3, -34, 3.4, 0.3, 4, W); this.wall(3.3, -34, 3.4, 0.3, 4, W);
    this.wall(-5, -39, 0.3, 10, 4, W); this.wall(5, -39, 0.3, 10, 4, W); this.wall(0, -44, 10, 0.3, 4, W);
    this.wall(0, -22, 3.2, 0.3, 1.8, W, false).position.y = 4.1; // dintel
    const ceil = (x, z, w, d, y) => { const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.std(0x1c1814)); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); s.add(c); };
    ceil(0, -8, 12, 28, H); ceil(0, -28, 3.2, 12, 3.2); ceil(0, -39, 10, 10, 4);
    // columnas
    for (const [x, z] of [[-4.6, 3], [4.6, 3], [-4.6, -6], [4.6, -6], [-4.6, -13], [4.6, -13], [-4.6, -19], [4.6, -19]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, H, 10), M.std(0xe6dccb)); col.position.set(x, H / 2, z); col.castShadow = true; s.add(col); this.boxes.push(box(x, z, 0.7, 0.7));
    }
    // iluminación cálida de museo
    for (const z of [2, -5, -13, -19]) { const l = new THREE.PointLight(0xffd9a8, 9, 14, 1.6); l.position.set(0, 4.4, z); s.add(l); }
  }
  buildArt() {
    const s = this.scene; this.eyes = [];
    const frameMat = M.std(0xc9a24a, { metalness: 0.7, roughness: 0.35 });
    const portrait = (seed) => canvasTex(256, 320, (g, w, h) => { const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, ['#2b1a12', '#1a2230', '#2a1530'][seed % 3]); bg.addColorStop(1, '#0a0806'); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = '#d8b48a'; g.beginPath(); g.ellipse(128, 130, 58, 74, 0, 0, TAU); g.fill(); g.fillStyle = ['#3b2414', '#141414', '#5a2a10'][seed % 3]; g.beginPath(); g.ellipse(128, 86, 70, 46, 0, Math.PI, 0); g.fill(); g.fillStyle = '#20140c'; g.fillRect(40, 220, 176, 100); g.fillStyle = '#000'; g.beginPath(); g.ellipse(104, 130, 13, 9, 0, 0, TAU); g.ellipse(152, 130, 13, 9, 0, 0, TAU); g.fill(); g.strokeStyle = '#7a3b2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(108, 180); g.quadraticCurveTo(128, 186, 148, 180); g.stroke(); });
    const hang = (x, z, ry, seed) => {
      const grp = new THREE.Group(); grp.position.set(x, 2.3, z); grp.rotation.y = ry; s.add(grp);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.55, 0.08), frameMat); grp.add(fr);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.32), new THREE.MeshStandardMaterial({ map: portrait(seed), roughness: 0.8 })); pic.position.z = 0.045; grp.add(pic);
      for (const ex of [-0.1, 0.1]) { const eye = new THREE.Group(); eye.position.set(ex * 1.05 * 1.15, 0.05, 0.06); const w = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), M.std(0xf2eee6, { flatShading: false })); const p = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), M.basic(0x000000)); p.position.z = 0.035; eye.add(w, p); grp.add(eye); this.eyes.push(eye); }
      const spot = new THREE.SpotLight(0xffe3b5, 14, 6, 0.5, 0.6, 1.5); spot.position.set(0, 1.8, 1.2); spot.target = pic; grp.add(spot);
    };
    hang(-5.82, 1, Math.PI / 2, 0); hang(-5.82, -5, Math.PI / 2, 1); hang(5.82, -2, -Math.PI / 2, 2); hang(5.82, -16, -Math.PI / 2, 0); hang(-5.82, -17, Math.PI / 2, 2);
    // busto que gira la cabeza siguiendo al jugador
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.6), M.std(0xe6dccb)); ped.position.set(-4.2, 0.55, -20.4); s.add(ped); this.boxes.push(box(-4.2, -20.4, 0.7, 0.7));
    this.bust = new THREE.Group(); this.bust.position.set(-4.2, 1.1, -20.4); s.add(this.bust);
    const marble = M.std(0xf1ece2, { roughness: 0.4 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.4, 7), marble); torso.position.y = 0.2; this.bust.add(torso);
    this.bustHead = new THREE.Group(); this.bustHead.position.y = 0.55; this.bust.add(this.bustHead);
    const head = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(0.17, 1), 0.012), marble); head.scale.set(0.9, 1.15, 1); this.bustHead.add(head);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), marble); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0, 0.17); this.bustHead.add(nose);
    for (const ex of [-0.06, 0.06]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), M.basic(0x220000)); e.position.set(ex, 0.04, 0.145); this.bustHead.add(e); }
  }
  buildDino() {
    const s = this.scene; const bone = M.std(0xe8dcc0, { roughness: 0.7 });
    const plat = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 5.4), M.std(0x2a2420)); plat.position.set(0, 0.125, -3.5); plat.receiveShadow = true; s.add(plat);
    const d = this.dino = new THREE.Group(); d.position.set(0, 0.25, -3.5); s.add(d);
    const cyl = (r1, r2, len, a, b) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, 1, 6), bone); const v = b.clone().sub(a); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.y = v.length(); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); m.castShadow = true; d.add(m); return m; };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    // patas
    for (const sx of [-0.4, 0.4]) { cyl(0.11, 0.08, 1, V(sx, 1.9, 0.3), V(sx, 1.0, 0.6)); cyl(0.08, 0.06, 1, V(sx, 1.0, 0.6), V(sx, 0.15, 0.2)); cyl(0.05, 0.04, 1, V(sx, 0.15, 0.2), V(sx, 0.05, -0.35)); }
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.6), bone); pelvis.position.set(0, 2.0, 0.3); d.add(pelvis);
    // columna vertebral (curva) + costillas
    const spine = []; for (let i = 0; i <= 22; i++) { const t = i / 22; spine.push(V(0, 2.1 + Math.sin(t * Math.PI) * 0.35 - t * 0.2 + (t > 0.75 ? (t - 0.75) * 2.2 : 0), 2.6 - t * 4.6)); }
    spine.forEach((p, i) => { const v = new THREE.Mesh(new THREE.OctahedronGeometry(0.09 + Math.sin((i / 22) * Math.PI) * 0.06, 0), bone); v.position.copy(p); d.add(v); });
    for (let i = 9; i < 16; i++) { const p = spine[i]; const rib = new THREE.Mesh(new THREE.TorusGeometry(0.42 - Math.abs(i - 12) * 0.03, 0.025, 4, 10, Math.PI), bone); rib.rotation.set(0, Math.PI / 2, Math.PI); rib.position.copy(p); rib.position.y -= 0.02; d.add(rib); }
    for (const sx of [-0.25, 0.25]) cyl(0.03, 0.02, 1, V(sx, 2.0, -1.3), V(sx * 1.4, 1.6, -1.6));
    // cabeza articulada
    this.dinoHead = new THREE.Group(); this.dinoHead.position.copy(spine[22]); d.add(this.dinoHead);
    const skull = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.5, 0.45, 0.95), 0.04), bone); skull.position.set(0, 0.05, -0.45); this.dinoHead.add(skull);
    this.jaw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.85), bone); this.jaw.position.set(0, -0.22, -0.4); this.dinoHead.add(this.jaw);
    for (let i = 0; i < 8; i++) { const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 4), M.std(0xfffaf0)); tooth.rotation.x = Math.PI; tooth.position.set(i % 2 ? 0.19 : -0.19, -0.18, -0.15 - Math.floor(i / 2) * 0.18); this.dinoHead.add(tooth); }
    for (const sx of [-0.2, 0.2]) { const sock = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), M.basic(0x050302)); sock.position.set(sx, 0.15, -0.3); this.dinoHead.add(sock); const glint = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), M.basic(0xff3010)); glint.position.set(sx * 1.08, 0.15, -0.33); this.dinoHead.add(glint); }
    d.rotation.y = 0; this.dinoBox = box(0, -3.5, 1.4, 3.8); this.boxes.push(this.dinoBox);
    // esqueleto real de alosaurio (modelo 3D) en lugar del procedural, si cargó
    if (Assets.has('dino')) {
      d.traverse((o) => { if (o.isMesh) o.visible = false; });
      const sk = Assets.get('dino', { size: 6.2, dim: 'z', rotY: Math.PI }); sk.position.set(0, -0.25, -0.3); d.add(sk);
      sk.traverse((o) => { if (o.isMesh) o.material.envMapIntensity = 1; });
    }
    const spot = new THREE.SpotLight(0xfff0d0, 40, 12, 0.5, 0.5, 1.4); spot.position.set(0, 4.8, -1.5); spot.target = d; spot.castShadow = true; spot.shadow.mapSize.set(512, 512); s.add(spot);
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshStandardMaterial({ map: canvasTex(256, 86, (g) => { g.fillStyle = '#c9a24a'; g.fillRect(0, 0, 256, 86); g.fillStyle = '#1a1208'; g.font = 'bold 22px Manrope'; g.fillText('ALLOSAURUS', 30, 40); g.font = '15px Manrope'; g.fillText('No lo pierdas de vista.', 40, 66); }) }));
    plaque.position.set(0, 0.2, -0.78); plaque.rotation.x = -0.3; s.add(plaque);
    this.dinoT = 0; this.dinoScare = 0;
  }
  buildPuzzle() {
    const s = this.scene; const TX = 0, TZ = -15.2, TY = 0.92; this.tableY = TY;
    const wood = M.std(0x5b3a22, { roughness: 0.6 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.3), wood); top.position.set(TX, TY - 0.04, TZ); top.receiveShadow = true; top.castShadow = true; s.add(top);
    const felt = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.2), M.std(0x1d4a3a, { roughness: 1 })); felt.rotation.x = -Math.PI / 2; felt.position.set(TX, TY + 0.001, TZ); felt.receiveShadow = true; s.add(felt);
    for (const [lx, lz] of [[-1.1, -0.55], [1.1, -0.55], [-1.1, 0.55], [1.1, 0.55]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, TY - 0.08, 0.08), wood); leg.position.set(TX + lx, (TY - 0.08) / 2, TZ + lz); s.add(leg); }
    this.boxes.push(box(TX, TZ, 2.4, 1.3));
    const W = PZ.cols * PZ.cell, H = PZ.rows * PZ.cell;
    this.boardOrigin = new THREE.Vector3(TX - W / 2, TY, TZ - 0.2 + H / 2); // esquina inferior-izquierda (fila 0) del tablero
    // tablero: bandeja con hueco, imagen fantasma y contornos de las piezas
    const tray = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.02, H + 0.1), M.std(0x2b1a0e)); tray.position.set(TX, TY + 0.01, TZ - 0.2); s.add(tray);
    const tex = puzzleTexture(); tex.repeat.set(1 / W, 1 / H);
    const ghostTex = tex.clone(); ghostTex.needsUpdate = true; ghostTex.repeat.set(1, 1);
    const ghost = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: ghostTex, transparent: true, opacity: 0.16 })); ghost.rotation.x = -Math.PI / 2; ghost.position.set(TX, TY + 0.021, TZ - 0.2); s.add(ghost);
    // pestañas internas: h[r][c] entre columnas, v[r][c] entre filas
    const h = [[1, -1], [-1, 1]], v = [[-1, 1, -1]];
    const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }), sideMat = M.std(0xd9c29a, { flatShading: false });
    this.pieces = [];
    const spots = [[-0.52, 0.36], [-0.18, 0.5], [0.14, 0.34], [0.46, 0.5], [-0.42, 0.56], [0.55, 0.26]].sort(() => Math.random() - 0.5);
    for (let r = 0; r < PZ.rows; r++) for (let c = 0; c < PZ.cols; c++) {
      const tabs = [r > 0 ? -v[r - 1][c] : 0, c < PZ.cols - 1 ? h[r][c] : 0, r < PZ.rows - 1 ? v[r][c] : 0, c > 0 ? -h[r][c - 1] : 0];
      const shape = jigsawShape(c, r, tabs);
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 1, curveSegments: 4 });
      const cx = (c + 0.5) * PZ.cell, cy = (r + 0.5) * PZ.cell; g.translate(-cx, -cy, 0); g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, [faceMat, sideMat]); m.castShadow = true; m.receiveShadow = true;
      const slot = new THREE.Vector3(this.boardOrigin.x + cx, TY + 0.022, this.boardOrigin.z - cy);
      const sp = spots[r * PZ.cols + c]; m.position.set(TX + sp[0], TY + 0.002, TZ + sp[1]);
      m.userData = { slot, placed: false, piece: true }; s.add(m); this.pieces.push(m); this.inter.push(m);
      // contorno guía en el tablero
      const pts = shape.getPoints(4).map((p) => new THREE.Vector3(this.boardOrigin.x + p.x, TY + 0.024, this.boardOrigin.z - p.y));
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xc9a24a, transparent: true, opacity: 0.55 })); s.add(line);
    }
    const spot = new THREE.SpotLight(0xfff2dc, 30, 7, 0.55, 0.5, 1.3); spot.position.set(TX, 3.6, TZ + 0.8); spot.target = top; spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0005; s.add(spot);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshStandardMaterial({ map: canvasTex(512, 160, (g) => { g.fillStyle = '#14100c'; g.fillRect(0, 0, 512, 160); g.fillStyle = '#c9a24a'; g.font = 'bold 34px Unbounded, sans-serif'; g.fillText('RESTAURÁ LA OBRA', 30, 64); g.fillStyle = '#e6dccb'; g.font = '24px Manrope, sans-serif'; g.fillText('Arrastrá cada pieza a su lugar', 30, 112); }) }));
    sign.position.set(TX, 2.6, -21.83); s.add(sign);
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(TY + 0.04));
  }
  buildButton() {
    const s = this.scene; const BX = 3.2, BZ = -20.7;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.0, 8), M.std(0x30343c, { metalness: 0.6 })); ped.position.set(BX, 0.5, BZ); s.add(ped);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 16), M.std(0xf2c230, { metalness: 0.4 })); plate.position.set(BX, 1.03, BZ); s.add(plate);
    this.redBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.09, 20), new THREE.MeshStandardMaterial({ color: 0xd2101e, emissive: 0x500006, emissiveIntensity: 0.6, roughness: 0.3 }));
    this.redBtn.position.set(BX, 1.1, BZ); this.redBtn.userData.button = true; s.add(this.redBtn); this.inter.push(this.redBtn);
    this.btnLamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 })); this.btnLamp.position.set(BX + 0.22, 1.1, BZ - 0.12); s.add(this.btnLamp);
    this.btnLight = new THREE.PointLight(0xff2020, 1.2, 2.5); this.btnLight.position.set(BX, 1.5, BZ); s.add(this.btnLight);
    this.boxes.push(box(BX, BZ, 0.65, 0.65)); this.btnY = 1.1;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.4), new THREE.MeshStandardMaterial({ map: canvasTex(320, 116, (g) => { g.fillStyle = '#1a0507'; g.fillRect(0, 0, 320, 116); g.fillStyle = '#ff4050'; g.font = 'bold 26px Unbounded, sans-serif'; g.fillText('SEGURIDAD', 24, 48); g.fillStyle = '#ffd0d0'; g.font = '18px Manrope'; g.fillText('Láseres · Sala del cristal', 24, 84); }) }));
    sign.position.set(BX + 0.2, 2.0, -21.83); s.add(sign);
  }
  buildLasers() {
    const s = this.scene; this.lasers = []; this.laserZ = [-24.5, -26.5, -28.5, -30.5, -32.5];
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xff1a2e, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff2040, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
    this.emitters = [];
    this.laserZ.forEach((z, i) => {
      for (let k = 0; k < 3; k++) {
        const grp = new THREE.Group(); const y0 = 0.35 + k * 0.6; grp.position.set(0, y0, z); s.add(grp);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 3.0, 4), beamMat); beam.rotation.z = Math.PI / 2; grp.add(beam);
        const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.0, 6), glowMat); glow.rotation.z = Math.PI / 2; grp.add(glow);
        grp.userData = { y0, amp: i % 2 ? 0.25 : 0, ph: i + k };
        this.lasers.push(grp);
      }
      for (const sx of [-1.45, 1.45]) { const em = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.16), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xff1020, emissiveIntensity: 0.8 })); em.position.set(sx, 1.0, z); s.add(em); this.emitters.push(em); }
    });
    this.laserLights = [-25.5, -30].map((z) => { const l = new THREE.PointLight(0xff2030, 6, 6, 1.6); l.position.set(0, 2.5, z); s.add(l); return l; });
  }
  buildVault() {
    const s = this.scene;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.1, 8), M.std(0xe6dccb)); ped.position.set(0, 0.55, -39); ped.castShadow = true; s.add(ped);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 8), M.std(0xc9a24a, { metalness: 0.7 })); cap.position.set(0, 1.13, -39); s.add(cap);
    this.boxes.push(box(0, -39, 0.8, 0.8));
    this.frag = makeFragment(1); this.frag.scale.setScalar(0.5); this.frag.position.set(0, 1.75, -39); this.frag.userData.baseY = 1.75; s.add(this.frag); this.inter.push(this.frag);
    const spot = new THREE.SpotLight(0xcfe6ff, 40, 8, 0.4, 0.4, 1.3); spot.position.set(0, 3.9, -38); spot.target = ped; spot.castShadow = true; s.add(spot);
    this.portal = new Portal(1.35); this.portal.group.position.set(0, 1.55, -42.6); s.add(this.portal.group);
    const lv = new THREE.PointLight(0x6fa8ff, 4, 10); lv.position.set(0, 3, -41); s.add(lv);
  }

  /* ---------- interacción directa ---------- */
  near(obj, r) { const p = obj.getWorldPosition(new THREE.Vector3()); return Math.hypot(p.x - Player.pos.x, p.z - Player.pos.z) < r; }
  onPointerDown(ndc) {
    const hit = pick(ndc, this.pieces.filter((p) => !p.userData.placed));
    if (hit) {
      const m = hit.object;
      if (!this.near(m, 2.4)) { HUD.toast('Acercate a la mesa para mover las piezas', 1600); return false; }
      const p = new THREE.Vector3(); ray.ray.intersectPlane(this.dragPlane, p);
      this.drag = { m, off: m.position.clone().sub(p) }; m.position.y = this.tableY + 0.05; Audio.sfx.pick(); haptic(10);
      return true;
    }
    return false;
  }
  onPointerMove(ndc) {
    if (!this.drag) return; ray.setFromCamera(ndc, camera); const p = new THREE.Vector3();
    if (!ray.ray.intersectPlane(this.dragPlane, p)) return;
    const m = this.drag.m; m.position.x = clamp(p.x + this.drag.off.x, -1.1, 1.1); m.position.z = clamp(p.z + this.drag.off.z, -15.2 - 0.58, -15.2 + 0.58);
  }
  onPointerUp() {
    if (!this.drag) return; const m = this.drag.m; this.drag = null;
    const slot = m.userData.slot;
    if (Math.hypot(m.position.x - slot.x, m.position.z - slot.z) < 0.075) {
      m.position.copy(slot); m.userData.placed = true; Audio.sfx.snap(); haptic(35);
      const n = this.pieces.filter((p) => p.userData.placed).length; State.puzzleProgress['pieza' + n] = true;
      if (n === this.pieces.length) this.completePuzzle(); else HUD.toast(`¡Encaja! ${n}/${this.pieces.length}`, 1100);
    } else { m.position.y = this.tableY + 0.002; Audio.sfx.click(); }
  }
  completePuzzle() {
    this.puzzleDone = true; State.puzzleProgress.museum = true; Audio.sfx.collect(); haptic([60, 40, 60]);
    this.btnLamp.material.color.set(0x30ff80); this.btnLight.color.set(0x30ff80); this.redBtn.material.emissive.set(0xff1020); this.redBtn.material.emissiveIntensity = 1.2;
    HUD.toast('¡Obra restaurada! El sistema de seguridad se desbloqueó', 3000);
    HUD.objective('Presioná el <b>botón rojo</b> junto a la entrada del pasillo para apagar los láseres.');
  }
  onTap(ndc) {
    const hit = pick(ndc, [this.redBtn, this.frag]); if (!hit) return;
    let o = hit.object; while (o && o !== this.frag && o !== this.redBtn) o = o.parent;
    if (o === this.redBtn) this.pressButton();
    if (o === this.frag) this.tryFragment(true);
  }
  pressButton() {
    if (!this.near(this.redBtn, 2.2)) { HUD.toast('Acercate al botón', 1200); return; }
    this.btnPress = 0.25; Audio.sfx.press(); haptic(40);
    if (!this.puzzleDone) { setTimeout(() => { Audio.sfx.denied(); HUD.toast('ACCESO DENEGADO · Primero restaurá la obra', 2200, true); HUD.red(300); }, 120); this.lampBlink = 1.2; return; }
    if (!this.lasersOn) return;
    this.lasersOn = false; State.puzzleProgress.lasers = false; Audio.sfx.powerDown(); this.laserFade = 1;
    HUD.toast('Láseres desactivados', 2200); HUD.objective('El camino está libre. <b>Tomá el fragmento azul</b> de la sala del fondo.');
  }
  tryFragment(fromTap) {
    if (this.fragTaken) return;
    if (!this.near(this.frag, fromTap ? 2.4 : 1.25)) { if (fromTap) HUD.toast('Está demasiado lejos', 1200); return; }
    this.fragTaken = true; collectFragment(this.frag, 'museum', this.scene);
    setTimeout(() => { this.portal.unlock(); HUD.toast('Un portal se abrió detrás del pedestal', 2600); HUD.objective('<b>Atravesá el portal</b> para escapar del museo.'); }, 1000);
  }
  enter() {
    HUD.setWorld('Mundo 2', 'Museo'); Audio.ambient('museum'); Input.walkEnabled = true;
    HUD.objective('Las obras cobraron vida. <b>No pierdas de vista al dinosaurio</b> y pasá a la galería.');
  }
  update(t, dt) {
    this.t = t; applyLook(dt); this.prev.copy(Player.pos); Player.update(dt);
    // --- láseres: bloquean el pasillo mientras estén activos ---
    if (this.lasersOn) {
      this.lasers.forEach((l) => { l.position.y = l.userData.y0 + Math.sin(t * 1.4 + l.userData.ph) * l.userData.amp; });
      if (Math.abs(Player.pos.x) < 1.6 && this.laserZ.some((z) => Math.abs(Player.pos.z - z) < 0.22)) {
        Audio.sfx.alarm(); haptic([80, 40, 80, 40, 200]); HUD.red(600); HUD.toast('¡ALARMA! Los láseres te detectaron', 2200, true);
        Player.pos.set(0, 0, -21.0); Player.vel.set(0, 0, 0);
      }
      if (Math.random() < dt * 0.6 && Player.pos.z < -18) Audio.sfx.laserHum();
    } else if (this.laserFade > 0) {
      this.laserFade = Math.max(0, this.laserFade - dt * 0.8);
      this.lasers.forEach((l) => { l.children.forEach((c) => (c.material.opacity = (c === l.children[0] ? 0.95 : 0.18) * (this.laserFade > 0.6 ? (Math.random() > 0.4 ? 1 : 0.2) : this.laserFade))); l.visible = this.laserFade > 0.01; });
      this.emitters.forEach((e) => (e.material.emissiveIntensity = this.laserFade * 0.8)); this.laserLights.forEach((l) => (l.intensity = this.laserFade * 6));
    }
    // --- botón físico: animación de presión ---
    if (this.btnPress > 0) { this.btnPress -= dt; this.redBtn.position.y = this.btnY - (this.btnPress > 0.12 ? 0.035 : 0.035 * (this.btnPress / 0.12)); } else this.redBtn.position.y = this.btnY;
    if (this.lampBlink > 0) { this.lampBlink -= dt; this.btnLamp.visible = Math.floor(t * 10) % 2 === 0; } else this.btnLamp.visible = true;
    // --- obras vivas: ojos que siguen, busto que gira, dinosaurio que acecha ---
    this.eyes.forEach((e) => e.lookAt(camera.position));
    const toP = Math.atan2(Player.pos.x - this.bust.position.x, Player.pos.z - this.bust.position.z); this.bustHead.rotation.y = damp(this.bustHead.rotation.y, clamp(toP, -1.2, 1.2), 1.5, dt);
    this.updateDino(t, dt);
    // --- fragmento ---
    if (!this.fragTaken) { this.frag.userData.update(t); if (!this.lasersOn) this.tryFragment(false); }
    this.portal.update(t, dt);
    if (this.portal.checkCross(new THREE.Vector3(this.prev.x, 1.5, this.prev.z), new THREE.Vector3(Player.pos.x, 1.5, Player.pos.z))) Game.goto('hauntedHouse');
    if (Player.pos.z < -10.5 && !this._galleryMsg) { this._galleryMsg = true; HUD.objective('Restaurá la obra: <b>arrastrá las piezas</b> del rompecabezas sobre la mesa hasta su lugar.'); }
    const hot = pick(new THREE.Vector2(0, 0), this.inter); HUD.reticle(hot && hot.distance < 2.6);
  }
  /** el dinosaurio solo se mueve cuando NO lo estás mirando (se lo escucha acercarse) */
  updateDino(t, dt) {
    const d = this.dino; const dp = d.position; const toPlayer = new THREE.Vector3(Player.pos.x - dp.x, 0, Player.pos.z - dp.z); const dist = toPlayer.length();
    const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir); camDir.y = 0; camDir.normalize();
    const toDino = new THREE.Vector3(dp.x - Player.pos.x, 0, dp.z - Player.pos.z).normalize();
    const seen = camDir.dot(toDino) > 0.45;
    if (!seen && Player.pos.z > -10 && dist > 3) {
      const yawT = Math.atan2(-toPlayer.x, -toPlayer.z); d.rotation.y = damp(d.rotation.y, yawT, 2, dt);
      dp.addScaledVector(toPlayer.normalize(), dt * 0.9); dp.z = Math.max(dp.z, -7.5); dp.x = clamp(dp.x, -4, 4);
      this.dinoT -= dt; if (this.dinoT <= 0) { this.dinoT = 0.9; Audio.sfx.step(dp.clone().setY(0), 0.9); haptic(15); }
      this.dinoHead.rotation.x = Math.sin(t * 2) * 0.08;
    }
    this.jaw.rotation.x = this.dinoScare > 0 ? 0.4 : 0; this.dinoScare -= dt;
    if (dist < 3.4 && Player.pos.z > -10 && (this._roarCd || 0) < t) {
      this._roarCd = t + 6; this.dinoScare = 1.2; Audio.sfx.roar(dp.clone().setY(2)); haptic([100, 50, 200]); HUD.red(500); HUD.toast('¡El dinosaurio te sigue! Corré a la galería', 2400, true);
    }
    Object.assign(this.dinoBox, box(dp.x, dp.z, 1.3, 1.3));
  }
}
