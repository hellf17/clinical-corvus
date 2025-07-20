'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { ArrowRight, BookOpen, Brain, Info, Lightbulb, MessageSquare, Microscope, RefreshCw, Search, Sparkles, TestTubeDiagonal, Users, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import Link from 'next/link';
import { ModuleButton } from '@/components/ui/ModuleButton';

// Tipos para os módulos da academia
interface AcademyModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  isNew?: boolean;
  isRecommended?: boolean;
  progress?: number;
  status: string;
}

// Módulos disponíveis na academia
const academyModules: AcademyModule[] = [
  {
    id: 'differential-diagnosis',
    title: 'Diagnóstico Diferencial e Teste de Hipóteses',
    description: 'Aprenda a construir e refinar diagnósticos diferenciais, testando hipóteses com precisão.',
    icon: <Brain className="h-6 w-6" />,
    href: '/academy/differential-diagnosis',
    isRecommended: true,
    progress: 30,
    status: 'active',
  },
  {
    id: 'clinical-simulation',
    title: 'Simulação Clínica Integrada (Framework SNAPPS)',
    description: 'Pratique o raciocínio clínico em casos simulados usando o método SNAPPS com feedback interativo.',
    icon: <Microscope className="h-6 w-6" />,
    href: '/academy/clinical-simulation',
    isNew: true,
    status: 'active',
  },
  {
    id: 'evidence-based',
    title: 'Medicina Baseada em Evidências (MBE) na Prática',
    description: 'Domine a arte de formular perguntas PICO, buscar e avaliar criticamente evidências científicas.',
    icon: <Microscope className="h-6 w-6" />,
    href: '/academy/evidence-based-medicine',
    status: 'active',
  },
  {
    id: 'fundamental-diagnostic-reasoning',
    title: 'Raciocínio Diagnóstico Fundamental',
    description: 'Domine a representação do problema, qualificadores semânticos, illness scripts e coleta de dados direcionada.',
    icon: <Brain className="h-6 w-6" />,
    href: '/academy/fundamental-diagnostic-reasoning',
    status: 'active',
  },
  {
    id: 'metacognition-diagnostic-errors',
    title: 'Metacognição e Evitando Erros Diagnósticos',
    description: 'Desenvolva autoconsciência, identifique vieses e pratique o "diagnostic timeout" para decisões mais seguras.',
    icon: <Zap className="h-6 w-6" />,
    href: '/academy/metacognition-diagnostic-errors',
    status: 'active',
  },
  {
    id: 'lab-interpretation',
    title: 'Interpretação Avançada de Exames Laboratoriais',
    description: 'Explore nuances na interpretação de exames, correlações complexas e o impacto de variáveis pré-analíticas. (Em Breve)',
    icon: <Lightbulb className="h-6 w-6" />,
    href: '/academy/lab-interpretation',
    status: 'soon',
  },
  {
    id: 'communication',
    title: 'Comunicação Efetiva em Saúde',
    description: 'Desenvolva habilidades de comunicação com pacientes e colegas, incluindo como explicar achados complexos e discutir planos de tratamento. (Em Breve)',
    icon: <Sparkles className="h-6 w-6" />,
    href: '/academy/communication',
    status: 'soon',
  },
];

// Notícias e atualizações da academia
interface AcademyNews {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'update' | 'new_content' | 'tip';
}

const academyNews: AcademyNews[] = [
  {
    id: '1',
    title: 'Novo Módulo: Simulação SNAPPS',
    description: 'Pratique apresentação de casos com feedback estruturado do Dr. Corvus.',
    date: '2024-03-19',
    type: 'new_content',
  },
  {
    id: '2',
    title: 'Dica: Expandindo seu Diagnóstico Diferencial',
    description: 'Use a abordagem anatômica e mnemônicos para não esquecer diagnósticos importantes.',
    date: '2024-03-18',
    type: 'tip',
  },
];

interface ModuleCardProps {
  module: AcademyModule; // Use the AcademyModule interface
}

const ModuleCard: React.FC<ModuleCardProps> = ({ module }) => {
  // Definir cores temáticas para cada módulo
  const getModuleTheme = (id: string) => {
    switch (id) {
      case 'fundamental-diagnostic-reasoning': return 'border-l-blue-500';
      case 'differential-diagnosis': return 'border-l-purple-500';
      case 'metacognition-diagnostic-errors': return 'border-l-indigo-500';
      case 'evidence-based': return 'border-l-[#4d9e3f]'; // Green for MBE
      case 'clinical-simulation': return 'border-l-cyan-500'; // Cyan for Simulation
      case 'lab-interpretation': return 'border-l-orange-500';
      case 'communication': return 'border-l-pink-500';
      default: return 'border-l-gray-500';
    }
  };

  return (
    <Card className={`flex flex-col h-full bg-white hover:shadow-lg transition-all duration-200 border-l-4 ${getModuleTheme(module.id)} shadow-md`}>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="text-primary">{module.icon}</div>
          <CardTitle className="text-gray-900 text-lg">{module.title}</CardTitle>
        </div>
        <CardDescription className="text-gray-600 leading-relaxed">{module.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {/* Additional content can go here if needed */}
      </CardContent>
      <CardFooter>
        <Link href={module.href} passHref className="w-full">
          {module.status === 'soon' ? (
            <Button 
              disabled 
              className="w-full bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
            >
              Em Breve
            </Button>
          ) : (
            <Button 
              className="w-full academy-gradient-header text-white border-0 hover:shadow-lg transition-all duration-200 group"
            >
              Acessar Módulo 
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          )}
        </Link>
      </CardFooter>
    </Card>
  );
};

interface LearningPathItemProps {
  title: string;
  category: string;
  link: string;
  icon?: React.ReactNode;
}

const LearningPathItem: React.FC<LearningPathItemProps> = ({ title, category, link, icon }) => (
  <Link href={link} passHref>
    <div className="flex items-center p-4 bg-white/80 hover:bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-md">
      <div className="text-blue-600 mr-3">
        {icon || <Lightbulb className="h-5 w-5" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-600">{category}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-1" />
    </div>
  </Link>
);

export default function AcademyPage() {
  const { isLoaded: authIsLoaded, userId } = useAuth();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authIsLoaded) {
      setIsLoading(false);
    }
  }, [authIsLoaded]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-12">
      <section className="text-center py-10 academy-gradient-header rounded-xl border border-primary/20 shadow-lg">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white flex items-center justify-center mb-4">
          <BookOpen className="h-10 w-10 md:h-12 md:w-12 mr-4 text-white" />
          Academia Clínica Dr. Corvus
        </h1>
        <p className="mt-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
          Bem-vindo(a) de volta à Academia, <span className="font-semibold text-white">{user?.firstName || 'meu caro'}</span>!
        </p>
        <p className="text-base md:text-lg text-white/80">Pronto para aprimorar seu raciocínio clínico?</p>
        
        {/* Status Indicators */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
            <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
            Sistema Ativo
          </div>
          <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
            <Brain className="w-3 h-3 mr-1" />
            IA Avançada
          </div>
          <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
            <Sparkles className="w-3 h-3 mr-1" />
            Feedback Personalizado
          </div>
        </div>
      </section>

      <section className="p-8 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl shadow-sm">
        <h2 className="text-2xl font-semibold mb-6 flex items-center text-gray-900">
          <Sparkles className="h-6 w-6 mr-2 text-purple-600" />
          Seu Caminho de Aprendizado Sugerido
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Placeholder learning path items - these would be dynamically generated */}
          <LearningPathItem
            title="Continue o caso simulado de Dor Torácica"
            category="Simulação Clínica"
            link="/academy/clinical-simulation/case/dor-toracica" // Example link
            icon={<MessageSquare className="h-5 w-5 text-blue-500" />}
          />
          <LearningPathItem
            title="Desafie-se: Identifique o viés neste cenário"
            category="Raciocínio Clínico"
            link="/academy/differential-diagnosis/bias-challenge/1" // Example link
            icon={<Brain className="h-5 w-5 text-purple-500" />}
          />
          <LearningPathItem
            title="Explore: Raciocínio Abdutivo em Neurologia"
            category="Diagnóstico Diferencial"
            link="/academy/differential-diagnosis/abductive-reasoning" // Example link
            icon={<Search className="h-5 w-5 text-emerald-500" />}
          />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-8 flex items-center text-gray-900">
          <BookOpen className="h-6 w-6 mr-2 text-blue-600" />
          Catálogo de Módulos e Ferramentas
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <ModuleCard
            module={academyModules.find(m => m.id === 'fundamental-diagnostic-reasoning')!}
          />
          <ModuleCard
            module={academyModules.find(m => m.id === 'differential-diagnosis')!}
          />
          <ModuleCard
            module={academyModules.find(m => m.id === 'evidence-based')!}
          />
          <ModuleCard
            module={academyModules.find(m => m.id === 'metacognition-diagnostic-errors')!}
          />
          <ModuleCard
            module={academyModules.find(m => m.id === 'clinical-simulation')!}
          />
          <ModuleCard
            module={academyModules.find(m => m.id === 'communication')!}
          />
        </div>
      </section>

      {/* Optional Progress Section - Placeholder */}
      {/* 
      <section>
        <h2 className="text-2xl font-semibold mb-6">Seu Progresso</h2>
        <Card>
          <CardHeader><CardTitle>Módulos Completos</CardTitle></CardHeader>
          <CardContent>
            <p>Você completou X de Y módulos.</p>
            {/* Progress bar or list of completed items * /}
          </CardContent>
        </Card>
      </section>
      */}

      {/* Optional Academy News Section - Placeholder */}
      {/*
      <section>
        <h2 className="text-2xl font-semibold mb-6">Notícias da Academia</h2>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Nova Simulação: Caso de Sepse</CardTitle></CardHeader>
            <CardContent><p>Teste suas habilidades com nosso novo caso simulado sobre o manejo inicial da sepse.</p></CardContent>
            <CardFooter><Button variant="link">Ver Detalhes</Button></CardFooter>
          </Card>
          <Card>
            <CardHeader><CardTitle>Artigo em Destaque: Vantagens do Raciocínio Bayesiano</CardTitle></CardHeader>
            <CardContent><p>Explore como o pensamento Bayesiano pode aprimorar sua acurácia diagnóstica.</p></CardContent>
            <CardFooter><Button variant="link">Ler Agora</Button></CardFooter>
          </Card>
        </div>
      </section>
      */}

      {/* Disclaimer */}
      <Alert className="mt-8">
        <Info className="h-4 w-4" />
        <AlertTitle>Nota Importante</AlertTitle>
        <AlertDescription>
          A Academia Clínica Dr. Corvus é uma ferramenta educacional. As simulações e exercícios não substituem a experiência clínica real ou a supervisão profissional.
        </AlertDescription>
      </Alert>

      <footer className="text-center py-8 mt-12 border-t">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Dr. Corvus - Assistente de Raciocínio Clínico. Todos os direitos reservados.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Esta plataforma é uma ferramenta de aprendizado e não substitui o julgamento clínico profissional ou a consulta médica direta.
        </p>
      </footer>
    </div>
  );
} 