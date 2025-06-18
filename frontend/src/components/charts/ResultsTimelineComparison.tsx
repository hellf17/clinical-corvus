import React from 'react';
import ResultsTimelineChart from './ResultsTimelineChart';
import { Exam } from '@/store/patientStore';
import { LabResult } from '@/types/health';

interface ResultsTimelineComparisonProps {
  exams: Exam[];
}

const ResultsTimelineComparison: React.FC<ResultsTimelineComparisonProps> = ({ exams }) => {
  // Detectar todos os testes únicos
  const testNames = React.useMemo(() => {
    const set = new Set<string>();
    exams.forEach(exam => {
      (exam.lab_results || []).forEach(result => {
        if (typeof result.test_name === 'string' && result.test_name) {
          set.add(result.test_name);
        }
      });
    });
    return Array.from(set).sort();
  }, [exams]);

  if (testNames.length === 0) {
    return <div className="text-muted-foreground italic">Nenhum exame laboratorial disponível.</div>;
  }

  return (
    <div className="space-y-4">
      {testNames.map(test => {
        // Extract lab results for the current test
        const testResults: LabResult[] = exams.flatMap(exam => 
          (exam.lab_results || []).filter(result => result.test_name === test)
        );
        
        return (
          <ResultsTimelineChart
            key={test}
            results={testResults} // Pass filtered results
            fixedTest={test}
            title={test}
          />
        );
      })}
    </div>
  );
};

export default ResultsTimelineComparison;
