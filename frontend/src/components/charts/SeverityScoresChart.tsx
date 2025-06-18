import React, { useMemo, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip as ShadcnChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from '@/components/ui/Chart';

const scoreColors: Record<string, string> = {
  'SOFA': 'var(--danger)',
  'qSOFA': 'var(--secondary)',
  'APACHE II': 'var(--primary)',
  'SAPS3': 'var(--success)',
  'NEWS': 'var(--success)',
  'MEWS': 'var(--secondary)'
};

interface ClinicalScore {
  score_type: string;
  value: number;
  timestamp: string;
}

interface SeverityScoresChartProps {
  clinicalScores: ClinicalScore[];
  title?: string;
  loading: boolean;
}

interface ChartDataPoint {
  date: string;
  timestamp: number;
  [key: string]: number | string;
}

export const SeverityScoresChart: React.FC<SeverityScoresChartProps> = ({
  clinicalScores,
  title = 'Evolução de Escores de Gravidade',
  loading = false
}) => {
  const [selectedScores, setSelectedScores] = useState<Record<string, boolean>>({
    'SOFA': true,
    'qSOFA': true,
    'APACHE II': true
  });
  
  // Combine all scores into a single dataset for the chart
  const chartData = useMemo(() => {
    // If there's no data, return empty array
    if (!clinicalScores || clinicalScores.length === 0) return [];
    
    // Group scores by timestamp
    const scoresByDate: Record<string, ChartDataPoint> = {};
    
    clinicalScores.forEach(score => {
      const date = new Date(score.timestamp);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!scoresByDate[dateStr]) {
        scoresByDate[dateStr] = {
          date: dateStr,
          timestamp: date.getTime(),
          formattedDate: new Date(dateStr).toLocaleDateString()
        };
      }
      
      scoresByDate[dateStr][score.score_type] = score.value;
    });
    
    // Convert to array and sort by date
    return Object.values(scoresByDate).sort((a, b) => a.timestamp - b.timestamp);
  }, [clinicalScores]);
  
  // Get available score types
  const availableScoreTypes = useMemo(() => {
    const types = new Set<string>();
    
    clinicalScores.forEach(score => {
      if (typeof score.score_type === "string" && score.score_type) {
        types.add(score.score_type);
      }
    });
    
    return Array.from(types);
  }, [clinicalScores]);
  
  // Toggle score visibility
  const toggleScoreVisibility = (scoreType: string) => {
    setSelectedScores(prev => ({
      ...prev,
      [scoreType]: !prev[scoreType]
    }));
  };
  
  // Generate ChartConfig based on available scores and colors
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    availableScoreTypes.forEach(type => {
      config[type] = {
        label: type,
        color: scoreColors[type] || "hsl(var(--primary))",
      };
    });
    return config;
  }, [availableScoreTypes]);
  
  // Get reference lines based on score type
  const getReferenceLines = (scoreType: string) => {
    switch (scoreType) {
      case 'SOFA':
        return [
          { y: 2, label: 'Leve', stroke: 'var(--success)' },
          { y: 8, label: 'Moderado', stroke: 'var(--secondary)' },
          { y: 11, label: 'Grave', stroke: 'var(--danger)' }
        ];
      case 'qSOFA':
        return [
          { y: 2, label: 'Alto risco', stroke: 'var(--danger)' }
        ];
      case 'APACHE II':
        return [
          { y: 8, label: 'Leve', stroke: 'var(--success)' },
          { y: 15, label: 'Moderado', stroke: 'var(--secondary)' },
          { y: 25, label: 'Grave', stroke: 'var(--danger)' }
        ];
      default:
        return [];
    }
  };
  
  if (clinicalScores.length === 0 || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 md:h-80 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nenhum escore de gravidade disponível para visualização
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center flex-wrap gap-2">
          <span>{title}</span>
          <div className="flex flex-wrap gap-1.5">
            {availableScoreTypes.map(scoreType => (
              <Button
                key={scoreType}
                onClick={() => toggleScoreVisibility(scoreType)}
                variant={selectedScores[scoreType] ? "default" : "outline"}
                size="sm"
                className="h-6 px-2"
                style={{ 
                  backgroundColor: selectedScores[scoreType] ? `hsl(${scoreColors[scoreType]})` : undefined,
                  borderColor: selectedScores[scoreType] ? `hsl(${scoreColors[scoreType]})` : undefined,
                  color: selectedScores[scoreType] ? "hsl(var(--primary-foreground))" : undefined,
                }}
              >
                {scoreType}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 md:h-80 w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis 
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ShadcnChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel hideIndicator />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              
              {/* Render lines for selected scores */}
              {availableScoreTypes.map(scoreType => {
                if (selectedScores[scoreType]) {
                  // Get reference lines for this score
                  const refLines = getReferenceLines(scoreType);
                  
                  return (
                    <React.Fragment key={scoreType}>
                      <Line
                        type="monotone"
                        dataKey={scoreType}
                        name={scoreType}
                        stroke={scoreColors[scoreType] || 'var(--primary)'}
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                        connectNulls
                      />
                      
                      {/* Add reference lines if needed */}
                      {refLines.map((line, index) => (
                        <ReferenceLine
                          key={`${scoreType}-ref-${index}`}
                          y={line.y}
                          stroke={line.stroke}
                          strokeDasharray="3 3"
                          isFront={false}
                          label={{ value: line.label, position: 'right' }}
                        />
                      ))}
                    </React.Fragment>
                  );
                }
                return null;
              })}
            </LineChart>
          </ChartContainer>
        </div>
        
        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p className="font-semibold">Interpretação:</p>
          
          {selectedScores['SOFA'] && (
            <div className="ml-2">
              <p className="font-medium">SOFA (Sequential Organ Failure Assessment):</p>
              <ul className="list-disc ml-5">
                <li>0-2: Disfunção orgânica mínima ou ausente</li>
                <li>3-5: Disfunção orgânica leve</li>
                <li>6-8: Disfunção orgânica moderada</li>
                <li>9-11: Disfunção orgânica importante (mortalidade ~20-50%)</li>
                <li>&gt;11: Disfunção orgânica grave (mortalidade &gt;50%)</li>
              </ul>
            </div>
          )}
          
          {selectedScores['qSOFA'] && (
            <div className="ml-2">
              <p className="font-medium">qSOFA (Quick SOFA):</p>
              <ul className="list-disc ml-5">
                <li>0-1: Baixo risco de desfecho desfavorável</li>
                <li>2-3: Risco aumentado de desfecho desfavorável em paciente com suspeita de infecção</li>
              </ul>
            </div>
          )}
          
          {selectedScores['APACHE II'] && (
            <div className="ml-2">
              <p className="font-medium">APACHE II (Acute Physiology and Chronic Health Evaluation II):</p>
              <ul className="list-disc ml-5">
                <li>0-8: Bom prognóstico (mortalidade ~4%)</li>
                <li>9-15: Prognóstico leve a moderado (mortalidade ~8-15%)</li>
                <li>16-25: Prognóstico moderado a grave (mortalidade ~20-40%)</li>
                <li>26-35: Prognóstico grave (mortalidade ~40-75%)</li>
                <li>&gt;35: Prognóstico muito grave (mortalidade &gt;75%)</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SeverityScoresChart; 