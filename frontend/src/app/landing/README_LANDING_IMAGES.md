# 🎨 Landing Page Images - Guia de Atualização

## 📸 **Problema Atual**
As imagens atuais na landing page são repetitivas (mascote Dr. Corvus) e não mostram o poder real da plataforma. Precisamos substituí-las por mockups atraentes que demonstrem a funcionalidade em ação.

## 🔧 **Sugestões de Mockups por Seção**

### **1. Dr. Corvus Insights: Análise Laboratorial Avançada**
**Arquivo atual:** `About.png`
**Sugestão de Mockup:**

**Opção A (Recomendada): Interface Split Screen**
- **Lado Esquerdo (30%):** Interface de entrada manual categorizada
  - Seções visíveis: "Sistema Hematológico", "Função Renal", "Gasometria"
  - Campos preenchidos com valores exemplo
  - Visual limpo e profissional
  
- **Lado Direito (70%):** Dr. Corvus Insights em ação
  - **Header:** "Dr. Corvus Insights - Análise Contextual"
  - **Seção 1:** "Processo de Pensamento Detalhado" 
    - Bullet points com raciocínio clínico
    - Ex: "• Anemia microcítica sugere deficiência de ferro..."
  - **Seção 2:** "Considerações Diagnósticas Diferenciais"
    - Lista estruturada com probabilidades
  - **Seção 3:** Gráfico de tendências de Hemoglobina
  - **Mascote:** Dr. Corvus pequeno no canto como guia

**Opção B (Conceitual):** Transformação visual de PDF → Insights
- PDF de exame sendo "processado" por IA
- Setas mostrando extração → análise → insights
- Elementos de rede neural estilizados

### **2. Academia Clínica: Raciocínio Diagnóstico**
**Arquivo atual:** `About.png`
**Sugestão de Mockup:**

**Opção A (Interface da Academia):**
- **Painel Principal:** "Academia Clínica Dr. Corvus"
- **Módulos Visíveis:**
  ```
  [📊 MBE & Pesquisa]    [🧠 Metacognição]
  [🎯 Expansão Ddx]      [💬 Dr. Corvus Chat]
  ```
- **Módulo Aberto:** "Expansão de Diagnósticos Diferenciais"
  - Caso clínico: "Paciente, 35 anos, dor torácica..."
  - VINDICATE methodology sendo aplicada
  - Feedback do Dr. Corvus sobre o Ddx proposto
  - Progress bar: "Progresso no Módulo: 67%"

**Opção B (Conceitual):** 
- Cérebro conectado a redes de conhecimento
- Árvores de decisão médica estilizadas
- Dr. Corvus "apresentando" o conceito

### **3. Gestão Inteligente e Visualização**
**Arquivo atual:** `About.png`
**Sugestão de Mockup:**

**Dashboard Médico Completo:**
- **Header:** "Clinical Corvus - Dashboard Integrado"
- **Seção 1:** Multi-gráficos
  - Tendência de Creatinina (3 meses)
  - Evolução de Hemoglobina
  - Score SOFA timeline
- **Seção 2:** Timeline consolidada
  ```
  15/12 - Exames laboratoriais
  14/12 - Nota clínica: "Paciente evoluindo..."
  13/12 - Score APACHE II: 12
  ```
- **Seção 3:** Cards de pacientes ativos
- **Cores:** Azul profissional, verde para valores normais, vermelho para críticos

### **4. Segurança e Privacidade**
**Arquivo atual:** `About.png`
**Sugestão de Mockup:**

**Conceitual/Simbólico:**
- **Elemento Central:** Escudo estilizado com elementos de:
  - Código binário/rede neural inside
  - Símbolo médico (caduceu) integrado
- **Background:** Ambiente médico/tecnológico seguro
  - Cores azuis e verdes suaves
  - Elementos abstratos de criptografia
- **Badges:** "LGPD Compliant", "HIPAA Ready", "AES-256"
- **Evitar:** Cadeados genéricos ou cofres óbvios

## 🎨 **Especificações Técnicas**

### **Resolução e Formato**
- **Resolução:** 1200x800px mínimo (para suporte a telas Retina)
- **Formato:** PNG com transparência ou JPG de alta qualidade
- **Aspect Ratio:** 3:2 (para consistência no layout)

### **Paleta de Cores**
- **Primária:** Azul profissional (#1e40af, #3b82f6)
- **Secundária:** Verde médico (#059669, #10b981)
- **Neutros:** Cinzas (#374151, #6b7280, #f3f4f6)
- **Alertas:** Vermelho crítico (#dc2626) e Amarelo atenção (#f59e0b)

### **Tipografia nos Mockups**
- **Headers:** Fonte sans-serif bold (similar ao Inter/Helvetica)
- **Corpo:** Fonte legível e médica
- **Tamanhos:** Legíveis mesmo em versões reduzidas

## 🚀 **Prioridade de Implementação**

1. **ALTA:** Dr. Corvus Insights (mais impactante para conversão)
2. **ALTA:** Academia Clínica (diferencial competitivo)
3. **MÉDIA:** Dashboard/Gestão (funcionalidade importante)
4. **BAIXA:** Segurança (conceitual, menos crítico visualmente)

## 📋 **Checklist de Implementação**

- [ ] Criar/contratar mockups conforme especificações
- [ ] Otimizar imagens para web (compressão sem perda de qualidade)
- [ ] Atualizar paths nos componentes:
  - [ ] `VerticalFeatureRow` - 4 imagens
  - [ ] Verificar responsividade em mobile
- [ ] Adicionar alt texts descritivos para acessibilidade
- [ ] Testar carregamento e performance

## 💡 **Recursos Adicionais**

### **Ferramentas Sugeridas para Criação:**
- **Figma/Sketch:** Para interfaces detalhadas
- **Canva Pro:** Para mockups mais conceituais
- **Photoshop:** Para composições complexas
- **Unsplash/Pexels:** Para elementos de background médicos

### **Inspiração Visual:**
- Dashboards médicos modernos (Epic, Cerner)
- Interfaces de IA médica (IBM Watson Health)
- Plataformas educacionais médicas (UpToDate, Medscape)
- Design systems de health tech (Stripe, Linear para inspiração de clean UI)

---

**Próximos Passos:** Após implementar os mockups, considerar adicionar animações sutis (CSS/Framer Motion) para demonstrar interatividade e engajamento. 