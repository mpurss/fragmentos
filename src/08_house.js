/* =====================================================================
   8. MUNDO 3 — CASA EMBRUJADA: terror, linterna, eventos ambientales,
      entidad ciega que sigue el ruido (micrófono), caja fuerte y derrumbe
   ===================================================================== */
class HouseWorld extends BaseWorld {
  build() {
    const s = this.scene; this.boxes = []; this.doors = []; this.lamps = []; this.inter = []; this.props = {}; this.debris = [];
    s.background = new THREE.Color(0x020203); s.fog = new THREE.FogExp2(0x030304, 0.12);
    s.add(new THREE.HemisphereLight(0x3a4a66, 0x0a0806, 0.12));
    this.code = [0, 0, 0, 0].map(() => Math.floor(Math.random() * 10)); this.found = [false, false, false, false];
    this.mats(); this.buildShell(); this.buildFurniture(); this.buildNumbers(); this.buildSafe(); this.buildEntity(); this.buildDust();
    // linterna (luz dinámica clave) sujeta a la cámara
    this.flash = new THREE.SpotLight(0xffeccc, 32, 15, 0.48, 0.5, 1.4); this.flash.castShadow = true; this.flash.shadow.mapSize.set(512, 512); this.flash.shadow.bias = -0.002;
    this.flashTarget = new THREE.Object3D(); this.flashTarget.position.set(0, -0.15, -1); this.flash.position.set(0.12, -0.12, 0); this.flash.target = this.flashTarget;
    camera.add(this.flash, this.flashTarget); s.add(camera);
    this.portal = new Portal(1.3); this.portal.group.position.set(0, 1.45, -25.6); s.add(this.portal.group);
    Player.reset(0, 2.6, 0, this.boxes); Player.speed = 2.0; this.prev = Player.pos.clone();
    this.phase = 'explore'; this.heard = 0; this.graceT = 8; this.nextEvent = 6; this.beatT = 0; this.shake = 0; this.safeOpen = false; this.fragTaken = false;
  }
  exit() { camera.remove(this.flash, this.flashTarget); Player.speed = 2.4; }
  mats() {
    this.wallMat = new THREE.MeshStandardMaterial({ roughness: 0.95, map: canvasTex(256, 256, (g) => {
      g.fillStyle = '#2e2620'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(90,70,50,.35)'; g.lineWidth = 2; for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) { g.beginPath(); g.moveTo(x + 16, y); g.quadraticCurveTo(x + 30, y + 16, x + 16, y + 32); g.quadraticCurveTo(x + 2, y + 16, x + 16, y); g.stroke(); }
      for (let i = 0; i < 40; i++) { const gr = g.createRadialGradient(Math.random() * 256, Math.random() * 256, 0, 0, 0, 0); g.fillStyle = `rgba(10,6,3,${Math.random() * 0.35})`; g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, Math.random() * 30, Math.random() * 50, 0, 0, TAU); g.fill(); }
      g.fillStyle = '#15100c'; g.fillRect(0, 196, 256, 60); g.fillStyle = '#0c0907'; g.fillRect(0, 192, 256, 5);
    }, [2, 1]) });
    this.floorMat = new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(256, 256, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(25,${25 + Math.random() * 10}%,${9 + Math.random() * 6}%)`; g.fillRect(0, i * 32, 256, 31); g.fillStyle = '#050302'; g.fillRect(0, i * 32 + 31, 256, 1); g.fillRect((i * 97) % 256, i * 32, 2, 32); } for (let k = 0; k < 300; k++) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(Math.random() * 256, Math.random() * 256, 8, 1); } }, [8, 16]) });
    this.wood = M.std(0x2a1a10, { roughness: 0.85 }); this.darkWood = M.std(0x160e08, { roughness: 0.9 }); this.cloth = M.std(0x5a5446, { roughness: 1 });
  }
  wall(x0, z0, x1, z1, h = 3) {
    const w = Math.abs(x1 - x0) || 0.2, d = Math.abs(z1 - z0) || 0.2, x = (x0 + x1) / 2, z = (z0 + z1) / 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.wallMat); m.position.set(x, h / 2, z); m.receiveShadow = true; m.castShadow = true; this.scene.add(m);
    const b = box(x, z, w, d); this.boxes.push(b); return { m, b };
  }
  buildShell() {
    const s = this.scene;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 34), this.floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -11); floor.receiveShadow = true; s.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 30), M.std(0x0e0b09)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3, -9.5); s.add(ceil);
    // vestíbulo
    this.wall(-4, 4, 4, 4); this.wall(-4, 4, -4, -4); this.wall(4, 4, 4, -4); this.wall(-7, -4, -0.8, -4); this.wall(0.8, -4, 7, -4);
    // pasillo
    this.wall(-1.3, -4, -1.3, -6.6); this.wall(-1.3, -7.8, -1.3, -12.4); this.wall(-1.3, -13.6, -1.3, -16);
    this.wall(1.3, -4, 1.3, -6.6); this.wall(1.3, -7.8, 1.3, -16);
    // habitaciones
    this.wall(-7, -4, -7, -16); this.wall(-7, -10, -1.3, -10); this.wall(-7, -16, -0.8, -16);
    this.wall(7, -4, 7, -10); this.wall(1.3, -10, 7, -10); this.wall(0.8, -16, 4, -16);
    // sala final (caja fuerte) — la pared del fondo se derrumba al final
    this.wall(-4, -16, -4, -23); this.wall(4, -16, 4, -23);
    this.backL = this.wall(-4, -23, 0, -23); this.backR = this.wall(0, -23, 4, -23);
    // más allá: vacío del derrumbe
    this.boxes.push(box(-3, -25, 0.2, 5), box(3, -25, 0.2, 5), box(0, -27.6, 6, 0.2));
    const rubble = new THREE.Mesh(jitter(new THREE.CylinderGeometry(3.2, 2.2, 1.2, 9, 2), 0.25), M.std(0x1a1614)); rubble.position.set(0, -0.6, -25.3); s.add(rubble);
    // puerta de entrada (bloqueada) y ventanas tapiadas con luz de luna
    const fdoor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.1), this.darkWood); fdoor.position.set(0, 1.2, 3.85); s.add(fdoor);
    const moonWin = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 1.7, z); g.rotation.y = ry; s.add(g); const w = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.3), new THREE.MeshBasicMaterial({ color: 0x1d2c4a })); g.add(w); for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.14, 0.05), this.wood); b.position.set(0, -0.4 + i * 0.4, 0.04); b.rotation.z = rand(-0.25, 0.25); g.add(b); } const l = new THREE.SpotLight(0x6f8fd0, 6, 7, 0.6, 0.8, 1.5); l.position.set(0, 0.2, 0.3); const tg = new THREE.Object3D(); tg.position.set(0, -1.6, 3); g.add(l, tg); l.target = tg; };
    moonWin(-6.88, -7, Math.PI / 2); moonWin(6.88, -7, -Math.PI / 2); moonWin(-3.88, 0, Math.PI / 2); moonWin(-6.88, -13, Math.PI / 2);
    // puertas con bisagra (se cierran de golpe en los eventos)
    this.addDoor(-1.3, -6.6, 1.2, 'z', 1); this.addDoor(1.3, -6.6, 1.2, 'z', -1); this.addDoor(-1.3, -12.4, 1.2, 'z', 1); this.addDoor(-0.8, -16, 1.6, 'x', 1);
    // lámparas de techo (algunas parpadean)
    const lamp = (x, z, power) => { const g = new THREE.Group(); g.position.set(x, 2.55, z); s.add(g); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.45, 4), M.basic(0x111111)); cord.position.y = 0.22; g.add(cord); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb066 })); g.add(bulb); const l = new THREE.PointLight(0xff9a4a, power, 6, 1.8); g.add(l); this.lamps.push({ g, l, bulb, base: power, ph: rand(0, 10) }); };
    lamp(0, 0.5, 5); lamp(0, -8, 2.5); lamp(0, -14, 1.8); lamp(-4, -7, 1.5); lamp(4, -7, 2.4); lamp(-4, -13, 1.2); lamp(0, -19.5, 2.2);
  }
  addDoor(x, z, w, axis, dir) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0, z); this.scene.add(pivot);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(axis === 'z' ? 0.06 : w, 2.4, axis === 'z' ? w : 0.06), this.darkWood); panel.castShadow = true;
    if (axis === 'z') panel.position.set(0, 1.2, -w / 2); else panel.position.set(w / 2, 1.2, 0);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), M.std(0x8a7040, { metalness: 0.8 })); knob.position.set(axis === 'z' ? 0.06 : w * 0.42, 0, axis === 'z' ? -w * 0.42 : 0.06); panel.add(knob);
    pivot.add(panel);
    const closedBox = axis === 'z' ? box(x, z - w / 2, 0.15, w) : box(x + w / 2, z, w, 0.15); closedBox.off = true; this.boxes.push(closedBox);
    const d = { pivot, open: 1, target: 1, openAngle: dir * (Math.PI / 2) * 0.95, box: closedBox, timer: 0, center: axis === 'z' ? new THREE.Vector3(x, 1.2, z - w / 2) : new THREE.Vector3(x + w / 2, 1.2, z), speed: 1 };
    pivot.rotation.y = d.openAngle; this.doors.push(d);
  }
  buildFurniture() {
    const s = this.scene, W = this.wood, D = this.darkWood;
    const add = (geo, mat, x, y, z, ry = 0, rz = 0, collide) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.rotation.z = rz; m.castShadow = true; m.receiveShadow = true; s.add(m); if (collide) this.boxes.push(box(x, z, collide[0], collide[1])); return m; };
    const chair = (x, z, ry, fallen) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; s.add(g); const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.45), W); seat.position.y = 0.45; g.add(seat); const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.05), W); back.position.set(0, 0.78, -0.2); g.add(back); for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), W); l.position.set(a, 0.22, b); g.add(l); } g.traverse((o) => (o.castShadow = true)); if (fallen) { g.rotation.z = Math.PI / 2; g.position.y = 0.25; } return g; };
    // vestíbulo: reloj de pie, consola con velas, perchero, escalera rota
    const clock = add(new THREE.BoxGeometry(0.5, 2.2, 0.35), D, 3.6, 1.1, 1.8, 0, 0, [0.5, 0.4]);
    this.pendulum = new THREE.Group(); this.pendulum.position.set(3.4, 1.5, 1.8); s.add(this.pendulum);
    const pend = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 10), M.std(0x8a7040, { metalness: 0.8 })); pend.rotation.z = Math.PI / 2; pend.position.y = -0.55; this.pendulum.add(pend);
    add(new THREE.BoxGeometry(1.4, 0.08, 0.45), W, -3.6, 0.85, -1.5, Math.PI / 2, 0, [0.5, 1.4]); add(new THREE.BoxGeometry(1.3, 0.8, 0.4), D, -3.6, 0.4, -1.5, Math.PI / 2);
    this.candles = [];
    for (let i = 0; i < 3; i++) { const c = add(new THREE.CylinderGeometry(0.03, 0.03, 0.18 + i * 0.05, 6), M.std(0xd8d0b8), -3.6, 0.98 + i * 0.025, -1.8 + i * 0.3); const f = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 5), new THREE.MeshBasicMaterial({ color: 0xffb040 })); f.position.set(-3.6, 1.1 + i * 0.05, -1.8 + i * 0.3); s.add(f); this.candles.push(f); }
    this.candleLight = new THREE.PointLight(0xff8a30, 1.6, 4, 1.8); this.candleLight.position.set(-3.4, 1.3, -1.5); s.add(this.candleLight);
    for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(1.6, 0.2, 0.4), W, 2.8, 0.1 + i * 0.2, -3.0 + i * 0.0, 0, 0).position.z = -0.8 - i * 0.4;
    this.boxes.push(box(2.8, -1.8, 1.6, 2.4));
    // pasillo: alfombra, cuadros torcidos, mesita, silla caída
    add(new THREE.PlaneGeometry(1.2, 11), M.std(0x3a0e0c), 0, 0.005, -10).rotation.x = -Math.PI / 2;
    this.frames = [];
    const darkPortrait = canvasTex(128, 160, (g) => { g.fillStyle = '#0d0a08'; g.fillRect(0, 0, 128, 160); g.fillStyle = '#2a221c'; g.beginPath(); g.ellipse(64, 70, 30, 40, 0, 0, TAU); g.fill(); g.fillRect(24, 110, 80, 50); g.fillStyle = '#000'; g.fillRect(44, 60, 14, 8); g.fillRect(70, 60, 14, 8); g.strokeStyle = '#3a0000'; g.lineWidth = 3; g.beginPath(); g.moveTo(52, 64); g.lineTo(50, 100); g.moveTo(78, 64); g.lineTo(80, 96); g.stroke(); });
    const pic = (x, z, ry, tilt) => { const g = new THREE.Group(); g.position.set(x, 1.7, z); g.rotation.y = ry; g.rotation.z = tilt; s.add(g); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.05), M.std(0x3a2a14, { metalness: 0.5 }))); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.62), new THREE.MeshStandardMaterial({ map: darkPortrait })); p.position.z = 0.03; g.add(p); this.frames.push(g); return g; };
    pic(-1.18, -5.4, Math.PI / 2, 0.1); pic(-1.18, -9.2, Math.PI / 2, -0.15); pic(1.18, -9, -Math.PI / 2, 0.05); pic(1.18, -12.5, -Math.PI / 2, 0.2); pic(1.18, -14.8, -Math.PI / 2, -0.1);
    chair(0.6, -11.4, 0.4, true);
    // habitación L1: dormitorio (cama, ropero, mecedora)
    add(new THREE.BoxGeometry(1.5, 0.35, 2.1), D, -5.8, 0.35, -5.3, 0, 0, [1.5, 2.1]); add(new THREE.BoxGeometry(1.4, 0.16, 1.9), this.cloth, -5.8, 0.6, -5.3, 0, 0.03);
    add(new THREE.BoxGeometry(1.5, 1.1, 0.08), D, -5.8, 0.9, -4.25);
    add(new THREE.BoxGeometry(1.2, 2.3, 0.6), D, -2.2, 1.15, -9.5, 0, 0, [1.2, 0.6]);
    this.rocker = chair(-4.0, -8.6, 0.6); this.rocker.position.y = 0;
    // habitación R1: comedor (mesa larga, sillas, candelabro que se balancea)
    add(new THREE.BoxGeometry(1.1, 0.08, 3.4), W, 4.4, 0.78, -7, 0, 0, [1.1, 3.4]);
    for (const [lx, lz] of [[3.95, -5.4], [4.85, -5.4], [3.95, -8.6], [4.85, -8.6]]) add(new THREE.BoxGeometry(0.07, 0.78, 0.07), W, lx, 0.39, lz);
    this.chairs = [chair(3.4, -6.2, Math.PI / 2), chair(3.4, -7.6, Math.PI / 2), chair(5.4, -6.6, -Math.PI / 2)];
    this.chandelier = new THREE.Group(); this.chandelier.position.set(4.4, 3, -7); s.add(this.chandelier);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.025, 4, 12), M.std(0x5a4a2a, { metalness: 0.8 })); ring.rotation.x = Math.PI / 2; ring.position.y = -0.9; this.chandelier.add(ring);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.9, 4), M.basic(0x111111)); chain.position.y = -0.45; this.chandelier.add(chain);
    for (let i = 0; i < 6; i++) { const p = add(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 8), M.std(0xbab4a6), 4.4 + rand(-0.3, 0.3), 0.83, -7 + (i - 2.5) * 0.5); }
    // habitación L2: biblioteca (estantes, escritorio, libros tirados)
    const shelf = (x, z, ry, fallen) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; s.add(g); const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.4), D); frame.position.y = 1.2; g.add(frame); for (let r = 0; r < 4; r++) for (let b = 0; b < 9; b++) { if (Math.random() < 0.2) continue; const bk = new THREE.Mesh(new THREE.BoxGeometry(0.12, rand(0.25, 0.38), 0.28), M.std([0x3a1010, 0x10203a, 0x2a2a10, 0x1a1a1a][(r + b) % 4])); bk.position.set(-0.68 + b * 0.16, 0.35 + r * 0.55, 0.08); bk.rotation.z = Math.random() < 0.15 ? 0.3 : 0; g.add(bk); } g.traverse((o) => (o.castShadow = true)); if (fallen) { g.rotation.x = -1.3; g.position.y = 0.2; } return g; };
    shelf(-6.75, -12, Math.PI / 2); shelf(-6.75, -14.2, Math.PI / 2); this.boxes.push(box(-6.6, -13.1, 0.6, 4));
    shelf(-3.5, -15.6, 0, false); this.boxes.push(box(-3.5, -15.6, 1.6, 0.5));
    add(new THREE.BoxGeometry(1.3, 0.06, 0.7), W, -3.6, 0.78, -11.2, 0, 0, [1.3, 0.7]); add(new THREE.BoxGeometry(1.2, 0.72, 0.6), D, -3.6, 0.38, -11.2);
    for (let i = 0; i < 9; i++) { const p = add(new THREE.PlaneGeometry(0.21, 0.29), M.std(0xbdb5a0, { side: THREE.DoubleSide }), -3 + rand(-1.5, 1.5), 0.01, -13 + rand(-1.5, 1.5)); p.rotation.x = -Math.PI / 2; p.rotation.z = rand(0, 3); }
    // sala final: ventana tapiada, velas, círculo en el piso
    const circle = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.18, 40), new THREE.MeshStandardMaterial({ color: 0x5a0a0a, roughness: 1 })); circle.rotation.x = -Math.PI / 2; circle.position.set(0.8, 0.006, -19.8); s.add(circle);
    // telarañas en esquinas
    const webTex = canvasTex(128, 128, (g) => { g.strokeStyle = 'rgba(220,220,220,.55)'; g.lineWidth = 1; for (let a = 0; a < 7; a++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos((a / 6) * Math.PI / 2) * 128, Math.sin((a / 6) * Math.PI / 2) * 128); g.stroke(); } for (let r = 16; r < 128; r += 14) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI / 2); g.stroke(); } });
    const web = (x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({ map: webTex, transparent: true, side: THREE.DoubleSide, depthWrite: false })); m.position.set(x, y, z); m.rotation.y = ry; m.rotation.z = Math.PI; s.add(m); };
    web(-3.6, 2.6, 3.6, Math.PI / 4); web(3.6, 2.6, -3.6, Math.PI / 4); web(-1, 2.6, -15.6, 0); web(-6.6, 2.6, -4.4, Math.PI / 4); web(6.6, 2.6, -9.6, -Math.PI / 4); web(3.6, 2.6, -22.6, 0);
    // cartel de advertencia (diseño original: "un ente ciego que sigue el ruido")
    const warn = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshStandardMaterial({ transparent: true, map: canvasTex(512, 280, (g) => { g.fillStyle = 'rgba(110,8,8,.92)'; g.font = 'bold 74px "Unbounded", sans-serif'; g.save(); g.translate(30, 100); g.rotate(-0.04); g.fillText('SILENCIO', 0, 0); g.restore(); g.font = 'bold 36px Manrope, sans-serif'; g.fillText('NO VE.', 40, 170); g.fillText('TE ESCUCHA.', 40, 225); for (let i = 0; i < 18; i++) { g.fillRect(40 + Math.random() * 400, 106 + Math.random() * 8, 3, Math.random() * 60); } }) }));
    warn.position.set(-2.4, 1.75, -3.84); s.add(warn);
  }
  buildNumbers() {
    this.numbers = [];
    const spots = [[3.84, 1.6, -1.0, -Math.PI / 2], [-6.84, 1.5, -7.6, Math.PI / 2], [6.84, 1.3, -5.6, -Math.PI / 2], [-4.6, 1.8, -15.39, 0]];
    const roman = ['I', 'II', 'III', 'IV'];
    spots.forEach(([x, y, z, ry], i) => {
      const tex = canvasTex(256, 256, (g) => { g.fillStyle = 'rgba(120,10,6,.95)'; g.font = 'bold 44px "Unbounded", sans-serif'; g.fillText(roman[i], 24, 60); g.font = 'bold 150px "Unbounded", sans-serif'; g.save(); g.translate(70, 210); g.rotate(rand(-0.15, 0.15)); g.fillText(String(this.code[i]), 0, 0); g.restore(); for (let k = 0; k < 10; k++) g.fillRect(80 + Math.random() * 100, 200 + Math.random() * 10, 3, Math.random() * 45); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9 }));
      m.position.set(x, y, z); m.rotation.y = ry; this.scene.add(m); this.numbers.push(m);
    });
  }
  buildSafe() {
    const s = this.scene; const g = this.safe = new THREE.Group(); g.position.set(-3.45, 0, -19.6); g.rotation.y = Math.PI / 2; s.add(g);
    const metal = M.std(0x1f3a2c, { metalness: 0.7, roughness: 0.45 });
    // cuerpo hueco (paneles) para que el fragmento quede realmente adentro
    const panel = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), metal); m.position.set(x, y, z); m.castShadow = true; g.add(m); };
    panel(0.95, 1.1, 0.08, 0, 0.55, -0.46); panel(0.08, 1.1, 0.8, -0.435, 0.55, -0.1); panel(0.08, 1.1, 0.8, 0.435, 0.55, -0.1);
    panel(0.95, 0.08, 0.8, 0, 0.04, -0.1); panel(0.95, 0.08, 0.8, 0, 1.06, -0.1);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.7), M.std(0x0e1a14)); shelf.position.set(0, 0.42, -0.1); g.add(shelf);
    this.boxes.push(box(-3.45, -19.6, 0.9, 1.0));
    this.safeHinge = new THREE.Group(); this.safeHinge.position.set(-0.47, 0, 0.32); g.add(this.safeHinge);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.05, 0.08), M.std(0x2a4a38, { metalness: 0.75, roughness: 0.35 })); door.position.set(0.46, 0.57, 0.02); this.safeHinge.add(door);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.12), new THREE.MeshStandardMaterial({ transparent: true, map: canvasTex(256, 44, (c) => { c.fillStyle = '#c9b27a'; c.font = 'bold 26px Manrope'; ['I', 'II', 'III', 'IV'].forEach((r, i) => c.fillText(r, 16 + i * 62, 32)); }) }));
    label.position.set(0.46, 0.98, 0.065); this.safeHinge.add(label);
    this.dials = []; this.digits = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const x = 0.12 + i * 0.16;
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 80; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.14), new THREE.MeshBasicMaterial({ map: tex })); disp.position.set(x, 0.78, 0.065); this.safeHinge.add(disp);
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.05, 12), M.std(0xb8a070, { metalness: 0.8, roughness: 0.3 })); knob.rotation.x = Math.PI / 2; knob.position.set(x, 0.58, 0.085);
      const notch = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.045), M.basic(0x111111)); notch.position.set(0, 0.03, 0.045); knob.add(notch); notch.rotation.x = -Math.PI / 2; notch.position.set(0, 0.03, 0); notch.position.set(0, 0.03, 0);
      knob.userData.dial = i; this.safeHinge.add(knob); this.inter.push(knob);
      this.dials.push({ knob, cv, tex });
    }
    this.drawDials();
    this.frag = makeFragment(2); this.frag.scale.setScalar(0.32); this.frag.position.set(0, 0.68, -0.1); this.frag.userData.baseY = 0.68; g.add(this.frag);
    this.frag.userData.light.intensity = 0;
    const lamp = new THREE.PointLight(0x9a3a20, 1.2, 4); lamp.position.set(-2, 2.4, -19.6); s.add(lamp);
  }
  drawDials() {
    this.dials.forEach((d, i) => { const g = d.cv.getContext('2d'); g.fillStyle = '#0b0d0b'; g.fillRect(0, 0, 64, 80); g.fillStyle = this.safeOpen ? '#46e6a5' : '#e8d9a8'; g.font = 'bold 56px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText(String(this.digits[i]), 32, 60); d.tex.needsUpdate = true; });
  }
  buildEntity() {
    const e = this.entity = new THREE.Group(); const black = new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 1, flatShading: true });
    const torso = new THREE.Mesh(jitter(new THREE.CylinderGeometry(0.2, 0.13, 1.1, 6, 3), 0.04), black); torso.position.y = 1.55; e.add(torso);
    const legs = [-0.09, 0.09].map((x) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 1.05, 5), black); l.position.set(x, 0.52, 0); e.add(l); return l; });
    this.eArms = [-0.26, 0.26].map((x) => { const p = new THREE.Group(); p.position.set(x, 2.02, 0); const a = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 1.35, 5), black); a.position.y = -0.67; p.add(a); const hand = new THREE.Mesh(jitter(new THREE.ConeGeometry(0.05, 0.3, 5), 0.02), black); hand.position.y = -1.45; hand.rotation.x = Math.PI; p.add(hand); e.add(p); return p; });
    this.eHead = new THREE.Group(); this.eHead.position.y = 2.28; e.add(this.eHead);
    const head = new THREE.Mesh(jitter(new THREE.SphereGeometry(0.16, 7, 6), 0.03), black); head.scale.set(0.9, 1.35, 1); this.eHead.add(head);
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.13), new THREE.MeshBasicMaterial({ color: 0x000000 })); mouth.position.set(0, -0.06, 0.15); this.eHead.add(mouth);
    const pale = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 1, transparent: true, opacity: 0.35 })); pale.position.set(0, 0.02, 0.148); this.eHead.add(pale);
    e.traverse((o) => (o.castShadow = true)); this.scene.add(e);
    // grafo de puntos de recorrido (el ente deambula por toda la casa)
    const N = this.nodes = { F: [0, 0.5], F1: [-2.5, 2], F2: [2.4, 2.2], C1: [0, -5.2], C2: [0, -7.2], L1d: [-2.2, -7.2], L1: [-4.6, -7.2], R1d: [2.2, -7.2], R1: [2.6, -8.8], C3: [0, -10], C4: [0, -13], L2d: [-2.2, -13], L2: [-4.6, -12.8], C5: [0, -15.2], E: [0, -18.8], E2: [2.4, -20.8] };
    this.edges = { F: ['F1', 'F2', 'C1'], F1: ['F'], F2: ['F'], C1: ['F', 'C2'], C2: ['C1', 'L1d', 'R1d', 'C3'], L1d: ['C2', 'L1'], L1: ['L1d'], R1d: ['C2', 'R1'], R1: ['R1d'], C3: ['C2', 'C4'], C4: ['C3', 'L2d', 'C5'], L2d: ['C4', 'L2'], L2: ['L2d'], C5: ['C4', 'E'], E: ['C5', 'E2'], E2: ['E'] };
    this.ent = { node: 'E', path: [], hunt: false, target: null, wait: 0, speed: 0.7, stepT: 0, lost: 0 };
    e.position.set(N.E[0], 0, N.E[1]);
    this.shadowFig = e.clone(); this.shadowFig.visible = false; this.scene.add(this.shadowFig);
  }
  buildDust() {
    const n = 220, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) p.set([rand(-4, 4), rand(0, 3), rand(-4, 4)], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbfb2a0, size: 0.018, transparent: true, opacity: 0.5, depthWrite: false })); this.scene.add(this.dust);
  }

  /* ---------- entidad: recorrido, audición y persecución ---------- */
  nearestNode(p) { let best = null, bd = 1e9; for (const k in this.nodes) { const [x, z] = this.nodes[k]; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = k; } } return best; }
  pathTo(from, to) {
    const prev = { [from]: null }, q = [from];
    while (q.length) { const n = q.shift(); if (n === to) break; for (const m of this.edges[n]) if (!(m in prev)) { prev[m] = n; q.push(m); } }
    const path = []; let c = to; while (c && c !== from) { path.unshift(c); c = prev[c]; } return path;
  }
  hear(pos) {
    const en = this.ent; en.hunt = true; en.target = pos.clone(); en.speed = 1.2; en.lost = 4;
    en.path = this.pathTo(this.nearestNode(this.entity.position), this.nearestNode(pos));
    Audio.sfx.breath(this.entity.position.clone().setY(2)); setTimeout(() => Audio.sfx.whisper(this.entity.position.clone().setY(2)), 300);
    HUD.toast('La entidad te ESCUCHÓ…', 1800, true); haptic([50, 30, 50]); HUD.red(300);
  }
  updateEntity(t, dt) {
    const e = this.entity, en = this.ent;
    if (!en.path.length) {
      if (en.hunt && en.target && e.position.distanceTo(en.target.clone().setY(0)) > 0.4 && en.lost > 0) { en.direct = true; }
      else { en.direct = false; en.wait -= dt; if (en.wait <= 0) { en.hunt = false; en.speed = 0.7; const all = this.edges[en.node]; const far = all.filter((k) => Math.hypot(this.nodes[k][0] - Player.pos.x, this.nodes[k][1] - Player.pos.z) > 3.2); const opts = far.length ? far : all; const nxt = opts[Math.floor(Math.random() * opts.length)]; en.path = [nxt]; en.wait = rand(0.5, 2.5); } }
    }
    let goal = null;
    if (en.path.length) { const [x, z] = this.nodes[en.path[0]]; goal = new THREE.Vector3(x, 0, z); }
    else if (en.direct) goal = en.target.clone().setY(0);
    if (goal) {
      const dir = goal.clone().sub(e.position); const d = dir.length();
      if (d < 0.15) { if (en.path.length) en.node = en.path.shift(); else en.direct = false; }
      else { dir.normalize(); e.position.addScaledVector(dir, Math.min(d, en.speed * dt)); e.rotation.y = damp(e.rotation.y, Math.atan2(dir.x, dir.z), 4, dt); }
      en.stepT -= dt * en.speed; if (en.stepT <= 0) { en.stepT = 0.75; Audio.sfx.step(e.position.clone(), en.hunt ? 0.5 : 0.28); }
    }
    en.lost -= dt;
    // abre las puertas cerradas que encuentra a su paso
    this.doors.forEach((dd) => { if (dd.target === 0 && dd.center.distanceTo(e.position.clone().setY(1.2)) < 1.0) { dd.target = 1; dd.speed = 3; Audio.sfx.creak(dd.center); } });
    // animación inquietante
    this.eArms.forEach((a, i) => (a.rotation.x = Math.sin(t * (en.hunt ? 6 : 1.6) + i * Math.PI) * (en.hunt ? 0.5 : 0.18)));
    this.eHead.rotation.z = Math.sin(t * 0.7) * 0.25 + (Math.random() < 0.02 ? rand(-0.6, 0.6) : 0);
    this.eHead.rotation.y = Math.sin(t * 0.4) * 0.6;
    const dist = Math.hypot(e.position.x - Player.pos.x, e.position.z - Player.pos.z);
    State.dangerLevel = clamp(1 - dist / 8, 0, 1);
    if (dist < 6) { this.beatT -= dt; if (this.beatT <= 0) { this.beatT = 0.45 + dist * 0.15; Audio.sfx.heartbeat(0.15 + (1 - dist / 6) * 0.45); if (dist < 3) haptic(25); } }
    if (dist < 0.8 || (en.hunt && dist < 1.0)) this.caught();
  }
  caught() {
    if (this.scaring) return; this.scaring = true; Player.frozen = true; Input.cancelAll();
    const e = this.entity; const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    e.position.copy(camera.position).add(fwd.multiplyScalar(0.55)); e.position.y = camera.position.y - 2.15; e.lookAt(camera.position.x, e.position.y, camera.position.z);
    const red = new THREE.PointLight(0xff0010, 6, 3); red.position.copy(camera.position); this.scene.add(red);
    Audio.sfx.scream(); haptic([300, 80, 400]); HUD.red(1200); this.shake = 0.12;
    const sc = $('scare'); setTimeout(() => (sc.style.opacity = 1), 700);
    setTimeout(() => {
      this.scene.remove(red); Player.reset(0, 2.6, 0, this.boxes); Player.frozen = false;
      const [x, z] = this.nodes.E; e.position.set(x, 0, z); Object.assign(this.ent, { node: 'E', path: [], hunt: false, target: null, wait: 2, speed: 0.7, direct: false });
      sc.style.opacity = 0; this.scaring = false; this.heard = 0; this.graceT = 6;
      HUD.toast('Te atrapó. Volviste a la entrada… hacé silencio', 3000, true);
    }, 1700);
  }

  /* ---------- eventos de terror durante la exploración ---------- */
  horrorEvent() {
    const pick1 = (a) => a[Math.floor(Math.random() * a.length)];
    const ev = pick1(['slam', 'slam', 'flicker', 'chair', 'frame', 'shadow', 'knock', 'steps', 'whisper', 'rocker']);
    const pp = Player.pos;
    if (ev === 'slam') {
      const cands = this.doors.filter((d) => d.target === 1 && d.center.distanceTo(new THREE.Vector3(pp.x, 1.2, pp.z)) > 1.6 && d.center.distanceTo(new THREE.Vector3(pp.x, 1.2, pp.z)) < 9);
      if (cands.length) { const d = pick1(cands); d.target = 0; d.speed = 9; d.timer = rand(1.8, 2.8); setTimeout(() => { Audio.sfx.slam(d.center); haptic(120); this.shake = 0.05; }, 120); return; }
    }
    if (ev === 'flicker' || ev === 'slam') { this.blackout = 1.6; Audio.sfx.creak(); return; }
    if (ev === 'chair') { const c = pick1(this.chairs); c.userData.slide = { t: 0, from: c.position.clone(), to: c.position.clone().add(new THREE.Vector3(rand(-0.7, 0.7), 0, rand(-0.7, 0.7))) }; Audio.noise(0.7, 0.25, 'bandpass', 300, 3, Audio.spatial(c.position)); return; }
    if (ev === 'frame') { const f = this.frames.find((fr) => !fr.userData.fallen); if (f) { f.userData.fallen = { v: 0 }; setTimeout(() => Audio.sfx.drop(f.position), 500); } return; }
    if (ev === 'shadow') {
      const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
      const p = pp.clone().add(fwd.multiplyScalar(rand(4, 6)));
      ray.set(new THREE.Vector3(pp.x, 1.5, pp.z), new THREE.Vector3(p.x - pp.x, 0, p.z - pp.z).normalize());
      const hit = ray.intersectObjects(this.scene.children.filter((o) => o.isMesh), false)[0];
      if (hit && hit.distance < 2.5) return;
      if (hit) p.copy(pp).add(new THREE.Vector3(p.x - pp.x, 0, p.z - pp.z).normalize().multiplyScalar(hit.distance - 0.6));
      this.shadowFig.position.set(p.x, 0, p.z); this.shadowFig.lookAt(pp.x, 0, pp.z); this.shadowFig.visible = true; Audio.sfx.whisper(p.clone().setY(2));
      setTimeout(() => { this.shadowFig.visible = false; this.blackout = 0.3; }, 380); return;
    }
    if (ev === 'knock') { Audio.sfx.knock(new THREE.Vector3(pp.x + rand(-4, 4), 1.5, pp.z + rand(-4, 4))); return; }
    if (ev === 'steps') { const start = new THREE.Vector3(pp.x - 4, 3, pp.z); for (let i = 0; i < 6; i++) setTimeout(() => Audio.sfx.step(start.clone().add(new THREE.Vector3(i * 1.4, 0, 0)), 0.5), i * 520); return; }
    if (ev === 'whisper') { Audio.sfx.whisper(new THREE.Vector3(pp.x + rand(-2, 2), 1.6, pp.z + rand(-2, 2))); return; }
    if (ev === 'rocker') { this.rockT = 6; Audio.sfx.creak(this.rocker.position); }
  }

  /* ---------- interacción con la caja fuerte ---------- */
  onTap(ndc) {
    const hit = pick(ndc, this.inter.concat(this.safeOpen && !this.fragTaken ? [this.frag] : [])); if (!hit) return;
    if (hit.distance > 2.3) { HUD.toast('Acercate más', 1000); return; }
    let o = hit.object;
    if (o.userData.dial != null && !this.safeOpen) {
      const i = o.userData.dial; this.digits[i] = (this.digits[i] + 1) % 10; o.rotation.y -= TAU / 10; Audio.sfx.dial(); haptic(8); this.drawDials();
      if (this.digits.every((d, k) => d === this.code[k])) this.openSafe();
      return;
    }
    while (o && o !== this.frag) o = o.parent;
    if (o === this.frag) this.takeFragment();
  }
  openSafe() {
    this.safeOpen = true; this.drawDials(); Audio.sfx.unlock(); setTimeout(() => Audio.sfx.creak(this.safe.position), 300); haptic([30, 30, 80]);
    this.frag.userData.light.intensity = 2.2; HUD.toast('La caja fuerte se abrió', 2000);
    HUD.objective('<b>Tomá el fragmento azul</b> de la caja fuerte.');
  }
  takeFragment() {
    if (this.fragTaken) return; this.fragTaken = true; collectFragment(this.frag, 'hauntedHouse', this.scene);
    setTimeout(() => this.startCollapse(), 1200);
  }
  startCollapse() {
    this.phase = 'collapse'; this.shake = 0.06; Audio.sfx.rumble(4); Audio.sfx.scream(); haptic([200, 100, 200, 100, 400]);
    HUD.toast('¡La casa se derrumba!', 2500, true); HUD.objective('El espacio se rompe. <b>Corré hacia el portal</b> detrás de la pared caída.');
    [this.backL, this.backR].forEach((w, i) => { w.b.off = true; w.fall = { t: 0, side: i ? 1 : -1 }; });
    setTimeout(() => this.portal.unlock(), 900);
  }
  enter() {
    HUD.setWorld('Mundo 3', 'Casa embrujada'); Audio.ambient('house'); Input.walkEnabled = true;
    HUD.objective('Encontrá los <b>4 números</b> escritos en las paredes y abrí la caja fuerte.<br>Pistas: I=? · II=? · III=? · IV=?');
    setTimeout(() => HUD.toast(State.sensors.micAllowed ? 'Algo escucha. Tu micrófono te delata: no hagas ruido' : 'Algo escucha. No corras: tus pasos te delatan', 3800, true), 2500);
  }
  clueText() { return 'Pistas: ' + ['I', 'II', 'III', 'IV'].map((r, i) => r + '=' + (this.found[i] ? '<b>' + this.code[i] + '</b>' : '?')).join(' · '); }
  update(t, dt) {
    this.t = t; applyLook(dt); this.prev.copy(Player.pos); Player.update(dt, true);
    // sacudón de cámara
    if (this.shake > 0) { camera.position.x += rand(-1, 1) * this.shake; camera.position.y += rand(-1, 1) * this.shake; camera.rotation.z += rand(-1, 1) * this.shake * 0.3; if (this.phase !== 'collapse') this.shake = Math.max(0, this.shake - dt * 0.15); }
    // ruido: micrófono + pasos rápidos
    const thr = Math.max(State.gameplay.noiseThreshold + 0.12, 0.42);   // más tolerante: solo ruidos fuertes (voz alta, golpes)
    const noise = Math.max(State.audioMetrics.volume, Player.noise);
    HUD.meter(this.phase !== 'collapse', 'RUIDO', noise, thr, noise > thr ? 'var(--danger)' : 'var(--blue)');
    if (!this.scaring && this.phase === 'explore') {
      const grace = this.graceT > 0; this.graceT = Math.max(0, (this.graceT || 0) - dt);
      if (noise > thr && !grace) this.heard += dt; else this.heard = Math.max(0, this.heard - dt * 0.8);
      if (this.heard > 0.9) { this.heard = 0; this.hear(Player.pos); }
      this.updateEntity(t, dt);
    }
    // eventos ambientales
    this.nextEvent -= dt; if (this.nextEvent <= 0) { this.nextEvent = rand(6, 13); this.horrorEvent(); }
    if (Math.random() < dt * 0.08) Audio.sfx.creak(new THREE.Vector3(Player.pos.x + rand(-5, 5), 2.5, Player.pos.z + rand(-5, 5)));
    // luces parpadeantes
    this.blackout = Math.max(0, (this.blackout || 0) - dt);
    this.lamps.forEach((l) => { const flick = Math.random() < 0.04 ? 0.05 : 1; const k = this.blackout > 0 ? (Math.random() < 0.15 ? 0.6 : 0) : flick * (0.85 + Math.sin(t * 13 + l.ph) * 0.15); l.l.intensity = l.base * k * (this.phase === 'collapse' ? (Math.random() < 0.3 ? 0 : 1.4) : 1); l.bulb.material.color.setScalar(k * 0.9).multiply(new THREE.Color(0xffb066)); l.g.rotation.z = Math.sin(t * 0.8 + l.ph) * 0.05; });
    this.flash.intensity = this.blackout > 0 && Math.random() < 0.5 ? 4 : (Math.random() < 0.005 ? 3 : 32);
    this.candles.forEach((c, i) => c.scale.setScalar(0.8 + Math.random() * 0.4)); this.candleLight.intensity = 1.2 + Math.random() * 0.8;
    this.pendulum.rotation.z = Math.sin(t * 2.2) * 0.35; if (Math.abs(Math.sin(t * 2.2)) > 0.995 && Player.pos.z > -4) Audio.sfx.dial();
    this.chandelier.rotation.z = Math.sin(t * 0.9) * 0.06; this.chandelier.rotation.x = Math.cos(t * 0.7) * 0.04;
    if (this.rockT > 0) { this.rockT -= dt; this.rocker.rotation.x = Math.sin(t * 3) * 0.18; }
    // puertas
    this.doors.forEach((d) => {
      if (d.target === 0) { d.timer -= dt; if (d.timer <= 0) { d.target = 1; d.speed = 0.6; Audio.sfx.creak(d.center); } }
      d.open = damp(d.open, d.target, d.speed * 3, dt); d.pivot.rotation.y = d.openAngle * d.open; d.box.off = d.open > 0.25;
    });
    // objetos que se mueven solos
    this.chairs.forEach((c) => { const sl = c.userData.slide; if (sl) { sl.t += dt / 0.6; c.position.lerpVectors(sl.from, sl.to, Math.min(sl.t, 1)); if (sl.t >= 1) c.userData.slide = null; } });
    this.frames.forEach((f) => { const fa = f.userData.fallen; if (fa && f.position.y > 0.2) { fa.v += dt * 9; f.position.y -= fa.v * dt; f.rotation.z += dt * 3; f.rotation.x -= dt * 2; } });
    // polvo alrededor de la linterna
    this.dust.position.set(Player.pos.x, 0, Player.pos.z); const dp = this.dust.geometry.attributes.position.array; for (let i = 1; i < dp.length; i += 3) { dp[i] -= dt * 0.03; if (dp[i] < 0) dp[i] = 3; } this.dust.geometry.attributes.position.needsUpdate = true;
    // números en las paredes: se descubren al iluminarlos con la linterna
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    this.numbers.forEach((n, i) => { if (this.found[i]) return; const to = n.position.clone().sub(camera.position); const d = to.length(); if (d < 3.3 && to.normalize().dot(fwd) > 0.86) { this.found[i] = true; State.inventory.push('pista-' + (i + 1)); Audio.sfx.whisper(n.position); haptic(30); HUD.toast(`Número encontrado: ${['I', 'II', 'III', 'IV'][i]} = ${this.code[i]}`, 2400); HUD.objective((this.found.every(Boolean) ? 'Andá a la <b>sala del fondo</b> y abrí la caja fuerte (tocá cada perilla).' : 'Encontrá los <b>4 números</b> en las paredes.') + '<br>' + this.clueText()); } });
    // fragmento dentro de la caja fuerte
    if (this.safeOpen) { this.safeHinge.rotation.y = damp(this.safeHinge.rotation.y, -1.9, 2, dt); if (!this.fragTaken) { this.frag.userData.update(t); const fp = this.frag.getWorldPosition(new THREE.Vector3()); if (Math.hypot(fp.x - Player.pos.x, fp.z - Player.pos.z) < 1.15) this.takeFragment(); } }
    // derrumbe del espacio
    if (this.phase === 'collapse') {
      this.shake = 0.03 + Math.sin(t * 3) * 0.015;
      [this.backL, this.backR].forEach((w) => { if (w.fall && w.fall.t < 1) { w.fall.t += dt * 0.7; w.m.rotation.x = -w.fall.t * w.fall.t * 1.45; w.m.position.y = 1.5 - w.fall.t * 1.2; w.m.position.z = -23 - w.fall.t * 1.4; w.m.rotation.z = w.fall.side * w.fall.t * 0.3; } });
      if (Math.random() < dt * 4) { const d = new THREE.Mesh(jitter(new THREE.BoxGeometry(rand(0.2, 0.6), rand(0.1, 0.3), rand(0.2, 0.6)), 0.05), this.wallMat); d.position.set(Player.pos.x + rand(-3, 3), 3, Player.pos.z + rand(-3, 3)); d.userData.v = 0; this.scene.add(d); this.debris.push(d); }
      this.debris.forEach((d) => { if (d.position.y > 0.1) { d.userData.v += dt * 9.8; d.position.y -= d.userData.v * dt; d.rotation.x += dt * 2; if (d.position.y <= 0.1) { Audio.sfx.drop(d.position); } } });
      if (Math.random() < dt * 0.8) Audio.sfx.rumble(1.2);
    }
    if (this.shadowFig.visible) this.shadowFig.lookAt(Player.pos.x, 0, Player.pos.z);
    this.portal.update(t, dt);
    if (this.portal.checkCross(new THREE.Vector3(this.prev.x, 1.4, this.prev.z), new THREE.Vector3(Player.pos.x, 1.4, Player.pos.z))) Game.goto('final');
    const hot = pick(new THREE.Vector2(0, 0), this.inter); HUD.reticle(hot && hot.distance < 2.3);
  }
}
