import React, { useMemo, useState, useRef } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
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
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/Popover";
import { 
  Calendar 
} from "@/components/ui/Calendar";
import { 
  format, 
  subDays, 
  addDays 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CalendarIcon, 
  Download, 
  ZoomIn, 
  ZoomOut,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

interface EnhancedSeverityScoresChartProps {
  clinicalScores: ClinicalScore[];
  title?: string;
  loading: boolean;
 onScoreClick?: (scoreType: string, dataPoint: ChartDataPoint) => void;
}

interface ChartDataPoint {
  date: string;
  timestamp: number;
 [key: string]: number | string;
}

export const EnhancedSeverityScoresChart: React.FC<EnhancedSeverityScoresChartProps> = ({
  clinicalScores,
  title = 'Evolução de Escores de Gravidade',
  loading = false,
  onScoreClick
}) => {
  const [selectedScores, setSelectedScores] = useState<Record<string, boolean>>({
    'SOFA': true,
    'qSOFA': true,
    'APACHE II': true
  });
  
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showReferenceLines, setShowReferenceLines] = useState<boolean>(true);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Combine all scores into a single dataset for the chart
  const chartData = useMemo(() => {
    // If there's no data, return empty array
    if (!clinicalScores || clinicalScores.length === 0) return [];
    
    // Group scores by timestamp
    const scoresByDate: Record<string, ChartDataPoint> = {};
    
    clinicalScores.forEach(score => {
      const date = new Date(score.timestamp);
      
      // Apply date range filter
      if (dateRange.from || dateRange.to) {
        if ((dateRange.from && date < dateRange.from) || (dateRange.to && date > dateRange.to)) {
          return; // Skip this data point
        }
      }
      
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
  }, [clinicalScores, dateRange]);
  
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
  
  // Set default date range to last 30 days if not set
  React.useEffect(() => {
    if (!dateRange.from && !dateRange.to && clinicalScores.length > 0) {
      const dates = clinicalScores.map(s => new Date(s.timestamp).getTime());
      const latestDate = new Date(Math.max(...dates));
      const earliestDate = new Date(Math.min(...dates));
      const defaultFrom = subDays(latestDate, 30);
      const defaultTo = latestDate;
      
      // Only set if the default range covers some data
      if (defaultFrom < latestDate) {
        setDateRange({ from: defaultFrom, to: defaultTo });
      } else {
        setDateRange({ from: earliestDate, to: latestDate });
      }
    }
  }, [clinicalScores, dateRange]);
  
  // Export chart as PDF
  const exportChart = async (format: 'png' | 'pdf') => {
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current);
      const imgData = canvas.toDataURL('image/png');
      
      if (format === 'pdf') {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`severity-scores-${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `severity-scores-${new Date().toISOString().split('T')[0]}.png`;
        link.click();
      }
    } catch (error) {
      console.error('Error exporting chart:', error);
    }
  };
  
  // Reset zoom
  const resetZoom = () => {
    setZoomLevel(1);
  };
  
  // Zoom in
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };
  
  // Zoom out
  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle>{title}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "LLL dd, y", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecione o período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-4">
                  <h4 className="font-medium leading-none">Configurações do Gráfico</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reference-lines">Linhas de Referência</Label>
                      <Checkbox 
                        id="reference-lines" 
                        checked={showReferenceLines}
                        onCheckedChange={(checked) => setShowReferenceLines(Boolean(checked))}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={zoomIn} title="Aumentar zoom">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={zoomOut} title="Diminuir zoom">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={resetZoom} title="Redefinir zoom">
                {zoomLevel.toFixed(1)}x
              </Button>
            </div>
            
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => exportChart('png')} title="Exportar como PNG">
                <Download className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportChart('pdf')} title="Exportar como PDF">
                PDF
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
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
      </CardHeader>
      <CardContent>
        <div 
          ref={chartRef} 
          className="h-64 md:h-80 w-full"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
        >
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
                content={({ payload, label }) => {
                  if (!payload || payload.length === 0) return null;
                  const date = label;
                  const formattedDate = new Date(date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                  
                  return (
                    <ChartTooltipContent className="min-w-[180px]">
                      <div className="p-1 space-y-1">
                        <div className="text-center font-medium text-foreground mb-1.5">
                          {formattedDate}
                        </div>
                        {payload.map((item: any, index: number) => {
                          const scoreType = item.dataKey as string;
                          const value = item.value as number;
                          
                          const config = chartConfig[scoreType];
                          const color = config?.color || '#888888';
                          const labelText = config?.label || scoreType;
                          
                          return (
                            <div key={index} className="flex items-center gap-1.5 text-xs">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                              <span className="font-medium text-muted-foreground">{labelText}:</span>
                              <span className="font-semibold text-foreground">{value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </ChartTooltipContent>
                  );
                }}
              />
              <ChartLegend content={<ChartLegendContent />} />
              
              {/* Render lines for selected scores */}
              {availableScoreTypes.map(scoreType => {
                if (selectedScores[scoreType]) {
                  // Get reference lines for this score
                  const refLines = showReferenceLines ? getReferenceLines(scoreType) : [];
                  
                  return (
                    <React.Fragment key={scoreType}>
                      <Line
                        type="monotone"
                        dataKey={scoreType}
                        name={scoreType}
                        stroke={scoreColors[scoreType] || 'var(--primary)'}
                        activeDot={{ 
                          r: 8,
                          onClick: (props: any) => {
                            if (onScoreClick) {
                              const { payload } = props;
                              onScoreClick(scoreType, payload);
                            }
                          }
                        }}
                        strokeWidth={2}
                        connectNulls
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          const scoreValue = payload[scoreType];
                          const color = scoreColors[scoreType] || 'var(--primary)';
                          
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={4}
                              fill={color}
                              stroke="white"
                              strokeWidth={1}
                              onClick={() => onScoreClick && onScoreClick(scoreType, payload)}
                              style={{ cursor: onScoreClick ? 'pointer' : 'default' }}
                            />
                          );
                        }}
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

export default EnhancedSeverityScoresChart;