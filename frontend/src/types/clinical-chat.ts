import { UIMessage, UIDataTypes } from 'ai';
import { z } from 'zod';

// ===== CLINICAL METADATA TYPES =====

/**
 * Metadata for clinical conversations and consultations
 */
export interface ClinicalMetadata {
  // Patient Context
  patientId?: number;
  consultationId?: string;
  consultationType?: 'quick-chat' | 'differential-diagnosis' | 'lab-analysis' | 'evidence-search' | 'clinical-simulation';
  
  // Message Context
  timestamp: number;
  model?: string;
  totalTokens?: number;
  
  // Clinical Context
  confidenceScore?: number;
  clinicalSpecialty?: string;
  urgencyLevel?: 'routine' | 'urgent' | 'emergent';
  
  // Educational Context (for Academy modules)
  moduleId?: string;
  learningObjective?: string;
  assessmentType?: 'diagnostic' | 'therapeutic' | 'prognostic';
}

// ===== CLINICAL DATA PARTS TYPES =====

/**
 * Custom data parts for streaming clinical information
 */
export type ClinicalDataParts = 
  // Differential Diagnosis Progress
  | {
      type: 'data-diagnosis-progress';
      data: {
        stage: 'analyzing' | 'generating_hypotheses' | 'ranking' | 'complete';
        progress: number; // 0-100
        currentStep: string;
        hypotheses?: Array<{
          condition: string;
          probability: number;
          reasoning: string;
        }>;
      };
    }
  
  // Lab Analysis Results
  | {
      type: 'data-lab-analysis';
      data: {
        test: string;
        result: string | number;
        referenceRange?: string;
        interpretation: 'normal' | 'abnormal' | 'critical';
        clinicalSignificance: string;
        status: 'processing' | 'complete' | 'error';
      };
    }
  
  // Evidence Search Progress
  | {
      type: 'data-evidence-search';
      data: {
        query: string;
        databases: string[];
        resultsFound: number;
        status: 'searching' | 'analyzing' | 'synthesizing' | 'complete';
        currentDatabase?: string;
      };
    }
  
  // Clinical Status Updates
  | {
      type: 'data-clinical-status';
      data: {
        message: string;
        stage: string;
        icon?: 'analyzing' | 'searching' | 'thinking' | 'complete';
      };
    }
  
  // PICO Question Generation
  | {
      type: 'data-pico-generation';
      data: {
        population?: string;
        intervention?: string;
        comparison?: string;
        outcome?: string;
        status: 'generating' | 'refining' | 'complete';
        confidence: number;
      };
    }
  
  // SNAPPS Framework Progress (for clinical simulation)
  | {
      type: 'data-snapps-progress';
      data: {
        step: 'S' | 'N' | 'A' | 'P1' | 'P2' | 'S2'; // SNAPPS steps
        stepName: string;
        completed: boolean;
        feedback?: string;
        nextAction?: string;
      };
    }
  
  // Bias Detection (for metacognition module)
  | {
      type: 'data-bias-detection';
      data: {
        biasType: string;
        biasDescription: string;
        likelihood: number;
        mitigation: string;
        status: 'analyzing' | 'detected' | 'no-bias-found';
      };
    };

// ===== CLINICAL TOOL TYPES =====

/**
 * Clinical tools available in the system
 */
export type ClinicalTools = {
  // Differential Diagnosis Tools
  generateDifferentialDiagnosis: {
    input: {
      symptoms: string[];
      patientAge: number;
      patientSex: 'M' | 'F' | 'Other';
      medicalHistory?: string[];
      physicalExam?: string[];
    };
    output: {
      diagnoses: Array<{
        condition: string;
        probability: number;
        reasoning: string;
        nextSteps: string[];
      }>;
      confidence: number;
    };
  };
  
  // Lab Analysis Tools
  interpretLabResults: {
    input: {
      labResults: Array<{
        test: string;
        value: string | number;
        unit?: string;
        referenceRange?: string;
      }>;
      patientContext?: {
        age: number;
        sex: 'M' | 'F' | 'Other';
        medications?: string[];
      };
    };
    output: {
      interpretations: Array<{
        test: string;
        interpretation: string;
        clinicalSignificance: 'normal' | 'abnormal' | 'critical';
        recommendations: string[];
      }>;
      overallAssessment: string;
    };
  };
  
  // Evidence-Based Medicine Tools
  generatePICOQuestion: {
    input: {
      clinicalScenario: string;
      questionType: 'therapy' | 'diagnosis' | 'prognosis' | 'etiology';
    };
    output: {
      population: string;
      intervention: string;
      comparison: string;
      outcome: string;
      formattedQuestion: string;
      searchTerms: string[];
    };
  };
  
  searchClinicalEvidence: {
    input: {
      picoQuestion?: string;
      query: string;
      databases: string[];
      studyTypes?: string[];
    };
    output: {
      results: Array<{
        title: string;
        authors: string[];
        journal: string;
        year: number;
        studyType: string;
        qualityScore?: number;
        relevanceScore: number;
        summary: string;
        conclusions: string;
      }>;
      synthesis: string;
      qualityAssessment: string;
    };
  };
  
  // Interactive Confirmation Tools (Client-side)
  askForDiagnosticConfirmation: {
    input: {
      diagnosis: string;
      confidence: number;
      reasoning: string;
    };
    output: 'confirmed' | 'rejected' | 'needs_more_info';
  };
  
  // Clinical Simulation Tools (SNAPPS Framework)
  snappsPresentation: {
    input: {
      step: 'S' | 'N' | 'A' | 'P1' | 'P2' | 'S2';
      patientCase: string;
      studentResponse?: string;
    };
    output: {
      feedback: string;
      nextStep: string;
      completed: boolean;
    };
  };
  
  // Bias Detection Tools
  analyzeCognitiveBias: {
    input: {
      clinicalScenario: string;
      diagnosticReasoning: string;
    };
    output: {
      potentialBiases: Array<{
        biasType: string;
        likelihood: number;
        description: string;
        mitigation: string;
      }>;
      overallRisk: 'low' | 'moderate' | 'high';
      recommendations: string[];
    };
  };
  
  // Problem Representation Tool
  problemRepresentation: {
    input: {
      patientCase: string;
      studentAttempt?: string;
    };
    output: {
      feedback: string;
      expertRepresentation: string;
      improvementAreas: string[];
    };
  };
};

// ===== COMPLETE CLINICAL UI MESSAGE TYPE =====

/**
 * Complete UIMessage type for Clinical Corvus with medical metadata, 
 * clinical data parts, and specialized medical tools
 */
export type ClinicalUIMessage = UIMessage<
  ClinicalMetadata,
  ClinicalDataParts | UIDataTypes,
  ClinicalTools
>;

// ===== ZOD SCHEMAS FOR VALIDATION =====

// Clinical Metadata Schema
export const clinicalMetadataSchema = z.object({
  patientId: z.number().optional(),
  consultationId: z.string().optional(),
  consultationType: z.enum(['quick-chat', 'differential-diagnosis', 'lab-analysis', 'evidence-search', 'clinical-simulation']).optional(),
  timestamp: z.number(),
  model: z.string().optional(),
  totalTokens: z.number().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  clinicalSpecialty: z.string().optional(),
  urgencyLevel: z.enum(['routine', 'urgent', 'emergent']).optional(),
  moduleId: z.string().optional(),
  learningObjective: z.string().optional(),
  assessmentType: z.enum(['diagnostic', 'therapeutic', 'prognostic']).optional(),
});

// Clinical Data Parts Schema
export const clinicalDataPartsSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('data-diagnosis-progress'),
    data: z.object({
      stage: z.enum(['analyzing', 'generating_hypotheses', 'ranking', 'complete']),
      progress: z.number().min(0).max(100),
      currentStep: z.string(),
      hypotheses: z.array(z.object({
        condition: z.string(),
        probability: z.number(),
        reasoning: z.string(),
      })).optional(),
    }),
  }),
  
  z.object({
    type: z.literal('data-lab-analysis'),
    data: z.object({
      test: z.string(),
      result: z.union([z.string(), z.number()]),
      referenceRange: z.string().optional(),
      interpretation: z.enum(['normal', 'abnormal', 'critical']),
      clinicalSignificance: z.string(),
      status: z.enum(['processing', 'complete', 'error']),
    }),
  }),
  
  z.object({
    type: z.literal('data-evidence-search'),
    data: z.object({
      query: z.string(),
      databases: z.array(z.string()),
      resultsFound: z.number(),
      status: z.enum(['searching', 'analyzing', 'synthesizing', 'complete']),
      currentDatabase: z.string().optional(),
    }),
  }),
  
  z.object({
    type: z.literal('data-clinical-status'),
    data: z.object({
      message: z.string(),
      stage: z.string(),
      icon: z.enum(['analyzing', 'searching', 'thinking', 'complete']).optional(),
    }),
  }),
  
  z.object({
    type: z.literal('data-pico-generation'),
    data: z.object({
      population: z.string().optional(),
      intervention: z.string().optional(),
      comparison: z.string().optional(),
      outcome: z.string().optional(),
      status: z.enum(['generating', 'refining', 'complete']),
      confidence: z.number(),
    }),
  }),
  
  z.object({
    type: z.literal('data-snapps-progress'),
    data: z.object({
      step: z.enum(['S', 'N', 'A', 'P1', 'P2', 'S2']),
      stepName: z.string(),
      completed: z.boolean(),
      feedback: z.string().optional(),
      nextAction: z.string().optional(),
    }),
  }),
  
  z.object({
    type: z.literal('data-bias-detection'),
    data: z.object({
      biasType: z.string(),
      biasDescription: z.string(),
      likelihood: z.number(),
      mitigation: z.string(),
      status: z.enum(['analyzing', 'detected', 'no-bias-found']),
    }),
  }),
]);

// ===== UTILITY TYPES =====

/**
 * Utility type for extracting tool names from ClinicalTools
 */
export type ClinicalToolName = keyof ClinicalTools;

/**
 * Utility type for Academy module contexts
 */
export interface AcademyContext {
  moduleId: string;
  moduleName: string;
  learningObjectives: string[];
  currentStep?: string;
}

/**
 * Patient context for clinical conversations
 */
export interface PatientContext {
  id?: number;
  age?: number;
  sex?: 'M' | 'F' | 'Other';
  medicalHistory?: string[];
  currentMedications?: string[];
  allergies?: string[];
  chiefComplaint?: string;
}