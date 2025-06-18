import React, { useMemo, useState, useEffect } from 'react';
import { LabResult } from '@/types/health';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion';
import { Badge } from '@/components/ui/Badge';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/Table";
import { getPatientLabResultsClient } from '@/services/patientService.client';
import { useAuth } from "@clerk/nextjs";
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { AlertTriangle } from 'lucide-react';

interface SystemExamsViewerProps {
  patientId: number;
}

// Categorias de exames organizadas por sistemas (conforme versão Streamlit)
const SYSTEM_CATEGORIES = {
  bloodGas: {
    title: "Gasometria",
    tests: ["pH", "pCO2", "pO2", "HCO3", "BE", "Lactato", "SatO2", "FiO2"]
  },
  electrolytes: {
    title: "Eletrólitos",
    tests: ["Sódio", "Potássio", "Cloro", "Cálcio", "Magnésio", "Fósforo"]
  },
  hematology: {
    title: "Hemograma",
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
  coagulation: {
    title: "Coagulação",
    tests: ["TP", "TTPa", "INR", "Fibrinogênio", "D-dímero"]
  },
  microbiology: {
    title: "Microbiologia",
    tests: ["Hemocultura", "Urocultura", "Cultura de Escarro", "Cultura de Secreção"]
  }
};

export const SystemExamsViewer: React.FC<SystemExamsViewerProps> = ({ patientId }) => {
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
            const response = await getPatientLabResultsClient(patientId, token, { limit: 1000 });
            setLabResults(response.items);
        } catch (err: any) {
            console.error("Failed to fetch lab results for SystemExamsViewer:", err);
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

  const resultsBySystem = useMemo(() => {
    const systems: { [key: string]: Record<string, LabResult[]> } = {};
    
    (Object.keys(SYSTEM_CATEGORIES) as Array<keyof typeof SYSTEM_CATEGORIES>).forEach((system) => {
      systems[system] = {};
      (SYSTEM_CATEGORIES[system as keyof typeof SYSTEM_CATEGORIES] as any).tests.forEach((test: string) => {
        systems[system][test] = [];
      });
    });
    
    const sortedResults = [...labResults].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    sortedResults.forEach(result => {
      for (const [system, info] of Object.entries(SYSTEM_CATEGORIES)) {
        for (const test of info.tests) {
          if (result.test_name.toLowerCase().includes(test.toLowerCase())) { 
            systems[system][test].push(result);
            return;
          }
        }
      }
    });
    
    return systems;
  }, [labResults]);

  const systemsWithResults = useMemo(() => {
    return (Object.keys(resultsBySystem) as Array<keyof typeof SYSTEM_CATEGORIES>)
      .map((system) => {
        const tests = resultsBySystem[system];
        const abnormalCount = Object.values(tests).reduce((count, results) => {
          return count + results.filter(r => r.is_abnormal).length;
        }, 0);
        const totalCount = Object.values(tests).reduce((count, results) => count + results.length, 0);

        return {
          system,
          title: SYSTEM_CATEGORIES[system].title,
          tests,
          abnormalCount,
          totalCount,
        };
      })
      .filter(system => system.totalCount > 0);
  }, [resultsBySystem]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="my-6 text-destructive border-destructive dark:border-destructive [&>svg]:text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar exames</AlertTitle>
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
      <h2 className="text-xl font-semibold">Exames por Sistema</h2>
      
      <Accordion type="multiple" className="w-full">
        {systemsWithResults.map(({ system, title, tests, abnormalCount }) => (
          <AccordionItem key={system} value={system}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex justify-between items-center w-full pr-4">
                <span>{title}</span>
                <Badge variant={abnormalCount > 0 ? 'destructive' : 'secondary'}>
                  {abnormalCount > 0 ? `${abnormalCount} Alterado(s)` : 'Normal'}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Exame</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                      <TableHead className="text-right">Referência</TableHead>
                      <TableHead className="text-right">Data</TableHead>
                      <TableHead className="text-right">Histórico (Últimos 5)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(tests).map(([testName, results]) => {
                      if (results.length === 0) return null;
                      
                      const mostRecent = results[0];
                      const historical = results.slice(1);
                      
                      return (
                        <TableRow key={`${testName}-${mostRecent.result_id || testName}`}>
                          <TableCell className="text-left font-medium">{mostRecent.test_name}</TableCell>
                          <TableCell className={`text-right ${mostRecent.is_abnormal ? 'text-destructive font-semibold' : ''}`}>
                            {mostRecent.value_numeric !== null && mostRecent.value_numeric !== undefined
                              ? `${mostRecent.value_numeric}${mostRecent.unit ? ' ' + mostRecent.unit : ''}`
                              : mostRecent.value_text || '-'}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {mostRecent.reference_range_low !== null && mostRecent.reference_range_high !== null
                              ? `${mostRecent.reference_range_low} - ${mostRecent.reference_range_high}${mostRecent.unit ? ' ' + mostRecent.unit : ''}`
                              : (mostRecent.reference_text || 'N/A')}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {new Date(mostRecent.timestamp).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              {historical.slice(0, 5).map((r, idx) => (
                                <Badge 
                                  key={r.result_id || idx}
                                  variant={r.is_abnormal ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                  title={`${new Date(r.timestamp).toLocaleDateString('pt-BR')}: ${r.value_numeric !== null && r.value_numeric !== undefined ? `${r.value_numeric}${r.unit ? ' ' + r.unit : ''}` : r.value_text || '-'}${r.reference_range_low !== null && r.reference_range_high !== null ? ` (Ref: ${r.reference_range_low} - ${r.reference_range_high}${r.unit ? ' ' + r.unit : ''})` : ''}`}
                                >
                                  {r.value_numeric !== null && r.value_numeric !== undefined ? `${r.value_numeric}` : r.value_text}
                                </Badge>
                              ))}
                              {historical.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{historical.length - 5}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default SystemExamsViewer; 