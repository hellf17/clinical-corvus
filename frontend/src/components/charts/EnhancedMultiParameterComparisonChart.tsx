import React, { useMemo, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';
import { Exam } from '@/store/patientStore';
import { LabResult } from '@/types/lab_result';
import { Switch } from '@/components/ui/Switch';
import { Label as ShadcnLabel } from '@/components/ui/Label';
import {
  ChartContainer,
  ChartTooltip as ShadcnChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/Chart";
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

interface EnhancedMultiParameterComparisonChartProps {
  exams: Exam[];
  title?: string;
  onParameterClick?: (parameter: string, dataPoint: ChartDataPoint) => void;
}

interface ChartDataPoint {
  date: string;
  [key: string]: any;
}

interface ParameterConfig {
  name: string;
  color: string;
  normalizedMin?: number;
  normalizedMax?: number;
  referenceMin?: number;
  referenceMax?: number;
  originalValues: Record<string, number>;
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
  '#82CA9D', '#8DD1E1', '#A4DE6C', '#D0ED57', '#83A6ED'
];

export const EnhancedMultiParameterComparisonChart: React.FC<EnhancedMultiParameterComparisonChartProps> = ({ 
  exams, 
  title = 'Comparação de Múltiplos Parâmetros',
  onParameterClick
}) => {
  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
  const [normalizeValues, setNormalizeValues] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showReferenceLines, setShowReferenceLines] = useState<boolean>(true);
  const chartRef = useRef<HTMLDivElement>(null);
  
  const availableParameters = useMemo(() => {
    const paramNames = new Set<string>();
    
    exams.forEach(exam => {
      (exam.lab_results || []).forEach(result => {
        if (typeof result.test_name === "string" && result.test_name) {
          paramNames.add(result.test_name);
        }
      });
    });
    
    return Array.from(paramNames).sort();
  }, [exams]);
  
  // Filter exams by date range
  const filteredExams = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return exams;
    
    return exams.filter(exam => {
      if (!exam.exam_timestamp) return false;
      const examDate = new Date(exam.exam_timestamp);
      
      return (
        (!dateRange.from || examDate >= dateRange.from) &&
        (!dateRange.to || examDate <= dateRange.to)
      );
    });
  }, [exams, dateRange]);
  
  // Extract reference ranges and min/max values for each parameter
  const parameterConfigs = useMemo(() => {
    const configs: Record<string, ParameterConfig> = {};
    
    selectedParameters.forEach((param, index) => {
      let min = Infinity;
      let max = -Infinity;
      let refMin: number | undefined = undefined;
      let refMax: number | undefined = undefined;
      const originalValues: Record<string, number> = {};
      
      filteredExams.forEach(exam => {
        const result = (exam.lab_results || []).find(r => r.test_name === param);
        if (result) {
          const value = result.value_numeric;
          if (value !== null && value !== undefined) {
            min = Math.min(min, value);
            max = Math.max(max, value);
            if (exam.exam_timestamp) {
              originalValues[exam.exam_timestamp] = value;
            }
          }
          
          if (result.reference_range_low !== undefined && result.reference_range_low !== null && 
              result.reference_range_high !== undefined && result.reference_range_high !== null && !refMin && !refMax) {
            refMin = result.reference_range_low;
            refMax = result.reference_range_high;
          }
        }
      });
      
      configs[param] = {
        name: param,
        color: COLORS[index % COLORS.length],
        normalizedMin: 0,
        normalizedMax: 100,
        referenceMin: refMin,
        referenceMax: refMax,
        originalValues
      };
    });
    
    return configs;
  }, [filteredExams, selectedParameters]);
  
  // Generate ChartConfig based on selected parameters and colors
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    selectedParameters.forEach((param) => {
      const paramConfig = parameterConfigs[param];
      if (paramConfig) {
        config[param] = {
          label: param,
          color: paramConfig.color,
        };
        // Add config for reference lines if they exist and not normalized
        if (!normalizeValues && paramConfig.referenceMin !== undefined) {
          config[`${param}_refMin`] = { label: `Ref. Mín ${param}`, color: paramConfig.color };
        }
        if (!normalizeValues && paramConfig.referenceMax !== undefined) {
          config[`${param}_refMax`] = { label: `Ref. Máx ${param}`, color: paramConfig.color };
        }
      }
    });
    return config;
  }, [selectedParameters, parameterConfigs, normalizeValues]);
  
  // Prepare chart data
  const chartData = useMemo(() => {
    if (selectedParameters.length === 0) return [];
    
    const dataPoints: ChartDataPoint[] = [];
    const dateSet = new Set<string>();
    
    // Collect all dates
    filteredExams.forEach(exam => {
      const dateVal = exam.exam_timestamp;
      if (typeof dateVal === "string" && dateVal) {
        dateSet.add(dateVal);
      }
    });
    
    // Sort dates chronologically
    const sortedDates = Array.from(dateSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    
    // Create data points for each date
    sortedDates.forEach(date => {
      const dataPoint: ChartDataPoint = { date };
      
      selectedParameters.forEach(param => {
        const exam = filteredExams.find(e => {
          const dateVal = e.exam_timestamp;
          return dateVal === date && (e.lab_results || []).some(r => r.test_name === param);
        });
        
        if (exam) {
          const result = (exam.lab_results || []).find(r => r.test_name === param);
          if (result) {
            const value = result.value_numeric;
            if (value !== null && value !== undefined) {
              if (normalizeValues) {
                // Normalize value between 0 and 100
                const config = parameterConfigs[param];
                const allValues = Object.values(config.originalValues);
                const min = Math.min(...allValues);
                const max = Math.max(...allValues);
                
                if (min !== max) {
                  const normalizedValue = ((value - min) / (max - min)) * 100;
                  dataPoint[param] = normalizedValue;
                } else {
                  dataPoint[param] = 50; // Default to middle if all values are the same
                }
              } else {
                dataPoint[param] = value;
              }
              // Add reference information
              if (parameterConfigs[param].referenceMin !== undefined) {
                dataPoint[`${param}_refMin`] = normalizeValues 
                  ? 0 
                  : parameterConfigs[param].referenceMin;
              }
              if (parameterConfigs[param].referenceMax !== undefined) {
                dataPoint[`${param}_refMax`] = normalizeValues 
                  ? 100 
                  : parameterConfigs[param].referenceMax;
              }
              // Add unit and reference range for tooltip
              dataPoint[`${param}_unit`] = result.unit || '';
              dataPoint[`${param}_refRange`] = (result.reference_range_low !== null && result.reference_range_high !== null)
                ? `${result.reference_range_low} - ${result.reference_range_high}`
                : '';
              dataPoint[`${param}_isAbnormal`] = result.is_abnormal || false;
            } else {
              dataPoint[param] = null;
            }
          }
        }
      });
      
      dataPoints.push(dataPoint);
    });
    
    return dataPoints;
  }, [filteredExams, selectedParameters, parameterConfigs, normalizeValues]);
  
  const handleParameterToggle = (parameter: string) => {
    setSelectedParameters(prev => 
      prev.includes(parameter)
        ? prev.filter(p => p !== parameter)
        : [...prev, parameter]
    );
  };
  
  // Set default date range to last 30 days if not set
  React.useEffect(() => {
    if (!dateRange.from && !dateRange.to && exams.length > 0) {
      const dates = exams
        .filter(e => e.exam_timestamp)
        .map(e => new Date(e.exam_timestamp!).getTime());
      
      if (dates.length > 0) {
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
    }
  }, [exams, dateRange]);
  
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
        pdf.save(`multi-parameter-comparison-${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `multi-parameter-comparison-${new Date().toISOString().split('T')[0]}.png`;
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
  
  // Custom Tooltip Content for Multi-Parameter Chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <ChartTooltipContent className="w-[250px]">
          <div className="flex flex-col gap-1 p-1">
            <span className="font-semibold text-foreground">
              {new Date(label).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </span>
            {payload.map((item: any, idx: number) => {
              const param = item.dataKey;
              const value = item.value;
              const unit = item.payload[`${param}_unit`] || '';
              const refRange = item.payload[`${param}_refRange`] || '';
              const isAbnormal = item.payload[`${param}_isAbnormal`] || false;
              
              // Skip reference lines in tooltip
              if (param.endsWith('_refMin') || param.endsWith('_refMax')) {
                return null;
              }
              
              return (
                <div key={idx} className="text-xs">
                  <span 
                    className={`font-medium ${isAbnormal ? 'text-destructive' : ''}`} 
                    style={{ color: item.color }}
                  >
                    {param}:
                  </span> {value} {unit} {refRange && (<span className="text-muted-foreground">(Ref: {refRange})</span>)}
                  {isAbnormal && (
                    <span className="ml-1 text-destructive font-semibold">[ANORMAL]</span>
                  )}
                </div>
              );
            })}
          </div>
        </ChartTooltipContent>
      );
    }
    return null;
  };
  
  if (exams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Nenhum exame disponível para visualização
          </div>
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
                      <ShadcnLabel htmlFor="reference-lines">Linhas de Referência</ShadcnLabel>
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
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center space-x-2">
          <Switch
            checked={normalizeValues}
            onCheckedChange={setNormalizeValues}
            id="normalize-switch"
          />
          <ShadcnLabel htmlFor="normalize-switch" className="text-sm font-normal text-muted-foreground">
            Normalizar valores (0-100%) para comparação de tendências
          </ShadcnLabel>
        </div>
        
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium mr-2 text-muted-foreground">Parâmetros:</span>
          {availableParameters.map(param => {
            const isSelected = selectedParameters.includes(param);
            const colorIndex = selectedParameters.findIndex(p => p === param);
            const color = isSelected ? COLORS[colorIndex % COLORS.length] : '#ccc';
            return (
              <div key={param} className="flex items-center space-x-1.5">
                <Checkbox
                  id={`param-check-${param}`}
                  checked={isSelected}
                  onCheckedChange={() => handleParameterToggle(param)}
                  style={{ color: color }}
                  className="border-muted-foreground data-[state=checked]:border-current"
                />
                <ShadcnLabel
                  htmlFor={`param-check-${param}`}
                  className="text-xs font-normal"
                  style={{ color: isSelected ? color : "hsl(var(--muted-foreground))" }}
            >
              {param}
                </ShadcnLabel>
              </div>
            );
          })}
        </div>
        
        {selectedParameters.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Selecione parâmetros acima para visualizar
          </div>
        ) : (
          <>
            <div 
              ref={chartRef} 
              className="aspect-video h-[400px] w-full"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
            >
              <ChartContainer config={chartConfig} className="h-full w-full">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit'
                    })}
                  />
                  <YAxis domain={normalizeValues ? [0, 100] : undefined} />
                  <ShadcnChartTooltip cursor={false} content={<CustomTooltip />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  
                  {selectedParameters.map(param => (
                    <Line
                      key={param}
                      type="monotone"
                      dataKey={param}
                      stroke={parameterConfigs[param] ? parameterConfigs[param].color : '#8884d8'}
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        const isAbnormal = payload[`${param}_isAbnormal`] || false;
                        const color = parameterConfigs[param]?.color || '#8884d8';
                        
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isAbnormal ? 6 : 4}
                            fill={isAbnormal ? "hsl(var(--destructive))" : color}
                            stroke="white"
                            strokeWidth={1}
                            onClick={() => onParameterClick && onParameterClick(param, payload)}
                            style={{ cursor: onParameterClick ? 'pointer' : 'default' }}
                          />
                        );
                      }}
                      activeDot={{ r: 8, stroke: "white", strokeWidth: 2 }}
                      connectNulls
                    />
                  ))}
                  
                  {showReferenceLines && !normalizeValues && selectedParameters.flatMap(param => {
                    const config = parameterConfigs[param];
                    const lines = [];
                    if (config?.referenceMin !== undefined) {
                      lines.push(
                        <ReferenceLine
                          key={`${param}-min`}
                          y={config.referenceMin}
                          stroke={config.color}
                          strokeDasharray="3 3"
                          opacity={0.6}
                        />
                      );
                    }
                    if (config?.referenceMax !== undefined) {
                      lines.push(
                        <ReferenceLine
                          key={`${param}-max`}
                          y={config.referenceMax}
                          stroke={config.color}
                          strokeDasharray="3 3"
                          opacity={0.6}
                        />
                      );
                    }
                    return lines;
                  })}
                </LineChart>
              </ChartContainer>
            </div>
            
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>Linhas pontilhadas indicam valores de referência</p>
              {normalizeValues && (
                <p className="mt-1">Valores estão normalizados para facilitar comparação visual entre parâmetros com escalas diferentes</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-destructive"></div>
                  <span>Valor anormal</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedMultiParameterComparisonChart;