/**
 * Neon Shooter 3D — third-person shooter with GLTF humanoids + held weapons
 * Models: Mixamo Soldier/Xbot (via three.js examples) + Kenney Blaster Kit (CC0)
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const canvas = document.getElementById("c");
const $ = (id) => document.getElementById(id);

const LEVELS = [
  {
    id: "neon-rooftop",
    name: "霓虹天台",
    desc: "赛博都市天台巷战",
    fog: 0x12081f,
    fogNear: 22,
    fogFar: 78,
    sky: 0x0a0618,
    ground: 0x1a1430,
    accent: 0x00f5ff,
    accent2: 0xff2bd6,
    ambient: 0x5060b0,
    sun: 0xff88dd,
    hemiSky: 0x6688ff,
    hemiGround: 0x220033,
    waves: [3, 5, 8],
  },
  {
    id: "desert-ruins",
    name: "沙漠遗迹",
    desc: "废墟沙丘狙击战",
    fog: 0xd2b48c,
    fogNear: 28,
    fogFar: 95,
    sky: 0xf0d9a8,
    ground: 0xc4a46c,
    accent: 0xffaa33,
    accent2: 0x8b4513,
    ambient: 0xffe8b8,
    sun: 0xfff0c8,
    hemiSky: 0xffe0a0,
    hemiGround: 0x8a6230,
    waves: [3, 6, 9],
  },
  {
    id: "ice-base",
    name: "冰原基地",
    desc: "极地工业据点突袭",
    fog: 0xb0d4ec,
    fogNear: 24,
    fogFar: 88,
    sky: 0xc5dff2,
    ground: 0xe2eef8,
    accent: 0x33ddff,
    accent2: 0x4477ff,
    ambient: 0xc0d8f0,
    sun: 0xffffff,
    hemiSky: 0xe8f4ff,
    hemiGround: 0x6a88a8,
    waves: [4, 7, 10],
  },
];

const STORAGE_KEY = "neon-shooter-unlock";
const ASSET_BASE = "assets/";

function loadUnlock() {
  try {
    const n = parseInt(localStorage.getItem(STORAGE_KEY) || "1", 10);
    return Math.min(Math.max(1, n), LEVELS.length);
  } catch {
    return 1;
  }
}
function saveUnlock(levelIndex1Based) {
  try {
    const cur = loadUnlock();
    if (levelIndex1Based > cur) localStorage.setItem(STORAGE_KEY, String(levelIndex1Based));
  } catch {}
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.55,
    metalness: opts.metalness ?? 0.25,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    flatShading: opts.flatShading ?? false,
  });
}

function box(w, h, d, material, y = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rTop, rBot, h, material, y = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), material);
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* ---------- Asset cache ---------- */
const Assets = {
  ready: false,
  soldier: null,
  xbot: null,
  rifle: null,
  smg: null,
  crateMed: null,
  crateSmall: null,
  error: null,
};

let _assetsPromise = null;
async function loadAllAssets() {
  if (_assetsPromise) return _assetsPromise;
  _assetsPromise = (async () => {
    const loader = new GLTFLoader();
    const load = (url) =>
      new Promise((resolve, reject) => {
        loader.load(url, (gltf) => resolve(gltf), undefined, (err) => reject(err));
      });
    try {
      const [soldier, xbot, rifle, smg, crateMed, crateSmall] = await Promise.all([
        load(ASSET_BASE + "models/Soldier.glb"),
        load(ASSET_BASE + "models/Xbot.glb"),
        load(ASSET_BASE + "weapons/blaster-rifle.glb"),
        load(ASSET_BASE + "weapons/blaster-smg.glb"),
        load(ASSET_BASE + "models/crate-medium.glb"),
        load(ASSET_BASE + "models/crate-small.glb"),
      ]);
      Assets.soldier = soldier;
      Assets.xbot = xbot;
      Assets.rifle = rifle;
      Assets.smg = smg;
      Assets.crateMed = crateMed;
      Assets.crateSmall = crateSmall;
      Assets.ready = true;
      console.info("[NeonShooter] GLTF assets loaded");
    } catch (e) {
      Assets.error = e;
      console.warn("[NeonShooter] GLTF load failed, using procedural fallback", e);
      Assets.ready = false;
      _assetsPromise = null; // allow retry
    }
  })();
  return _assetsPromise;
}

function findBone(root, names) {
  for (const n of names) {
    const b = root.getObjectByName(n);
    if (b) return b;
  }
  let found = null;
  root.traverse((o) => {
    if (found || !o.isBone) return;
    const ln = (o.name || "").toLowerCase();
    if (names.some((n) => ln === n.toLowerCase() || ln.endsWith(n.toLowerCase().replace("mixamorig:", "")))) {
      found = o;
    }
  });
  return found;
}

function enableShadows(root) {
  root.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
      if (c.material) {
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        for (const m of mats) {
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          m.side = THREE.FrontSide;
        }
      }
    }
  });
}

function tintCharacter(root, { emissive = 0x000000, emissiveIntensity = 0, multiply = null } = {}) {
  root.traverse((c) => {
    if (!c.isMesh || !c.material) return;
    const mats = Array.isArray(c.material) ? c.material : [c.material];
    const cloned = mats.map((m) => {
      const cm = m.clone();
      if (multiply) cm.color = cm.color.clone().multiply(new THREE.Color(multiply));
      if (emissive) {
        cm.emissive = new THREE.Color(emissive);
        cm.emissiveIntensity = emissiveIntensity;
      }
      return cm;
    });
    c.material = cloned.length === 1 ? cloned[0] : cloned;
  });
}

/** Procedural high-proportion humanoid + rifle (fallback if GLTF missing) */
function createProceduralHumanoid(options = {}) {
  const {
    bodyColor = 0x2a3348,
    accent = 0x00f5ff,
    accent2 = 0xff2bd6,
    isEnemy = false,
    scale = 1,
  } = options;

  const root = new THREE.Group();
  root.userData.isEnemy = isEnemy;

  const bodyMat = mat(bodyColor, { metalness: 0.35, roughness: 0.45 });
  const accentMat = mat(accent, { emissive: accent, emissiveIntensity: 0.55, metalness: 0.55, roughness: 0.3 });
  const accent2Mat = mat(accent2, { emissive: accent2, emissiveIntensity: 0.4, metalness: 0.45, roughness: 0.35 });
  const darkMat = mat(0x10141c, { metalness: 0.75, roughness: 0.3 });
  const skinMat = mat(isEnemy ? 0x7a8896 : 0xd2b8a0, { roughness: 0.72, metalness: 0.05 });

  // ~1.8m human proportions (units ≈ meters)
  const pelvis = box(0.34, 0.18, 0.22, bodyMat, 0.95);
  const torso = box(0.4, 0.42, 0.24, bodyMat, 1.25);
  const chest = box(0.44, 0.22, 0.26, bodyMat, 1.52);
  const neck = cyl(0.055, 0.065, 0.1, skinMat, 1.68, 8);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skinMat);
  head.position.y = 1.86;
  head.scale.set(1, 1.15, 1.05);
  head.castShadow = true;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), darkMat);
  hair.position.set(0, 1.92, -0.01);
  hair.castShadow = true;
  const visor = box(0.22, 0.05, 0.04, accentMat, 1.88);
  visor.position.z = 0.11;

  const thighL = cyl(0.07, 0.06, 0.42, bodyMat, 0.68, 8);
  thighL.position.x = -0.11;
  const thighR = cyl(0.07, 0.06, 0.42, bodyMat, 0.68, 8);
  thighR.position.x = 0.11;
  const calfL = cyl(0.055, 0.05, 0.4, bodyMat, 0.28, 8);
  calfL.position.x = -0.11;
  const calfR = cyl(0.055, 0.05, 0.4, bodyMat, 0.28, 8);
  calfR.position.x = 0.11;
  const bootL = box(0.12, 0.1, 0.24, darkMat, 0.05);
  bootL.position.set(-0.11, 0, 0.04);
  const bootR = box(0.12, 0.1, 0.24, darkMat, 0.05);
  bootR.position.set(0.11, 0, 0.04);

  const shoulderL = cyl(0.08, 0.08, 0.14, bodyMat, 1.58, 8);
  shoulderL.rotation.z = Math.PI / 2;
  shoulderL.position.set(-0.28, 0, 0);
  const shoulderR = cyl(0.08, 0.08, 0.14, bodyMat, 1.58, 8);
  shoulderR.rotation.z = Math.PI / 2;
  shoulderR.position.set(0.28, 0, 0);

  const upperArmL = cyl(0.05, 0.045, 0.32, bodyMat, 1.35, 8);
  upperArmL.position.x = -0.36;
  const upperArmR = cyl(0.05, 0.045, 0.32, bodyMat, 1.35, 8);
  upperArmR.position.x = 0.36;
  const foreArmL = cyl(0.042, 0.038, 0.28, skinMat, 1.05, 8);
  foreArmL.position.x = -0.38;
  const foreArmR = cyl(0.042, 0.038, 0.28, skinMat, 1.05, 8);
  foreArmR.position.x = 0.38;
  const handL = box(0.08, 0.1, 0.1, skinMat, 0.88);
  handL.position.x = -0.38;
  const handR = new THREE.Group();
  handR.name = "RightHand";
  handR.position.set(0.38, 0.88, 0.08);
  const handMesh = box(0.08, 0.1, 0.1, skinMat, 0);
  handR.add(handMesh);

  const glow = box(0.28, 0.06, 0.04, accentMat, 1.4);
  glow.position.z = 0.14;
  const stripe = box(0.05, 0.35, 0.03, accent2Mat, 1.35);
  stripe.position.z = 0.14;

  if (isEnemy) {
    const hornL = box(0.04, 0.14, 0.04, accent2Mat, 2.05);
    hornL.position.x = -0.08;
    const hornR = box(0.04, 0.14, 0.04, accent2Mat, 2.05);
    hornR.position.x = 0.08;
    root.add(hornL, hornR);
  }

  const weapon = createProceduralRifle(accent, accent2, darkMat);
  handR.add(weapon);

  root.add(
    pelvis, torso, chest, neck, head, hair, visor, glow, stripe,
    thighL, thighR, calfL, calfR, bootL, bootR,
    shoulderL, shoulderR, upperArmL, upperArmR, foreArmL, foreArmR, handL, handR
  );

  root.userData.headY = 1.86;
  root.userData.radius = 0.4;
  root.userData.height = 1.95;
  root.userData.weapon = weapon;
  root.userData.muzzle = weapon.userData.muzzle;
  root.userData.limbs = { legL: thighL, legR: thighR, armL: upperArmL, armR: upperArmR };
  root.userData.mixer = null;
  root.userData.actions = null;
  root.userData.procedural = true;
  root.scale.setScalar(scale);
  return root;
}

function createProceduralRifle(accent, accent2, darkMat) {
  const weapon = new THREE.Group();
  weapon.name = "weapon";
  const stock = box(0.06, 0.1, 0.18, darkMat, 0);
  stock.position.set(0, 0, -0.22);
  const receiver = box(0.07, 0.1, 0.42, darkMat, 0);
  const grip = box(0.05, 0.14, 0.08, darkMat, -0.08);
  grip.position.z = -0.05;
  const barrel = cyl(0.018, 0.022, 0.38, mat(accent, { emissive: accent, emissiveIntensity: 0.5 }), 0, 8);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.38;
  const mag = box(0.05, 0.16, 0.08, darkMat, -0.12);
  mag.position.z = 0.05;
  const sight = box(0.03, 0.06, 0.1, mat(accent2, { emissive: accent2, emissiveIntensity: 0.6 }), 0.08);
  sight.position.z = 0.08;
  const muzzle = new THREE.Object3D();
  muzzle.name = "muzzle";
  muzzle.position.set(0, 0, 0.58);
  weapon.add(stock, receiver, grip, barrel, mag, sight, muzzle);
  weapon.userData.muzzle = muzzle;
  weapon.rotation.set(-0.15, 0, 0.05);
  weapon.position.set(0.02, 0.02, 0.12);
  weapon.scale.setScalar(1.15);
  return weapon;
}

function cloneGltfScene(gltf) {
  return SkeletonUtils.clone(gltf.scene);
}

function prepareWeaponFromGltf(gltf, accentHex) {
  const weapon = gltf.scene.clone(true);
  weapon.name = "weapon";
  enableShadows(weapon);

  // Kenney blasters: typically Y-up, barrel roughly +Z.
  // Leave scale at 1; store fitScale so attachWeaponToHand can compensate bone scale.
  const box3 = new THREE.Box3().setFromObject(weapon);
  const size = new THREE.Vector3();
  box3.getSize(size);
  const targetLen = 0.95;
  const longest = Math.max(size.x, size.y, size.z) || 1;
  weapon.scale.set(1, 1, 1);
  weapon.userData.fitScale = targetLen / longest;

  // Body: dark metal — silhouette must read without relying on full-body emissive cyan
  const accent = accentHex != null ? new THREE.Color(accentHex) : new THREE.Color(0x00f5ff);
  weapon.traverse((c) => {
    if (c.isMesh) {
      c.material = new THREE.MeshStandardMaterial({
        color: 0x1c222c,
        metalness: 0.85,
        roughness: 0.32,
        emissive: new THREE.Color(0x111820),
        emissiveIntensity: 0.08,
      });
      c.castShadow = true;
    }
  });

  // Bright accent children so the gun reads even without textures
  const tipMat = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 1.2,
    metalness: 0.4,
    roughness: 0.25,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.95,
    metalness: 0.35,
    roughness: 0.3,
  });
  const cx = (box3.min.x + box3.max.x) * 0.5;
  const cy = (box3.min.y + box3.max.y) * 0.55;
  const tipZ = box3.max.z;
  const midZ = (box3.min.z + box3.max.z) * 0.5;
  const stockZ = box3.min.z + size.z * 0.22;

  const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.08, 8), tipMat);
  barrelTip.name = "accentBarrelTip";
  barrelTip.rotation.x = Math.PI / 2;
  barrelTip.position.set(cx, cy, tipZ - 0.02);
  weapon.add(barrelTip);

  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.06), accentMat);
  sight.name = "accentSight";
  sight.position.set(cx, box3.max.y + 0.01, midZ + size.z * 0.12);
  weapon.add(sight);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.09, 0.05), accentMat);
  mag.name = "accentMag";
  mag.position.set(cx, box3.min.y + 0.02, stockZ + size.z * 0.15);
  weapon.add(mag);

  // Muzzle at barrel tip (local unscaled); world size comes from attach scale
  const muzzle = new THREE.Object3D();
  muzzle.name = "muzzle";
  muzzle.position.set(cx, cy, tipZ);
  weapon.add(muzzle);
  weapon.userData.muzzle = muzzle;

  return weapon;
}

function attachWeaponToHand(character, weapon, isPlayer) {
  const hand =
    findBone(character, ["mixamorig:RightHand", "mixamorigRightHand", "RightHand", "Hand_R", "hand_r"]) ||
    character.getObjectByName("RightHand");

  if (!hand) {
    weapon.position.set(0.28, 1.15, 0.35);
    const fit = weapon.userData.fitScale || 1;
    weapon.scale.setScalar(fit);
    character.add(weapon);
    character.userData.weapon = weapon;
    character.userData.muzzle = weapon.userData.muzzle;
    return;
  }

  character.updateMatrixWorld(true);

  // Reset, parent to hand, then set bone-local scale so WORLD length ≈ targetLen
  weapon.scale.set(1, 1, 1);
  hand.add(weapon);

  hand.updateWorldMatrix(true, true);
  const ws = new THREE.Vector3();
  hand.getWorldScale(ws);
  const compensate = 1 / Math.max(ws.x, 1e-5);
  const fit = weapon.userData.fitScale || 1;
  weapon.scale.setScalar(fit * compensate);

  // Palm grip: stock in hand, barrel along character-forward once aim pose raises the arm.
  // Chosen rotation: (-PI/2, 0, PI) — Kenney +Z barrel points character-forward with Mixamo RightHand under raised aim.
  // Alternative tried in comments: (Math.PI/2, 0, 0).
  const ox = 0.02 * compensate;
  const oy = 0.045 * compensate;
  const oz = 0.08 * compensate;
  weapon.position.set(ox, oy, oz);
  weapon.rotation.set(-Math.PI / 2, 0, Math.PI);
  weapon.userData.gripPos = new THREE.Vector3(ox, oy, oz);
  weapon.userData.gripRot = new THREE.Euler(-Math.PI / 2, 0, Math.PI);

  // If world bbox still tiny (<0.5m), scale up toward ~0.9m readable rifle length
  weapon.updateWorldMatrix(true, true);
  const size = new THREE.Vector3();
  new THREE.Box3().setFromObject(weapon).getSize(size);
  const len = Math.max(size.x, size.y, size.z);
  if (len < 0.5) {
    weapon.scale.multiplyScalar(0.9 / Math.max(len, 1e-5));
  } else if (len > 2.5) {
    weapon.scale.multiplyScalar(0.95 / Math.max(len, 1e-5));
  }

  character.userData.weapon = weapon;
  character.userData.muzzle = weapon.userData.muzzle;
  character.userData.handBone = hand;
}

/** Lightly reassert stored grip locals after aim pose (weapon is hand-parented). */
function syncWeaponGrip(mesh) {
  const weapon = mesh.userData.weapon;
  if (!weapon || !weapon.userData.gripPos || !weapon.userData.gripRot) return;
  weapon.position.copy(weapon.userData.gripPos);
  weapon.rotation.copy(weapon.userData.gripRot);
}

function setupMixer(character, gltf) {
  const mixer = new THREE.AnimationMixer(character);
  const actions = {};
  for (const clip of gltf.animations) {
    const name = clip.name;
    actions[name] = mixer.clipAction(clip);
  }
  // normalize common names
  const idle = actions.Idle || actions.idle;
  const walk = actions.Walk || actions.walk;
  const run = actions.Run || actions.run;
  if (idle) {
    idle.play();
    idle.fadeIn(0.2);
  }
  character.userData.mixer = mixer;
  character.userData.actions = { idle, walk, run, map: actions };
  character.userData.currentAnim = idle ? "idle" : null;
}

function setAnim(character, key) {
  const a = character.userData.actions;
  if (!a) return;
  const next = a[key];
  if (!next) return;
  if (character.userData.currentAnim === key) return;
  const prevKey = character.userData.currentAnim;
  const prev = prevKey ? a[prevKey] : null;
  if (prev) prev.fadeOut(0.2);
  next.reset().fadeIn(0.2).play();
  character.userData.currentAnim = key;
}

function createGltfCharacter({ kind = "soldier", isEnemy = false, accent = 0x00f5ff }) {
  const gltf = kind === "xbot" ? Assets.xbot : Assets.soldier;
  if (!gltf) return null;

  const root = cloneGltfScene(gltf);
  root.userData.isEnemy = isEnemy;
  enableShadows(root);

  // Mixamo models often sit slightly below origin; keep feet near y=0
  const bbox = new THREE.Box3().setFromObject(root);
  if (bbox.min.y < -0.01) root.position.y -= bbox.min.y;

  if (isEnemy) {
    tintCharacter(root, {
      emissive: accent,
      emissiveIntensity: 0.12,
      multiply: kind === "xbot" ? 0xff8888 : 0xff9999,
    });
  } else {
    tintCharacter(root, { emissive: accent, emissiveIntensity: 0.05 });
  }

  const weaponGltf = isEnemy ? Assets.smg : Assets.rifle;
  const weapon = prepareWeaponFromGltf(weaponGltf, accent);
  attachWeaponToHand(root, weapon, !isEnemy);

  setupMixer(root, gltf);

  // Pose arms slightly for weapon hold after first mixer tick
  root.userData.headY = 1.6;
  root.userData.radius = 0.45;
  root.userData.height = 1.85;
  root.userData.procedural = false;
  root.userData.limbs = null;

  // Aim bones for two-handed rifle hold
  root.userData.rightArm = findBone(root, ["mixamorig:RightArm", "RightArm"]);
  root.userData.rightFore = findBone(root, ["mixamorig:RightForeArm", "RightForeArm"]);
  root.userData.leftArm = findBone(root, ["mixamorig:LeftArm", "LeftArm"]);
  root.userData.leftFore = findBone(root, ["mixamorig:LeftForeArm", "LeftForeArm"]);
  root.userData.rightHand = findBone(root, ["mixamorig:RightHand", "mixamorigRightHand", "RightHand"]);
  root.userData.leftHand = findBone(root, ["mixamorig:LeftHand", "mixamorigLeftHand", "LeftHand"]);

  return root;
}

function createCharacter(options = {}) {
  const { isEnemy = false, accent = 0x00f5ff, accent2 = 0xff2bd6, bodyColor = 0x1a2238 } = options;
  if (Assets.ready) {
    const kind = isEnemy ? "xbot" : "soldier";
    const c = createGltfCharacter({ kind, isEnemy, accent: isEnemy ? accent2 : accent });
    if (c) return c;
  }
  return createProceduralHumanoid({ bodyColor, accent, accent2, isEnemy });
}

/* ---------- Environment ---------- */
function addGround(scene, color, size = 90) {
  const geo = new THREE.PlaneGeometry(size, size, 32, 32);
  // subtle vertex noise for non-flat look
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 0.15) * Math.cos(y * 0.12) * 0.08);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(
    geo,
    mat(color, { roughness: 0.92, metalness: 0.08 })
  );
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  scene.add(m);

  // grid / detail overlay
  const grid = new THREE.GridHelper(size, 40, 0xffffff, 0xffffff);
  grid.material.transparent = true;
  grid.material.opacity = 0.06;
  grid.position.y = 0.02;
  scene.add(grid);
  return m;
}

function addSkyDome(scene, topColor, botColor) {
  const geo = new THREE.SphereGeometry(120, 24, 16);
  const mats = [];
  // simple gradient via shader-ish vertex colors
  const col = new Float32Array(geo.attributes.position.count * 3);
  const cTop = new THREE.Color(topColor);
  const cBot = new THREE.Color(botColor);
  const tmp = new THREE.Color();
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const y = geo.attributes.position.getY(i);
    const t = THREE.MathUtils.clamp((y + 40) / 80, 0, 1);
    tmp.copy(cBot).lerp(cTop, t);
    col[i * 3] = tmp.r;
    col[i * 3 + 1] = tmp.g;
    col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  scene.add(mesh);
  return mesh;
}

function placeCrate(scene, x, z, scale = 1, rot = 0) {
  let mesh;
  if (Assets.ready && Assets.crateMed) {
    mesh = Assets.crateMed.scene.clone(true);
    enableShadows(mesh);
    const s = 1.6 * scale;
    mesh.scale.setScalar(s);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = rot;
  } else {
    mesh = box(1.4 * scale, 1.2 * scale, 1.4 * scale, mat(0x3a4558, { metalness: 0.45, roughness: 0.4 }), 0.6 * scale);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = rot;
  }
  scene.add(mesh);
  return mesh;
}

function makeNeonBox(w, h, d, color, emissive) {
  return box(w, h, d, mat(color, { emissive, emissiveIntensity: 0.4, metalness: 0.45, roughness: 0.4 }), h / 2);
}

function buildNeonRooftop(scene, level) {
  addGround(scene, level.ground, 95);
  addSkyDome(scene, 0x1a0a40, 0x050210);

  const roof = box(40, 0.55, 32, mat(0x141028, { metalness: 0.55, roughness: 0.35 }), 0.28);
  scene.add(roof);
  // rooftop tiles
  for (let i = -3; i <= 3; i++) {
    for (let j = -2; j <= 2; j++) {
      if ((i + j) % 2 === 0) continue;
      const tile = box(4.8, 0.04, 4.8, mat(0x1c1638, { metalness: 0.4, roughness: 0.5 }), 0.58);
      tile.position.set(i * 5, 0, j * 5);
      scene.add(tile);
    }
  }

  const railMat = mat(level.accent, { emissive: level.accent, emissiveIntensity: 0.85, metalness: 0.6, roughness: 0.25 });
  for (const [x, z, w, d] of [
    [0, -15.5, 40, 0.2], [0, 15.5, 40, 0.2],
    [-19.5, 0, 0.2, 32], [19.5, 0, 0.2, 32],
  ]) {
    const r = box(w, 0.4, d, railMat, 0.9);
    r.position.set(x, 0, z);
    scene.add(r);
    const posts = Math.max(4, Math.floor((w + d) / 4));
    for (let p = 0; p < posts; p++) {
      const t = p / (posts - 1) - 0.5;
      const px = w > d ? t * w : x;
      const pz = d > w ? t * d : z;
      const post = cyl(0.06, 0.06, 1.1, railMat, 1.1, 6);
      post.position.set(w > d ? px : x, 0, d > w ? pz : z);
      scene.add(post);
    }
  }

  const buildingColors = [0x12101f, 0x18142c, 0x0e101c, 0x1a1228];
  for (let i = 0; i < 22; i++) {
    const ang = (i / 22) * Math.PI * 2 + 0.2;
    const dist = 30 + (i % 4) * 5;
    const h = 10 + (i % 6) * 3.5;
    const bw = 3.5 + (i % 3);
    const bd = 3.5 + ((i + 1) % 3);
    const b = makeNeonBox(bw, h, bd, buildingColors[i % 4], i % 2 ? level.accent : level.accent2);
    b.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
    scene.add(b);
    for (let wy = 2; wy < h - 1; wy += 2.2) {
      const win = box(bw * 0.7, 0.35, 0.12, mat(i % 2 ? level.accent : level.accent2, {
        emissive: i % 2 ? level.accent : level.accent2, emissiveIntensity: 0.7 + (i % 3) * 0.1,
      }), wy);
      win.position.copy(b.position);
      win.position.y = wy;
      win.lookAt(0, wy, 0);
      scene.add(win);
    }
  }

  const covers = [
    [-9, 5, 3.2, 2.4, 4], [8, -6, 4.2, 1.8, 3.2], [-4, -9, 2.8, 2, 2.8],
    [11, 7, 3.2, 2.6, 3.2], [-13, -3, 2.2, 3.2, 2.2], [2, 9, 5.2, 1.5, 2.2],
    [-6, 10, 2, 1.6, 3], [14, -2, 2.5, 2.2, 2.5],
  ];
  for (const [x, z, w, h, d] of covers) {
    const c = box(w, h, d, mat(0x242244, { metalness: 0.6, roughness: 0.32 }), h / 2 + 0.55);
    c.position.set(x, 0, z);
    scene.add(c);
  }

  for (const [x, z, rot] of [[-11, 11, 0.35], [13, -9, -0.55], [-14, -10, 0.9]]) {
    const sign = box(0.18, 3.5, 5.5, mat(level.accent2, { emissive: level.accent2, emissiveIntensity: 1.0 }), 3.2);
    sign.position.set(x, 0.55, z);
    sign.rotation.y = rot;
    scene.add(sign);
  }

  // AC units + antennas
  for (const [x, z] of [[-2, 2], [5, 3], [-7, -4]]) {
    const ac = box(1.6, 0.9, 1.2, mat(0x2a3050, { metalness: 0.7, roughness: 0.3 }), 1.1);
    ac.position.set(x, 0.55, z);
    scene.add(ac);
  }

  placeCrate(scene, -5, 6, 1, 0.3);
  placeCrate(scene, 6, -3, 0.85, -0.4);
  placeCrate(scene, 3, 4, 0.7, 0.8);

  const spot = new THREE.SpotLight(level.accent, 2.2, 40, 0.55, 0.4, 1);
  spot.position.set(0, 14, 0);
  spot.target.position.set(0, 0, 0);
  scene.add(spot, spot.target);
  const p1 = new THREE.PointLight(level.accent2, 1.4, 28);
  p1.position.set(-10, 5, 8);
  const p2 = new THREE.PointLight(level.accent, 1.2, 26);
  p2.position.set(12, 4, -6);
  scene.add(p1, p2);
}

function buildDesertRuins(scene, level) {
  addGround(scene, level.ground, 110);
  addSkyDome(scene, 0xffe2a8, 0xc89455);

  for (let i = 0; i < 16; i++) {
    const dune = new THREE.Mesh(
      new THREE.SphereGeometry(7 + (i % 5), 12, 10),
      mat(i % 2 ? 0xb89255 : 0xc4a06a, { roughness: 1, metalness: 0 })
    );
    dune.scale.y = 0.25 + (i % 3) * 0.04;
    dune.position.set((i % 5) * 16 - 32, -1.2, Math.floor(i / 5) * 18 - 24);
    dune.receiveShadow = true;
    scene.add(dune);
  }

  for (let i = 0; i < 14; i++) {
    const h = 3.2 + (i % 5) * 1.1;
    const pillar = cyl(0.5 - (i % 3) * 0.05, 0.72, h, mat(0x8d7350, { roughness: 0.88 }), h / 2, 8);
    pillar.position.set(Math.cos(i * 1.3) * 13, 0, Math.sin(i * 1.9) * 11);
    pillar.rotation.z = ((i % 5) - 2) * 0.06;
    scene.add(pillar);
    if (i % 3 === 0) {
      const cap = cyl(0.85, 0.7, 0.35, mat(0x9a8060, { roughness: 0.9 }), h + 0.15, 8);
      cap.position.copy(pillar.position);
      scene.add(cap);
    }
  }

  const walls = [
    [-7, 4, 9, 2.8, 0.7], [6, -5, 7, 2.4, 0.75], [0, 9, 0.75, 3.2, 8],
    [-11, -7, 5.5, 2, 0.7], [10, 6, 0.7, 3, 6], [4, 2, 4, 1.6, 0.6],
  ];
  for (const [x, z, w, h, d] of walls) {
    const wmesh = box(w, h, d, mat(0x9a7b52, { roughness: 0.92 }), h / 2);
    wmesh.position.set(x, 0, z);
    scene.add(wmesh);
  }

  const archL = box(1.1, 4.5, 1.1, mat(0x7a6242), 2.25);
  archL.position.set(-2.8, 0, -11);
  const archR = box(1.1, 4.5, 1.1, mat(0x7a6242), 2.25);
  archR.position.set(2.8, 0, -11);
  const archTop = box(7, 1.1, 1.4, mat(0x8a7250), 5);
  archTop.position.z = -11;
  scene.add(archL, archR, archTop);
  // crumbled blocks
  for (let i = 0; i < 8; i++) {
    const rubble = box(0.6 + (i % 3) * 0.3, 0.4, 0.5, mat(0x8a7050, { roughness: 1 }), 0.2);
    rubble.position.set(-4 + i * 1.1, 0, -9 + (i % 2));
    rubble.rotation.y = i * 0.4;
    scene.add(rubble);
  }

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(4.5, 16, 16),
    mat(0xffe099, { emissive: 0xffb050, emissiveIntensity: 1.2, roughness: 1, metalness: 0 })
  );
  sunMesh.position.set(-35, 26, -45);
  scene.add(sunMesh);

  placeCrate(scene, -3, 1, 1, 0.2);
  placeCrate(scene, 5, -2, 0.9, -0.5);

  const warm = new THREE.PointLight(0xffcc77, 1.1, 35);
  warm.position.set(-8, 6, -8);
  scene.add(warm);
  const spot = new THREE.SpotLight(0xffe0a0, 1.6, 50, 0.7, 0.45, 1);
  spot.position.set(10, 18, 10);
  spot.target.position.set(0, 0, 0);
  scene.add(spot, spot.target);
}

function buildIceBase(scene, level) {
  addGround(scene, level.ground, 100);
  addSkyDome(scene, 0xe8f4ff, 0x6a90b0);

  for (let i = 0; i < 14; i++) {
    const ice = new THREE.Mesh(
      new THREE.CircleGeometry(3.5 + (i % 4), 14),
      mat(0xeaf6ff, { metalness: 0.75, roughness: 0.12, emissive: 0x88ccee, emissiveIntensity: 0.1 })
    );
    ice.rotation.x = -Math.PI / 2;
    ice.position.set((i % 5) * 11 - 22, 0.03, Math.floor(i / 5) * 12 - 10);
    ice.receiveShadow = true;
    scene.add(ice);
  }

  // icy rocks
  for (let i = 0; i < 10; i++) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.2 + (i % 3) * 0.4, 0),
      mat(0xc5d8e8, { metalness: 0.35, roughness: 0.35, emissive: 0xa0c4e0, emissiveIntensity: 0.05 })
    );
    rock.position.set(Math.sin(i * 2.4) * 18, 0.5, Math.cos(i * 1.7) * 16);
    rock.scale.y = 0.7;
    rock.castShadow = true;
    scene.add(rock);
  }

  const hangars = [
    [-13, -7, 11, 5.5, 9], [15, 5, 9, 5, 11], [0, -15, 15, 4, 7], [8, -8, 6, 3.5, 5],
  ];
  for (const [x, z, w, h, d] of hangars) {
    const body = box(w, h, d, mat(0x6a7c90, { metalness: 0.7, roughness: 0.32 }), h / 2);
    body.position.set(x, 0, z);
    scene.add(body);
    const trim = box(w + 0.25, 0.28, d + 0.25, mat(level.accent, {
      emissive: level.accent, emissiveIntensity: 0.65,
    }), h + 0.12);
    trim.position.set(x, 0, z);
    scene.add(trim);
    // door recess
    const door = box(w * 0.35, h * 0.55, 0.2, mat(0x3a4a5c, { metalness: 0.5, roughness: 0.4 }), h * 0.28);
    door.position.set(x, 0, z + d / 2 + 0.05);
    scene.add(door);
  }

  for (let i = 0; i < 16; i++) {
    placeCrate(scene, Math.sin(i * 2.1) * 12, Math.cos(i * 1.3) * 10, 0.7 + (i % 3) * 0.15, i * 0.5);
  }

  for (const [x, z] of [[-19, 13], [19, -11], [0, 16]]) {
    const pole = cyl(0.12, 0.2, 11, mat(0x334455, { metalness: 0.85 }), 5.5, 6);
    pole.position.set(x, 0, z);
    const light = box(0.45, 0.45, 0.45, mat(level.accent2, {
      emissive: level.accent2, emissiveIntensity: 1.1,
    }), 11.2);
    light.position.set(x, 0, z);
    scene.add(pole, light);
    const pl = new THREE.PointLight(level.accent2, 1.3, 22);
    pl.position.set(x, 10, z);
    scene.add(pl);
  }

  for (const [x, z, w, d] of [[-5, 3, 7, 0.55], [7, -4, 0.55, 6], [3, 8, 6, 0.55], [-8, -2, 0.55, 5]]) {
    const wall = box(w, 1.5, d, mat(0xcfe6f5, { metalness: 0.45, roughness: 0.28 }), 0.75);
    wall.position.set(x, 0, z);
    scene.add(wall);
  }

  const spot = new THREE.SpotLight(0xd0eeff, 1.8, 45, 0.6, 0.4, 1);
  spot.position.set(0, 16, 0);
  scene.add(spot, spot.target);
}

function buildLevelEnvironment(scene, level) {
  if (level.id === "neon-rooftop") buildNeonRooftop(scene, level);
  else if (level.id === "desert-ruins") buildDesertRuins(scene, level);
  else buildIceBase(scene, level);
}

/* ---------- particles ---------- */
class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }
  spawn(pos, color, count = 8, speed = 4, life = 0.45, size = 0.08) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        mat(color, { emissive: color, emissiveIntensity: 0.9, roughness: 0.4 })
      );
      m.position.copy(pos);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed,
        (Math.random() - 0.5) * speed
      );
      this.scene.add(m);
      this.items.push({ mesh: m, vel, life, max: life });
    }
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.items.splice(i, 1);
        continue;
      }
      p.vel.y -= 6 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const s = Math.max(0.01, p.life / p.max);
      p.mesh.scale.setScalar(s);
    }
  }
  clear() {
    for (const p of this.items) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this.items.length = 0;
  }
}

/* ---------- Game ---------- */
class Game {
  constructor() {
    this.levelIndex = 0;
    this.unlocked = loadUnlock();
    this.state = "menu";
    this.score = 0;
    this.wave = 0;
    this.keys = {};
    this.mouseDown = false;
    this.yaw = 0;
    this.pitch = 0.15;
    this.clock = new THREE.Clock();
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.spawnQueue = 0;
    this.spawnTimer = 0;
    this.waveClearing = false;
    this.selectedLevel = 0;
    this.assetsLoading = true;

    this.player = {
      hp: 100,
      maxHp: 100,
      ammo: 30,
      reserve: 90,
      magSize: 30,
      reloading: false,
      reloadT: 0,
      shootCd: 0,
      vy: 0,
      onGround: true,
      mesh: null,
      groundY: 0,
    };

    this._setupRenderer();
    this._bindUI();
    this._bindInput();
    this.renderLevelSelect();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    loadAllAssets().then(() => {
      this.assetsLoading = false;
      this.toast(Assets.ready ? "角色与武器模型已加载" : "使用程序化角色（模型加载失败）", 2200);
    });
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 220);
    this.camera.position.set(0, 4, 8);
    this.particles = new ParticleSystem(this.scene);
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _bindUI() {
    $("btn-start").addEventListener("click", () => this.startLevel(this.selectedLevel));
    $("btn-resume").addEventListener("click", () => this.resume());
    $("btn-restart").addEventListener("click", () => this.startLevel(this.levelIndex));
    $("btn-menu").addEventListener("click", () => this.toMenu());
    $("btn-retry").addEventListener("click", () => this.startLevel(this.levelIndex));
    $("btn-end-menu").addEventListener("click", () => this.toMenu());
    $("btn-next").addEventListener("click", () => {
      if (this.levelIndex + 1 < LEVELS.length) this.startLevel(this.levelIndex + 1);
    });
  }

  _bindInput() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (e.code === "Escape" && this.state === "playing") this.pause();
      else if (e.code === "Escape" && this.state === "paused") this.resume();
      if (e.code === "KeyR" && this.state === "playing") this.reload();
      if (e.code === "Space") e.preventDefault();
    });
    window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });

    canvas.addEventListener("click", () => {
      if (this.state === "playing" && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    });
    document.addEventListener("pointerlockchange", () => {
      const locked = document.pointerLockElement === canvas;
      $("pointer-hint").classList.toggle("hidden", locked || this.state !== "playing");
    });
    document.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement !== canvas || this.state !== "playing") return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0018;
      this.pitch = Math.max(-0.55, Math.min(0.75, this.pitch));
    });
    document.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        if (this.state === "playing") this.tryShoot();
      }
    });
    document.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
  }

  renderLevelSelect() {
    this.unlocked = loadUnlock();
    const grid = $("level-grid");
    grid.innerHTML = "";
    LEVELS.forEach((lv, i) => {
      const locked = i + 1 > this.unlocked;
      const card = document.createElement("div");
      card.className = "level-card" + (locked ? " locked" : "") + (i === this.selectedLevel ? " active" : "");
      card.innerHTML = `<div><div class="name">${i + 1}. ${lv.name}</div><div class="meta">${lv.desc}</div></div><span class="badge">${locked ? "锁定" : "可选"}</span>`;
      if (!locked) {
        card.addEventListener("click", () => {
          this.selectedLevel = i;
          this.renderLevelSelect();
        });
      }
      grid.appendChild(card);
    });
  }

  toast(msg, ms = 1600) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.add("hidden"), ms);
  }

  clearWorld() {
    this.particles.clear();
    while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.player.mesh = null;
  }

  async startLevel(index) {
    if (this.assetsLoading) {
      this.toast("模型加载中，请稍候…");
      await loadAllAssets();
      this.assetsLoading = false;
    }

    this.levelIndex = index;
    this.selectedLevel = index;
    this.clearWorld();
    const level = LEVELS[index];
    this.level = level;
    this.score = 0;
    this.wave = 0;
    this.spawnQueue = 0;
    this.waveClearing = false;
    this.state = "playing";

    this.player.hp = 100;
    this.player.ammo = 30;
    this.player.reserve = 90;
    this.player.reloading = false;
    this.player.shootCd = 0;
    this.player.vy = 0;
    this.player.onGround = true;
    this.yaw = 0;
    this.pitch = 0.18;

    this.scene.background = new THREE.Color(level.sky);
    this.scene.fog = new THREE.Fog(level.fog, level.fogNear, level.fogFar);

    const hemi = new THREE.HemisphereLight(level.hemiSky, level.hemiGround, 0.55);
    const amb = new THREE.AmbientLight(level.ambient, 0.28);
    const sun = new THREE.DirectionalLight(level.sun, 1.15);
    sun.position.set(14, 24, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 70;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.0002;
    this.scene.add(hemi, amb, sun);

    const neon = new THREE.PointLight(level.accent, 1.35, 45);
    neon.position.set(0, 7, 0);
    this.scene.add(neon);
    this._neonLight = neon;

    buildLevelEnvironment(this.scene, level);
    this.particles = new ParticleSystem(this.scene);

    const hero = createCharacter({
      bodyColor: 0x1a2238,
      accent: level.accent,
      accent2: level.accent2,
      isEnemy: false,
    });
    // feet on roof/ground plane
    const groundY = Assets.ready ? 0.55 : 0.55;
    hero.position.set(0, groundY, 4);
    this.player.groundY = groundY;
    this.scene.add(hero);
    this.player.mesh = hero;

    // verify gun attachment
    if (hero.userData.weapon && hero.userData.muzzle) {
      console.info("[NeonShooter] Player weapon attached; muzzle OK", hero.userData.weapon.name);
    } else {
      console.warn("[NeonShooter] Player weapon missing!");
    }

    $("menu").classList.add("hidden");
    $("pause").classList.add("hidden");
    $("end").classList.add("hidden");
    $("hud").classList.remove("hidden");
    $("hud-scene").textContent = level.name;
    this.updateHUD();
    this.toast(`进入场景：${level.name}`);
    this.beginWave();
    canvas.requestPointerLock();
  }

  beginWave() {
    this.wave += 1;
    const counts = this.level.waves;
    if (this.wave > counts.length) {
      this.winLevel();
      return;
    }
    this.spawnQueue = counts[this.wave - 1];
    this.spawnTimer = 0.85;
    this.waveClearing = false;
    $("hud-wave").textContent = `${this.wave} / ${counts.length}`;
    this.toast(`波次 ${this.wave}`);
  }

  spawnEnemy() {
    const e = createCharacter({
      bodyColor: 0x2a1520,
      accent: this.level.accent2,
      accent2: this.level.accent,
      isEnemy: true,
    });
    const ang = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 8;
    e.position.set(Math.cos(ang) * dist, this.player.groundY, Math.sin(ang) * dist);
    e.position.x = THREE.MathUtils.clamp(e.position.x, -16, 16);
    e.position.z = THREE.MathUtils.clamp(e.position.z, -14, 14);
    this.scene.add(e);
    this.enemies.push({
      mesh: e,
      hp: 40 + this.wave * 8,
      speed: 2.2 + this.wave * 0.15 + Math.random() * 0.4,
      shootCd: 1 + Math.random(),
      melee: Math.random() < 0.35,
      hitFlash: 0,
    });
  }

  reload() {
    if (this.player.reloading || this.player.ammo >= this.player.magSize || this.player.reserve <= 0) return;
    this.player.reloading = true;
    this.player.reloadT = 1.2;
    this.toast("换弹中…");
  }

  tryShoot() {
    const p = this.player;
    if (p.reloading || p.shootCd > 0) return;
    if (p.ammo <= 0) {
      this.reload();
      return;
    }
    p.ammo -= 1;
    p.shootCd = 0.14;
    this.updateHUD();

    const muzzle = p.mesh.userData.muzzle;
    const origin = new THREE.Vector3();
    if (muzzle) muzzle.getWorldPosition(origin);
    else origin.copy(p.mesh.position).add(new THREE.Vector3(0.3, 1.3, 0.4));

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.normalize();

    this.particles.spawn(origin, this.level.accent, 6, 3, 0.12, 0.06);

    const ray = new THREE.Raycaster(origin, dir, 0, 60);
    const targets = this.enemies.map((en) => en.mesh);
    const hits = ray.intersectObjects(targets, true);
    let hitEnemy = null;
    let hitPoint = origin.clone().addScaledVector(dir, 40);
    if (hits.length) {
      let obj = hits[0].object;
      while (obj && !obj.userData.isEnemy && obj.parent) obj = obj.parent;
      if (obj && obj.userData.isEnemy) {
        hitEnemy = this.enemies.find((en) => en.mesh === obj);
        hitPoint = hits[0].point;
      }
    }

    const tracer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.8, 4),
      mat(this.level.accent, { emissive: this.level.accent, emissiveIntensity: 1 })
    );
    tracer.position.copy(origin);
    tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.scene.add(tracer);
    this.bullets.push({ mesh: tracer, life: 0.08 });

    if (hitEnemy) {
      hitEnemy.hp -= 22;
      hitEnemy.hitFlash = 0.12;
      this.particles.spawn(hitPoint, 0xff4466, 10, 5, 0.35, 0.07);
      $("crosshair").classList.add("hit");
      setTimeout(() => $("crosshair").classList.remove("hit"), 80);
      if (hitEnemy.hp <= 0) this.killEnemy(hitEnemy);
    }
  }

  killEnemy(en) {
    this.particles.spawn(en.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), this.level.accent2, 16, 6, 0.5, 0.1);
    this.scene.remove(en.mesh);
    this.enemies = this.enemies.filter((e) => e !== en);
    this.score += 100 + this.wave * 20;
    this.updateHUD();
    if (this.enemies.length === 0 && this.spawnQueue <= 0 && !this.waveClearing) {
      this.waveClearing = true;
      this.toast("波次清除！");
      setTimeout(() => {
        if (this.state === "playing") this.beginWave();
      }, 1200);
    }
  }

  enemyShoot(en) {
    const origin = new THREE.Vector3();
    if (en.mesh.userData.muzzle) en.mesh.userData.muzzle.getWorldPosition(origin);
    else origin.copy(en.mesh.position).add(new THREE.Vector3(0, 1.3, 0));
    const target = this.player.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const dir = target.sub(origin).normalize();
    dir.x += (Math.random() - 0.5) * 0.08;
    dir.y += (Math.random() - 0.5) * 0.05;
    dir.z += (Math.random() - 0.5) * 0.08;
    dir.normalize();

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      mat(0xff3366, { emissive: 0xff2244, emissiveIntensity: 1 })
    );
    ball.position.copy(origin);
    this.scene.add(ball);
    this.enemyBullets.push({ mesh: ball, vel: dir.multiplyScalar(20), life: 2.5, damage: 5 });
    this.particles.spawn(origin, 0xff5577, 4, 2, 0.1, 0.05);
  }

  applyAimPose(mesh) {
    // Strong two-handed rifle aim overlay after animation mixer (Mixamo Idle keeps hands at hip).
    // Enemies use a slightly weaker scale of the same deltas.
    const k = mesh.userData.isEnemy ? 0.82 : 1;
    const ra = mesh.userData.rightArm;
    const rf = mesh.userData.rightFore;
    const la = mesh.userData.leftArm;
    const lf = mesh.userData.leftFore;
    const rh = mesh.userData.rightHand;
    const lh = mesh.userData.leftHand;
    if (ra) {
      ra.rotation.x += -1.35 * k;
      ra.rotation.y += 0.25 * k;
      ra.rotation.z += -0.15 * k;
    }
    if (rf) rf.rotation.x += -0.55 * k;
    if (la) {
      la.rotation.x += -1.15 * k;
      la.rotation.z += 0.45 * k;
    }
    if (lf) lf.rotation.x += -0.7 * k;
    if (rh) {
      rh.rotation.x += -0.2 * k;
      rh.rotation.z += 0.12 * k;
    }
    if (lh) {
      lh.rotation.x += -0.25 * k;
      lh.rotation.y += -0.15 * k;
    }
  }

  updatePlayer(dt) {
    const mesh = this.player.mesh;
    if (!mesh) return;

    let ix = 0, iz = 0;
    if (this.keys["KeyW"]) iz -= 1;
    if (this.keys["KeyS"]) iz += 1;
    if (this.keys["KeyA"]) ix -= 1;
    if (this.keys["KeyD"]) ix += 1;
    const moving = ix !== 0 || iz !== 0;
    if (moving) {
      const speed = 7.5;
      const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const move = new THREE.Vector3();
      move.addScaledVector(forward, -iz);
      move.addScaledVector(right, ix);
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);
      mesh.position.add(move);
    }

    mesh.position.x = THREE.MathUtils.clamp(mesh.position.x, -17, 17);
    mesh.position.z = THREE.MathUtils.clamp(mesh.position.z, -15, 15);

    if (this.keys["Space"] && this.player.onGround) {
      this.player.vy = 8.5;
      this.player.onGround = false;
    }
    this.player.vy -= 22 * dt;
    mesh.position.y += this.player.vy * dt;
    const gy = this.player.groundY;
    if (mesh.position.y <= gy) {
      mesh.position.y = gy;
      this.player.vy = 0;
      this.player.onGround = true;
    }

    mesh.rotation.y = this.yaw + Math.PI;

    if (mesh.userData.mixer) {
      mesh.userData.mixer.update(dt);
      setAnim(mesh, moving ? "run" : "idle");
      this.applyAimPose(mesh);
      syncWeaponGrip(mesh);
    } else if (mesh.userData.limbs) {
      const t = this.clock.elapsedTime;
      const amp = moving ? 0.35 : 0.05;
      const limbs = mesh.userData.limbs;
      limbs.legL.rotation.x = Math.sin(t * 10) * amp;
      limbs.legR.rotation.x = Math.sin(t * 10 + Math.PI) * amp;
      limbs.armL.rotation.x = Math.sin(t * 10 + Math.PI) * amp * 0.6;
      limbs.armR.rotation.x = -0.4 + Math.sin(t * 10) * amp * 0.2;
    }

    if (this.player.shootCd > 0) this.player.shootCd -= dt;
    if (this.player.reloading) {
      this.player.reloadT -= dt;
      if (this.player.reloadT <= 0) {
        const need = this.player.magSize - this.player.ammo;
        const take = Math.min(need, this.player.reserve);
        this.player.ammo += take;
        this.player.reserve -= take;
        this.player.reloading = false;
        this.updateHUD();
        this.toast("换弹完成");
      }
    }
    if (this.mouseDown) this.tryShoot();
  }

  updateCamera() {
    const mesh = this.player.mesh;
    if (!mesh) return;
    const offset = new THREE.Vector3(0.9, 1.65, 4.4);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));
    offset.applyQuaternion(q);
    const desired = mesh.position.clone().add(offset);
    this.camera.position.lerp(desired, 0.18);
    const look = mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    look.add(lookDir.multiplyScalar(6));
    this.camera.lookAt(look);
  }

  updateEnemies(dt) {
    if (this.spawnQueue > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy();
        this.spawnQueue -= 1;
        this.spawnTimer = this.wave === 1 ? 1.15 : 0.85;
      }
    }

    const playerPos = this.player.mesh.position;
    for (const en of this.enemies) {
      const pos = en.mesh.position;
      const toPlayer = playerPos.clone().sub(pos);
      toPlayer.y = 0;
      const dist = toPlayer.length();
      let moving = false;
      if (dist > 0.01) {
        const dir = toPlayer.normalize();
        en.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        if (en.melee) {
          if (dist > 1.4) {
            pos.addScaledVector(dir, en.speed * 1.15 * dt);
            moving = true;
          } else {
            en.shootCd -= dt;
            if (en.shootCd <= 0) {
              this.damagePlayer(8);
              en.shootCd = 1.15;
              this.particles.spawn(playerPos.clone().add(new THREE.Vector3(0, 1, 0)), 0xff2244, 6, 3, 0.2, 0.08);
            }
          }
        } else {
          if (dist > 8) {
            pos.addScaledVector(dir, en.speed * dt);
            moving = true;
          } else if (dist < 5) {
            pos.addScaledVector(dir, -en.speed * 0.6 * dt);
            moving = true;
          }
          en.shootCd -= dt;
          if (en.shootCd <= 0 && dist < 22) {
            this.enemyShoot(en);
            en.shootCd = (this.wave === 1 ? 1.6 : 1.25) + Math.random() * 0.9;
          }
        }
      }
      pos.x = THREE.MathUtils.clamp(pos.x, -17, 17);
      pos.z = THREE.MathUtils.clamp(pos.z, -15, 15);
      pos.y = this.player.groundY;

      if (en.mesh.userData.mixer) {
        en.mesh.userData.mixer.update(dt);
        setAnim(en.mesh, moving ? "run" : "idle");
        this.applyAimPose(en.mesh);
        syncWeaponGrip(en.mesh);
      }

      if (en.hitFlash > 0) {
        en.hitFlash -= dt;
        en.mesh.traverse((c) => {
          if (c.isMesh && c.material) {
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            for (const m of mats) {
              if (m.emissive) m.emissiveIntensity = en.hitFlash > 0 ? 1.4 : 0.12;
            }
          }
        });
      }
    }
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        this.bullets.splice(i, 1);
      }
    }
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      const d = b.mesh.position.distanceTo(this.player.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)));
      if (d < 0.7) {
        this.damagePlayer(b.damage);
        this.particles.spawn(b.mesh.position.clone(), 0xff6688, 8, 3, 0.25, 0.06);
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        this.enemyBullets.splice(i, 1);
        continue;
      }
      if (b.life <= 0 || Math.abs(b.mesh.position.x) > 40 || Math.abs(b.mesh.position.z) > 40) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  damagePlayer(amount) {
    if (this.state !== "playing") return;
    this.player.hp = Math.max(0, this.player.hp - amount);
    this.updateHUD();
    if (this.player.hp <= 0) this.gameOver(false);
  }

  updateHUD() {
    $("hud-score").textContent = String(this.score);
    $("hud-hp").textContent = String(Math.ceil(this.player.hp));
    $("hp-fill").style.width = `${Math.max(0, (this.player.hp / this.player.maxHp) * 100)}%`;
    const ammoText = this.player.reloading
      ? "换弹…"
      : `${this.player.ammo} / ${this.player.reserve}`;
    $("hud-ammo").textContent = ammoText;
  }

  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    document.exitPointerLock();
    $("pause").classList.remove("hidden");
  }

  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    $("pause").classList.add("hidden");
    this.clock.getDelta();
    canvas.requestPointerLock();
  }

  toMenu() {
    this.state = "menu";
    document.exitPointerLock();
    $("pause").classList.add("hidden");
    $("end").classList.add("hidden");
    $("hud").classList.add("hidden");
    $("menu").classList.remove("hidden");
    $("pointer-hint").classList.add("hidden");
    this.clearWorld();
    this.scene.background = new THREE.Color(0x07080f);
    this.renderLevelSelect();
  }

  winLevel() {
    this.state = "ended";
    document.exitPointerLock();
    saveUnlock(this.levelIndex + 2);
    $("end-title").textContent = "胜利！";
    $("end-msg").textContent = `已通关「${this.level.name}」`;
    $("end-score").textContent = String(this.score);
    const hasNext = this.levelIndex + 1 < LEVELS.length;
    $("btn-next").classList.toggle("hidden", !hasNext);
    $("end").classList.remove("hidden");
    this.toast(hasNext ? "下一关已解锁" : "全部场景通关！");
  }

  gameOver() {
    this.state = "ended";
    document.exitPointerLock();
    $("end-title").textContent = "游戏结束";
    $("end-msg").textContent = "生命耗尽，再试一次吧";
    $("end-score").textContent = String(this.score);
    $("btn-next").classList.add("hidden");
    $("end").classList.remove("hidden");
  }

  animate() {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    if (this.state === "playing") {
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateBullets(dt);
      this.particles.update(dt);
      this.updateCamera();
      if (this._neonLight) {
        this._neonLight.intensity = 1.15 + Math.sin(this.clock.elapsedTime * 3) * 0.3;
      }
    } else if (this.state === "menu") {
      if (this.scene.children.length === 0) {
        this.scene.background = new THREE.Color(0x07080f);
        this.scene.add(new THREE.AmbientLight(0x4060a0, 0.6));
        this.scene.add(new THREE.HemisphereLight(0x6080ff, 0x200040, 0.4));
      }
      this.camera.position.set(0, 3, 10);
      this.camera.lookAt(0, 1, 0);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

new Game();
