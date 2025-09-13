'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { createPatientClient, getPatientsClient } from '@/services/patientService.client';
import { listGroups, assignPatientToGroup } from '@/services/groupService';
import { PatientCreate, EmergencyContact } from '@/types/patient';
import { Group, GroupListResponse } from '@/types/group';
import { toast } from 'sonner';

export const GroupPatientIntegration = () => {
  const { getToken } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [patientNumber, setPatientNumber] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response: GroupListResponse = await listGroups();
        setGroups(response.items);
      } catch (error) {
        console.error('Error fetching groups:', error);
        toast.error('Erro ao carregar grupos');
      }
    };

    fetchGroups();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available.');
      }

      // Create patient data
      const emergencyContact: EmergencyContact = {
        name: emergencyContactName,
        relationship: emergencyContactRelationship,
        phone: emergencyContactPhone,
      };

      const patientData: PatientCreate = {
        name,
        email,
        birthDate,
        gender,
        phone,
        address,
        city,
        state,
        zipCode,
        documentNumber,
        patientNumber,
        emergencyContact,
      };

      // Create the patient
      const createdPatient = await createPatientClient(patientData, token);

      // If a group was selected, assign the patient to that group
      if (selectedGroupId) {
        await assignPatientToGroup(selectedGroupId, { patient_id: createdPatient.patient_id }, token);
        toast.success(`Paciente criado e atribuído ao grupo com sucesso!`);
      } else {
        toast.success(`Paciente "${createdPatient.name}" criado com sucesso!`);
      }

      // Reset form
      setName('');
      setEmail('');
      setBirthDate('');
      setGender('male');
      setPhone('');
      setAddress('');
      setCity('');
      setState('');
      setZipCode('');
      setDocumentNumber('');
      setPatientNumber('');
      setEmergencyContactName('');
      setEmergencyContactRelationship('');
      setEmergencyContactPhone('');
      setSelectedGroupId(null);
    } catch (error: any) {
      console.error('Error creating patient:', error);
      toast.error('Erro ao criar paciente', {
        description: error.message || 'Erro desconhecido ao salvar paciente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integração de Paciente com Grupo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="gender">Gênero</Label>
              <Select value={gender} onValueChange={(value) => setGender(value as 'male' | 'female' | 'other')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="documentNumber">Documento (CPF/RG)</Label>
              <Input
                id="documentNumber"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="patientNumber">Número do Paciente</Label>
              <Input
                id="patientNumber"
                value={patientNumber}
                onChange={(e) => setPatientNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="group">Grupo (Opcional)</Label>
              <Select value={selectedGroupId?.toString() || ''} onValueChange={(value) => setSelectedGroupId(value ? parseInt(value) : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum grupo</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Contato de Emergência</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="emergencyContactName">Nome</Label>
                <Input
                  id="emergencyContactName"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="emergencyContactRelationship">Parentesco</Label>
                <Input
                  id="emergencyContactRelationship"
                  value={emergencyContactRelationship}
                  onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="emergencyContactPhone">Telefone</Label>
                <Input
                  id="emergencyContactPhone"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Paciente'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};