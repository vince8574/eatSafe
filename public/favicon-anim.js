/* Favicon animé Numeline : le logo (main + cœur-pomme) « respire » façon
   battement de cœur. Rendu via canvas → data URL (les GIF animés en favicon
   ne sont plus supportés par Chrome/Safari). Léger, throttlé ~18 fps, en pause
   quand l'onglet est caché, et désactivé si l'utilisateur préfère moins
   d'animations. Se dégrade silencieusement : le favicon statique reste. */
(function () {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!document.head || !window.requestAnimationFrame) return;

    var SIZE = 64;
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Lien favicon dédié à l'animation (les liens statiques restent en repli).
    var link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.setAttribute('data-anim', '1');
    document.head.appendChild(link);

    var img = new Image();
    var bg = '#2f3d2b';        // repli ; remplacé par la vraie couleur de fond
    var t = 0, last = 0, running = false;

    // Courbe de battement : deux « thumps » rapprochés puis repos.
    function beat(p) {
      function bump(x, c, w) { return Math.exp(-Math.pow((x - c) / w, 2)); }
      return bump(p, 0.12, 0.05) + 0.55 * bump(p, 0.26, 0.05);
    }

    function draw(ts) {
      if (document.hidden) { running = false; return; }
      running = true;
      if (ts - last >= 55) {          // ~18 fps
        last = ts;
        t = (t + 0.02) % 1;
        var s = 0.84 + 0.14 * beat(t); // échelle 0.84 → ~0.97 (jamais de débord)
        var d = SIZE * s, o = (SIZE - d) / 2;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.drawImage(img, o, o, d, d);
        link.href = canvas.toDataURL('image/png');
      }
      window.requestAnimationFrame(draw);
    }

    function start() {
      if (running || !img.complete || !img.naturalWidth) return;
      // Couleur de fond = pixel du coin du logo (fond vert plein).
      try {
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        var px = ctx.getImageData(1, 1, 1, 1).data;
        bg = 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')';
      } catch (e) { /* CORS/lecture impossible : on garde le repli */ }
      window.requestAnimationFrame(draw);
    }

    img.onload = start;
    img.src = '/icon.png';
    if (img.complete) start();
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) start();
    });
  } catch (e) { /* pas d'animation → favicon statique */ }
})();

/* Menu hamburger sur mobile : injecte un bouton dans chaque .topbar qui ouvre /
   ferme la navigation (.nav). CSS géré dans blog.css et dans le style des pages
   d'accueil. Dégradation silencieuse : sans JS, la nav reste visible. */
(function () {
  function init() {
    var bars = document.querySelectorAll('.topbar');
    for (var i = 0; i < bars.length; i++) {
      (function (bar) {
        var nav = bar.querySelector('.nav');
        if (!nav || bar.querySelector('.nav-toggle')) return;
        var btn = document.createElement('button');
        btn.className = 'nav-toggle';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Menu');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = '<span></span><span></span><span></span>';
        btn.addEventListener('click', function () {
          var open = bar.classList.toggle('nav-open');
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        nav.addEventListener('click', function (e) {
          if (e.target && e.target.tagName === 'A') {
            bar.classList.remove('nav-open');
            btn.setAttribute('aria-expanded', 'false');
          }
        });
        bar.appendChild(btn);
      })(bars[i]);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
