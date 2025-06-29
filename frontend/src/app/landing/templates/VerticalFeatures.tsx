'use client';

import { VerticalFeatureRow } from '../feature/VerticalFeatureRow';
import { Section } from '../layout/Section';

const VerticalFeatures = () => (
  <Section
    yPadding="py-6"
    description="Nossa plataforma integra tecnologia de IA avançada, funções especializadas e metodologias baseadas em evidências para transformar a análise clínica e o desenvolvimento do raciocínio médico."
  >
    <VerticalFeatureRow
      title="Dr. Corvus Insights: Transforme Dados Laboratoriais em Decisões Clínicas de Precisão"
      generalDescription="Faça upload de exames (PDF, JPG, PNG) ou insira dados manualmente em nossa interface intuitiva e categorizada. Nossa IA extrai, analisa, enriquece e, com o revolucionário sistema Dr. Corvus Insights, fornece interpretações clínicas profundas, contextualizadas ao perfil do seu paciente e baseadas nas mais recentes evidências."
      doctorDescription="Identifique rapidamente anormalidades, valores de referência e tendências. Visualize padrões e correlações entre múltiplos parâmetros com gráficos interativos. Receba considerações diagnósticas diferenciais estruturadas e sugestões de próximos passos investigativos ou terapêuticos, sempre fundamentadas."
      patientDescription="Acelere seu aprendizado interpretando casos reais ou simulados, compreenda a fundo o significado dos exames e prepare-se para discussões clínicas com insights de nível especialista."
      studentDescription="Desenvolva expertise em interpretação laboratorial através de casos práticos, aprenda a identificar padrões complexos e correlações clínicas, e pratique o raciocínio diagnóstico com feedback inteligente do Dr. Corvus."
      image="About.png" // Placeholder - replace with lab analysis interface mockup
      imageAlt="Interface Dr. Corvus Insights para análise laboratorial avançada"
    />
    <VerticalFeatureRow
      title="Academia Clínica Dr. Corvus: Eleve seu Raciocínio Médico à Excelência"
      generalDescription="Desenvolva habilidades de diagnóstico de elite com nossa Academia Clínica. Módulos interativos, construídos com funções de IA especializadas, guiam você através dos pilares do raciocínio clínico e da Medicina Baseada em Evidências (MBE)."
      doctorDescription="Aprimore continuamente suas habilidades diagnósticas, identifique e mitigue vieses cognitivos, e mantenha-se atualizado com as melhores práticas baseadas em evidências através de módulos de educação continuada."
      patientDescription="Domine a formulação de problemas como um especialista, aprenda metodologias estruturadas para expansão de diagnósticos diferenciais e desenvolva metacognição clínica para prevenção de erros diagnósticos."
      studentDescription="Pratique Medicina Baseada em Evidências com formulação de perguntas PICO, utilize nosso sistema de pesquisa científica integrado (PubMed, bases múltiplas) e desenvolva habilidades de avaliação crítica da literatura médica."
      image="landing_mbe.gif" // Placeholder - replace with Clinical Academy interface mockup
      imageAlt="Módulos interativos da Academia Clínica Dr. Corvus"
      reverse
    />
    <VerticalFeatureRow
      title="Fluxo de Trabalho Otimizado: Gestão Inteligente e Visualização Clara"
      generalDescription="Além da análise e do aprendizado, o Clinical Corvus oferece ferramentas robustas para otimizar seu dia a dia, seja na gestão de pacientes ou no acompanhamento de casos de estudo."
      doctorDescription="Monitore a evolução de múltiplos pacientes com dashboards personalizados e gráficos interativos que revelam tendências, correlações e o impacto de intervenções. Utilize notas clínicas com editor integrado e acesse timeline consolidada de eventos clínicos."
      patientDescription="Acompanhe casos de estudo complexos com visualizações longitudinais, analise a progressão de marcadores ao longo do tempo e correlacione intervenções com outcomes clínicos para aprendizado prático."
      studentDescription="Gerencie seu portfólio de casos, acompanhe a evolução de pacientes virtuais e reais (quando aplicável), e utilize ferramentas de visualização para compreender padrões de doença e resposta terapêutica."
      image="About.png" // Placeholder - replace with dashboard/management interface mockup
      imageAlt="Dashboard integrado para gestão clínica inteligente"
    />
    <VerticalFeatureRow
      title="Sua Confiança, Nossa Prioridade: Segurança e Privacidade de Dados"
      generalDescription="Entendemos a sensibilidade dos dados de saúde. O Clinical Corvus é construído sobre uma fundação de segurança robusta e conformidade rigorosa para proteger cada informação."
      doctorDescription="Trabalhe em conformidade com a LGPD/HIPAA. Utilizamos desidentificação para análises de IA quando aplicável e garantimos controle total de acesso aos dados. Todas as informações são protegidas com criptografia de ponta e as melhores práticas de segurança da informação."
      patientDescription="Desenvolva suas habilidades e gerencie seus casos em um ambiente que respeita a confidencialidade e a integridade dos dados. Pratique com casos simulados ou desidentificados sem comprometer a privacidade dos pacientes."
      studentDescription="Aprenda e pratique em um ambiente ético e seguro, onde a privacidade dos dados é mantida através de tecnologias avançadas de criptografia e protocolos rigorosos de controle de acesso."
      image="About.png" // Placeholder - replace with security/privacy conceptual image
      imageAlt="Segurança e privacidade de dados médicos na plataforma"
      reverse
    />
  </Section>
);

export { VerticalFeatures }; 