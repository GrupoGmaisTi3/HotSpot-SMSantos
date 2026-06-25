(function () {
  'use strict';

  var LEVELS = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5 };
  var currentLevel = LEVELS[window.LOG_LEVEL] || LEVELS.info;
  var context = window.HS_CONTEXT || {};
  var endpoint = window.LOG_ENDPOINT || null;

  var PII_PATTERN = /^(password|senha|passwd|secret|token|jwt|auth|authorization|cookie|sessionId|session_id|apiKey|api_key|cpf|cnpj|email|phone|telefone|celular|creditCard|cardNumber|cvv|cvc)$/i;

  // Rate limiting: max 1 sendBeacon por nivel a cada 30s
  var rateLimitMap = {};

  function isPII(k) { return PII_PATTERN.test(k); }

  function redact(obj, depth) {
    depth = depth || 0;
    if (depth > 5 || !obj || typeof obj !== 'object') return obj;
    var out = Array.isArray(obj) ? [] : {};
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (isPII(k)) {
        out[k] = '***REDACTED***';
      } else if (typeof obj[k] === 'object' && obj[k] !== null) {
        out[k] = redact(obj[k], depth + 1);
      } else if (typeof obj[k] === 'string' && obj[k].length > 1000) {
        out[k] = obj[k].slice(0, 1000) + '...[truncated]';
      } else {
        out[k] = obj[k];
      }
    }
    return out;
  }

  function buildEntry(level, event, message, extra) {
    var entry = {
      timestamp: new Date().toISOString(),
      level: level,
      event: event,
      message: message,
      userAgent: (navigator.userAgent || '').slice(0, 200),
      url: (location.href || '').slice(0, 500)
    };
    for (var k in context) {
      if (context.hasOwnProperty(k)) entry[k] = context[k];
    }
    if (extra) {
      var safe = redact(extra);
      for (var k2 in safe) {
        if (safe.hasOwnProperty(k2)) entry[k2] = safe[k2];
      }
    }
    return entry;
  }

  function send(entry) {
    var level = entry.level;
    if ((level !== 'error' && level !== 'fatal') || !endpoint) return;

    // Rate limit: max 1 chamada por nivel a cada 30s
    var now = Date.now();
    var last = rateLimitMap[level] || 0;
    if (now - last < 30000) return;
    rateLimitMap[level] = now;

    try {
      var body = JSON.stringify(entry);
      if (body.length < 10000 && navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, body);
      }
    } catch (_) {}
  }

  function log(level, event, message, extra) {
    if (LEVELS[level] < currentLevel) return;
    var fn = level;
    if (fn === 'trace') fn = 'debug';
    var entry = buildEntry(level, event, message, extra);
    if (console[fn]) console[fn](JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
    send(entry);
  }

  window.Logger = {
    trace: function (e, m, x) { log('trace', e, m, x); },
    debug: function (e, m, x) { log('debug', e, m, x); },
    info:  function (e, m, x) { log('info', e, m, x); },
    warn:  function (e, m, x) { log('warn', e, m, x); },
    error: function (e, m, x) { log('error', e, m, x); },
    fatal: function (e, m, x) { log('fatal', e, m, x); },
    setLevel: function (l) { if (LEVELS[l] !== undefined) currentLevel = LEVELS[l]; }
  };

  window.onerror = function (msg, source, line, col, error) {
    window.Logger.fatal('global.error', String(msg), {
      source: source,
      line: line,
      col: col,
      stack: error && error.stack ? String(error.stack).slice(0, 2000) : null
    });
    return true;
  };

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('unhandledrejection', function (e) {
      var r = e.reason;
      window.Logger.error('global.unhandledRejection', 'Promise rejected without catch', {
        reason: r ? (r.message || String(r)) : 'unknown',
        stack: r && r.stack ? String(r.stack).slice(0, 2000) : null
      });
    });
  }
})();
