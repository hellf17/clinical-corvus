import React, { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useUIStore } from '@/store/uiStore';
import { usePatientStore } from '@/store/patientStore';
import { Edit, Trash, Clock, File, Plus, X, Bold, Italic, List, ListOrdered } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { clinicalNoteService } from '@/services/clinicalNoteService';
import { ClinicalNote, NoteType } from '@/types/clinical_note';
import { VitalSign } from '@/types/health';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Spinner } from '@/components/ui/Spinner';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from "@/components/ui/AlertDialog";
import VitalSignsForm from './VitalSignsForm';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { buttonVariants } from '@/components/ui/Button';
import { useAuth } from '@clerk/nextjs';

// Human-readable labels for note types
const noteTypeLabels: Record<NoteType, string> = {
  'evolution': 'Evolução',
  'admission': 'Admissão',
  'discharge': 'Alta',
  'procedure': 'Procedimento',
  'consultation': 'Consulta',
  'other': 'Outro'
};

interface ClinicalNotesProps {
  patientId: string;
}

// --- TipTap Editor Component ---
const TiptapEditor = ({ content, onChange, editor }: { content: string, onChange: (richText: string) => void, editor: Editor | null }) => {

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false); // Set initial content without emitting update
    }
  }, [content, editor]);

  if (!editor) {
      return <div className="border rounded-md min-h-[150px] p-2 animate-pulse bg-muted">Loading Editor...</div>;
  }

  return (
    <div className="prose dark:prose-invert max-w-none border border-input rounded-md">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="p-2 min-h-[150px] focus-within:outline-none" />
    </div>
  );
};

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) {
        return null;
    }

    const ToggleButton = ({ icon: Icon, command, args, isActive, label }: { icon: React.ElementType, command: string, args?: any, isActive: boolean, label: string }) => (
        <Button
            type="button"
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => (editor.chain().focus() as any)[command](args).run()} // Type assertion needed for chain methods
            className={`p-1 h-auto ${isActive ? 'is-active' : ''}`}
            aria-label={label}
            title={label}
        >
            <Icon className="h-4 w-4" />
        </Button>
    );

    return (
        <div className="flex items-center gap-1 border-b border-input p-1 flex-wrap">
            <ToggleButton icon={Bold} command="toggleBold" isActive={editor.isActive('bold')} label="Bold" />
            <ToggleButton icon={Italic} command="toggleItalic" isActive={editor.isActive('italic')} label="Italic" />
            <ToggleButton icon={List} command="toggleBulletList" isActive={editor.isActive('bulletList')} label="Bullet List" />
            <ToggleButton icon={ListOrdered} command="toggleOrderedList" isActive={editor.isActive('orderedList')} label="Numbered List" />
        </div>
    );
};
// --- End TipTap Editor Component ---

export default function ClinicalNotes({ patientId }: ClinicalNotesProps) {
  const [showVitalSignsForm, setShowVitalSignsForm] = useState(false);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<NoteType | 'all'>('all');
  const { addNotification } = useUIStore();
  const { getToken } = useAuth();
  
  const [newNote, setNewNote] = useState<{
    title: string;
    content: string;
    note_type: NoteType;
  }>({
    title: '',
    content: '',
    note_type: 'evolution'
  });

  // Initialize TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure extensions as needed
        heading: {
          levels: [1, 2, 3],
        },
        // Disable Dropcursor if it causes issues
        dropcursor: false,
        // Add more extensions if needed
      }),
    ],
    content: newNote.content, // Initial content
    editorProps: {
        attributes: {
            // Add Tailwind classes for styling
            class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[150px]',
        },
    },
    onUpdate: ({ editor }) => {
      setNewNote(prev => ({ ...prev, content: editor.getHTML() }));
    },
  });

  // Cleanup editor instance
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const [isDeleting, setIsDeleting] = useState(false);

  // Load existing notes
  useEffect(() => {
    async function loadNotes() {
      try {
        setIsLoading(true);
        const response = await clinicalNoteService.getNotes(patientId);
        setNotes(response.notes || []);
      } catch (error) {
        console.error('Error loading notes:', error);
        addNotification({
          title: 'Error',
          message: 'Could not load patient notes.',
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadNotes();
  }, [patientId, addNotification]);

  // Reset editor content when form is reset
  const resetFormAndEditor = useCallback(() => {
    setNewNote({
      title: '',
      content: '',
      note_type: 'evolution'
    });
    editor?.commands.setContent('', false); // Reset editor content
    setShowForm(false);
    setEditingId(null);
  }, [editor]);

  // Add new note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return; // Ensure editor is initialized
    try {
      // Get content from editor state if different from newNote state (ensure latest)
      const currentContent = editor.getHTML();
      const noteToCreate = {
        ...newNote,
        content: currentContent, // Use editor's current HTML
      };

      if (!noteToCreate.title.trim()) {
          addNotification({ title: 'Validation Error', message: 'Title cannot be empty.', type: 'error' });
          return;
      }
      if (editor.isEmpty) {
          addNotification({ title: 'Validation Error', message: 'Content cannot be empty.', type: 'error' });
          return;
      }

      const createdNote = await clinicalNoteService.createNoteForPatient(patientId, noteToCreate);
      setNotes(prev => [createdNote, ...prev]);
      resetFormAndEditor(); // Use the new reset function
      addNotification({
        title: 'Success',
        message: 'Note added successfully.',
        type: 'success'
      });
    } catch (error) {
      console.error('Error adding note:', error);
      addNotification({
        title: 'Error',
        message: 'Could not add the note.',
        type: 'error'
      });
    }
  };

  // Update note
  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editor) return; // Ensure editor is initialized

    try {
        // Get content from editor state if different from newNote state (ensure latest)
        const currentContent = editor.getHTML();
        const noteToUpdate = {
            ...newNote,
            content: currentContent // Use editor's current HTML
        };

        if (!noteToUpdate.title.trim()) {
          addNotification({ title: 'Validation Error', message: 'Title cannot be empty.', type: 'error' });
          return;
        }
        if (editor.isEmpty) {
            addNotification({ title: 'Validation Error', message: 'Content cannot be empty.', type: 'error' });
            return;
        }

      const updatedNote = await clinicalNoteService.updateNoteForPatient(
        patientId,
        editingId,
        noteToUpdate
      );

      setNotes(prev =>
        prev.map(note => note.id === editingId ? updatedNote : note)
      );

      resetFormAndEditor(); // Use the new reset function

      addNotification({
        title: 'Success',
        message: 'Note updated successfully.',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating note:', error);
      addNotification({
        title: 'Error',
        message: 'Could not update the note.',
        type: 'error'
      });
    }
  };

  // Delete note (now asynchronous, called by AlertDialog)
  const performDeleteNote = async (id: string) => {
    setIsDeleting(true);
    try {
      await clinicalNoteService.deleteNoteForPatient(patientId, id);
      setNotes(prev => prev.filter(note => note.id !== id));
      addNotification({
        title: 'Success',
        message: 'Note deleted successfully.',
        type: 'success'
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      addNotification({
        title: 'Error',
        message: 'Could not delete the note.',
        type: 'error'
      });
    } finally {
       setIsDeleting(false);
    }
  };

  // Edit note
  const handleEditNote = (note: ClinicalNote) => {
    // Set state first
    setNewNote({
      title: note.title,
      content: note.content, // Keep as HTML string
      note_type: note.note_type
    });
    // Then update the editor content AFTER state is potentially set
    editor?.commands.setContent(note.content || '', false);
    setEditingId(note.id);
    setShowForm(true);
  };

  // Filter notes by type
  const filteredNotes = currentFilter === 'all' 
    ? notes 
    : notes.filter(note => note.note_type === currentFilter);

  // Handler for opening the add note form
  const handleOpenAddForm = () => {
    resetFormAndEditor(); // Ensure form and editor are reset
    setShowForm(true);
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center p-10">
            <Spinner size="lg" />
        </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Clinical Notes</h2>
        <div className="flex gap-2 flex-wrap">
          <Select
            value={currentFilter}
            onValueChange={(value) => setCurrentFilter(value as NoteType | 'all')}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notes</SelectItem>
              {Object.entries(noteTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={handleOpenAddForm}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar Nota
            </Button>
            <Button variant="secondary" onClick={() => setShowVitalSignsForm(true)}>
                Adicionar Sinais Vitais
            </Button>
          </div>
        </div>
      </div>

      {showVitalSignsForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Adicionar Sinais Vitais</CardTitle>
          </CardHeader>
          <CardContent>
            <VitalSignsForm
              onSubmit={async (formData) => {
                try {
                  const numericPatientId = parseInt(patientId, 10);
                  if (isNaN(numericPatientId)) {
                      throw new Error("Invalid Patient ID format.");
                  }
                  const vitalSignsDataForStore: Omit<VitalSign, 'vital_id' | 'patient_id'> = {
                      ...formData,
                      created_at: new Date().toISOString()
                  };
                  const token = await getToken();
                  if (!token) {
                    throw new Error("Falha na autenticação. Token não disponível.");
                  }
                  await usePatientStore.getState().addVitalSigns(numericPatientId, vitalSignsDataForStore, token);
                  setShowVitalSignsForm(false);
                  addNotification({
                    title: 'Sucesso',
                    message: 'Sinais vitais registrados.',
                    type: 'success'
                  });
                } catch (error: any) {
                  console.error("Error saving vital signs:", error);
                  addNotification({
                    title: 'Erro',
                    message: `Falha ao registrar sinais vitais: ${error.message}`,
                    type: 'error'
                  });
                }
              }}
              onCancel={() => setShowVitalSignsForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Nota Clínica' : 'Nova Nota Clínica'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingId ? handleUpdateNote : handleAddNote} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="noteTitle" className="block text-sm font-medium mb-1">Título*</label>
                  <Input 
                    id="noteTitle"
                    value={newNote.title}
                    onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type*</label>
                  <Select
                    value={newNote.note_type}
                    onValueChange={(value) => setNewNote({...newNote, note_type: value as NoteType})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select note type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(noteTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Content*</label>
                <TiptapEditor
                    editor={editor}
                    content={newNote.content}
                    onChange={(richText) => {
                        // This onChange is implicitly handled by editor.onUpdate
                        // We keep the prop for potential future direct handling if needed
                    }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    resetFormAndEditor();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Atualizar' : 'Salvar'} Nota
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      {!showForm && (
        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <div className="text-center text-muted-foreground p-6">
              Nenhuma nota encontrada{currentFilter !== 'all' ? ` do tipo \"${noteTypeLabels[currentFilter]}\"` : ''}.
            </div>
          ) : (
            filteredNotes.map(note => (
              <Card key={note.id}>
                <CardHeader className="flex flex-row justify-between items-start pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">{note.title || noteTypeLabels[note.note_type]}</CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                      <span className="flex items-center gap-1"><File className="w-3 h-3" />{noteTypeLabels[note.note_type]}</span>
                      <span className="mx-1 hidden sm:inline">•</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(note.created_at), 'dd/MM/yyyy HH:mm')}</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={() => handleEditNote(note)} title="Edit Note">
                       <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 h-auto text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete Note">
                          <Trash className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                           <AlertDialogDescription>
                             This action cannot be undone. This will permanently delete the clinical note titled &quot;{note.title}&quot;.
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel>Cancel</AlertDialogCancel>
                           <AlertDialogAction onClick={() => performDeleteNote(note.id)} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              {isDeleting ? <Spinner size="sm" className="mr-2" /> : null}
                              Delete
                           </AlertDialogAction>
                         </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                   <div
                     className="prose dark:prose-invert max-w-none text-sm"
                     dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content || '') }}
                   />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
} 
