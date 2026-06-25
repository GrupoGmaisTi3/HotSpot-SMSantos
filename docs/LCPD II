# 🔐 Arquitetura Robusta para Auditoria de Logs - Conformidade com Marco Civil da Internet

Baseado na legislação brasileira e melhores práticas de forense digital, apresento uma solução completa para **controle de logs de auditoria** com capacidade de resposta a requisições judiciais.

---

## 📜 Requisitos Legais Brasileiros

| Obrigação | Base Legal | Prazo | Detalhes |
|-----------|-----------|-------|----------|
| **Guarda de registros de conexão** | Marco Civil da Internet (Lei 12.965/2014, Art. 13) [[45]] | **1 ano mínimo** | IP de origem, porta lógica, timestamp, protocolo |
| **Sigilo dos registros** | Marco Civil, Art. 10, §1º [[48]] | Permanente | Acesso apenas mediante ordem judicial |
| **Proteção de dados pessoais** | LGPD (Lei 13.709/2018) [[35]] | Conforme finalidade | Minimização, segurança, direitos do titular |
| **Cadeia de custódia** | CPP + Lei 13.964/2019 (Pacote Anticrime) [[66]] | Permanente | Rastreabilidade completa da evidência digital |

> ⚠️ **Atenção**: A multa por descumprimento do Marco Civil pode chegar a **10% do faturamento** do provedor [[52]].

---

## 🏗️ Arquitetura Recomendada: Modelo Híbrido

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE WIFI                          │
│              (HotSpot MikroTik ou pfSense)               │
└─────────────────┬───────────────────────────────────────┘
                  │ Logs em tempo real (Syslog/CEF)
                  ▼
┌─────────────────────────────────────────────────────────┐
│              SERVIDOR DE LOGS CENTRALIZADO               │
│  • Graylog / ELK Stack / Loki + Grafana                 │
│  • Armazenamento WORM (imutável)                        │
│  • Criptografia em repouso e em trânsito                │
│  • Backup automatizado com retenção de 1+ ano           │
└─────────────────┬───────────────────────────────────────┘
                  │ API segura para consultas
                  ▼
┌─────────────────────────────────────────────────────────┐
│              PAINEL DE AUDITORIA (Web)                   │
│  • Busca por IP, CPF, MAC, período                       │
│  • Exportação assinada digitalmente                      │
│  • Geração automática de relatório judicial              │
│  • Log de quem acessou os logs (auditoria da auditoria)  │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ Opção 1: MikroTik RouterOS v7+ como Coletor Primário

### Configuração de Logging Avançado

```bash
# 1. Criar ação de log remoto (Syslog/CEF) para servidor central
/system logging action add name=central-audit \
    target=remote \
    remote-address=192.168.100.50 \
    remote-port=514 \
    remote-protocol=tcp \
    remote-log-format=cef \
    syslog-facility=local0 \
    src-address=192.168.88.1

# 2. Criar buffers de memória dedicados para auditoria
/system logging action add name=hotspot-audit \
    target=memory \
    memory-lines=10000 \
    memory-stop-on-full=yes

/system logging action add name=firewall-audit \
    target=memory \
    memory-lines=20000 \
    memory-stop-on-full=yes

# 3. Direcionar tópicos críticos para buffers dedicados
/system logging add topics=hotspot,account,firewall action=hotspot-audit
/system logging add topics=firewall,connection action=firewall-audit

# 4. Enviar tudo para o servidor central (com redundância)
/system logging add topics=hotspot,account,firewall,info action=central-audit
/system logging add topics=error,critical action=central-audit

# 5. Habilitar logging de conexões no firewall (essencial para NAT/CGNAT)
/ip firewall filter add chain=forward action=log log-prefix="CONN:" \
    log-prefix-format=cef connection-state=new disabled=no comment="Audit-New-Connections"

# 6. Logging específico para HotSpot (autenticação)
/ip hotspot set [find] logging=yes
```

### Campos Essenciais para Conformidade com o Marco Civil [[45]][[47]]

| Campo | Como Capturar no MikroTik | Finalidade Legal |
|-------|---------------------------|-----------------|
| `src-address` | `/ip firewall connection print` | IP do cliente na rede local |
| `src-port` | Connection tracking | Porta lógica de origem (obrigatória) [[55]] |
| `dst-address` | Connection tracking | Destino da conexão |
| `protocol` | Connection tracking | TCP/UDP/ICMP |
| `timestamp` | Syslog com CEF (v7.18+) | Data/hora precisa da conexão |
| `user` | HotSpot username (CPF) | Identificação do titular |
| `mac-address` | `/ip hotspot active print` | Identificação do dispositivo |
| `session-id` | HotSpot session ID | Correlação de eventos |

> 📌 **Importante**: Em ambientes com **CGNAT**, é obrigatório guardar também os logs de tradução NAT (IP:porta interno ↔ IP:porta externo) [[50]].

```bash
# Logging de NAT (essencial para CGNAT)
/ip firewall nat add chain=srcnat action=log log-prefix="NAT-OUT:" \
    log-prefix-format=cef out-interface=wan comment="Audit-NAT-Outbound"

/ip firewall nat add chain=dstnat action=log log-prefix="NAT-IN:" \
    log-prefix-format=cef in-interface=wan comment="Audit-NAT-Inbound"
```

---

## 🛡️ Opção 2: pfSense como Gateway de Auditoria (Recomendado para Produção)

### Configuração de Logs no pfSense [[12]][[14]]

1. **Acesse**: `Status > System Logs > Settings`

2. **Configurações Globais Recomendadas**:
```
Log Message Format: syslog (RFC 5424)  ← Timestamps precisos com microssegundos
Forward/Reverse Display: Reverse       ← Mais novo primeiro (facilita análise)
GUI Log Entries: 100                   ← Balance entre performance e visibilidade
Raw Logs: ❌ Desmarcado                ← Logs formatados são mais legíveis
```

3. **Preferências de Logging**:
```
✓ Packets blocked due to IP options
✓ Default Firewall "block" Rules
❌ Default Firewall "pass" Rules        ← Evita volume excessivo
✓ Default "Bogon Networks" Block Rules
✓ Default "Private Networks" Block Rules
✓ Hosts blocked by IDS (se usar Snort/Suricata)
✓ Configuration Changes                 ← Auditoria de alterações
```

4. **Rotação e Retenção**:
```
Log Rotation Size: 50 MiB por arquivo
Log Compression: zstd (melhor custo/benefício)
Log Retention Count: 730                ← ~2 anos com rotação diária
```

5. **Encaminhamento para Servidor Central (Syslog)**:
```
Remote Logging: ✅ Enabled
Remote Syslog Server: 192.168.100.50:514
Protocol: TCP (mais confiável que UDP)
Log Format: RFC 5424
Facility: local0
Include: Firewall, System, DHCP, Captive Portal, NAT
```

### Regras de Firewall para Logging de Conexões

```bash
# Criar alias para rede interna do HotSpot
Firewall > Aliases > Add
Name: HOTSPOT_CLIENTS
Type: Network(s)
Content: 192.168.88.0/24

# Regra de logging para novas conexões (essencial para auditoria)
Firewall > Rules > LAN > Add
Action: Pass
Protocol: Any
Source: HOTSPOT_CLIENTS
Destination: Any
Advanced Options > Log packets that are handled by this rule: ✅
Description: AUDIT-New-Connections-HotSpot

# Regra específica para logging de NAT (se usar 1:1 ou Port Forward)
Firewall > NAT > Outbound > Add
Interface: WAN
Source: HOTSPOT_CLIENTS
Translation Address: Interface Address
Log: ✅
Description: AUDIT-NAT-Outbound
```

---

## 🗄️ Servidor Central de Logs: Graylog (Recomendado) ou ELK Stack

### Por que Graylog para conformidade legal? [[84]][[87]]

| Recurso | Graylog | ELK Stack |
|---------|---------|-----------|
| Interface nativa para auditoria | ✅ Simples e intuitiva | ⚠️ Requer Kibana customizado |
| Alertas embutidos | ✅ Nativos | ⚠️ Requer Watcher (pago) |
| Retenção imutável | ✅ Via lifecycle policies | ✅ Via ILM + snapshot |
| Suporte a CEF/Syslog | ✅ Nativo | ⚠️ Requer Logstash parsing |
| Curva de aprendizado | ✅ Moderada | ⚠️ Alta |
| Custo total | ✅ Open Source + Enterprise opcional | ⚠️ Open Source + recursos pagos |

### Instalação Mínima do Graylog (Docker Compose)

```yaml
# docker-compose.yml para servidor de logs
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
    volumes:
      - es_data:/usr/share/elasticsearch/data
      - ./elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml
    networks:
      - logs-net

  graylog:
    image: graylog/graylog:5.2
    environment:
      - GRAYLOG_HTTP_EXTERNAL_URI=https://logs.seudominio.com/
      - GRAYLOG_ROOT_PASSWORD_SHA2=${GRAYLOG_ROOT_HASH}
      - GRAYLOG_PASSWORD_SECRET=${GRAYLOG_SECRET}
      - GRAYLOG_ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - GRAYLOG_MONGODB_URI=mongodb://mongo:27017/graylog
    volumes:
      - graylog_data:/usr/share/graylog/data
      - ./graylog.conf:/usr/share/graylog/data/config/graylog.conf
    ports:
      - "9000:9000"    # Web interface
      - "1514:1514/udp" # Syslog UDP
      - "1514:1514/tcp" # Syslog TCP
      - "12201:12201/udp" # GELF
    depends_on:
      - elasticsearch
      - mongo
    networks:
      - logs-net

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    networks:
      - logs-net

volumes:
  es_data:
  graylog_data:
  mongo_data:

networks:
  logs-net:
    driver: bridge
```

### Configuração de Input Syslog no Graylog

1. Acesse `System > Inputs`
2. Selecione **Syslog UDP** ou **Syslog TCP**
3. Configure:
```
Node: [seu nó Graylog]
Port: 1514
Bind address: 0.0.0.0
Recv Buffer Size: 262144
Store Full Message: ✅
Allow Override Date: ✅
Time Zone: America/Sao_Paulo
```

### Pipeline para Enriquecimento de Logs (Exemplo)

```javascript
// Pipeline rule: extrair dados do HotSpot MikroTik
rule "parse-mikrotik-hotspot"
when
    to_string($message.source) == "192.168.88.1" AND
    has_field("message") AND
    regex_match(value: to_string($message.message), pattern: "hotspot.*login.*user=")
then
    // Extrair CPF do usuário
    set_field("hotspot_user", grok(value: to_string($message.message), pattern: "user=%{DATA:cpf}"));
    
    // Extrair MAC address
    set_field("device_mac", grok(value: to_string($message.message), pattern: "mac=%{MAC:mac}"));
    
    // Classificar como evento de auditoria
    set_field("audit_event_type", "hotspot_authentication");
    
    // Adicionar metadados para conformidade
    set_field("data_retention_days", 365);
    set_field("legal_hold_eligible", true);
end
```

---

## 🔒 Armazenamento Imutável (WORM) para Integridade Legal

### Por que WORM é essencial? [[36]][[37]][[42]]

> *"Immutable Logs are log files that cannot be altered or deleted, ensuring a tamper-proof record of system activities for security and compliance purposes."* [[42]]

### Opções de Implementação:

#### Opção A: S3 Object Lock (AWS/MinIO) - Recomendado
```yaml
# Configurar bucket com WORM Compliance no Graylog
# outputs.conf para Elasticsearch/Opensearch
index.worm.enabled: true
index.worm.mode: compliance  # ou governance
index.worm.retention.period: 365d  # 1 ano mínimo + margem
index.worm.legal_hold: auto  # ativar automaticamente em caso de requisição judicial
```

#### Opção B: ZFS com Snapshots Imutáveis
```bash
# Criar dataset ZFS para logs
zfs create tank/logs-audit
zfs set compression=lz4 tank/logs-audit
zfs set atime=off tank/logs-audit

# Habilitar snapshots automáticos (imutáveis por período)
zfs snapshot tank/logs-audit@daily
zfs hold -r judicial-hold tank/logs-audit@daily

# Bloquear exclusão por 365 dias
zfs set com.sun:auto-snapshot:monthly:retain=12 tank/logs-audit
```

#### Opção C: QNAP/NAS com WORM nativo [[74]]
```
Painel do NAS > Armazenamento > Pasta Compartilhada > Criar
Nome: audit-logs
Ativar: "WORM Compliance" ✅
Período de retenção: 365 dias (mínimo legal)
Acesso: Somente leitura para usuários de auditoria
```

---

## ⚖️ Procedimento para Resposta a Requisição Judicial

### Fluxo Padrão (Conforme jurisprudência do STJ) [[53]][[58]]

```
1. Recebimento do Ofício Judicial
   ↓
2. Validação da ordem (juízo competente, fundamentação, prazo)
   ↓
3. Busca nos logs por: IP + porta lógica + período [[55]]
   ↓
4. Correlação: IP público ↔ IP interno ↔ CPF (HotSpot)
   ↓
5. Extração com hash criptográfico (SHA-256) para integridade
   ↓
6. Geração de relatório assinado digitalmente
   ↓
7. Registro da consulta no log de auditoria (quem acessou, quando, por quê)
   ↓
8. Envio dentro do prazo judicial (tipicamente 5-15 dias) [[54]]
```

### Script de Extração Automatizada (Exemplo Bash + Graylog API)

```bash
#!/bin/bash
# extract-judicial-logs.sh
# Uso: ./extract-judicial-logs.sh "2026-01-15" "2026-01-15" "200.100.50.25" "12345" "Oficio_12345.pdf"

set -euo pipefail

# Parâmetros
START_DATE="$1"
END_DATE="$2"
TARGET_IP="$3"
TARGET_PORT="$4"
CASE_REF="$5"

# Configurações
GRAYLOG_API="https://logs.seudominio.com/api"
GRAYLOG_USER="auditor-api"
GRAYLOG_KEY="sua-chave-api-aqui"
OUTPUT_DIR="/var/audit/exports/${CASE_REF}"
mkdir -p "$OUTPUT_DIR"

# 1. Buscar logs no Graylog via API
curl -s -u "${GRAYLOG_USER}:${GRAYLOG_KEY}" \
  -X POST "${GRAYLOG_API}/search/universal/relative" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"source_ip:\\\"${TARGET_IP}\\\" AND src_port:${TARGET_PORT} AND timestamp:[${START_DATE}T00:00:00 TO ${END_DATE}T23:59:59]\",
    \"fields\": [\"timestamp\",\"source_ip\",\"src_port\",\"dst_ip\",\"dst_port\",\"protocol\",\"hotspot_user\",\"device_mac\",\"nat_translation\"],
    \"limit\": 10000,
    \"sort\": \"timestamp:asc\"
  }" > "${OUTPUT_DIR}/raw_logs.json"

# 2. Gerar relatório formatado (PDF/HTML)
python3 /opt/audit-tools/generate_report.py \
  --input "${OUTPUT_DIR}/raw_logs.json" \
  --case-ref "${CASE_REF}" \
  --output "${OUTPUT_DIR}/relatorio_${CASE_REF}.pdf"

# 3. Calcular hash de integridade (chain of custody)
sha256sum "${OUTPUT_DIR}/raw_logs.json" "${OUTPUT_DIR}/relatorio_${CASE_REF}.pdf" \
  > "${OUTPUT_DIR}/checksums.sha256"

# 4. Assinar digitalmente (opcional, mas recomendado)
# gpg --armor --detach-sign --output "${OUTPUT_DIR}/relatorio_${CASE_REF}.pdf.sig" "${OUTPUT_DIR}/relatorio_${CASE_REF}.pdf"

# 5. Registrar acesso no log de auditoria
logger -t judicial-audit "Exportação realizada: caso=${CASE_REF}, ip=${TARGET_IP}, porta=${TARGET_PORT}, operador=${USER}"

# 6. Compactar e preparar para envio
tar -czf "${OUTPUT_DIR}/export_${CASE_REF}.tar.gz" -C "$OUTPUT_DIR" .

echo "✅ Exportação concluída: ${OUTPUT_DIR}/export_${CASE_REF}.tar.gz"
echo "🔐 Hash de integridade: $(cat ${OUTPUT_DIR}/checksums.sha256 | head -1 | cut -d' ' -f1)"
```

### Modelo de Relatório Judicial (Estrutura Mínima)

```markdown
# RELATÓRIO DE AUDITORIA DE CONEXÕES
**Processo/Ofício**: [Número]  
**Data da Requisição**: [DD/MM/AAAA]  
**Prazo de Resposta**: [DD/MM/AAAA]  

## 1. Identificação do Provedor
- Razão Social: [Empresa]
- CNPJ: [00.000.000/0000-00]
- Encarregado de Dados (DPO): [contato]

## 2. Parâmetros da Busca
- IP Público Requisitado: 200.100.50.25
- Porta Lógica de Origem: 12345
- Período: 15/01/2026 00:00:00 a 15/01/2026 23:59:59
- Base de Dados: Graylog Cluster (hash: abc123...)

## 3. Resultados Encontrados
| Timestamp (UTC-3) | IP Interno | Porta | MAC Address | Usuário HotSpot (CPF) | NAT Translation |
|------------------|------------|-------|-------------|----------------------|-----------------|
| 15/01/2026 14:23:10 | 192.168.88.45 | 54321 | AA:BB:CC:DD:EE:FF | 123.456.789-00 | 200.100.50.25:12345 ↔ 192.168.88.45:54321 |

## 4. Integridade dos Dados
- Hash SHA-256 do arquivo original: `a1b2c3...`
- Assinatura digital: [Anexo .sig]
- Cadeia de custódia: Registro em `/var/audit/chain-of-custody.log`

## 5. Declaração de Conformidade
Declaro, sob as penas da lei, que os dados acima foram extraídos diretamente dos sistemas de logging do provedor, 
sem alteração, manipulação ou seleção, em conformidade com o Art. 10 do Marco Civil da Internet e a LGPD.

[Local], [Data]  
__________________________  
[Nome do Responsável Técnico]  
[Cargo] | [CREA/Registro Profissional]
```

---

## 📊 Checklist de Conformidade Completa

### Infraestrutura
- [ ] Servidor de logs dedicado (fora da rede de produção)
- [ ] Comunicação criptografada (TLS 1.3) entre roteadores e servidor de logs
- [ ] Armazenamento WORM com retenção mínima de 365 dias + margem de segurança
- [ ] Backup automatizado com teste de restauração trimestral
- [ ] Monitoramento de integridade dos logs (alertas se hashing falhar)

### Procedimentos
- [ ] Política escrita de resposta a requisições judiciais
- [ ] Designação de responsável técnico (com registro profissional)
- [ ] Treinamento anual da equipe em cadeia de custódia digital [[71]]
- [ ] Registro obrigatório de toda consulta aos logs (auditoria da auditoria)
- [ ] Revisão semestral dos procedimentos com advogado especializado

### Documentação
- [ ] Termo de Responsabilidade Técnica (ART/CREA)
- [ ] Política de Privacidade e Termos de Uso atualizados (LGPD)
- [ ] Manual de Operação do Sistema de Logs
- [ ] Plano de Resposta a Incidentes (incluindo vazamento de logs)

### Testes Obrigatórios
- [ ] Simulação anual de requisição judicial (do recebimento à entrega)
- [ ] Teste de restauração de logs de 12 meses atrás
- [ ] Validação de integridade (hash) de logs antigos
- [ ] Auditoria externa independente (a cada 2 anos)

---

## 🚨 Riscos Comuns e Mitigações

| Risco | Impacto Legal | Mitigação |
|-------|--------------|-----------|
| Logs sobrescritos antes de 1 ano | Multa + responsabilidade civil [[52]] | WORM + alertas de capacidade |
| Falha na correlação NAT/CGNAT | Impossibilidade de identificar usuário [[50]] | Logging obrigatório de NAT + teste mensal |
| Acesso não autorizado aos logs | Violação de sigilo (Art. 10 Marco Civil) | MFA + RBAC + log de acesso aos logs |
| Hash de integridade não gerado | Questionamento da autenticidade em juízo | Pipeline automatizado com assinatura digital |
| Prazo judicial perdido | Multa por desobediência + astreintes | Sistema de alertas com 72h/24h de antecedência |

---

## 💡 Recomendação Final por Porte do Provedor

| Porte | Solução Recomendada | Custo Estimado |
|-------|-------------------|----------------|
| **Pequeno** (<100 usuários) | MikroTik + Graylog em VPS básico + S3 WORM | ~R$ 150/mês |
| **Médio** (100-1000 usuários) | pfSense + Graylog Cluster (2 nós) + ZFS local + backup cloud | ~R$ 800/mês |
| **Grande** (>1000 usuários) | Arquitetura distribuída: pfSense/MikroTik → Kafka → Graylog/ELK → S3 WORM + SIEM | ~R$ 3.000+/mês |

> 📌 **Dica Crítica**: Comece com o mínimo viável (MikroTik + Graylog + S3 WORM) e escale conforme a demanda. O mais importante é **garantir a imutabilidade e a rastreabilidade** desde o primeiro dia [[43]][[73]].

Precisa de ajuda para dimensionar a infraestrutura para seu cenário específico? Posso elaborar um plano de implantação passo a passo com cronograma e orçamento detalhado! 🎯