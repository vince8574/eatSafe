/**
 * nav-toggle — menu hamburger animé de la barre de navigation.
 *
 * POURQUOI CE FICHIER EXISTE : les styles du hamburger étaient déjà présents
 * (`.nav-toggle`, `.topbar.nav-open .nav`), mais AUCUNE page ne contenait le
 * bouton, et aucun script n'ajoutait la classe `nav-open`. En dessous de 600 px,
 * `.nav` était donc masqué sans aucun moyen de le rouvrir : la navigation était
 * purement et simplement inaccessible sur téléphone — dix liens sur l'accueil.
 *
 * Le bouton est INJECTÉ ici plutôt qu'écrit dans chaque page : il n'existait
 * dans aucun des 51 fichiers HTML, et le dupliquer partout aurait garanti des
 * divergences à la première évolution.
 *
 * Dégradation : la classe `has-toggle`, posée ci-dessous, conditionne le
 * masquage du menu en CSS. Sans JavaScript, elle n'est jamais posée et le menu
 * reste visible — jamais de navigation inatteignable.
 */
(function () {
  'use strict';

  function setup(topbar) {
    if (topbar.querySelector('.nav-toggle')) return;
    var nav = topbar.querySelector('.nav');
    if (!nav) return;

    if (!nav.id) nav.id = 'site-nav';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-toggle';
    btn.setAttribute('aria-label', 'Menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', nav.id);
    btn.innerHTML = '<span></span><span></span><span></span>';

    // Après le menu dans le DOM : en mobile le menu passe en `order: 5` et
    // occupe toute la largeur sous la barre, le bouton reste donc en haut à
    // droite sans qu'on ait à réordonner quoi que ce soit.
    topbar.appendChild(btn);
    topbar.classList.add('has-toggle');

    function setOpen(open) {
      topbar.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!topbar.classList.contains('nav-open'));
    });

    // Refermer après le choix d'un lien : sur une ancre de la même page, la
    // navigation ne recharge rien et le menu resterait ouvert par-dessus la
    // section visée.
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && topbar.classList.contains('nav-open')) {
        setOpen(false);
        btn.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (!topbar.contains(e.target)) setOpen(false);
    });

    // Repasser en écran large avec le menu ouvert laissait la classe posée.
    var wide = window.matchMedia('(min-width: 601px)');
    var onWide = function (ev) { if (ev.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  function init() {
    var bars = document.querySelectorAll('.topbar');
    for (var i = 0; i < bars.length; i++) setup(bars[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
