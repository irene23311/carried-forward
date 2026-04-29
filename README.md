# Carried Forward — The Memory of Whales
An information design scrollytelling project.

## Folder structure

```
carried-forward/
│
├── index.html          ← HTML only. No CSS or JS here.
│                         Just structure + links to the files below.
│
├── css/
│   ├── style.css       ← Colors, fonts, cursor, nav, intro, typography.
│   │                     Edit this when changing: colors, fonts, spacing,
│   │                     the intro screen, the nav, animations.
│   │
│   └── sections.css    ← Layout per section (#s1–#s6), data viz components.
│                         Edit this when changing: section grid layouts,
│                         the timeline, dot grid, lifespan bars, pod rings,
│                         the diptych (2018/2024), scroll reveal (.rv).
│
├── js/
│   ├── whale.js        ← All Three.js code. The whale lives here.
│   │                     Edit this when changing: whale shape, glow colors,
│   │                     what the whale does at each scroll position,
│   │                     calf behavior, ambient particles.
│   │
│   ├── scroll.js       ← Scroll event listener and all scroll-triggered logic.
│   │                     Edit this when changing: when reveals happen,
│   │                     bar/ring animation timing, nav active state,
│   │                     path drawing speed.
│   │
│   └── viz.js          ← Data visualizations and UI.
│                         Edit this when changing: family tree nodes/links,
│                         dot grid (which dots are captured/killed),
│                         count-up numbers, cursor behavior,
│                         the dive transition.
│
└── assets/
    ├── videos/         ← Drop your After Effects exports here (.mp4 or .webm)
    │                     Then reference them in index.html with <video> tags.
    │
    └── models/         ← Drop 3D whale model files here (.glb format)
                          Then load them in whale.js with THREE.GLTFLoader.
```

## Script load order (important!)

In index.html the scripts load in this order:
1. `three.min.js`  — the Three.js library itself
2. `whale.js`      — sets up the 3D scene, exposes `window.setScrollProgress()`
3. `scroll.js`     — calls `setScrollProgress()` every time you scroll
4. `viz.js`        — everything else (cursor, dive, family tree, dot grid)

**whale.js must load before scroll.js** because scroll.js calls a function
that whale.js defines. If you swap them the whale won't respond to scroll.

## How to add an AE video

1. Export from After Effects as .mp4 (H.264) or .webm (for transparency)
2. Drop the file into `assets/videos/`
3. In index.html, add inside the relevant section:

```html
<video
  src="assets/videos/your-animation.mp4"
  autoplay muted playsinline loop
  class="ae-video">
</video>
```

4. Style it in sections.css:

```css
.ae-video {
  width: 100%;
  opacity: 0;
  transition: opacity 1s;
}
.ae-video.playing { opacity: 1; }
```

5. Trigger it in scroll.js when the section enters view:

```js
const video = document.querySelector('.ae-video');
const section = document.getElementById('s1');
if (section.getBoundingClientRect().top < innerHeight * .8) {
  video.classList.add('playing');
  video.play();
}
```

## How to add a .glb 3D model

1. Find a model on Sketchfab (filter: Creative Commons, .glb format)
2. Drop the .glb file into `assets/models/`
3. In whale.js, replace the procedural whale with:

```js
const loader = new THREE.GLTFLoader();
loader.load('assets/models/orca.glb', function(gltf) {
  const model = gltf.scene;
  model.scale.setScalar(2);
  scene.add(model);
});
```

Note: GLTFLoader is a Three.js add-on. Add this script tag in index.html
AFTER three.min.js and BEFORE whale.js:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/examples/js/loaders/GLTFLoader.js"></script>
```

## Colors (edit in css/style.css → :root)

| Variable       | Value              | Used for                    |
|----------------|--------------------|-----------------------------|
| --black        | #000000            | Background                  |
| --cyan         | #00ffe7            | All glows, accents, labels  |
| --cyan-mid     | #00c9b8            | Secondary cyan (dimmer)     |
| --white        | #f0fafa            | Headings, bright text       |
| --muted        | rgba(200,240,235,.5)| Body text                  |
| --faint        | rgba(200,240,235,.18)| Captions, small labels    |
| --red          | rgba(220,60,60,.75) | Death, capture, K pod      |
