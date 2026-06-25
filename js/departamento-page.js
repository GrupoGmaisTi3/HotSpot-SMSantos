(function () {
  'use strict';

  var Logger = window.Logger || console;
  var todasOfertas = [];

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return r + ',' + g + ',' + b;
  }

  function formatarPreco(v) {
    return window.SantosUtils
      ? window.SantosUtils.formatarPreco(v)
      : parseFloat(v).toFixed(2).replace('.', ',');
  }

  function inferirCor(descricao) {
    var d = (descricao || '').toLowerCase();
    if (d.indexOf('frango') !== -1 || d.indexOf('carne') !== -1 || d.indexOf('peixe') !== -1) return 'primary';
    if (d.indexOf('leite') !== -1 || d.indexOf('queijo') !== -1 || d.indexOf('iogurte') !== -1) return 'secondary';
    return 'accent';
  }

  function extrairOfertas(json) {
    if (Array.isArray(json)) return json;
    if (json.ofertas && Array.isArray(json.ofertas)) return json.ofertas;
    if (json.data && Array.isArray(json.data)) return json.data;
    if (json.content && Array.isArray(json.content)) return json.content;
    return [];
  }

  function criarCard(item) {
    var nome = item.nomeProduto || item.Descricao || item.descricaoproduto || 'Produto';
    var preco = (item.precoAtual != null) ? item.precoAtual : (item.Preco != null ? item.Preco : (item.preco || 0));
    var ant = (item.precoAnterior != null) ? item.precoAnterior : (item.PrecoNormal > preco ? item.PrecoNormal : 0);
    var marca = item.marca || item.Marca || '';
    var emb = item.embalagem || item.TipoEmbalagem || '';
    var descPct = (ant > 0 && preco > 0) ? Math.round((1 - preco / ant) * 100) : 0;
    var destaque = descPct >= 15;

    var badge = destaque ? '<div class="offer-card__badge-wrapper"><span class="offer-card__badge offer-card__badge--off">-' + descPct + '%</span></div>' : '';
    var marcaHtml = marca ? '<div class="offer-card__marca">' + marca + '</div>' : '';
    var antHtml = (ant > 0 && ant > preco) ? '<div class="offer-card__old-price">R$ ' + formatarPreco(ant) + '</div>' : '';

    var embLabel = 'Un.';
    if (emb) {
      var embUpper = emb.toUpperCase();
      if (embUpper === 'UN') embLabel = 'Un.';
      else if (embUpper === 'KG') embLabel = 'kg';
      else if (embUpper === 'CX') embLabel = 'Cx.';
      else if (embUpper === 'FD') embLabel = 'Fd.';
      else embLabel = emb;
    }

    return '<div class="offer-card offer-card--' + inferirCor(nome) + ' ' + (destaque ? 'offer-card--highlight' : '') + '">'
      + badge
      + '<div class="offer-card__product">' + nome + '</div>'
      + marcaHtml
      + antHtml
      + '<div class="offer-card__price">R$ ' + formatarPreco(preco) + '</div>'
      + '<div class="offer-card__unit">' + embLabel + '</div>'
      + '</div>';
  }

  function ordenar(ofertas, criterio) {
    var copia = ofertas.slice(0);
    switch (criterio) {
      case 'menor':
        copia.sort(function (a, b) {
          var pa = (a.precoAtual != null) ? a.precoAtual : (a.preco || 0);
          var pb = (b.precoAtual != null) ? b.precoAtual : (b.preco || 0);
          return pa - pb;
        });
        break;
      case 'maior':
        copia.sort(function (a, b) {
          var pa = (a.precoAtual != null) ? a.precoAtual : (a.preco || 0);
          var pb = (b.precoAtual != null) ? b.precoAtual : (b.preco || 0);
          return pb - pa;
        });
        break;
      case 'nome':
        copia.sort(function (a, b) {
          var na = (a.nomeProduto || a.Descricao || a.descricaoproduto || '');
          var nb = (b.nomeProduto || b.Descricao || b.descricaoproduto || '');
          return na.localeCompare(nb, 'pt-BR');
        });
        break;
      default:
        copia.sort(function (a, b) {
          var pa = (a.precoAnterior != null) ? a.precoAnterior : (a.PrecoNormal || 0);
          var pb = (b.precoAnterior != null) ? b.precoAnterior : (b.PrecoNormal || 0);
          var ca = (a.precoAtual != null) ? a.precoAtual : (a.preco || 0);
          var cb = (b.precoAtual != null) ? b.precoAtual : (b.preco || 0);
          var da = (pa > 0 && ca > 0) ? (pa - ca) / pa : 0;
          var db = (pb > 0 && cb > 0) ? (pb - cb) / pb : 0;
          return db - da;
        });
    }
    return copia;
  }

  function renderizar(items) {
    var container = document.getElementById('ofertas-container');
    var criterio = document.getElementById('sort-select').value;
    var ordenadas = ordenar(items, criterio);

    document.getElementById('dept-count').textContent = ordenadas.length + ' oferta' + (ordenadas.length !== 1 ? 's' : '');

    if (!ordenadas.length) {
      container.innerHTML = '<div class="offers-empty"><p>Nenhuma oferta encontrada neste departamento.</p></div>';
      return;
    }

    container.innerHTML = ordenadas.map(criarCard).join('');
    container.classList.remove('loaded');
    setTimeout(function () { container.classList.add('loaded'); }, 50);
  }

  function processar(items, deptoKey) {
    var filtradas = items;
    if (deptoKey && window.SantosDeptos) {
      filtradas = items.filter(function (item) {
        return window.SantosDeptos.identificar(item) === deptoKey;
      });
    }

    if (!filtradas.length) {
      var container = document.getElementById('ofertas-container');
      container.innerHTML = '<div class="offers-empty"><p>Nenhuma oferta encontrada neste departamento.</p></div>';
      Logger.info('dept.load.empty', 'Nenhuma oferta para o departamento', { depto: deptoKey });
      return;
    }

    todasOfertas = filtradas;
    renderizar(filtradas);
    Logger.info('dept.load.ok', 'Ofertas carregadas', { count: filtradas.length });
  }

  function carregar(deptoKey) {
    var container = document.getElementById('ofertas-container');
    container.innerHTML = '<div class="offers-empty">Carregando ofertas...</div>';

    Logger.info('dept.load.start', 'Carregando ofertas do depto', { depto: deptoKey });

    // 1. Tentar combinado
    fetch('ofertas_export/ofertas_combinado.json?t=' + Date.now(), { headers: { 'Accept': 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var items = extrairOfertas(data);
        if (items.length) { processar(items, deptoKey); return; }
        throw new Error('vazio');
      })
      .catch(function () {
        // 2. Fallback: individuais via manifest
        Logger.info('dept.load.fallback', 'Combinado nao disponivel, tentando individuais');
        fetch('ofertas_export/ofertas_manifest.json?t=' + Date.now(), { headers: { 'Accept': 'application/json' } })
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function (man) {
            var deptos = man.departamentos || [];
            if (!deptos.length) throw new Error('manifest vazio');
            return Promise.all(deptos.map(function (d) {
              return fetch('ofertas_export/ofertas-' + d.codigo + '.json?t=' + Date.now(), { headers: { 'Accept': 'application/json' } })
                .then(function (r) { return r.json(); })
                .then(function (items) {
                  var arr = Array.isArray(items) ? items : [];
                  arr.forEach(function (item) {
                    item._departamento_codigo = d.codigo;
                    item._departamento_nome = d.nome;
                  });
                  return arr;
                })
                .catch(function () { return []; });
            }));
          })
          .then(function (results) {
            var todos = [];
            results.forEach(function (items) { todos = todos.concat(items); });
            if (todos.length) { processar(todos, deptoKey); return; }
            throw new Error('individuais vazio');
          })
          .catch(function (e) {
            container.innerHTML = '<div class="offers-empty"><p>Ofertas temporariamente indisponíveis.</p><p class="mt-sm" style="font-size:0.8rem;opacity:0.6;">' + e.message + '</p></div>';
            Logger.error('dept.load.error', 'Erro ao carregar ofertas', { error: e.message });
          });
      });
  }

  window.SantosDepartamento = {
    init: function () {
      var params = new URLSearchParams(window.location.search);
      var deptoKey = params.get('depto');
      var deptoInfo = null;

      if (deptoKey && window.SantosDeptos) {
        var todos = window.SantosDeptos.lista;
        for (var i = 0; i < todos.length; i++) {
          if (todos[i].key === deptoKey) { deptoInfo = todos[i]; break; }
        }
      }

      if (deptoInfo) {
        document.getElementById('dept-icon').textContent = deptoInfo.icone;
        document.getElementById('dept-title').textContent = deptoInfo.nome;
        document.getElementById('dept-subtitle').textContent = deptoInfo.desc;
        if (deptoInfo.cor) {
          var rgb = hexToRgb(deptoInfo.cor);
          document.getElementById('dept-header').style.setProperty('--dept-accent', deptoInfo.cor);
          document.getElementById('dept-header').style.setProperty('--dept-accent-rgb', rgb);
          document.getElementById('dept-section').style.setProperty('--dept-accent', deptoInfo.cor);
          document.getElementById('dept-section').style.setProperty('--dept-accent-rgb', rgb);
        }
      }

      document.getElementById('sort-select').addEventListener('change', function () {
        if (todasOfertas.length) renderizar(todasOfertas);
      });

      carregar(deptoKey);
    }
  };
})();
