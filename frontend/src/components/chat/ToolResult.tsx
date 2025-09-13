import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Lightbulb, List, Search, FileText, Microscope, Clock, Brain, Stethoscope, BarChart, CheckCircle, XCircle, Shield } from 'lucide-react';

// Define interfaces for the structured tool outputs, mirroring BAML schemas

interface IllnessScriptData {
  disease_name: string;
  predisposing_conditions: string[];
  pathophysiology_summary: string;
  key_symptoms_and_signs: string[];
  relevant_diagnostics?: string[];
}

interface DdxData {
  diagnosis_name: string;
  rationale: string;
  suspicion_level: string;
  category: string;
}

interface PICOData {
  patient_population: string;
  intervention: string;
  comparison: string;
  outcome: string;
  formattedQuestion: string;
  reasoning: string;
}

interface ResearchSynthesisData {
    executive_summary: string;
    key_findings_by_theme: {
        theme_name: string;
        key_findings: string[];
        strength_of_evidence: string;
    }[];
    evidence_quality_assessment: string;
}

interface DiagnosticTimeoutData {
    alternative_diagnoses: {
        diagnosis: string;
        justification: string;
    }[];
    cognitive_biases_to_consider: {
        bias_name: string;
        description: string;
        mitigation_strategy: string;
    }[];
    recommended_actions: string[];
}

interface SelfReflectionData {
    strengths_in_reasoning: string[];
    areas_for_improvement: string[];
    cognitive_biases_identified: {
        bias_name: string;
        feedback: string;
    }[];
    suggested_learning_topics: string[];
}

interface EvidenceAppraisalData {
    overall_quality: string;
    quality_assessment: {
        domain: string;
        rating: string;
        justification: string;
    }[];
    summary_of_findings: string;
    confidence_in_evidence: string;
}

// Main component to render tool results based on tool name
export const ToolResult = ({ toolName, toolData }: { toolName: string; toolData: any }) => {
  switch (toolName) {
    case 'generate_illness_script':
      return <IllnessScriptResult data={toolData} />;
    case 'expand_differential_diagnosis':
      return <ExpandDdxResult data={toolData} />;
    case 'formulate_pico_question':
        return <PicoQuestionResult data={toolData} />;
    case 'synthesize_deep_research':
        return <ResearchSynthesisResult data={toolData} />;
    case 'generate_diagnostic_timeout':
        return <DiagnosticTimeoutResult data={toolData} />;
    case 'provide_self_reflection_feedback':
        return <SelfReflectionResult data={toolData} />;
    case 'generate_evidence_appraisal':
        return <EvidenceAppraisalResult data={toolData} />;
    default:
      return (
        <Card className="mt-2 bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Lightbulb className="mr-2 h-4 w-4" />
              Tool Result: {toolName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(toolData, null, 2)}</pre>
          </CardContent>
        </Card>
      );
  }
};

// Specialized component for rendering Illness Script results
export const IllnessScriptResult = ({ data }: { data: IllnessScriptData }) => (
  <Card className="mt-2 border-blue-200 bg-blue-50/50">
    <CardHeader>
      <CardTitle className="text-lg flex items-center text-blue-800">
        <FileText className="mr-2 h-5 w-5" />
        Illness Script: {data.disease_name}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 text-sm">
      <div>
        <h4 className="font-semibold text-blue-700">Condições Predisponentes</h4>
        <p>{data.predisposing_conditions.join(', ')}</p>
      </div>
      <div>
        <h4 className="font-semibold text-blue-700">Fisiopatologia</h4>
        <p>{data.pathophysiology_summary}</p>
      </div>
      <div>
        <h4 className="font-semibold text-blue-700">Sinais e Sintomas Chave</h4>
        <ul className="list-disc list-inside">
          {data.key_symptoms_and_signs.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
      {data.relevant_diagnostics && (
        <div>
          <h4 className="font-semibold text-blue-700">Diagnósticos Relevantes</h4>
          <p>{data.relevant_diagnostics.join(', ')}</p>
        </div>
      )}
    </CardContent>
  </Card>
);

// Specialized component for rendering Expanded Differential Diagnosis results
export const ExpandDdxResult = ({ data }: { data: { suggested_diagnoses: DdxData[] } }) => (
  <Card className="mt-2 border-purple-200 bg-purple-50/50">
    <CardHeader>
      <CardTitle className="text-lg flex items-center text-purple-800">
        <List className="mr-2 h-5 w-5" />
        Diagnóstico Diferencial Expandido
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {data.suggested_diagnoses.map((dx, i) => (
        <div key={i} className="p-2 border-b border-purple-100">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold text-purple-700">{dx.diagnosis_name}</h4>
            <Badge variant="secondary" className="text-xs">{dx.category}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{dx.rationale}</p>
          <p className="text-xs font-medium mt-1">Nível de Suspeita: {dx.suspicion_level}</p>
        </div>
      ))}
    </CardContent>
  </Card>
);

// New specialized components

export const PicoQuestionResult = ({ data }: { data: PICOData }) => (
    <Card className="mt-2 border-green-200 bg-green-50/50">
        <CardHeader>
            <CardTitle className="text-lg flex items-center text-green-800">
                <Search className="mr-2 h-5 w-5" />
                PICO Question
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
            <p className="font-semibold text-green-900">{data.formattedQuestion}</p>
            <div className="space-y-2">
                <p><strong className="text-green-700">P (Patient/Population):</strong> {data.patient_population}</p>
                <p><strong className="text-green-700">I (Intervention):</strong> {data.intervention}</p>
                <p><strong className="text-green-700">C (Comparison):</strong> {data.comparison}</p>
                <p><strong className="text-green-700">O (Outcome):</strong> {data.outcome}</p>
            </div>
            <div>
                <h4 className="font-semibold text-green-700">Reasoning</h4>
                <p className="text-xs text-muted-foreground">{data.reasoning}</p>
            </div>
        </CardContent>
    </Card>
);

export const ResearchSynthesisResult = ({ data }: { data: ResearchSynthesisData }) => (
    <Card className="mt-2 border-yellow-200 bg-yellow-50/50">
        <CardHeader>
            <CardTitle className="text-lg flex items-center text-yellow-800">
                <Microscope className="mr-2 h-5 w-5" />
                Research Synthesis
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
            <div>
                <h4 className="font-semibold text-yellow-700">Executive Summary</h4>
                <p>{data.executive_summary}</p>
            </div>
            <div>
                <h4 className="font-semibold text-yellow-700">Key Findings by Theme</h4>
                {data.key_findings_by_theme.map((theme, i) => (
                    <div key={i} className="mt-2 p-2 border-t border-yellow-100">
                        <h5 className="font-semibold">{theme.theme_name} <Badge variant="outline" className="ml-2 text-xs">{theme.strength_of_evidence}</Badge></h5>
                        <ul className="list-disc list-inside mt-1">
                            {theme.key_findings.map((finding, j) => <li key={j}>{finding}</li>)}
                        </ul>
                    </div>
                ))}
            </div>
            <div>
                <h4 className="font-semibold text-yellow-700">Evidence Quality Assessment</h4>
                <p>{data.evidence_quality_assessment}</p>
            </div>
        </CardContent>
    </Card>
);

export const DiagnosticTimeoutResult = ({ data }: { data: DiagnosticTimeoutData }) => (
    <Card className="mt-2 border-red-200 bg-red-50/50">
        <CardHeader>
            <CardTitle className="text-lg flex items-center text-red-800">
                <Clock className="mr-2 h-5 w-5" />
                Diagnostic Timeout
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
            <div>
                <h4 className="font-semibold text-red-700">Alternative Diagnoses to Consider</h4>
                {data.alternative_diagnoses.map((alt, i) => (
                    <div key={i} className="mt-1">
                        <p><strong className="font-medium">{alt.diagnosis}:</strong> {alt.justification}</p>
                    </div>
                ))}
            </div>
            <div>
                <h4 className="font-semibold text-red-700">Cognitive Biases to Consider</h4>
                {data.cognitive_biases_to_consider.map((bias, i) => (
                    <div key={i} className="mt-2 p-2 border-t border-red-100">
                        <p className="font-medium">{bias.bias_name}</p>
                        <p className="text-xs text-muted-foreground">{bias.description}</p>
                        <p className="text-xs mt-1"><strong className="text-red-600">Mitigation:</strong> {bias.mitigation_strategy}</p>
                    </div>
                ))}
            </div>
            <div>
                <h4 className="font-semibold text-red-700">Recommended Actions</h4>
                <ul className="list-disc list-inside">
                    {data.recommended_actions.map((action, i) => <li key={i}>{action}</li>)}
                </ul>
            </div>
        </CardContent>
    </Card>
);

export const SelfReflectionResult = ({ data }: { data: SelfReflectionData }) => (
    <Card className="mt-2 border-indigo-200 bg-indigo-50/50">
        <CardHeader>
            <CardTitle className="text-lg flex items-center text-indigo-800">
                <Brain className="mr-2 h-5 w-5" />
                Self-Reflection Feedback
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
            <div>
                <h4 className="font-semibold text-indigo-700 flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-green-600" />Strengths in Reasoning</h4>
                <ul className="list-disc list-inside">
                    {data.strengths_in_reasoning.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
            </div>
            <div>
                <h4 className="font-semibold text-indigo-700 flex items-center"><XCircle className="mr-2 h-4 w-4 text-red-600" />Areas for Improvement</h4>
                <ul className="list-disc list-inside">
                    {data.areas_for_improvement.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
            </div>
            <div>
                <h4 className="font-semibold text-indigo-700">Cognitive Biases Identified</h4>
                {data.cognitive_biases_identified.map((bias, i) => (
                    <p key={i} className="mt-1 text-xs"><strong className="font-medium">{bias.bias_name}:</strong> {bias.feedback}</p>
                ))}
            </div>
            <div>
                <h4 className="font-semibold text-indigo-700">Suggested Learning Topics</h4>
                <ul className="list-disc list-inside">
                    {data.suggested_learning_topics.map((topic, i) => <li key={i}>{topic}</li>)}
                </ul>
            </div>
        </CardContent>
    </Card>
);

export const EvidenceAppraisalResult = ({ data }: { data: EvidenceAppraisalData }) => (
    <Card className="mt-2 border-teal-200 bg-teal-50/50">
        <CardHeader>
            <CardTitle className="text-lg flex items-center text-teal-800">
                <Shield className="mr-2 h-5 w-5" />
                GRADE Evidence Appraisal
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
            <div>
                <h4 className="font-semibold text-teal-700">Overall Quality of Evidence</h4>
                <Badge variant="default" className="text-base">{data.overall_quality}</Badge>
            </div>
            <div>
                <h4 className="font-semibold text-teal-700">Summary of Findings</h4>
                <p>{data.summary_of_findings}</p>
            </div>
            <div>
                <h4 className="font-semibold text-teal-700">Detailed Quality Assessment</h4>
                <div className="space-y-2">
                    {data.quality_assessment.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 border-b border-teal-100">
                            <span className="font-medium">{item.domain}</span>
                            <Badge variant={item.rating === 'High' ? 'default' : item.rating === 'Moderate' ? 'secondary' : 'destructive'} className="text-xs">{item.rating}</Badge>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <h4 className="font-semibold text-teal-700">Confidence in Evidence</h4>
                <p>{data.confidence_in_evidence}</p>
            </div>
        </CardContent>
    </Card>
);