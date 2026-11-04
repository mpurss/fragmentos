/* =====================================================================
   5. ESCENA DE TÍTULO (3D) y MUNDO 0: LA GRIETA (realidad aumentada)
   ===================================================================== */
class BaseWorld {
  constructor() { this.scene = new THREE.Scene(); this.t = 0; this.walk = true; }
  build() {} enter() {} update() {} exit() {}
  dispose() { this.exit(); disposeTree(this.scene); this.scene.clear(); }
}
function starfield(n = 900, r = 90, color = 0x9fc4ff, size = 0.25) {
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(r * rand(0.6, 1)); p.set([v.x, Math.abs(v.y) * 0.8 + v.y * 0.2, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false }));
}

/** Escena 3D detrás de la pantalla de inicio: fragmentos flotantes + portal */
class TitleScene extends BaseWorld {
  build() {
    const s = this.scene; s.background = new THREE.Color(0x030712); s.fog = new THREE.FogExp2(0x030712, 0.045);
    s.add(new THREE.HemisphereLight(0x6fb6ff, 0x05070d, 0.6));
    const key = new THREE.DirectionalLight(0xbfe6ff, 2.2); key.position.set(3, 5, 4); s.add(key);
    const rim = new THREE.PointLight(0x2a7bff, 30, 20, 1.6); rim.position.set(-3, 1, -2); s.add(rim);
    this.portal = new Portal(2.2); this.portal.group.position.set(1.0, 3.3, -7); this.portal.unlock(true); s.add(this.portal.group);
    this.frags = [0, 1, 2].map((i) => { const f = makeFragment(i); f.scale.setScalar(1.6 - i * 0.25); s.add(f); return f; });
    this.frags[0].position.set(-1.0, 3.2, -2.6); this.frags[1].position.set(0.9, 2.5, -2.2); this.frags[2].position.set(-0.2, 3.9, -3.2);
    this.frags.forEach((f) => (f.userData.baseY = f.position.y));
    s.add(starfield(700, 60));
    const rocks = new THREE.Group();
    for (let i = 0; i < 40; i++) { const r = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(rand(0.05, 0.25), 0), 0.03), M.std(0x1a2438)); r.position.set(rand(-6, 6), rand(-2, 5), rand(-9, -1)); r.userData.sp = rand(0.1, 0.5); rocks.add(r); }
    s.add(rocks); this.rocks = rocks;
    camera.position.set(0, 1.6, 2.4); camera.rotation.set(0, 0, 0);
  }
  update(t, dt) {
    this.portal.update(t, dt);
    this.frags.forEach((f, i) => { f.userData.update(t + i * 1.7); f.rotation.z = Math.sin(t * 0.5 + i) * 0.3; });
    this.rocks.children.forEach((r) => { r.rotation.x += dt * r.userData.sp; r.position.y += Math.sin(t + r.position.x) * 0.002; });
    const px = (Input.ndc.x || 0) * 0.3, py = (Input.ndc.y || 0) * 0.2;
    camera.position.x = damp(camera.position.x, Math.sin(t * 0.2) * 0.4 + px, 2, dt); camera.position.y = damp(camera.position.y, 1.6 + py, 2, dt);
    camera.lookAt(0, 2.2, -3);
  }
}

/** MUNDO 0 — El cuarto del protagonista: la grieta se abre en la pared (vista 360° con el celular) */
class IntroWorld extends BaseWorld {
  build() {
    const s = this.scene; this.boxes = [];
    s.background = new THREE.Color(0x07070c); s.fog = new THREE.Fog(0x07070c, 8, 16);
    s.add(new THREE.HemisphereLight(0xffe6c8, 0x2a2018, 0.55));
    const W = 5, D = 6, H = 3.2, ZW = -3; const BED = Assets.has('bedroom'); // cuarto: x[-2.5,2.5] z[-3,3]
    // --- paredes, piso y techo ---
    const plaster = canvasTex(256, 256, (g) => { g.fillStyle = '#c3c9d4'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(90,70,50,${Math.random() * 0.08})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } g.strokeStyle = 'rgba(255,255,255,.08)'; for (let x = 0; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } }, [2, 1]);
    const wallMat = new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.95 });
    const wall = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), wallMat); m.position.set(x, H / 2, z); m.receiveShadow = true; s.add(m); this.boxes.push(box(x, z, w, d)); };
    wall(-W / 2 - 0.1, 0, 0.2, D); wall(W / 2 + 0.1, 0, 0.2, D); wall(0, D / 2 + 0.1, W, 0.2);
    if (BED) s.children.slice(-2).forEach((m) => (m.visible = false));   // el modelo del cuarto ya trae esas dos paredes
    const wood = canvasTex(256, 256, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(28,${35 + Math.random() * 10}%,${30 + Math.random() * 8}%)`; g.fillRect(0, i * 32, 256, 31); g.fillStyle = '#2a1a0e'; g.fillRect(0, i * 32 + 31, 256, 1); } }, [3, 4]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D + 2), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.7 })); floor.rotation.x = -Math.PI / 2; floor.position.z = -1; floor.receiveShadow = true; s.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.std(0xd8cfc0)); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; s.add(ceil);
    // --- pared del fondo: una losa con una GRIETA 3D real (hueco con profundidad) ---
    this.crack = makeCrack({ rect: [H, W], depth: 0.45, len: 2.35, width: 1.3, seed: 7, branches: false });
    this.crack.rotation.x = Math.PI / 2;                       // la cara mira hacia el cuarto
    const holder = new THREE.Group(); holder.rotation.z = Math.PI / 2; holder.position.set(0, H / 2, ZW); holder.add(this.crack); s.add(holder);
    this.holder = holder; this.crackLight = this.crack.children.find((o) => o.isPointLight);
    // detrás de la pared: el vacío azul del portal
    const voidG = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ color: 0x0b3b8c })); voidG.position.set(0, H / 2, ZW - 1.4); s.add(voidG);
    const voidL = new THREE.PointLight(0x3aa0ff, 0, 6, 1.5); voidL.position.set(0, 1.2, ZW - 0.8); s.add(voidL); this.voidL = voidL;
    // buscar el paso transitable de la grieta a la altura del pecho
    holder.updateMatrixWorld(true);
    let best = [0, 0], run = null;
    for (let x = -2.3; x <= 2.3; x += 0.02) {
      const l = this.crack.worldToLocal(new THREE.Vector3(x, 1.1, ZW)); const over = this.crack.userData.isOver(l.x, l.z);
      if (over && run == null) run = x; if ((!over || x > 2.28) && run != null) { if (x - run > best[1] - best[0]) best = [run, x]; run = null; }
    }
    this.gap = { c: (best[0] + best[1]) / 2, hw: Math.max(0.18, (best[1] - best[0]) / 2) };
    this.boxes.push({ x0: -W / 2, x1: this.gap.c - this.gap.hw, z0: ZW - 0.5, z1: ZW + 0.02 }, { x0: this.gap.c + this.gap.hw, x1: W / 2, z0: ZW - 0.5, z1: ZW + 0.02 });
    // la pared intacta tapa la grieta hasta que se rompe (pedazos que caen)
    const outline = this.crack.userData.outline; this.shards = [];
    const shardMat = new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.95, side: THREE.DoubleSide });
    const cx = outline.reduce((a, v) => a + v.x, 0) / outline.length, cy = outline.reduce((a, v) => a + v.y, 0) / outline.length;
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(cx, 0.05, cy), new THREE.Vector3(a.x, 0.05, a.y), new THREE.Vector3(b.x, 0.05, b.y)]); g.computeVertexNormals();
      const m = new THREE.Mesh(g, shardMat); this.crack.add(m); this.shards.push({ m, v: new THREE.Vector3(rand(0, 1.2), rand(1, 2.2), rand(-0.6, 0.6)), spin: rand(-3, 3) });
    }
    this.crack.children.forEach((o) => { if (o.isPoints || (o.material && o.material.blending === THREE.AdditiveBlending)) o.visible = false; });
    // --- muebles del cuarto: modelo 3D 'Bedroom (Low Poly)' si cargó; si no, muebles procedurales ---
    const add = (geo, mat, x, y, z, ry = 0, collide) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; s.add(m); if (collide) this.boxes.push(box(x, z, collide[0], collide[1])); return m; };
    if (BED) {
      const room = Assets.get('bedroom', { size: 4.91, dim: 'x', rotY: Math.PI });   // paredes del modelo: derecha y fondo
      const hs = room.userData.size; room.position.set(W / 2 - hs.x / 2, 0, D / 2 - hs.z / 2); s.add(room); room.updateMatrixWorld(true);
      // colisiones automáticas a partir de las cajas de cada mueble
      room.traverse((m) => {
        if (!m.isMesh) return; const b = new THREE.Box3().setFromObject(m); const z = b.getSize(new THREE.Vector3());
        if (z.x > 4 || z.z > 4 || b.min.y > 1.0 || z.y < 0.12) return;   // cáscara del cuarto, estantes altos, alfombra
        this.boxes.push({ x0: b.min.x - 0.05, x1: b.max.x + 0.05, z0: b.min.z - 0.05, z1: b.max.z + 0.05 });
      });
      this.lamp = new THREE.PointLight(0xffc27a, 3, 5, 1.6); this.lamp.position.set(1.4, 1.6, -1.6); s.add(this.lamp);
    } else {
          add(new THREE.BoxGeometry(1.5, 0.4, 2.1), M.std(0x6a4a30), -1.7, 0.2, 1.6, 0, [1.5, 2.1]);
      add(new THREE.BoxGeometry(1.42, 0.22, 2.0), M.std(0x2f4f8a, { roughness: 1 }), -1.7, 0.5, 1.65);
      add(new THREE.BoxGeometry(0.9, 0.16, 0.45), M.std(0xeeeeee, { roughness: 1 }), -1.7, 0.67, 2.4);
      add(new THREE.BoxGeometry(1.5, 0.9, 0.08), M.std(0x5a3e28), -1.7, 0.7, 2.68);
      add(new THREE.BoxGeometry(1.3, 0.06, 0.6), M.std(0xd9c7a8), 1.85, 0.75, 0.3, Math.PI / 2, [0.6, 1.3]);
      for (const [lx, lz] of [[1.6, -0.25], [2.1, -0.25], [1.6, 0.85], [2.1, 0.85]]) add(new THREE.BoxGeometry(0.05, 0.75, 0.05), M.std(0xd9c7a8), lx, 0.37, lz);
      const laptop = add(new THREE.BoxGeometry(0.34, 0.02, 0.24), M.std(0x2a2d33, { metalness: 0.6 }), 1.85, 0.79, 0.3);
      const screen = add(new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshBasicMaterial({ color: 0x3aa0ff }), 1.97, 0.9, 0.3, -Math.PI / 2); screen.rotation.z = 0.2;
      this.lamp = new THREE.PointLight(0xffc27a, 4, 5, 1.6); this.lamp.position.set(1.9, 1.25, 0.8); this.lamp.castShadow = true; this.lamp.shadow.mapSize.set(512, 512); s.add(this.lamp);
      add(new THREE.ConeGeometry(0.14, 0.18, 10, 1, true), M.std(0xf0e0b0, { side: THREE.DoubleSide, emissive: 0x6a5020 }), 1.9, 1.15, 0.8);
      add(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6), M.std(0x333333), 1.9, 0.95, 0.8);
      add(new THREE.BoxGeometry(0.5, 0.06, 0.5), M.std(0x333a44), 1.3, 0.47, 0.3, 0, [0.5, 0.5]); add(new THREE.BoxGeometry(0.5, 0.5, 0.06), M.std(0x333a44), 1.08, 0.75, 0.3, Math.PI / 2);
      add(new THREE.BoxGeometry(0.6, 2.0, 1.2), M.std(0x8a6a4a), 2.15, 1.0, 2.2, 0, [0.6, 1.2]);
      const shelf = add(new THREE.BoxGeometry(0.3, 1.6, 0.9), M.std(0x5a3e28), -2.3, 0.8, -1.4, 0, [0.35, 0.9]);
      for (let r = 0; r < 4; r++) for (let b = 0; b < 5; b++) add(new THREE.BoxGeometry(0.18, rand(0.18, 0.28), 0.12), M.std([0xb03a2e, 0x2e6eb0, 0xe0b040, 0x3a8a4a][(r + b) % 4]), -2.25, 0.25 + r * 0.38, -1.75 + b * 0.15);
      const rug = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), M.std(0x8a3a4a, { roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.005, 0.2); s.add(rug);
    }
    // ventana con la luna y pósters
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.0), new THREE.MeshBasicMaterial({ map: canvasTex(256, 232, (g) => { const gr = g.createLinearGradient(0, 0, 0, 232); gr.addColorStop(0, '#0a1430'); gr.addColorStop(1, '#22305a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 232); g.fillStyle = '#f4ecd0'; g.beginPath(); g.arc(180, 60, 26, 0, TAU); g.fill(); for (let i = 0; i < 60; i++) { g.fillStyle = '#fff'; g.fillRect(Math.random() * 256, Math.random() * 140, 1.5, 1.5); } g.fillStyle = '#05070f'; for (let x = 0; x < 256; x += 22) g.fillRect(x, 170 - Math.random() * 50, 18, 232); g.fillStyle = '#4a3a2a'; g.fillRect(124, 0, 8, 232); g.fillRect(0, 112, 256, 8); }) }));
    win.position.set(-2.39, 1.55, -0.2); win.rotation.y = Math.PI / 2; s.add(win);
    const moon = new THREE.SpotLight(0x8fa8e0, 6, 6, 0.6, 0.8, 1.5); moon.position.set(-2.3, 2, -0.2); moon.target.position.set(0, 0, 0.2); s.add(moon, moon.target);
    const poster = (x, z, ry, col, txt) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.85), new THREE.MeshStandardMaterial({ map: canvasTex(150, 212, (g) => { g.fillStyle = col; g.fillRect(0, 0, 150, 212); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold 22px Unbounded, sans-serif'; g.fillText(txt, 12, 190); g.beginPath(); g.arc(75, 80, 40, 0, TAU); g.fill(); }) })); m.position.set(x, 1.7, z); m.rotation.y = ry; s.add(m); };
    if (!BED) { poster(2.39, -1.4, -Math.PI / 2, '#3a2a6a', 'SPACE'); poster(-0.8, 2.99, Math.PI, '#a03a2a', 'ROCK'); poster(0.6, 2.99, Math.PI, '#2a6a5a', 'OCEAN'); }
    const ceilLamp = new THREE.PointLight(0xffe2b8, 3, 7, 1.6); ceilLamp.position.set(0, H - 0.3, 0.5); s.add(ceilLamp); this.ceilLamp = ceilLamp;
    add(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0d0 }), 0, H - 0.18, 0.5);
    // fragmentos fantasma flotando detrás de la grieta (el objetivo)
    this.ghosts = [0, 1, 2].map((i) => { const f = makeFragment(i, false); f.scale.setScalar(0.35); s.add(f); f.visible = false; return f; });
    Player.reset(0, 0.6, 0, this.boxes); Look.dragPitch = 0; camera.position.set(0, 1.6, 0.6);
    this.t0 = null; this.opened = false; this.went = false;
  }
  enter() {
    HUD.setWorld('Mundo 0', 'Tu cuarto'); Audio.ambient('intro'); Input.walkEnabled = true;
    HUD.objective('Es de noche en tu cuarto. <b>Mové el celular para mirar alrededor.</b>');
    setTimeout(() => { if (!Gyro.active && Game.world === this) HUD.toast('Arrastrá el dedo a la derecha para mirar · abajo a la izquierda para caminar', 4200); }, 2500);
  }
  update(t, dt) {
    if (this.t0 == null) this.t0 = t; const k = t - this.t0;
    this.crack.userData.update(t, dt);
    // secuencia: la pared cruje → se fisura → se rompe y se abre la grieta
    if (k > 2.5 && !this._c1) { this._c1 = true; Audio.sfx.rumble(1.5); Audio.sfx.creak(new THREE.Vector3(0, 1.5, -3)); haptic([40, 40, 40]); HUD.toast('Algo cruje en la pared…', 2200); }
    if (k > 4.5 && !this.opened) {
      this.opened = true; Audio.sfx.rumble(2.5); Audio.sfx.portalOpen(); haptic([80, 40, 200]);
      this.crack.children.forEach((o) => (o.visible = true)); this.ghosts.forEach((g) => (g.visible = true));
      HUD.objective('Una grieta se abrió en la pared.<br><b>Caminá hasta ella y atravesala.</b>');
    }
    const shake = k > 2.5 && k < 6.5 ? (k > 4.5 ? 0.025 : 0.008) : 0;
    if (this.opened) {
      this.shards.forEach((sh) => { if (sh.m.position.x > -3.2) { sh.v.x -= dt * 9;   // en el espacio local de la grieta, -x es 'abajo'
        sh.m.position.addScaledVector(sh.v, dt); sh.m.rotation.x += sh.spin * dt; } });
      this.voidL.intensity = Math.min(8, this.voidL.intensity + dt * 6);
    }
    if (this.crackLight) this.crackLight.intensity *= this.opened ? 1 : 0;
    this.ceilLamp.intensity = k > 2.5 && k < 6 ? (Math.random() < 0.3 ? 0.2 : 3) : 3;
    this.ghosts.forEach((g, i) => { const a = t * 0.8 + (i * TAU) / 3; g.position.set(this.gap.c + Math.cos(a) * 0.5, 1.4 + Math.sin(a) * 0.5, -3.9); g.userData.shard.rotation.y = t + i; });
    if (this.falling) {
      this.fallT += dt; applyLook(dt); camera.position.z -= dt * 4;
      if (this.fallT > 0.4 && !this.went && !Game.busy) { this.went = true; Game.goto('ocean'); }
      return;
    }
    applyLook(dt); Player.update(dt);
    if (shake) { camera.position.x += rand(-1, 1) * shake; camera.position.y += rand(-1, 1) * shake; }
    // atravesar la grieta = cruzar el plano de la pared dentro del hueco
    if (this.opened && Player.pos.z < -3.15 && Math.abs(Player.pos.x - this.gap.c) < this.gap.hw + 0.1) {
      this.falling = true; this.fallT = 0; Audio.sfx.whoosh(); haptic([60, 40, 200]);
    }
  }
}
