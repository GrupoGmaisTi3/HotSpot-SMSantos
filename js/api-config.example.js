/**
 * HotSpot SMSantos — Configuração da API de Cadastro
 *
 * Copie este arquivo como api-config.js e ajuste a URL
 * conforme o IP do servidor na sua LAN.
 *
 * ATENÇÃO: Este arquivo contém o endpoint do backend PHP.
 * Envie para /hotspot/js/api-config.js no MikroTik.
 */

window.HOTSPOT_API = (function () {
    return {
        // URL base do servidor de cadastro
        baseUrl: 'http://192.168.1.246:8899',

        // Endpoint de criação de usuário
        endpoint: '/api/create-user.php'
    };
})();
