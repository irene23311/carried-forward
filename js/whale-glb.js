/* ============================================================
   whale-glb.js — GLB orca cinematic for Chapter 1
   Carried Forward: The Memory of Whales

   HOW IT WORKS:
   - Loads assets/models/orca-compressed.glb into its OWN
     separate renderer/scene so it never conflicts with whale.js
   - Plays a 3-phase cinematic before S1 content appears:
       Phase 1 (0-2.5s)  : fade in, slow spin, zoom IN
       Phase 2 (2.5-5.5s): full 360° rotation showcase
       Phase 3 (5.5-8s)  : zoom OUT + drift to bottom-right corner
   - After phase 3: fires 'orcaCinematicDone' event so S1
     content can reveal itself, scrolling is re-enabled,
     and the GLB canvas fades out gracefully
   - The GLB canvas sits ABOVE the Three.js ocean canvas
     only during the cinematic, then is removed from DOM
   ============================================================ */

(function () {

  /* ── Only run when dive is complete (intro dismissed) ── */
  window.addEventListener('diveComplete', init);

  function init() {

    /* ─── 1. CREATE DEDICATED CANVAS ─── */
    var glbCanvas = document.createElement('canvas');
    glbCanvas.id  = 'glb-canvas';
    glbCanvas.style.cssText = [
      'position:fixed',
      'inset:0',
      'width:100%',
      'height:100%',
      'z-index:15',          // above #tc (z:1) and #story (z:10)
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 1.2s ease',
      'background:transparent',
    ].join(';');
    document.body.appendChild(glbCanvas);

    /* ─── 2. RENDERER ─── */
    var renderer = new THREE.WebGLRenderer({
      canvas:    glbCanvas,
      antialias: true,
      alpha:     true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping    = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    /* ─── 3. SCENE + CAMERA ─── */
    var scene = new THREE.Scene();
    var cam   = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 200);
    cam.position.set(0, 0.8, 7);
    cam.lookAt(0, 0, 0);

    /* ─── 4. LIGHTING — matches your cyan palette ─── */

    // Soft ambient (deep ocean blue)
    scene.add(new THREE.AmbientLight(0x001830, 2.0));

    // Main cyan key light from above-front
    var keyLight = new THREE.PointLight(0x00ffe7, 3.5, 40);
    keyLight.position.set(2, 5, 6);
    scene.add(keyLight);

    // Dim blue fill from below (subsurface feel)
    var fillLight = new THREE.PointLight(0x003366, 1.2, 30);
    fillLight.position.set(-3, -3, 4);
    scene.add(fillLight);

    // Rim light from behind (silhouette pop)
    var rimLight = new THREE.DirectionalLight(0x00c8b0, 0.6);
    rimLight.position.set(0, 2, -8);
    scene.add(rimLight);

    /* ─── 5. LOAD GLB ─── */
    // THREE.GLTFLoader is bundled separately — loaded via CDN in HTML
    if (!window.THREE || !THREE.GLTFLoader) {
      console.warn('whale-glb.js: THREE.GLTFLoader not found. Load the CDN script before whale-glb.js.');
      return;
    }

    var loader = new THREE.GLTFLoader();
    loader.load(
      'assets/models/orca-compressed.glb',

      /* onLoad */
      function (gltf) {

        var model = gltf.scene;

        /* ── Auto-center and normalize scale ── */
        var box    = new THREE.Box3().setFromObject(model);
        var center = box.getCenter(new THREE.Vector3());
        var size   = box.getSize(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z);
        var scale  = 2.8 / maxDim;   // normalize to ~2.8 units

        model.position.sub(center);  // center at origin
        model.scale.setScalar(scale);

        /* ── Tint materials slightly toward cyan ── */
        model.traverse(function (child) {
          if (child.isMesh && child.material) {
            // Works on both MeshStandardMaterial and MeshPhongMaterial
            if (child.material.color) {
              child.material.color.lerp(new THREE.Color(0x00ffe7), 0.06);
            }
            child.material.needsUpdate = true;
          }
        });

        scene.add(model);

        /* ── Fade canvas in ── */
        requestAnimationFrame(function () {
          glbCanvas.style.opacity = '1';
        });

        /* ── Kick off cinematic ── */
        runCinematic(model, glbCanvas, renderer, scene, cam);
      },

      /* onProgress */
      function (xhr) {
        if (xhr.lengthComputable) {
          var pct = Math.round(xhr.loaded / xhr.total * 100);
          console.log('GLB: ' + pct + '%');
        }
      },

      /* onError */
      function (err) {
        console.error('whale-glb.js: failed to load GLB —', err);
        // Gracefully skip — fire done event so page still works
        fireDone();
      }
    );

    /* ─── 6. RESIZE ─── */
    window.addEventListener('resize', function () {
      cam.aspect = innerWidth / innerHeight;
      cam.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
  }

  /* ════════════════════════════════════════
     CINEMATIC SEQUENCER
     Uses a simple elapsed-time state machine.
     No external animation library needed.
     ════════════════════════════════════════ */
  function runCinematic(model, canvas, renderer, scene, cam) {

    var startTime   = null;
    var done        = false;

    /* Cinematic timing (seconds) */
    var T = {
      fadeInEnd:    1.8,   // fade in + first spin starts
      zoomInEnd:    3.2,   // zoom to close-up complete
      spinEnd:      6.0,   // 360° showcase complete
      zoomOutEnd:   8.2,   // zoom out + drift to corner complete
      fadeOutEnd:   9.4,   // canvas faded out — remove from DOM
    };

    /* Camera keyframes */
    var CAM = {
      start:  new THREE.Vector3(0,  0.8,  7.0),   // initial
      close:  new THREE.Vector3(0,  0.2,  3.8),   // zoomed in
      corner: new THREE.Vector3(2.4, -1.0, 6.5),  // bottom-right
    };

    var camTarget    = new THREE.Vector3(0, 0, 0);
    var camTargetEnd = new THREE.Vector3(0.8, -0.4, 0); // drifts with whale

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    function easeOut(t) {
      return 1 - Math.pow(1 - t, 3);
    }
    function clamp01(t) {
      return Math.max(0, Math.min(1, t));
    }
    function lerpV(a, b, t, out) {
      out.lerpVectors(a, b, t);
    }

    function tick(timestamp) {
      if (done) return;

      if (!startTime) startTime = timestamp;
      var elapsed = (timestamp - startTime) / 1000; // seconds

      /* ── Model slow continuous Y rotation ── */
      var baseRotSpeed = 0.4; // rad/s
      model.rotation.y += baseRotSpeed * (1 / 60); // approx 60fps

      /* ── Phase state machine ── */

      if (elapsed < T.zoomInEnd) {
        /* Phase 1: fade in + zoom in */
        var p = clamp01(elapsed / T.zoomInEnd);
        lerpV(CAM.start, CAM.close, easeInOut(p), cam.position);

      } else if (elapsed < T.spinEnd) {
        /* Phase 2: hold close, full rotation showcase */
        // slightly pulse camera for organic feel
        var p    = clamp01((elapsed - T.zoomInEnd) / (T.spinEnd - T.zoomInEnd));
        var sway = Math.sin(p * Math.PI * 2) * 0.18;
        cam.position.copy(CAM.close);
        cam.position.y += sway;
        cam.position.x += Math.sin(p * Math.PI) * 0.25;

      } else if (elapsed < T.zoomOutEnd) {
        /* Phase 3: zoom out + drift bottom-right */
        var p = clamp01((elapsed - T.spinEnd) / (T.zoomOutEnd - T.spinEnd));
        lerpV(CAM.close, CAM.corner, easeInOut(p), cam.position);
        lerpV(camTarget, camTargetEnd, easeOut(p), cam.position);
        // also shift model slightly to give corner composition
        model.position.x = THREE.MathUtils.lerp(0, 0.5, easeInOut(p));
        model.position.y = THREE.MathUtils.lerp(0, -0.3, easeInOut(p));

        /* Fire 'done' event at 70% through this phase
           so S1 text starts revealing while whale is still moving */
        if (p > 0.7 && !done) {
          fireDone();
          done = true;
        }

      } else if (elapsed < T.fadeOutEnd) {
        /* Phase 4: fade canvas out */
        var p = clamp01((elapsed - T.zoomOutEnd) / (T.fadeOutEnd - T.zoomOutEnd));
        canvas.style.opacity = String(1 - p);

      } else {
        /* All done — remove GLB canvas from DOM */
        canvas.style.opacity = '0';
        setTimeout(function () {
          if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        }, 400);
        return; // stop rAF
      }

      cam.lookAt(0, 0, 0);
      renderer.render(scene, cam);
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  /* ── Fire event so scroll.js / viz.js can react ── */
  function fireDone() {
    window.dispatchEvent(new CustomEvent('orcaCinematicDone'));
  }

})();
