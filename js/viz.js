/* ============================================================
   viz.js — Data visualizations & UI interactions
   Carried Forward: The Memory of Whales
   ============================================================ */

/* ─────────────────────────────────────────
   CUSTOM CURSOR
───────────────────────────────────────── */
(function initCursor() {
  const dot  = document.getElementById('cur');
  const ring = document.getElementById('cur-ring');
  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
  });

  (function loop() {
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
    rx += (mx - rx) * .13;
    ry += (my - ry) * .13;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(loop);
  })();
})();

/* ─────────────────────────────────────────
   FAMILY TREE (Section 1)
───────────────────────────────────────── */
(function buildFamilyTree() {
  const svg = document.getElementById('ftsvg');
  if (!svg) return;
  const wrap = svg.parentElement;
  if (!wrap) return;

  const nodes = [
    { id: 'J17',  label: 'J17 Duchess†',   x: 210, y: 28,  main: false, dead: true,  title: 'Duchess',    meta: 'Matriarch of the J17 line',             description: 'Mother of Tahlequah, Moby, and Star. Deceased, but still the root of this family line.' },
    { id: 'J35',  label: 'J35 Tahlequah',  x: 95,  y: 108, main: true,  dead: false, title: 'Tahlequah',  meta: 'Adult female, central whale in this story', description: 'Best known for carrying her dead calves in 2018 and again after the loss of J61 in late 2024.' },
    { id: 'J44',  label: 'J44 Moby',       x: 230, y: 108, main: false, dead: false, title: 'Moby',       meta: 'Sibling of Tahlequah',                  description: 'Part of the same matriline descending from Duchess.' },
    { id: 'J46',  label: 'J46 Star',       x: 338, y: 108, main: false, dead: false, title: 'Star',       meta: 'Sibling of Tahlequah',                  description: 'Another living branch of the J17 matriline and parent of J47.' },
    { id: 'J47',  label: 'J47 Notch',      x: 375, y: 188, main: false, dead: false, title: 'Notch',      meta: 'Child of J46 Star',                     description: 'Represents the next generation on Star\'s branch of the family.' },
    { id: 'J53',  label: 'J53 Kiki',       x: 52,  y: 198, main: false, dead: false, title: 'Kiki',       meta: 'Child of Tahlequah',                    description: 'One of Tahlequah\'s living offspring within the J17 matriline.' },
    { id: '2018', label: '2018 calf†',     x: 116, y: 258, main: false, dead: true,  title: '2018 calf',  meta: 'Tahlequah\'s 2018 calf',                description: 'Survived for about 30 minutes after birth. Tahlequah carried the body for 17 days.' },
    { id: 'J57',  label: 'J57 Phoenix',    x: 170, y: 198, main: false, dead: false, title: 'Phoenix',    meta: 'Child of Tahlequah',                    description: 'Another of Tahlequah\'s living offspring in the current family tree.' },
    { id: 'J61',  label: 'J61†',           x: 38,  y: 278, main: false, dead: true,  title: 'J61',        meta: 'Tahlequah\'s 2024 calf',                description: 'Born in December 2024 and confirmed dead, marking another loss in Tahlequah\'s line.' },
  ];

  const links = [
    ['J17','J35'], ['J17','J44'], ['J17','J46'],
    ['J46','J47'],
    ['J35','J53'], ['J35','2018'], ['J35','J57'], ['J35','J61'],
  ];

  const defs   = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filter.setAttribute('id', 'ng');
  const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
  blur.setAttribute('stdDeviation', '3');
  blur.setAttribute('result', 'b');
  const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
  ['b', 'SourceGraphic'].forEach(v => {
    const mn = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mn.setAttribute('in', v);
    merge.appendChild(mn);
  });
  filter.appendChild(blur);
  filter.appendChild(merge);
  defs.appendChild(filter);
  svg.appendChild(defs);

  const tooltip = document.createElement('div');
  tooltip.className = 'ftree-tip';
  tooltip.setAttribute('aria-hidden', 'true');
  wrap.appendChild(tooltip);

  function showTooltip(node) {
    tooltip.innerHTML = `
      <span class="ftree-tip-id">${node.id}</span>
      <h3>${node.title}${node.dead ? ' <span aria-hidden="true">†</span>' : ''}</h3>
      <p class="ftree-tip-meta">${node.meta}</p>
      <p>${node.description}</p>
    `;
    const tipWidth  = tooltip.offsetWidth;
    const tipHeight = tooltip.offsetHeight;
    const pad = 14;
    let left = (node.x / 420) * wrap.clientWidth + 18;
    let top  = (node.y / 310) * wrap.clientHeight - tipHeight / 2;
    if (left + tipWidth > wrap.clientWidth - pad) left = (node.x / 420) * wrap.clientWidth - tipWidth - 18;
    if (top < pad) top = pad;
    if (top + tipHeight > wrap.clientHeight - pad) top = wrap.clientHeight - tipHeight - pad;
    tooltip.style.left = `${left}px`;
    tooltip.style.top  = `${top}px`;
    tooltip.classList.add('is-visible');
    tooltip.setAttribute('aria-hidden', 'false');
  }

  function hideTooltip() {
    tooltip.classList.remove('is-visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  links.forEach(([aId, bId]) => {
    const a    = nodes.find(n => n.id === aId);
    const b    = nodes.find(n => n.id === bId);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${a.x},${a.y} C${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y}`);
    path.setAttribute('stroke', b.dead ? 'rgba(220,60,60,.2)' : 'rgba(0,255,231,.2)');
    path.setAttribute('stroke-width', '1');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);
  });

  nodes.forEach(n => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('ftree-node');
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', `${n.label}. ${n.meta}. ${n.description}`);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', n.x);
    circle.setAttribute('cy', n.y);
    circle.setAttribute('r',  n.main ? 11 : 6);
    circle.setAttribute('fill',         n.dead ? 'none' : (n.main ? 'rgba(0,255,231,.12)' : 'rgba(0,255,231,.07)'));
    circle.setAttribute('stroke',       n.dead ? 'rgba(220,60,60,.6)' : (n.main ? 'var(--cyan)' : 'rgba(0,255,231,.6)'));
    circle.setAttribute('stroke-width', n.main ? '1.5' : '1');
    if (n.main) circle.setAttribute('filter', 'url(#ng)');
    g.appendChild(circle);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', n.x);
    text.setAttribute('y', n.y + (n.main ? 25 : 17));
    text.setAttribute('text-anchor',    'middle');
    text.setAttribute('fill',           n.dead ? 'rgba(220,80,80,.7)' : (n.main ? 'rgba(0,255,231,.9)' : 'rgba(200,240,235,.45)'));
    text.setAttribute('font-size',      n.main ? '9' : '7.5');
    text.setAttribute('font-family',    'DM Sans, sans-serif');
    text.setAttribute('letter-spacing', '0.5');
    text.textContent = n.label;
    g.appendChild(text);

    g.addEventListener('mouseenter', () => showTooltip(n));
    g.addEventListener('focus',      () => showTooltip(n));
    g.addEventListener('mouseleave', hideTooltip);
    g.addEventListener('blur',       hideTooltip);
    svg.appendChild(g);
  });
})();


/* ─────────────────────────────────────────
   PENN COVE DOT GRID (Section 2)
───────────────────────────────────────── */
(function buildDotGrid() {
  const grid = document.getElementById('dgrid');
  if (!grid) return;

  const taken = [3, 7, 12, 18, 24, 29, 35];
  const died  = [5, 15, 27, 40, 55];

  for (let i = 0; i < 80; i++) {
    const dot = document.createElement('div');
    let cls = 'd';
    if (died.includes(i))       cls += ' kl';
    else if (taken.includes(i)) cls += ' tk';
    dot.className = cls;
    dot.style.opacity    = '0';
    dot.style.transform  = 'scale(0)';
    dot.style.transition = `.3s ${i * 15}ms`;
    grid.appendChild(dot);
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        grid.querySelectorAll('.d').forEach(dot => {
          dot.style.opacity   = '1';
          dot.style.transform = 'scale(1)';
        });
        observer.disconnect();
      }
    });
  }, { threshold: .3 });

  observer.observe(grid);
})();


/* ─────────────────────────────────────────
   COUNT-UP ANIMATION
───────────────────────────────────────── */
(function initCountUp() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.count);
      let current  = 0;
      const step   = target / 40;
      const timer  = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = Math.round(current);
        if (current >= target) clearInterval(timer);
      }, 30);
      observer.unobserve(el);
    });
  }, { threshold: .5 });

  document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
})();
