/* =====================================================================
   4. ENTIDADES COMPARTIDAS: fragmentos azules, portales, grieta 3D, peces
   ===================================================================== */
const FRAG_BLUE = 0x2f8bff, FRAG_EMISSIVE = 0x0b55ff;   // ÚNICO color de todos los fragmentos

/** Geometría de cristal facetado y quebrado (estilo low-poly de la referencia) */
function shardGeometry(seed = 1, h = 0.9, r = 0.24) {
  let s = seed * 9301; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const g = new THREE.CylinderGeometry(0, r, h, 5, 3, false);
  const p = g.attributes.position; const map = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3);
    if (!map.has(k)) {
      const y = p.getY(i); const bottom = y < -h / 2 + 0.01;
      map.set(k, [(rnd() - 0.5) * r * 0.5, bottom ? (rnd() - 0.2) * h * 0.35 : (rnd() - 0.5) * h * 0.08, (rnd() - 0.5) * r * 0.5]);
    }
    const d = map.get(k); p.setXYZ(i, p.getX(i) * 1.25 + d[0], p.getY(i) + d[1], p.getZ(i) * 0.7 + d[2]);
  }
  g.computeVertexNormals(); return g.toNonIndexed();
}
const fragMat = () => new THREE.MeshStandardMaterial({ color: FRAG_BLUE, emissive: FRAG_EMISSIVE, emissiveIntensity: 0.85, roughness: 0.12, metalness: 0.25, flatShading: true, transparent: true, opacity: 0.93 });
let _haloTex = null;
function haloTex() {
  if (_haloTex) return _haloTex;
  _haloTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(160,215,255,1)'); gr.addColorStop(0.25, 'rgba(58,160,255,.55)'); gr.addColorStop(1, 'rgba(10,60,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  _haloTex.userData.keep = true; return _haloTex;
}
/** Fragmento coleccionable azul (mismo diseño en los 3 mundos) */
function makeFragment(variant = 0, withLight = true) {
  const grp = new THREE.Group(); grp.name = 'fragment';
  const shard = new THREE.Mesh(shardGeometry(variant + 1), fragMat());
  const core = new THREE.Mesh(shardGeometry(variant + 7, 0.55, 0.11), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  const chip = new THREE.Mesh(shardGeometry(variant + 3, 0.3, 0.09), fragMat()); chip.position.set(0.22, -0.18, 0.05); chip.rotation.z = -0.6;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: 0x3aa0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(1.6);
  grp.add(shard, core, chip, halo);
  if (withLight) { const l = new THREE.PointLight(0x3aa0ff, 2.2, 6, 1.6); grp.add(l); grp.userData.light = l; }
  grp.userData.shard = shard;
  grp.userData.update = (t) => { shard.rotation.y = t * 0.9; core.rotation.y = -t * 1.3; chip.rotation.y = t * 1.6; grp.position.y = (grp.userData.baseY ?? grp.position.y) + Math.sin(t * 2) * 0.06; halo.material.opacity = 0.65 + Math.sin(t * 3) * 0.2; };
  return grp;
}

/** Animación de recolección: el fragmento vuela hacia la cámara y se suma al HUD */
function collectFragment(frag, key, scene) {
  if (State.fragments[key]) return;
  State.fragments[key] = true; State.inventory.push('fragmento-' + key); saveProgress();
  Audio.sfx.collect(); haptic([40, 60, 120]);
  const start = frag.getWorldPosition(new THREE.Vector3()); const t0 = performance.now();
  frag.userData.collecting = true;
  const anim = () => {
    const k = Math.min((performance.now() - t0) / 900, 1);
    const target = camera.position.clone().add(new THREE.Vector3(0.35, 0.25, -0.6).applyQuaternion(camera.quaternion));
    const p = start.clone().lerp(target, k * k);
    if (frag.parent) { frag.parent.worldToLocal(p); frag.position.copy(p); frag.userData.baseY = p.y; }
    frag.scale.setScalar(1 - k * 0.85);
    if (k < 1) requestAnimationFrame(anim); else { frag.visible = false; HUD.fragments(); }
  };
  anim();
  HUD.flash(true); setTimeout(() => HUD.flash(false), 160);
}

/* ---------- PORTAL TRIDIMENSIONAL ---------- */
const portalVS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const portalFS = `uniform float uTime; uniform float uOpen; varying vec2 vUv;
  void main(){ vec2 p=vUv*2.0-1.0; float r=length(p); float a=atan(p.y,p.x);
    float sw=sin(a*5.0 + log(r+0.02)*9.0 - uTime*3.0); float sw2=sin(a*3.0 - log(r+0.02)*6.0 + uTime*2.0);
    vec3 c=mix(vec3(0.01,0.05,0.25), vec3(0.15,0.55,1.0), 0.5+0.5*sw); c=mix(c, vec3(0.75,0.92,1.0), smoothstep(0.6,1.0,sw2)*0.6);
    c+= vec3(0.6,0.85,1.0)*pow(1.0-r,3.0)*1.4; float edge=smoothstep(1.0,0.82,r);
    gl_FragColor=vec4(c, edge*uOpen); }`;
const tunnelFS = `uniform float uTime; uniform float uOpen; varying vec2 vUv;
  void main(){ float s=sin(vUv.x*31.4 + vUv.y*12.0 - uTime*4.0)*0.5+0.5; float d=vUv.y;
    vec3 c=mix(vec3(0.0,0.05,0.25), vec3(0.2,0.6,1.0), s*(0.4+d)); gl_FragColor=vec4(c, uOpen*(0.35+0.65*d)); }`;
class Portal {
  constructor(radius = 1.4) {
    this.radius = radius; this.open = 0; this.unlocked = false; this.crossed = false;
    const g = this.group = new THREE.Group(); g.name = 'portal';
    // marco de piedra facetada con cristales azules incrustados
    const ring = new THREE.Mesh(jitter(new THREE.TorusGeometry(radius + 0.12, 0.2, 6, 22), 0.035), M.std(0x2a3346, { roughness: 0.9 }));
    ring.castShadow = true; g.add(ring);
    this.crystals = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + 0.2; const c = new THREE.Mesh(shardGeometry(i + 11, 0.42, 0.1), fragMat());
      c.position.set(Math.cos(a) * (radius + 0.3), Math.sin(a) * (radius + 0.3), 0.05); c.rotation.z = a - Math.PI / 2; g.add(c); this.crystals.push(c);
    }
    this.uniforms = { uTime: { value: 0 }, uOpen: { value: 0 } };
    this.disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), new THREE.ShaderMaterial({ vertexShader: portalVS, fragmentShader: portalFS, uniforms: this.uniforms, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    g.add(this.disc);
    // túnel con profundidad detrás de la superficie
    const tg = new THREE.CylinderGeometry(radius * 0.98, radius * 0.25, 2.6, 32, 1, true); tg.rotateX(Math.PI / 2); tg.translate(0, 0, -1.3);
    this.tunnel = new THREE.Mesh(tg, new THREE.ShaderMaterial({ vertexShader: portalVS, fragmentShader: tunnelFS, uniforms: this.uniforms, transparent: true, side: THREE.BackSide, depthWrite: false }));
    g.add(this.tunnel);
    // partículas en espiral
    const n = 160, pos = new Float32Array(n * 3); this.pData = [];
    for (let i = 0; i < n; i++) this.pData.push({ a: rand(0, TAU), r: rand(0.2, radius * 1.4), s: rand(0.4, 1.2), z: rand(-0.3, 0.6) });
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.points = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x9fd6ff, size: 0.05, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(this.points);
    this.light = new THREE.PointLight(0x3aa0ff, 0, 9, 1.5); this.light.position.z = 0.6; g.add(this.light);
    this.disc.visible = this.tunnel.visible = false;
  }
  unlock(silent) {
    if (this.unlocked) return; this.unlocked = true; State.gameplay.portalUnlocked = true;
    this.disc.visible = this.tunnel.visible = true; if (!silent) { Audio.sfx.portalOpen(); haptic([30, 40, 30, 40, 200]); }
  }
  update(t, dt) {
    this.open = damp(this.open, this.unlocked ? 1 : 0, 2.2, dt);
    this.uniforms.uTime.value = t; this.uniforms.uOpen.value = this.open;
    this.disc.scale.setScalar(Math.max(this.open, 0.001));
    this.light.intensity = this.open * 3.2;
    this.points.material.opacity = this.open * 0.9;
    const arr = this.points.geometry.attributes.position.array;
    this.pData.forEach((p, i) => { p.a += dt * p.s; p.r -= dt * 0.35 * p.s; if (p.r < 0.1) p.r = this.radius * 1.4; arr[i * 3] = Math.cos(p.a) * p.r; arr[i * 3 + 1] = Math.sin(p.a) * p.r; arr[i * 3 + 2] = p.z * (p.r / this.radius); });
    this.points.geometry.attributes.position.needsUpdate = true;
    this.crystals.forEach((c, i) => { c.material.emissiveIntensity = 0.3 + this.open * (0.8 + Math.sin(t * 3 + i) * 0.3); });
  }
  /** ¿el punto atravesó la superficie del portal entre el frame anterior y el actual? */
  checkCross(prev, cur) {
    if (!this.unlocked || this.open < 0.25 || this.crossed) return false;
    this.group.updateMatrixWorld();
    const inv = this.group.matrixWorld.clone().invert();
    const a = prev.clone().applyMatrix4(inv), b = cur.clone().applyMatrix4(inv);
    if ((a.z > 0 && b.z <= 0) || (a.z < 0 && b.z >= 0)) {
      const k = a.z / (a.z - b.z); const hit = a.clone().lerp(b, k);
      if (Math.hypot(hit.x, hit.y) < this.radius * 1.05) { this.crossed = true; return true; }
    }
    return false;
  }
}

/* ---------- GRIETA TRIDIMENSIONAL (fractura real con profundidad) ---------- */
/** Genera el contorno irregular de una grieta a lo largo del eje X */
function crackOutline(len, maxW, segs, seed = 1) {
  let s = seed * 7919; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const top = [], bot = []; let cy = 0;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, x = -len / 2 + t * len;
    cy += (rnd() - 0.5) * len / segs * 1.1;
    const w = maxW * Math.pow(Math.sin(Math.PI * t), 0.8) * (0.55 + rnd() * 0.6) + 0.015;
    top.push(new THREE.Vector2(x + (rnd() - 0.5) * 0.08, cy + w / 2 + rnd() * 0.05));
    bot.push(new THREE.Vector2(x + (rnd() - 0.5) * 0.08, cy - w / 2 - rnd() * 0.05));
  }
  return top.concat(bot.reverse());
}
/**
 * Losa de piso fracturada: la grieta es un HUECO REAL extruido (paredes internas
 * con profundidad), con fondo luminoso, sombreado por profundidad y escombros.
 */
function makeCrack({ radius = 4.2, depth = 2.2, len = 6.2, width = 1.15, seed = 3, glow = 0x2f8bff } = {}) {
  const grp = new THREE.Group(); grp.name = 'crack';
  const outer = new THREE.Shape(); const N = 28;
  for (let i = 0; i < N; i++) { const a = (i / N) * TAU, r = radius * (0.9 + Math.sin(i * 2.7 + seed) * 0.06 + Math.random() * 0.05); i ? outer.lineTo(Math.cos(a) * r, Math.sin(a) * r) : outer.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const main = crackOutline(len, width, 18, seed); outer.holes.push(new THREE.Path(main));
  // ramificaciones laterales (huecos menores)
  const branch1 = crackOutline(1.7, 0.28, 7, seed + 2).map((v) => new THREE.Vector2(v.x * 0.9 + 1.2, v.y + v.x * 0.55 + 1.3));
  const branch2 = crackOutline(1.4, 0.22, 6, seed + 5).map((v) => new THREE.Vector2(v.x * 0.9 - 1.5, v.y - v.x * 0.6 - 1.25));
  outer.holes.push(new THREE.Path(branch1), new THREE.Path(branch2));
  const geo = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 1, curveSegments: 1 });
  geo.rotateX(Math.PI / 2); // la extrusión va hacia abajo (Y negativo)
  // sombreado por profundidad: oscuro arriba en las paredes, teñido de azul cerca del fondo
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const rock = new THREE.Color(0x5d6372), deep = new THREE.Color(0x05070d), lit = new THREE.Color(0x1d5bd8);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i); const k = clamp(-y / depth, 0, 1);
    const c = y > -0.05 ? rock.clone().multiplyScalar(0.85 + Math.random() * 0.25) : deep.clone().lerp(lit, Math.pow(k, 2.2));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const slab = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, side: THREE.DoubleSide }));
  slab.receiveShadow = true; slab.castShadow = true; grp.add(slab);
  // fondo luminoso y bruma de energía dentro de la fractura
  const glowMat = new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.95 });
  const bottom = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(main)), glowMat); bottom.rotation.x = -Math.PI / 2; bottom.scale.set(1, -1, 1); bottom.position.y = -depth + 0.02; grp.add(bottom);
  const mist = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.8, depth * 1.2), new THREE.MeshBasicMaterial({ color: 0x3aa0ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(0, -depth * 0.45, (i - 2) * 0.06); grp.add(m); mist.push(m);
  }
  const light = new THREE.PointLight(0x3aa0ff, 14, 9, 1.3); light.position.set(0, -depth * 0.6, 0); grp.add(light);
  // placas fracturadas levantadas e inclinadas sobre el borde (superficie quebrada)
  const lipMat = new THREE.MeshStandardMaterial({ color: 0x5d6372, flatShading: true, roughness: 0.95 });
  for (let i = 1; i < main.length - 1; i += 1) {
    const a = main[i], b = main[(i + 1) % main.length]; if (a.distanceTo(b) > 1.2) continue;
    const mid = a.clone().add(b).multiplyScalar(0.5); const along = b.clone().sub(a); const len2 = along.length();
    const nrm = new THREE.Vector2(along.y, -along.x).normalize(); // hacia afuera del hueco
    const pd = rand(0.3, 0.6); const plate = new THREE.Mesh(jitter(new THREE.BoxGeometry(len2 * 1.05, 0.14, pd), 0.04), lipMat);
    const out = pd / 2 + 0.03;
    plate.position.set(mid.x + nrm.x * out, 0.02 + Math.random() * 0.05, mid.y + nrm.y * out);
    plate.rotation.y = -Math.atan2(along.y, along.x);
    plate.rotateX(-(0.12 + Math.random() * 0.28) * Math.sign(nrm.y || 1) * (Math.random() < 0.5 ? 1 : 0.4));
    plate.rotateZ(rand(-0.08, 0.08)); plate.castShadow = true; plate.receiveShadow = true; grp.add(plate);
  }
  const debrisMat = M.std(0x4a4f5c, { roughness: 1 });
  for (let i = 0; i < 30; i++) {
    const v = main[Math.floor(Math.random() * main.length)];
    const d = new THREE.Mesh(jitter(new THREE.DodecahedronGeometry(rand(0.06, 0.22), 0), 0.03), debrisMat);
    d.position.set(v.x + rand(-0.6, 0.6), rand(0.02, 0.12), v.y + rand(-0.8, 0.8)); d.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); d.castShadow = true; grp.add(d);
  }
  // fragmentos de roca suspendidos dentro de la grieta (refuerzan la profundidad)
  for (let i = 0; i < 10; i++) {
    const v = main[Math.floor(rand(3, main.length / 2 - 3))];
    const d = new THREE.Mesh(jitter(new THREE.TetrahedronGeometry(rand(0.08, 0.2), 0), 0.03), debrisMat);
    d.position.set(v.x, -rand(0.4, depth * 0.8), v.y - rand(0.05, 0.3)); grp.add(d);
  }
  // partículas ascendentes
  const n = 120, pp = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pp[i * 3] = rand(-len / 2.4, len / 2.4); pp[i * 3 + 1] = rand(-depth, 2); pp[i * 3 + 2] = rand(-0.3, 0.3); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x9fd6ff, size: 0.04, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); grp.add(pts);
  grp.userData.outline = main;
  grp.userData.update = (t, dt) => {
    light.intensity = 13 + Math.sin(t * 2.3) * 3 + Math.sin(t * 7.1) * 1.2;
    mist.forEach((m, i) => (m.material.opacity = 0.08 + Math.sin(t * 1.5 + i) * 0.05));
    const a = pg.attributes.position.array; for (let i = 0; i < n; i++) { a[i * 3 + 1] += dt * (0.3 + (i % 5) * 0.1); if (a[i * 3 + 1] > 2.2) a[i * 3 + 1] = -depth; }
    pg.attributes.position.needsUpdate = true;
  };
  /** ¿el punto (x,z local) está sobre el hueco de la grieta? */
  grp.userData.isOver = (x, z) => pointInPoly(x, z, main);
  return grp;
}
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* ---------- PEZ 3D LOW-POLY (estilo de la referencia) ---------- */
const SPECIES = [
  { id: 'dorado', name: 'Pez Dorado', body: 0xff6a1f, stripe: 0xfff4ea, fin: 0xf2e6dc, stripes: 3, size: 0.42 },
  { id: 'payaso', name: 'Pez Payaso', body: 0xff8a00, stripe: 0xffffff, fin: 0x222222, stripes: 2, size: 0.34 },
  { id: 'limon', name: 'Pez Limón', body: 0xffd23a, stripe: 0xfff7c4, fin: 0xffb000, stripes: 0, size: 0.38 },
  { id: 'coral', name: 'Pez Coral', body: 0xff4f7b, stripe: 0xffd1dc, fin: 0xffb3c6, stripes: 4, size: 0.36 },
  { id: 'menta', name: 'Pez Menta', body: 0x2fd6a0, stripe: 0xe6fff6, fin: 0xa6ffe0, stripes: 1, size: 0.4 },
];
function makeFish(sp, shiny = false) {
  const grp = new THREE.Group(); grp.name = 'fish';
  // cuerpo: esfera facetada estirada, con franjas por color de vértice
  const g = new THREE.SphereGeometry(1, 8, 6).toNonIndexed();
  g.scale(0.55, 0.62, 1.05);
  const p = g.attributes.position; const col = new Float32Array(p.count * 3);
  const cb = new THREE.Color(sp.body), cs = new THREE.Color(sp.stripe), head = new THREE.Color(0xf6efe8);
  for (let i = 0; i < p.count; i += 3) {
    const zc = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3; // por cara → franjas nítidas
    let c = cb;
    if (zc > 0.62) c = head; else if (sp.stripes && Math.floor((zc + 1) * sp.stripes * 1.6) % 2 === 1) c = cs;
    if (shiny) c = new THREE.Color(0xfff2c0).lerp(new THREE.Color(0x9fd6ff), Math.random() * 0.4);
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
    if (p.getZ(i) > 0.9) p.setZ(i, p.getZ(i) * 0.92);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.55, metalness: 0.05 });
  if (shiny) { bodyMat.emissive = new THREE.Color(0xffe9a8); bodyMat.emissiveIntensity = 0.55; bodyMat.transparent = true; bodyMat.opacity = 0.82; }
  const body = new THREE.Mesh(g, bodyMat); grp.add(body);
  const finMat = new THREE.MeshStandardMaterial({ color: shiny ? 0xfffbe6 : sp.fin, flatShading: true, side: THREE.DoubleSide, roughness: 0.6, emissive: shiny ? 0xffe9a8 : 0x000000, emissiveIntensity: shiny ? 0.5 : 0 });
  const tri = (pts) => { const s = new THREE.Shape(); s.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) s.lineTo(pts[i], pts[i + 1]); return new THREE.ShapeGeometry(s); };
  // cola (con pivote para animarla)
  const tailPivot = new THREE.Group(); tailPivot.position.z = -0.95; grp.add(tailPivot);
  const tailB = new THREE.Mesh(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(-0.85, 0.62); s.lineTo(-0.5, 0); s.lineTo(-0.85, -0.62); s.lineTo(0, 0); return s; })()), finMat);
  tailB.rotation.y = Math.PI / 2; tailPivot.add(tailB);
  // aletas dorsal, ventral y pectorales
  const dorsal = new THREE.Mesh(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0.35, 0); s.lineTo(-0.1, 0.55); s.lineTo(-0.45, 0); return s; })()), finMat);
  dorsal.rotation.y = Math.PI / 2; dorsal.position.set(0, 0.55, 0); grp.add(dorsal);
  const ventral = dorsal.clone(); ventral.scale.set(0.6, -0.55, 1); ventral.position.set(0, -0.55, -0.15); grp.add(ventral);
  const pecL = new THREE.Mesh(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(-0.35, 0.28); s.lineTo(-0.4, -0.05); return s; })()), finMat);
  pecL.position.set(0.5, -0.15, 0.25); pecL.rotation.set(0, Math.PI / 2 + 0.6, 0.3); grp.add(pecL);
  const pecR = pecL.clone(); pecR.position.x = -0.5; pecR.rotation.set(0, Math.PI / 2 - 0.6 + Math.PI, -0.3); grp.add(pecR);
  // ojos con iris
  const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), M.std(0xff9a3c, { flatShading: false }));
  const eyeB = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M.std(0x111111, { flatShading: false, roughness: 0.2 }));
  [1, -1].forEach((s) => { const e = eyeW.clone(); e.position.set(0.42 * s, 0.14, 0.62); const b = eyeB.clone(); b.position.set(0.5 * s, 0.15, 0.66); grp.add(e, b); });
  if (shiny) { const f = makeFragment(4, false); f.scale.setScalar(0.55); f.position.set(0, 0, 0); grp.add(f); grp.userData.innerFrag = f; const l = new THREE.PointLight(0xfff0c0, 2.5, 5); grp.add(l); }
  grp.scale.setScalar(sp.size);
  grp.userData.tail = tailPivot; grp.userData.pecs = [pecL, pecR]; grp.userData.phase = rand(0, TAU);
  grp.userData.animate = (t, speed = 1) => {
    const ph = grp.userData.phase;
    tailPivot.rotation.y = Math.sin(t * 9 * speed + ph) * 0.55;
    body.rotation.y = Math.sin(t * 9 * speed + ph + 1.2) * 0.07;
    pecL.rotation.z = 0.3 + Math.sin(t * 6 + ph) * 0.3; pecR.rotation.z = -0.3 - Math.sin(t * 6 + ph) * 0.3;
  };
  return grp;
}
