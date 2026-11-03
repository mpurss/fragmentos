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

/** MUNDO 0 — La grieta se abre en tu realidad (cámara trasera de fondo = AR) */
class IntroWorld extends BaseWorld {
  build() {
    const s = this.scene;
    if (CamFeed.ok) { CamFeed.fit(); s.background = CamFeed.texture; }
    else { s.background = new THREE.Color(0x05080f); s.fog = new THREE.FogExp2(0x05080f, 0.06); s.add(starfield(800, 70)); }
    s.add(new THREE.HemisphereLight(0xbfd8ff, 0x1a1a22, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(4, 8, 3); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 }); s.add(sun);
    if (!CamFeed.ok) {
      const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.9 }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = true; s.add(ground);
      const grid = new THREE.PolarGridHelper(14, 16, 8, 64, 0x1d3b66, 0x0f2240); grid.position.y = 0.002; s.add(grid);
    }
    this.crack = makeCrack({ radius: 4.6, depth: 3.2, len: 7.2, width: 2.1, seed: 5 });
    this.crack.position.set(0, 0, -5); this.crack.rotation.y = 0.25; s.add(this.crack);
    // los tres fragmentos fantasma muestran el objetivo
    this.ghosts = [0, 1, 2].map((i) => { const f = makeFragment(i, false); f.scale.setScalar(0.7); f.traverse((o) => o.material && (o.material = o.material.clone(), o.material.opacity = 0.35)); s.add(f); return f; });
    Player.reset(0, 1.2, 0, []); Look.dragPitch = -0.35; camera.position.set(0, 1.6, 1.2);
    this.falling = false; this.fallT = 0;
  }
  enter() {
    HUD.setWorld('Mundo 0', 'La grieta'); Audio.ambient('intro');
    HUD.objective('Una grieta se abrió en tu realidad.<br><b>Caminá hasta ella y caé adentro.</b>');
    HUD.toast(CamFeed.ok ? 'La grieta apareció en tu habitación' : 'Arrastrá a la izquierda para moverte', 3200);
  }
  update(t, dt) {
    if (CamFeed.ok) CamFeed.fit();
    this.crack.userData.update(t, dt);
    this.ghosts.forEach((g, i) => { const a = t * 0.6 + (i * TAU) / 3; g.position.set(Math.cos(a) * 1.6, 2.6 + Math.sin(t * 1.3 + i) * 0.2, -5 + Math.sin(a) * 1.6); g.userData.shard.rotation.y = t + i; });
    if (this.falling) {
      this.fallT += dt; applyLook(dt);
      camera.position.y -= dt * (2 + this.fallT * 9); camera.rotation.x = lerp(camera.rotation.x, -1.2, this.fallT);
      if (this.fallT > 0.5 && !this.went) { this.went = true; Game.goto('ocean'); }
      return;
    }
    applyLook(dt); Player.update(dt);
    if (Player.pos.length() > 9) Player.pos.setLength(9);
    // ¿el jugador está parado sobre el hueco de la grieta?
    const local = this.crack.worldToLocal(Player.pos.clone());
    if (this.crack.userData.isOver(local.x, local.z)) {
      this.falling = true; Audio.sfx.whoosh(); Audio.sfx.rumble(1.5); haptic([60, 40, 200]);
    }
  }
}
