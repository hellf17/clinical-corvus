import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/Popover";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
 DialogTitle, 
  DialogFooter 
} from "@/components/ui/Dialog";
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
  AiFillSafetyCertificate,
  AiFillEdit
} from 'react-icons/ai';
import { BiSolidInjection } from 'react-icons/bi';
import { FaStethoscope, FaCalendarAlt, FaRegFileAlt, FaPlus, FaSave, FaTrash } from 'react-icons/fa';
import { FiMoreVertical } from 'react-icons/fi';

interface EnhancedConsolidatedTimelineChartProps {
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
  onEventClick?: (event: TimelineEvent) => void;
  onAddAnnotation?: (eventId: string, annotation: string) => void;
  onDeleteEvent?: (eventId: string) => void;
}

type EventCategory = 'exam' | 'medication' | 'score' | 'admission' | 'note' | 'annotation';

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
  annotations?: string[];
  createdBy?: string;
  createdAt?: Date;
}

// Define initial filter state
const initialFilterState: Record<EventCategory, boolean> = {
    admission: true,
    exam: true,
    medication: true,
    score: true,
    note: true,
    annotation: true
};

// Helper to get plain text snippet from HTML
function getSnippetFromHtml(html: string, maxLength: number = 100): string {
    if (!html) return '';
    // Basic approach: strip tags and truncate
    const text = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

export const EnhancedConsolidatedTimelineChart: React.FC<EnhancedConsolidatedTimelineChartProps> = ({
  patient,
  exams = [],
  medications = [],
  clinicalNotes = [],
  clinicalScores = [],
  title = 'Linha do Tempo Consolidada',
  onEventClick,
  onAddAnnotation,
  onDeleteEvent
}) => {
  // State for filtering
  const [filters, setFilters] = useState<Record<EventCategory, boolean>>(initialFilterState);
  const [annotations, setAnnotations] = useState<Record<string, string[]>>({});
  const [newAnnotation, setNewAnnotation] = useState<{eventId: string, text: string} | null>(null);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: 'note' as EventCategory
  });
  
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
        icon: <FaCalendarAlt />,
        annotations: annotations['admission'] || []
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
        isAbnormal: abnormalResults.length > 0,
        annotations: annotations[`exam-${exam.exam_id}`] || []
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
        icon: <AiFillMedicineBox />,
        annotations: annotations[`medication-${med.medication_id}`] || []
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
            annotations: annotations[`note-${note.id}`] || []
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
        icon,
        annotations: annotations[`score-${score.score_type}-${index}`] || []
      });
    });
    
    // Add annotations as separate events
    Object.entries(annotations).forEach(([eventId, annotationList]) => {
      if (annotationList.length > 0) {
        const parentEvent = allEvents.find(e => e.id === eventId);
        if (parentEvent) {
          annotationList.forEach((annotation, index) => {
            allEvents.push({
              id: `annotation-${eventId}-${index}`,
              date: new Date(), // Use current date for annotations
              title: `Anotação`,
              description: annotation,
              category: 'annotation',
              iconColor: '#fff',
              iconBackground: '#8b5cf6',
              icon: <AiFillEdit />,
              createdBy: 'Clínico', // This would come from auth context in real implementation
              createdAt: new Date()
            });
          });
        }
      }
    });
    
    // Sort by date (newest first)
    return allEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [patient, exams, medications, clinicalScores, clinicalNotes, annotations]);
  
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
  
  // Add annotation to an event
  const handleAddAnnotation = (eventId: string) => {
    if (newAnnotation && newAnnotation.text.trim()) {
      const updatedAnnotations = {
        ...annotations,
        [eventId]: [...(annotations[eventId] || []), newAnnotation.text.trim()]
      };
      setAnnotations(updatedAnnotations);
      if (onAddAnnotation) {
        onAddAnnotation(eventId, newAnnotation.text.trim());
      }
      setNewAnnotation(null);
    }
  };
  
  // Delete an event
  const handleDeleteEvent = (eventId: string) => {
    if (onDeleteEvent) {
      onDeleteEvent(eventId);
    }
  };
  
  // Add a new custom event
  const handleAddEvent = () => {
    // In a real implementation, this would call an API to add the event
    // For now, we'll just close the dialog
    setShowAddEventDialog(false);
    setNewEvent({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      category: 'note'
    });
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
                  note: 'Notas',
                  annotation: 'Anotações'
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
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowAddEventDialog(true)}
            className="ml-auto"
          >
            <FaPlus className="mr-2 h-3 w-3" />
            Adicionar Evento
          </Button>
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
                <div className="flex justify-between items-start">
                  <h3 className="text-base font-semibold mb-1">{event.title}</h3>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <FiMoreVertical className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2">
                      <div className="space-y-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => onEventClick && onEventClick(event)}
                        >
                          <AiFillEdit className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => setNewAnnotation({eventId: event.id, text: ''})}
                        >
                          <FaPlus className="mr-2 h-4 w-4" />
                          Adicionar anotação
                        </Button>
                        {onDeleteEvent && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <FaTrash className="mr-2 h-4 w-4" />
                            Excluir
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {event.description}
                </p>
                
                {/* Display annotations */}
                {event.annotations && event.annotations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Anotações:</h4>
                    <ul className="space-y-2">
                      {event.annotations.map((annotation, index) => (
                        <li key={index} className="text-xs bg-muted/50 p-2 rounded">
                          {annotation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Display creator info for annotations */}
                {event.category === 'annotation' && event.createdBy && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Adicionado por {event.createdBy} em {event.createdAt?.toLocaleDateString()}
                  </div>
                )}
              </VerticalTimelineElement>
            ))}
          </VerticalTimeline>
        </div>
        
        <div className="mt-6 text-sm text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">Legenda:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <div className="flex items-center">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-60 rounded-full mr-1.5">
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
            <div className="flex items-center">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-purple-500 rounded-full mr-1.5">
                <AiFillEdit className="text-white text-xs" />
              </span>
              <span>Anotação</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Annotation Dialog */}
      <Dialog open={!!newAnnotation} onOpenChange={() => setNewAnnotation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Anotação</DialogTitle>
          </DialogHeader>
          {newAnnotation && (
            <div className="space-y-4">
              <Textarea
                placeholder="Digite sua anotação..."
                value={newAnnotation.text}
                onChange={(e) => setNewAnnotation({...newAnnotation, text: e.target.value})}
                rows={4}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewAnnotation(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleAddAnnotation(newAnnotation.eventId)}>
                  <FaSave className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Add Event Dialog */}
      <Dialog open={showAddEventDialog} onOpenChange={setShowAddEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-title">Título</Label>
              <Input
                id="event-title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                placeholder="Título do evento"
              />
            </div>
            <div>
              <Label htmlFor="event-description">Descrição</Label>
              <Textarea
                id="event-description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                placeholder="Descrição do evento"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="event-date">Data</Label>
              <Input
                id="event-date"
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="event-category">Categoria</Label>
              <select
                id="event-category"
                value={newEvent.category}
                onChange={(e) => setNewEvent({...newEvent, category: e.target.value as EventCategory})}
                className="w-full p-2 border rounded"
              >
                <option value="note">Nota Clínica</option>
                <option value="exam">Exame</option>
                <option value="medication">Medicação</option>
                <option value="score">Score Clínico</option>
                <option value="admission">Admissão</option>
              </select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddEventDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddEvent}>
                <FaPlus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EnhancedConsolidatedTimelineChart;