import { useState, useEffect, useRef } from 'react';
import PatientCard, { Patient } from './PatientCard';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Filter, Search, ArrowDownUp } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface PatientCatalogProps {
  patients: Patient[];
  onPatientClick: (id: string) => void;
}

export default function PatientCatalog({ patients, onPatientClick }: PatientCatalogProps) {
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>(patients);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOption, setSortOption] = useState('recent');
  
  const parentRef = useRef<HTMLDivElement>(null);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...patients];
    
    if (searchTerm) {
      result = result.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.diagnosis && patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(patient => patient.status === statusFilter);
    }
    
    if (sortOption === 'recent') {
      result.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    } else if (sortOption === 'risk') {
      result.sort((a, b) => b.riskScore - a.riskScore);
    } else if (sortOption === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    setFilteredPatients(result);
  }, [patients, searchTerm, statusFilter, sortOption]);

  const rowVirtualizer = useVirtualizer({
    count: filteredPatients.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 350, // Estimate height of a patient card
    overscan: 5,
  });

  return (
    <div className="mt-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar pacientes ou diagnósticos..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 text-white">
                  <Filter className="h-4 w-4" />
                  Filtrar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                  <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Internada">Internada</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Ambulatorial">Ambulatorial</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Alta">Alta</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 text-white">
                  <ArrowDownUp className="h-4 w-4" />
                  Ordenar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup value={sortOption} onValueChange={setSortOption}>
                  <DropdownMenuRadioItem value="recent">Mais recentes</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="risk">Maior risco</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name">A-Z</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div ref={parentRef} className="h-[600px] overflow-auto">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const patient = filteredPatients[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <PatientCard
                  patient={patient}
                  onClick={() => onPatientClick(patient.id)}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {filteredPatients.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhum paciente encontrado com os filtros atuais.
        </div>
      )}
    </div>
  );
}