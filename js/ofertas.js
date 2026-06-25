(function () {
  'use strict';

  // ── Configuracao ──────────────────────────────────────────────────
  var CACHE_KEY = '@smsantos_hs_ofertas';
  var CACHE_VALIDADE_HORAS = 4;
  var MAX_OFERTAS = 12;
  var OFERTAS_URL = 'ofertas_export/ofertas_combinado.json';
  var MANIFEST_URL = 'ofertas_export/ofertas_manifest.json';
  var FALLBACK_URL = 'ofertas.json';

  var Logger = window.Logger || console;

  // ── Cache LocalStorage ───────────────────────────────────────────

  function lerCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var payload = JSON.parse(raw);
      if (Date.now() < payload.validade) {
        Logger.debug('offers.cache.valid', 'Cache de ofertas valido', {
          count: payload.dados ? payload.dados.length : 0
        });
        return payload.dados;
      }
      Logger.debug('offers.cache.expired', 'Cache de ofertas expirado');
      localStorage.removeItem(CACHE_KEY);
    } catch (e) {
      Logger.warn('offers.cache.error', 'Erro ao ler cache de ofertas', { error: e.message });
      try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
    }
    return null;
  }

  function salvarCache(dados) {
    try {
      var validade = Date.now() + CACHE_VALIDADE_HORAS * 60 * 60 * 1000;
      localStorage.setItem(CACHE_KEY, JSON.stringify({ dados: dados, validade: validade }));
      Logger.debug('offers.cache.saved', 'Cache de ofertas salvo', {
        count: dados.length,
        expiresIn: CACHE_VALIDADE_HORAS + 'h'
      });
    } catch (e) {
      Logger.warn('offers.cache.saveError', 'Erro ao salvar cache de ofertas', { error: e.message });
    }
  }

  // ── Normalizacao e Mapeamento ─────────────────────────────────────

  function normalizarOferta(item, deptoNome) {
    if (!item) return null;

    var descricao = item.nomeProduto || item.Descricao || item.descricaoproduto || 'Produto';
    var preco = (item.precoAtual != null) ? item.precoAtual : (item.Preco != null ? item.Preco : (item.preco || 0));
    var precoAnterior = (item.precoAnterior != null) ? item.precoAnterior : (item.PrecoNormal > preco ? item.PrecoNormal : 0);
    var marca = item.marca || item.Marca || '';
    var embalagem = item.embalagem || item.TipoEmbalagem || '';

    // Converter para number se for string
    preco = parseFloat(preco) || 0;
    precoAnterior = parseFloat(precoAnterior) || 0;

    var descontoPct = 0;
    if (precoAnterior > 0 && preco > 0) {
      descontoPct = Math.round((1 - preco / precoAnterior) * 100);
    }

    var deptoAmigavel = '';
    var deptoKey = '';
    if (window.SantosDeptos) {
      var key = window.SantosDeptos.identificar({
        nomeProduto: descricao,
        marca: marca,
        _departamento_codigo: item._departamento_codigo || '',
        _departamento_nome: deptoNome || item._departamento_nome || ''
      });
      if (key) {
        deptoKey = key;
        var lista = window.SantosDeptos.lista;
        for (var i = 0; i < lista.length; i++) {
          if (lista[i].key === key) {
            deptoAmigavel = lista[i].nome;
            break;
          }
        }
      }
    }

    if (!deptoAmigavel) {
      deptoAmigavel = deptoNome || item._departamento_nome || 'Geral';
    }

    // Mascarar dados pessoais caso vazem acidentalmente
    var keysToMask = ['cpf', 'cnpj', 'email', 'telefone', 'senha', 'token'];
    for (var k = 0; k < keysToMask.length; k++) {
      if (item[keysToMask[k]]) {
        item[keysToMask[k]] = '***REDACTED***';
      }
    }

    return {
      descricaoproduto: descricao,
      preco: preco,
      precoAnterior: precoAnterior,
      descontoPct: descontoPct,
      marca: marca,
      embalagem: embalagem,
      destacar: (item.destacar === 'S' || item.destacar === 'Sim' || descontoPct >= 15) ? 'S' : 'N',
      departamento: deptoAmigavel,
      deptoKey: deptoKey
    };
  }

  function extrairOfertas(json) {
    if (Array.isArray(json)) return json;
    if (json.ofertas && Array.isArray(json.ofertas)) return json.ofertas;
    if (json.data && Array.isArray(json.data)) return json.data;
    if (json.content && Array.isArray(json.content)) return json.content;
    return [];
  }

  // ── Chamadas API RP Services ──────────────────────────────────────

  async function fetchWithTimeout(url, options, timeoutMs) {
    timeoutMs = timeoutMs || 6000;
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    try {
      var res = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  async function fetchWithFallback(endpoint, options) {
    var config = window.RP_CONFIG;
    if (!config) {
      throw new Error('Configuracao window.RP_CONFIG nao encontrada');
    }

    var urls = [config.baseUrl, config.fallbackUrl];
    var lastError = null;
    var method = (options && options.method) || 'GET';

    for (var i = 0; i < urls.length; i++) {
      var baseUrl = urls[i];
      if (!baseUrl) continue;

      var url = baseUrl + endpoint;
      try {
        Logger.info('offers.api.request', 'Iniciando requisicao API', { url: url, method: method });
        var start = Date.now();
        var res = await fetchWithTimeout(url, options);
        var duration = Date.now() - start;

        if (res.ok) {
          var data = await res.json();
          Logger.info('offers.api.success', 'Requisicao API concluida com sucesso', {
            url: url,
            method: method,
            status: res.status,
            durationMs: duration
          });
          return data;
        }
        var text = await res.text();
        throw new Error('HTTP ' + res.status + ': ' + text);
      } catch (e) {
        if (e.name === 'AbortError') {
          Logger.warn('offers.api.timeout', 'Timeout ao acessar URL da API', { url: url, timeoutMs: 6000 });
        }
        lastError = e;
        Logger.warn('offers.api.fetchError', 'Erro ao acessar URL da API', { url: url, method: method, error: e.message });
      }
    }
    throw lastError || new Error('Todas as conexoes da API falharam');
  }

  async function obterTokenAuth() {
    var config = window.RP_CONFIG;
    if (!config) return null;

    // 1. Tentar ler do cache local
    try {
      var cachedToken = localStorage.getItem('@smsantos_hs_token');
      var cachedExp = localStorage.getItem('@smsantos_hs_token_exp');
      if (cachedToken && cachedExp && Date.now() < parseInt(cachedExp, 10)) {
        Logger.info('token.cache.hit', 'Token de API valido recuperado do cache');
        return cachedToken;
      }
    } catch (e) {
      Logger.warn('token.cache.error', 'Erro ao ler cache do token', { error: e.message });
    }

    // 2. Tentar autenticacao com Retry e Backoff Exponencial
    var attempt = 1;
    var maxRetries = 3;
    var lastError = null;

    while (attempt <= maxRetries) {
      try {
        Logger.info('auth.attempt', 'Tentando autenticar na API RP Services', { attempt: attempt });
        var data = await fetchWithFallback('/v1.1/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario: config.usuario, senha: config.senha })
        });

        var respObj = data.response || data;
        var token = respObj.token;
        var tokenExpiration = respObj.tokenExpiration;

        if (!token) throw new Error('Token nao retornado pela API');

        // Cache do token
        var expMs = tokenExpiration ? new Date(tokenExpiration).getTime() : (Date.now() + 2 * 60 * 60 * 1000);
        try {
          localStorage.setItem('@smsantos_hs_token', token);
          localStorage.setItem('@smsantos_hs_token_exp', expMs.toString());
          Logger.info('auth.success', 'Token obtido e salvo com sucesso');
        } catch (_) {}

        return token;
      } catch (e) {
        lastError = e;
        Logger.warn('auth.retry', 'Autenticacao falhou. Agendando retry...', { attempt: attempt, error: e.message });
        if (attempt < maxRetries) {
          await new Promise(function (r) { setTimeout(r, attempt * 1000); });
        }
        attempt++;
      }
    }

    Logger.error('auth.exhausted', 'Todas as tentativas de autenticacao falharam', { error: lastError.message });
    throw lastError;
  }

  async function buscarOfertasDoServico() {
    var config = window.RP_CONFIG;
    if (!config) throw new Error('Configuracao window.RP_CONFIG indisponivel');

    var token = await obterTokenAuth();
    if (!token) throw new Error('Falha ao autenticar token');

    Logger.info('offers.depto.request', 'Buscando departamentos via API');
    var deptData = await fetchWithFallback('/v1.1/departamentos', {
      headers: { 'token': token, 'Accept': 'application/json' }
    });

    var respObj = deptData.response || deptData;
    var departamentos = respObj.content || [];

    if (departamentos.length === 0) {
      Logger.warn('offers.depto.empty', 'API retornou lista de departamentos vazia');
      return [];
    }

    Logger.info('offers.depto.ok', 'Departamentos carregados', { count: departamentos.length });

    // Selecionar ate 5 favoritos ou os 5 primeiros
    var favoritos = ["hortifruti", "acougue", "limpeza", "frios", "congelados"];
    var selecionados = [];

    departamentos.forEach(function (d) {
      var nomeNorm = (d.descricao || '').toLowerCase();
      if (favoritos.some(function (f) { return nomeNorm.indexOf(f) !== -1; })) {
        selecionados.push(d);
      }
    });

    for (var i = 0; i < departamentos.length && selecionados.length < 5; i++) {
      if (selecionados.indexOf(departamentos[i]) === -1) {
        selecionados.push(departamentos[i]);
      }
    }

    selecionados = selecionados.slice(0, 5);

    // Consulta paralela
    var promises = selecionados.map(function (d) {
      var urlParams = '?unidade=' + config.unidade + '&departamento=' + d.codigo + '&limit=20';
      return fetchWithFallback('/v1.0/produtounidade/ofertas' + urlParams, {
        headers: { 'token': token, 'Accept': 'application/json' }
      })
      .then(function (data) {
        var respObj = data.response || data;
        var items = respObj.content || [];
        items.forEach(function (item) {
          item._departamento_codigo = d.codigo;
          item._departamento_nome = d.descricao;
        });
        return items;
      })
      .catch(function (e) {
        Logger.warn('offers.depto.httpError', 'Erro ao obter ofertas do depto ' + d.descricao, { error: e.message });
        return [];
      });
    });

    var results = await Promise.all(promises);
    var todasOfertas = [];
    results.forEach(function (items) {
      todasOfertas = todasOfertas.concat(items);
    });

    return todasOfertas;
  }

  // ── Fallback Local ────────────────────────────────────────────────

  async function carregarDeIndividuais() {
    Logger.info('offers.fallback.manifest', 'Tentando carregar via manifest + individuais');
    try {
      var manRes = await fetch(MANIFEST_URL + '?t=' + Date.now(), { headers: { 'Accept': 'application/json' } });
      if (!manRes.ok) throw new Error('Manifest HTTP ' + manRes.status);
      var manJson = await manRes.json();
      var deptos = manJson.departamentos || [];
      if (!deptos.length) throw new Error('Manifest vazio');

      Logger.info('offers.fallback.deptos', 'Departamentos no manifest', { count: deptos.length });

      var results = await Promise.all(deptos.map(function (d) {
        var url = 'ofertas_export/ofertas-' + d.codigo + '.json?t=' + Date.now();
        return fetch(url, { headers: { 'Accept': 'application/json' } })
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function (items) {
            var arr = Array.isArray(items) ? items : [];
            arr.forEach(function (item) {
              item._departamento_codigo = d.codigo;
              item._departamento_nome = d.nome;
            });
            return arr;
          })
          .catch(function (e) {
            Logger.warn('offers.fallback.deptoError', 'Falha ao carregar', { codigo: d.codigo, error: e.message });
            return [];
          });
      }));

      var todos = [];
      results.forEach(function (items) { todos = todos.concat(items); });
      Logger.info('offers.fallback.ok', 'Ofertas carregadas de arquivos individuais', { count: todos.length });
      return todos;
    } catch (e) {
      Logger.error('offers.fallback.error', 'Falha ao carregar individuais', { error: e.message });
      return [];
    }
  }

  async function buscarOfertas() {
    var startAll = Date.now();

    var cache = lerCache();
    if (cache && cache.length > 0) {
      Logger.info('offers.cache.hit', 'Ofertas carregadas do cache', { count: cache.length });
      return cache;
    }

    // 1. Tentar arquivo combinado local (mais rapido no hotspot)
    try {
      var url = OFERTAS_URL + '?t=' + Date.now();
      var res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        var json = await res.json();
        var ofertas = extrairOfertas(json);
        if (ofertas.length > 0) {
          var normCombined = ofertas.map(function (item) { return normalizarOferta(item, item._departamento_nome); }).filter(Boolean);
          if (normCombined.length > 0) {
            salvarCache(normCombined);
            Logger.info('offers.fetch.ok', 'Ofertas carregadas do combinado local', {
              count: normCombined.length,
              executionMs: Date.now() - startAll
            });
            return normCombined;
          }
        }
      }
    } catch (e) {
      Logger.warn('offers.fetch.combinadoError', 'Combinado local nao disponivel', { error: e.message });
    }

    // 2. Tentar RP Services API (pode falhar se o cliente nao tem acesso)
    if (window.RP_CONFIG) {
      try {
        var apiOfertas = await buscarOfertasDoServico();
        if (apiOfertas && apiOfertas.length > 0) {
          var normApi = apiOfertas.map(function (item) { return normalizarOferta(item, item._departamento_nome); }).filter(Boolean);
          if (normApi.length > 0) {
            salvarCache(normApi);
            Logger.info('offers.fetch.ok', 'Ofertas carregadas via API RP Services', {
              count: normApi.length,
              executionMs: Date.now() - startAll
            });
            return normApi;
          }
        }
      } catch (e) {
        Logger.warn('offers.fetch.error', 'Conexao com RP API falhou', { error: e.message });
      }
    }

    // 3. Fallback: arquivos individuais via manifest
    var individuais = await carregarDeIndividuais();
    if (individuais.length > 0) {
      var normIndiv = individuais.map(function (item) { return normalizarOferta(item, item._departamento_nome); }).filter(Boolean);
      if (normIndiv.length > 0) {
        salvarCache(normIndiv);
        Logger.info('offers.fetch.ok', 'Ofertas carregadas de individuais', {
          count: normIndiv.length,
          executionMs: Date.now() - startAll
        });
        return normIndiv;
      }
    }

    // 4. Ultimo fallback: ofertas.json raiz
    Logger.info('offers.fetch.finalFallback', 'Tentando ofertas.json raiz');
    try {
      var fbUrl = FALLBACK_URL + '?t=' + Date.now();
      var fbRes = await fetch(fbUrl, { headers: { 'Accept': 'application/json' } });
      if (fbRes.ok) {
        var fbJson = await fbRes.json();
        var fbOfertas = extrairOfertas(fbJson);
        if (fbOfertas.length > 0) {
          var fbNorm = fbOfertas.map(function (item) { return normalizarOferta(item, ''); }).filter(Boolean);
          if (fbNorm.length > 0) {
            Logger.info('offers.fetch.ok', 'Ofertas carregadas de ofertas.json raiz', { count: fbNorm.length });
            return fbNorm;
          }
        }
      }
    } catch (e) {
      Logger.error('offers.fetch.finalError', 'Fallback final falhou', { error: e.message });
    }

    Logger.error('offers.fetch.exhausted', 'Todas as fontes falharam', { executionMs: Date.now() - startAll });
    return [];
  }

  // ── Selecao ───────────────────────────────────────────────────────

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function selecionarDestaque(ofertas, n) {
    n = n || MAX_OFERTAS;
    if (!ofertas || !ofertas.length) return [];
    var destacados = ofertas.filter(function (o) { return o.destacar === 'S'; });
    var restantes = ofertas.filter(function (o) { return o.destacar !== 'S'; });
    return destacados.concat(restantes).slice(0, n);
  }

  // ── Renderizacao ──────────────────────────────────────────────────

  function formatarPreco(preco) {
    return parseFloat(preco).toFixed(2).replace('.', ',');
  }

  function labelEmbalagem(emb) {
    var map = { UN: 'Un.', KG: 'kg', CX: 'Cx.', FD: 'Fd.' };
    return map[emb] || emb || '';
  }

  function inferirCor(descricao) {
    var d = (descricao || '').toLowerCase();
    if (d.indexOf('frango') !== -1 || d.indexOf('carne') !== -1 || d.indexOf('peixe') !== -1) return 'primary';
    if (d.indexOf('leite') !== -1 || d.indexOf('queijo') !== -1 || d.indexOf('iogurte') !== -1) return 'secondary';
    return 'accent';
  }

  function criarCardOferta(oferta) {
    var cor = inferirCor(oferta.descricaoproduto);
    var precoFormatado = formatarPreco(oferta.preco);
    var embalagem = labelEmbalagem(oferta.embalagem);
    var destaque = oferta.destacar === 'S';

    var badgeHtml = '';
    if (destaque) {
      badgeHtml = '<span class="offer-card__badge">DESTAQUE</span>';
    } else if (oferta.descontoPct > 0) {
      badgeHtml = '<span class="offer-card__badge offer-card__badge--off">-' + oferta.descontoPct + '%</span>';
    }

    var badgeWrapper = '<div class="offer-card__badge-wrapper">' + badgeHtml + '</div>';

    var marcaHtml = oferta.marca ? '<div class="offer-card__marca">' + oferta.marca + '</div>' : '';
    var precoAntHtml = '';
    if (oferta.precoAnterior > 0 && oferta.precoAnterior > oferta.preco) {
      precoAntHtml = '<div class="offer-card__old-price">R$ ' + formatarPreco(oferta.precoAnterior) + '</div>';
    }

    return '<div class="offer-card offer-card--' + cor + ' ' + (destaque ? 'offer-card--highlight' : '') + '">'
      + badgeWrapper
      + '<div class="offer-card__product">' + oferta.descricaoproduto + '</div>'
      + marcaHtml
      + precoAntHtml
      + '<div class="offer-card__price">R$ ' + precoFormatado + '</div>'
      + '<div class="offer-card__unit">' + embalagem + '</div>'
      + '</div>';
  }

  function criarSkeleton() {
    var s = '';
    for (var i = 0; i < 4; i++) {
      s += '<div class="offer-card offer-card--skeleton">'
        + '<div class="offer-card__badge-wrapper"></div>'
        + '<div class="skeleton-line skeleton-line--short"></div>'
        + '<div class="skeleton-line skeleton-line--price"></div>'
        + '<div class="skeleton-line skeleton-line--unit"></div>'
        + '</div>';
    }
    return s;
  }

  function renderizarOfertas(ofertas) {
    var container = document.getElementById('offers-container');
    if (!container) {
      Logger.warn('offers.render.noContainer', 'Container #offers-container nao encontrado');
      return;
    }

    if (!ofertas || ofertas.length === 0) {
      container.innerHTML = '<div class="offers-empty"><p>Nenhuma oferta disponível no momento.</p></div>';
      return;
    }

    container.classList.remove('loading');
    container.classList.remove('offers-grid--dept');
    
    var selecionados = selecionarDestaque(shuffleArray(ofertas), MAX_OFERTAS);
    container.innerHTML = selecionados.map(criarCardOferta).join('');

    setTimeout(function () { container.classList.add('loaded'); }, 100);
  }

  // ── Inicializacao ──────────────────────────────────────────────────

  async function init() {
    Logger.info('page.init', 'Inicializando ofertas');

    var container = document.getElementById('offers-container');
    if (!container) {
      Logger.warn('page.init.noContainer', 'Elemento #offers-container nao existe na pagina');
      return;
    }

    container.classList.remove('offers-grid--dept');
    container.innerHTML = criarSkeleton();
    container.classList.add('loading');

    try {
      var ofertas = await buscarOfertas();
      renderizarOfertas(ofertas);

      if (window.SantosDeptos && typeof window.SantosDeptos.renderizarGrid === 'function') {
        window.SantosDeptos.renderizarGrid(ofertas);
      }

      if (ofertas.length > 0) {
        Logger.info('offers.render.ok', 'Ofertas renderizadas com sucesso', { count: ofertas.length });
      } else {
        Logger.warn('offers.render.empty', 'Nenhuma oferta disponivel para renderizar');
      }
    } catch (e) {
      Logger.error('offers.init.error', 'Erro fatal ao inicializar sistema de ofertas', {
        error: e.message,
        stack: e.stack ? e.stack.slice(0, 500) : null
      });
      container.innerHTML = '<p class="offers-error">Ofertas temporariamente indisponíveis</p>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SantosOffers = {
    buscar: buscarOfertas,
    renderizar: renderizarOfertas,
    refresh: init
  };
})();
