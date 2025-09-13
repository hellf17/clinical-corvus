import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { PatientForm } from '@/components/patients/PatientForm';
import { PatientCard } from '@/components/dashboard-doctor/PatientCard';
import { PatientOverview } from '@/components/dashboard-doctor/PatientOverview';
import { Patient } from '@/types/patient';
import { getPatientsClient, getPatientByIdClient } from '@/services/patientService.client';
import { useAuth } from '@clerk/nextjs';

interface PatientManagementFlowProps {
  initialPatientId?: string;
}

export const PatientManagementFlow: React.FC<PatientManagementFlowProps> = ({ 
  initialPatientId 
}) => {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  React.useEffect(() => {
    if (initialPatientId) {
      loadPatientById(initialPatientId);
      setCurrentView('detail');
    } else {
      loadPatients();
    }
  }, [initialPatientId, loadPatients, loadPatientById]);

  const loadPatients = useCallback(async (filters?: { search?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      const response = await getPatientsClient(filters || {}, token);
      setPatients(response.items);
    } catch (err) {
      setError('Failed to load patients');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const loadPatientById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const patient = await getPatientByIdClient(id);
      setSelectedPatient(patient);
    } catch (err) {
      setError('Failed to load patient');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePatientCreated = (patient: Patient) => {
    setPatients(prev => [...prev, patient]);
    setCurrentView('list');
  };

  const handlePatientSelected = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentView('detail');
  };

  const handlePatientUpdated = (updatedPatient: Patient) => {
    setPatients(prev => 
      prev.map(p => p.patient_id === updatedPatient.patient_id ? updatedPatient : p)
    );
    setSelectedPatient(updatedPatient);
    setCurrentView('detail');
  };

  const handlePatientDeleted = (patientId: number) => {
    setPatients(prev => prev.filter(p => p.patient_id !== patientId));
    setSelectedPatient(null);
    setCurrentView('list');
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return (
      <div className="text-red-600">
        <p>Erro ao carregar paciente: {error}</p>
        <Button onClick={() => loadPatients()}>Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 mb-4">
        <Button
          variant={currentView === 'list' ? 'default' : 'outline'}
          onClick={() => {
            setCurrentView('list');
            loadPatients();
          }}
        >
          Lista de Pacientes
        </Button>
        <Button
          variant={currentView === 'create' ? 'default' : 'outline'}
          onClick={() => setCurrentView('create')}
        >
          Novo Paciente
        </Button>
        {selectedPatient && (
          <>
            <Button
              variant={currentView === 'detail' ? 'default' : 'outline'}
              onClick={() => setCurrentView('detail')}
            >
              Detalhes
            </Button>
            <Button
              variant={currentView === 'edit' ? 'default' : 'outline'}
              onClick={() => setCurrentView('edit')}
            >
              Editar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) {
                  handlePatientDeleted(selectedPatient.patient_id);
                }
              }}
            >
              Excluir
            </Button>
          </>
        )}
      </div>

      {currentView === 'list' && (
        <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar pacientes..."
              className="px-3 py-2 border rounded-md"
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  loadPatients({ search: value });
                } else {
                  loadPatients();
                }
              }}
            />
          </div>
          
          <div className="grid gap-4">
            {patients.length === 0 ? (
              <p>Nenhum paciente encontrado.</p>
            ) : (
              patients.map(patient => (
                <div key={patient.patient_id} role="button" onClick={() => handlePatientSelected(patient)}>
                  <PatientCard patient={patient} onClick={handlePatientSelected} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {currentView === 'create' && (
        <div>
          <h2 className="text-xl font-bold mb-4">Criar Novo Paciente</h2>
          <PatientForm
            onSuccess={handlePatientCreated}
            onCancel={() => setCurrentView('list')}
          />
        </div>
      )}

      {currentView === 'edit' && selectedPatient && (
        <div>
          <h2 className="text-xl font-bold mb-4">Editar Paciente</h2>
          <PatientForm
            initialData={selectedPatient}
            onSuccess={handlePatientUpdated}
            onCancel={() => setCurrentView('detail')}
            isEditing
          />
        </div>
      )}

      {currentView === 'detail' && selectedPatient && (
        <div>
          <PatientOverview patient={selectedPatient} />
        </div>
      )}

      {currentView === 'detail' && !selectedPatient && (
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhum paciente selecionado.</p>
          <Button onClick={() => setCurrentView('list')}>
            Voltar à Lista
          </Button>
        </div>
      )}
    </div>
  );
};