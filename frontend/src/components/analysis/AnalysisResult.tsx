import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalysisResultProps {
  title: string;
  interpretation: string;
  abnormalities?: string[];
  recommendations?: string[];
  isCritical?: boolean;
  details?: Record<string, any>;
}

/**
 * Componente para exibir resultados de análises clínicas
 */
const AnalysisResult: React.FC<AnalysisResultProps> = ({
  title,
  interpretation,
  abnormalities = [],
  recommendations = [],
  isCritical = false,
  details = {}
}) => {

  const getStatus = () => {
    if (isCritical) return { label: "Crítico", variant: "destructive", Icon: AlertCircle };
    if (abnormalities.length > 0) return { label: "Alterado", variant: "secondary", Icon: AlertTriangle };
    return { label: "Normal", variant: "default", Icon: CheckCircle };
  };

  const status = getStatus();

  return (
    <Card className={cn("mb-2", isCritical && "border-destructive")}>
      {isCritical && (
        <div className="flex items-center gap-2 border-b border-destructive bg-destructive/10 p-3 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">
            Atenção: Resultado crítico que requer intervenção imediata
          </span>
        </div>
      )}
      
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant={status.variant as any} className="capitalize">
            <status.Icon className="mr-1.5 h-4 w-4" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-line mb-4">
            {interpretation}
        </p>
        
        {abnormalities.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
                <h4 className="mb-2 text-sm font-medium">Alterações Identificadas:</h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                {abnormalities.map((abnormality, index) => (
                    <li key={index}>{abnormality}</li>
                ))}
                </ul>
            </div>
          </>
        )}
        
        {recommendations.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
                <h4 className="mb-2 text-sm font-medium">Recomendações:</h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-primary"> 
                {recommendations.map((recommendation, index) => (
                    <li key={index}>{recommendation}</li>
                ))}
                </ul>
            </div>
          </>
        )}
        
        {Object.keys(details).length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
                <h4 className="mb-2 text-sm font-medium">Detalhes dos Parâmetros:</h4>
                <div className="flex flex-wrap gap-1">
                {Object.entries(details).map(([key, value]) => (
                    value !== null && value !== undefined && (
                    <Badge 
                        key={key} 
                        variant="outline"
                        className="font-normal"
                    >
                        <Info className="mr-1 h-3 w-3" />
                        {`${key}: ${value}`}
                    </Badge>
                    )
                ))}
                </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalysisResult; 