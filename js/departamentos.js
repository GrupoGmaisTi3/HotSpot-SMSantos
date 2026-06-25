(function () {
  'use strict';

  var DEPARTAMENTOS = [
    { key: 'hortifruti',         nome: 'Hortifr\u00fati',              icone: '\ud83e\udd55',           cor: '#16a34a', desc: 'Frutas, verduras e legumes frescos' },
    { key: 'acougue',            nome: 'A\u00e7ougue',                 icone: '\ud83e\udd69',           cor: '#C05A18', desc: 'Carnes bovinas, su\u00ednas e aves' },
    { key: 'frios',              nome: 'Frios & Latic\u00ednios',       icone: '\ud83e\uddc0',           cor: '#F5A623', desc: 'Queijos, iogurtes e embutidos' },
    { key: 'limpeza',            nome: 'Limpeza',                      icone: '\ud83e\uddf9',          cor: '#1DAACC', desc: 'Produtos de limpeza e higiene' },
    { key: 'congelados',         nome: 'Congelados',                   icone: '\u2744\ufe0f',           cor: '#6366f1', desc: 'Sorvetes, pratos prontos e vegetais' },
    { key: 'bebidas',            nome: 'Bebidas',                      icone: '\ud83e\udd64',           cor: '#7c3aed', desc: 'Refrigerantes, sucos e \u00e1guas' },
    { key: 'matinal',            nome: 'Caf\u00e9 da Manh\u00e3',       icone: '\ud83e\udd5c',          cor: '#92400e', desc: 'P\u00e3es, caf\u00e9, leite e cereais' },
    { key: 'bomboniere',         nome: 'Bomboniere',                   icone: '\ud83c\udf6c',           cor: '#ec4899', desc: 'Doces, chocolates e guloseimas' },
    { key: 'mercearia',          nome: 'Mercearia',                    icone: '\ud83e\uded1',       cor: '#E8732A', desc: 'Arroz, feij\u00e3o, \u00f3leo e b\u00e1sicos' },
    { key: 'padaria',            nome: 'Padaria',                      icone: '\ud83e\uded0',           cor: '#b45309', desc: 'P\u00e3es, bolos e salgados' }
  ];

  var PALAVRAS_CHAVE = {
    'hortifruti': ['hortifruti', 'verdura', 'legume', 'fruta', 'salada', 'verde', 'organico'],
    'acougue': ['acougue', 'carne', 'alcatra', 'picanha', 'maminha', 'contra file', 'costela', 'linguica'],
    'frios': ['frios', 'laticinio', 'queijo', 'iogurte', 'embutido', 'manteiga', 'margarina', 'requeijao'],
    'limpeza': ['limpeza', 'higiene', 'sabao', 'detergente', 'sabonete', 'shampoo', 'desinfetante', 'amaciante', 'agua sanit', 'alvejante', 'multiuso'],
    'congelados': ['congelado', 'sorvete', 'pizza', 'lasanha', 'nugget'],
    'bebidas': ['bebida', 'refrigerante', 'suco', 'cerveja', 'energetico', 'agua mineral', 'isotonic', 'vinho'],
    'matinal': ['cafe', 'leite', 'cereal', 'farinaceo', 'achocolatado', 'aveia', 'granola'],
    'bomboniere': ['bomboniere', 'doce', 'chocolate', 'bala', 'guloseima', 'bolacha', 'biscoito', 'alfajor'],
    'mercearia': ['mercearia', 'arroz', 'feijao', 'oleo', 'farinha', 'molho de tomate', 'conserva', 'lata'],
    'padaria': ['padaria', 'pao', 'bolo', 'salgado', 'torta', 'confeitaria', 'sonho', 'croissant', 'broa']
  };

  var CODIGO_MAP = {
    '001': 'mercearia',      // Alim Basico Pesado (oleo, arroz, feijao)
    '002': 'mercearia',      // Alim Basico Leve (fermento, farinha, macarrao)
    '003': 'mercearia',      // Alim Ind Salgado (salgadinhos, snacks, batata palha)
    '004': 'bomboniere',     // Alim Ind Doce (wafer, chocolate, doces)
    '005': 'matinal',        // Matinal (cafe, leite, achocolatado, cereal)
    '006': 'bomboniere',     // Bomboniere (bala, chiclete, guloseima)
    '007': 'mercearia',      // Light / Diet / Integral / Organico
    '010': 'bebidas',        // Bebida Quente (cafe soluvel, cha, conhaque)
    '011': 'bebidas',        // Bebida Fria (refrigerante, cerveja, energetico)
    '012': 'bebidas',        // Agua / Suco / Cha
    '015': 'limpeza',        // Higiene Pessoal / Perfumaria
    '016': 'limpeza',        // Limpeza
    '017': 'mercearia',      // Pet Shop (racao, petiscos)
    '019': 'mercearia',      // Automotivo (oleo veicular, aditivo)
    '025': 'acougue',        // Acougue
    '026': 'hortifruti',     // Hortifruti
    '027': 'frios',          // Frios
    '028': 'frios',          // Laticinios
    '029': 'congelados',     // Congelados
    '030': 'padaria',        // Padaria
    '032': 'acougue',        // Rotisseria (frango assado, espeto)
    '035': 'mercearia',      // Utilidade Domestica (copos, potes)
    '036': 'mercearia',      // Bazar Geral
    '039': 'limpeza'         // Descartaveis (guardanapo, copo descartavel)
  };

  var EXCECOES = {
    'acougue': {
      palavras: [
        'sazon', 'caldo', 'knorr', 'maggi', 'arisco', 'tempero', 'amaciante de', 'amaciante p',
        'ruffles', 'pringles', 'sensacoes', 'salgadinho', 'baconzitos', 'chips', 'cheetos', 'doritos', 'fandangos',
        'miojo', 'cup noodles', 'instantaneo', 'instantanea', 'lamen',
        'racao', 'caes', 'gatos', 'pedigree', 'whiskas', 'friskies', 'dog chow', 'cat chow',
        'pate', 'sardinha', 'atum', 'conserva', 'caldo de', 'caldo em', 'esfirra ', ' carne'
      ],
      fallbackKey: 'mercearia'
    },
    'limpeza': {
      palavras: [
        'amaciante de carne', 'sabonete de'
      ],
      fallbackKey: 'mercearia'
    },
    'hortifruti': {
      palavras: [
        'geleia ', 'iogurte'
      ],
      fallbackKey: 'mercearia'
    }
  };

  function normalizar(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function identificarDepto(item) {
    var nome = normalizar(((item.nomeProduto || item.Descricao || item.descricaoproduto || '') + ' ' + (item.marca || '')));
    var depto = item._departamento_nome || '';
    var codigo = item._departamento_codigo || '';

    var matchedKey = null;

    // 1. Match direto pelo codigo do departamento vindo da API (mais preciso)
    if (codigo && CODIGO_MAP[codigo]) {
      return CODIGO_MAP[codigo];
    }

    // 2. Match pelo nome do departamento vindo da API (ex: "Açougue" → "acougue")
    if (depto) {
      var deptoNorm = normalizar(depto);
      for (var key in PALAVRAS_CHAVE) {
        if (deptoNorm.indexOf(key) !== -1) {
          matchedKey = key;
          break;
        }
      }
    }

    // 3. Ultimo fallback: match pelo nome do produto
    if (!matchedKey) {
      for (var key2 in PALAVRAS_CHAVE) {
        for (var j = 0; j < PALAVRAS_CHAVE[key2].length; j++) {
          if (nome.indexOf(PALAVRAS_CHAVE[key2][j]) !== -1) {
            matchedKey = key2;
            break;
          }
        }
        if (matchedKey) break;
      }
    }

    // 4. Aplica regras de exceção para evitar falsos positivos (ex: temperos, salgadinhos de picanha, ração sabor carne)
    //    So se aplica quando veio do fallback (passos 2-3), nao quando veio do codigo (passo 1)
    if (matchedKey && EXCECOES[matchedKey]) {
      var ex = EXCECOES[matchedKey];
      for (var i = 0; i < ex.palavras.length; i++) {
        if (nome.indexOf(ex.palavras[i]) !== -1) {
          return ex.fallbackKey;
        }
      }
    }

    return matchedKey;
  }

  window.SantosDeptos = {
    lista: DEPARTAMENTOS,
    palavras: PALAVRAS_CHAVE,
    excecoes: EXCECOES,
    identificar: identificarDepto
  };
})();
