'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import useSWRInfinite from 'swr/infinite';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/Table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/Dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/Select';
import { 
  CalendarIcon, 
  UploadIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  FileTextIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { AlertCircle } from 'lucide-react';
import FileUploader from '@/components/file-upload/FileUploader';
import { ExamTimeline } from '@/components/patients/ExamTimeline';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { EnhancedResultsTimelineChart } from '@/components/charts/EnhancedResultsTimelineChart';
import { EnhancedMultiParameterComparisonChart } from '@/components/charts/EnhancedMultiParameterComparisonChart';
import { EnhancedCorrelationMatrixChart } from '@/components/charts/EnhancedCorrelationMatrixChart';
import { EnhancedScatterPlotChart } from '@/components/charts/EnhancedScatterPlotChart';

// Exam type definition
interface Exam {
  exam_id: number;
  patient_id: number;
  user_id: number;
  exam_timestamp: string;
  upload_timestamp: string;
  exam_type: string | null;
  source_file_name: string | null;
  source_file_path: string | null;
  processing_status: 'pending' | 'processing' | 'processed' | 'error';
  processing_log: string | null;
  created_at: string;
  updated_at: string;
  lab_results: any[];
}

interface ExamListResponse {
  exams: Exam[];
  total: number;
}

// Fetcher function for SWR
const fetcher = async ([url, token]: [string, string | null]) => {
  if (!token) {
    throw new Error('Authentication token is not available.');
  }
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }
  
  return res.json();
};

// Form schema for exam creation/editing
const examFormSchema = z.object({
  exam_timestamp: z.string().min(1, 'Data do exame é obrigatória'),
  exam_type: z.string().optional(),
  source_file_name: z.string().optional(),
  processing_status: z.enum(['pending', 'processing', 'processed', 'error']).optional(),
  processing_log: z.string().optional(),
  metadata: z.string().optional(),
});

type ExamFormValues = z.infer<typeof examFormSchema>;

export default function PatientExamsPage() {
  const params = useParams();
  const patientId = parseInt(params.id as string, 10);
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ status: 'idle' | 'uploading' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });

  // Fetch token on mount
  useEffect(() => {
    const fetchToken = async () => {
      const fetchedToken = await getToken();
      setToken(fetchedToken);
    };
    fetchToken();
  }, [getToken]);

  // Fetch exams using SWRInfinite
  const getKey = (pageIndex: number, previousPageData: ExamListResponse | null) => {
    if (previousPageData && !previousPageData.exams.length) return null; // reached the end
    if (!token) return null;
    return [`/api/patients/${patientId}/exams?skip=${pageIndex * 10}&limit=10`, token];
  };

  const {
    data,
    error,
    isLoading,
    size,
    setSize,
    isValidating,
    mutate,
  } = useSWRInfinite<ExamListResponse>(getKey, fetcher, { revalidateOnFocus: true });

  const exams = data ? data.flatMap(page => page.exams) : [];
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
  const isEmpty = data?.[0]?.exams.length === 0;
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.exams.length < 10);

  // Form setup
  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      exam_timestamp: new Date().toISOString().split('T')[0],
      exam_type: '',
      source_file_name: '',
      processing_status: 'pending',
      processing_log: '',
    },
  });

  // Reset form when dialog opens/closes or when editing exam changes
  useEffect(() => {
    if (isDialogOpen) {
      if (editingExam) {
        form.reset({
          exam_timestamp: editingExam.exam_timestamp.split('T')[0],
          exam_type: editingExam.exam_type || '',
          source_file_name: editingExam.source_file_name || '',
          processing_status: editingExam.processing_status,
          processing_log: editingExam.processing_log || '',
        });
      } else {
        form.reset({
          exam_timestamp: new Date().toISOString().split('T')[0],
          exam_type: '',
          source_file_name: '',
          processing_status: 'pending',
          processing_log: '',
        });
      }
    }
  }, [isDialogOpen, editingExam, form]);

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setUploadStatus({ status: 'idle', message: '' });
    }
  };

  // Handle form submission
  const onSubmit = async (data: ExamFormValues) => {
    try {
      if (file) {
        // Handle file upload
        setUploadStatus({ status: 'uploading', message: 'Enviando arquivo...' });
        
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`/api/patients/${patientId}/exams/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Falha ao enviar arquivo');
        }
        
        const result = await response.json();
        setUploadStatus({ status: 'success', message: result.message });
        setFile(null);
        mutate(); // Refresh exams list
        setIsDialogOpen(false);
      } else {
        // Handle regular exam creation/update
        const url = editingExam 
          ? `/api/patients/${patientId}/exams/${editingExam.exam_id}` 
          : `/api/patients/${patientId}/exams`;
          
        const method = editingExam ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Falha ao salvar exame');
        }
        
        mutate(); // Refresh exams list
        setIsDialogOpen(false);
      }
    } catch (error: any) {
      console.error('Error saving exam:', error);
      setUploadStatus({ status: 'error', message: error.message || 'Erro ao salvar exame' });
    }
  };

  // Handle exam deletion
  const handleDeleteExam = async (examId: number) => {
    if (!confirm('Tem certeza que deseja excluir este exame?')) return;
    
    try {
      const response = await fetch(`/api/patients/${patientId}/exams/${examId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao excluir exame');
      }
      
      mutate(); // Refresh exams list
    } catch (error: any) {
      console.error('Error deleting exam:', error);
      alert(error.message || 'Erro ao excluir exame');
    }
  };

  // Open dialog for editing
  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setIsDialogOpen(true);
  };

  // Open dialog for creating new exam
  const handleCreateExam = () => {
    setEditingExam(null);
    setIsDialogOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Falha ao carregar os exames: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gerenciamento de Exames</h1>
        <Button onClick={handleCreateExam}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Adicionar Exame
        </Button>
      </div>

      {/* Upload status message */}
      {uploadStatus.status !== 'idle' && (
        <Alert variant={uploadStatus.status === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {uploadStatus.status === 'uploading' && 'Enviando...'}
            {uploadStatus.status === 'success' && 'Sucesso!'}
            {uploadStatus.status === 'error' && 'Erro'}
          </AlertTitle>
          <AlertDescription>{uploadStatus.message}</AlertDescription>
        </Alert>
      )}

      {/* Exams list */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="comparison">Comparação</TabsTrigger>
          <TabsTrigger value="correlation">Correlação</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Exames</CardTitle>
              <CardDescription>
                {data?.[0]?.total || 0} exames encontrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {exams.length > 0 ? (
                <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Data do Exame</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Arquivo</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exams.map((exam) => (
                        <TableRow key={exam.exam_id}>
                          <TableCell>
                            {format(new Date(exam.exam_timestamp), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {exam.exam_type || 'Não especificado'}
                          </TableCell>
                          <TableCell>
                            {exam.source_file_name ? (
                              <div className="flex items-center">
                                <FileTextIcon className="mr-2 h-4 w-4" />
                                <span className="truncate max-w-xs">{exam.source_file_name}</span>
                              </div>
                            ) : (
                              'Nenhum arquivo'
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              exam.processing_status === 'processed'
                                ? 'bg-green-100 text-green-800'
                                : exam.processing_status === 'error'
                                  ? 'bg-red-100 text-red-800'
                                  : exam.processing_status === 'processing'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                              {exam.processing_status === 'processed' && 'Processado'}
                              {exam.processing_status === 'error' && 'Erro'}
                              {exam.processing_status === 'processing' && 'Processando'}
                              {exam.processing_status === 'pending' && 'Pendente'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditExam(exam)}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteExam(exam.exam_id)}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="block md:hidden">
                  <div className="space-y-4">
                    {exams.map((exam) => (
                      <Card key={exam.exam_id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{exam.exam_type || 'Não especificado'}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(exam.exam_timestamp), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditExam(exam)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteExam(exam.exam_id)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm">
                            <span className="font-medium">Arquivo: </span>
                            {exam.source_file_name ? (
                              <span className="truncate">{exam.source_file_name}</span>
                            ) : (
                              'Nenhum arquivo'
                            )}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Status: </span>
                             <span className={`font-medium ${
                              exam.processing_status === 'processed'
                                ? 'text-green-600'
                                : exam.processing_status === 'error'
                                  ? 'text-red-600'
                                  : exam.processing_status === 'processing'
                                    ? 'text-yellow-600'
                                    : 'text-gray-600'
                            }`}>
                              {exam.processing_status === 'processed' && 'Processado'}
                              {exam.processing_status === 'error' && 'Erro'}
                              {exam.processing_status === 'processing' && 'Processando'}
                              {exam.processing_status === 'pending' && 'Pendente'}
                            </span>
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <FileTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum exame encontrado</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Comece adicionando um novo exame.
                  </p>
                  <div className="mt-6">
                    <Button onClick={handleCreateExam}>
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Adicionar Exame
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            {!isReachingEnd && (
              <div className="text-center p-4">
                <Button
                  onClick={() => setSize(size + 1)}
                  disabled={isLoadingMore}
                  variant="outline"
                >
                  {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Linha do Tempo de Exames</CardTitle>
              <CardDescription>
                Visualização cronológica dos exames
              </CardDescription>
            </CardHeader>
            <CardContent>
              {exams.length > 0 ? (
                <ExamTimeline exams={exams} />
              ) : (
                <div className="text-center py-8">
                  <FileTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum exame encontrado</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Não há exames para exibir na linha do tempo.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="evolution">
          <Card>
            <CardHeader>
              <CardTitle>Evolução Laboratorial</CardTitle>
              <CardDescription>
                Evolução dos resultados laboratoriais ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedResultsTimelineChart 
                results={exams.flatMap(exam => exam.lab_results || [])} 
                title="Evolução Laboratorial"
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Comparação de Múltiplos Parâmetros</CardTitle>
              <CardDescription>
                Comparação de diferentes parâmetros laboratoriais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedMultiParameterComparisonChart 
                exams={exams.map(exam => ({ ...exam, exam_type: exam.exam_type || undefined } as any))} 
                title="Comparação de Múltiplos Parâmetros"
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="correlation">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Matriz de Correlação</CardTitle>
                <CardDescription>
                  Correlação entre diferentes parâmetros laboratoriais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedCorrelationMatrixChart 
                  exams={exams.map(exam => ({ ...exam, exam_type: exam.exam_type || undefined } as any))} 
                  title="Matriz de Correlação"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Gráfico de Dispersão</CardTitle>
                <CardDescription>
                  Relacionamento entre dois parâmetros laboratoriais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedScatterPlotChart 
                  exams={exams.map(exam => ({ ...exam, exam_type: exam.exam_type || undefined } as any))} 
                  title="Gráfico de Dispersão"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Exam form dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExam ? 'Editar Exame' : 'Adicionar Exame'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="exam_timestamp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Exame</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="date"
                          {...field}
                          className="pl-10"
                        />
                        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="exam_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Exame</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de exame" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Hemograma">Hemograma</SelectItem>
                        <SelectItem value="Bioquímica">Bioquímica</SelectItem>
                        <SelectItem value="Hormônios">Hormônios</SelectItem>
                        <SelectItem value="Imunologia">Imunologia</SelectItem>
                        <SelectItem value="Urina">Urina</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="metadata"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metadados do Exame</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais sobre o exame..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!editingExam && (
                <div>
                  <FormLabel>Arquivo do Exame (PDF)</FormLabel>
                  <FileUploader 
                    onFileDrop={handleFileUpload}
                    accept="application/pdf"
                    maxFiles={1}
                  />
                  {file && (
                    <p className="text-sm text-gray-500 mt-2">
                      Arquivo selecionado: {file.name}
                    </p>
                  )}
                </div>
              )}
              
              <FormField
                control={form.control}
                name="processing_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status de Processamento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="processing">Processando</SelectItem>
                        <SelectItem value="processed">Processado</SelectItem>
                        <SelectItem value="error">Erro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="processing_log"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Log de Processamento</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalhes sobre o processamento do exame..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingExam ? 'Atualizar' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}