(function () {
  'use strict';

  function formatarPreco(preco) {
    return parseFloat(preco).toFixed(2).replace('.', ',');
  }

  window.SantosUtils = {
    formatarPreco: formatarPreco
  };
})();
