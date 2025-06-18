'use client';

import React from 'react';
import { Section } from '../layout/Section';
import { Cpu, Brain, BookOpen, Search, Users, Zap } from 'lucide-react';

type TechFeature = {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  iconColor?: string;
  iconBgColor?: string;
  badgeColor?: string;
  badgeBgColor?: string;
};

const TechnologyHighlight = () => {
  const techFeatures: TechFeature[] = [
    {
      icon: Cpu,
      title: 'IA Avançada',
      description: 'Técnicas especializadas de IA para análise clínica contextual e geração de insights precisos.',
      badge: 'CORE',
      iconColor: 'text-blue-400',
      iconBgColor: 'bg-blue-400/10',
      badgeColor: 'text-blue-200',
      badgeBgColor: 'bg-blue-600/80'
    },
    {
      icon: Brain,
      title: 'Dr. Corvus Insights',
      description: 'Sistema avançado de interpretação laboratorial com raciocínio clínico baseado em evidências.',
      badge: 'PREMIUM',
      iconColor: 'text-purple-400',
      iconBgColor: 'bg-purple-400/10',
      badgeColor: 'text-purple-200',
      badgeBgColor: 'bg-purple-600/80'
    },
    {
      icon: BookOpen,
      title: 'Medicina Baseada em Evidências',
      description: 'Pesquisa científica integrada com PubMed e múltiplas bases de dados médicas.',
      badge: 'MBE',
      iconColor: 'text-green-400',
      iconBgColor: 'bg-green-400/10',
      badgeColor: 'text-green-200',
      badgeBgColor: 'bg-green-600/80'
    },
    {
      icon: Search,
      title: 'Agente de Pesquisa Autônomo',
      description: 'Sistema de IA para busca e síntese automática de literatura científica em tempo real, possibilitando atualizações em tempo real.',
      badge: 'AUTO',
      iconColor: 'text-orange-400',
      iconBgColor: 'bg-orange-400/10',
      badgeColor: 'text-orange-200',
      badgeBgColor: 'bg-orange-600/80'
    },
    {
      icon: Users,
      title: 'Metodologias Estruturadas',
      description: 'VINDICATE, PICO, e outras ferramentas para expansão sistemática de diagnósticos.',
      badge: 'MÉTODO',
      iconColor: 'text-teal-400',
      iconBgColor: 'bg-teal-400/10',
      badgeColor: 'text-teal-200',
      badgeBgColor: 'bg-teal-600/80'
    },
    {
      icon: Zap,
      title: 'Metacognição Clínica',
      description: 'Identificação e mitigação de vieses cognitivos para tomada de decisão otimizada.',
      badge: 'BOOST',
      iconColor: 'text-yellow-400',
      iconBgColor: 'bg-yellow-400/10',
      badgeColor: 'text-yellow-900',
      badgeBgColor: 'bg-yellow-400/90'
    },
  ];

  return (
    <Section yPadding="py-8">
      <div className="mb-8">
        <h2 className="text-3xl text-center font-bold mb-4">
          Tecnologia de Ponta para Excelência Clínica
        </h2>
        <p className="text-center mt-4 text-xl leading-relaxed text-neutral-100">
          Nossa stack tecnológica combina IA avançada, metodologias validadas e interfaces intuitivas para potencializar seu desenvolvimento profissional
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {techFeatures.map((feature, index) => (
          <div key={index} className="relative p-8 bg-white shadow-lg rounded-xl border border-slate-200 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
            {feature.badge && (
              <div className="absolute top-3 right-3 z-5">
                <span className={`px-2 py-1 text-xs font-bold ${feature.badgeColor} ${feature.badgeBgColor} rounded-full shadow-lg backdrop-blur-sm`}>
                  {feature.badge}
                </span>
              </div>
            )}
            <div className="flex items-start mb-6 pr-16">
              <div className={`flex items-center justify-center w-14 h-14 ${feature.iconBgColor} rounded-xl mr-4 flex-shrink-0`}>
                <feature.icon className={`w-8 h-8 ${feature.iconColor}`} />
              </div>
              <div className="min-w-0">
                <h3 className="text-blue-600 font-semibold">{feature.title}</h3>
              </div>
            </div>
            <p className="text-slate-600 leading-relaxed text-base font-medium">{feature.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
};

export { TechnologyHighlight }; 