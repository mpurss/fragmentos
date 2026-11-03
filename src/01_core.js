import * as THREE from 'three';

/* =====================================================================
   1. NÚCLEO: renderer, cámara, estado del juego y utilidades de HUD
   ===================================================================== */
const $ = (id) => document.getElementById(id);
const canvas = $('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));        // regla mobile-first
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 260);
const clock = new THREE.Clock();
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

/** Estado global (sigue el esquema AppState del SDD) */
const State = {
  isInitialized: false,
  currentWorld: 'intro',            // 'intro' | 'ocean' | 'museum' | 'hauntedHouse' | 'final'
  fragments: { ocean: false, museum: false, hauntedHouse: false },
  inventory: [],
  puzzleProgress: {},
  collectedSpecies: [],
  dangerLevel: 0,
  sensors: { gyroscopeAllowed: false, micAllowed: false, cameraAllowed: false },
  orientationData: { alpha: 0, beta: 0, gamma: 0 },
  audioMetrics: { volume: 0, bassLevel: 0 },
  gameplay: { breathTimer: 0, noiseThreshold: 0.32, portalUnlocked: false },
  renderConfig: { particleCount: 400, colorPalette: ['#3aa0ff', '#7fd0ff', '#0b3b8c'], speedMultiplier: 1 },
};
function saveProgress() {
  try { sessionStorage.setItem('fdp-progress', JSON.stringify({ fragments: State.fragments, species: State.collectedSpecies })); } catch (e) {}
}

/* ---------- HUD ---------- */
const HUD = {
  setWorld(idx, name) { $('hudIdx').textContent = idx; $('hudName').textContent = name; },
  objective(t) { const o = $('objective'); o.style.opacity = 0; setTimeout(() => { o.innerHTML = t; o.style.opacity = 1; }, 200); },
  _tt: 0,
  toast(t, ms = 2600, danger = false) {
    const el = $('toast'); el.textContent = t; el.classList.toggle('danger', danger); el.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => el.classList.remove('show'), ms);
  },
  fragments() {
    const n = Object.values(State.fragments).filter(Boolean).length;
    ['ocean', 'museum', 'hauntedHouse'].forEach((k, i) => $('f' + i).classList.toggle('on', State.fragments[k]));
    $('fCount').textContent = n + '/3';
  },
  meter(show, label, value, mark, color) {
    const m = $('meter'); m.classList.toggle('show', !!show);
    if (!show) return;
    $('meterLbl').textContent = label;
    $('meterFill').style.width = (clamp(value, 0, 1) * 100) + '%';
    $('meterFill').style.background = color || 'var(--blue)';
    $('meterMark').style.display = mark == null ? 'none' : 'block';
    if (mark != null) $('meterMark').style.left = (mark * 100) + '%';
  },
  sensors() {
    $('sGyro').classList.toggle('on', State.sensors.gyroscopeAllowed);
    $('sMic').classList.toggle('on', State.sensors.micAllowed);
    $('sCam').classList.toggle('on', State.sensors.cameraAllowed);
  },
  reticle(hot) { $('reticle').classList.toggle('hot', !!hot); },
  flash(on) { $('flash').style.opacity = on ? 1 : 0; },
  red(ms = 400) { const r = $('redfx'); r.style.opacity = 1; setTimeout(() => (r.style.opacity = 0), ms); },
  worldCard(idx, name, sub) {
    $('wcIdx').textContent = idx; $('wcName').textContent = name; $('wcSub').textContent = sub || '';
    const c = $('worldCard'); c.classList.add('show'); setTimeout(() => c.classList.remove('show'), 2600);
  },
};

/** Vibración háptica (Android; iOS la ignora silenciosamente) */
function haptic(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

/* ---------- utilidades de materiales y geometría low-poly ---------- */
const M = {
  std: (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.75, metalness: 0.05, ...o }),
  basic: (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o }),
};
/** Desplaza vértices de una geometría al azar (aspecto roca / fractura) */
function jitter(geo, amt) {
  const p = geo.attributes.position; const map = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3);
    if (!map.has(k)) map.set(k, [rand(-amt, amt), rand(-amt, amt), rand(-amt, amt)]);
    const d = map.get(k); p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
  }
  geo.computeVertexNormals(); return geo;
}
/** Textura desde canvas 2D */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
/** Libera geometrías, materiales y texturas de un objeto (al cambiar de mundo) */
function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { for (const k in m) { const v = m[k]; if (v && v.isTexture && !v.userData.keep) v.dispose(); } m.dispose(); });
    }
  });
}
