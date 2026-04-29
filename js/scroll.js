/* ============================================================
   scroll.js — Scroll progress, reveal animations, nav state
   Carried Forward: The Memory of Whales

   HOW IT WORKS:
   - Listens to window scroll events
   - Calculates 0–1 progress and sends it to whale.js
   - Triggers .rv reveals, timeline stagger, bar/ring animations
   - Updates nav active state
   ============================================================ */

function onScroll() {

  /* ── Scroll progress (0 = top, 1 = bottom) ── */
  const scrollTop = window.scrollY;
  const maxScroll = document.body.scrollHeight - innerHeight;
  const progress  = scrollTop / maxScroll;

  // Send to whale.js (defined in whale.js as window.setScrollProgress)
  if (window.setScrollProgress) window.setScrollProgress(progress);

  // Update progress bar
  document.getElementById('prog').style.width = (progress * 100) + '%';

  /* ── Scroll reveal (.rv elements) ──
     Any element with class .rv becomes visible
     when it enters the bottom 87% of the viewport */
  document.querySelectorAll('.rv').forEach(el => {
    if (el.getBoundingClientRect().top < innerHeight * .87)
      el.classList.add('on');
  });

  /* ── Timeline items (staggered)
     Each item delays slightly more than the last
     so they appear one after another */
  document.querySelectorAll('.tl-item').forEach((el, i) => {
    if (el.getBoundingClientRect().top < innerHeight * .88)
      setTimeout(() => el.classList.add('on'), i * 90);
  });

  /* ── Nav active state ──
     Whichever section is currently centered
     in the viewport gets its nav link highlighted */
  ['s1','s2','s3','s4','s5','s6'].forEach(id => {
    const section = document.getElementById(id);
    const link    = document.querySelector(`[data-s="${id}"]`);
    if (!section || !link) return;
    const r = section.getBoundingClientRect();
    if (r.top <= innerHeight * .5 && r.bottom >= innerHeight * .5)
      link.classList.add('on');
    else
      link.classList.remove('on');
  });

  /* ── Lifespan bars (Section 3) ──
     Bars animate from 0 to their data-w width
     when Section 3 scrolls into view */
  const lbars = document.getElementById('lbars');
  if (lbars && lbars.getBoundingClientRect().top < innerHeight * .8) {
    lbars.querySelectorAll('.lbar-fi').forEach(bar => {
      bar.style.width = bar.dataset.w + '%';
    });
  }

  /* ── Pod population rings (Section 5) ──
     SVG circles fill in proportion to each
     pod's share of total population (74) */
  const s5 = document.getElementById('s5');
  if (s5 && s5.getBoundingClientRect().top < innerHeight * .7) {
    const p = Math.min(1,
      (innerHeight * .7 - s5.getBoundingClientRect().top) / (innerHeight * .5)
    );
    [
      { id: 'jr', circumference: 232, count: 27, total: 74 },
      { id: 'kr', circumference: 182, count: 14, total: 74 },
      { id: 'lr', circumference: 270, count: 33, total: 74 }
    ].forEach(pod => {
      const el = document.getElementById(pod.id);
      if (el) el.style.strokeDashoffset =
        pod.circumference * (1 - (pod.count / pod.total) * p);
    });
  }

  /* ── Tahlequah journey path (Section 4) ──
     SVG path draws itself as the journey map
     enters the viewport */
  const jp = document.getElementById('jp');
  const jmap = document.querySelector('.jmap');
  if (jp && jmap) {
    const pathLength = jp.getTotalLength();
    const r = jmap.getBoundingClientRect();
    const start = innerHeight * .9;
    const end = innerHeight * .38;
    const p = Math.max(0, Math.min(1, (start - r.top) / (start - end)));

    jp.style.strokeDasharray = pathLength;
    jp.style.strokeDashoffset = pathLength * (1 - p);
  }
}

window.addEventListener('scroll', onScroll);
onScroll(); // run once on load to set initial state
