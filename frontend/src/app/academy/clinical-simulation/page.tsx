"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { sampleCases, ClinicalCase } from '@/components/academy/clinical-simulation/cases';
import SimulationContainer from '@/components/academy/clinical-simulation/SimulationContainer';

function getDifficultyBorderColor(difficulty: 'Básico' | 'Intermediário' | 'Avançado'): string {
  switch (difficulty) {
    case 'Básico': return 'border-l-green-500';
    case 'Intermediário': return 'border-l-yellow-500';
    case 'Avançado': return 'border-l-red-500';
    default: return 'border-l-gray-300';
  }
}

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

      <div>
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Biblioteca de Casos Clínicos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {sampleCases.map((clinicalCase) => (
            <Card key={clinicalCase.id} className={`flex flex-col overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 border-l-4 ${getDifficultyBorderColor(clinicalCase.difficulty)}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-bold text-gray-800">{clinicalCase.title}</CardTitle>
                  <Badge variant={clinicalCase.difficulty === 'Básico' ? 'default' : clinicalCase.difficulty === 'Intermediário' ? 'secondary' : 'destructive'}>
                    {clinicalCase.difficulty}
                  </Badge>
                </div>
                <CardDescription>{clinicalCase.brief}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex flex-wrap gap-2">
                    {clinicalCase.tags?.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleSelectCase(clinicalCase)}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Iniciar Simulação
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

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