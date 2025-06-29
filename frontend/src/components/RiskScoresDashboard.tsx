'use client';
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Patient } from '@/store/patientStore';
import { LabResult } from '@/types/health';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useUIStore } from '@/store/uiStore';
import scoreService from '@/services/scoreService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { AlertTriangle } from 'lucide-react';

interface RiskScoresDashboardProps {
  patient: Patient | null;
}

// Define types for score components
interface ScoreComponent {
  score: number;
  description: string;
  value: string;
}

interface SofaScoreComponents {
  respiratory: ScoreComponent;
  coagulation: ScoreComponent;
  liver: ScoreComponent;
  cardiovascular: ScoreComponent;
  cns: ScoreComponent;
  renal: ScoreComponent;
  total: number;
}

interface QSofaComponent {
  present: boolean;
  description: string;
}

interface QSofaScoreComponents {
  respiratoryRate: QSofaComponent;
  alteredMental: QSofaComponent;
  lowBP: QSofaComponent;
  total: number;
}

interface RiskLevel {
  level: string;
  text: string;
  variant: BadgeProps['variant'];
}

interface ApacheScoreComponents {
  age: number;
  temperature: number;
  meanArterialPressure: number;
  heartRate: number;
  respiratoryRate: number;
  oxygenation: number;
  arterialPH: number;
  sodium: number;
  potassium: number;
  creatinine: number;
  hematocrit: number;
  wbc: number;
  gcs: number;
  chronicHealth: number;
  total: number;
}

// Define types for scores and errors (assuming structure)
interface ScoreResult { 
  score?: number | null; 
  interpretation?: string;
  estimated_mortality?: number; 
  category?: string;
  mortality_risk?: number;
}
interface GfrResult { tfg_ml_min_173m2?: number | null; classification_kdigo?: string; }
interface ApiScores {
    sofa: ScoreResult | null;
    qsofa: ScoreResult | null;
    apache: ScoreResult | null;
    news2: ScoreResult | null;
    gfr: GfrResult | null;
}
interface ScoreError {
    sofa: Error | null;
    qsofa: Error | null;
    apache: Error | null;
    news2: Error | null;
    gfr: Error | null;
}

export const RiskScoresDashboard: React.FC<RiskScoresDashboardProps> = ({ patient }) => {
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState({
    sofa: false,
    qsofa: false,
    apache: false
  });
  const [error, setError] = useState<ScoreError>({ sofa: null, qsofa: null, apache: null, news2: null, gfr: null });
  const [apiScores, setApiScores] = useState<ApiScores>({ sofa: null, qsofa: null, apache: null, news2: null, gfr: null });

  const { exams, vitalSigns } = patient || {};

  // Always call hooks at the top of the component!
  // Defensive: if exams is empty, mostRecentExam will be undefined
  const mostRecentExam = useMemo(() => {
    if (!exams || exams.length === 0) return undefined;
    const validExams = exams.filter(exam => exam.exam_timestamp);
    if (validExams.length === 0) return undefined;
    return [...validExams].sort(
      (a, b) => new Date(b.exam_timestamp!).getTime() - new Date(a.exam_timestamp!).getTime()
    )[0];
  }, [exams]);

  // Debounce utility (simple version)
  function useDebouncedEffect(effect: () => void, deps: any[], delay: number) {
    React.useEffect(() => {
      const handler = setTimeout(() => effect(), delay);
      return () => clearTimeout(handler);
      // eslint-disable-next-line
    }, [...deps, delay]);
  }

  // --- API calls with error handling ---
  const calculateSofaScore = useCallback(async () => {
    setLoading((prev) => ({ ...prev, sofa: true }));
    setError((prev) => ({ ...prev, sofa: null }));
    try {
      // TODO: Implement actual SOFA score calculation API call
      // For now, let's log the dependencies to satisfy ESLint and show intent
      console.log('Attempting to calculate SOFA score with:', mostRecentExam, vitalSigns);
      // const score = await scoreService.calculateSofa({ exams: mostRecentExam ? [mostRecentExam] : [], vitalSigns });
      // setApiScores((prev) => ({ ...prev, sofa: score }));
      // Simulate some delay if needed for loading state
      await new Promise(resolve => setTimeout(resolve, 100)); // Placeholder for async operation
    } catch (e: any) {
      console.error('Error calculating SOFA score:', e);
      setError((prev) => ({ ...prev, sofa: e instanceof Error ? e : new Error(String(e)) }));
      setApiScores((prev) => ({ ...prev, sofa: null }));
    } finally {
      setLoading((prev) => ({ ...prev, sofa: false }));
    }
  }, [mostRecentExam, vitalSigns]);

  const calculateQSofaScore = useCallback(async () => {
    setLoading((prev) => ({ ...prev, qsofa: true }));
    setError((prev) => ({ ...prev, qsofa: null }));
    try {
      const score = await scoreService.calculateQSofa({ vitalSigns });
      setApiScores((prev) => ({ ...prev, qsofa: score }));
    } catch (e: any) {
      setError((prev) => ({ ...prev, qsofa: e }));
      setApiScores((prev) => ({ ...prev, qsofa: null }));
    } finally {
      setLoading((prev) => ({ ...prev, qsofa: false }));
    }
  }, [vitalSigns]);

  const calculateApacheScore = useCallback(async () => {
    setLoading((prev) => ({ ...prev, apache: true }));
    setError((prev) => ({ ...prev, apache: null }));
    try {
      const score = await scoreService.calculateApache2({ exams, vitalSigns, dateOfBirth: patient?.birthDate });
      setApiScores((prev) => ({ ...prev, apache: score }));
    } catch (e: any) {
      setError((prev) => ({ ...prev, apache: e }));
      setApiScores((prev) => ({ ...prev, apache: null }));
    } finally {
      setLoading((prev) => ({ ...prev, apache: false }));
    }
  }, [exams, vitalSigns, patient?.birthDate]);

  // Automatically recalculate SOFA via API when mostRecentExam or vitalSigns change
  useDebouncedEffect(() => {
    if (mostRecentExam && vitalSigns && vitalSigns.length > 0) {
      calculateSofaScore();
    }
  }, [mostRecentExam, vitalSigns], 500);

  // Automatically recalculate qSOFA via API when vitalSigns change
  useDebouncedEffect(() => {
    if (vitalSigns && vitalSigns.length > 0) {
      calculateQSofaScore();
    }
  }, [vitalSigns], 500);

  // Automatically recalculate APACHE II via API when mostRecentExam, vitalSigns, or dateOfBirth change
  useDebouncedEffect(() => {
    if (mostRecentExam && vitalSigns && vitalSigns.length > 0 && patient?.birthDate) {
      calculateApacheScore();
    }
  }, [mostRecentExam, vitalSigns, patient?.birthDate], 500);

  // Calculate SOFA score components
  const sofaScore = useMemo<SofaScoreComponents>(() => {
    // Initialize score components
    const components: SofaScoreComponents = {
      respiratory: { score: 0, description: 'Sistema Respiratório', value: '-' },
      coagulation: { score: 0, description: 'Coagulação', value: '-' },
      liver: { score: 0, description: 'Função Hepática', value: '-' },
      cardiovascular: { score: 0, description: 'Sistema Cardiovascular', value: '-' },
      cns: { score: 0, description: 'Sistema Nervoso Central', value: '-' },
      renal: { score: 0, description: 'Função Renal', value: '-' },
      total: 0
    };

    // Check for missing data
    if (!mostRecentExam || !mostRecentExam.lab_results) {
      return components;
    }

    const findResult = (testName: string): LabResult | undefined => {
      return mostRecentExam.lab_results.find(r => 
        r.test_name?.toLowerCase().includes(testName.toLowerCase())
      );
    };

    // Respiratory - PaO2/FiO2
    const po2Result = findResult('pO2');
    const fio2Result = findResult('FiO2');
    if (po2Result?.value_numeric && fio2Result?.value_numeric) {
      const pao2 = po2Result.value_numeric;
      const fio2 = fio2Result.value_numeric;
      if (fio2 > 1) {
        const ratio = pao2 / (fio2 / 100);
        components.respiratory.value = `${ratio.toFixed(0)} mmHg`;
        if (ratio < 100) components.respiratory.score = 4;
        else if (ratio < 200) components.respiratory.score = 3;
        else if (ratio < 300) components.respiratory.score = 2;
        else if (ratio < 400) components.respiratory.score = 1;
      } else if (fio2 > 0) {
        const ratio = pao2 / fio2;
        components.respiratory.value = `${ratio.toFixed(0)} mmHg`;
        if (ratio < 100) components.respiratory.score = 4;
        else if (ratio < 200) components.respiratory.score = 3;
        else if (ratio < 300) components.respiratory.score = 2;
        else if (ratio < 400) components.respiratory.score = 1;
      }
    }

    // Coagulation - Platelets
    const plateletsResult = findResult('Plaquetas');
    if (plateletsResult?.value_numeric !== undefined && plateletsResult?.value_numeric !== null) {
      const platelets = plateletsResult.value_numeric;
      
      components.coagulation.value = `${platelets} ${plateletsResult.unit ?? ''}`;
      
      if (platelets < 20) components.coagulation.score = 4;
      else if (platelets < 50) components.coagulation.score = 3;
      else if (platelets < 100) components.coagulation.score = 2;
      else if (platelets < 150) components.coagulation.score = 1;
    }

    // Liver - Bilirubin
    const bilirubinResult = findResult('Bilirrubina');
    if (bilirubinResult?.value_numeric !== undefined && bilirubinResult?.value_numeric !== null) {
      const bilirubin = bilirubinResult.value_numeric;
      
      components.liver.value = `${bilirubin} ${bilirubinResult.unit ?? ''}`;
      
      if (bilirubin > 12) components.liver.score = 4;
      else if (bilirubin > 6) components.liver.score = 3;
      else if (bilirubin > 2) components.liver.score = 2;
      else if (bilirubin > 1.2) components.liver.score = 1;
    }

    // Cardiovascular - Mean Arterial Pressure or vasopressors
    // For simplicity, just check if specific results exist - in a real application,
    // you'd want to get this from vital signs or medication records

    // Renal - Creatinine
    const creatinineResult = findResult('Creatinina');
    if (creatinineResult?.value_numeric !== undefined && creatinineResult?.value_numeric !== null) {
      const creatinine = creatinineResult.value_numeric;
      
      components.renal.value = `${creatinine} ${creatinineResult.unit ?? ''}`;
      
      if (creatinine > 5) components.renal.score = 4;
      else if (creatinine > 3.5) components.renal.score = 3;
      else if (creatinine > 2) components.renal.score = 2;
      else if (creatinine > 1.2) components.renal.score = 1;
    }

    // Calculate total score
    components.total = Object.entries(components)
      .filter(([key, item]) => key !== 'total' && typeof item === 'object' && 'score' in item)
      .reduce((sum, [_, item]) => sum + (item as ScoreComponent).score, 0);

    return components;
  }, [mostRecentExam]);

  // Calculate qSOFA score using real patient data from vital signs
  const qSofaScore = useMemo<QSofaScoreComponents>(() => {
    let score = 0;
    const components: QSofaScoreComponents = {
      respiratoryRate: { present: false, description: 'Frequência Respiratória ≥ 22/min' },
      alteredMental: { present: false, description: 'Alteração do Estado Mental (Glasgow < 15)' },
      lowBP: { present: false, description: 'Pressão Arterial Sistólica ≤ 100 mmHg' },
      total: 0
    };

    // Use the most recent vital signs if available
    if (vitalSigns && vitalSigns.length > 0) {
      const latest = vitalSigns[0];
      // Respiratory Rate >= 22
      if (latest.respiratory_rate !== undefined && latest.respiratory_rate !== null && latest.respiratory_rate >= 22) {
        components.respiratoryRate.present = true;
        score++;
      }
      // Altered mental status (Glasgow < 15)
      if (latest.glasgow_coma_scale !== undefined && latest.glasgow_coma_scale !== null && latest.glasgow_coma_scale < 15) {
        components.alteredMental.present = true;
        score++;
      }
      // Systolic BP <= 100 mmHg
      if (latest?.systolic_bp !== undefined && latest.systolic_bp !== null && latest.systolic_bp <= 100) {
        components.lowBP.present = true;
        score++;
      }
    }

    components.total = score;
    return components;
  }, [vitalSigns]);

  // Calculate APACHE II score
  const apacheScore = useMemo<ApacheScoreComponents>(() => {
    const components: ApacheScoreComponents = {
      age: 0,
      temperature: 0,
      meanArterialPressure: 0,
      heartRate: 0,
      respiratoryRate: 0,
      oxygenation: 0,
      arterialPH: 0,
      sodium: 0,
      potassium: 0,
      creatinine: 0,
      hematocrit: 0,
      wbc: 0,
      gcs: 0,
      chronicHealth: 0,
      total: 0
    };

    // Verifica se temos dados para calcular
    if (!mostRecentExam || !mostRecentExam.lab_results || !vitalSigns || vitalSigns.length === 0 || !patient?.birthDate) {
      return components;
    }

    const latestVitals = vitalSigns.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    // Função para encontrar resultados
    const findResult = (testName: string): LabResult | undefined => {
      return mostRecentExam.lab_results.find(r => 
        r.test_name?.toLowerCase().includes(testName.toLowerCase())
      );
    };

    // Pontos por idade (se disponível)
    if (patient?.birthDate) {
      const age = calculateAge(patient.birthDate);
      if (age !== null) {
        if (age < 45) components.age = 0;
        else if (age < 55) components.age = 2;
        else if (age < 65) components.age = 3;
        else if (age < 75) components.age = 5;
        else components.age = 6;
      } else {
        components.age = 0;
      }
    }

    // Temperatura (preferência por sinais vitais, depois exames)
    if (latestVitals?.temperature_c !== undefined && latestVitals?.temperature_c !== null) {
      const temp = latestVitals.temperature_c;
      if (temp >= 41 || temp < 30) components.temperature = 4;
      else if (temp >= 39 || temp < 32) components.temperature = 3;
      else if (temp >= 38.5 || temp < 34) components.temperature = 1;
      else components.temperature = 0;
    }
    
    // Pressão Arterial Média
    if (latestVitals?.systolic_bp !== undefined && latestVitals?.systolic_bp !== null && 
        latestVitals?.diastolic_bp !== undefined && latestVitals?.diastolic_bp !== null) {
      const map = ((2 * latestVitals.diastolic_bp) + latestVitals.systolic_bp) / 3;
      if (map >= 160 || map <= 49) components.meanArterialPressure = 4;
      else if (map >= 130) components.meanArterialPressure = 3;
      else if (map >= 110 || map <= 69) components.meanArterialPressure = 2;
      else components.meanArterialPressure = 0;
    }
    
    // Frequência cardíaca
    if (latestVitals?.heart_rate !== undefined && latestVitals?.heart_rate !== null) {
      const hr = latestVitals.heart_rate;
      if (hr >= 180 || hr < 40) components.heartRate = 4;
      else if (hr >= 140 || hr < 55) components.heartRate = 3;
      else if (hr >= 110 || hr < 70) components.heartRate = 2;
      else components.heartRate = 0;
    }
    
    // Frequência respiratória
    if (latestVitals?.respiratory_rate !== undefined && latestVitals?.respiratory_rate !== null) {
      const rr = latestVitals.respiratory_rate;
      if (rr >= 50 || rr < 6) components.respiratoryRate = 4;
      else if (rr >= 35) components.respiratoryRate = 3;
      else if (rr >= 25 || rr < 12) components.respiratoryRate = 1;
      else components.respiratoryRate = 0;
    }
    
    // Glasgow (se disponível)
    if (latestVitals?.glasgow_coma_scale !== undefined && latestVitals?.glasgow_coma_scale !== null) {
      const gcs = latestVitals.glasgow_coma_scale;
      components.gcs = 15 - gcs; // Pontos APACHE = 15 - GCS real
    }
    
    // Exames laboratoriais
    
    // pH arterial
    const phResult = findResult('pH');
    if (phResult?.value_numeric !== undefined && phResult?.value_numeric !== null) {
      const ph = phResult.value_numeric;
      if (ph >= 7.7 || ph < 7.15) components.arterialPH = 4;
      else if (ph >= 7.6 || ph < 7.25) components.arterialPH = 3;
      else if (ph >= 7.5 || ph < 7.33) components.arterialPH = 2;
      else if (ph > 7.33 && ph < 7.5) components.arterialPH = 0;
      else components.arterialPH = 0;
    }
    
    // Sódio
    const naResult = findResult('Sódio');
    if (naResult?.value_numeric !== undefined && naResult?.value_numeric !== null) {
      const na = naResult.value_numeric;
      if (na >= 180 || na < 110) components.sodium = 4;
      else if (na >= 160 || na < 120) components.sodium = 3;
      else if (na >= 155 || na < 130) components.sodium = 2;
      else if (na >= 150 || na < 135) components.sodium = 1;
      else components.sodium = 0;
    }
    
    // Potássio
    const kResult = findResult('Potássio');
    if (kResult?.value_numeric !== undefined && kResult?.value_numeric !== null) {
      const k = kResult.value_numeric;
      if (k >= 7 || k < 2.5) components.potassium = 4;
      else if (k >= 6 || k < 3) components.potassium = 3;
      else if (k >= 5.5 || k < 3.5) components.potassium = 1;
      else if (k >= 3.0 && k < 3.5) components.potassium = 1;
      else components.potassium = 0;
    }
    
    // Creatinina
    const creatinineResult = findResult('Creatinina');
    if (creatinineResult?.value_numeric !== undefined && creatinineResult?.value_numeric !== null) {
      const cr = creatinineResult.value_numeric;
      if (cr >= 3.5) components.creatinine = 4;
      else if (cr >= 2) components.creatinine = 3;
      else if (cr >= 1.5) components.creatinine = 2;
      else if (cr < 0.6) components.creatinine = 2;
      else components.creatinine = 0;
    }
    
    // Hematócrito
    const hctResult = findResult('Hematócrito');
    if (hctResult?.value_numeric !== undefined && hctResult?.value_numeric !== null) {
      const hct = hctResult.value_numeric;
      if (hct >= 60 || hct < 20) components.hematocrit = 4;
      else if (hct >= 50 || hct < 30) components.hematocrit = 2;
      else components.hematocrit = 0;
    }
    
    // Leucócitos
    const wbcResult = findResult('Leucócitos');
    if (wbcResult?.value_numeric !== undefined && wbcResult?.value_numeric !== null) {
      const wbc = wbcResult.value_numeric;
      if (wbc >= 40 || wbc < 1) components.wbc = 4;
      else if (wbc >= 20 || wbc < 3) components.wbc = 2;
      else if (wbc >= 15 && wbc < 20) components.wbc = 1;
      else components.wbc = 0;
    }
    
    // Oxigenação
    const po2Result = findResult('pO2');
    if (po2Result?.value_numeric !== undefined && po2Result?.value_numeric !== null) {
      const pao2 = po2Result.value_numeric;
      if (pao2 < 55) components.oxygenation = 4;
      else if (pao2 < 70) components.oxygenation = 3;
      else if (pao2 <= 70) components.oxygenation = 1;
      else components.oxygenation = 0;
    } else {
        components.oxygenation = 0;
    }
    
    // Doença crônica: em um sistema real, isso viria do histórico médico do paciente
    // Aqui estamos colocando zero como exemplo
    components.chronicHealth = 0;
    
    // Calcular pontuação total
    components.total = Object.entries(components)
      .filter(([key, _]) => key !== 'total')
      .reduce((sum, [_, value]) => sum + value, 0);
    
    return components;
  }, [mostRecentExam, patient?.birthDate, vitalSigns]);
  
  // Calculate risk based on APACHE II - return variant
  const getApacheRiskVariant = (score: number): BadgeProps['variant'] => {
    if (score >= 35) return 'destructive';
    if (score >= 25) return 'destructive';
    if (score >= 15) return 'outline';
    if (score >= 10) return 'secondary';
    return 'secondary';
  };
  const apacheRiskVariant = getApacheRiskVariant(apacheScore.total);
  const apacheRiskText = useMemo(() => {
    if (apacheScore.total >= 35) return 'Extremamente Grave (Mortalidade >85%)';
    if (apacheScore.total >= 25) return 'Muito Grave (Mortalidade 55-85%)';
    if (apacheScore.total >= 15) return 'Grave (Mortalidade 25-55%)';
    if (apacheScore.total >= 10) return 'Moderado (Mortalidade 10-25%)';
    return 'Leve (Mortalidade <10%)';
  }, [apacheScore.total]);

  // Calculate severity risk based on SOFA score - return variant
  const getSofaRiskVariant = (score: number): BadgeProps['variant'] => {
    if (score >= 12) return 'destructive';
    if (score >= 8) return 'destructive';
    if (score >= 4) return 'outline';
    return 'secondary';
  };
  const sofaRiskVariant = getSofaRiskVariant(sofaScore.total);
  const sofaRiskText = useMemo(() => {
      if (sofaScore.total >= 12) return 'Crítico';
      if (sofaScore.total >= 8) return 'Grave';
      if (sofaScore.total >= 4) return 'Moderado';
      return 'Leve';
  }, [sofaScore.total]);

  // Função auxiliar para encontrar resultados de exame
  function findResultInExam(exam: any, testName: string): LabResult | undefined {
    return exam.lab_results.find((r: LabResult) => 
      r.test_name?.toLowerCase().includes(testName.toLowerCase())
    );
  }

  // Renderiza conteúdo de escores da API se disponível
  const renderApiScoreContent = (scoreType: 'sofa' | 'qsofa' | 'apache') => {
    const score = apiScores[scoreType];
    if (!score) return null;
    
    return (
      <div className="mt-4 pt-3 border-t border-border">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Resultado da API:</h3>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Score:</span>
            <span className="font-medium text-foreground">{score.score}</span>
          </div>
          <div className="flex justify-between">
            <span>Categoria:</span>
            <span className="font-medium text-foreground">{score.category}</span>
          </div>
          <div className="flex justify-between">
            <span>Mortalidade:</span>
            <span className="font-medium text-foreground">{score.mortality_risk !== undefined ? (score.mortality_risk * 100).toFixed(1) + '%' : '-'}</span>
          </div>
          {score.interpretation && (
            <div className="mt-2 text-foreground">
              {score.interpretation.split('\n').map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const allLabResults = useMemo(() => patient?.exams?.flatMap(exam => exam.lab_results || []) || [], [patient?.exams]);

  const getMostRecentLabValue = useCallback((testName: string): LabResult | undefined => {
    return allLabResults
      ?.filter(lab => lab.test_name?.toLowerCase().includes(testName.toLowerCase()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    ?.[0];
  }, [allLabResults]);

  const overallRisk = useMemo(() => {
    // Simplified logic based on potentially fetched scores
    let maxSeverity = 0;
    if ((apiScores.qsofa?.score ?? 0) >= 2) maxSeverity = 2;
    if ((apiScores.apache?.score ?? 0) > 15) maxSeverity = 2;
    if ((apiScores.news2?.score ?? 0) > 6) maxSeverity = 2;
    if ((apiScores.gfr?.tfg_ml_min_173m2 ?? 90) < 30) maxSeverity = 1;
    if ((apiScores.sofa?.score ?? 0) > 4) maxSeverity = Math.max(maxSeverity, 1);

    if (maxSeverity === 2) return { level: 'Alto', variant: 'destructive' as BadgeProps['variant'] };
    if (maxSeverity === 1) return { level: 'Médio', variant: 'warning' as BadgeProps['variant'] };
    return { level: 'Baixo', variant: 'success' as BadgeProps['variant'] };
}, [apiScores]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Escores de Risco Clínico</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SOFA Score Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">SOFA Score</CardTitle>
              <Badge variant={sofaRiskVariant}>
                {sofaRiskText}
              </Badge>
            </div>
          </CardHeader>         
          <CardContent>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-muted-foreground">Total Score:</span>
              <span className="text-2xl font-bold">{apiScores.sofa ? apiScores.sofa.score : sofaScore.total}</span>
                </div>
            <Progress value={((apiScores.sofa?.score ?? sofaScore.total) / 24) * 100} className="h-2 mb-4" />

            <div className="space-y-2">
              {Object.entries(sofaScore)
                .filter(([key]) => key !== 'total')
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{(value as ScoreComponent).description}</span>
                    <Badge variant={(value as ScoreComponent).score > 0 ? 'outline' : 'secondary'}>
                      {(value as ScoreComponent).score} pts
                  </Badge>
                </div>
              ))}
                </div>
                
            {error.sofa && (
              <Alert 
                className="mt-4 border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive" 
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro na API (SOFA)</AlertTitle>
                <AlertDescription>{error.sofa.message}</AlertDescription>
              </Alert>
            )}
            {renderApiScoreContent('sofa')}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              onClick={calculateSofaScore}
              disabled={loading.sofa}
              variant="outline"
              size="sm"
            >
              {loading.sofa ? <Spinner size="sm" className="mr-2" /> : null}
              Recalcular via API
            </Button>
          </CardFooter>
        </Card>
                
        {/* qSOFA Score Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">qSOFA Score</CardTitle>
              <Badge variant={qSofaScore.total >= 2 ? 'outline' : 'secondary'}>
                {qSofaScore.total >= 2 ? 'Positivo (Risco ↑)' : 'Negativo'}
                  </Badge>
                </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-muted-foreground">Total Score:</span>
              <span className="text-2xl font-bold">{apiScores.qsofa ? apiScores.qsofa.score : qSofaScore.total}</span>
              </div>
              <div className="space-y-2">
              {Object.entries(qSofaScore)
                .filter(([key]) => key !== 'total')
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{(value as QSofaComponent).description}</span>
                    <Badge variant={(value as QSofaComponent).present ? 'outline' : 'secondary'}>
                      {(value as QSofaComponent).present ? 'Presente' : 'Ausente'}
                  </Badge>
                </div>
                ))}
                </div>
            {error.qsofa && (
              <Alert 
                 className="mt-4 border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive" 
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro na API (qSOFA)</AlertTitle>
                <AlertDescription>{error.qsofa.message}</AlertDescription>
              </Alert>
            )}
            {renderApiScoreContent('qsofa')}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              onClick={calculateQSofaScore}
              disabled={loading.qsofa}
              variant="outline"
              size="sm"
            >
              {loading.qsofa ? <Spinner size="sm" className="mr-2" /> : null}
              Recalcular via API
            </Button>
          </CardFooter>
        </Card>
        
        {/* APACHE II Score Card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">APACHE II Score</CardTitle>
              <Badge variant={apacheRiskVariant}>
                {apacheRiskText}
                  </Badge>
                </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-muted-foreground">Total Score:</span>
              <span className="text-2xl font-bold">{apiScores.apache ? apiScores.apache.score : apacheScore.total}</span>
                </div>
                
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-4">
              {Object.entries(apacheScore)
                .filter(([key]) => key !== 'total')
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm border-b pb-1">
                    <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <Badge variant={value > 0 ? 'outline' : 'secondary'}>
                      {value} pts
                  </Badge>
                </div>
              ))}
            </div>
            
            {error.apache && (
              <Alert 
                 className="mt-4 border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive" 
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro na API (APACHE II)</AlertTitle>
                <AlertDescription>{error.apache.message}</AlertDescription>
              </Alert>
            )}
            {renderApiScoreContent('apache')}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              onClick={calculateApacheScore}
              disabled={loading.apache}
              variant="outline"
              size="sm"
            >
              {loading.apache ? <Spinner size="sm" className="mr-2" /> : null}
              Recalcular via API
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Future improvement suggestion */}
      <Card className="bg-info/10 border-info/20">
        <CardContent className="p-4">
          <h3 className="font-medium mb-2 text-info">Outros Escores Clínicos</h3>
          <p className="text-sm text-info/80 mb-2">
            Escores adicionais que podem ser calculados com mais dados:
          </p>
          <ul className="list-disc pl-5 text-sm text-info/80 space-y-1">
            <li>MEWS (Escore de Alerta Precoce Modificado)</li>
            <li>NEWS (Escore Nacional de Alerta Precoce)</li>
            <li>Child-Pugh (Prognóstico em doença hepática)</li>
            <li>Índices de função renal (AKIN, RIFLE, KDIGO)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

// Local calculateAge helper (modified to handle undefined)
const calculateAge = (birthDate: string | undefined): number | null => {
  if (!birthDate) return null;
  try {
    const today = new Date();
    const bd = new Date(birthDate);
    let age = today.getFullYear() - bd.getFullYear();
    const monthDiff = today.getMonth() - bd.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bd.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
     console.error("Error calculating age in RiskScoresDashboard:", e);
     return null;
  }
};

export default RiskScoresDashboard; 