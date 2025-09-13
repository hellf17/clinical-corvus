'use client';

import React, { useState, useEffect } from 'react';
import useSWRInfinite from 'swr/infinite';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Plus, Clock, User, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/Badge';
import { GroupPatient } from '@/types/group';

interface ClinicalNote {
  id: string;
  title: string;
  content: string;
  note_type: string;
  patient_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  author: string;
}

interface NotesResponse {
  notes: ClinicalNote[];
  total: number;
}

const fetcher = async (url: string): Promise<NotesResponse> => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = new Error('Failed to fetch notes');
    throw error;
  }

  return response.json();
};

const addNote = async (patientId: string, note: { title: string; content: string; note_type: string }): Promise<ClinicalNote> => {
  const response = await fetch(`/api/patients/${patientId}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(note),
  });

  if (!response.ok) {
    const error = new Error('Failed to add note');
    throw error;
  }

  return response.json();
};

// Note type labels in Portuguese
const noteTypeLabels: Record<string, string> = {
  'evolution': 'Evolução',
  'admission': 'Admissão',
  'discharge': 'Alta',
  'procedure': 'Procedimento',
  'consultation': 'Consulta',
  'other': 'Outro'
};

export default function PatientNotesPage() {
  const params = useParams();
  const id = params.id as string;
  const { getToken } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<GroupPatient[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    note_type: 'evolution'
  });

  // Initialize TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        dropcursor: false,
      }),
    ],
    content: newNote.content,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[150px]',
      },
    },
    onUpdate: ({ editor }) => {
      setNewNote(prev => ({ ...prev, content: editor.getHTML() }));
    },
  });

  // Cleanup editor instance
  React.useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  // Fetch token on mount
  useEffect(() => {
    const fetchToken = async () => {
      const fetchedToken = await getToken();
      setToken(fetchedToken);
    };
    fetchToken();
  }, [getToken]);

  // Fetch groups for this patient
  useEffect(() => {
    const fetchPatientGroups = async () => {
      try {
        // Fetch all groups and check which ones this patient belongs to
        // This is a simplified approach - in a production environment,
        // you would want a more efficient backend endpoint
        if (!token) return;
        
        // First, get all groups the current user belongs to
        const groupsResponse = await fetch('/api/groups', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!groupsResponse.ok) {
          throw new Error('Failed to fetch groups');
        }
        
        const groupsData = await groupsResponse.json();
        const userGroups = groupsData.items || [];
        
        // For each group, check if this patient is assigned to it
        const patientGroups: GroupPatient[] = [];
        for (const group of userGroups) {
          try {
            const patientsResponse = await fetch(`/api/groups/${group.id}/patients`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (patientsResponse.ok) {
              const patientsData = await patientsResponse.json();
              const patientInGroup = patientsData.items?.find((p: GroupPatient) => p.patient_id === parseInt(id));
              if (patientInGroup) {
                patientGroups.push(patientInGroup);
              }
            }
          } catch (err) {
            console.warn(`Failed to check group ${group.id} for patient assignment`, err);
          }
        }
        
        setGroups(patientGroups);
      } catch (error) {
        console.error('Error fetching patient groups:', error);
      }
    };

    if (token) {
      fetchPatientGroups();
    }
  }, [token, id]);

  // Fetch notes using SWRInfinite
  const getKey = (pageIndex: number, previousPageData: NotesResponse | null) => {
    if (previousPageData && !previousPageData.notes.length) return null; // reached the end
    return `/api/patients/${id}/notes?skip=${pageIndex * 10}&limit=10`;
  };

  const {
    data,
    error,
    isLoading,
    size,
    setSize,
    isValidating,
    mutate
  } = useSWRInfinite<NotesResponse>(getKey, fetcher, { revalidateOnFocus: true });

  const notes = data ? data.flatMap(page => page.notes) : [];
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
  const isEmpty = data?.[0]?.notes.length === 0;
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.notes.length < 10);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;

    setIsSubmitting(true);
    try {
      const currentContent = editor.getHTML();
      const noteToCreate = {
        ...newNote,
        content: currentContent,
      };

      if (!noteToCreate.title.trim()) {
        toast.error('O título não pode estar vazio.');
        return;
      }
      if (editor.isEmpty) {
        toast.error('O conteúdo não pode estar vazio.');
        return;
      }

      await addNote(id, noteToCreate);
      mutate(); // Refresh the notes list
      resetForm();
      toast.success('Nota clínica adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Falha ao adicionar a nota clínica.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewNote({
      title: '',
      content: '',
      note_type: 'evolution'
    });
    editor?.commands.setContent('', false);
    setShowForm(false);
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="text-center text-red-600">
          Erro ao carregar notas clínicas.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Notas Clínicas</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 md:px-6 py-8">
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notas Clínicas</h1>
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {groups.slice(0, 3).map((group) => (
                <Badge key={group.id} variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Grupo #{group.group_id}
                </Badge>
              ))}
              {groups.length > 3 && (
                <Badge variant="secondary">+{groups.length - 3} mais</Badge>
              )}
            </div>
          )}
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Nota
        </Button>
      </div>

      {/* Add Note Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nova Nota Clínica</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddNote} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="noteTitle" className="block text-sm font-medium mb-1">
                    Título *
                  </label>
                  <Input 
                    id="noteTitle"
                    value={newNote.title}
                    onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                    placeholder="Digite o título da nota"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tipo *
                  </label>
                  <Select
                    value={newNote.note_type}
                    onValueChange={(value) => setNewNote({...newNote, note_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
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
                <label className="block text-sm font-medium mb-1">
                  Conteúdo *
                </label>
                <div className="border rounded-md">
                  <div className="flex items-center gap-1 border-b border-input p-1 flex-wrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      className={`p-1 h-auto ${editor?.isActive('bold') ? 'is-active' : ''}`}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      className={`p-1 h-auto ${editor?.isActive('italic') ? 'is-active' : ''}`}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleBulletList().run()}
                      className={`p-1 h-auto ${editor?.isActive('bulletList') ? 'is-active' : ''}`}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                      className={`p-1 h-auto ${editor?.isActive('orderedList') ? 'is-active' : ''}`}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </div>
                  <EditorContent 
                    editor={editor} 
                    className="p-2 min-h-[150px] focus-within:outline-none" 
                  />
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Nota'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-12 bg-card text-card-foreground rounded-lg">
            <h3 className="text-lg font-medium mb-2">
              Nenhuma nota clínica encontrada
            </h3>
            <p className="text-muted-foreground mb-4">
              Clique em "Nova Nota" para adicionar a primeira nota clínica.
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
              <CardHeader className="flex flex-row justify-between items-start pb-2">
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold">
                    {note.title || noteTypeLabels[note.note_type] || 'Nota sem título'}
                  </CardTitle>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {note.author || 'Autor não identificado'}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {noteTypeLabels[note.note_type] || note.note_type}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="prose dark:prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {!isReachingEnd && (
        <div className="text-center mt-6">
          <Button
            onClick={() => setSize(size + 1)}
            disabled={isLoadingMore}
            variant="outline"
          >
            {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </div>
  );
}