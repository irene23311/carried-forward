/* ============================================================
   whale.js — Three.js scene: ocean + exploration + Penn Cove
   Carried Forward: The Memory of Whales
   ============================================================ */

const canvas   = document.getElementById('tc');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const cam   = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 1000);
cam.position.set(0, 1.2, 4);
cam.lookAt(0, 0, 0);

function lerp(a, b, t) { return a + (b - a) * t; }

/* ─────────────────────────────────────────
   LIGHTING
───────────────────────────────────────── */
scene.add(new THREE.AmbientLight(0x001a2e, 1.5));
const cyanLight = new THREE.PointLight(0x00ffe7, 2.5, 20);
cyanLight.position.set(0, 4, 3);
scene.add(cyanLight);
const rimLight = new THREE.DirectionalLight(0x003355, 0.8);
rimLight.position.set(0, 5, -6);
scene.add(rimLight);

/* ─────────────────────────────────────────
   WASD + MOUSE LOOK EXPLORATION
───────────────────────────────────────── */
var explore = {
  active: true,
  keys:   { w: false, a: false, s: false, d: false, q: false, e: false },
  yaw:    0,
  pitch:  0,
  drag:   false,
  lastX:  0,
  lastY:  0,
  speed:  0.06,
  sens:   0.0018,
};

var PITCH_MIN = -1.0;
var PITCH_MAX =  0.3;
var BOUNDS    = { xMin: -10, xMax: 10, zMin: -2, zMax: 12, yMin: -2.5, yMax: 2.5 };

document.addEventListener('keydown', function (e) {
  var k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup')    explore.keys.w = true;
  if (k === 's' || k === 'arrowdown')  explore.keys.s = true;
  if (k === 'a' || k === 'arrowleft')  explore.keys.a = true;
  if (k === 'd' || k === 'arrowright') explore.keys.d = true;
  if (k === 'q') explore.keys.q = true;
  if (k === 'e') explore.keys.e = true;
});
document.addEventListener('keyup', function (e) {
  var k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup')    explore.keys.w = false;
  if (k === 's' || k === 'arrowdown')  explore.keys.s = false;
  if (k === 'a' || k === 'arrowleft')  explore.keys.a = false;
  if (k === 'd' || k === 'arrowright') explore.keys.d = false;
  if (k === 'q') explore.keys.q = false;
  if (k === 'e') explore.keys.e = false;
});

canvas.addEventListener('mousedown', function (e) {
  if (!explore.active) return;
  explore.drag  = true;
  explore.lastX = e.clientX;
  explore.lastY = e.clientY;
  canvas.style.cursor = 'grabbing';
});
document.addEventListener('mouseup', function () {
  explore.drag = false;
  if (explore.active) canvas.style.cursor = 'grab';
});
document.addEventListener('mousemove', function (e) {
  if (!explore.active || !explore.drag) return;
  var dx = e.clientX - explore.lastX;
  var dy = e.clientY - explore.lastY;
  explore.lastX  = e.clientX;
  explore.lastY  = e.clientY;
  explore.yaw   -= dx * explore.sens;
  explore.pitch -= dy * explore.sens;
  explore.pitch  = Math.max(PITCH_MIN, Math.min(PITCH_MAX, explore.pitch));
});

canvas.addEventListener('touchstart', function (e) {
  if (!explore.active) return;
  explore.drag  = true;
  explore.lastX = e.touches[0].clientX;
  explore.lastY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener('touchend',  function () { explore.drag = false; });
document.addEventListener('touchmove', function (e) {
  if (!explore.active || !explore.drag) return;
  var dx = e.touches[0].clientX - explore.lastX;
  var dy = e.touches[0].clientY - explore.lastY;
  explore.lastX  = e.touches[0].clientX;
  explore.lastY  = e.touches[0].clientY;
  explore.yaw   -= dx * explore.sens * 0.6;
  explore.pitch -= dy * explore.sens * 0.6;
  explore.pitch  = Math.max(PITCH_MIN, Math.min(PITCH_MAX, explore.pitch));
}, { passive: true });

function updateExploreCamera() {
  if (!explore.active) return;
  if (!document.body.classList.contains('intro-active')) return;
  var fwdX =  Math.sin(explore.yaw);
  var fwdZ = -Math.cos(explore.yaw);
  var rgtX =  Math.cos(explore.yaw);
  var rgtZ =  Math.sin(explore.yaw);
  var spd  = explore.speed;
  if (explore.keys.w) { cam.position.x += fwdX * spd; cam.position.z += fwdZ * spd; }
  if (explore.keys.s) { cam.position.x -= fwdX * spd; cam.position.z -= fwdZ * spd; }
  if (explore.keys.a) { cam.position.x -= rgtX * spd; cam.position.z -= rgtZ * spd; }
  if (explore.keys.d) { cam.position.x += rgtX * spd; cam.position.z += rgtZ * spd; }
  if (explore.keys.q) cam.position.y += spd * 0.6;
  if (explore.keys.e) cam.position.y -= spd * 0.6;
  cam.position.x = Math.max(BOUNDS.xMin, Math.min(BOUNDS.xMax, cam.position.x));
  cam.position.z = Math.max(BOUNDS.zMin, Math.min(BOUNDS.zMax, cam.position.z));
  cam.position.y = Math.max(BOUNDS.yMin, Math.min(BOUNDS.yMax, cam.position.y));
  cam.rotation.order = 'YXZ';
  cam.rotation.y     = explore.yaw;
  cam.rotation.x     = explore.pitch;
}

window.onDiveStart = function () {
  explore.active      = false;
  canvas.style.cursor = '';
  wGroup.visible      = false;
  calfGroup.visible   = false;
  cam.rotation.order  = 'YXZ';
  cam.rotation.set(0, 0, 0);
  cam.position.set(0, 1.2, 4);
};

/* ─────────────────────────────────────────
   PROCEDURAL OCEAN
───────────────────────────────────────── */
var oceanGroup   = new THREE.Group();
var oceanOpacity = 1;
var oceanFading  = false;
scene.add(oceanGroup);

window.fadeOutOcean = function () { oceanFading = true; };

var oceanGeo = new THREE.PlaneGeometry(32, 32, 140, 140);
oceanGeo.rotateX(-Math.PI / 2);
var posAttr     = oceanGeo.attributes.position;
var vertexCount = posAttr.count;

var oceanMat = new THREE.MeshPhongMaterial({
  color:       new THREE.Color(0x003d52),
  emissive:    new THREE.Color(0x001a28),
  specular:    new THREE.Color(0x00ffe7),
  shininess:   120,
  transparent: true,
  opacity:     1,
  side:        THREE.DoubleSide,
});
var oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
oceanMesh.position.set(0, -0.4, 2);
oceanGroup.add(oceanMesh);

var waves = [
  { amp: 0.10, freqX: 0.8,  freqZ: 1.2,  speed: 0.9 },
  { amp: 0.06, freqX: 1.6,  freqZ: 0.7,  speed: 1.4 },
  { amp: 0.03, freqX: 3.2,  freqZ: 2.8,  speed: 2.2 },
  { amp: 0.02, freqX: 5.0,  freqZ: 4.1,  speed: 3.0 },
];

function updateOcean(t) {
  for (var i = 0; i < vertexCount; i++) {
    var x = posAttr.getX(i);
    var z = posAttr.getZ(i);
    var y = 0;
    waves.forEach(function (w) {
      y += w.amp * Math.sin(x * w.freqX + t * w.speed)
                 * Math.cos(z * w.freqZ + t * w.speed * 0.7);
    });
    posAttr.setY(i, y);
  }
  posAttr.needsUpdate = true;
  oceanGeo.computeVertexNormals();
}

scene.fog = new THREE.FogExp2(0x000810, 0.06);

/* ─────────────────────────────────────────
   STORY WHALE — silhouette geometry
   Visible only during S2→S3 transition
───────────────────────────────────────── */
var wGroup = new THREE.Group();
scene.add(wGroup);

var edgesM = new THREE.LineBasicMaterial({ color: new THREE.Color(0.05, 1, 0.9),  transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
var glowM  = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0.85, 0.78), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
var innerM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1, 0.95),  transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

function makeGlowShape(shape, depth) {
  depth = depth || 0.04;
  var geo   = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false });
  var mesh  = new THREE.Mesh(geo, glowM.clone());
  var inner = new THREE.Mesh(geo, innerM.clone()); inner.scale.setScalar(0.88);
  var lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 15), edgesM.clone());
  var g = new THREE.Group(); g.add(mesh, inner, lines); return g;
}

(function buildBody() {
  var s = new THREE.Shape();
  s.moveTo( 1.00,  0.00);
  s.bezierCurveTo( 0.95,  0.08,  0.80,  0.22,  0.60,  0.32);
  s.bezierCurveTo( 0.30,  0.42, -0.10,  0.48, -0.40,  0.44);
  s.bezierCurveTo(-0.80,  0.38, -1.30,  0.20, -1.60,  0.08);
  s.bezierCurveTo(-1.68,  0.04, -1.72,  0.01, -1.75,  0.00);
  s.bezierCurveTo(-1.78,  0.02, -1.82,  0.14, -1.78,  0.22);
  s.bezierCurveTo(-1.74,  0.28, -1.68,  0.24, -1.65,  0.18);
  s.bezierCurveTo(-1.63,  0.14, -1.60,  0.08, -1.58,  0.02);
  s.lineTo(-1.58, -0.02);
  s.bezierCurveTo(-1.62, -0.08, -1.76, -0.20, -1.80, -0.26);
  s.bezierCurveTo(-1.84, -0.30, -1.80, -0.36, -1.74, -0.30);
  s.bezierCurveTo(-1.68, -0.24, -1.62, -0.10, -1.58, -0.04);
  s.bezierCurveTo(-1.20, -0.18, -0.70, -0.28, -0.20, -0.30);
  s.bezierCurveTo( 0.20, -0.28,  0.55, -0.18,  0.75, -0.10);
  s.bezierCurveTo( 0.85, -0.06,  0.95, -0.02,  1.00,  0.00);
  wGroup.add(makeGlowShape(s, 0.06));
})();
(function buildDorsal() {
  var s = new THREE.Shape();
  s.moveTo(-0.10,  0.44);
  s.bezierCurveTo(-0.05,  0.58,  0.00,  0.90, -0.08,  1.05);
  s.bezierCurveTo(-0.12,  1.08, -0.16,  1.06, -0.18,  1.00);
  s.bezierCurveTo(-0.24,  0.80, -0.28,  0.60, -0.38,  0.44);
  s.lineTo(-0.10, 0.44);
  wGroup.add(makeGlowShape(s, 0.03));
})();
(function buildPectoral() {
  var s = new THREE.Shape();
  s.moveTo( 0.40, -0.10);
  s.bezierCurveTo( 0.30, -0.20,  0.10, -0.50, -0.05, -0.70);
  s.bezierCurveTo(-0.10, -0.78, -0.08, -0.82, -0.02, -0.78);
  s.bezierCurveTo( 0.10, -0.68,  0.25, -0.44,  0.38, -0.28);
  s.bezierCurveTo( 0.42, -0.22,  0.46, -0.14,  0.40, -0.10);
  var g = makeGlowShape(s, 0.02); g.position.z = 0.05; wGroup.add(g);
})();

var allMats = [];
wGroup.traverse(function (c) { if (c.material) allMats.push(c.material); });
wGroup.rotation.y = 0; wGroup.rotation.z = 0.06; wGroup.scale.setScalar(1.1);
wGroup.visible = false;

/* ── Ghost calf ── */
var calfGroup = new THREE.Group();
calfGroup.scale.setScalar(0.42);
calfGroup.position.set(1.2, -0.38, 0.1);
calfGroup.visible = false;
scene.add(calfGroup);

(function buildCalf() {
  var s = new THREE.Shape();
  s.moveTo( 1.00,  0.00);
  s.bezierCurveTo( 0.95,  0.08,  0.80,  0.20,  0.55,  0.28);
  s.bezierCurveTo( 0.20,  0.36, -0.20,  0.38, -0.55,  0.32);
  s.bezierCurveTo(-1.00,  0.22, -1.40,  0.10, -1.55,  0.02);
  s.lineTo(-1.60, 0.00); s.lineTo(-1.55, -0.02);
  s.bezierCurveTo(-1.40, -0.10, -1.00, -0.20, -0.55, -0.24);
  s.bezierCurveTo(-0.20, -0.24,  0.20, -0.20,  0.55, -0.14);
  s.bezierCurveTo( 0.80, -0.08,  0.95, -0.04,  1.00,  0.00);
  var geo   = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false });
  var lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 15),
    new THREE.LineBasicMaterial({ color: new THREE.Color(0.03, 0.85, 0.78), transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
  var mesh  = new THREE.Mesh(geo,
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0.9, 0.82), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  calfGroup.add(mesh, lines);
})();

var calfEdgesM = calfGroup.children[1] ? calfGroup.children[1].material : null;
var calfGlowM  = calfGroup.children[0] ? calfGroup.children[0].material : null;

/* ── Ambient particles ── */
var APT   = 800;
var apPos = new Float32Array(APT * 3);
for (var i = 0; i < APT; i++) {
  apPos[i*3]   = (Math.random()-0.5)*28;
  apPos[i*3+1] = (Math.random()-0.5)*10;
  apPos[i*3+2] = (Math.random()-0.5)*20;
}
var apG = new THREE.BufferGeometry();
apG.setAttribute('position', new THREE.BufferAttribute(apPos, 3));
var apM = new THREE.PointsMaterial({ size: 0.022, color: new THREE.Color(0,1,0.9), transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false });
scene.add(new THREE.Points(apG, apM));

/* ─────────────────────────────────────────
   PENN COVE PARTICLE SIMULATION
   80 particles = 80 Southern Residents
   S2 (0.156) → S3 (0.314)
───────────────────────────────────────── */
var PC_S2    = 0.156;
var PC_S3    = 0.314;
var pcGroup  = new THREE.Group();
scene.add(pcGroup);

var PC_COUNT    = 80;
var PC_CAPTURED = [3, 7, 12, 18, 24, 29, 35];
var PC_KILLED   = [5, 15, 27, 40, 55];

var pcParticles = [];
for (var i = 0; i < PC_COUNT; i++) {
  var hx = (Math.random()-0.5)*4.0;
  var hy = (Math.random()-0.5)*1.8;
  var hz = (Math.random()-0.5)*3.0;
  pcParticles.push({
    x: hx, y: hy, z: hz,
    homeX: hx, homeY: hy, homeZ: hz,
    scatterX: (Math.random()-0.5)*14,
    scatterY: (Math.random()-0.5)*6,
    scatterZ: (Math.random()-0.5)*10,
    phase:  Math.random()*Math.PI*2,
    speed:  0.3+Math.random()*0.4,
    alive:  true,
    opacity: 1.0,
  });
}

var pcPositions = new Float32Array(PC_COUNT*3);
var pcColors    = new Float32Array(PC_COUNT*3);
var pcGeo = new THREE.BufferGeometry();
pcGeo.setAttribute('position', new THREE.BufferAttribute(pcPositions, 3));
pcGeo.setAttribute('color',    new THREE.BufferAttribute(pcColors,    3));

var pcMat = new THREE.PointsMaterial({
  size: 0.12, vertexColors: true,
  transparent: true, opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false, sizeAttenuation: true,
});
var pcPoints = new THREE.Points(pcGeo, pcMat);
pcGroup.add(pcPoints);

/* Shockwave ring */
var shockGeo  = new THREE.RingGeometry(0.1, 0.14, 64);
var shockMat  = new THREE.MeshBasicMaterial({
  color: 0x00ffe7, transparent: true, opacity: 0,
  side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
});
var shockRing = new THREE.Mesh(shockGeo, shockMat);
shockRing.rotation.x = -Math.PI/2;
pcGroup.add(shockRing);

var pcWasActive = false;

function resetPennCove() {
  for (var i = 0; i < PC_COUNT; i++) {
    var pk    = pcParticles[i];
    pk.x      = pk.homeX;
    pk.y      = pk.homeY;
    pk.z      = pk.homeZ;
    pk.alive  = true;
    pk.opacity = 1.0;
  }
}

function updatePennCove(s, t) {
  var inRange = (s >= PC_S2 && s <= PC_S3);
  if (!inRange) { pcMat.opacity = 0; shockMat.opacity = 0; return; }

  var p = (s - PC_S2) / (PC_S3 - PC_S2);

  /* System fade in/out */
  var sysOp = p < 0.08 ? p/0.08 : p > 0.92 ? (1-p)/0.08 : 1;
  pcMat.opacity = sysOp;

  /* Pull camera back to view the school — only in story mode */
  if (!explore.active) {
    cam.position.set(0, lerp(2.0, 3.5, Math.min(p*2,1)), lerp(6.0, 9.0, Math.min(p*1.5,1)));
    cam.lookAt(0, 0, 0);
  }

  for (var i = 0; i < PC_COUNT; i++) {
    var pk     = pcParticles[i];
    var isCapt = PC_CAPTURED.includes(i);
    var isKill = PC_KILLED.includes(i);

    if (!pk.alive) {
      pk.opacity = Math.max(0, pk.opacity - 0.03);
      pcColors[i*3]   = pk.opacity * 0.85;
      pcColors[i*3+1] = 0;
      pcColors[i*3+2] = 0;
      pcPositions[i*3]   = pk.x;
      pcPositions[i*3+1] = pk.y;
      pcPositions[i*3+2] = pk.z;
      continue;
    }

    if (p < 0.25) {
      /* Phase 1 — calm school */
      pk.x = pk.homeX + Math.sin(t*pk.speed + pk.phase)*0.3;
      pk.y = pk.homeY + Math.cos(t*pk.speed*0.7 + pk.phase)*0.2;
      pk.z = pk.homeZ + Math.sin(t*pk.speed*0.5 + pk.phase+1)*0.25;
      pcColors[i*3]=0; pcColors[i*3+1]=1; pcColors[i*3+2]=0.9;

    } else if (p < 0.45) {
      /* Phase 2 — shockwave */
      var sp = (p-0.25)/0.20;
      shockRing.scale.setScalar(sp*5.5);
      shockMat.opacity = sysOp*(1-sp)*0.8;

      if (isKill) {
        var flash = Math.sin(sp*Math.PI*6)*0.5+0.5;
        pcColors[i*3]=0.9+flash*0.1; pcColors[i*3+1]=flash*0.1; pcColors[i*3+2]=flash*0.05;
      } else if (isCapt) {
        pk.x = lerp(pk.homeX, 2.8,  sp);
        pk.y = lerp(pk.homeY, -0.5, sp);
        pk.z = lerp(pk.homeZ, -1.5, sp);
        pcColors[i*3]=0.5+sp*0.5; pcColors[i*3+1]=1-sp*0.8; pcColors[i*3+2]=0.9-sp*0.9;
      } else {
        pk.x = pk.homeX + Math.sin(t*pk.speed+pk.phase)*(0.3+sp*0.8);
        pk.y = pk.homeY + Math.cos(t*pk.speed*0.7+pk.phase)*(0.2+sp*0.5);
        pk.z = pk.homeZ + Math.sin(t*pk.speed*0.5+pk.phase)*(0.25+sp*0.6);
        pcColors[i*3]=0; pcColors[i*3+1]=1-sp*0.3; pcColors[i*3+2]=0.9;
      }

    } else if (p < 0.62) {
      /* Phase 3 — aftermath */
      shockMat.opacity = 0;
      var ap = (p-0.45)/0.17;

      if (isKill) {
        if (pk.alive) { pk.alive = false; pk.opacity = 1.0; }
      } else if (isCapt) {
        pk.x = lerp(pk.x, 2.8+Math.sin(i)*0.15, 0.08);
        pk.y = lerp(pk.y, -0.5+Math.cos(i)*0.1,  0.08);
        pk.z = lerp(pk.z, -1.5, 0.08);
        var cd = 1-ap*0.6;
        pcColors[i*3]=0.8*cd; pcColors[i*3+1]=0.9*cd; pcColors[i*3+2]=cd;
      } else {
        pk.x = lerp(pk.x, pk.scatterX, 0.04);
        pk.y = lerp(pk.y, pk.scatterY, 0.04);
        pk.z = lerp(pk.z, pk.scatterZ, 0.04);
        pcColors[i*3]=0; pcColors[i*3+1]=0.7+Math.sin(t+pk.phase)*0.2; pcColors[i*3+2]=0.85;
      }

    } else {
      /* Phase 4 — disoriented drift */
      shockMat.opacity = 0;
      if (isCapt) {
        var ld = Math.max(0, 0.4-(p-0.62)*0.3);
        pcColors[i*3]=ld; pcColors[i*3+1]=ld*1.1; pcColors[i*3+2]=ld*1.2;
      } else {
        pk.x += Math.sin(t*0.3+pk.phase)*0.008;
        pk.y += Math.cos(t*0.2+pk.phase)*0.004;
        pk.z += Math.sin(t*0.25+pk.phase+1)*0.006;
        var dd = 0.7+Math.sin(t*0.5+pk.phase)*0.15;
        pcColors[i*3]=0; pcColors[i*3+1]=dd; pcColors[i*3+2]=dd*0.95;
      }
    }

    pcPositions[i*3]   = pk.x;
    pcPositions[i*3+1] = pk.y;
    pcPositions[i*3+2] = pk.z;
  }

  pcGeo.attributes.position.needsUpdate = true;
  pcGeo.attributes.color.needsUpdate    = true;
}

/* ─────────────────────────────────────────
   OPACITY HELPERS
───────────────────────────────────────── */
function setWhaleOpacity(o) {
  allMats.forEach(function (m) {
    if (!m) return;
    if (m.isLineBasicMaterial)           m.opacity = o;
    else if (m.color && m.color.r > 0.4) m.opacity = o * 0.15;
    else                                  m.opacity = o * 0.22;
  });
}
function setCalfOpacity(o) {
  if (calfEdgesM) calfEdgesM.opacity = o * 0.8;
  if (calfGlowM)  calfGlowM.opacity  = o * 0.15;
}

/* ─────────────────────────────────────────
   ANIMATION LOOP
───────────────────────────────────────── */
var t       = 0;
var scrollP = 0;
var targetP = 0;

window.setScrollProgress = function (p) { targetP = p; };

var SWIM_START = 0.455;
var SWIM_END   = 0.505;

window.getExploreCamera = function () { return cam; };
window.getExploreScene  = function () { return scene; };

canvas.style.cursor = 'grab';

(function animLoop() {
  requestAnimationFrame(animLoop);
  t += 0.007;

  updateOcean(t);
  updateExploreCamera();

  /* Ocean fade */
  if (oceanFading) {
    oceanOpacity = Math.max(0, oceanOpacity - 0.025);
    oceanMat.opacity = oceanOpacity;
    if (!explore.active) cam.position.y = lerp(1.2, -0.3, 1 - oceanOpacity);
    if (oceanOpacity <= 0) {
      scene.remove(oceanGroup);
      scene.fog = null;
      oceanFading = false;
    }
  }

  scrollP = lerp(scrollP, targetP, 0.05);
  var s   = scrollP;

  /* ── Penn Cove simulation ── */
  var pcActive = (s >= PC_S2 && s <= PC_S3);
  if (!pcActive && pcWasActive) resetPennCove();
  pcWasActive = pcActive;
  updatePennCove(s, t);

  /* ── Story whale: S2→S3 transition ── */
  var bobY         = Math.sin(t*0.65)*0.06;
  var inTransition = (s >= SWIM_START && s <= SWIM_END);

  if (inTransition) {
    var p = (s - SWIM_START) / (SWIM_END - SWIM_START);
    wGroup.position.x = lerp( 2.2, -2.2, p);
    wGroup.position.y = lerp( 0.9, -0.9, p) + bobY;
    wGroup.position.z = 0;
    wGroup.rotation.z = lerp(-0.15, 0.05, p);
    wGroup.rotation.y = 0;
    wGroup.scale.setScalar(1.1);
    wGroup.visible    = true;
    var opacity = p < 0.2 ? p/0.2 : p > 0.8 ? (1-p)/0.2 : 1;
    setWhaleOpacity(opacity);
    setCalfOpacity(0);
    if (!explore.active) cam.position.set(0, 0, 4.5);
    apM.opacity = lerp(0, 0.18, Math.min(p*5, 1));
  } else {
    wGroup.visible = false;
    setWhaleOpacity(0);
    if (!explore.active && !pcActive) cam.position.set(0, 0, 4.5);
    apM.opacity = explore.active ? 0.08 : 0;
  }

  /* ── Ghost calf: S4 grief section ── */
  var inGrief = (s >= 0.59 && s <= 0.75);
  calfGroup.visible = inGrief;
  if (inGrief) {
    var gp = (s - 0.59) / (0.75 - 0.59);
    calfGroup.position.set(1.2, lerp(-0.38, -0.1, gp), 0.1);
    setCalfOpacity(lerp(0, 0.35, Math.min(gp*3, 1)));
  } else {
    setCalfOpacity(0);
  }

  renderer.render(scene, cam);
})();

window.addEventListener('resize', function () {
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});