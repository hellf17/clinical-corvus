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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Simulação Clínica SNAPPS
        </h1>
        <p className="mt-4 text-lg leading-8 text-gray-600">
          Aprimore seu raciocínio clínico com casos interativos guiados pelo Dr. Corvus.
        </p>
      </div>

      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Biblioteca de Casos Clínicos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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