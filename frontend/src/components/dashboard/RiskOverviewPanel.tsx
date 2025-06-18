import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

interface RiskOverviewPanelProps {
  role: 'doctor' | undefined; // Future patient support (commented out for now)
  patientId?: number; // patientId is optional, but required if role is 'patient' for meaningful data
}

const RiskOverviewPanel: React.FC<RiskOverviewPanelProps> = ({ role, patientId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão Geral de Riscos</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          {role === 'doctor' && 'Visão geral de riscos agregados ou alertas de alta prioridade para médicos aparecerão aqui.'}
          {/* Future patient support (commented out for now) */}
          {/* {role === 'patient' && patientId && `Visão geral de riscos para o paciente ID ${patientId} aparecerão aqui.`} */}
          {/* {role === 'patient' && !patientId && 'Perfil do paciente não especificado para visão geral de riscos.'} */}
        </p>
        {/* Placeholder content - In a real scenario, this would fetch and display risk data */}
      </CardContent>
    </Card>
  );
};

export default RiskOverviewPanel; 