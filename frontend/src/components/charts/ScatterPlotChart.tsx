import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label as ShadcnLabel } from "@/components/ui/Label";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Label
} from 'recharts';
import { ChartContainer, ChartTooltip as ShadcnChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/Chart";
import { Exam } from '@/store/patientStore';
import { calculatePearsonCorrelation } from '@/utils/statistics';
import { Spinner } from "@/components/ui/Spinner";
import { LabResult } from '@/types/health'; // Import LabResult

// Define a minimum number of data points required for correlation calculation
const MIN_DATA_POINTS = 5;

interface ScatterPlotChartProps {
  exams: Exam[];
  title?: string;
}

interface DataPoint {
  x: number;
  y: number;
  date: string;
  isAbnormalX: boolean;
  isAbnormalY: boolean;
}

interface ScatterShapeProps {
  cx?: number;
  cy?: number;
  payload?: DataPoint;
}

export const ScatterPlotChart: React.FC<ScatterPlotChartProps> = ({ 
  exams, 
  title = 'Gráfico de Dispersão' 
}) => {
  const [parameterX, setParameterX] = useState<string>('');
  const [parameterY, setParameterY] = useState<string>('');
  const [showTrendline, setShowTrendline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Define chart configuration unconditionally at the top level
  const chartConfig = useMemo(() => ({
    points: {
      label: `${parameterX} vs ${parameterY}`,
      color: "hsl(var(--primary))", // Default color
    },
    trendline: {
      label: 'Linha de Tendência',
      color: "hsl(var(--muted-foreground))",
    },
  } satisfies ChartConfig), [parameterX, parameterY]);

  // Extract available parameters and prepare scatter data
  const { availableParameters, scatterData } = useMemo(() => {
    const paramNames = new Set<string>();
    
    exams.forEach(exam => {
      exam.lab_results.forEach(result => {
        if (typeof result.test_name === "string" && result.test_name) {
          paramNames.add(result.test_name);
        }
      });
    });
    
    const availableParams = Array.from(paramNames).sort();
    const dataPoints: DataPoint[] = [];
    
    exams.forEach(exam => {
      const resultX = exam.lab_results.find(r => r.test_name === parameterX);
      const resultY = exam.lab_results.find(r => r.test_name === parameterY);
      const timestamp = exam.exam_timestamp; // Use only exam_timestamp

      if (!timestamp) return; // Skip if no timestamp
      
      if (resultX && resultY && resultX.value_numeric !== null && resultX.value_numeric !== undefined && resultY.value_numeric !== null && resultY.value_numeric !== undefined) {
        dataPoints.push({
          x: resultX.value_numeric,
          y: resultY.value_numeric,
          date: timestamp, // Use the validated timestamp
          isAbnormalX: resultX.is_abnormal || false,
          isAbnormalY: resultY.is_abnormal || false,
        });
      }
    });
    
    // Sort by date
    const sortedDataPoints = dataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return {
      availableParameters: availableParams,
      scatterData: sortedDataPoints,
    };
  }, [exams, parameterX, parameterY]);

  // Calculate correlation and trendline data
  const correlationData = useMemo(() => {
    if (scatterData.length < MIN_DATA_POINTS) {
      return { correlation: 0, slope: 0, intercept: 0, hasEnoughData: false };
    }
    
    const xValues = scatterData.map(point => point.x);
    const yValues = scatterData.map(point => point.y);
    
    // Calculate Pearson correlation coefficient
    const correlation = calculatePearsonCorrelation(xValues, yValues);
    
    // Calculate linear regression (y = mx + b)
    const n = xValues.length;
    const sumX = xValues.reduce((acc, val) => acc + val, 0);
    const sumY = yValues.reduce((acc, val) => acc + val, 0);
    const sumXY = xValues.reduce((acc, val, i) => acc + val * yValues[i], 0);
    const sumXX = xValues.reduce((acc, val) => acc + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { correlation, slope, intercept, hasEnoughData: true };
  }, [scatterData]);
  
  const trendlineData = useMemo(() => {
    if (!correlationData.hasEnoughData || !showTrendline) return [];
    
    if (scatterData.length === 0) return [];
    
    // Find min and max X values
    const minX = Math.min(...scatterData.map(point => point.x));
    const maxX = Math.max(...scatterData.map(point => point.x));
    
    // Create two points for the trendline
    return [
      { x: minX, y: correlationData.slope * minX + correlationData.intercept },
      { x: maxX, y: correlationData.slope * maxX + correlationData.intercept }
    ];
  }, [scatterData, correlationData, showTrendline]);

  // Set initial parameters once availableParameters are calculated
  useEffect(() => {
    if (availableParameters.length >= 2 && !parameterX && !parameterY) {
      setParameterX(availableParameters[0]);
      setParameterY(availableParameters[1]);
      setIsLoading(false); // Stop loading once initial params are set
    } else if (availableParameters.length < 2) {
      setError('Dados insuficientes para exibir gráfico de dispersão (necessário pelo menos 2 parâmetros numéricos).');
      setIsLoading(false);
    }
    // Add handling if parameters become invalid after initial load
    if (parameterX && !availableParameters.includes(parameterX)) {
        setParameterX(availableParameters[0] || '');
    }
    if (parameterY && !availableParameters.includes(parameterY)) {
        setParameterY(availableParameters.find(p => p !== parameterX) || '');
    }

  }, [availableParameters, parameterX, parameterY]);

  if (isLoading) {
    return <Card><CardContent><Spinner /></CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent><p className="text-destructive">{error}</p></CardContent></Card>;
  }

  // Parameter selection or rendering logic happens after hooks
  if (!parameterX || !parameterY || availableParameters.length < 2) {
     // Render placeholder or selection prompt if params not ready
     return (
        <Card>
          <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
          <CardContent>
            <p>Selecione os parâmetros X e Y para visualizar a correlação.</p>
             {/* Include parameter selection dropdowns here as well? */} 
          </CardContent>
        </Card>
      );
  }

  // Correlation strength calculation (can stay here as it depends on correlationData)
  const getCorrelationStrength = (corr: number): { text: string; color: string } => {
    const absCorr = Math.abs(corr);
    
    if (absCorr >= 0.8) {
      return { 
        text: 'Muito forte', 
        color: corr > 0 ? 'text-green-600' : 'text-red-600' 
      };
    } else if (absCorr >= 0.6) {
      return { 
        text: 'Forte', 
        color: corr > 0 ? 'text-green-500' : 'text-red-500' 
      };
    } else if (absCorr >= 0.4) {
      return { 
        text: 'Moderada', 
        color: corr > 0 ? 'text-green-400' : 'text-red-400' 
      };
    } else if (absCorr >= 0.2) {
      return { 
        text: 'Fraca', 
        color: corr > 0 ? 'text-green-300' : 'text-red-300' 
      };
    } else {
      return { 
        text: 'Muito fraca ou inexistente', 
        color: 'text-muted-foreground' 
      };
    }
  };
  
  const correlationStrength = getCorrelationStrength(correlationData.correlation);

  // Custom shape renderer (can stay here)
  const CustomShape = (props: ScatterShapeProps) => {
    const { cx = 0, cy = 0, payload } = props;
    // Use shadcn CSS variables for colors
    const color = payload?.isAbnormalX || payload?.isAbnormalY ? "hsl(var(--destructive))" : "hsl(var(--primary))";
    
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={6} 
        fill={color} 
        stroke="#FFF" 
        strokeWidth={2} 
      />
    );
  };
  
  // Custom Tooltip (can stay here)
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DataPoint = payload[0].payload; // Payload for scatter is array with one item
      // Find the exam and results for this data point
      const examForTooltip = exams.find(e => {
        const timestamp = e.exam_timestamp;
        // Ensure data.date (which comes from exam_timestamp) is valid for comparison
        return timestamp && new Date(timestamp).getTime() === new Date(data.date).getTime();
      });
      const resultX = examForTooltip?.lab_results.find(r => r.test_name === parameterX);
      const resultY = examForTooltip?.lab_results.find(r => r.test_name === parameterY);
      const formatResult = (result: any) => {
        if (!result) return '-';
        let value = result.value_numeric ?? result.value ?? '-';
        let unit = result.unit ? ` ${result.unit}` : '';
        let ref = result.reference_range ? ` (Ref: ${result.reference_range}${unit})` : (unit ? ` (${unit})` : '');
        return `${value}${unit}${ref}`;
      };
      return (
        <div className="bg-background/90 backdrop-blur-sm p-2 shadow-lg rounded-md border border-border/30 text-sm">
          <p className="text-muted-foreground font-medium mb-1">Data: {new Date(data.date).toLocaleDateString()}</p>
          <p>{`${parameterX}: ${formatResult(resultX)}`}</p>
          <p>{`${parameterY}: ${formatResult(resultY)}`}</p>
        </div>
      );
    }
    return null;
  };
  
  // Main return JSX with the chart
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{title}</span>
          <div className="flex items-center space-x-2 flex-wrap gap-2 md:gap-0">
            <div className="flex items-center">
              <ShadcnLabel htmlFor="select-param-x" className="text-sm mr-1.5">X:</ShadcnLabel>
              <Select value={parameterX} onValueChange={setParameterX}>
                <SelectTrigger id="select-param-x" className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Selecione X" />
                </SelectTrigger>
                <SelectContent>
                {availableParameters.map(param => (
                    <SelectItem key={`x-${param}`} value={param} disabled={param === parameterY}>
                    {param}
                    </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center">
              <ShadcnLabel htmlFor="select-param-y" className="text-sm ml-2 mr-1.5">Y:</ShadcnLabel>
              <Select value={parameterY} onValueChange={setParameterY}>
                <SelectTrigger id="select-param-y" className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Selecione Y" />
                </SelectTrigger>
                <SelectContent>
                {availableParameters.map(param => (
                    <SelectItem key={`y-${param}`} value={param} disabled={param === parameterX}>
                    {param}
                    </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-1.5 ml-2">
              <Checkbox 
                id="trendline-toggle" 
                checked={showTrendline}
                onCheckedChange={(checked) => setShowTrendline(Boolean(checked))}
                disabled={!correlationData.hasEnoughData}
              />
              <ShadcnLabel htmlFor="trendline-toggle" className="text-xs font-normal text-muted-foreground">Linha de Tendência</ShadcnLabel>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {scatterData.length >= MIN_DATA_POINTS ? (
          <>
            <div className="h-64 md:h-80">
              <ChartContainer config={chartConfig} className="aspect-video h-[300px] w-full">
                <ScatterChart
                  margin={{
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 10,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name={parameterX} 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8}
                  >
                    <Label value={parameterX} offset={-15} position="insideBottom" style={{ textAnchor: 'middle' }} />
                  </XAxis>
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name={parameterY} 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8}
                  >
                    <Label value={parameterY} angle={-90} offset={0} position="insideLeft" style={{ textAnchor: 'middle' }} />
                  </YAxis>
                  <ShadcnChartTooltip cursor={false} content={<CustomTooltip />} />
                  <Scatter 
                    name="Pontos" 
                    data={scatterData} 
                    fill="#8884d8"
                    shape={<CustomShape />}
                  />
                  
                  {showTrendline && correlationData.hasEnoughData && (
                    <Scatter
                      name="Tendência"
                      data={trendlineData}
                      line={{ stroke: '#ff7300', strokeWidth: 2 }}
                      shape={false}
                      legendType="line"
                    />
                  )}
                </ScatterChart>
              </ChartContainer>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center">
                <span className="mr-2 font-semibold">Correlação:</span>
                <span className={correlationStrength.color}>
                  {correlationData.correlation.toFixed(2)} 
                  {correlationData.correlation > 0 ? " (positiva)" : correlationData.correlation < 0 ? " (negativa)" : ""}
                </span>
                <span className="mx-2">-</span>
                <span className={correlationStrength.color}>{correlationStrength.text}</span>
              </div>
              
              {showTrendline && (
                <div>
                  <span className="font-semibold">Equação:</span>
                  <span className="ml-2">
                    {parameterY} = {correlationData.slope.toFixed(3)} × {parameterX}
                    {correlationData.intercept >= 0 ? " + " : " "}{correlationData.intercept.toFixed(3)}
                  </span>
                </div>
              )}
              
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                <p className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  Normal
                  <span className="inline-block w-3 h-3 bg-red-500 rounded-full ml-4 mr-2"></span>
                  Alterado
                </p>
                <p className="mt-2">
                  <span className="font-medium">Nota:</span> Correlação não implica causalidade. 
                  Fatores externos podem influenciar ambos os parâmetros.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-foreground">
            {scatterData.length === 0 ? (
              `Não há dados suficientes para os parâmetros selecionados`
            ) : (
              `São necessários pelo menos ${MIN_DATA_POINTS} pontos de dados para calcular a correlação`
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScatterPlotChart; 