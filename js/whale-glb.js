/* ============================================================
   whale-glb.js — GLB orca: explore mode patrol + click to dive
   Carried Forward: The Memory of Whales

   EXPLORE MODE (intro-active):
   - GLB orca patrols a slow circle below the ocean surface
   - User must swim forward and dive down with Q/E to find it
   - Cursor changes to pointer on hover
   - Click fires triggerDive() — orca IS the enter button

   STORY MODE (after dive):
   - Scroll-driven zoom in/out sequence
   ============================================================ */

(function () {

  /* ── State ── */
  var glbCanvas = null;
  var renderer  = null;
  var scene     = null;
  var model     = null;
  var raf       = null;
  var dived     = false;
  var rotY      = 0;
  var lastTime  = null;

  /* Raycaster for hover + click */
  var raycaster = new THREE.Raycaster();
  var mouse     = new THREE.Vector2(-999, -999);
  var hovered   = false;
  var dragged   = false;
  var downX     = 0;
  var downY     = 0;

  /* Patrol circle */
  var PATROL = {
    cx:     0,
    cz:     5,
    radius: 3.5,
    speed:  0.15,
    y:     -0.8,
    angle:  0,
  };

  /* Story scroll breakpoints */
  var BP = {
    fadeInStart: 0.00,
    fadeInEnd:   0.04,
    zoomInEnd:   0.09,
    zoomOutEnd:  0.13,
    fadeOutEnd:  0.16,
    contentShow: 0.17,
  };

  /* Camera positions for story sequence */
  var POS = {
    start:  { x: 0,   y: 0.8,  z: 7.0 },
    close:  { x: 0,   y: 0.2,  z: 3.8 },
    corner: { x: 2.8, y: -1.2, z: 7.0 },
  };

  function lerp(a, b, t)      { return a + (b - a) * t; }
  function clamp(t, lo, hi)   { return Math.max(lo, Math.min(hi, t)); }
  function invlerp(a, b, v)   { return clamp((v - a) / (b - a), 0, 1); }
  function ease(t)             { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  /* ── Delay init one tick so whale.js finishes first ── */
  setTimeout(init, 0);

  /* ════════════════════════════════════════
     INIT
     ════════════════════════════════════════ */
  function init() {

    /* ── Canvas ── */
    glbCanvas = document.createElement('canvas');
    glbCanvas.id = 'glb-canvas';
    Object.assign(glbCanvas.style, {
      position:      'fixed',
      top:           '0',
      left:          '0',
      width:         '100%',
      height:        '100%',
      zIndex:        '5',
      pointerEvents: 'auto',
      opacity:       '1',
      background:    'transparent',
    });
    document.body.appendChild(glbCanvas);

    /* ── Renderer ── */
    renderer = new THREE.WebGLRenderer({ canvas: glbCanvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    /* ── Scene ── */
    scene = new THREE.Scene();

    /* ── Lighting ── */
    scene.add(new THREE.AmbientLight(0x001830, 2.5));
    var key = new THREE.PointLight(0x00ffe7, 4.0, 50);
    key.position.set(2, 6, 8);
    scene.add(key);
    var fill = new THREE.PointLight(0x003366, 1.5, 40);
    fill.position.set(-4, -4, 4);
    scene.add(fill);
    var rim = new THREE.DirectionalLight(0x00c8b0, 0.8);
    rim.position.set(0, 3, -8);
    scene.add(rim);

    /* ── Load GLB ── */
    if (!THREE.GLTFLoader) {
      console.warn('whale-glb.js: GLTFLoader missing');
      return;
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
        model.scale.setScalar(3.4 / Math.max(size.x, size.y, size.z));

        /* Slight cyan tint */
        model.traverse(function (child) {
          if (child.isMesh && child.material && child.material.color) {
            child.material.color.lerp(new THREE.Color(0x00ffe7), 0.08);
            child.material.needsUpdate = true;
          }
        });

        scene.add(model);
        startLoop();
      },

      function (xhr) {
        if (xhr.lengthComputable)
          console.log('GLB: ' + Math.round(xhr.loaded / xhr.total * 100) + '%');
      },

      function (err) {
        console.error('GLB failed:', err);
      }
    );

    /* ── Mouse tracking ── */
    glbCanvas.addEventListener('mousemove', function (e) {
      mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      if (!dived && window.updateExploreDrag) {
        window.updateExploreDrag(e.clientX, e.clientY);
      }
      if (window.isExploreDragging && window.isExploreDragging()) {
        var dx = e.clientX - downX;
        var dy = e.clientY - downY;
        if ((dx * dx + dy * dy) > 16) dragged = true;
      }
    });

    glbCanvas.addEventListener('mousedown', function (e) {
      downX = e.clientX;
      downY = e.clientY;
      dragged = false;
      if (!dived && window.beginExploreDrag) {
        window.beginExploreDrag(e.clientX, e.clientY);
      }
    });

    document.addEventListener('mouseup', function () {
      if (window.endExploreDrag) window.endExploreDrag();
    });

    glbCanvas.addEventListener('click', function () {
      if (dragged) {
        dragged = false;
        return;
      }
      if (hovered && !dived) triggerDive();
    });

    glbCanvas.addEventListener('touchstart', function (e) {
      var touch = e.touches[0];
      downX = touch.clientX;
      downY = touch.clientY;
      dragged = false;
      mouse.x =  (touch.clientX / window.innerWidth)  * 2 - 1;
      mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      if (!dived && window.beginExploreDrag) {
        window.beginExploreDrag(touch.clientX, touch.clientY);
      }
    }, { passive: true });

    glbCanvas.addEventListener('touchmove', function (e) {
      var touch = e.touches[0];
      mouse.x =  (touch.clientX / window.innerWidth)  * 2 - 1;
      mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      if (!dived && window.updateExploreDrag) {
        window.updateExploreDrag(touch.clientX, touch.clientY, 0.6);
      }
      if (window.isExploreDragging && window.isExploreDragging()) {
        var dx = touch.clientX - downX;
        var dy = touch.clientY - downY;
        if ((dx * dx + dy * dy) > 36) dragged = true;
      }
    }, { passive: true });

    document.addEventListener('touchend', function () {
      if (window.endExploreDrag) window.endExploreDrag();
    });

    /* ── Resize ── */
    window.addEventListener('resize', function () {
      var c = window.getExploreCamera ? window.getExploreCamera() : null;
      if (!c) return;
      c.aspect = window.innerWidth / window.innerHeight;
      c.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /* ════════════════════════════════════════
     RENDER LOOP
     ════════════════════════════════════════ */
  function startLoop() {
    (function loop(ts) {
      raf = requestAnimationFrame(loop);

      var dt   = lastTime ? Math.min((ts - lastTime) / 1000, 0.05) : 0.016;
      lastTime = ts;

      var exploreCam = window.getExploreCamera ? window.getExploreCamera() : null;
      if (!exploreCam) return;

      if (!dived) {
        updatePatrol(dt, exploreCam);
        checkHover(exploreCam);
      } else {
        updateStoryScroll(dt, exploreCam);
      }

      if (exploreCam) renderer.render(scene, exploreCam);
    })(0);
  }

  /* ════════════════════════════════════════
     EXPLORE MODE — patrol + hover
     ════════════════════════════════════════ */
  function updatePatrol(dt, exploreCam) {
    if (!model) return;

    PATROL.angle += PATROL.speed * dt;

    var px   = PATROL.cx + Math.cos(PATROL.angle) * PATROL.radius;
    var pz   = PATROL.cz + Math.sin(PATROL.angle) * PATROL.radius;
    var bobY = Math.sin(PATROL.angle * 2.3) * 0.12;

    model.position.set(px, PATROL.y + bobY, pz);

    /* Face direction of travel */
    var tangentAngle = PATROL.angle + Math.PI / 2;
    rotY = lerp(rotY, tangentAngle, 0.05);
    model.rotation.y = rotY;
    model.rotation.z = Math.sin(PATROL.angle) * 0.08;
  }

  function checkHover(exploreCam) {
    if (!model) return;

    raycaster.setFromCamera(mouse, exploreCam);
    var intersects = raycaster.intersectObject(model, true);
    var wasHovered = hovered;
    hovered = intersects.length > 0;

    if (hovered !== wasHovered) {
      glbCanvas.style.cursor = hovered ? 'pointer' : 'grab';

      var hint = document.getElementById('whale-hint');
      if (hint) hint.style.opacity = hovered ? '1' : '0';

      if (model) {
        model.traverse(function (child) {
          if (child.isMesh && child.material && child.material.emissive) {
            child.material.emissive.set(hovered ? 0x00ffe7 : 0x000000);
            child.material.emissiveIntensity = hovered ? 0.3 : 0;
          }
        });
      }
    }
  }

  /* ════════════════════════════════════════
     DIVE TRIGGER
     ════════════════════════════════════════ */
  function triggerDive() {
    dived = true;

    if (window.onDiveStart)  window.onDiveStart();
    if (window.fadeOutOcean) window.fadeOutOcean();

    var flash    = document.getElementById('flash');
    var intro    = document.getElementById('intro');
    var story    = document.getElementById('story');
    var nav      = document.getElementById('nav');
    var hint     = document.getElementById('whale-hint');
    var exHint   = document.getElementById('explore-hint');

    if (flash) {
      flash.classList.add('on');
      setTimeout(function () { flash.classList.remove('on'); }, 1400);
    }

    if (intro) intro.style.opacity = '0';
    if (exHint) exHint.style.opacity = '0';
    if (hint) hint.style.opacity = '0';

    setTimeout(function () {
      if (intro)  intro.classList.add('gone');
      if (exHint) exHint.style.display = 'none';
      if (hint)   hint.style.display   = 'none';
      document.body.classList.remove('intro-active');
      if (story) story.classList.add('on');
      if (nav)   nav.classList.add('on');
      glbCanvas.style.zIndex        = '15';
      glbCanvas.style.pointerEvents = 'none';
    }, 700);

    setTimeout(function () {
      if (model) {
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
      }
      if (window.onScroll) window.onScroll();
    }, 1200);
  }

  /* ════════════════════════════════════════
     STORY MODE — scroll driven
     ════════════════════════════════════════ */
  function updateStoryScroll(dt, storyCam) {
    if (!model || !storyCam) return;

    var scrollTop = window.scrollY;
    var maxScroll = document.body.scrollHeight - window.innerHeight;
    var s = maxScroll > 0 ? scrollTop / maxScroll : 0;

    /* Continuous slow rotation */
    rotY += dt * 0.5;
    model.rotation.y = rotY;

    /* Canvas opacity */
    var opacity;
    if      (s < BP.fadeInEnd)   opacity = invlerp(BP.fadeInStart, BP.fadeInEnd, s);
    else if (s < BP.zoomOutEnd)  opacity = 1;
    else if (s < BP.fadeOutEnd)  opacity = 1 - invlerp(BP.zoomOutEnd, BP.fadeOutEnd, s);
    else                         opacity = 0;
    glbCanvas.style.opacity = String(clamp(opacity, 0, 1));

    /* Camera moves */
    if (s < BP.zoomInEnd) {
      var p = ease(invlerp(BP.fadeInStart, BP.zoomInEnd, s));
      storyCam.position.set(
        lerp(POS.start.x, POS.close.x, p),
        lerp(POS.start.y, POS.close.y, p),
        lerp(POS.start.z, POS.close.z, p)
      );
      model.position.set(0, 0, 0);
    } else if (s < BP.zoomOutEnd) {
      var p = ease(invlerp(BP.zoomInEnd, BP.zoomOutEnd, s));
      storyCam.position.set(
        lerp(POS.close.x, POS.corner.x, p),
        lerp(POS.close.y, POS.corner.y, p),
        lerp(POS.close.z, POS.corner.z, p)
      );
      model.position.x = lerp(0,  0.6, p);
      model.position.y = lerp(0, -0.4, p);
    }

    storyCam.lookAt(model.position);

    /* Reveal S1 content */
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
