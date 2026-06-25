/**
 * Supermercado Santos — RP Services API Config (Template)
 *
 * Este é um arquivo de exemplo. Copie para config.js e preencha
 * com as credenciais fornecidas pela RP Services.
 *
 * ATENCAO: config.js contem credenciais de acesso a API.
 * Nao o versionamento em repositorios publicos.
 *
 * Uso no MikroTik:
 *   1. Copie este arquivo como config.js
 *   2. Edite os valores abaixo com as credenciais fornecidas
 *   3. Envie config.js para /hotspot/js/config.js no roteador
 *   4. As ofertas passam a ser carregadas automaticamente
 */

window.RP_CONFIG = (function () {
    return {
        // URL principal da API RP Services
        baseUrl: 'http://flexapp.grupogmais.com:9000',

        // URL fallback (servidor local na mesma LAN, opcional)
        fallbackUrl: 'http://192.168.1.4:9000',

        // CNPJ da unidade (sem pontuacao)
        unidade: 'SEU_CNPJ_AQUI',

        // Credenciais de autenticacao
        usuario: 'SEU_USUARIO_AQUI',
        senha: 'SUA_SENHA_AQUI'
    };
})();
