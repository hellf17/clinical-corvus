import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Simulated educational response for SNAPPS framework
    const response = {
      response: `Dr. Corvus: Obrigado por sua apresentação do caso! 

📋 **Análise da sua apresentação:**

**Pontos positivos identificados:**
- Estrutura clara na apresentação
- Organização lógica dos dados
- Foco nos aspectos relevantes

**Áreas para aprimoramento:**
- Considere incluir dados demográficos mais específicos
- Destaque achados físicos mais relevantes  
- Priorize informações que orientam o diagnóstico

**Próxima etapa SNAPPS:**
Agora vamos trabalhar suas hipóteses diagnósticas. Quais são suas 3 principais suspeitas para este caso?

---
*Esta é uma função educacional do framework SNAPPS para desenvolvimento de habilidades de apresentação clínica.*`,
      
      metadata: {
        snapps_step: 1,
        step_name: "Summarize",
        framework: "SNAPPS (Summarize, Narrow, Analyze, Probe, Plan, Select)",
        educational_focus: "Habilidades de apresentação e síntese clínica",
        next_action: "Fornecer lista de diagnósticos diferenciais"
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in evaluate summary SNAPPS translated API route:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: 'Falha ao avaliar resumo no framework SNAPPS'
      },
      { status: 500 }
    );
  }
} 