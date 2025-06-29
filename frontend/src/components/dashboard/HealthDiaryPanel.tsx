'use client'; // Mark as client component

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { NotebookPen, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
    getDiaryEntries,
    addDiaryEntry,
    DiaryEntry,
    HealthDiaryEntryCreate,
    PaginatedDiaryEntries
} from '@/services/healthDiaryService';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useAuth } from "@clerk/nextjs"; // Import client-side auth hook
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ENTRIES_PER_PAGE = 5; // Reduced for potentially smaller panel view

interface HealthDiaryPanelProps {
  patientId: number;
}

export default function HealthDiaryPanel({ patientId }: HealthDiaryPanelProps) {
  const { getToken } = useAuth(); // Get client-side token function
  const [entryContent, setEntryContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [entries, setEntries] = useState<DiaryEntry[]>([]); // Renamed from recentEntries
  const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [canLoadMore, setCanLoadMore] = useState(false);
  
  // Ref for scroll area viewport to attach listener
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // Fetch entries function with pagination logic
  const fetchEntries = useCallback(async (pageToFetch: number, loadMore = false) => {
      setIsLoading(true);
      if (!loadMore) {
          // Reset error only when fetching the first page
          setErrorLoading(null); 
      }
      try {
          const token = await getToken(); // Get token
          if (!token) throw new Error("Authentication token not available.");
          
          const result: PaginatedDiaryEntries = await getDiaryEntries(token, { // Pass token
              page: pageToFetch, 
              limit: ENTRIES_PER_PAGE 
          }, patientId); // Pass patientId
          setEntries(prev => loadMore ? [...prev, ...result.items] : result.items);
          setTotalEntries(result.total);
          setCurrentPage(pageToFetch);
          // Check if more entries can be loaded
          setCanLoadMore((pageToFetch * ENTRIES_PER_PAGE) < result.total);
      } catch (error: any) {
          console.error(`Failed to fetch diary entries for patient ${patientId}:`, error);
          setErrorLoading(error.message || "Erro ao buscar entradas do diário.");
          setCanLoadMore(false); // Stop loading more on error
      } finally {
          setIsLoading(false);
      }
  }, [getToken, patientId]);

  // Initial fetch
  useEffect(() => {
    if (patientId) {
        fetchEntries(1); // Fetch first page on mount
    } else {
        setIsLoading(false);
        setEntries([]);
        setTotalEntries(0);
        setErrorLoading("ID do paciente não fornecido.");
        setCanLoadMore(false);
    }
  }, [fetchEntries, patientId]);
  
  // Load more handler
  const handleLoadMore = () => {
      if (canLoadMore && !isLoading) {
          fetchEntries(currentPage + 1, true);
      }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    if (!entryContent.trim()) {
        toast.warning("Por favor, escreva algo no diário antes de salvar.");
        return;
    }
    const newEntryData: HealthDiaryEntryCreate = { content: entryContent };
    setIsSaving(true);
    try {
        const token = await getToken(); // Get token
        if (!token) throw new Error("Authentication token not available.");

        const newEntry = await addDiaryEntry(token, newEntryData, patientId); // Pass patientId
        toast.success("Entrada do diário registrada!");
        setEntryContent('');
        if (newEntry) {
            // Prepend the new entry - doesn't affect pagination logic directly
            setEntries(prev => [newEntry, ...prev]);
            setTotalEntries(prev => prev + 1); // Increment total count
            // Optional: scroll to top after adding?
            // scrollViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error: any) {
        console.error(`Failed to save diary entry for patient ${patientId}:`, error);
        toast.error("Erro ao salvar entrada", { description: error.message });
    } finally {
        setIsSaving(false);
    }
  };
  
  // Helper to format timestamp
  const formatDiaryTimestamp = (timestamp: string): string => {
      const date = new Date(timestamp);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Define handleDeleteEntry (even if empty for now to resolve reference error)
  const handleDeleteEntry = useCallback(async (entryId: number) => {
    console.warn("Delete functionality not fully implemented yet for patient specific diary.", entryId, patientId);
    // TODO: Implement actual delete logic with API call and token
  }, [patientId]);

  const renderContent = () => {
    if (isLoading && entries.length === 0) { // Show skeleton only on initial load
      return (
        <div className="space-y-3 py-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      );
    }

    if (errorLoading) {
      return (
        <Alert className="text-destructive border-destructive dark:border-destructive [&>svg]:text-destructive"> {/* Ensure no variant */}
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao Carregar Diário</AlertTitle>
          <AlertDescription>{errorLoading}</AlertDescription>
        </Alert>
      );
    }

    if (entries.length === 0) {
      return (
        <Alert className="border-yellow-500 text-yellow-700 dark:border-yellow-600 dark:text-yellow-400 [&>svg]:text-yellow-500"> {/* Ensure no variant */}
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Diário Vazio</AlertTitle>
          <AlertDescription>Nenhuma entrada encontrada para o paciente ID {patientId}. Adicione uma nota abaixo.</AlertDescription>
        </Alert>
      );
    }

    return (
      <ScrollArea className="h-[250px] pr-3" viewportRef={scrollViewportRef}>
        <div className="space-y-4">
          {entries.map((entry) => (
             // <DiaryEntryCard key={entry.entry_id} entry={entry} onDelete={handleDeleteEntry} /> // Commented out
             <div key={entry.entry_id} className="text-sm border-b pb-2 last:border-b-0">
                <p className="whitespace-pre-wrap break-words">{entry.content}</p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
                </p>
             </div> // Placeholder rendering
          ))}
          {canLoadMore && (
            <div className="pt-4 text-center">
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleLoadMore} 
                    disabled={isLoading}
                >
                    {isLoading && entries.length > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {/* Show spinner only when loading more */}
                    Carregar Mais Antigas
                </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center">
          <NotebookPen className="mr-2 h-5 w-5 text-blue-500" />
          Diário de Saúde (Paciente ID: {patientId})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 mb-4">
          {renderContent()}
        </div>
        <form onSubmit={handleSave} className="space-y-2 border-t pt-4">
          <div>
            <Label htmlFor={`diary-entry-${patientId}`} className="text-sm text-muted-foreground mb-2 block">
                Registre sintomas, humor ou outras observações importantes.
            </Label>
            <Textarea 
                id={`diary-entry-${patientId}`}
                placeholder="Como o paciente está se sentindo hoje?"
                value={entryContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEntryContent(e.target.value)}
                disabled={isSaving}
                rows={3} // Reduced rows for a more compact panel
            />
            <Button type="submit" size="sm" disabled={isSaving || !entryContent.trim()} className="mt-2">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Registrar Entrada
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 