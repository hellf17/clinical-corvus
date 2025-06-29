import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

const RecentActivityPanel = ({ patientId }: { patientId?: number }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          {patientId ? `Atividades recentes para o paciente ID ${patientId} aparecerão aqui.` : 'Nenhuma atividade recente para exibir.'}
        </p>
        {/* Placeholder content */}
      </CardContent>
    </Card>
  );
};

export default RecentActivityPanel; 