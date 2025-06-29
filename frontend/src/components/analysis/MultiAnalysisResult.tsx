'use client';

import React, { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/Tabs"; // Ensure casing matches your components/ui/tabs.ts
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table"; // Ensure casing matches your components/ui/table.ts
import { AnalysisResult as AnalysisResultType, FrontendAlertType } from '@/types/analysis';
import { LabResult as LabResultFrontend } from '@/types/health'; // Corrected import for LabResult
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, Info, CheckCircle, AlertCircle, Copy } from 'lucide-react';

// Defined order of tabs
const TAB_ORDER = [
  'hematology',
  'inflammation',
  'cardiac',
  'renal',
  'electrolytes',
  'urinalysis',
  'bloodGas',
  'hepatic', // Coagulation will be merged into this
  'pancreatic',
  'metabolic',
  'microbiology',
  'outros'
];

// Mapping from backend category keys to frontend display titles
const EXAM_CATEGORIES_MAP: Record<string, { title: string }> = {
  hematology: { title: "Hematológicos" }, // Changed title
  renal: { title: "Função Renal" },
  hepatic: { title: "Função Hepática" },
  electrolytes: { title: "Eletrólitos" },
  bloodGas: { title: "Gasometria" },
  cardiac: { title: "Marcadores Cardíacos" },
  metabolic: { title: "Metabolismo" },
  inflammation: { title: "Marcadores Inflamatórios" },
  microbiology: { title: "Microbiologia" },
  pancreatic: { title: "Função Pancreática" },
  urinalysis: { title: "Urinálise" },
  coagulation: { title: "Coagulação" }, // Kept for data access, but won't be a separate tab
  outros: { title: "Outros Resultados" },
};

interface MultiAnalysisResultProps {
  results: { [key: string]: AnalysisResultType };
}

// Helper to parse reference strings like "70-100" or "<100" or ">70"
const parseReferenceRange = (refStr: string | undefined | null): { low: number | null, high: number | null, text: string | null } => {
  if (!refStr) return { low: null, high: null, text: 'N/A' };
  
  const text = refStr.toString(); // Ensure it's a string

  if (text.includes('-')) {
    const parts = text.split('-').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { low: parts[0], high: parts[1], text: text };
    }
  } else if (text.startsWith('<')) {
    const val = parseFloat(text.substring(1).trim());
    if (!isNaN(val)) return { low: null, high: val, text: text };
  } else if (text.startsWith('>')) {
    const val = parseFloat(text.substring(1).trim());
    if (!isNaN(val)) return { low: val, high: null, text: text };
  }
  // If it's a single number, treat it as an upper limit if context suggests, or just text
  const singleNum = parseFloat(text);
  if (!isNaN(singleNum) && (text.match(/^\\d+(\\.\\d+)?$/) || text.match(/^<=\\s*\\d+(\\.\\d+)?$/) || text.match(/^>=\\s*\\d+(\\.\\d+)?$/) )) {
     // Heuristic: if it's just a number, maybe it's an upper limit, or a specific value.
     // This part is tricky without more context on how single-value refs are meant.
     // For now, if it's purely numeric, let's assume it's an upper bound for simplicity, common for some tests.
     // Or better, keep it as text if it's not clearly a range.
     // Let's stick to clear patterns or return as text.
     // If just "100", it's ambiguous. Better to treat as text.
  }
  return { low: null, high: null, text: text }; // Default to text if not parsable into low/high
};


const MultiAnalysisResult: React.FC<MultiAnalysisResultProps> = ({ results }) => {
  const [copiedCategory, setCopiedCategory] = useState<string | null>(null);

  if (!results || Object.keys(results).length === 0) {
    return <p className="text-center text-muted-foreground">Nenhum resultado de análise disponível.</p>;
  }

  // Get all available category keys from results
  const allResultKeys = Object.keys(results);

  // Filter and order categories based on TAB_ORDER
  let orderedAvailableCategories = TAB_ORDER.filter(key => allResultKeys.includes(key) && key !== 'coagulation');
  
  // Add any other categories from results that are not in TAB_ORDER (except 'outros' and 'coagulation')
  // and are in EXAM_CATEGORIES_MAP
  const remainingCategories = allResultKeys.filter(
    key => !TAB_ORDER.includes(key) && key !== 'coagulation' && EXAM_CATEGORIES_MAP[key]
  );
  orderedAvailableCategories = [...orderedAvailableCategories, ...remainingCategories];

  // Ensure 'outros' is last if it exists and was filtered out initially or added via remaining
  if (allResultKeys.includes('outros') && !orderedAvailableCategories.includes('outros')) {
    orderedAvailableCategories.push('outros');
  } else if (allResultKeys.includes('outros')) {
    orderedAvailableCategories = orderedAvailableCategories.filter(key => key !== 'outros');
    orderedAvailableCategories.push('outros');
  }
  
  // Remove duplicates just in case, keeping the first occurrence (which respects TAB_ORDER)
  orderedAvailableCategories = [...new Set(orderedAvailableCategories)];

  const defaultTab = orderedAvailableCategories.length > 0 ? orderedAvailableCategories[0] : (allResultKeys.length > 0 ? allResultKeys[0] : 'outros');

  const handleCopyToClipboard = (categoryKey: string, labResults: LabResultFrontend[]) => {
    if (labResults.length === 0) return;

    const textToCopy = labResults.map(lr => {
      const resultValue = lr.value_numeric !== null && lr.value_numeric !== undefined 
        ? lr.value_numeric 
        : (lr.value_text || 'N/A');
      const reference = lr.reference_text || 
        (lr.reference_range_low !== null && lr.reference_range_high !== null 
          ? `${lr.reference_range_low} - ${lr.reference_range_high}` 
          : 'N/A');
      return `Exame: ${lr.test_name}, Resultado: ${resultValue} ${lr.unit || ''}, Referência: ${reference}`;
    }).join('\n');

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopiedCategory(categoryKey);
        setTimeout(() => setCopiedCategory(null), 2000); // Reset after 2 seconds
      })
      .catch(err => {
        console.error("Falha ao copiar resultados: ", err);
        // Consider adding user feedback for error, e.g., a toast notification
      });
  };

  return (
    <Tabs defaultValue={defaultTab} className="w-full bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-lg shadow-md text-gray-800 dark:text-slate-100">
      <TabsList className="flex flex-wrap gap-2 mb-8 border-b border-blue-200/70 dark:border-blue-800/40 pb-2 min-h-[40px]">
        {orderedAvailableCategories.map((categoryKey) => {
          const categoryInfo = EXAM_CATEGORIES_MAP[categoryKey];
          // Do not render a tab trigger for 'coagulation' as it's merged
          if (!categoryInfo || categoryKey === 'coagulation') return null; 
          return (
            <TabsTrigger key={categoryKey} value={categoryKey} className="text-xs sm:text-sm px-3 py-1.5 data-[state=active]:bg-blue-100/70 data-[state=active]:text-blue-800/90 dark:data-[state=active]:bg-blue-800/20 dark:data-[state=active]:text-blue-200/90">
              {categoryInfo.title}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {orderedAvailableCategories.map((categoryKey) => {
        const categoryInfo = EXAM_CATEGORIES_MAP[categoryKey];
        if (!categoryInfo || categoryKey === 'coagulation') return null; // Don't render content for 'coagulation' separately

        let currentCategoryData = results[categoryKey];
        let coagulationData = null;

        // If current category is 'hepatic', try to merge 'coagulation' data
        if (categoryKey === 'hepatic' && results.coagulation) {
          coagulationData = results.coagulation;
          const mergedInterpretation = [
            currentCategoryData?.interpretation,
            coagulationData?.interpretation
          ].filter(Boolean).join('\n\nCoagulação:\n');
          
          const mergedAbnormalities = [
            ...(currentCategoryData?.abnormalities || []),
            ...(coagulationData?.abnormalities || [])
          ];
          const mergedRecommendations = [
            ...(currentCategoryData?.recommendations || []),
            ...(coagulationData?.recommendations || [])
          ];
          const mergedLabResults = [
            ...(currentCategoryData?.details?.lab_results || []),
            ...(coagulationData?.details?.lab_results || [])
          ];
          // Scores and alerts are usually category-specific, less likely to merge cleanly unless designed for it.
          // For now, keep scores/alerts from the primary category ('hepatic')
          // Or, if coagulation has specific scores/alerts, decide how to display them (e.g., separate section within tab)

          currentCategoryData = {
            ...currentCategoryData, // Takes hepatic's title, etc.
            interpretation: mergedInterpretation || "Interpretação não disponível.",
            abnormalities: [...new Set(mergedAbnormalities)],
            is_critical: (currentCategoryData?.is_critical || false) || (coagulationData?.is_critical || false),
            recommendations: [...new Set(mergedRecommendations)],
            details: {
              ...(currentCategoryData?.details),
              lab_results: mergedLabResults,
              // score_results: currentCategoryData?.details?.score_results, // from hepatic
              // alerts: currentCategoryData?.details?.alerts, // from hepatic
              // Optionally, if coagulation has its own scores/alerts, append or show separately:
              // coagulation_score_results: coagulationData?.details?.score_results,
              // coagulation_alerts: coagulationData?.details?.alerts,
            }
          };
        }

        const interpretation = currentCategoryData?.interpretation || "Interpretação não disponível ou erro na análise.";
        const abnormalities = currentCategoryData?.abnormalities || [];
        const is_critical = currentCategoryData?.is_critical || false;
        const recommendations = currentCategoryData?.recommendations || [];
        const details = currentCategoryData?.details;
        
        let labResults: LabResultFrontend[] = [];
        const scoreResults = details?.score_results || [];

        // SIMPLIFIED LOGIC for labResults:
        if (details?.lab_results && Array.isArray(details.lab_results)) {
          labResults = details.lab_results;
        }

        // Correctly source alerts from details
        const alertsToDisplay: FrontendAlertType[] = details?.alerts || [];

        return (
          <TabsContent key={categoryKey} value={categoryKey}>
            <Card className="overflow-hidden shadow-none border-0 bg-transparent dark:bg-transparent">
              <CardHeader className="bg-blue-50/70 dark:bg-blue-900/15 p-4 rounded-t-md">
                <CardTitle className="flex items-center justify-between text-lg sm:text-xl text-blue-800/90 dark:text-blue-300/90">
                  {categoryInfo.title}
                  {is_critical && (
                    <Badge variant="destructive" className="ml-2 flex items-center text-xs sm:text-sm py-1 px-2">
                      <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> Crítico
                    </Badge>
                  )}
                </CardTitle>
                {interpretation && <CardDescription className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">{interpretation}</CardDescription>}
              </CardHeader>
              <CardContent className="p-4 space-y-4 sm:space-y-6">
                {abnormalities && abnormalities.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-base sm:text-md mb-1.5 flex items-center"><AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-yellow-600 dark:text-yellow-500"/>Alterações Notáveis:</h4>
                    <ul className="list-disc list-inside pl-2 space-y-0.5 text-sm">
                      {abnormalities.map((abnormality: string, idx: number) => (
                        <li key={idx}>{abnormality}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {recommendations && recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-base sm:text-md mb-1.5 flex items-center"><Info className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600 dark:text-blue-500"/>Recomendações:</h4>
                    <ul className="list-disc list-inside pl-2 space-y-0.5 text-sm">
                      {recommendations.map((rec: string, idx: number) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {alertsToDisplay && alertsToDisplay.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-base sm:text-md mb-1.5 flex items-center"><AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-orange-600 dark:text-orange-500"/>Alertas Gerados:</h4>
                    <div className="flex flex-wrap gap-2">
                      {alertsToDisplay.map((alert: FrontendAlertType, idx: number) => (
                        <Badge key={idx} variant={alert.severity === 'critical' || alert.severity === 'high' ? 'destructive' : (alert.severity === 'medium' ? 'default' : 'default')} className="p-1.5 px-2.5 text-xs">
                          {alert.message} {alert.value && `(${alert.value} ${alert.reference ? 'Ref: ' + alert.reference : ''})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {labResults.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <h4 className="font-semibold text-base sm:text-md">Resultados Laboratoriais Detalhados:</h4>
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => handleCopyToClipboard(categoryKey, labResults)}
                        className="text-xs p-1.5 h-auto"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {copiedCategory === categoryKey ? "Copiado!" : "Copiar Dados"}
                      </Button>
                    </div>
                    <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-blue-50/70 dark:bg-blue-900/15">
                          <TableRow>
                            <TableHead className="w-[180px] min-w-[150px] px-3 py-2 text-xs sm:text-sm font-semibold text-blue-800/90 dark:text-blue-300/90">Exame</TableHead>
                            <TableHead className="px-3 py-2 text-xs sm:text-sm font-semibold text-blue-800/90 dark:text-blue-300/90">Resultado</TableHead>
                            <TableHead className="px-3 py-2 text-xs sm:text-sm font-semibold text-blue-800/90 dark:text-blue-300/90">Unidade</TableHead>
                            <TableHead className="min-w-[120px] px-3 py-2 text-xs sm:text-sm font-semibold text-blue-800/90 dark:text-blue-300/90">Referência</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {labResults.map((lr, idx) => {
                            let isAbnormalNumeric = false;
                            if (lr.value_numeric !== null && lr.value_numeric !== undefined && 
                                lr.reference_range_low !== null && lr.reference_range_low !== undefined &&
                                lr.reference_range_high !== null && lr.reference_range_high !== undefined) {
                                isAbnormalNumeric = lr.value_numeric < lr.reference_range_low || lr.value_numeric > lr.reference_range_high;
                            }
                            const isAbnormal = lr.is_abnormal !== undefined && lr.is_abnormal !== null ? lr.is_abnormal : isAbnormalNumeric;
                            
                            return (
                              <TableRow key={`${lr.test_name}-${idx}`} className={`${isAbnormal ? 'bg-amber-50/70 dark:bg-amber-950/10' : 'bg-white dark:bg-slate-900/10'} hover:bg-blue-50/40 dark:hover:bg-blue-900/15 border-b border-slate-100 dark:border-slate-800/40`}>
                                <TableCell className={`font-medium px-3 py-1.5 text-xs sm:text-sm ${isAbnormal ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>{lr.test_name}</TableCell>
                                <TableCell className={`px-3 py-1.5 text-xs sm:text-sm ${isAbnormal ? 'font-bold text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {lr.value_numeric !== null && lr.value_numeric !== undefined ? lr.value_numeric : (lr.value_text || 'N/A')}
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">{lr.unit || 'N/A'}</TableCell>
                                <TableCell className="px-3 py-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                  {lr.reference_text || (lr.reference_range_low !== null && lr.reference_range_high !== null 
                                    ? `${lr.reference_range_low} - ${lr.reference_range_high}` 
                                    : 'N/A')}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {scoreResults.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-base sm:text-md mb-1.5 flex items-center"><CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-600 dark:text-green-500"/>Scores Calculados:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {scoreResults.map((score, idx) => (
                      <Card key={idx} className="bg-blue-50/70 dark:bg-blue-900/15 shadow-sm">
                        <CardHeader className="pb-1.5 pt-2.5 px-3">
                          <CardTitle className="text-xs sm:text-sm font-semibold text-blue-800/90 dark:text-blue-300/90">{score.score_name || 'Score'}</CardTitle>
                          <CardDescription className="text-xs text-slate-600 dark:text-slate-400">Valor: {score.score_value} {score.category && `(${score.category})`}</CardDescription>
                        </CardHeader>
                        {score.interpretation && (
                          <CardContent className="text-xs px-3 pb-2 text-slate-700 dark:text-slate-300">
                            <p>{score.interpretation}</p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                    </div>
                  </div>
                )}

                {!labResults.length && !scoreResults.length && !alertsToDisplay.length && (!abnormalities || abnormalities.length === 0) && (!recommendations || recommendations.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum detalhe específico para exibir nesta categoria.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

export default MultiAnalysisResult; 