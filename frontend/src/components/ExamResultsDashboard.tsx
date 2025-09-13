import React, { useMemo, useState, useEffect } from 'react';
import { LabResult } from '@/types/health';
import { EnhancedResultsTimelineChart } from './charts/EnhancedResultsTimelineChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/Table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { AlertTriangle } from 'lucide-react';
import { getPatientLabResultsClient } from '@/services/patientService.client';
import { useAuth } from "@clerk/nextjs";

interface ExamResultsDashboardProps {
  patientId: number;
}

interface ExamCategory {
  title: string;
  tests: string[];
}

interface ExamCategoriesMap {
  [key: string]: ExamCategory;
}

interface ResultWithExam extends LabResult {
  timestamp: string;
}

interface ResultsByCategoryMap {
  [key: string]: ResultWithExam[];
}

interface CategoryWithResults {
  category: string;
  title: string;
  results: ResultWithExam[];
}

// Categorias de exames organizadas por sistemas (conforme versão Streamlit)
const EXAM_CATEGORIES: ExamCategoriesMap = {
  hematology: {
    title: "Sistema Hematológico",
    tests: ["Hemoglobina", "Leucócitos", "Plaquetas", "Hematócrito", "Eritrócitos", "VCM", "HCM", "CHCM", "RDW", "Hemácias"]
  },
  renal: {
    title: "Função Renal", 
    tests: ["Creatinina", "Ureia", "TFG", "Ácido Úrico", "Microalbuminúria"]
  },
  hepatic: {
    title: "Função Hepática",
    tests: ["TGO", "TGP", "GGT", "Fosfatase Alcalina", "Bilirrubina", "Albumina", "Proteínas Totais"]
  },
  electrolytes: {
    title: "Eletrólitos",
    tests: ["Sódio", "Potássio", "Cloro", "Cálcio", "Magnésio", "Fósforo"]
  },
  bloodGas: {
    title: "Gasometria",
    tests: ["pH", "pCO2", "pO2", "HCO3", "BE", "Lactato", "SatO2", "FiO2"]
  },
  cardiac: {
    title: "Marcadores Cardíacos",
    tests: ["Troponina", "CK", "CK-MB", "BNP", "NT-proBNP", "LDH"]
  },
  metabolic: {
    title: "Metabolismo",
    tests: ["Glicose", "HbA1c", "Triglicérides", "Colesterol Total", "HDL", "LDL", "TSH", "T4 Livre"]
  },
  inflammation: {
    title: "Marcadores Inflamatórios",
    tests: ["PCR", "Procalcitonina", "VHS", "Ferritina", "Fibrinogênio", "D-dímero"]
  },
  microbiology: {
    title: "Microbiologia",
    tests: ["Hemocultura", "Urocultura", "Cultura de Escarro", "Cultura de Secreção"]
  }
};

export const ExamResultsDashboard: React.FC<ExamResultsDashboardProps> = ({ patientId }) => {
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not found.");
            
            const response = await getPatientLabResultsClient(patientId, { limit: 1000 });
            setLabResults(response.items);
        } catch (err: any) {
            console.error("Failed to fetch lab results:", err);
            setError(err.message || "Erro ao buscar resultados de exames.");
            setLabResults([]);
        } finally {
            setLoading(false);
        }
    };

    if (patientId) {
        fetchData();
    }
  }, [patientId, getToken]);

  const resultsByCategory = useMemo<ResultsByCategoryMap>(() => {
    const results: ResultsByCategoryMap = {};
    
    Object.keys(EXAM_CATEGORIES).forEach(category => {
      results[category] = [];
    });
    
    labResults?.forEach(result => {
      for (const [category, info] of Object.entries(EXAM_CATEGORIES)) {
        if (info.tests.some(test => result.test_name.toLowerCase().includes(test.toLowerCase()))) {
          const existingResult = results[category].find(r => r.result_id === result.result_id);
          
          if (!existingResult) {
            results[category].push({ ...result });
          }
          break;
        }
      }
    });
    
    return results;
  }, [labResults]);

  const categoriesWithResults = useMemo<CategoryWithResults[]>(() => {
    return Object.entries(resultsByCategory)
      .filter(([_, results]) => results.length > 0)
      .map(([category, results]) => ({
        category,
        title: EXAM_CATEGORIES[category as keyof typeof EXAM_CATEGORIES].title,
        results
      }));
  }, [resultsByCategory]);
  
  const abnormalCount = useMemo(() => {
    return labResults.filter(r => r.is_abnormal).length;
  }, [labResults]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return (
      <Alert className="text-destructive border-destructive dark:border-destructive [&>svg]:text-destructive text-sm">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro ao Carregar Resultados</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (!loading && labResults.length === 0) {
    return (
      <div className="text-center py-12 bg-card text-card-foreground rounded-lg">
        <h3 className="text-lg font-medium mb-2">
          Sem resultados de exames disponíveis
        </h3>
        <p className="text-muted-foreground">
          Faça upload de exames ou verifique se foram processados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total de Resultados</p>
            <p className="text-2xl font-semibold text-card-foreground">{labResults.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Primeiro Resultado</p>
            <p className="text-lg font-semibold text-card-foreground">
              {labResults.length > 0 
                ? new Date(Math.min(...labResults.map(r => new Date(r.timestamp).getTime())))
                    .toLocaleDateString('pt-BR')
                : '-'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Último Resultado</p>
            <p className="text-lg font-semibold text-card-foreground">
              {labResults.length > 0
                ? new Date(Math.max(...labResults.map(r => new Date(r.timestamp).getTime())))
                    .toLocaleDateString('pt-BR')
                : '-'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Valores Alterados</p>
            <p className={`text-2xl font-semibold ${abnormalCount > 0 ? 'text-destructive' : 'text-success'}`}>
              {abnormalCount}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <h2 className="text-xl font-semibold mt-8">Resultados por Sistema</h2>
      
      <div className="space-y-4">
        {categoriesWithResults.map(({ category, title, results }) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Exame</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                      <TableHead className="text-right">Referência</TableHead>
                      <TableHead className="text-center">Data</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 5)
                      .map((result) => (
                        <TableRow key={result.result_id}>
                          <TableCell className="text-left font-medium">{result.test_name}</TableCell>
                          <TableCell className="text-right">
                            {result.value_numeric !== null && result.value_numeric !== undefined
                              ? `${result.value_numeric}${result.unit ? ' ' + result.unit : ''}`
                              : result.value_text || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {result.reference_range_low !== null && result.reference_range_high !== null
                              ? `${result.reference_range_low} - ${result.reference_range_high}${result.unit ? ' ' + result.unit : ''}`
                              : result.reference_text || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {new Date(result.timestamp).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-center">
                            {result.is_abnormal ? (
                              <Badge variant="destructive">Alterado</Badge>
                            ) : (
                              <Badge variant="outline">Normal</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              {results.length > 5 && (
                <div className="text-right mt-2 space-x-2">
                  <span className="text-sm text-muted-foreground">
                    Mostrando 5 de {results.length} resultados
                  </span>
                  <Button variant="link" size="sm" disabled>Ver Todos</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <h2 className="text-xl font-semibold mt-8">Evolução Temporal</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categoriesWithResults.slice(0, 2).map(({ category, title }) => {
          const chartData = labResults.filter(result => 
              EXAM_CATEGORIES[category].tests.some(test => 
                  result.test_name.toLowerCase().includes(test.toLowerCase())
              )
              && result.value_numeric !== null && result.value_numeric !== undefined 
          );

          if (chartData.length < 1) return null; 
          
          return (
            <EnhancedResultsTimelineChart 
              key={category}
              results={chartData}
              title={title}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ExamResultsDashboard;