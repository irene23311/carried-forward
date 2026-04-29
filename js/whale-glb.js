/* ============================================================
   whale-glb.js — Scroll-driven GLB orca for Chapter 1
   Carried Forward: The Memory of Whales

   SCROLL MAP (progress = window.scrollY / maxScroll):
     0.00 – 0.08  : whale fades in, slow spin
     0.08 – 0.22  : zoom IN to close-up
     0.22 – 0.38  : zoom OUT, drift to bottom-right corner
     0.38+        : canvas removed, S1 content revealed

   S1 content is hidden (cinematic-hold) until scroll > 0.32,
   at which point it starts fading in while the whale drifts out.
   ============================================================ */

(function () {

  /* ── Safety fallback: if user never scrolls, unlock after 30s ── */
  var fallbackTimer = setTimeout(unlock, 30000);

  function unlock() {
    clearTimeout(fallbackTimer);
    document.body.classList.remove('cinematic-active');
    var s1 = document.getElementById('s1');
    if (s1) s1.classList.remove('cinematic-hold');
    if (window.onScroll) window.onScroll();
  }

  /* ── State ── */
  var glbCanvas   = null;
  var renderer    = null;
  var scene       = null;
  var cam         = null;
  var model       = null;
  var raf         = null;
  var removed     = false;
  var contentShown = false;

  /* Camera anchor positions */
  var POS = {
    start:  { x: 0,   y: 0.8,  z: 7.0 },   // whale first appears
    close:  { x: 0,   y: 0.2,  z: 3.8 },   // zoomed in
    corner: { x: 2.8, y: -1.2, z: 7.0 },   // bottom-right, whale small
  };

  /* Scroll breakpoints */
  var BP = {
    fadeInStart:  0.00,
    fadeInEnd:    0.04,
    zoomInEnd:    0.09,
    zoomOutEnd:   0.13,
    fadeOutEnd:   0.16,   
    contentShow:  0.17,   
    removeAt:     0.18,   // canvas removed from DOM
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(t, lo, hi) { return Math.max(lo, Math.min(hi, t)); }
  function invlerp(a, b, v) { return clamp((v - a) / (b - a), 0, 1); }
  function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  /* ── Wait for dive button ── */
  window.addEventListener('diveComplete', init);

  function init() {

    /* Create canvas */
    glbCanvas = document.createElement('canvas');
    glbCanvas.id = 'glb-canvas';
    Object.assign(glbCanvas.style, {
      position:      'fixed',
      top:           '0',
      left:          '0',
      width:         '100%',
      height:        '100%',
      zIndex:        '15',
      pointerEvents: 'none',
      opacity:       '0',
      background:    'transparent',
    });
    document.body.appendChild(glbCanvas);

    /* Renderer */
    renderer = new THREE.WebGLRenderer({ canvas: glbCanvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    /* Scene + camera */
    scene = new THREE.Scene();
    cam   = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
    cam.position.set(POS.start.x, POS.start.y, POS.start.z);
    cam.lookAt(0, 0, 0);

    /* Lighting */
    scene.add(new THREE.AmbientLight(0x001830, 2.0));
    var key = new THREE.PointLight(0x00ffe7, 3.5, 40);
    key.position.set(2, 5, 6);
    scene.add(key);
    var fill = new THREE.PointLight(0x003366, 1.2, 30);
    fill.position.set(-3, -3, 4);
    scene.add(fill);
    var rim = new THREE.DirectionalLight(0x00c8b0, 0.6);
    rim.position.set(0, 2, -8);
    scene.add(rim);

    /* Slow rotation accumulator */
    var rotY = 0;
    var lastTime = null;

    /* Load GLB */
    if (!THREE.GLTFLoader) {
      console.warn('GLTFLoader not found');
      unlock(); return;
    }

    new THREE.GLTFLoader().load(
      'assets/models/orca-compressed.glb',

      function (gltf) {
        model = gltf.scene;

        /* Center + normalize */
        var box    = new THREE.Box3().setFromObject(model);
        var center = box.getCenter(new THREE.Vector3());
        var size   = box.getSize(new THREE.Vector3());
        model.position.sub(center);
        model.scale.setScalar(2.8 / Math.max(size.x, size.y, size.z));

        /* Slight cyan tint */
        model.traverse(function (child) {
          if (child.isMesh && child.material && child.material.color) {
            child.material.color.lerp(new THREE.Color(0x00ffe7), 0.06);
            child.material.needsUpdate = true;
          }
        });

        scene.add(model);

        /* Start render loop */
        (function loop(ts) {
          raf = requestAnimationFrame(loop);

          /* Delta time for smooth rotation regardless of fps */
          var dt = lastTime ? Math.min((ts - lastTime) / 1000, 0.05) : 0.016;
          lastTime = ts;
          rotY += dt * 0.5; // 0.5 rad/s continuous spin

          updateFromScroll(rotY);
          renderer.render(scene, cam);
        })(0);
      },

      function (xhr) {
        if (xhr.lengthComputable)
          console.log('GLB: ' + Math.round(xhr.loaded / xhr.total * 100) + '%');
      },

      function (err) {
        console.error('GLB failed:', err);
        unlock();
      }
    );

    window.addEventListener('resize', function () {
      cam.aspect = window.innerWidth / window.innerHeight;
      cam.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /* ════════════════════════════════════════
     SCROLL-DRIVEN UPDATE
     Called every frame from the render loop.
     Reads current scroll progress and sets
     camera position + canvas opacity.
     ════════════════════════════════════════ */
  function updateFromScroll(rotY) {
  if (!model) return;

  var scrollTop = window.scrollY;
  var maxScroll = document.body.scrollHeight - window.innerHeight;
  var s = maxScroll > 0 ? scrollTop / maxScroll : 0;

  /* ── Canvas opacity: fade in, hold, fade out ── */
  var opacity;
  if (s < BP.fadeInEnd) {
    opacity = invlerp(BP.fadeInStart, BP.fadeInEnd, s);
  } else if (s < BP.zoomOutEnd) {
    opacity = 1;
  } else if (s < BP.fadeOutEnd) {
    opacity = 1 - invlerp(BP.zoomOutEnd, BP.fadeOutEnd, s);
  } else {
    opacity = 0;
  }
  glbCanvas.style.opacity = String(clamp(opacity, 0, 1));

  /* ── Camera position ── */
  if (s < BP.zoomInEnd) {
    var p = ease(invlerp(BP.fadeInStart, BP.zoomInEnd, s));
    cam.position.set(
      lerp(POS.start.x, POS.close.x, p),
      lerp(POS.start.y, POS.close.y, p),
      lerp(POS.start.z, POS.close.z, p)
    );
    model.position.x = 0;
    model.position.y = 0;

  } else if (s < BP.zoomOutEnd) {
    var p = ease(invlerp(BP.zoomInEnd, BP.zoomOutEnd, s));
    cam.position.set(
      lerp(POS.close.x, POS.corner.x, p),
      lerp(POS.close.y, POS.corner.y, p),
      lerp(POS.close.z, POS.corner.z, p)
    );
    model.position.x = lerp(0, 0.6, p);
    model.position.y = lerp(0, -0.4, p);
  }

  /* ── Continuous rotation ── */
  model.rotation.y = rotY;
  cam.lookAt(0, 0, 0);

  /* ── S1 content: show when scrolled past whale, hide when back ── */
  var s1 = document.getElementById('s1');
  if (s >= BP.contentShow) {
    if (s1) s1.classList.remove('cinematic-hold');
    document.body.classList.remove('cinematic-active');
    if (window.onScroll) window.onScroll();
  } else {
    if (s1) s1.classList.add('cinematic-hold');
  }
}

})();