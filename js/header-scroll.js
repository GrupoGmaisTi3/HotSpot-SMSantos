window.SantosHeader = (function() {

  var header, logo, ticking = false;
  var SCROLL_THRESHOLD = 80;

  function setState(y) {
    if (y > SCROLL_THRESHOLD) {
      header.classList.add('header--scrolled');
      logo.classList.remove('logo--hero');
    } else {
      header.classList.remove('header--scrolled');
      logo.classList.add('logo--hero');
    }
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        setState(window.scrollY);
        ticking = false;
      });
      ticking = true;
    }
  }

  function onResize() {
    setState(window.scrollY);
  }

  function init() {
    header = document.getElementById('site-header');
    logo = document.getElementById('site-logo');
    if (!header || !logo) return;

    setState(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init: init };

})();
