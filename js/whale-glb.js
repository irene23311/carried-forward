/* ============================================================
   whale-glb.js — GLB orca cinematic for Chapter 1
   Carried Forward: The Memory of Whales
   ============================================================ */

(function () {

  /* Fallback safety: if something goes wrong, unlock page after 15s */
  var fallbackTimer = setTimeout(function () {
    cleanup();
    fireDone();
  }, 15000);

  function cleanup() {
    document.body.classList.remove('cinematic-active');
    var s1 = document.getElementById('s1');
    if (s1) s1.classList.remove('cinematic-hold');
    var c = document.getElementById('glb-canvas');
    if (c && c.parentNode) c.parentNode.removeChild(c);
  }

  function fireDone() {
    clearTimeout(fallbackTimer);
    window.dispatchEvent(new CustomEvent('orcaCinematicDone'));
  }

  /* Wait for dive button click */
  window.addEventListener('diveComplete', init);

  function init() {

    /* ── CREATE CANVAS ── */
    var glbCanvas = document.createElement('canvas');
    glbCanvas.id  = 'glb-canvas';
    Object.assign(glbCanvas.style, {
      position:      'fixed',
      top:           '0',
      left:          '0',
      width:         '100%',
      height:        '100%',
      zIndex:        '15',
      pointerEvents: 'none',
      opacity:       '0',
      transition:    'opacity 1s ease',
      background:    'transparent',
    });
    document.body.appendChild(glbCanvas);

    /* ── RENDERER ── */
    var renderer = new THREE.WebGLRenderer({ canvas: glbCanvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    /* ── SCENE + CAMERA ── */
    var scene = new THREE.Scene();
    var cam   = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
    cam.position.set(0, 0.8, 7);
    cam.lookAt(0, 0, 0);

    /* ── LIGHTING ── */
    scene.add(new THREE.AmbientLight(0x001830, 2.0));

    var keyLight = new THREE.PointLight(0x00ffe7, 3.5, 40);
    keyLight.position.set(2, 5, 6);
    scene.add(keyLight);

    var fillLight = new THREE.PointLight(0x003366, 1.2, 30);
    fillLight.position.set(-3, -3, 4);
    scene.add(fillLight);

    var rimLight = new THREE.DirectionalLight(0x00c8b0, 0.6);
    rimLight.position.set(0, 2, -8);
    scene.add(rimLight);

    /* ── CHECK LOADER ── */
    if (!THREE.GLTFLoader) {
      console.warn('whale-glb.js: GLTFLoader missing');
      cleanup();
      fireDone();
      return;
    }

    /* ── LOAD GLB ── */
    var loader = new THREE.GLTFLoader();

    loader.load(
      'assets/models/orca-compressed.glb',

      function onLoad(gltf) {
        var model = gltf.scene;

        /* Center and scale */
        var box    = new THREE.Box3().setFromObject(model);
        var center = box.getCenter(new THREE.Vector3());
        var size   = box.getSize(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z);
        model.position.sub(center);
        model.scale.setScalar(2.8 / maxDim);

        /* Slight cyan tint */
        model.traverse(function (child) {
          if (child.isMesh && child.material && child.material.color) {
            child.material.color.lerp(new THREE.Color(0x00ffe7), 0.06);
            child.material.needsUpdate = true;
          }
        });

        scene.add(model);

        /* Fade canvas in */
        requestAnimationFrame(function () {
          glbCanvas.style.opacity = '1';
        });

        runCinematic(model);
      },

      function onProgress(xhr) {
        if (xhr.lengthComputable)
          console.log('GLB: ' + Math.round(xhr.loaded / xhr.total * 100) + '%');
      },

      function onError(err) {
        console.error('GLB load failed:', err);
        cleanup();
        fireDone();
      }
    );

    /* ── RESIZE ── */
    window.addEventListener('resize', function () {
      cam.aspect = window.innerWidth / window.innerHeight;
      cam.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    /* ════════════════════════════════════════
       CINEMATIC SEQUENCER
       Phase 1 (0-3.2s):   zoom IN toward whale
       Phase 2 (3.2-6s):   slow 360 spin closeup
       Phase 3 (6-8.2s):   zoom OUT + drift to corner
       Phase 4 (8.2-9.4s): fade canvas out
       ════════════════════════════════════════ */
    function runCinematic(model) {

      var startTime = null;
      var doneFired = false;

      var T = {
        zoomInEnd:  3.2,
        spinEnd:    6.0,
        zoomOutEnd: 8.2,
        fadeEnd:    9.4,
      };

      var posStart  = new THREE.Vector3(0,   0.8,  7.0);
      var posClose  = new THREE.Vector3(0,   0.2,  3.8);
      var posCorner = new THREE.Vector3(2.4, -1.0, 6.5);

      function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
      function clamp(t) { return Math.max(0, Math.min(1, t)); }

      function tick(timestamp) {
        if (!startTime) startTime = timestamp;
        var e = (timestamp - startTime) / 1000;

        model.rotation.y += 0.4 / 60;

        if (e < T.zoomInEnd) {
          var p = ease(clamp(e / T.zoomInEnd));
          cam.position.lerpVectors(posStart, posClose, p);

        } else if (e < T.spinEnd) {
          var p    = clamp((e - T.zoomInEnd) / (T.spinEnd - T.zoomInEnd));
          var sway = Math.sin(p * Math.PI * 2) * 0.18;
          cam.position.copy(posClose);
          cam.position.y += sway;
          cam.position.x += Math.sin(p * Math.PI) * 0.25;

        } else if (e < T.zoomOutEnd) {
          var p = ease(clamp((e - T.spinEnd) / (T.zoomOutEnd - T.spinEnd)));
          cam.position.lerpVectors(posClose, posCorner, p);
          model.position.x = THREE.MathUtils.lerp(0,  0.5, p);
          model.position.y = THREE.MathUtils.lerp(0, -0.3, p);

          /* Fire done at 70% so S1 text starts appearing while whale drifts */
          if (p > 0.7 && !doneFired) {
            doneFired = true;
            fireDone();
          }

        } else if (e < T.fadeEnd) {
          var p = clamp((e - T.zoomOutEnd) / (T.fadeEnd - T.zoomOutEnd));
          glbCanvas.style.opacity = String(1 - p);

        } else {
          /* Done — remove canvas */
          glbCanvas.style.opacity = '0';
          setTimeout(function () {
            if (glbCanvas.parentNode) glbCanvas.parentNode.removeChild(glbCanvas);
          }, 400);
          return;
        }

        cam.lookAt(0, 0, 0);
        renderer.render(scene, cam);
        requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    }

  }

})();