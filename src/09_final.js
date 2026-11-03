/* =====================================================================
   9. FINAL — fusión de los tres fragmentos, portal de regreso,
      vuelta a la realidad (cámara AR) y anomalía final
   ===================================================================== */
class FinalWorld extends BaseWorld {
  build() {
    const s = this.scene; s.background = new THREE.Color(0x02040b); s.fog = new THREE.FogExp2(0x02040b, 0.05);
    s.add(new THREE.HemisphereLight(0x6fa8ff, 0x05070d, 0.5)); s.add(starfield(1200, 80));
    const plat = new THREE.Mesh(jitter(new THREE.CylinderGeometry(7, 5.5, 1.6, 14, 2), 0.15), M.std(0x1a2030)); plat.position.y = -0.8; plat.receiveShadow = true; s.add(plat);
    const runes = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.35, 64), new THREE.MeshBasicMaterial({ color: 0x3aa0ff, transparent: true, opacity: 0.8 })); runes.rotation.x = -Math.PI / 2; runes.position.set(0, 0.01, -3); s.add(runes); this.runes = runes;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; const r = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x7fd0ff, transparent: true, opacity: 0.7 })); r.rotation.x = -Math.PI / 2; r.rotation.z = a; r.position.set(Math.cos(a) * 3.8, 0.012, -3 + Math.sin(a) * 3.8); s.add(r); }
    const altar = new THREE.Mesh(jitter(new THREE.CylinderGeometry(0.5, 0.7, 1.1, 7), 0.04), M.std(0x2a3346)); altar.position.set(0, 0.55, -3); s.add(altar);
    this.frags = [0, 1, 2].map((i) => { const f = makeFragment(i); f.scale.setScalar(0.6); s.add(f); return f; });
    this.portal = new Portal(1.5); this.portal.group.position.set(0, 1.6, -6.0); s.add(this.portal.group);
    Player.reset(0, 3, 0, [box(0, -3, 1.2, 1.2), box(0, -7.2, 4, 0.4)]); this.prev = Player.pos.clone();
    this.phase = 'wait'; this.fuseT = 0; this.k = 0;
  }
  enter() {
    HUD.setWorld('Final', 'El umbral'); Audio.ambient('final'); Input.walkEnabled = true;
    HUD.objective('Acercate al altar: <b>los tres fragmentos quieren unirse</b>.');
  }
  update(t, dt) {
    applyLook(dt); this.prev.copy(Player.pos); Player.update(dt);
    if (Player.pos.length() > 6.6) Player.pos.setLength(6.6);
    this.runes.material.opacity = 0.5 + Math.sin(t * 2) * 0.3;
    const C = new THREE.Vector3(0, 1.9, -3);
    if (this.phase === 'wait') {
      this.frags.forEach((f, i) => { const a = t * 0.8 + (i * TAU) / 3; f.position.set(C.x + Math.cos(a) * 1.1, C.y + Math.sin(t * 2 + i) * 0.15, C.z + Math.sin(a) * 1.1); f.userData.shard.rotation.y = t + i; });
      if (Math.hypot(Player.pos.x, Player.pos.z + 3) < 3.4) { this.phase = 'fuse'; Audio.sfx.portalOpen(); haptic([50, 50, 50, 50, 300]); HUD.toast('Los fragmentos se están uniendo…', 2400); }
    } else if (this.phase === 'fuse') {
      this.fuseT += dt; const k = Math.min(this.fuseT / 3.2, 1); const r = 1.1 * (1 - k * k);
      this.frags.forEach((f, i) => { const a = t * (0.8 + k * 9) + (i * TAU) / 3; f.position.set(C.x + Math.cos(a) * r, C.y, C.z + Math.sin(a) * r); f.userData.shard.rotation.y = t * (1 + k * 8); f.rotation.z = ((i - 1) * 0.5) * k; });
      if (k >= 1) {
        this.phase = 'fused'; HUD.flash(true); setTimeout(() => HUD.flash(false), 250); Audio.sfx.collect(); haptic(300);
        this.frags.forEach((f, i) => { f.position.copy(C).add(new THREE.Vector3((i - 1) * 0.12, (i % 2) * 0.1, 0)); f.rotation.set(0, 0, (i - 1) * 0.55); f.scale.setScalar(0.9); });
        setTimeout(() => { this.portal.unlock(); HUD.toast('El portal de regreso está abierto', 2600); HUD.objective('<b>Atravesá el portal</b> para volver a tu realidad.'); }, 900);
      }
    } else {
      this.frags.forEach((f, i) => { f.position.y = C.y + Math.sin(t * 1.5) * 0.08; f.rotation.y = t * 0.6; });
    }
    this.portal.update(t, dt);
    if (this.portal.checkCross(new THREE.Vector3(this.prev.x, 1.5, this.prev.z), new THREE.Vector3(Player.pos.x, 1.5, Player.pos.z))) Game.goto('reality');
  }
}

/** Regreso a la realidad: la cámara del celular vuelve a ser el mundo… casi */
class RealityWorld extends BaseWorld {
  build() {
    const s = this.scene;
    if (CamFeed.ok) { CamFeed.fit(); s.background = CamFeed.texture; }
    else { // habitación de respaldo si no hay cámara
      s.background = new THREE.Color(0x1c1a18);
      s.add(new THREE.HemisphereLight(0xfff2e0, 0x3a332a, 1.2));
      const l = new THREE.PointLight(0xffe2b8, 10, 10); l.position.set(0, 2.6, 0); s.add(l);
      const room = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 7), new THREE.MeshStandardMaterial({ color: 0xcfc4b0, side: THREE.BackSide, roughness: 0.95 })); room.position.y = 1.5; s.add(room);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.1), M.std(0x5a6a8a)); bed.position.set(-1.8, 0.25, -1.8); s.add(bed);
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.6), M.std(0x8a6a4a)); desk.position.set(2.1, 0.38, -2.9); s.add(desk);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), new THREE.MeshBasicMaterial({ color: 0x9fd0ff })); win.position.set(0, 1.7, -3.48); s.add(win);
    }
    s.add(new THREE.AmbientLight(0xffffff, 0.6));
    Player.reset(0, 0, 0, []); camera.position.set(0, 1.6, 0);
    this.t0 = null;
  }
  enter() {
    HUD.setWorld('', 'Realidad'); Audio.ambient('reality'); Input.walkEnabled = false; $('hud').classList.remove('show'); HUD.meter(false);
    const e = $('ending'); e.classList.add('show'); $('endTitle').textContent = 'Volviste.'; $('endText').textContent = 'Los tres fragmentos sellaron el portal. Todo está donde lo dejaste.';
  }
  update(t, dt) {
    if (this.t0 == null) this.t0 = t; const k = t - this.t0;
    if (CamFeed.ok) CamFeed.fit(); applyLook(dt);
    if (k > 5 && !this.anomaly) {
      this.anomaly = true; Audio.sfx.glitch(); haptic([30, 30, 30, 30, 30]);
      const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
      this.crack = makeCrack({ radius: 1.1, depth: 0.6, len: 1.8, width: 0.35, seed: 9 }); this.crack.scale.setScalar(0.55);
      this.crack.position.copy(camera.position).add(fwd.clone().multiplyScalar(3.8)); this.crack.position.y = 1.5; this.crack.lookAt(camera.position); this.crack.rotateX(Math.PI / 2);
      this.crack.children[0].material.transparent = true; this.crack.children[0].material.opacity = 0; this.scene.add(this.crack);
      this.fish = makeFish(SPECIES[0]); this.fish.scale.setScalar(0.35); this.scene.add(this.fish); this.fishDir = fwd;
      $('endTitle').textContent = '¿Volviste?'; $('endTitle').classList.add('glitch');
      $('endText').textContent = 'Algo cruzó con vos. La grieta sigue ahí, esperando.';
      $('hud').classList.add('show'); $('objective').innerHTML = ''; $('joyHint').style.display = 'none'; $('fCount').textContent = '4/3'; $('fCount').style.color = '#ff5a6a';
      setTimeout(() => ($('again').style.opacity = 1), 2500);
    }
    if (this.anomaly) {
      this.crack.userData.update(t, dt); const m = this.crack.children[0].material; m.opacity = Math.min(1, m.opacity + dt * 0.5);
      const a = (k - 5) * 0.5; const right = new THREE.Vector3(-this.fishDir.z, 0, this.fishDir.x);
      const p = camera.position.clone().add(this.fishDir.clone().multiplyScalar(1.8 + Math.sin(a) * 0.4)).add(right.clone().multiplyScalar(Math.cos(a) * 1.4)); p.y = 1.4 + Math.sin(a * 2) * 0.2;
      this.fish.lookAt(p); this.fish.position.copy(p); this.fish.userData.animate(t);
      if (Math.random() < dt * 0.4) { Audio.sfx.glitch(); $('endTitle').classList.toggle('glitch'); }
    }
  }
}
