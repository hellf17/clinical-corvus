'use client';

import React from 'react';
import { Section } from '../layout/Section';
import { ShieldCheck, UserCheck, BarChart3, MessageSquareText, Activity, Users, ClipboardCheck, HeartPulse, Brain, BookPlus, Microscope, GraduationCap, Stethoscope, Search } from 'lucide-react'; // Example icons

type BenefitItem = {
  icon: React.ElementType;
  text: string;
};

type PerspectiveBlockProps = {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  text: string;
  benefits: BenefitItem[];
  className?: string;
};

const PerspectiveBlock: React.FC<PerspectiveBlockProps> = ({ title, subtitle, text, benefits, className }) => (
  <div className={`flex flex-col p-6 bg-white rounded-lg shadow-xl ${className || ''}`}>
    <h3 className="text-2xl text-center font-bold text-blue-700 font-semibold mb-3">{title}</h3>
    <h4 className="text-lg text-center font-semibold text-blue-700 mb-4">{subtitle}</h4>
    <p className="text-slate-700 mb-6 text-base leading-relaxed font-semibold">{text}</p>
    <ul className="space-y-3">
      {benefits.map((benefit, index) => (
        <li key={index} className="flex items-center text-slate-600">
          <benefit.icon className="w-5 h-5 mr-3 text-blue-500 flex-shrink-0" />
          <span className="text-base">{benefit.text}</span>
        </li>
      ))}
    </ul>
  </div>
);

// New component for centralized feature titles
const CentralizedFeatureTitle: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="text-center mb-8 col-span-2">
    <h2 className="text-3xl font-bold text-blue-700 mb-4">{title}</h2>
    <p className="text-xl font-bold text-blue-700 max-w-4xl mx-auto leading-relaxed">
      {description}
    </p>
  </div>
);

const DualPerspectiveSection = () => {
  const doctorBenefits: BenefitItem[] = [
    { icon: Microscope, text: 'Dr. Corvus Insights: Interpretações Clínicas Profundas baseadas em Evidências' },
    { icon: BarChart3, text: 'Dashboards Interativos com Scores de Severidade (SOFA, APACHE II, qSOFA)' },
    { icon: MessageSquareText, text: 'Assistente IA para Discussão de Casos e Hipóteses Diagnósticas' },
    { icon: Users, text: 'Gestão Longitudinal de Pacientes com Timeline Consolidada' },
    { icon: Activity, text: 'Análise Contextualizada Multi-paramétrica e Correlações Inteligentes' },
  ];

  const studentBenefits: BenefitItem[] = [
    { icon: Brain, text: 'Metacognição Clínica: Identificação e Mitigação de Vieses Cognitivos' },
    { icon: Search, text: 'Expansão de Diagnósticos Diferenciais com Metodologias Estruturadas (VINDICATE)' },
    { icon: BookPlus, text: 'Medicina Baseada em Evidências: Formulação PICO e Pesquisa Científica Integrada' },
    { icon: GraduationCap, text: 'Módulos Interativos com Funções de IA Especializadas' },
    { icon: Stethoscope, text: 'Prática de Casos Reais com Feedback Inteligente do Dr. Corvus' },
  ];

  return (
    <Section yPadding="py-6">
      {/* Grid container for the centralized feature title and cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Centralized feature title spanning both columns */}
        
        {/* The two perspective blocks */}
        <PerspectiveBlock 
          title={"Para Profissionais"}
          subtitle={"Decisões Clínicas Precisas com Tecnologia de Ponta"}
          text="Eleve sua prática com Dr. Corvus Insights, que combina extração inteligente de dados laboratoriais, análise contextual avançada e interpretações baseadas nas mais recentes evidências científicas. Nossa IA não apenas analiza - ela raciocina clinicamente, oferecendo considerações diagnósticas diferenciais e sugestões de próximos passos investigativos."
          benefits={doctorBenefits}
          className="border border-primary-500/30"
        />
        <PerspectiveBlock 
          title={"Para Estudantes e Residentes"}
          subtitle={"Desenvolva suas habilidades de raciocínio clínico e prática clínica"}
          text="Desenvolva um raciocínio clínico robusto através de nossa Academia Clínica inovadora. Módulos construídos com funções de IA especializadas guiam você pelos pilares da Medicina Baseada em Evidências, prevenção de erros diagnósticos e expansão sistemática de hipóteses. Aprenda não apenas o que pensar, mas como pensar clinicamente."
          benefits={studentBenefits}
          className="border border-secondary-500/30"
        />
      </div>
    </Section>
  );
};

export { DualPerspectiveSection }; 