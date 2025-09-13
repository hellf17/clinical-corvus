import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { 
  Brain, 
  Lightbulb, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  ExternalLink,
  Search
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import useSWR from 'swr';

interface Diagnosis {
  id: string;
  name: string;
  confidence: number;
  likelihood: 'high' | 'medium' | 'low';
  keyFindings: string[];
  nextSteps: string[];
}

interface TreatmentRecommendation {
  id: string;
  condition: string;
  treatment: string;
  strength: 'strong' | 'moderate' | 'weak';
  evidence: string;
  guidelines: string[];
  monitoring: string[];
}

interface Guideline {
  id: string;
  title: string;
  condition: string;
  recommendation: string;
  strength: 'A' | 'B' | 'C';
  url?: string;
}

interface ClinicalDecisionSupportProps {
  patientId: string;
  className?: string;
}

const fetcher = async ([url, token]: [string, string | null]) => {
  if (!token) {
    throw new Error('Authentication token is not available.');
  }
  
  const response = await fetch(url, {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return 'text-green-600';
  if (confidence >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const getLikelihoodColor = (likelihood: string) => {
  switch (likelihood) {
    case 'high': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStrengthColor = (strength: string) => {
  switch (strength) {
    case 'strong': return 'bg-green-100 text-green-800';
    case 'moderate': return 'bg-yellow-100 text-yellow-800';
    case 'weak': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function ClinicalDecisionSupport({ patientId, className }: ClinicalDecisionSupportProps) {
  const { getToken } = useAuth();
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null);

  const { data: diagnoses, error: diagnosesError } = useSWR<Diagnosis[]>(
    () => {
      const token = getToken();
      return token ? [`/api/clinical/differential-diagnosis/${patientId}`, token] : null;
    }, 
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: treatments, error: treatmentsError } = useSWR<TreatmentRecommendation[]>(
    () => {
      const token = getToken();
      return token ? [`/api/clinical/treatments/${patientId}`, token] : null;
    }, 
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: guidelines, error: guidelinesError } = useSWR<Guideline[]>(
    () => {
      const token = getToken();
      return token ? [`/api/clinical/guidelines/${patientId}`, token] : null;
    }, 
    fetcher,
    { revalidateOnFocus: false }
  );

  const handleGuidelineClick = (url?: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (diagnosesError || treatmentsError || guidelinesError) {
    return (
      <div className={`p-4 ${className}`}>
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Erro ao carregar suporte clínico</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center space-x-3">
        <Brain className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold">Suporte Clínico</h2>
          <p className="text-sm text-muted-foreground">
            Análise diferencial e recomendações baseadas em evidências
          </p>
        </div>
      </div>

      <Tabs defaultValue="diagnoses" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diagnoses" className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <span>Diagnósticos</span>
          </TabsTrigger>
          <TabsTrigger value="treatments" className="flex items-center space-x-2">
            <Lightbulb className="h-4 w-4" />
            <span>Tratamentos</span>
          </TabsTrigger>
          <TabsTrigger value="guidelines" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Orientações</span>
          </TabsTrigger>
        </TabsList>

        {/* Differential Diagnosis */}
        <TabsContent value="diagnoses" className="space-y-4">
          {diagnoses && diagnoses.length > 0 ? (
            <div className="grid gap-4">
              {diagnoses.map((diagnosis) => (
                <Card 
                  key={diagnosis.id}
                  className={`cursor-pointer transition-all ${
                    selectedDiagnosis === diagnosis.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedDiagnosis(
                    selectedDiagnosis === diagnosis.id ? null : diagnosis.id
                  )}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-lg">{diagnosis.name}</h3>
                        <Badge className={getLikelihoodColor(diagnosis.likelihood)}>
                          {diagnosis.likelihood === 'high' && 'Alta'}
                          {diagnosis.likelihood === 'medium' && 'Média'}
                          {diagnosis.likelihood === 'low' && 'Baixa'}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getConfidenceColor(diagnosis.confidence)}`}>
                          {diagnosis.confidence}%
                        </p>
                        <p className="text-xs text-muted-foreground">Confiança</p>
                      </div>
                    </div>

                    {selectedDiagnosis === diagnosis.id && (
                      <div className="space-y-4 mt-4 pt-4 border-t">
                        <div>
                          <h4 className="font-medium mb-2 flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Principais Achados</span>
                          </h4>
                          <ul className="space-y-1">
                            {diagnosis.keyFindings.map((finding, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                                <span className="text-green-500 mt-1">•</span>
                                <span>{finding}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2 flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span>Próximos Passos</span>
                          </h4>
                          <ul className="space-y-1">
                            {diagnosis.nextSteps.map((step, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                                <span className="text-blue-500 mt-1">→</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma análise diferencial disponível
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Treatment Recommendations */}
        <TabsContent value="treatments" className="space-y-4">
          {treatments && treatments.length > 0 ? (
            <div className="grid gap-4">
              {treatments.map((treatment) => (
                <Card 
                  key={treatment.id}
                  className={`cursor-pointer transition-all ${
                    selectedTreatment === treatment.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedTreatment(
                    selectedTreatment === treatment.id ? null : treatment.id
                  )}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{treatment.condition}</h3>
                        <p className="text-sm text-muted-foreground">{treatment.treatment}</p>
                      </div>
                      <Badge className={getStrengthColor(treatment.strength)}>
                        {treatment.strength === 'strong' && 'Forte'}
                        {treatment.strength === 'moderate' && 'Moderada'}
                        {treatment.strength === 'weak' && 'Fraca'}
                      </Badge>
                    </div>

                    {selectedTreatment === treatment.id && (
                      <div className="space-y-4 mt-4 pt-4 border-t">
                        <div>
                          <h4 className="font-medium mb-2">Evidência</h4>
                          <p className="text-sm text-muted-foreground">{treatment.evidence}</p>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Diretrizes</h4>
                          <ul className="space-y-1">
                            {treatment.guidelines.map((guideline, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                                <span className="text-blue-500 mt-1">•</span>
                                <span>{guideline}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Monitoramento</h4>
                          <ul className="space-y-1">
                            {treatment.monitoring.map((item, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                                <span className="text-green-500 mt-1">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma recomendação de tratamento disponível
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Clinical Guidelines */}
        <TabsContent value="guidelines" className="space-y-4">
          {guidelines && guidelines.length > 0 ? (
            <div className="grid gap-4">
              {guidelines.map((guideline) => (
                <Card key={guideline.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold">{guideline.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            Nível {guideline.strength}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {guideline.recommendation}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Condição: {guideline.condition}
                        </p>
                      </div>
                      {guideline.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGuidelineClick(guideline.url)}
                          className="ml-4"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma orientação clínica disponível
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}