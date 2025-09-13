'use client';

import React, { useState } from 'react';
import { Patient } from '@/types/patient';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Search, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

interface PatientSearchProps {
  onPatientSelect: (patient: Patient) => void;
}

export const PatientSearch: React.FC<PatientSearchProps> = ({ onPatientSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock search function - in a real app, this would call an API
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      // This is a mock implementation - in a real app, you would call an API
      // For example: const results = await searchPatients(searchTerm);
      const mockResults: Patient[] = [
        {
          patient_id: 1,
          name: 'João Silva',
          email: 'joao@example.com',
          birthDate: '1980-01-15',
          gender: 'male',
          phone: '(11) 9999-9999'
        },
        {
          patient_id: 2,
          name: 'Maria Santos',
          email: 'maria@example.com',
          birthDate: '1975-05-22',
          gender: 'female',
          phone: '(11) 8888-8888'
        }
      ];
      
      // Filter mock results based on search term
      const filteredResults = mockResults.filter(patient => 
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.patient_id.toString().includes(searchTerm)
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Label htmlFor="patient-search">Buscar Pacientes</Label>
        <div className="flex gap-2 mt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="patient-search"
              type="text"
              placeholder="Nome ou ID do paciente"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>
      </div>
      
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Resultados da Busca</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {searchResults.map((patient) => (
              <Card 
                key={patient.patient_id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onPatientSelect(patient)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full p-2">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{patient.name}</div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {patient.patient_id}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {searchTerm && searchResults.length === 0 && !loading && (
        <p className="text-gray-500 dark:text-gray-400">
          Nenhum paciente encontrado.
        </p>
      )}
    </div>
  );
};