import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Checkbox } from "@/components/ui/Checkbox";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
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

interface MultiParameterComparisonChartProps {
  exams: Exam[];
  title?: string;
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

export const MultiParameterComparisonChart: React.FC<MultiParameterComparisonChartProps> = ({ 
  exams, 
  title = 'Comparação de Múltiplos Parâmetros'
}) => {
  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
  const [normalizeValues, setNormalizeValues] = useState(false);
  
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
  
  // Extract reference ranges and min/max values for each parameter
  const parameterConfigs = useMemo(() => {
    const configs: Record<string, ParameterConfig> = {};
    
    selectedParameters.forEach((param, index) => {
      let min = Infinity;
      let max = -Infinity;
      let refMin: number | undefined = undefined;
      let refMax: number | undefined = undefined;
      const originalValues: Record<string, number> = {};
      
      exams.forEach(exam => {
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
  }, [exams, selectedParameters]);
  
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
    exams.forEach(exam => {
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
        const exam = exams.find(e => {
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
            } else {
              dataPoint[param] = null;
            }
          }
        }
      });
      
      dataPoints.push(dataPoint);
    });
    
    return dataPoints;
  }, [exams, selectedParameters, parameterConfigs, normalizeValues]);
  
  const handleParameterToggle = (parameter: string) => {
    setSelectedParameters(prev => 
      prev.includes(parameter)
        ? prev.filter(p => p !== parameter)
        : [...prev, parameter]
    );
  };
  
  const renderReferenceLines = () => {
    if (normalizeValues) return null;
    
    return selectedParameters.flatMap(param => {
      const config = parameterConfigs[param];
      const lines = [];
      
      if (config.referenceMin !== undefined) {
        lines.push(
          <ReferenceLine 
            key={`${param}-min`}
            y={config.referenceMin} 
            stroke={config.color} 
            strokeDasharray="3 3" 
            opacity={0.5}
          />
        );
      }
      
      if (config.referenceMax !== undefined) {
        lines.push(
          <ReferenceLine 
            key={`${param}-max`}
            y={config.referenceMax} 
            stroke={config.color} 
            strokeDasharray="3 3" 
            opacity={0.5}
          />
        );
      }
      
      return lines;
    });
  };
  
  // Custom Tooltip Content for Multi-Parameter Chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <ChartTooltipContent className="w-[220px]">
          <div className="flex flex-col gap-1 p-1">
            <span className="font-semibold text-foreground">{label}</span>
            {payload.map((item: any, idx: number) => {
              const param = item.dataKey;
              const value = item.value;
              const unit = item.payload[`${param}_unit`] || '';
              const refRange = item.payload[`${param}_refRange`] || '';
              return (
                <span key={idx} className="text-xs">
                  <span className="font-medium" style={{ color: item.color }}>{param}:</span> {value} {unit} {refRange && (<span className="text-muted-foreground">(Ref: {refRange})</span>)}
                </span>
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
        <CardTitle>{title}</CardTitle>
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
            <div className="aspect-video h-[400px] w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis domain={normalizeValues ? [0, 100] : undefined} />
                  <ShadcnChartTooltip cursor={false} content={<CustomTooltip />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  
                  {selectedParameters.map(param => (
                    <Line
                      key={param}
                      type="monotone"
                      dataKey={param}
                      stroke={parameterConfigs[param] ? `var(--color-${param})` : '#8884d8'}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                  
                  {!normalizeValues && selectedParameters.flatMap(param => {
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MultiParameterComparisonChart; 