/**
 * Supermercado Santos — RP Services API Config (exemplo)
 *
 * Copie este arquivo como config.js e preencha os valores reais.
 * Nao versionar config.js (adicionar em .gitignore).
 */

window.RP_CONFIG = (function () {
    return {
        baseUrl: 'http://flexapp.grupogmais.com:9000',
        fallbackUrl: 'http://192.168.1.4:9000',
        unidade: 'SEU_CNPJ_AQUI',
        usuario: 'SEU_USUARIO',
        senha: 'SUA_SENHA'
    };
})();
