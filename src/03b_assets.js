/* =====================================================================
   3b. MODELOS 3D EXTERNOS (glTF/GLB optimizados con meshopt + WebP)
   Se precargan con barra de progreso real. Si alguno falla, el juego
   usa la versión procedural de ese objeto (nunca se rompe).
   Créditos y licencias: ver README.md
   ===================================================================== */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const Assets = {
  models: {},
  list: {
    bedroom: 'models/bedroom.glb',     // cuarto del protagonista
    fish: 'models/fish.glb',           // pez low-poly
    submarine: 'models/submarine.glb', // exterior del submarino
    dino: 'models/dino.glb',           // esqueleto de alosaurio
    gaunt: 'models/gaunt.glb',         // entidad de la casa (en versión fantasma)
    crystal: 'models/crystal.glb',     // cristal de los fragmentos
  },
  /** carga todo en paralelo e informa el progreso (0..1) */
  async load(onProgress) {
    const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder);
    const keys = Object.keys(this.list); let done = 0;
    await Promise.all(keys.map((k) => L.loadAsync(this.list[k])
      .then((g) => { this.models[k] = this.prep(g.scene); })
      .catch((e) => console.warn('No se pudo cargar el modelo', k, e))
      .finally(() => { done++; onProgress && onProgress(done / keys.length); })));
  },
  /** sombras + marca de recurso compartido (disposeTree no lo libera) */
  prep(o) {
    o.traverse((m) => {
      if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true; m.userData.shared = true;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mt) => { for (const key in mt) { const v = mt[key]; if (v && v.isTexture) v.userData.keep = true; } });   // texturas compartidas entre copias
    });
    return o;
  },
  has(k) { return !!this.models[k]; },
  /**
   * Devuelve una copia normalizada: centrada en x/z, apoyada en y=0,
   * orientada (rotY o eje→+Z) y escalada para que `dim` mida `size`.
   */
  get(k, { size = 1, dim = 'y', rotY = 0, axis = null, center = true } = {}) {
    const src = this.models[k]; if (!src) return null;
    const inner = src.clone(true);
    if (axis) inner.quaternion.setFromUnitVectors(axis.clone().normalize(), new THREE.Vector3(0, 0, 1));
    else inner.rotation.y = rotY;
    const wrap = new THREE.Group(); wrap.add(inner); wrap.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(inner); const sz = b.getSize(new THREE.Vector3()); const c = b.getCenter(new THREE.Vector3());
    const s = size / (sz[dim] || 1);
    inner.scale.setScalar(s); inner.position.set(center ? -c.x * s : 0, -b.min.y * s, center ? -c.z * s : 0);
    if (axis) inner.position.y = -c.y * s; // los peces quedan centrados también en altura
    wrap.userData.size = sz.multiplyScalar(s);
    return wrap;
  },
  /** clona los materiales de una copia para poder teñirlos sin afectar a las demás */
  ownMaterials(obj, fn) {
    obj.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.userData.shared = false; m.userData.sharedGeo = true; fn && fn(m.material, m); } });
    return obj;
  },
};
