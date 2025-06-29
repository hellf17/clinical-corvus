import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import { Patient, Exam } from '@/store/patientStore';
import { Medication } from '@/types/medication';
import { ClinicalNote } from '@/types/clinical_note';
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';

// Import icons
import { 
  AiFillMedicineBox, 
  AiFillExperiment,
  AiFillAlert,
  AiFillSafetyCertificate
} from 'react-icons/ai';
import { BiSolidInjection } from 'react-icons/bi';
import { FaStethoscope, FaCalendarAlt, FaRegFileAlt } from 'react-icons/fa';

interface ConsolidatedTimelineChartProps {
  patient: Patient;
  exams?: Exam[];
  medications?: Medication[];
  clinicalNotes?: ClinicalNote[];
  clinicalScores?: Array<{
    score_type: string;
    value: number;
    timestamp: string;
  }>;
  title?: string;
}

type EventCategory = 'exam' | 'medication' | 'score' | 'admission' | 'note';

interface TimelineEvent {
  id: string;
  date: Date;
  title: string;
  description: string;
  category: EventCategory;
  iconColor: string;
  iconBackground: string;
  icon: React.ReactNode;
  isAbnormal?: boolean;
  htmlContent?: string;
}

// Define initial filter state
const initialFilterState: Record<EventCategory, boolean> = {
    admission: true,
    exam: true,
    medication: true,
    score: true,
    note: true,
};

// Helper to get plain text snippet from HTML
function getSnippetFromHtml(html: string, maxLength: number = 100): string {
    if (!html) return '';
    // Basic approach: strip tags and truncate
    const text = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

export const ConsolidatedTimelineChart: React.FC<ConsolidatedTimelineChartProps> = ({
  patient,
  exams = [],
  medications = [],
  clinicalNotes = [],
  clinicalScores = [],
  title = 'Linha do Tempo Consolidada'
}) => {
  // State for filtering
  const [filters, setFilters] = useState<Record<EventCategory, boolean>>(initialFilterState);

  // Convert all events to a common format and sort by date
  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];
    
    // Add admission event if available
    if (patient.admissionDate) {
      allEvents.push({
        id: 'admission',
        date: new Date(patient.admissionDate),
        title: 'Admissão Hospitalar',
        description: `Paciente ${patient.name} admitido com diagnóstico: ${patient.primary_diagnosis || 'Não especificado'}`,
        category: 'admission',
        iconColor: '#fff',
        iconBackground: '#4f46e5',
        icon: <FaCalendarAlt />
      });
    }
    
    // Add exams
    exams.forEach(exam => {
      const abnormalResults = (exam.lab_results || []).filter(r => r.is_abnormal);
      const normalResults = (exam.lab_results || []).filter(r => !r.is_abnormal);
      
      let abnormalDesc = '';
      if (abnormalResults.length > 0) {
        abnormalDesc = abnormalResults.map(r => {
          let refRange = '';
          if (r.reference_range_low !== null && r.reference_range_high !== null && r.reference_range_low !== undefined && r.reference_range_high !== undefined) {
            refRange = ` (Ref: ${r.reference_range_low}-${r.reference_range_high})`;
          }
          return `${r.test_name} (${r.value_numeric ?? r.value_text ?? ''}${r.unit ? ' ' + r.unit : ''}${refRange})`;
        }).join(', ');
      }
      
      allEvents.push({
        id: `exam-${exam.exam_id}`,
        date: new Date(exam.exam_timestamp!),
        title: `Exame Laboratorial`,
        description: `${(exam.lab_results || []).length} resultado(s) (${abnormalResults.length} alterado(s))
        ${abnormalResults.length > 0 ? `\nResultados alterados: ${abnormalDesc}` : ''}`,
        category: 'exam',
        iconColor: '#fff',
        iconBackground: abnormalResults.length > 0 ? '#ef4444' : '#10b981',
        icon: <AiFillExperiment />,
        isAbnormal: abnormalResults.length > 0
      });
    });
    
    // Add medications
    medications.forEach(med => {
      allEvents.push({
        id: `medication-${med.medication_id}`,
        date: new Date(med.start_date),
        title: `Medicação: ${med.name}`,
        description: `Dose: ${med.dosage || 'Não especificada'}\nFrequência: ${med.frequency || 'Não especificada'}${med.end_date ? `\nData de término: ${new Date(med.end_date).toLocaleDateString()}` : ''}`,
        category: 'medication',
        iconColor: '#fff',
        iconBackground: '#f59e0b',
        icon: <AiFillMedicineBox />
      });
    });
    
    // Add clinical notes
    clinicalNotes.forEach(note => {
        allEvents.push({
            id: `note-${note.id}`,
            date: new Date(note.created_at),
            title: `Nota Clínica: ${note.title || note.note_type}`,
            description: getSnippetFromHtml(note.content),
            category: 'note',
            iconColor: '#fff',
            iconBackground: '#6b7280',
            icon: <FaRegFileAlt />,
        });
    });
    
    // Add clinical scores
    clinicalScores.forEach((score, index) => {
      let iconColor = '#fff';
      let iconBackground = '#10b981';
      let icon = <FaStethoscope />;
      
      // Determine severity level and icon by score type
      if (score.score_type === 'SOFA' || score.score_type === 'APACHE II') {
        if (score.value >= 15) {
          iconBackground = 'hsl(var(--destructive))';
          icon = <AiFillAlert />;
        } else if (score.value >= 10) {
          iconBackground = 'hsl(var(--warning))';
          icon = <AiFillAlert />;
        } else if (score.value >= 5) {
          iconBackground = 'hsl(var(--warning-foreground))';
          icon = <AiFillSafetyCertificate />;
        }
      } else if (score.score_type === 'qSOFA') {
        if (score.value >= 2) {
          iconBackground = 'hsl(var(--destructive))';
          icon = <AiFillAlert />;
        } else if (score.value === 1) {
          iconBackground = 'hsl(var(--warning-foreground))';
          icon = <AiFillSafetyCertificate />;
        }
      }
      
      allEvents.push({
        id: `score-${score.score_type}-${index}`,
        date: new Date(score.timestamp),
        title: `Score: ${score.score_type}`,
        description: `Valor: ${score.value}`,
        category: 'score',
        iconColor,
        iconBackground,
        icon
      });
    });
    
    // Sort by date (newest first)
    return allEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [patient, exams, medications, clinicalScores, clinicalNotes]);
  
  // Handle filter changes
  const handleFilterChange = (category: EventCategory) => {
      setFilters(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // Apply filters
  const filteredEvents = useMemo(() => {
      return events.filter(event => filters[event.category]);
  }, [events, filters]);
  
  // Format date for display
  const formatDate = (date: Date): string => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  
  // Render filter controls
  const renderFilterControls = () => (
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-3">
          <p className="text-sm font-medium mr-2">Mostrar:</p>
          {Object.keys(initialFilterState).map((key) => {
              const category = key as EventCategory;
              // Simple labels for filters
              const categoryLabels: Record<EventCategory, string> = {
                  admission: 'Admissão',
                  exam: 'Exames',
                  medication: 'Medicações',
                  score: 'Scores',
                  note: 'Notas'
              };
              return (
                  <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                          id={`filter-${category}`}
                          checked={filters[category]}
                          onCheckedChange={() => handleFilterChange(category)}
                      />
                      <Label htmlFor={`filter-${category}`} className="text-sm font-normal cursor-pointer">
                          {categoryLabels[category]}
                      </Label>
                  </div>
              );
          })}
      </div>
  );
  
  if (filteredEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderFilterControls()}
          <div className="text-center py-8 text-muted-foreground">
            {events.length === 0 
                ? 'Não há eventos disponíveis para visualização' 
                : 'Nenhum evento corresponde aos filtros selecionados.'}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {renderFilterControls()}
        <div className="vertical-timeline-container">
          <VerticalTimeline animate={false} lineColor="hsl(var(--border))">
            {filteredEvents.map(event => (
              <VerticalTimelineElement
                key={event.id}
                date={formatDate(event.date)}
                dateClassName="font-medium text-muted-foreground"
                iconStyle={{ background: event.iconBackground, color: event.iconColor }}
                icon={event.icon}
                contentStyle={{ 
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--card-foreground))',
                  boxShadow: 'none',
                  borderRadius: '0.5rem',
                  border: event.isAbnormal ? '2px solid hsl(var(--destructive))' : '1px solid hsl(var(--border))'
                }}
                contentArrowStyle={{ 
                  borderRight: event.isAbnormal ? '7px solid hsl(var(--destructive))' : '7px solid hsl(var(--border))'
                }}
              >
                <h3 className="text-base font-semibold mb-1">{event.title}</h3>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {event.description}
                </p>
              </VerticalTimelineElement>
            ))}
          </VerticalTimeline>
        </div>
        
        <div className="mt-6 text-sm text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">Legenda:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <div className="flex items-center">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 rounded-full mr-1.5">
                <FaCalendarAlt className="text-white text-xs" />
              </span>
              <span>Admissão</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-green-600 rounded-full mr-1.5">
                <AiFillExperiment className="text-white text-xs" />
              </span>
              <span>Exame normal</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-red-600 rounded-full mr-1.5">
                <AiFillExperiment className="text-white text-xs" />
              </span>
              <span>Exame alterado</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-600 rounded-full mr-1.5">
                <AiFillMedicineBox className="text-white text-xs" />
              </span>
              <span>Medicação</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-red-600 rounded-full mr-1.5">
                <AiFillAlert className="text-white text-xs" />
              </span>
              <span>Score crítico</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-green-600 rounded-full mr-1.5">
                <FaStethoscope className="text-white text-xs" />
              </span>
              <span>Score normal</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-500 rounded-full mr-1.5">
                <FaRegFileAlt className="text-white text-xs" />
              </span>
              <span>Nota Clínica</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsolidatedTimelineChart; 