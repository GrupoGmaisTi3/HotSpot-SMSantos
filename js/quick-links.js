(function () {
  'use strict';

  var SVG_PATHS = {
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    status: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
    back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'
  };

  function render(links) {
    return links.map(function (l) {
      var path = SVG_PATHS[l.icon] || SVG_PATHS.home;
      return '<a href="' + l.href + '" class="quick-link">'
        + '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
        + '<path d="' + path + '"/></svg>'
        + l.label + '</a>';
    }).join('');
  }

  window.SantosQuickLinks = {
    render: render
  };
})();
