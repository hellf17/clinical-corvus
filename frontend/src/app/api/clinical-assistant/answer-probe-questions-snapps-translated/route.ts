import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questions = [], student_answers = [] } = body;

    const questionsText = questions.length > 0 
      ? questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')
      : 'Nenhuma pergunta específica fornecida';

    const answersText = student_answers.length > 0
      ? student_answers.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')
      : 'Aguardando suas reflexões...';

    // Simulated educational response for SNAPPS framework
    const response = {
      response: `Dr. Corvus: Ótimas perguntas! Vamos explorar cada uma usando o método socrático.

🤔 **PROBE (Step 4) - Suas perguntas:**
${questionsText}

**Suas reflexões:**
${answersText}

**Orientação socrática:**

Ao invés de respostas diretas, vou te guiar com questionamentos que desenvolvem seu raciocínio:

💭 **Probabilidade e Epidemiologia:**
- Como você aplicaria os conceitos de probabilidade pré-teste neste contexto?
- Que fatores demográficos e epidemiológicos influenciam suas hipóteses?
- Como a prevalência local de doenças afeta seu raciocínio?

🎯 **Tomada de Decisão:**
- Se você tivesse recursos limitados, como priorizaria?
- Que resultado de exame mudaria fundamentalmente sua conduta?
- Como você lidaria com resultados inconclusivos?

⚖️ **Princípios de Medicina Baseada em Evidências:**
- Qual o nível de evidência que sustenta suas decisões?
- Como você equilibra benefícios, riscos e custos?
- Que diretrizes clínicas se aplicam a este caso?

**Próximo passo SNAPPS:**
Com base nessas reflexões, qual seria seu plano de manejo inicial para este paciente?

---
*SNAPPS Step 4: PROBE - Desenvolvendo pensamento crítico através de questionamento estruturado*`,
      
      metadata: {
        snapps_step: 4,
        step_name: "Probe",
        framework: "SNAPPS",
        educational_focus: "Questionamento socrático e desenvolvimento de pensamento crítico",
        questions_count: questions.length,
        answers_count: student_answers.length,
        next_action: "Desenvolver plano de manejo"
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in answer probe questions SNAPPS translated API route:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: 'Falha ao responder perguntas investigativas no framework SNAPPS'
      },
      { status: 500 }
    );
  }
} 