'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { PlayCircle, Search, Target, Stethoscope, Brain, Library, Activity, Zap, Eye } from "lucide-react";
import { ClinicalCase, specialtyIcons } from './cases';
import { cn } from '@/lib/utils';

interface CaseSelectorProps {
  cases: ClinicalCase[];
  onSelectCase: (clinicalCase: ClinicalCase) => void;
}

const getDifficultyClass = (level: 'Iniciante' | 'Intermediário' | 'Avançado') => {
  switch (level) {
    case 'Iniciante': return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-500' };
    case 'Intermediário': return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-500' };
    case 'Avançado': return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-500' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-500' };
  }
};

export function CaseSelector({ cases, onSelectCase }: CaseSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  const allSpecialties = useMemo(() => {
    const specialties = new Set<string>();
    cases.forEach(c => c.specialties.forEach(s => specialties.add(s)));
    return Array.from(specialties);
  }, [cases]);

  const handleSpecialtyClick = (specialty: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(specialty) 
        ? prev.filter(s => s !== specialty) 
        : [...prev, specialty]
    );
  };

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchesSearch = searchTerm === '' || 
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.brief.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSpecialty = selectedSpecialties.length === 0 || 
        selectedSpecialties.every(s => c.specialties.includes(s));

      return matchesSearch && matchesSpecialty;
    });
  }, [cases, searchTerm, selectedSpecialties]);

  return (
    <div className="space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
          Biblioteca de Casos Clínicos
        </h1>
        <p className="mt-2 text-lg text-gray-600 leading-relaxed">
          Escolha um desafio e aprimore seu raciocínio clínico.
        </p>
        <div className="flex items-center justify-center space-x-2">
          <Activity className="h-5 w-5 text-cyan-500" />
          <span className="text-sm text-gray-500">Simulação Clínica Interativa</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-500" />
          <Input 
            placeholder="Pesquisar por título ou palavra-chave..."
            className="pl-10 border-cyan-200 focus:border-cyan-500 focus:ring-cyan-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 flex items-center">
            <Zap className="mr-2 h-4 w-4 text-cyan-500" />
            Filtrar por especialidade:
          </span>
          <Badge 
            onClick={() => setSelectedSpecialties([])} 
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md',
              selectedSpecialties.length === 0 
                ? 'bg-cyan-600 text-white hover:bg-cyan-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
            )}
          >
            Todas
          </Badge>
          {allSpecialties.map(specialty => (
            <Badge 
              key={specialty} 
              onClick={() => handleSpecialtyClick(specialty)} 
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md',
                selectedSpecialties.includes(specialty) 
                  ? 'bg-cyan-600 text-white hover:bg-cyan-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
              )}
            >
              {specialty}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {filteredCases.map((clinicalCase) => {
          const difficultyClass = getDifficultyClass(clinicalCase.difficulty.level);
          const borderClass = difficultyClass.border;

          return (
            <Card key={clinicalCase.id} className={cn("group flex flex-col hover:shadow-2xl transition-all duration-300 border-l-8 rounded-lg relative overflow-hidden", borderClass)}>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <CardHeader className="relative z-10">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-2xl font-bold text-gray-900 group-hover:text-cyan-600 transition-colors duration-200">
                    {clinicalCase.title}
                  </CardTitle>
                  <Badge className={cn("whitespace-nowrap ml-4 shadow-sm", difficultyClass.bg, difficultyClass.text)}>
                    {clinicalCase.difficulty.level}
                  </Badge>
                </div>
                <CardDescription className="text-gray-700 !mt-3 text-base leading-relaxed">
                  {clinicalCase.brief}
                </CardDescription>
                <Badge variant="secondary" className="mt-2 text-sm font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
                  {clinicalCase.difficulty.focus}
                </Badge>
              </CardHeader>
              <CardContent className="flex-grow space-y-4 pt-0 relative z-10">
                 <div className="flex items-center gap-3 pt-2">
                   <h4 className="font-semibold text-gray-900 flex items-center">
                     <Eye className="mr-2 h-4 w-4 text-cyan-600" />
                     Especialidades:
                   </h4>
                  {clinicalCase.specialties.map((s) => {
                    const SIcon = specialtyIcons[s] || Stethoscope;
                    return <SIcon key={s} className="h-6 w-6 text-cyan-600 hover:text-cyan-700 transition-colors" title={s} />;
                  })}
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center text-gray-900">
                    <Target className="h-5 w-5 mr-2 text-cyan-600"/> 
                    Objetivos de Aprendizagem:
                  </h4>
                  <ul className="list-disc list-inside text-sm space-y-1.5 text-gray-700 pl-2">
                    {clinicalCase.learning_objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="mt-auto relative z-10">
                <Button
                  onClick={() => onSelectCase(clinicalCase)}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                  size="lg"
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Iniciar Simulação
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
      {filteredCases.length === 0 && (
        <div className="text-center py-12 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200">
          <Brain className="mx-auto h-12 w-12 text-cyan-600 mb-4" />
          <h3 className="text-lg font-semibold text-cyan-800 mb-2">Nenhum caso encontrado</h3>
          <p className="text-cyan-700">Nenhum caso clínico encontrado com os filtros selecionados.</p>
          <p className="text-sm text-cyan-600 mt-2">Tente ajustar os filtros ou termo de busca.</p>
        </div>
      )}
    </div>
  );
}
