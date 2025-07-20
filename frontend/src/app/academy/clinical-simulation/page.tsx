"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { ArrowRight, PlayCircle, BookOpen, Search, FileText, HelpCircle, Stethoscope, CheckCircle, Brain } from 'lucide-react';
import { clinicalCases, ClinicalCase } from '@/components/academy/clinical-simulation/cases';
import SimulationContainer from '@/components/academy/clinical-simulation/SimulationContainer';
import { CaseSelector } from '@/components/academy/clinical-simulation/CaseSelector';

export default function ClinicalSimulationPage() {
  const [selectedCase, setSelectedCase] = useState<ClinicalCase | null>(null);

  const handleSelectCase = (clinicalCase: ClinicalCase) => {
    setSelectedCase(clinicalCase);
  };

  const handleExitSimulation = () => {
    setSelectedCase(null);
  };

  if (selectedCase) {
    return <SimulationContainer selectedCase={selectedCase} onExit={handleExitSimulation} />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-12">
      <section className="text-center py-10 academy-gradient-header rounded-xl border border-primary/20 shadow-lg">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white flex items-center justify-center mb-4">
          <PlayCircle className="h-10 w-10 md:h-12 md:w-12 mr-3 text-white" />
          Simulação Clínica SNAPPS
        </h1>
        <p className="mt-2 text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
          Aprimore seu raciocínio clínico com casos interativos guiados pelo Dr. Corvus, utilizando o framework SNAPPS para estruturar sua apresentação de caso.
        </p>
      </section>

      {/* SNAPPS Framework Explanation Section */}
      <section className="my-12">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">O que é o Framework SNAPPS?</h2>
        <p className="text-lg text-gray-600 max-w-4xl mx-auto mb-10 text-center">
          SNAPPS é um método validado de apresentação de casos que estrutura o raciocínio clínico e promove o aprendizado ativo.
          Desenvolvido para estudantes e residentes, ele transforma a apresentação de casos em uma oportunidade de aprendizado.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {/* S - Summarize */}
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-lg font-bold text-blue-700">S</CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="font-medium text-gray-800 mb-1">Summarize</h4>
              <p className="text-sm text-gray-600">Resuma concisamente os dados relevantes do paciente</p>
            </CardContent>
          </Card>
          
          {/* N - Narrow */}
          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                <Search className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle className="text-lg font-bold text-purple-700">N</CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="font-medium text-gray-800 mb-1">Narrow</h4>
              <p className="text-sm text-gray-600">Delimite o diagnóstico diferencial às hipóteses mais prováveis</p>
            </CardContent>
          </Card>
          
          {/* A - Analyze */}
          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Brain className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-lg font-bold text-green-700">A</CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="font-medium text-gray-800 mb-1">Analyze</h4>
              <p className="text-sm text-gray-600">Analise as evidências que apoiam ou refutam cada hipótese</p>
            </CardContent>
          </Card>
          
          {/* P - Probe */}
          <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                <HelpCircle className="h-5 w-5 text-amber-600" />
              </div>
              <CardTitle className="text-lg font-bold text-amber-700">P</CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="font-medium text-gray-800 mb-1">Probe</h4>
              <p className="text-sm text-gray-600">Questione o preceptor sobre incertezas e lacunas de conhecimento</p>
            </CardContent>
          </Card>
          
          {/* P - Plan */}
          <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-2">
                <Stethoscope className="h-5 w-5 text-red-600" />
              </div>
              <CardTitle className="text-lg font-bold text-red-700">P</CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="font-medium text-gray-800 mb-1">Plan</h4>
              <p className="text-sm text-gray-600">Planeje a conduta diagnóstica e terapêutica para o paciente</p>
            </CardContent>
          </Card>
          
          {/* S - Select */}
          <Card className="border-l-4 border-l-indigo-500 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
                <CheckCircle className="h-5 w-5 text-indigo-600" />
              </div>
              <CardTitle className="text-lg font-bold text-indigo-700">S</CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="font-medium text-gray-800 mb-1">Select</h4>
              <p className="text-sm text-gray-600">Selecione um tópico para aprofundar seu conhecimento</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 max-w-4xl mx-auto">
          <h3 className="font-bold text-blue-800 flex items-center mb-3">
            <BookOpen className="h-5 w-5 mr-2" /> Benefícios Comprovados
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            Estudos demonstram que o método SNAPPS promove maior expressão de raciocínio clínico, aumenta a discussão de incertezas 
            e estimula o aprendizado autodirigido, quando comparado a métodos tradicionais de apresentação de casos.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-blue-600 font-bold text-lg">+33%</div>
              <div className="text-xs text-gray-600">Expressão de raciocínio clínico</div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-blue-600 font-bold text-lg">+44%</div>
              <div className="text-xs text-gray-600">Discussão de incertezas</div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-blue-600 font-bold text-lg">+200%</div>
              <div className="text-xs text-gray-600">Aprendizado autodirigido</div>
            </div>
          </div>
        </div>
      </section>
      
      <CaseSelector cases={clinicalCases} onSelectCase={handleSelectCase} />

      {/* Dica de Integração - Movida para antes dos próximos passos */}
      <div className="mt-12 p-6 border rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-sm">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
            <span className="text-lg">💡</span>
          </div>
          <div>
            <h5 className="font-bold text-amber-800 mb-2 text-lg">Dica de Integração</h5>
            <p className="text-sm text-amber-700 leading-relaxed">
              <strong>Aplique o que você aprendeu:</strong> O framework SNAPPS é onde a teoria encontra a prática. Use seus <i>illness scripts</i> para formular hipóteses, aplique a busca da MBE para refinar suas dúvidas e use a metacognição para refletir sobre seu raciocínio a cada passo da simulação.
            </p>
          </div>
        </div>
      </div>

      {/* Próximos Passos na Sua Jornada de Aprendizado */}
      <div className="mt-16 text-center">
        <h2 className="text-3xl font-bold text-gray-800">Próximos Passos</h2>
        <p className="mt-2 mb-10 text-lg text-gray-600 max-w-2xl mx-auto">Continue sua jornada de aprendizado explorando outras áreas da Academia Corvus.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">

          <div className="flex flex-col p-6 bg-white rounded-xl border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="font-bold text-purple-800 text-lg">Medicina Baseada em Evidências</h4>
            </div>
            <p className="flex-grow text-sm text-gray-600 mb-6 text-center leading-relaxed">
              Aprenda a buscar, avaliar e aplicar evidências científicas para complementar seu raciocínio diagnóstico.
            </p>
            <div className="text-center">
              <Link href="/academy/evidence-based-medicine">
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 w-full font-medium"
                >
                  Explorar MBE →
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col p-6 bg-white rounded-xl border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🧠</span>
              </div>
              <h4 className="font-bold text-blue-800 text-lg">Metacognição e Erros Diagnósticos</h4>
            </div>
            <p className="flex-grow text-sm text-gray-600 mb-6 text-center leading-relaxed">
              Desenvolva autoconsciência sobre seu processo de raciocínio e aprenda a evitar vieses cognitivos.
            </p>
            <div className="text-center">
              <Link href="/academy/metacognition-diagnostic-errors">
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 w-full font-medium"
                >
                  Metacognição →
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col p-6 bg-white rounded-xl border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🏛️</span>
              </div>
              <h4 className="font-bold text-green-800 text-lg">Raciocínio Diagnóstico</h4>
            </div>
            <p className="flex-grow text-sm text-gray-600 mb-6 text-center leading-relaxed">
              Revise os pilares do raciocínio clínico, incluindo a construção de scripts de doenças e a representação do problema.
            </p>
            <div className="text-center">
              <Link href="/academy/fundamental-diagnostic-reasoning">
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 w-full font-medium"
                >
                  Revisar Fundamentos →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
          <Link href="/academy">
            <Button variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600">
              <ArrowRight className="mr-2 h-4 w-4 transform rotate-180" /> Voltar para a Academia
            </Button>
          </Link>
      </div>
      
      <Alert className="mt-8">
        <AlertDescription className="text-sm">
          <strong>Aviso Importante:</strong> As simulações clínicas SNAPPS são destinadas para fins educacionais e desenvolvimento de habilidades clínicas. 
          O feedback do Dr. Corvus é baseado em princípios educacionais e não substitui supervisão clínica real ou julgamento médico profissional.
        </AlertDescription>
      </Alert>
    </div>
  );
}