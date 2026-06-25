window.SantosHero = (function() {

  var heroThemes = [
    { icon: '🙏', title: 'Domingo em Fam\u00EDlia',   desc: 'Momento de reunir quem voc\u00EA ama com ofertas especiais',                 accent: '#E8732A', accentRgb: '232,115,42' },
    { icon: '\uD83D\uDED2', title: 'Segunda do Mercado',   desc: 'Abaste\u00E7a sua despensa com as melhores ofertas da semana',          accent: '#F5A623', accentRgb: '245,166,35', banner: 'img/Banners/segunda.webp' },
    { icon: '\uD83D\uDCB0', title: 'Ter\u00E7a da Economia', desc: 'Pre\u00E7os que cabem no seu bolso \u2014 economia real para voc\u00EA', accent: '#1DAACC', accentRgb: '29,170,204', banner: 'img/Banners/terca.webp' },
    { icon: '\uD83D\uDC1F', title: 'Quarta do Peixe',    desc: 'O frescor do mar na sua mesa \u2014 peixes e frutos do mar selecionados',   accent: '#16a34a', accentRgb: '22,163,74', banner: 'img/Banners/quarta.webp' },
    { icon: '\uD83E\uDD6C', title: 'Quinta Verde',       desc: 'Salada fresca, legumes e verduras selecionados para sua mesa',             accent: '#16a34a', accentRgb: '22,163,74', banner: 'img/Banners/quinta.webp' },
    { icon: '\uD83E\uDD69', title: 'Sexta da Carne',     desc: 'O melhor a\u00E7ougue da cidade \u2014 carnes bovinas, su\u00EDnas e aves', accent: '#C05A18', accentRgb: '192,90,24', banner: 'img/Banners/sexta.webp' },
    { icon: '\uD83C\uDF89', title: 'Sabad\u00E3o Santos',  desc: 'Ofertas imperd\u00EDveis para encher o carrinho e aproveitar o fim de semana', accent: '#E8732A', accentRgb: '232,115,42', banner: 'img/Banners/sabado.webp' }
  ];

  function init() {
    try {
      var container = document.getElementById('hero-dynamic');
      if (!container) return;

      var today = new Date().getDay();
      var theme = heroThemes[today] || heroThemes[0];

      container.className = 'hero-dynamic';

      if (theme.banner) {
        container.classList.add('hero-dynamic--with-banner');
        container.innerHTML =
          '<img src="' + theme.banner + '" alt="' + theme.title + '" class="hero-dynamic__banner-img" onerror="' +
          'this.style.display=\'none\';' +
          'var c=this.closest(\'.hero-dynamic\');if(c){c.classList.remove(\'hero-dynamic--with-banner\');' +
          'c.innerHTML=\'<div class=\\"hero-dynamic__icon-wrap\\" aria-hidden=\\"true\\"><div class=\\"hero-dynamic__icon\\">' + theme.icon + '</div></div>' +
          '<h1 class=\\"hero-dynamic__title\\">' + theme.title + '</h1>' +
          '<p class=\\"hero-dynamic__desc\\">' + theme.desc + '</p>\';' +
          'c.style.setProperty(\'--hero-accent\',\'' + theme.accent + '\');' +
          'c.style.setProperty(\'--hero-accent-rgb\',\'' + theme.accentRgb + '\');' +
          '" />';
      } else {
        container.innerHTML =
          '<div class="hero-dynamic__icon-wrap" aria-hidden="true"><div class="hero-dynamic__icon">' + theme.icon + '</div></div>' +
          '<h1 class="hero-dynamic__title">' + theme.title + '</h1>' +
          '<p class="hero-dynamic__desc">' + theme.desc + '</p>';
      }

      container.style.setProperty('--hero-accent', theme.accent);
      if (theme.accentRgb) {
        container.style.setProperty('--hero-accent-rgb', theme.accentRgb);
      }
    } catch (e) {
      console.warn('[SantosHero] Erro ao renderizar hero:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init: init, themes: heroThemes };

})();
