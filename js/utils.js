(function () {
  'use strict';

  function fetchWithTimeout(url, options, timeoutMs) {
    timeoutMs = timeoutMs || 6000;
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    return fetch(url, Object.assign({}, options, { signal: controller.signal }))
      .then(function (res) {
        clearTimeout(timer);
        return res;
      })
      .catch(function (e) {
        clearTimeout(timer);
        throw e;
      });
  }

  function formatarPreco(preco) {
    return parseFloat(preco).toFixed(2).replace('.', ',');
  }

  function labelEmbalagem(emb) {
    var map = { UN: 'Un.', KG: 'kg', CX: 'Cx.', FD: 'Fd.' };
    return map[emb] || emb || '';
  }

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  window.SantosUtils = {
    fetchWithTimeout: fetchWithTimeout,
    formatarPreco: formatarPreco,
    labelEmbalagem: labelEmbalagem,
    shuffleArray: shuffleArray
  };
})();
