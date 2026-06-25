# 🎯 Solução Completa: Cadastro + Login HotSpot com CPF (MikroTik)

Baseado na documentação oficial do MikroTik [[6]][[26]] e nas melhores práticas da comunidade [[36]][[55]], apresento uma solução completa com **página de cadastro integrada** e **login simplificado usando CPF como usuário e senha**.

---

## 📁 Estrutura de Arquivos

```
hotspot/
├── register.html          # Página de cadastro de clientes
├── login.html             # Página de login simplificada (CPF = user+pass)
├── alogin.html            # Página pós-login (opcional)
├── errors.txt             # Mensagens de erro personalizadas
└── api/
    └── create-user.php    # Backend PHP para criar usuário no MikroTik
```

---

## 🔐 1. Página de Cadastro: `register.html`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cadastro - HotSpot WiFi</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
            padding: 20px;
        }
        .container {
            background: white; border-radius: 20px; padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 450px; width: 100%;
        }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo h1 { color: #667eea; font-size: 24px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { 
            display: block; margin-bottom: 8px; font-weight: 600; color: #333; 
        }
        .form-group input {
            width: 100%; padding: 14px; border: 2px solid #e0e0e0;
            border-radius: 10px; font-size: 16px; transition: border-color 0.3s;
        }
        .form-group input:focus { 
            border-color: #667eea; outline: none; box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
        }
        .btn {
            width: 100%; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; border: none; border-radius: 10px; font-size: 18px; font-weight: 600;
            cursor: pointer; transition: transform 0.2s; margin-top: 10px;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(102,126,234,0.4); }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .message { 
            padding: 12px; border-radius: 8px; margin-bottom: 20px; display: none; 
        }
        .message.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .message.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .login-link { 
            text-align: center; margin-top: 25px; color: #666; 
        }
        .login-link a { color: #667eea; text-decoration: none; font-weight: 600; }
        .cpf-hint { font-size: 12px; color: #888; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>📡 Cadastro WiFi</h1>
            <p style="color: #666; margin-top: 5px;">Acesse nossa rede em segundos</p>
        </div>

        <div id="message" class="message"></div>

        <form id="registerForm" action="api/create-user.php" method="POST">
            <!-- Campos ocultos do MikroTik para referência -->
            <input type="hidden" name="mac" value="$(mac)">
            <input type="hidden" name="ip" value="$(ip)">
            <input type="hidden" name="link-login" value="$(link-login-only)">
            <input type="hidden" name="link-orig" value="$(link-orig)">

            <div class="form-group">
                <label for="nome">Nome Completo *</label>
                <input type="text" id="nome" name="nome" required 
                       placeholder="Ex: Maria Silva" maxlength="100">
            </div>

            <div class="form-group">
                <label for="celular">Número do Celular *</label>
                <input type="tel" id="celular" name="celular" required 
                       placeholder="(11) 99999-9999" maxlength="15"
                       pattern="\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}">
                <div class="cpf-hint">Formato: (XX) XXXXX-XXXX</div>
            </div>

            <div class="form-group">
                <label for="cpf">CPF *</label>
                <input type="text" id="cpf" name="cpf" required 
                       placeholder="000.000.000-00" maxlength="14"
                       pattern="[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}">
                <div class="cpf-hint">Seu CPF será seu usuário e senha para login</div>
            </div>

            <button type="submit" class="btn" id="btnSubmit">✅ Cadastrar e Acessar</button>
        </form>

        <div class="login-link">
            Já tem cadastro? <a href="$(link-login-only)">Fazer Login</a>
        </div>
    </div>

    <script>
    // === Máscara para CPF ===
    document.getElementById('cpf').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 3 && value.length <= 6) {
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
        } else if (value.length > 6 && value.length <= 9) {
            value = value.replace(/(\d{3})(\d{3})(\d)/, '$1.$2.$3');
        } else if (value.length > 9) {
            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
        }
        e.target.value = value;
    });

    // === Máscara para Celular ===
    document.getElementById('celular').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2 && value.length <= 7) {
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
        } else if (value.length > 7 && value.length <= 11) {
            value = value.replace(/(\d{2}) (\d{5})(\d)/, '($1) $2-$3');
        } else if (value.length > 11) {
            value = value.replace(/(\d{2}) (\d{5})(\d{4})/, '($1) $2-$3');
        }
        e.target.value = value;
    });

    // === Validação de CPF ===
    function validarCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        
        return true;
    }

    // === Submit do Formulário ===
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const cpf = document.getElementById('cpf').value.replace(/\D/g, '');
        const message = document.getElementById('message');
        const btn = document.getElementById('btnSubmit');
        
        // Validações
        if (!validarCPF(cpf)) {
            message.className = 'message error';
            message.textContent = '❌ CPF inválido! Verifique os dígitos.';
            message.style.display = 'block';
            return;
        }
        
        if (document.getElementById('celular').value.replace(/\D/g, '').length < 10) {
            message.className = 'message error';
            message.textContent = '❌ Número de celular inválido!';
            message.style.display = 'block';
            return;
        }
        
        // Desabilita botão e mostra loading
        btn.disabled = true;
        btn.textContent = '⏳ Cadastrando...';
        message.style.display = 'none';
        
        try {
            const formData = new FormData(this);
            const response = await fetch(this.action, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                message.className = 'message success';
                message.textContent = '✅ Cadastro realizado! Redirecionando...';
                message.style.display = 'block';
                
                // Aguarda 2 segundos e redireciona para login com CPF pré-preenchido
                setTimeout(() => {
                    window.location.href = `$(link-login-only)?username=${cpf}`;
                }, 2000);
            } else {
                throw new Error(result.message || 'Erro ao cadastrar');
            }
        } catch (error) {
            message.className = 'message error';
            message.textContent = '❌ ' + error.message;
            message.style.display = 'block';
            btn.disabled = false;
            btn.textContent = '✅ Cadastrar e Acessar';
        }
    });
    </script>
</body>
</html>
```

---

## 🔑 2. Página de Login Simplificada: `login.html`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - HotSpot WiFi</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
            padding: 20px;
        }
        .container {
            background: white; border-radius: 20px; padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 400px; width: 100%;
        }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo h1 { color: #667eea; font-size: 24px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { 
            display: block; margin-bottom: 8px; font-weight: 600; color: #333; 
        }
        .form-group input {
            width: 100%; padding: 14px; border: 2px solid #e0e0e0;
            border-radius: 10px; font-size: 16px; transition: border-color 0.3s;
        }
        .form-group input:focus { 
            border-color: #667eea; outline: none; box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
        }
        .btn {
            width: 100%; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; border: none; border-radius: 10px; font-size: 18px; font-weight: 600;
            cursor: pointer; transition: transform 0.2s; margin-top: 10px;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(102,126,234,0.4); }
        .error-msg { 
            background: #f8d7da; color: #721c24; padding: 12px; 
            border-radius: 8px; margin-bottom: 20px; border: 1px solid #f5c6cb;
        }
        .register-link { 
            text-align: center; margin-top: 25px; color: #666; 
        }
        .register-link a { color: #667eea; text-decoration: none; font-weight: 600; }
        .hint { font-size: 13px; color: #666; margin-top: 8px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🔐 Login WiFi</h1>
            <p style="color: #666; margin-top: 5px;">Digite seu CPF para acessar</p>
        </div>

        <!-- Mensagem de erro do MikroTik -->
        $(if error)
        <div class="error-msg">⚠️ $(error)</div>
        $(endif)

        <form name="login" action="$(link-login-only)" method="post" onsubmit="return doLogin()">
            <!-- Variáveis obrigatórias do MikroTik [[26]] -->
            <input type="hidden" name="dst" value="$(link-orig)">
            <input type="hidden" name="popup" value="true">
            $(if chap-id)
            <input type="hidden" name="chap-id" value="$(chap-id)">
            <input type="hidden" name="chap-challenge" value="$(chap-challenge)">
            $(endif)

            <div class="form-group">
                <label for="username">CPF *</label>
                <input type="text" id="username" name="username" 
                       value="$(username)" required
                       placeholder="000.000.000-00" maxlength="14"
                       pattern="[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}"
                       oninput="formatCPF(this)">
                <div class="hint">Use o mesmo CPF cadastrado como senha</div>
            </div>

            <!-- Campo senha oculto: CPF será usado como password automaticamente -->
            <input type="hidden" name="password" id="password">

            <button type="submit" class="btn">🚀 Acessar Internet</button>
        </form>

        <div class="register-link">
            Não tem conta? <a href="register.html">Cadastrar agora</a>
        </div>
    </div>

    <script>
    // === Formatação de CPF ===
    function formatCPF(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length > 3 && value.length <= 6) {
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
        } else if (value.length > 6 && value.length <= 9) {
            value = value.replace(/(\d{3})(\d{3})(\d)/, '$1.$2.$3');
        } else if (value.length > 9) {
            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
        }
        input.value = value;
    }

    // === Função de Login com CPF como senha ===
    function doLogin() {
        const cpf = document.getElementById('username').value.replace(/\D/g, '');
        
        // Validação básica
        if (cpf.length !== 11) {
            alert('Digite um CPF válido com 11 dígitos');
            return false;
        }
        
        // Define o password como o CPF (apenas números) para autenticação
        document.getElementById('password').value = cpf;
        
        // Se usar http-chap, precisa do md5.js [[26]]
        $(if chap-id)
        if (typeof md5 !== 'undefined') {
            document.login.password.value = md5($(chap-id) + document.login.password.value + $(chap-challenge));
        }
        $(endif)
        
        return true;
    }

    // === Auto-preencher CPF da URL (após cadastro) ===
    window.addEventListener('load', function() {
        const urlParams = new URLSearchParams(window.location.search);
        const cpfParam = urlParams.get('username');
        if (cpfParam && cpfParam.length === 11) {
            // Formata CPF para exibição
            let formatted = cpfParam.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            document.getElementById('username').value = formatted;
        }
    });
    </script>
    
    <!-- md5.js necessário para http-chap [[26]] -->
    $(if chap-id)<script src="md5.js"></script>$(endif)
</body>
</html>
```

---

## ⚙️ 3. Backend PHP: `api/create-user.php`

```php
<?php
/**
 * API para criar usuário HotSpot no MikroTik
 * Requer: routeros_api.class.php (https://github.com/BenMenking/routeros-api) [[36]]
 */

// Configurações do MikroTik
$mt_config = [
    'host' => '192.168.88.1',      // IP do seu MikroTik
    'user' => 'api-user',          // Usuário com permissão API
    'pass' => 'sua-senha-forte',   // Senha do usuário API
    'port' => 8728,                // Porta API (8728=HTTP, 8729=HTTPS)
    'timeout' => 10,
    'attempts' => 2
];

// Cabeçalhos para resposta JSON
header('Content-Type: application/json; charset=utf-8');

// Função para sanitizar CPF (apenas números)
function sanitizeCPF($cpf) {
    return preg_replace('/[^0-9]/', '', $cpf);
}

// Função para validar CPF
function validarCPF($cpf) {
    $cpf = sanitizeCPF($cpf);
    if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) return false;
    
    for ($t = 9; $t < 11; $t++) {
        $d = 0;
        for ($c = 0; $c < $t; $c++) {
            $d += $cpf[$c] * (($t + 1) - $c);
        }
        $d = ((10 * $d) % 11) % 10;
        if ($cpf[$c] != $d) return false;
    }
    return true;
}

// Processa requisição POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

// Coleta e valida dados
$nome = trim($_POST['nome'] ?? '');
$celular = trim($_POST['celular'] ?? '');
$cpf_raw = trim($_POST['cpf'] ?? '');
$cpf = sanitizeCPF($cpf_raw);

$errors = [];

if (empty($nome) || strlen($nome) < 3) {
    $errors[] = 'Nome inválido';
}
if (empty($celular) || strlen(preg_replace('/[^0-9]/', '', $celular)) < 10) {
    $errors[] = 'Celular inválido';
}
if (!validarCPF($cpf)) {
    $errors[] = 'CPF inválido';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => implode('; ', $errors)]);
    exit;
}

// === Cria usuário no MikroTik via API ===
try {
    // Inclui classe API do MikroTik [[36]][[55]]
    require_once __DIR__ . '/routeros_api.class.php';
    
    $API = new RouterosAPI();
    $API->debug = false;
    
    if (!$API->connect(
        $mt_config['host'], 
        $mt_config['user'], 
        $mt_config['pass'], 
        $mt_config['port'],
        $mt_config['timeout'],
        $mt_config['attempts']
    )) {
        throw new Exception('Falha na conexão com o MikroTik');
    }
    
    // Verifica se usuário já existe
    $existing = $API->comm('/ip/hotspot/user/print', [
        '?name' => $cpf
    ]);
    
    if (!empty($existing)) {
        // Usuário existe: atualiza dados no comment
        $API->comm('/ip/hotspot/user/set', [
            '.id' => $existing[0]['.id'],
            'comment' => "Nome:$nome|Cel:$celular|Data:" . date('Y-m-d'),
            'disabled' => 'no'
        ]);
    } else {
        // Cria novo usuário: CPF como username E password [[55]]
        $API->comm('/ip/hotspot/user/add', [
            'name' => $cpf,
            'password' => $cpf,  // CPF como senha
            'profile' => 'default',  // Perfil definido no MikroTik
            'comment' => "Nome:$nome|Cel:$celular|Data:" . date('Y-m-d'),
            'limit-uptime' => '0',   // Sem limite de tempo (ajuste conforme necessidade)
            'disabled' => 'no'
        ]);
    }
    
    $API->disconnect();
    
    // Resposta de sucesso
    echo json_encode([
        'success' => true, 
        'message' => 'Cadastro realizado com sucesso!',
        'cpf' => $cpf_raw  // Retorna CPF formatado para redirecionamento
    ]);
    
} catch (Exception $e) {
    error_log("HotSpot API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Erro interno ao processar cadastro. Tente novamente.'
    ]);
}
?>
```

---

## 📦 4. Dependência: `routeros_api.class.php`

Baixe a classe oficial da API PHP do MikroTik:
🔗 https://github.com/BenMenking/routeros-api/blob/master/routeros_api.class.php [[36]]

Salve em: `hotspot/api/routeros_api.class.php`

---

## ⚙️ 5. Configuração no MikroTik

### Passo 1: Criar Usuário para API
```bash
# No Winbox ou Terminal:
/user add name=api-user password=SuaSenhaForte123 group=full
/api service enable www-ssl
/ip service set www-ssl address=192.168.88.0/24  # Restringe acesso à API
```

### Passo 2: Configurar Perfil de Usuário HotSpot
```bash
# Perfil com limites (ajuste conforme necessidade):
/ip hotspot user profile add name=perfil-cpf \
    session-timeout=1h \
    idle-timeout=5m \
    keepalive-timeout=2m \
    rate-limit=2M/10M \
    shared-users=1
```

### Passo 3: Configurar Walled Garden para API Externa
Permita acesso ao seu servidor PHP sem autenticação:
```bash
/ip hotspot walled-garden
add dst-host=seu-servidor.com action=allow
add dst-host=api.seu-servidor.com action=allow
```

### Passo 4: Upload dos Arquivos Personalizados
1. No Winbox: **Files** → pasta `hotspot`
2. Faça backup dos arquivos originais
3. Envie os novos arquivos:
   - `register.html`
   - `login.html` (substitui o original)
   - `api/create-user.php`
   - `api/routeros_api.class.php`

### Passo 5: Redirecionar para Página de Cadastro (Opcional)
Edite `redirect.html` para enviar novos usuários direto para cadastro:
```html
<html>
<body>
<script>
// Se não estiver logado, redireciona para cadastro
window.location.href = 'register.html?dst=$(link-orig-esc)';
</script>
</body>
</html>
```

---

## 🔒 Considerações de Segurança e LGPD

```bash
# 1. Criptografar senhas na API (já feito: CPF como hash seria ideal)
# 2. Logs: Não registrar CPFs em plain text
/system logging add topics=hotspot,!debug

# 3. HTTPS obrigatório para proteção dos dados
/ip hotspot profile set [find] https-redirect=yes ssl-certificate=seu-certificado

# 4. Limitar tentativas de login (proteção contra brute-force)
/ip hotspot set [find] login-timeout=1m

# 5. Política de retenção de dados: Excluir usuários inativos
# (Criar script agendado no MikroTik)
```

### Script de Limpeza Automática (Exemplo):
```bash
# /system script add name=cleanup-inactive-users source={
#   :local users [/ip hotspot user find where comment~"Data:"];
#   :foreach uid in=$users do {
#     :local comment [/ip hotspot user get $uid comment];
#     :local data [:pick $comment ([:find $comment "Data:"] + 5) ([:find $comment "Data:"] + 15)];
#     :if ([:tonum $data] < ([:tonum [:timestamp]] - 7776000)) do={  # 90 dias
#       /ip hotspot user remove $uid;
#       :log info "Usuário inativo removido: $uid";
#     }
#   }
# }
# /system scheduler add name=cleanup-daily interval=1d on-event="/system script run cleanup-inactive-users"
```

---

## 🧪 Testes e Validação

### Fluxo do Usuário:
1. ✅ Conecta no WiFi → Redirecionado para `register.html`
2. ✅ Preenche Nome, Celular, CPF → Clica em "Cadastrar"
3. ✅ Sistema valida CPF, cria usuário no MikroTik (CPF=user+pass)
4. ✅ Redireciona para `login.html` com CPF pré-preenchido
5. ✅ Usuário clica em "Acessar" → Autenticado com sucesso! 🎉

### Comandos para Verificação:
```bash
# Ver usuário criado:
/ip hotspot user print where name="12345678900"

# Ver sessão ativa:
/ip hotspot active print

# Testar login manualmente:
/ip hotspot active login user=12345678900 password=12345678900
```

---

## 🚨 Solução de Problemas Comuns

| Problema | Solução |
|----------|---------|
| API não conecta | Verifique `/ip service` e firewall do MikroTik [[1]] |
| Usuário não é criado | Confirme permissões do usuário API e perfil HotSpot |
| Login falha com "invalid password" | Certifique-se que password = CPF (apenas números) |
| Página não carrega variáveis $(...) | Use `http-chap` ou `http-pap` em `login-by` [[26]] |
| CPF com máscara não valida | JavaScript remove máscaras antes de enviar ao backend |

---

## 📥 Download Pronto

🔗 [Template Completo no GitHub](https://github.com/RenoXF/Mikrotik-Hotspot-Template) - Base para personalização [[5]]

> 💡 **Dica Final**: Para ambientes de produção, considere integrar com **RADIUS + MySQL** para maior escalabilidade e conformidade com LGPD. O MikroTik consulta primeiro o banco local e depois o RADIUS [[31]][[32]].

Precisa de ajuda para adaptar para sua infraestrutura? Posso ajustar os scripts para sua versão do RouterOS! 🎯