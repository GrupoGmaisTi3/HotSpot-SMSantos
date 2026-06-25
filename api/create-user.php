<?php
/**
 * API Local PHP - Cadastro de Cliente no MikroTik Hotspot via REST API (RouterOS v7)
 * 
 * Este script sanitiza as entradas, valida o CPF, verifica se o usuário já existe
 * no banco do MikroTik e, se não existir, cria o usuário associando os dados coletados.
 */

// Configura exibição de erros silenciosa para evitar corromper o JSON retornado
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');
error_reporting(E_ALL);

// Define fuso horário padrão para evitar warnings de data
date_default_timezone_set('America/Sao_Paulo');

// Define headers de resposta e CORS
require_once 'config.php';
header("Access-Control-Allow-Origin: " . ALLOWED_ORIGIN);
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

// Trata requisições OPTIONS (preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Bloqueia qualquer método que não seja POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método de requisição não permitido.'
    ]);
    exit;
}

// Obtém e valida os parâmetros enviados
$nome = filter_input(INPUT_POST, 'nome', FILTER_DEFAULT);
$celular = filter_input(INPUT_POST, 'celular', FILTER_DEFAULT);
$cpf = filter_input(INPUT_POST, 'cpf', FILTER_DEFAULT);
$consent = filter_input(INPUT_POST, 'consent', FILTER_VALIDATE_BOOLEAN);

// Sanitização e formatação básica
$nome = trim(strip_tags((string)$nome));
$celular_limpo = preg_replace('/\D/', '', (string)$celular);
$cpf_limpo = preg_replace('/\D/', '', (string)$cpf);

// Validação dos campos obrigatórios
if (empty($nome) || strlen($nome) < 3) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Nome inválido. Digite seu nome completo.'
    ]);
    exit;
}

if (strlen($celular_limpo) < 10 || strlen($celular_limpo) > 11) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Celular inválido. Verifique o DDD e os dígitos.'
    ]);
    exit;
}

if (!validaCPF($cpf_limpo)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'CPF inválido. Verifique os números informados.'
    ]);
    exit;
}

// Configura url base e cabeçalhos do MikroTik REST API
$protocol = MIKROTIK_SSL ? 'https://' : 'http://';
$baseUrl = $protocol . MIKROTIK_HOST . ':' . MIKROTIK_PORT . '/rest';
$authHeader = 'Authorization: Basic ' . base64_encode(MIKROTIK_USER . ':' . MIKROTIK_PASS);

// 1. Verificar se o usuário já existe no MikroTik
$checkUrl = $baseUrl . '/ip/hotspot/user?name=' . urlencode($cpf_limpo);

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $checkUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 6,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        $authHeader
    ],
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'message' => 'Roteador MikroTik offline ou inacessível.'
    ]);
    exit;
}

if ($httpCode === 401) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Falha de autenticação na API REST do MikroTik.'
    ]);
    exit;
}

// Analisa a resposta da busca
error_log("MikroTik GET Response: " . $response);
$users = json_decode($response, true);
if (is_array($users) && count($users) > 0) {
    // Usuário já cadastrado, retorna sucesso para proceder com o auto-login
    echo json_encode([
        'success' => true,
        'message' => 'Usuário já cadastrado no sistema. Conectando...',
        'already_exists' => true
    ]);
    exit;
}

// 2. Se o usuário não existe, efetua a criação
$createUrl = $baseUrl . '/ip/hotspot/user';
$dataHora = date('d/m/Y H:i:s');
$comment = "Nome: {$nome} | Cel: {$celular} | Cad: {$dataHora}";
if ($consent) {
    $comment .= " | LGPD: Sim";
}

$payload = [
    'name' => $cpf_limpo,
    'password' => $cpf_limpo,
    'profile' => MIKROTIK_PROFILE,
    'server' => 'all',
    'comment' => $comment
];

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $createUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'PUT',
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 8,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        $authHeader
    ],
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'message' => 'Falha de comunicação ao criar o usuário no MikroTik.'
    ]);
    exit;
}

// RouterOS retorna 201 Created ou 200 OK em caso de sucesso
if ($httpCode === 200 || $httpCode === 201) {
    echo json_encode([
        'success' => true,
        'message' => 'Cadastro realizado com sucesso! Conectando...'
    ]);
} else {
    // Trata mensagens de erro retornadas pelo RouterOS REST
    error_log("MikroTik CREATE Falhou - HTTP {$httpCode} - Response: {$response}");
    $errorData = json_decode($response, true);
    $errorMsg = isset($errorData['detail']) ? $errorData['detail'] : 'Erro desconhecido no MikroTik RouterOS.';
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao criar usuário: ' . $errorMsg
    ]);
}

/**
 * Função auxiliar para validação matemática de CPF
 */
function validaCPF($cpf) {
    if (empty($cpf)) return false;
    if (strlen($cpf) != 11) return false;
    if (preg_match('/(\d)\1{10}/', $cpf)) return false;

    for ($t = 9; $t < 11; $t++) {
        for ($d = 0, $c = 0; $c < $t; $c++) {
            $d += $cpf[$c] * (($t + 1) - $c);
        }
        $d = ((10 * $d) % 11) % 10;
        if ($cpf[$c] != $d) {
            return false;
        }
    }
    return true;
}
