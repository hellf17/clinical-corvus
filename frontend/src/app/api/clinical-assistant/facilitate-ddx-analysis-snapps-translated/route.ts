import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { differential_list = [], case_context = '' } = body;

    const ddxText = differential_list.length > 0 
      ? differential_list.join(', ') 
      : 'nenhuma hipótese fornecida';

    // Simulated educational response for SNAPPS framework
    const response = {
      response: `Dr. Corvus: Excelente! Vamos analisar suas hipóteses de forma sistemática.

🎯 **Suas hipóteses diagnósticas:** ${ddxText}

**Análise estruturada (SNAPPS Steps 2-3):**

**📊 NARROW (Estreitar):**
- Vamos priorizar por probabilidade e gravidade
- Quais hipóteses são mais prováveis no contexto apresentado?
- Existem diagnósticos que "não podemos perder" (cannot-miss)?

**🔍 ANALYZE (Analisar):**
- Que achados específicos sustentam cada hipótese?
- Que dados discriminatórios distinguem entre elas?
- Como os fatores de risco influenciam a probabilidade?

**💡 Questões para reflexão:**
- Se você pudesse fazer apenas 1 exame, qual seria?
- Que achados físicos ainda precisam ser investigados?
- Como a epidemiologia local afeta suas hipóteses?

**Próximo passo SNAPPS:**
Que perguntas específicas você tem sobre este caso? O que mais te intriga ou preocupa na investigação?

---
*Framework SNAPPS - Desenvolvendo raciocínio clínico estruturado e sistemático*`,
      
      metadata: {
        snapps_steps: [2, 3],
        step_names: ["Narrow", "Analyze"],
        framework: "SNAPPS",
        educational_focus: "Priorização e análise de diagnósticos diferenciais",
        differential_count: differential_list.length,
        next_action: "Formular perguntas específicas sobre o caso"
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in facilitate DDx analysis SNAPPS translated API route:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: 'Falha ao facilitar análise de diagnóstico diferencial no framework SNAPPS'
      },
      { status: 500 }
    );
  }
} 