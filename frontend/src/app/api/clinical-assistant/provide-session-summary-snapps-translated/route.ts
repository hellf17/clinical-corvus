import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_history = [], case_context = '' } = body;

    const sessionSteps = session_history.length || 6;
    const completedSteps = session_history.filter((step: any) => step.completed).length || 6;

    // Simulated educational response for SNAPPS framework
    const response = {
      response: `Dr. Corvus: 🎉 **Parabéns! Sessão SNAPPS concluída com excelência!**

📊 **Resumo completo da sessão:**

**📈 Estatísticas:**
- **Etapas completadas:** ${completedSteps}/${sessionSteps} do framework SNAPPS
- **Metodologia:** Apresentação estruturada de caso clínico
- **Abordagem:** Raciocínio clínico sistemático e progressivo

**🎯 Jornada de aprendizado (SELECT - Step 6):**

✅ **1. SUMMARIZE:** Você desenvolveu habilidades de síntese clínica
   → Apresentação clara e organizada dos dados do paciente

✅ **2. NARROW:** Trabalhou priorização de hipóteses diagnósticas
   → Seleção baseada em probabilidade e gravidade

✅ **3. ANALYZE:** Aprofundou análise crítica de diagnósticos diferenciais
   → Pensamento sistemático e uso de dados discriminatórios

✅ **4. PROBE:** Desenvolveu questionamento clínico estruturado
   → Pensamento crítico e medicina baseada em evidências

✅ **5. PLAN:** Criou planos de manejo fundamentados e seguros
   → Integração de evidências na tomada de decisão

✅ **6. SELECT:** Consolidou aprendizado e identificou pontos-chave
   → Metacognição e planejamento para desenvolvimento contínuo

**💡 Principais competências desenvolvidas:**
- **Apresentação clínica:** Síntese clara e objetiva
- **Raciocínio diagnóstico:** Pensamento sistemático e priorização
- **Pensamento crítico:** Questionamento estruturado e análise
- **Tomada de decisão:** Planos baseados em evidências
- **Metacognição:** Reflexão sobre o próprio aprendizado

**🚀 Recomendações para evolução contínua:**
- Continue praticando apresentações estruturadas
- Desenvolva repertório de padrões clínicos (illness scripts)
- Pratique questionamento socrático com colegas e supervisores
- Aplique o framework SNAPPS em casos reais
- Busque feedback regular sobre seu raciocínio clínico
- Mantenha-se atualizado com evidências científicas

**🏆 Certificação acadêmica:**
Você completou com sucesso uma sessão completa de simulação clínica usando o framework SNAPPS! Esta metodologia é reconhecida internacionalmente para desenvolvimento de habilidades de apresentação e raciocínio clínico.

**🎓 Próximos desafios:**
- Casos mais complexos com múltiplas comorbidades
- Simulações de emergência com decisões rápidas
- Discussões interdisciplinares
- Apresentações para diferentes audiências

*Continue esta jornada de excelência clínica. A medicina é um aprendizado contínuo e o framework SNAPPS será seu aliado constante!*

---
**Dr. Corvus - Sistema Avançado de Treinamento em Raciocínio Clínico**
*Desenvolvendo a próxima geração de profissionais de saúde*`,
      
      metadata: {
        snapps_step: 6,
        step_name: "Select",
        framework: "SNAPPS",
        educational_focus: "Consolidação de aprendizado e metacognição",
        session_completion: "100%",
        competencies_developed: [
          "Apresentação clínica",
          "Raciocínio diagnóstico", 
          "Pensamento crítico",
          "Tomada de decisão",
          "Metacognição"
        ],
        certification: "SNAPPS Framework Completion Certificate",
        next_recommendations: [
          "Casos complexos",
          "Simulações de emergência",
          "Discussões interdisciplinares",
          "Apresentações diversificadas"
        ]
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in provide session summary SNAPPS translated API route:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: 'Falha ao fornecer resumo da sessão no framework SNAPPS'
      },
      { status: 500 }
    );
  }
} 