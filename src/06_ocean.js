/* =====================================================================
   6. MUNDO 1 — OCÉANO: submarino cerrado, peces 3D, garra mecánica,
      desafío de respiración (micrófono) y Fragmento 1
   ===================================================================== */
const seabedY = (x, z) => -7 + Math.sin(x * 0.08) * 1.5 + Math.cos(z * 0.06) * 1.8 + Math.sin((x + z) * 0.15) * 0.6;

class OceanWorld extends BaseWorld {
  build() {
    const s = this.scene;
    s.background = new THREE.Color(0x03324d); s.fog = new THREE.FogExp2(0x065274, 0.034);
    s.add(new THREE.HemisphereLight(0x8fe3ff, 0x0b2a3a, 1.5));
    const sun = new THREE.DirectionalLight(0xbff4ff, 1.6); sun.position.set(10, 30, 5); s.add(sun);
    this.buildSeabed(); this.buildFlora(); this.buildSub(); this.buildClaw(); this.buildParticles();
    this.fish = []; this.catches = 0; this.shiny = null;
    for (let i = 0; i < 22; i++) this.spawnFish(SPECIES[i % SPECIES.length], false, true);
    this.portal = new Portal(2.7); this.portal.group.visible = false; s.add(this.portal.group);
    this.phase = 'hunt';            // hunt → breath → fragment → portal
    this.breath = { p: 0, level: 0, holding: false, need: 6 };
    this.subPos = new THREE.Vector3(0, -1, 10); this.subYaw = 0; this.subVel = new THREE.Vector3(); this.prevSub = this.subPos.clone();
    Look.baseYaw = 0; Look.dragYaw = 0; Look.dragPitch = -0.22; Gyro.recenter();
    this.joyZone = { x: 0.36, y: 0.64 };
  }

  /* ---------- entorno ---------- */
  buildSeabed() {
    const g = new THREE.PlaneGeometry(240, 240, 70, 70); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position; const col = new Float32Array(p.count * 3);
    const a = new THREE.Color(0xd8c48a), b = new THREE.Color(0x8a7a52);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, seabedY(x, z) + rand(-0.25, 0.25)); const c = a.clone().lerp(b, Math.random() * 0.7); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    this.scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })));
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshBasicMaterial({ color: 0x6fe0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
    surf.rotation.x = Math.PI / 2; surf.position.y = 16; this.scene.add(surf);
  }
  buildFlora() {
    const s = this.scene; this.rocks = []; this.kelp = [];
    const rockMat = M.std(0x5b6670, { roughness: 1 });
    for (let i = 0; i < 70; i++) {
      const x = rand(-90, 90), z = rand(-90, 90); if (Math.hypot(x, z - 10) < 8) continue;
      const r = rand(0.8, 3.2); const m = new THREE.Mesh(jitter(new THREE.DodecahedronGeometry(r, 0), r * 0.25), rockMat);
      m.position.set(x, seabedY(x, z) + r * 0.3, z); m.scale.y = rand(0.5, 1.2); m.rotation.y = rand(0, TAU); s.add(m); this.rocks.push({ p: m.position, r: r * 1.05 });
    }
    const coralCols = [0xff5e7e, 0xff9a3c, 0xb06bff, 0xffd24a, 0x3fe0c5, 0xff6ad5];
    for (let i = 0; i < 120; i++) {
      const x = rand(-80, 80), z = rand(-80, 80); const y = seabedY(x, z); const c = coralCols[i % coralCols.length];
      const grp = new THREE.Group(); grp.position.set(x, y, z);
      if (i % 3 === 0) { for (let k = 0; k < 5; k++) { const br = new THREE.Mesh(new THREE.ConeGeometry(0.12, rand(0.8, 1.6), 5), M.std(c)); br.position.set(rand(-0.3, 0.3), 0.5, rand(-0.3, 0.3)); br.rotation.set(rand(-0.5, 0.5), 0, rand(-0.5, 0.5)); grp.add(br); } }
      else if (i % 3 === 1) { for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.15, 0.35), 0), M.std(c)); b.position.set(rand(-0.4, 0.4), rand(0.1, 0.5), rand(-0.4, 0.4)); grp.add(b); } }
      else { const fan = new THREE.Mesh(new THREE.CircleGeometry(0.7, 6, 0, Math.PI), M.std(c, { side: THREE.DoubleSide })); fan.position.y = 0.05; fan.rotation.y = rand(0, 3); grp.add(fan); }
      s.add(grp);
    }
    const kelpMat = M.std(0x2f8f4a, { roughness: 0.8 });
    for (let i = 0; i < 90; i++) {
      const x = rand(-70, 70), z = rand(-70, 70); const h = rand(3, 7);
      const k = new THREE.Mesh(jitter(new THREE.CylinderGeometry(0.05, 0.14, h, 4, 5), 0.08), kelpMat);
      k.geometry.translate(0, h / 2, 0); k.position.set(x, seabedY(x, z), z); k.userData.ph = rand(0, TAU); s.add(k); this.kelp.push(k);
    }
    // rayos de luz desde la superficie
    const rayTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(200,250,255,.5)'); gr.addColorStop(1, 'rgba(200,250,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const gx = g.createLinearGradient(0, 0, w, 0); });
    this.rays = [];
    for (let i = 0; i < 9; i++) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(rand(2, 4), 26), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      r.userData.off = new THREE.Vector3(rand(-25, 25), 4, rand(-25, 25)); r.rotation.z = rand(-0.25, 0.25); s.add(r); this.rays.push(r);
    }
  }
  buildParticles() {
    const n = 260, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) p.set([rand(-20, 20), rand(-8, 8), rand(-20, 20)], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.bubbles = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdffaff, size: 0.07, transparent: true, opacity: 0.7, depthWrite: false }));
    this.scene.add(this.bubbles);
  }

  /* ---------- submarino: casco CERRADO (cilindro + tapa trasera + domo de vidrio) ---------- */
  buildSub() {
    const sub = this.sub = new THREE.Group(); this.scene.add(sub);
    const R = 1.35, metalIn = M.std(0x6b7787, { metalness: 0.6, roughness: 0.45, side: THREE.BackSide });
    const cyl = new THREE.CylinderGeometry(R, R, 3.2, 16, 1, true); cyl.rotateX(Math.PI / 2); cyl.translate(0, 0, 0.2);
    sub.add(new THREE.Mesh(cyl, metalIn));
    const back = new THREE.SphereGeometry(R, 16, 8, 0, TAU, 0, Math.PI / 2); back.rotateX(Math.PI / 2); back.translate(0, 0, 1.8);
    sub.add(new THREE.Mesh(back, metalIn));
    // casco exterior amarillo (solo caras frontales: no se ve desde adentro)
    const outMat = M.std(0xffc21a, { metalness: 0.3, roughness: 0.5 });
    const cylO = new THREE.CylinderGeometry(R + 0.07, R + 0.07, 3.2, 16, 1, true); cylO.rotateX(Math.PI / 2); cylO.translate(0, 0, 0.2); sub.add(new THREE.Mesh(cylO, outMat));
    const backO = new THREE.SphereGeometry(R + 0.07, 16, 8, 0, TAU, 0, Math.PI / 2); backO.rotateX(Math.PI / 2); backO.translate(0, 0, 1.8); sub.add(new THREE.Mesh(backO, outMat));
    // domo frontal de vidrio con marco y nervaduras
    const domeG = new THREE.SphereGeometry(R, 24, 12, 0, TAU, 0, Math.PI / 2); domeG.rotateX(-Math.PI / 2); domeG.translate(0, 0, -1.4);
    sub.add(new THREE.Mesh(domeG, new THREE.MeshPhysicalMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false })));
    const frameMat = M.std(0x39424f, { metalness: 0.7, roughness: 0.35 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.07, 6, 24), frameMat); ring.position.z = -1.4; sub.add(ring);
    for (let k = 0; k < 2; k++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(R + 0.01, 0.01, 4, 16, Math.PI / 2), frameMat); rib.geometry.rotateY(Math.PI / 2); const pv = new THREE.Group(); pv.position.z = -1.4; pv.rotation.z = k ? Math.PI * 0.62 : Math.PI * 0.38; pv.add(rib); sub.add(pv); }
    for (const z of [-1.0, -0.1, 0.8, 1.6]) { const r = new THREE.Mesh(new THREE.TorusGeometry(R - 0.03, 0.05, 5, 18), frameMat); r.position.z = z; sub.add(r); }
    // piso, consola y tanque de colección
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 2.4), M.std(0x2a313b, { metalness: 0.5 })); deck.position.set(0, -0.92, 0.7); sub.add(deck);
    const console_ = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.5), M.std(0x2e3642, { metalness: 0.5 })); console_.position.set(0, -0.72, -0.8); console_.rotation.x = 0.6; const cstand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), M.std(0x2e3642, { metalness: 0.5 })); cstand.position.set(0, -0.92, -0.75); sub.add(cstand); sub.add(console_);
    this.sonarCanvas = document.createElement('canvas'); this.sonarCanvas.width = 256; this.sonarCanvas.height = 160;
    this.sonarTex = new THREE.CanvasTexture(this.sonarCanvas); this.sonarTex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.31), new THREE.MeshBasicMaterial({ map: this.sonarTex })); screen.position.set(0, -0.64, -0.82); screen.rotation.x = -0.6; sub.add(screen);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), M.basic([0xff4040, 0x40ff80, 0xffc040][i % 3])); b.position.set(0.36 + (i % 3) * 0.06, -0.66, -0.74 - Math.floor(i / 3) * 0.08); sub.add(b); }
    for (const sx of [-1, 1]) { const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.0, 6), M.std(0x8a6a3a, { metalness: 0.8 })); pipe.rotation.x = Math.PI / 2; pipe.position.set(sx * 1.05, 0.75, 0.3); sub.add(pipe); }
    this.tank = new THREE.Group(); this.tank.position.set(1.0, -0.45, 0.6); sub.add(this.tank);
    const tankGlass = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.9), new THREE.MeshPhysicalMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false })); this.tank.add(tankGlass);
    const tankWater = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.88), new THREE.MeshBasicMaterial({ color: 0x1aa0d8, transparent: true, opacity: 0.25, depthWrite: false })); tankWater.position.y = -0.04; this.tank.add(tankWater);
    this.tankFish = [];
    const cabinLight = new THREE.PointLight(0xffb36b, 2.2, 4, 1.5); cabinLight.position.set(0, 0.9, 0.6); sub.add(cabinLight);
    // aletas, hélice y faros exteriores
    for (const sx of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.6), outMat); fin.position.set(sx * 1.7, 0, 2.2); sub.add(fin); }
    const vfin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.7), outMat); vfin.position.set(0, 1.6, 2.4); sub.add(vfin);
    this.prop = new THREE.Group(); this.prop.position.z = 3.25; sub.add(this.prop);
    for (let i = 0; i < 4; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.03), frameMat); bl.rotation.z = (i * Math.PI) / 2; bl.position.set(Math.cos((i * Math.PI) / 2) * 0, 0, 0); bl.geometry.translate(0, 0.35, 0); this.prop.add(bl); }
    for (const sx of [-0.9, 0.9]) {
      const spot = new THREE.SpotLight(0xe8fbff, 60, 26, 0.42, 0.6, 1.4); spot.position.set(sx, -0.9, -1.6); spot.target.position.set(sx * 1.5, -2.5, -14); sub.add(spot, spot.target);
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.2, 8), M.basic(0xfffbe0)); lamp.rotation.x = Math.PI / 2; lamp.position.set(sx, -0.95, -1.5); sub.add(lamp);
    }
    this.eye = new THREE.Vector3(0, 0.12, 0.35);
    // agua que inunda la cabina durante el desafío de respiración
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4, 10, 10), new THREE.MeshStandardMaterial({ color: 0x1f9fd6, transparent: true, opacity: 0.55, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
    this.water.rotation.x = -Math.PI / 2; this.water.position.set(0, -0.95, 0.2); this.water.visible = false; sub.add(this.water);
  }

  /* ---------- garra mecánica con IK de dos segmentos ---------- */
  buildClaw() {
    const c = this.claw = { base: new THREE.Vector3(0, -1.32, -2.0), L1: 1.65, L2: 1.65, ext: 0, extTarget: 0, open: 0, openTarget: 0, aim: new THREE.Vector3(0, -0.2, -1).normalize(), held: null, state: 'idle', head: new THREE.Vector3() };
    const mat = M.std(0x9aa6b6, { metalness: 0.8, roughness: 0.3 }), dark = M.std(0x2a2f38, { metalness: 0.6 });
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 1.0), M.std(0xffc21a, { metalness: 0.3 })); housing.position.set(0, -1.3, -1.55); this.sub.add(housing);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), dark); shoulder.position.copy(c.base); this.sub.add(shoulder);
    c.seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 1, 8), mat); c.seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1, 8), mat);
    c.elbowM = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), dark);
    c.headG = new THREE.Group();
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.18, 8), dark); wrist.rotation.x = Math.PI / 2; c.headG.add(wrist);
    c.fingers = [];
    for (let i = 0; i < 3; i++) {
      const rot = new THREE.Group(); rot.rotation.z = (i * TAU) / 3; c.headG.add(rot);
      const hinge = new THREE.Group(); hinge.position.set(0, 0.1, 0.06); rot.add(hinge);
      const prox = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.3), mat); prox.position.z = 0.15; hinge.add(prox);
      const knuckle = new THREE.Group(); knuckle.position.z = 0.3; knuckle.rotation.x = 0.75; hinge.add(knuckle);
      const dist = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.22), dark); dist.position.z = 0.11; knuckle.add(dist);
      c.fingers.push(hinge);
    }
    const tip = new THREE.PointLight(0xffe8b0, 1.2, 2.5); tip.position.z = 0.3; c.headG.add(tip);
    this.scene.add(c.seg1, c.seg2, c.elbowM, c.headG);
  }
  updateClaw(dt) {
    const c = this.claw; const B = this.sub.localToWorld(c.base.clone());
    c.ext = damp(c.ext, c.extTarget, c.state === 'retract' ? 4 : 2.2, dt);   // extender lleva tiempo → desafío de puntería
    c.open = damp(c.open, c.openTarget, 14, dt);
    const R = 0.85 + c.ext * 2.7;   // distancia base → punta
    if (c.ndc && c.state === 'extend') this.aimFrom(c.ndc, B, R);
    const T = B.clone().add(c.aim.clone().multiplyScalar(R - 0.3));
    const D = Math.min(B.distanceTo(T), c.L1 + c.L2 - 0.01), d = T.clone().sub(B).normalize();
    const a = (c.L1 * c.L1 - c.L2 * c.L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(c.L1 * c.L1 - a * a, 0));
    const up = new THREE.Vector3(0, -1, 0.35).normalize().applyQuaternion(this.sub.quaternion); const perp = up.sub(d.clone().multiplyScalar(up.dot(d))).normalize();
    const E = B.clone().add(d.clone().multiplyScalar(a)).add(perp.multiplyScalar(h));
    const place = (m, p0, p1) => { const v = p1.clone().sub(p0); m.position.copy(p0).add(p1).multiplyScalar(0.5); m.scale.set(1, v.length(), 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); };
    place(c.seg1, B, E); place(c.seg2, E, T); c.elbowM.position.copy(E);
    c.headG.position.copy(T); c.headG.lookAt(T.clone().add(T.clone().sub(E)));
    c.fingers.forEach((f) => (f.rotation.x = -0.15 - c.open * 0.75));
    const fwd = T.clone().sub(E).normalize(); c.head.copy(T).add(fwd.multiplyScalar(0.3));
    if (c.held) { c.held.position.copy(c.head); c.held.lookAt(c.head.clone().add(fwd)); c.held.userData.animate(this.t, 2.5); }
    if (c.state === 'retract' && c.ext < 0.06) { c.state = 'idle'; if (c.held) this.deliver(c.held); c.held = null; c.openTarget = 0; }
  }
  /** apuntado: la punta de la garra se ubica sobre el rayo del dedo, a la distancia que permite su extensión */
  aimFrom(ndc, B, R) {
    ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction; const oc = o.clone().sub(B);
    const bq = oc.dot(d), cq = oc.lengthSq() - R * R, disc = bq * bq - cq;
    const tt = disc >= 0 ? -bq + Math.sqrt(disc) : Math.max(-bq, 0.5);
    const H = o.clone().add(d.clone().multiplyScalar(tt));
    const local = H.sub(B).applyQuaternion(this.sub.quaternion.clone().invert()).normalize();
    local.z = Math.min(local.z, -0.3); local.y = clamp(local.y, -0.85, 0.55); local.normalize();
    this.claw.aim.copy(local.applyQuaternion(this.sub.quaternion));
  }
  onPointerDown(ndc) {
    if (this.cine > 0) return true;
    if (this.phase === 'breath') { this.breath.holding = true; return true; }
    if (this.phase === 'fragment') { const h = pick(ndc, [this.frag]); if (h) { this.takeFragment(); return true; } }
    if (this.claw.state !== 'idle') return true;
    this.claw.state = 'extend'; this.claw.openTarget = 1; this.claw.extTarget = 1; this.claw.ndc = ndc.clone(); Audio.sfx.clawOpen(); haptic(15);
    return true;
  }
  onPointerMove(ndc) { if (this.claw.state === 'extend') this.claw.ndc = ndc.clone(); }
  onPointerUp() {
    this.breath.holding = false;
    const c = this.claw; if (c.state !== 'extend') return;
    c.openTarget = 0; c.state = 'retract'; c.extTarget = 0; Audio.sfx.clawClose(); haptic(25);
    // ¿hay un pez realmente entre las pinzas al cerrar?
    let best = null, bd = 1.25;   // radio generoso: más fácil en el celu
    for (const f of this.fish) { if (f.caught) continue; const d = f.mesh.position.distanceTo(c.head); if (d < bd) { bd = d; best = f; } }
    if (best) { best.caught = true; c.held = best.mesh; Audio.sfx.catch(); haptic([40, 30, 80]); }
    else HUD.toast('La garra se cerró vacía…', 1400);
  }

  /* ---------- peces ---------- */
  spawnFish(sp, shiny, initial) {
    const mesh = makeFish(sp, shiny); const fwd = new THREE.Vector3(-Math.sin(this.subYaw || 0), 0, -Math.cos(this.subYaw || 0));
    const base = this.subPos ? this.subPos.clone() : new THREE.Vector3(0, -1, 10);
    const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const home = base.clone().add(fwd.clone().multiplyScalar(rand(3.5, 6))).add(side.multiplyScalar(rand(-2.8, 2.8))).add(new THREE.Vector3(0, rand(-1.6, 0.2), 0));
    home.y = Math.max(home.y, seabedY(home.x, home.z) + 1.5);
    const f = { mesh, sp, shiny, home, pos: mesh.position, vel: new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)), target: home.clone(), speed: shiny ? 0.9 : rand(0.45, 0.8), skittish: shiny ? 0.25 : rand(0.02, 0.15), caught: false };
    mesh.position.copy(home).add(new THREE.Vector3(rand(-3, 3), rand(-1, 1), rand(-3, 3)));
    this.scene.add(mesh); this.fish.push(f); return f;
  }
  updateFish(t, dt) {
    const c = this.claw;
    for (const f of this.fish) {
      if (f.caught) continue;
      if (f.pos.distanceTo(f.target) < 1.2) f.target.copy(f.home).add(new THREE.Vector3(rand(-1.8, 1.8), rand(-0.6, 0.6), rand(-1.8, 1.8)));
      let spd = f.speed; const desired = f.target.clone().sub(f.pos).normalize();
      // reacción a la garra: algunos peces escapan si la garra se acerca
      const dc = f.pos.distanceTo(c.head);
      if (c.state === 'extend' && dc < 1.5 && Math.random() < f.skittish * dt * 3) { f.target.copy(f.pos).add(f.pos.clone().sub(c.head).normalize().multiplyScalar(5)); spd *= 2.6; }
      const ds = f.pos.distanceTo(this.subPos); if (ds < 2.4) desired.add(f.pos.clone().sub(this.subPos).normalize().multiplyScalar(2));
      desired.normalize().multiplyScalar(spd);
      f.vel.lerp(desired, 1 - Math.exp(-1.6 * dt));
      f.pos.addScaledVector(f.vel, dt); f.pos.y += Math.sin(t * 1.3 + f.mesh.userData.phase) * 0.004;
      const fy = seabedY(f.pos.x, f.pos.z) + 0.8; if (f.pos.y < fy) f.pos.y = fy;
      f.mesh.lookAt(f.pos.clone().add(f.vel)); f.mesh.userData.animate(t, 0.6 + f.vel.length() * 0.5);
      // mantener la población alrededor del submarino
      if (ds > 8 && ds <= 42 && Math.random() < dt) { const fw = new THREE.Vector3(-Math.sin(this.subYaw), 0, -Math.cos(this.subYaw)); f.home.copy(this.subPos).add(fw.multiplyScalar(rand(3.5, 6))).add(new THREE.Vector3(rand(-2.8, 2.8), rand(-1.6, 0.2), rand(-1.5, 1.5))); f.home.y = Math.max(f.home.y, seabedY(f.home.x, f.home.z) + 1.2); f.target.copy(f.home); }
      if (ds > 42) { const fwd = new THREE.Vector3(-Math.sin(this.subYaw), 0, -Math.cos(this.subYaw)); f.home.copy(this.subPos).add(fwd.multiplyScalar(rand(18, 28))).add(new THREE.Vector3(rand(-14, 14), rand(-2, 2), rand(-14, 14))); f.home.y = Math.max(f.home.y, seabedY(f.home.x, f.home.z) + 1.5); f.pos.copy(f.home); f.target.copy(f.home); }
    }
  }
  /** el pez atrapado entra al tanque interior: queda registrado en la colección */
  deliver(mesh) {
    const f = this.fish.find((x) => x.mesh === mesh); if (!f) return;
    this.fish.splice(this.fish.indexOf(f), 1); this.scene.remove(mesh);
    this.catches++;
    const isNew = !State.collectedSpecies.includes(f.sp.id) && !f.shiny;
    if (isNew) State.collectedSpecies.push(f.sp.id);
    saveProgress();
    const mini = makeFish(f.sp, f.shiny); mini.scale.setScalar(0.12); mini.userData.tankPh = rand(0, TAU); this.tank.add(mini); this.tankFish.push(mini);
    if (f.shiny) { this.startBreath(mini); return; }
    HUD.toast((isNew ? '¡NUEVA ESPECIE! ' : '¡Atrapado! ') + f.sp.name + ' · ' + State.collectedSpecies.length + '/5', 2400);
    Audio.sfx.collect(); haptic(60);
    this.spawnFish(SPECIES[Math.floor(Math.random() * SPECIES.length)], false);
    if (this.catches >= 3 && !this.shiny) {
      this.shiny = this.spawnFish({ ...SPECIES[0], id: 'brillante', name: 'Pez Brillante', size: 0.5 }, true);
      setTimeout(() => { Audio.sfx.ping(); HUD.toast('El sonar detecta algo BRILLANTE cerca…', 3000); }, 1500);
      HUD.objective('Un <b>pez brillante</b> guarda el fragmento. Buscalo en el sonar (punto amarillo) y atrapalo.');
    } else if (!this.shiny) HUD.objective(`Atrapá peces con la garra (${this.catches}/3).<br>Mantené apretado para extenderla, soltá para cerrarla.`);
  }

  /* ---------- desafío de respiración ---------- */
  startBreath(mini) {
    this.phase = 'breath'; this.shinyMini = mini; this.breath.p = 0; this.water.visible = true; this.water.position.y = -0.95;
    Audio.sfx.rumble(1.5); Audio.sfx.alarm(); haptic([100, 50, 100, 50, 300]); HUD.red(600);
    HUD.toast('¡El pez rompió un sello! La cabina se inunda', 3000, true);
    HUD.objective(State.sensors.micAllowed
      ? '<b>Contené la respiración.</b> Quedate en silencio total hasta que la bomba vacíe la cabina.'
      : '<b>Contené la respiración:</b> mantené el dedo apoyado en la pantalla hasta vaciar la cabina.');
  }
  updateBreath(dt) {
    const b = this.breath; const thr = State.gameplay.noiseThreshold;
    const vol = State.audioMetrics.volume;
    let holding = State.sensors.micAllowed ? vol < thr : b.holding;
    if (holding) b.p += dt; else { b.p = Math.max(0, b.p - dt * 0.9); if (!this._breathWarn || performance.now() - this._breathWarn > 2200) { this._breathWarn = performance.now(); HUD.toast(State.sensors.micAllowed ? '¡Respiraste! Silencio…' : 'Mantené el dedo apoyado', 1300, true); haptic(30); } }
    State.gameplay.breathTimer = b.p;
    const k = clamp(b.p / b.need, 0, 1);
    const flood = Math.min(1, (this._floodT = (this._floodT || 0) + dt) / 2.5);
    this.water.position.y = -0.95 + flood * 0.92 * (1 - k * 0.9);
    const arr = this.water.geometry.attributes.position; for (let i = 0; i < arr.count; i++) arr.setZ(i, Math.sin(this.t * 3 + arr.getX(i) * 4 + arr.getY(i) * 3) * 0.02); arr.needsUpdate = true;
    HUD.meter(true, State.sensors.micAllowed ? 'AIRE · SILENCIO' : 'AIRE · MANTENÉ', k, State.sensors.micAllowed ? null : null, holding ? 'var(--blue)' : 'var(--danger)');
    if (Math.random() < dt * 6) Audio.sfx.bubble();
    if (b.p >= b.need) {
      this.phase = 'fragment'; HUD.meter(false); this.water.visible = false; Audio.sfx.powerDown();
      this.frag = makeFragment(0); this.frag.scale.setScalar(0.2); this.frag.position.set(0, -0.08, -0.85); this.frag.userData.baseY = -0.08; this.sub.add(this.frag);
      if (this.shinyMini.userData.innerFrag) this.shinyMini.userData.innerFrag.visible = false;
      HUD.toast('El fragmento salió del pez brillante', 2600); HUD.objective('<b>Tocá el fragmento azul</b> que flota en la cabina.');
    }
  }
  takeFragment() {
    collectFragment(this.frag, 'ocean', this.scene); this.phase = 'portal';
    setTimeout(() => {
      const fwd = new THREE.Vector3(-Math.sin(this.subYaw), 0, -Math.cos(this.subYaw));
      const p = this.subPos.clone().add(fwd.multiplyScalar(17)); p.y = Math.max(this.subPos.y, seabedY(p.x, p.z) + 3.2);
      this.portal.group.position.copy(p); this.portal.group.lookAt(this.subPos.x, p.y, this.subPos.z); this.portal.group.visible = true; this.portal.unlock();
      HUD.toast('Se abrió un portal frente al submarino', 3000); HUD.objective('<b>Navegá a través del portal</b> para llegar al siguiente mundo.');
    }, 1200);
  }

  /* ---------- sonar (pantalla de la consola) ---------- */
  drawSonar(t) {
    const g = this.sonarCanvas.getContext('2d'), w = 256, h = 160;
    g.fillStyle = '#021a14'; g.fillRect(0, 0, w, h);
    const cx = 80, cy = 84, R = 66; g.strokeStyle = '#1f7a5a'; g.lineWidth = 1;
    for (const r of [22, 44, 66]) { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); }
    const sweep = (t * 2) % TAU; g.fillStyle = 'rgba(70,255,170,.15)'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, sweep - 0.5, sweep); g.fill();
    const inv = this.sub.quaternion.clone().invert();
    const dot = (p, col, sz) => { const l = p.clone().sub(this.subPos).applyQuaternion(inv); const x = cx + (l.x / 30) * R, y = cy + (l.z / 30) * R; if (Math.hypot(x - cx, y - cy) > R) return; g.fillStyle = col; g.beginPath(); g.arc(x, y, sz, 0, TAU); g.fill(); };
    this.fish.forEach((f) => dot(f.pos, f.shiny ? '#ffe14d' : '#46ffaa', f.shiny ? 4 : 2.2));
    if (this.portal.unlocked) dot(this.portal.group.position, '#3aa0ff', 6);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx, cy - 5); g.lineTo(cx - 4, cy + 4); g.lineTo(cx + 4, cy + 4); g.fill();
    g.fillStyle = '#46ffaa'; g.font = 'bold 13px monospace'; g.fillText('SONAR', 160, 26);
    g.font = '11px monospace'; g.fillText('ESPECIES ' + State.collectedSpecies.length + '/5', 160, 52); g.fillText('CAPTURAS ' + this.catches, 160, 70);
    g.fillText('PROF ' + Math.round(-this.subPos.y * 3 + 40) + 'm', 160, 88);
    g.fillStyle = this.shiny ? '#ffe14d' : '#2f8bff'; g.fillText(this.phase === 'portal' ? 'PORTAL ▲' : this.shiny ? 'BRILLO !' : 'BUSCAR', 160, 112);
    this.sonarTex.needsUpdate = true;
  }

  enter() {
    HUD.setWorld('Mundo 1', 'Océano'); Audio.ambient('ocean'); Input.walkEnabled = true;
    // toma exterior de 3 s: se ve el submarino (modelo 3D) sumergiéndose antes de pasar a la cabina
    if (Assets.has('submarine')) {
      this.ext = Assets.get('submarine', { size: 4.6, dim: 'z', rotY: Math.PI }); this.ext.position.set(0, -1.15, 0.4); this.sub.add(this.ext);
      this.hidden = this.sub.children.filter((c) => c !== this.ext && (c.isMesh || c.isGroup) && c.visible); this.hidden.forEach((c) => (c.visible = false));
      this.cine = 3.2; Input.walkEnabled = false;
    }
    HUD.objective('Atrapá peces con la garra (0/3).<br>Mantené apretado para extenderla hacia donde tocás, <b>soltá para cerrarla</b>.');
    setTimeout(() => HUD.toast('Joystick: avanzar y girar · Mirá arriba para subir y abajo para bajar', 3600), 2800);
  }
  update(t, dt) {
    this.t = t;
    // --- navegación del submarino (joystick + inclinación de la mirada) ---
    const mv = this.cine > 0 ? new THREE.Vector2() : Input.moveVec();
    this.subYaw -= mv.x * dt * 0.9;
    const thrust = -mv.y * 4.2;
    const fwd = new THREE.Vector3(-Math.sin(this.subYaw), 0, -Math.cos(this.subYaw));
    const want = fwd.multiplyScalar(thrust); const pz = this.claw.state === "extend" ? 0 : Math.abs(Look.pitch) > 0.25 ? Math.sign(Look.pitch) * (Math.abs(Look.pitch) - 0.25) : 0;   // zona muerta; quieto mientras usás la garra
    want.y = clamp(pz * 6, -2.8, 2.8);   // mirar arriba = sube, mirar abajo = baja
    this.subVel.lerp(want, 1 - Math.exp(-1.8 * dt));
    this.prevSub.copy(this.subPos); this.subPos.addScaledVector(this.subVel, dt);
    this.subPos.y = clamp(this.subPos.y, seabedY(this.subPos.x, this.subPos.z) + 2.3, 9);
    for (const r of this.rocks) { const d = this.subPos.distanceTo(r.p), m = r.r + 1.5; if (d < m) this.subPos.add(this.subPos.clone().sub(r.p).normalize().multiplyScalar(m - d)); }
    if (this.subPos.length() > 85) this.subPos.setLength(85);
    this.sub.position.copy(this.subPos); this.sub.rotation.set(Math.sin(t * 0.7) * 0.015, this.subYaw, Math.sin(t * 0.5) * 0.02 - mv.x * 0.05);
    this.prop.rotation.z += dt * (2 + Math.abs(thrust) * 4);
    // --- cámara SIEMPRE dentro de la cabina (no atraviesa el casco) ---
    Look.baseYaw = this.subYaw; applyLook(dt);
    camera.position.copy(this.sub.localToWorld(this.eye.clone()));
    camera.quaternion.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(this.sub.rotation.x, 0, this.sub.rotation.z)));
    if (this.cine > 0) {   // cámara exterior girando alrededor del submarino
      this.cine -= dt; const k = 1 - this.cine / 3.2; const a = this.subYaw + 0.9 - k * 1.6;
      camera.position.copy(this.subPos).add(new THREE.Vector3(Math.sin(a) * (10 - k * 4), 2.2 - k * 1.6, Math.cos(a) * (10 - k * 4))); camera.lookAt(this.subPos.x, this.subPos.y - 0.6, this.subPos.z);
      if (this.cine <= 0) { this.ext.visible = false; this.hidden.forEach((c) => (c.visible = true)); Input.walkEnabled = true; HUD.flash(true); setTimeout(() => HUD.flash(false), 200); }
    }
    // --- entorno ---
    this.kelp.forEach((k) => { k.rotation.z = Math.sin(t * 0.8 + k.userData.ph) * 0.12; k.rotation.x = Math.cos(t * 0.6 + k.userData.ph) * 0.08; });
    this.rays.forEach((r) => { r.position.copy(this.subPos).add(r.userData.off); r.position.y = 4; r.lookAt(camera.position.x, 4, camera.position.z); });
    const bp = this.bubbles.geometry.attributes.position.array;
    for (let i = 0; i < bp.length; i += 3) { bp[i + 1] += dt * 0.8; if (bp[i + 1] > 8) bp[i + 1] = -8; }
    this.bubbles.geometry.attributes.position.needsUpdate = true; this.bubbles.position.set(Math.round(this.subPos.x / 10) * 10, this.subPos.y, Math.round(this.subPos.z / 10) * 10);
    this.updateFish(t, dt); this.updateClaw(dt);
    this.tankFish.forEach((m, i) => { const a = t * 0.8 + m.userData.tankPh; m.position.set(Math.sin(a) * 0.1, -0.05 + Math.sin(a * 2) * 0.05, Math.cos(a) * 0.3); m.lookAt(this.tank.localToWorld(new THREE.Vector3(Math.sin(a + 0.1) * 0.1, -0.05, Math.cos(a + 0.1) * 0.3))); m.userData.animate(t); });
    if (this.phase === 'breath') this.updateBreath(dt);
    if (this.frag && this.frag.visible && !this.frag.userData.collecting) this.frag.userData.update(t);
    if ((this._sonarT = (this._sonarT || 0) + dt) > 0.12) { this._sonarT = 0; this.drawSonar(t); }
    if (Math.random() < dt * 0.15) Audio.sfx.ping();
    // --- portal: hay que atravesarlo físicamente con el submarino ---
    if (this.portal.group.visible) { this.portal.update(t, dt); if (this.portal.checkCross(this.prevSub, this.subPos)) Game.goto('museum'); }
  }
}
