/* ============================================================
   whale.js — Three.js scene: procedural ocean + whale
   Carried Forward: The Memory of Whales
   ============================================================ */

const canvas   = document.getElementById('tc');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1); // keep at 1 for performance
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const cam   = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 1000);
cam.position.set(0, .9, 4);
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
   PROCEDURAL OCEAN
   A PlaneGeometry whose vertices move every
   frame using overlapping sine waves.
   No GLB needed — runs at 60fps.

   WAVE PARAMETERS (easy to tweak):
   amp   = height of the wave
   freqX = how many waves across X axis
   freqZ = how many waves across Z axis
   speed = how fast it moves
───────────────────────────────────────── */
var oceanGroup   = new THREE.Group();
var oceanOpacity = 1;
var oceanFading  = false;
scene.add(oceanGroup);

window.fadeOutOcean = function() { oceanFading = true; };

// Geometry: 120 segments gives smooth curves without being too heavy
var oceanGeo = new THREE.PlaneGeometry(24, 24, 120, 120);
oceanGeo.rotateX(-Math.PI / 2); // lay flat

var posAttr     = oceanGeo.attributes.position;
var vertexCount = posAttr.count;

var oceanMat = new THREE.MeshPhongMaterial({
  color:       new THREE.Color(0x003d52),
  emissive:    new THREE.Color(0x001a28),
  specular:    new THREE.Color(0x00ffe7),  // cyan glint on wave peaks
  shininess:   120,
  transparent: true,
  opacity:     1,
  side:        THREE.DoubleSide,
});

var oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
oceanMesh.position.set(0, -0.5, -1);
oceanGroup.add(oceanMesh);

// Four overlapping waves = realistic water feel
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
    waves.forEach(function(w) {
      y += w.amp * Math.sin(x * w.freqX + t * w.speed)
                 * Math.cos(z * w.freqZ + t * w.speed * 0.7);
    });
    posAttr.setY(i, y);
  }
  posAttr.needsUpdate = true;
  oceanGeo.computeVertexNormals(); // update lighting per frame
}

// Fog sells the deep-water atmosphere
scene.fog = new THREE.FogExp2(0x000810, 0.08);

/* ─────────────────────────────────────────
   PROCEDURAL GLOW WHALE
───────────────────────────────────────── */
function makeWhaleBody() {
  var profile = [
    [0,.02],[.12,.12],[.28,.22],[.45,.32],[.6,.38],[.72,.4],
    [.82,.38],[.9,.32],[.96,.22],[1.0,.1],[1.02,0],
    [.99,-.1],[.92,-.22],[.8,-.3],[.65,-.34],[.48,-.32],
    [.3,-.24],[.15,-.14],[.04,-.04],[0,0]
  ];
  return new THREE.LatheGeometry(
    profile.map(function(p) { return new THREE.Vector2(p[0]*.9, p[1]); }),
    48, 0, Math.PI * 2
  );
}

var wGroup = new THREE.Group();
scene.add(wGroup);

var haloM  = new THREE.MeshBasicMaterial({ color:new THREE.Color(0,1,.93),  transparent:true, opacity:0, side:THREE.FrontSide, blending:THREE.AdditiveBlending, depthWrite:false });
var midM   = new THREE.MeshBasicMaterial({ color:new THREE.Color(.03,.9,.82), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false });
var edgesM = new THREE.LineBasicMaterial({ color:new THREE.Color(.05,1,.9),  transparent:true, opacity:0, blending:THREE.AdditiveBlending });
var innerM = new THREE.MeshBasicMaterial({ color:new THREE.Color(.6,1,.97),  transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false });

var halo  = new THREE.Mesh(makeWhaleBody(), haloM);  halo.scale.setScalar(1.18);
var mid   = new THREE.Mesh(makeWhaleBody(), midM);   mid.scale.setScalar(1.06);
var edges = new THREE.LineSegments(new THREE.EdgesGeometry(makeWhaleBody(), .5), edgesM);
var inner = new THREE.Mesh(makeWhaleBody(), innerM); inner.scale.setScalar(.72);
wGroup.add(halo, mid, edges, inner);

// Dorsal fin
var dorsalG = new THREE.BufferGeometry();
dorsalG.setAttribute('position', new THREE.BufferAttribute(new Float32Array([.1,0,0,.38,0,0,.22,.32,0]), 3));
var dorsalM    = new THREE.MeshBasicMaterial({ color:new THREE.Color(.03,.85,.78), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide });
var dEdgM      = new THREE.LineBasicMaterial({ color:new THREE.Color(.05,1,.9), transparent:true, opacity:0, blending:THREE.AdditiveBlending });
var dorsal     = new THREE.Mesh(dorsalG, dorsalM);
var dorsalEdge = new THREE.LineSegments(new THREE.EdgesGeometry(dorsalG), dEdgM);
dorsal.position.set(-.05,.38,0);
dorsalEdge.position.copy(dorsal.position);
wGroup.add(dorsal, dorsalEdge);

// Flukes
function makeFlukeHalf(s) {
  var g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0,0,0, s*.05,0,.02, s*.3,.08,0, s*.46,0,-.02, s*.28,-.06,0, 0,0,0
  ]), 3));
  return g;
}
[-1,1].forEach(function(s) {
  var fg  = makeFlukeHalf(s);
  var fm  = new THREE.MeshBasicMaterial({ color:new THREE.Color(.02,.8,.72), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide });
  var fem = new THREE.LineBasicMaterial({ color:new THREE.Color(.05,1,.9), transparent:true, opacity:0, blending:THREE.AdditiveBlending });
  var fl  = new THREE.Mesh(fg, fm);  fl.position.set(-.88,0,0);
  var fle = new THREE.LineSegments(new THREE.EdgesGeometry(fg), fem); fle.position.copy(fl.position);
  wGroup.add(fl, fle);
});

// Pectoral fins
[-.18,.18].forEach(function(z) {
  var pg  = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    .28,0,z, .46,-.06,z+z*.4, .28,-.32,z+z*.3, .12,-.22,z, .28,0,z
  ]), 3));
  var pm  = new THREE.MeshBasicMaterial({ color:new THREE.Color(.02,.8,.72), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide });
  var pem = new THREE.LineBasicMaterial({ color:new THREE.Color(.04,.95,.86), transparent:true, opacity:0, blending:THREE.AdditiveBlending });
  wGroup.add(new THREE.Mesh(pg, pm), new THREE.LineSegments(new THREE.EdgesGeometry(pg), pem));
});

var allMats = wGroup.children.map(function(c) { return c.material; }).filter(Boolean);
wGroup.rotation.y = Math.PI * .5;
wGroup.rotation.z = .06;
wGroup.scale.setScalar(1.8);
wGroup.visible = false; // hidden until dive

// Ghost calf
var calfGroup  = new THREE.Group();
calfGroup.scale.setScalar(.42);
calfGroup.position.set(1.2, -.38, .1);
calfGroup.visible = false;
scene.add(calfGroup);

var calfEdgesM = new THREE.LineBasicMaterial({ color:new THREE.Color(.03,.85,.78), transparent:true, opacity:0, blending:THREE.AdditiveBlending });
var calfGlowM  = new THREE.MeshBasicMaterial({ color:new THREE.Color(0,.9,.82), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false });
calfGroup.add(
  new THREE.LineSegments(new THREE.EdgesGeometry(makeWhaleBody(),.5), calfEdgesM),
  new THREE.Mesh(makeWhaleBody(), calfGlowM)
);

// Ambient particles
var APT   = 600;
var apPos = new Float32Array(APT * 3);
for (var i = 0; i < APT; i++) {
  apPos[i*3]   = (Math.random()-.5)*20;
  apPos[i*3+1] = (Math.random()-.5)*12;
  apPos[i*3+2] = (Math.random()-.5)*10;
}
var apG = new THREE.BufferGeometry();
apG.setAttribute('position', new THREE.BufferAttribute(apPos, 3));
var apM = new THREE.PointsMaterial({ size:.022, color:new THREE.Color(0,1,.9), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false });
scene.add(new THREE.Points(apG, apM));

/* ─────────────────────────────────────────
   OPACITY HELPERS
───────────────────────────────────────── */
function setWhaleOpacity(o) {
  allMats.forEach(function(m) {
    if (!m) return;
    if      (m === haloM)   m.opacity = o * .14;
    else if (m === midM)    m.opacity = o * .22;
    else if (m === innerM)  m.opacity = o * .18;
    else if (m === dorsalM) m.opacity = o * .20;
    else                    m.opacity = o;
  });
}
function setCalfOpacity(o) {
  calfEdgesM.opacity = o * .8;
  calfGlowM.opacity  = o * .15;
}

/* ─────────────────────────────────────────
   ANIMATION LOOP
───────────────────────────────────────── */
var t           = 0;
var scrollP     = 0;
var targetP     = 0;
var whaleFadeIn = 0;

window.setScrollProgress = function(p) { targetP = p; };

window.onDiveStart = function() {
  whaleFadeIn       = 0;
  wGroup.visible    = false;
  calfGroup.visible = false;
  cam.position.set(0, 1.2, 4); // 👈 add this
  cam.lookAt(0, 0, 0);
};

(function animLoop() {
  requestAnimationFrame(animLoop);
  t += .007;

  /* ── Animate ocean waves every frame ── */
  updateOcean(t);

  /* ── Fade ocean out on dive, camera dips under ── */
  if (oceanFading) {
    oceanOpacity = Math.max(0, oceanOpacity - 0.025);
    oceanMat.opacity = oceanOpacity;
    // Camera slowly dips below the surface as it fades
    cam.position.y = lerp(1.2, -0.3, 1 - oceanOpacity);
    if (oceanOpacity <= 0) {
      scene.remove(oceanGroup);
      scene.fog = null;
      oceanFading = false;
    }
  }

  /* ── Whale fades in gradually after dive ── */
  if (wGroup.visible && whaleFadeIn < 1) {
    whaleFadeIn = Math.min(1, whaleFadeIn + 0.006);
  }

  scrollP = lerp(scrollP, targetP, .05);
  var s = scrollP;

/* ── Gentle bob animation always running ── */
  wGroup.position.y    = Math.sin(t * .65) * .07;
  wGroup.rotation.z    = .06 + Math.sin(t * .45) * .02;
  calfGroup.position.y = -.38 + Math.sin(t * .7 + 1) * .05;

  /* ── S2→S3 transition window ── */
  var SWIM_START = 0.455;
  var SWIM_END   = 0.505;
  var inTransition = (s >= SWIM_START && s <= SWIM_END);

  if (inTransition) {
    var p = (s - SWIM_START) / (SWIM_END - SWIM_START);

    /* Diagonal path: top-right → bottom-left */
    wGroup.position.x = lerp( 2.5, -2.5, p);
    wGroup.position.y = lerp( 1.2, -1.2, p);
    wGroup.position.z = 0;

    /* Fade in first 20%, hold, fade out last 20% */
    var opacity;
    if      (p < 0.2) opacity = p / 0.2;
    else if (p > 0.8) opacity = (1 - p) / 0.2;
    else              opacity = 1;

    wGroup.visible = true;
    wGroup.scale.setScalar(1.8);
    wGroup.rotation.y = Math.PI * 0.5 + 0.3;
    wGroup.rotation.z = -0.08;
    setWhaleOpacity(opacity);
    setCalfOpacity(0);

    cam.position.set(0, 0, 4.5);

  } else {
    /* Outside transition — completely hidden */
    wGroup.visible = false;
    setWhaleOpacity(0);
    setCalfOpacity(0);
    cam.position.set(0, 0, 4.5);
  }

  /* ── Ghost calf in S4 grief section ── */
  var inGrief = (s >= 0.59 && s <= 0.75);
  calfGroup.visible = inGrief;
  if (inGrief) {
    var gp = (s - 0.59) / (0.75 - 0.59);
    calfGroup.position.set(1.2, lerp(-0.38, -0.1, gp), 0.1);
    setCalfOpacity(lerp(0, 0.35, Math.min(gp * 3, 1)));
  }

  /* ── Particles only during transition ── */
  apM.opacity = inTransition
    ? lerp(0, 0.18, Math.min((s - SWIM_START) / (SWIM_END - SWIM_START) * 5, 1))
    : 0;

  renderer.render(scene, cam);
})();

window.addEventListener('resize', function() {
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
