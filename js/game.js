/**
 * Neon Shooter 3D — zero-build Three.js third-person shooter
 */
import * as THREE from "three";

const canvas = document.getElementById("c");
const $ = (id) => document.getElementById(id);

const LEVELS = [
  {
    id: "neon-rooftop",
    name: "霓虹天台",
    desc: "赛博都市天台巷战",
    fog: 0x0a0618,
    fogNear: 18,
    fogFar: 70,
    sky: 0x0b0720,
    ground: 0x1a1230,
    accent: 0x00f5ff,
    accent2: 0xff2bd6,
    ambient: 0x4050a0,
    sun: 0xff66cc,
    waves: [4, 6, 8],
  },
  {
    id: "desert-ruins",
    name: "沙漠遗迹",
    desc: "废墟沙丘狙击战",
    fog: 0xc9a66b,
    fogNear: 25,
    fogFar: 90,
    sky: 0xedd9a3,
    ground: 0xc2a06a,
    accent: 0xffaa33,
    accent2: 0x8b4513,
    ambient: 0xffe0a0,
    sun: 0xffe08a,
    waves: [5, 7, 9],
  },
  {
    id: "ice-base",
    name: "冰原基地",
    desc: "极地工业据点突袭",
    fog: 0x9ec9e8,
    fogNear: 20,
    fogFar: 80,
    sky: 0xb8d8f0,
    ground: 0xd8e8f5,
    accent: 0x33ddff,
    accent2: 0x4477ff,
    ambient: 0xa8c8e8,
    sun: 0xffffff,
    waves: [6, 8, 10],
  },
];

const STORAGE_KEY = "neon-shooter-unlock";
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
    flatShading: true,
  });
}

function box(w, h, d, material, y = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rTop, rBot, h, material, y = 0, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), material);
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Refined low-poly humanoid with neon accents and a visible rifle */
function createHumanoid(options = {}) {
  const {
    bodyColor = 0x1c2438,
    accent = 0x00f5ff,
    accent2 = 0xff2bd6,
    isEnemy = false,
    scale = 1,
  } = options;

  const root = new THREE.Group();
  root.userData.isEnemy = isEnemy;

  const bodyMat = mat(bodyColor, { metalness: 0.35, roughness: 0.45 });
  const accentMat = mat(accent, { emissive: accent, emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.3 });
  const accent2Mat = mat(accent2, { emissive: accent2, emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.35 });
  const darkMat = mat(0x0c1018, { metalness: 0.7, roughness: 0.35 });
  const skinMat = mat(isEnemy ? 0x6a7a88 : 0xc9b29a, { roughness: 0.7, metalness: 0.05 });

  // Legs
  const legL = box(0.22, 0.55, 0.26, bodyMat, 0.28);
  legL.position.x = -0.16;
  const legR = box(0.22, 0.55, 0.26, bodyMat, 0.28);
  legR.position.x = 0.16;
  const bootL = box(0.24, 0.12, 0.34, darkMat, 0.06);
  bootL.position.x = -0.16;
  bootL.position.z = 0.04;
  const bootR = box(0.24, 0.12, 0.34, darkMat, 0.06);
  bootR.position.x = 0.16;
  bootR.position.z = 0.04;

  // Torso + hips
  const hips = box(0.52, 0.22, 0.3, bodyMat, 0.62);
  const torso = box(0.58, 0.55, 0.34, bodyMat, 0.98);
  const chestGlow = box(0.42, 0.12, 0.08, accentMat, 1.05);
  chestGlow.position.z = 0.15;
  const stripe = box(0.08, 0.45, 0.06, accent2Mat, 0.98);
  stripe.position.z = 0.16;

  // Shoulders / arms
  const shoulderL = box(0.2, 0.18, 0.28, bodyMat, 1.28);
  shoulderL.position.x = -0.4;
  const shoulderR = box(0.2, 0.18, 0.28, bodyMat, 1.28);
  shoulderR.position.x = 0.4;
  const armL = box(0.16, 0.48, 0.18, bodyMat, 0.95);
  armL.position.x = -0.42;
  const armR = box(0.16, 0.48, 0.18, bodyMat, 0.95);
  armR.position.x = 0.42;
  const handL = box(0.14, 0.14, 0.16, skinMat, 0.68);
  handL.position.x = -0.42;
  const handR = box(0.14, 0.14, 0.16, skinMat, 0.68);
  handR.position.x = 0.42;

  // Head + helmet
  const neck = cyl(0.08, 0.1, 0.12, skinMat, 1.32, 6);
  const head = box(0.34, 0.34, 0.34, skinMat, 1.55);
  const helmet = box(0.38, 0.2, 0.4, darkMat, 1.68);
  const visor = box(0.32, 0.1, 0.08, accentMat, 1.58);
  visor.position.z = 0.16;
  if (isEnemy) {
    const hornL = box(0.06, 0.18, 0.06, accent2Mat, 1.85);
    hornL.position.x = -0.12;
    const hornR = box(0.06, 0.18, 0.06, accent2Mat, 1.85);
    hornR.position.x = 0.12;
    root.add(hornL, hornR);
  }

  // Weapon (right-hand rifle)
  const weapon = new THREE.Group();
  weapon.name = "weapon";
  const stock = box(0.08, 0.12, 0.22, darkMat, 0);
  stock.position.set(0, 0, -0.2);
  const bodyW = box(0.1, 0.14, 0.55, darkMat, 0);
  const barrel = cyl(0.03, 0.035, 0.42, accentMat, 0, 6);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.42;
  const sight = box(0.04, 0.08, 0.12, accent2Mat, 0.1);
  sight.position.z = 0.05;
  const muzzle = new THREE.Object3D();
  muzzle.name = "muzzle";
  muzzle.position.set(0, 0, 0.65);
  weapon.add(stock, bodyW, barrel, sight, muzzle);
  weapon.position.set(0.42, 0.85, 0.35);
  weapon.rotation.x = -0.08;

  root.add(
    legL, legR, bootL, bootR, hips, torso, chestGlow, stripe,
    shoulderL, shoulderR, armL, armR, handL, handR,
    neck, head, helmet, visor, weapon
  );

  // Collision / aim helpers
  root.userData.headY = 1.55;
  root.userData.radius = 0.45;
  root.userData.height = 1.85;
  root.userData.weapon = weapon;
  root.userData.muzzle = muzzle;
  root.userData.limbs = { legL, legR, armL, armR };
  root.scale.setScalar(scale);
  return root;
}


function addGround(scene, color, size = 80) {
  const geo = new THREE.PlaneGeometry(size, size, 1, 1);
  const m = new THREE.Mesh(geo, mat(color, { roughness: 0.9, metalness: 0.05 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

function makeNeonBox(w, h, d, color, emissive) {
  const mesh = box(w, h, d, mat(color, { emissive, emissiveIntensity: 0.35, metalness: 0.4, roughness: 0.4 }), h / 2);
  return mesh;
}

function buildNeonRooftop(scene, level) {
  addGround(scene, level.ground, 90);
  // Rooftop platform
  const roof = box(36, 0.6, 28, mat(0x16122a, { metalness: 0.5, roughness: 0.4 }), 0.3);
  scene.add(roof);

  // Neon rails / edges
  const railMat = mat(level.accent, { emissive: level.accent, emissiveIntensity: 0.7 });
  for (const [x, z, w, d] of [
    [0, -13.5, 36, 0.25], [0, 13.5, 36, 0.25],
    [-17.5, 0, 0.25, 28], [17.5, 0, 0.25, 28],
  ]) {
    const r = box(w, 0.35, d, railMat, 0.85);
    r.position.x = x; r.position.z = z;
    scene.add(r);
  }

  // Billboard buildings around
  const buildingColors = [0x12101f, 0x18142c, 0x0e101c];
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2;
    const dist = 28 + (i % 3) * 6;
    const h = 8 + (i % 5) * 4;
    const b = makeNeonBox(4 + (i % 3), h, 4 + ((i + 1) % 3), buildingColors[i % 3], i % 2 ? level.accent : level.accent2);
    b.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
    scene.add(b);
    // window strip
    const win = box(3.2, 0.3, 0.15, mat(i % 2 ? level.accent : level.accent2, {
      emissive: i % 2 ? level.accent : level.accent2, emissiveIntensity: 0.8
    }), h * 0.55);
    win.position.copy(b.position);
    win.position.y = h * 0.55;
    win.lookAt(0, win.position.y, 0);
    scene.add(win);
  }

  // HVAC / crates cover
  const covers = [
    [-8, 4, 3, 2.2, 4], [7, -5, 4, 1.6, 3], [-3, -8, 2.5, 1.8, 2.5],
    [10, 6, 3, 2.5, 3], [-12, -2, 2, 3, 2], [2, 8, 5, 1.4, 2],
  ];
  for (const [x, z, w, h, d] of covers) {
    const c = box(w, h, d, mat(0x222038, { metalness: 0.55, roughness: 0.35 }), h / 2 + 0.6);
    c.position.set(x, 0, z);
    scene.add(c);
  }

  // Neon signs
  for (const [x, z, rot] of [[-10, 10, 0.4], [12, -8, -0.6]]) {
    const sign = box(0.2, 3, 5, mat(level.accent2, { emissive: level.accent2, emissiveIntensity: 0.9 }), 3);
    sign.position.set(x, 0.6, z);
    sign.rotation.y = rot;
    scene.add(sign);
  }
}

function buildDesertRuins(scene, level) {
  addGround(scene, level.ground, 100);
  // Sand dunes (scaled spheres flattened)
  for (let i = 0; i < 12; i++) {
    const dune = new THREE.Mesh(
      new THREE.SphereGeometry(6 + (i % 4), 10, 8),
      mat(0xb89255, { roughness: 1, metalness: 0 })
    );
    dune.scale.y = 0.28;
    dune.position.set((i % 4) * 14 - 21, -0.5, Math.floor(i / 4) * 16 - 16);
    dune.receiveShadow = true;
    scene.add(dune);
  }

  // Ruined pillars / walls
  for (let i = 0; i < 10; i++) {
    const h = 3 + (i % 4) * 1.2;
    const pillar = cyl(0.55, 0.7, h, mat(0x8d7350, { roughness: 0.85 }), h / 2, 7);
    pillar.position.set(Math.cos(i) * 12, 0, Math.sin(i * 1.7) * 10);
    pillar.rotation.z = (i % 3) * 0.08;
    scene.add(pillar);
  }
  // Broken walls for cover
  const walls = [
    [-6, 3, 8, 2.5, 0.6], [5, -4, 6, 2.2, 0.7], [0, 8, 0.7, 3, 7],
    [-10, -6, 5, 1.8, 0.6], [9, 5, 0.6, 2.8, 5],
  ];
  for (const [x, z, w, h, d] of walls) {
    const wmesh = box(w, h, d, mat(0x9a7b52, { roughness: 0.9 }), h / 2);
    wmesh.position.set(x, 0, z);
    scene.add(wmesh);
  }
  // Arch
  const archL = box(1, 4, 1, mat(0x7a6242), 2);
  archL.position.set(-2.5, 0, -10);
  const archR = box(1, 4, 1, mat(0x7a6242), 2);
  archR.position.set(2.5, 0, -10);
  const archTop = box(6, 1, 1.2, mat(0x8a7250), 4.5);
  archTop.position.z = -10;
  scene.add(archL, archR, archTop);

  // Warm sun disc hint
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(3, 12, 12),
    mat(0xffdd88, { emissive: 0xffaa44, emissiveIntensity: 1, roughness: 1, metalness: 0 })
  );
  sunMesh.position.set(-30, 22, -40);
  scene.add(sunMesh);
}

function buildIceBase(scene, level) {
  addGround(scene, level.ground, 95);
  // Ice patches
  for (let i = 0; i < 10; i++) {
    const ice = new THREE.Mesh(
      new THREE.CircleGeometry(3 + (i % 3), 10),
      mat(0xeaf6ff, { metalness: 0.7, roughness: 0.15, emissive: 0x88ccee, emissiveIntensity: 0.08 })
    );
    ice.rotation.x = -Math.PI / 2;
    ice.position.set((i % 5) * 10 - 20, 0.02, Math.floor(i / 5) * 14 - 8);
    ice.receiveShadow = true;
    scene.add(ice);
  }

  // Industrial hangars
  const hangars = [
    [-12, -6, 10, 5, 8], [14, 4, 8, 4.5, 10], [0, -14, 14, 3.5, 6],
  ];
  for (const [x, z, w, h, d] of hangars) {
    const body = box(w, h, d, mat(0x6a7c90, { metalness: 0.65, roughness: 0.35 }), h / 2);
    body.position.set(x, 0, z);
    scene.add(body);
    const trim = box(w + 0.2, 0.25, d + 0.2, mat(level.accent, {
      emissive: level.accent, emissiveIntensity: 0.55
    }), h + 0.1);
    trim.position.set(x, 0, z);
    scene.add(trim);
  }

  // Crates / barriers
  for (let i = 0; i < 14; i++) {
    const c = box(1.4, 1.2 + (i % 3) * 0.4, 1.4, mat(0x4a5a6e, { metalness: 0.5 }), 0.7);
    c.position.set(Math.sin(i * 2.1) * 11, 0, Math.cos(i * 1.3) * 9);
    scene.add(c);
  }

  // Antenna towers
  for (const [x, z] of [[-18, 12], [18, -10]]) {
    const pole = cyl(0.12, 0.18, 10, mat(0x334455, { metalness: 0.8 }), 5, 6);
    pole.position.set(x, 0, z);
    const light = box(0.4, 0.4, 0.4, mat(level.accent2, {
      emissive: level.accent2, emissiveIntensity: 1
    }), 10.3);
    light.position.set(x, 0, z);
    scene.add(pole, light);
  }

  // Low ice walls
  for (const [x, z, w, d] of [[-4, 2, 6, 0.5], [6, -3, 0.5, 5], [3, 7, 5, 0.5]]) {
    const wall = box(w, 1.4, d, mat(0xcfe6f5, { metalness: 0.4, roughness: 0.3 }), 0.7);
    wall.position.set(x, 0, z);
    scene.add(wall);
  }
}

function buildLevelEnvironment(scene, level) {
  if (level.id === "neon-rooftop") buildNeonRooftop(scene, level);
  else if (level.id === "desert-ruins") buildDesertRuins(scene, level);
  else buildIceBase(scene, level);
}


/* ---------- particles / VFX ---------- */
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
    this.state = "menu"; // menu | playing | paused | ended
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
    };

    this._setupRenderer();
    this._bindUI();
    this._bindInput();
    this.renderLevelSelect();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
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
      if (e.button === 0) this.mouseDown = true;
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

  startLevel(index) {
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

    const amb = new THREE.AmbientLight(level.ambient, 0.55);
    const sun = new THREE.DirectionalLight(level.sun, 1.05);
    sun.position.set(12, 22, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    this.scene.add(amb, sun);
    const hemi = new THREE.HemisphereLight(level.sky, level.ground, 0.35);
    this.scene.add(hemi);

    // rim neon accent light
    const neon = new THREE.PointLight(level.accent, 1.2, 40);
    neon.position.set(0, 6, 0);
    this.scene.add(neon);
    this._neonLight = neon;

    buildLevelEnvironment(this.scene, level);
    this.particles = new ParticleSystem(this.scene);

    const hero = createHumanoid({
      bodyColor: 0x1a2238,
      accent: level.accent,
      accent2: level.accent2,
      isEnemy: false,
    });
    hero.position.set(0, 0.6, 4);
    this.scene.add(hero);
    this.player.mesh = hero;

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
    this.spawnTimer = 0.4;
    this.waveClearing = false;
    $("hud-wave").textContent = `${this.wave} / ${counts.length}`;
    this.toast(`波次 ${this.wave}`);
  }


  spawnEnemy() {
    const e = createHumanoid({
      bodyColor: 0x2a1520,
      accent: this.level.accent2,
      accent2: this.level.accent,
      isEnemy: true,
      scale: 1,
    });
    const ang = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 8;
    e.position.set(Math.cos(ang) * dist, 0.6, Math.sin(ang) * dist);
    // keep on playable-ish area
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
    muzzle.getWorldPosition(origin);

    // aim from camera through crosshair
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.normalize();

    // muzzle flash
    this.particles.spawn(origin, this.level.accent, 6, 3, 0.12, 0.06);

    // hitscan with short bullet tracer
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

    // tracer bullet visual
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
    en.mesh.userData.muzzle.getWorldPosition(origin);
    const target = this.player.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const dir = target.sub(origin).normalize();
    // slight inaccuracy
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
    this.enemyBullets.push({ mesh: ball, vel: dir.multiplyScalar(22), life: 2.5, damage: 8 });
    this.particles.spawn(origin, 0xff5577, 4, 2, 0.1, 0.05);
  }


  updatePlayer(dt) {
    const mesh = this.player.mesh;
    if (!mesh) return;

    // movement relative to yaw
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

    // bounds
    mesh.position.x = THREE.MathUtils.clamp(mesh.position.x, -17, 17);
    mesh.position.z = THREE.MathUtils.clamp(mesh.position.z, -15, 15);

    // jump
    if (this.keys["Space"] && this.player.onGround) {
      this.player.vy = 8.5;
      this.player.onGround = false;
    }
    this.player.vy -= 22 * dt;
    mesh.position.y += this.player.vy * dt;
    if (mesh.position.y <= 0.6) {
      mesh.position.y = 0.6;
      this.player.vy = 0;
      this.player.onGround = true;
    }

    // face aim direction (model forward is +Z; camera forward is -Z at yaw 0)
    mesh.rotation.y = this.yaw + Math.PI;

    // simple walk bob
    const limbs = mesh.userData.limbs;
    if (limbs) {
      const t = this.clock.elapsedTime;
      const amp = moving ? 0.35 : 0.05;
      limbs.legL.rotation.x = Math.sin(t * 10) * amp;
      limbs.legR.rotation.x = Math.sin(t * 10 + Math.PI) * amp;
      limbs.armL.rotation.x = Math.sin(t * 10 + Math.PI) * amp * 0.6;
      limbs.armR.rotation.x = Math.sin(t * 10) * amp * 0.4;
    }

    // shoot / reload timers
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
    // over-shoulder chase cam
    const offset = new THREE.Vector3(0.85, 1.55, 4.2);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));
    offset.applyQuaternion(q);
    const desired = mesh.position.clone().add(offset);
    this.camera.position.lerp(desired, 0.18);
    const look = mesh.position.clone().add(new THREE.Vector3(0, 1.35, 0));
    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    look.add(lookDir.multiplyScalar(6));
    this.camera.lookAt(look);
  }

  updateEnemies(dt) {
    // spawn
    if (this.spawnQueue > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy();
        this.spawnQueue -= 1;
        this.spawnTimer = 0.7;
      }
    }

    const playerPos = this.player.mesh.position;
    for (const en of this.enemies) {
      const pos = en.mesh.position;
      const toPlayer = playerPos.clone().sub(pos);
      toPlayer.y = 0;
      const dist = toPlayer.length();
      if (dist > 0.01) {
        const dir = toPlayer.normalize();
        en.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        if (en.melee) {
          if (dist > 1.4) pos.addScaledVector(dir, en.speed * 1.15 * dt);
          else {
            // melee hit
            en.shootCd -= dt;
            if (en.shootCd <= 0) {
              this.damagePlayer(12);
              en.shootCd = 0.9;
              this.particles.spawn(playerPos.clone().add(new THREE.Vector3(0, 1, 0)), 0xff2244, 6, 3, 0.2, 0.08);
            }
          }
        } else {
          if (dist > 8) pos.addScaledVector(dir, en.speed * dt);
          else if (dist < 5) pos.addScaledVector(dir, -en.speed * 0.6 * dt);
          en.shootCd -= dt;
          if (en.shootCd <= 0 && dist < 22) {
            this.enemyShoot(en);
            en.shootCd = 1.1 + Math.random() * 0.8;
          }
        }
      }
      pos.x = THREE.MathUtils.clamp(pos.x, -17, 17);
      pos.z = THREE.MathUtils.clamp(pos.z, -15, 15);

      if (en.hitFlash > 0) {
        en.hitFlash -= dt;
        en.mesh.traverse((c) => {
          if (c.isMesh && c.material && c.material.emissive) {
            c.material.emissiveIntensity = en.hitFlash > 0 ? 1.2 : (c.material.userData._ei || c.material.emissiveIntensity);
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
        this._neonLight.intensity = 1.0 + Math.sin(this.clock.elapsedTime * 3) * 0.25;
      }
    } else if (this.state === "menu") {
      // idle backdrop
      if (this.scene.children.length === 0) {
        this.scene.background = new THREE.Color(0x07080f);
        const amb = new THREE.AmbientLight(0x4060a0, 0.6);
        this.scene.add(amb);
      }
      this.camera.position.set(0, 3, 10);
      this.camera.lookAt(0, 1, 0);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

new Game();
