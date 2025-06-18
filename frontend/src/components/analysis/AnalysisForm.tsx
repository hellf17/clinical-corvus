import React, { useState } from 'react';
import analysisService from '../../services/analysisService';
import AnalysisResult from './AnalysisResult';
import { 
  BloodGasInput, ElectrolyteInput, HematologyInput, SofaInput,
  BloodGasResult, ElectrolyteResult, HematologyResult, ScoreResult,
  RenalResult, HepaticResult, CardiacResult, MicrobiologyResult, MetabolicResult
} from '../../types/analysis';

// Import Shadcn UI components
import { Button as ShadcnButton } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select as ShadcnSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Loader2 } from 'lucide-react'; // Import loader icon

const analysisTypes = [
  { value: 'blood_gas', label: 'Gasometria Arterial' },
  { value: 'electrolytes', label: 'Eletrólitos' },
  { value: 'hematology', label: 'Hemograma' },
  { value: 'renal', label: 'Função Renal' },
  { value: 'hepatic', label: 'Função Hepática' },
  { value: 'cardiac', label: 'Marcadores Cardíacos' },
  { value: 'microbiology', label: 'Microbiologia' },
  { value: 'metabolic', label: 'Metabólico' },
  { value: 'sofa', label: 'Escore SOFA' }
];

interface FormFields {
  [key: string]: { 
    label: string; 
    type: string;
    unit?: string;
    required?: boolean;
  };
}

// Definição dos campos por tipo de análise
const formFields: Record<string, FormFields> = {
  blood_gas: {
    ph: { label: 'pH', type: 'number', required: true },
    pco2: { label: 'pCO2', type: 'number', unit: 'mmHg', required: true },
    po2: { label: 'pO2', type: 'number', unit: 'mmHg' },
    hco3: { label: 'HCO3', type: 'number', unit: 'mEq/L', required: true },
    be: { label: 'Excesso de Base', type: 'number', unit: 'mEq/L' },
    o2sat: { label: 'Saturação O2', type: 'number', unit: '%' },
    lactate: { label: 'Lactato', type: 'number', unit: 'mmol/L' }
  },
  electrolytes: {
    sodium: { label: 'Sódio (Na)', type: 'number', unit: 'mEq/L' },
    potassium: { label: 'Potássio (K)', type: 'number', unit: 'mEq/L' },
    chloride: { label: 'Cloreto (Cl)', type: 'number', unit: 'mEq/L' },
    bicarbonate: { label: 'Bicarbonato (HCO3)', type: 'number', unit: 'mEq/L' },
    calcium: { label: 'Cálcio (Ca)', type: 'number', unit: 'mg/dL' },
    magnesium: { label: 'Magnésio (Mg)', type: 'number', unit: 'mg/dL' },
    phosphorus: { label: 'Fósforo (P)', type: 'number', unit: 'mg/dL' }
  },
  hematology: {
    hemoglobin: { label: 'Hemoglobina', type: 'number', unit: 'g/dL' },
    hematocrit: { label: 'Hematócrito', type: 'number', unit: '%' },
    wbc: { label: 'Leucócitos', type: 'number', unit: '/mm³' },
    platelet: { label: 'Plaquetas', type: 'number', unit: '/mm³' },
    neutrophils: { label: 'Neutrófilos', type: 'number', unit: '%' },
    lymphocytes: { label: 'Linfócitos', type: 'number', unit: '%' },
    monocytes: { label: 'Monócitos', type: 'number', unit: '%' },
    eosinophils: { label: 'Eosinófilos', type: 'number', unit: '%' },
    basophils: { label: 'Basófilos', type: 'number', unit: '%' }
  },
  renal: {
    creatinine: { label: 'Creatinina', type: 'number', unit: 'mg/dL' },
    urea: { label: 'Ureia', type: 'number', unit: 'mg/dL' },
    uric_acid: { label: 'Ácido Úrico', type: 'number', unit: 'mg/dL' },
    egfr: { label: 'TFG estimada', type: 'number', unit: 'mL/min/1.73m²' }
  },
  hepatic: {
    alt: { label: 'ALT/TGP', type: 'number', unit: 'U/L' },
    ast: { label: 'AST/TGO', type: 'number', unit: 'U/L' },
    ggt: { label: 'GGT', type: 'number', unit: 'U/L' },
    alp: { label: 'Fosfatase Alcalina', type: 'number', unit: 'U/L' },
    total_bilirubin: { label: 'Bilirrubina Total', type: 'number', unit: 'mg/dL' },
    direct_bilirubin: { label: 'Bilirrubina Direta', type: 'number', unit: 'mg/dL' },
    albumin: { label: 'Albumina', type: 'number', unit: 'g/dL' },
    inr: { label: 'INR', type: 'number' }
  },
  cardiac: {
    troponin: { label: 'Troponina', type: 'number', unit: 'ng/mL' },
    ck: { label: 'CK Total', type: 'number', unit: 'U/L' },
    ckmb: { label: 'CK-MB', type: 'number', unit: 'U/L' },
    bnp: { label: 'BNP', type: 'number', unit: 'pg/mL' },
    nt_probnp: { label: 'NT-proBNP', type: 'number', unit: 'pg/mL' },
    myoglobin: { label: 'Mioglobina', type: 'number', unit: 'ng/mL' },
    ldh: { label: 'LDH', type: 'number', unit: 'U/L' }
  },
  metabolic: {
    glucose: { label: 'Glicose', type: 'number', unit: 'mg/dL' },
    hba1c: { label: 'HbA1c', type: 'number', unit: '%' },
    total_cholesterol: { label: 'Colesterol Total', type: 'number', unit: 'mg/dL' },
    hdl: { label: 'HDL', type: 'number', unit: 'mg/dL' },
    ldl: { label: 'LDL', type: 'number', unit: 'mg/dL' },
    triglycerides: { label: 'Triglicerídeos', type: 'number', unit: 'mg/dL' },
    insulin: { label: 'Insulina', type: 'number', unit: 'μU/mL' }
  },
  sofa: {
    // Example SOFA fields - adjust as needed
    platelets: { label: 'Plaquetas', type: 'number', unit: '/mm³' },
    bilirubin: { label: 'Bilirrubina', type: 'number', unit: 'mg/dL' },
    map: { label: 'PAM', type: 'number', unit: 'mmHg' },
    gcs: { label: 'Glasgow Coma Scale', type: 'number' },
    creatinine: { label: 'Creatinina', type: 'number', unit: 'mg/dL' },
    pao2_fio2: { label: 'PaO2/FiO2', type: 'number' },
  },
};

/**
 * Componente para formulário de análise clínica
 */
const AnalysisForm: React.FC = () => {
  const [analysisType, setAnalysisType] = useState('blood_gas');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [result, setResult] = useState<
    | BloodGasResult
    | ElectrolyteResult
    | HematologyResult
    | RenalResult
    | HepaticResult
    | CardiacResult
    | MicrobiologyResult
    | MetabolicResult
    | ScoreResult
    | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleAnalysisTypeChange = (value: string) => {
    setAnalysisType(value);
    setFormData({});
    setResult(null);
    setError('');
  };
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let response;
      
      switch (analysisType) {
        case 'blood_gas':
          response = await analysisService.analyzeBloodGas(formData as BloodGasInput);
          break;
        case 'electrolytes':
          response = await analysisService.analyzeElectrolytes(formData as ElectrolyteInput);
          break;
        case 'hematology':
          response = await analysisService.analyzeHematology(formData as HematologyInput);
          break;
        case 'renal':
          response = await analysisService.analyzeRenal(formData);
          break;
        case 'hepatic':
          response = await analysisService.analyzeHepatic(formData);
          break;
        case 'cardiac':
          response = await analysisService.analyzeCardiac(formData);
          break;
        case 'microbiology':
          response = await analysisService.analyzeMicrobiology(formData);
          break;
        case 'metabolic':
          response = await analysisService.analyzeMetabolic(formData);
          break;
        case 'sofa':
          response = await analysisService.calculateSofa(formData as SofaInput);
          break;
        default:
          throw new Error('Tipo de análise não suportado');
      }
      
      setResult(response);
    } catch (err) {
      console.error('Erro ao realizar análise:', err);
      setError('Ocorreu um erro ao processar a análise. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Obtém os campos para o tipo de análise atual
  const fields = formFields[analysisType] || {};
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Análise Clínica</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
             <Label htmlFor="analysis-type">Tipo de Análise</Label>
             <ShadcnSelect 
                value={analysisType} 
                onValueChange={handleAnalysisTypeChange}
             >
              <SelectTrigger id="analysis-type" className="w-full md:w-[300px]">
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {analysisTypes
                  .filter(type => type.value && type.value !== "")
                  .map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </ShadcnSelect>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(fields).map(([field, { label, type, unit, required }]) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={field}>
                    {`${label}${unit ? ` (${unit})` : ''}`}
                    {required && <span className="text-destructive"> *</span>}
                  </Label>
                  <Input
                    id={field}
                    name={field}
                    type={type}
                    required={required}
                    value={formData[field] || ''}
                    onChange={(e) => handleInputChange(field, type === 'number' ? Number(e.target.value) : e.target.value)}
                    placeholder={`Digite ${label.toLowerCase()}...`}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-4">
              <ShadcnButton
                type="submit"
                disabled={loading}
                isLoading={loading}
              >
                Analisar
              </ShadcnButton>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-md">
          {error}
        </div>
      )}
      
      {result && (
        <AnalysisResult 
          title={analysisTypes.find(t => t.value === analysisType)?.label || 'Resultado'}
          {...result}
        />
      )}
    </div>
  );
};

export default AnalysisForm; 