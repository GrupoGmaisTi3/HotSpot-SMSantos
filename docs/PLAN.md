# PLAN.md — Filtragem Dinâmica de Departamentos por Ofertas Ativas

Este plano descreve as alterações necessárias para garantir que apenas os departamentos que possuem ofertas ativas sejam exibidos na grade da página inicial (`login.html`), ocultando a seção caso nenhuma oferta esteja disponível, com uma transição suave.

---

## 📋 Requisitos e Decisões Alinhadas
1. **Ocultação de Seção:** Caso nenhuma oferta seja carregada (ou nenhuma oferta corresponda aos departamentos cadastrados), a seção inteira de Departamentos deve ser ocultada (`display: none`).
2. **Transição Suave:** Ao atualizar a grade de departamentos após o carregamento assíncrono das ofertas, aplicaremos um efeito de fade-in (`opacity` com `transition`) para suavizar a transição visual.
3. **Mapeamento:** Utilizaremos o mapeamento existente de departamentos através de `SantosDeptos.identificar(oferta)`.

---

## 🛠️ Alterações Propostas

### 1. [js/ofertas.js](file:///c:/winbox/HotSpot.HTML/hotspot-01/js/ofertas.js)
- **Mapeamento:** Modificar `normalizarOferta` para incluir o campo `deptoKey` no objeto retornado.
- **Coordenação:** No final do fluxo de inicialização (`init()`), chamar `window.SantosDeptos.renderizarGrid(ofertas)` passando as ofertas carregadas.

### 2. [login.html](file:///c:/winbox/HotSpot.HTML/hotspot-01/login.html)
- **Estrutura HTML:** Identificar a seção de departamentos com um ID (ex: `id="depts-section"`) para que possamos ocultá-la ou exibi-la dinamicamente.
- **Renderização Dinâmica:** Refatorar o script inline de departamentos para expor a função `window.SantosDeptos.renderizarGrid(ofertas)`.
  - Esta função verificará as chaves de departamento presentes nas ofertas.
  - Se a lista filtrada for maior que 0, exibe a seção, renderiza os cards e adiciona a classe de animação `.loaded`.
  - Caso contrário (sem ofertas ou lista filtrada vazia), oculta a seção de departamentos (`display: none`).

### 3. [css/style.css](file:///c:/winbox/HotSpot.HTML/hotspot-01/css/style.css)
- Adicionar estilos de transição para a classe `.dept-grid`:
  - Por padrão, `.dept-grid` começará com `opacity: 0` e `transition: opacity 0.4s ease`.
  - Ao receber a classe `.loaded`, mudará para `opacity: 1`.

---

## 🧪 Plano de Verificação
- **Cenário 1 (Com Ofertas):** Validar se apenas os departamentos correspondentes às ofertas ativas são exibidos com a animação de fade-in suave.
- **Cenário 2 (Sem Ofertas):** Simular falha de carregamento ou lista de ofertas vazia e garantir que a seção inteira de Departamentos seja ocultada de forma limpa.
