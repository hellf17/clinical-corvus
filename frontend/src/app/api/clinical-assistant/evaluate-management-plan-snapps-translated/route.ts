import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { management_plan = '', case_context = '' } = body;

    // Simulated educational response for SNAPPS framework
    const response = {
      response: `Dr. Corvus: Excelente! Vamos analisar seu plano de manejo de forma estruturada.

📋 **PLAN (Step 5) - Seu plano proposto:**
"${management_plan}"

**Avaliação sistemática:**

🎯 **Prioridades clínicas:**
✅ Questões urgentes/emergenciais identificadas?
✅ Estabilização do paciente considerada?
✅ Diagnósticos diferenciais sendo investigados adequadamente?

📊 **Componentes essenciais do plano:**

**🔍 DIAGNÓSTICO:**
- Exames laboratoriais/imagem apropriados?
- Sequência lógica de investigação?
- Custo-efetividade considerada?

**💊 TERAPÊUTICO:**
- Tratamento sintomático adequado?
- Terapia específica quando indicada?
- Contraindicações verificadas?

**📈 MONITORAMENTO:**
- Critérios de melhora definidos?
- Sinais de alerta identificados?
- Cronograma de reavaliação estabelecido?

**🎓 EDUCAÇÃO:**
- Orientações claras para paciente/família?
- Sinais de alerta explicados?
- Adesão ao tratamento facilitada?

**⚖️ Análise crítica:**
- Seu plano é seguro e apropriado?
- Baseia-se em evidências científicas?
- Considera limitações e preferências do paciente?
- É factível no contexto disponível?

**💡 Sugestões de otimização:**
- Considere protocolos institucionais
- Defina pontos claros de reavaliação
- Estabeleça critérios de melhora/piora
- Planeje seguimento adequado

**Próximo passo SNAPPS:**
Vamos consolidar todo o aprendizado desta sessão! Que pontos principais você destaca?

---
*SNAPPS Step 5: PLAN - Desenvolvendo competência em tomada de decisão clínica fundamentada*`,
      
      metadata: {
        snapps_step: 5,
        step_name: "Plan",
        framework: "SNAPPS",
        educational_focus: "Desenvolvimento de planos de manejo seguros e baseados em evidências",
        plan_length: management_plan.length,
        next_action: "Consolidar aprendizado e pontos principais"
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in evaluate management plan SNAPPS translated API route:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: 'Falha ao avaliar plano de manejo no framework SNAPPS'
      },
      { status: 500 }
    );
  }
} 