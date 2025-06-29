'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from '@/components/ui/Chart';
import { LabResult } from '@/types/health';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

interface ResultsTimelineChartProps {
  results: LabResult[];
  title?: string;
  fixedTest?: string;
}

interface ChartDataPoint {
  date: string;
  value: number;
  isAbnormal: boolean | null | undefined;
  referenceMin?: number | null;
  referenceMax?: number | null;
  testName: string;
  unit?: string | null;
}

export const ResultsTimelineChart: React.FC<ResultsTimelineChartProps> = ({ 
  results, 
  title = 'Resultados ao Longo do Tempo',
  fixedTest
}) => {
  const [selectedTest, setSelectedTest] = useState<string | null>(fixedTest || null);
  
  const availableTests = useMemo(() => {
    const testNames = new Set<string>();
    results.forEach(result => {
      if (result.test_name && result.value_numeric !== null && result.value_numeric !== undefined) {
        testNames.add(result.test_name);
      }
    });
    return Array.from(testNames).sort();
  }, [results]);
  
  const chartConfig = useMemo(() => ({
    value: {
      label: selectedTest || 'Valor',
      color: "hsl(var(--primary))",
    },
    referenceMin: {
      label: 'Ref. Mín',
      color: "hsl(var(--secondary))",
    },
    referenceMax: {
      label: 'Ref. Máx',
      color: "hsl(var(--secondary))",
    },
  }), [selectedTest]) satisfies ChartConfig;
  
  useEffect(() => {
    if (fixedTest) {
      setSelectedTest(fixedTest);
    } else if (availableTests.length > 0 && (!selectedTest || !availableTests.includes(selectedTest))) {
      setSelectedTest(availableTests[0]);
    }
  }, [availableTests, selectedTest, fixedTest]);
  
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!selectedTest) return [];
    
    const filteredResults = results
      .filter(r => r.test_name === selectedTest && r.value_numeric !== null && r.value_numeric !== undefined)
      .map(r => ({
        date: r.timestamp,
        value: r.value_numeric!,
        isAbnormal: r.is_abnormal,
        referenceMin: r.reference_range_low,
        referenceMax: r.reference_range_high,
        testName: r.test_name,
        unit: r.unit
      }));
      
    return filteredResults.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [results, selectedTest]);
  
  const referenceRange = useMemo(() => {
    let min: number | null | undefined = undefined;
    let max: number | null | undefined = undefined;
    
    const ranges: Record<string, number> = {};
    let mostFrequentRangeKey = '';
    
    for (const point of chartData) {
      if (point.referenceMin !== null && point.referenceMin !== undefined && 
          point.referenceMax !== null && point.referenceMax !== undefined) {
          const key = `${point.referenceMin}-${point.referenceMax}`;
          ranges[key] = (ranges[key] || 0) + 1;
          if (!mostFrequentRangeKey || ranges[key] > ranges[mostFrequentRangeKey]) {
              mostFrequentRangeKey = key;
          }
      }
    }

    if (mostFrequentRangeKey) {
        const [minStr, maxStr] = mostFrequentRangeKey.split('-');
        min = parseFloat(minStr);
        max = parseFloat(maxStr);
    }
    
    return { min, max };
  }, [chartData]);

  const yAxisDomain = useMemo(() => {
    const values = chartData.map(p => p.value);
    if (values.length === 0) return [0, 100];
    
    let dataMin = Math.min(...values);
    let dataMax = Math.max(...values);
    
    const refMin = referenceRange.min;
    const refMax = referenceRange.max;
    
    if (refMin !== null && refMin !== undefined) dataMin = Math.min(dataMin, refMin);
    if (refMax !== null && refMax !== undefined) dataMax = Math.max(dataMax, refMax);

    const padding = (dataMax - dataMin) * 0.1 || 10;
    const domainMin = Math.max(0, Math.floor(dataMin - padding));
    const domainMax = Math.ceil(dataMax + padding);

    if (domainMin === domainMax) {
        return [domainMin - (padding || 10), domainMax + (padding || 10)];
    }

    return [domainMin, domainMax];
  }, [chartData, referenceRange]);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as ChartDataPoint;
      const formattedDate = new Date(dataPoint.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return (
        <ChartTooltipContent className="w-[200px]">
           <div className="flex flex-col gap-1 p-1">
             <span className="font-semibold text-foreground">{dataPoint.testName}</span>
             <span className="text-muted-foreground text-xs">{formattedDate}</span>
             <span className={`font-medium ${dataPoint.isAbnormal ? 'text-destructive' : 'text-primary'}`}>
                Valor: {dataPoint.value} {dataPoint.unit || ''}
             </span>
             {dataPoint.referenceMin !== null && dataPoint.referenceMax !== null && (
               <span className="text-muted-foreground text-xs">
                 Ref: {dataPoint.referenceMin} - {dataPoint.referenceMax}
               </span>
             )}
             {dataPoint.isAbnormal && (
               <Badge variant="destructive" className="mt-1 text-xs w-fit">Anormal</Badge>
             )}
           </div>
         </ChartTooltipContent>
      );
    }
    return null;
  };
  
  const showSelector = !fixedTest && availableTests.length > 1;
  
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Sem resultados disponíveis para visualização em gráfico.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-background shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          {title}: {selectedTest || 'Selecione um Exame'}
        </CardTitle>
        {showSelector && (
          <div className="mt-2">
            <Select value={selectedTest || ''} onValueChange={setSelectedTest}>
              <SelectTrigger id="test-selector" className="h-8 w-[200px] text-xs">
                <SelectValue placeholder="Selecionar Exame..." />
              </SelectTrigger>
              <SelectContent>
                {availableTests.map(test => (
                  <SelectItem key={test} value={test}>
                    {test}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          {chartData.length === 0 ? (
             <div className="flex items-center justify-center h-full text-muted-foreground">
                 {selectedTest ? `Sem dados numéricos para ${selectedTest}` : 'Selecione um exame'}
             </div>
           ) : (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')} 
                  />
                  <YAxis 
                    domain={yAxisDomain} 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    label={{ 
                      value: chartData.length > 0 && chartData[0].unit ? chartData[0].unit : 'Valor', 
                      angle: -90, 
                      position: 'insideLeft', 
                      style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' },
                      dy: 40
                    }}
                  /> 
                  <ChartTooltip cursor={false} content={<CustomTooltip />} />
                  <Line 
                    dataKey="value" 
                    type="monotone" 
                    stroke="var(--color-value)" 
                    strokeWidth={2} 
                    dot={true} 
                  />
                  {referenceRange.min !== undefined && referenceRange.min !== null && (
                    <Line
                      dataKey="referenceMin"
                      stroke="var(--color-referenceMin)"
                      strokeDasharray="5 5"
                      dot={false}
                      strokeWidth={1}
                      data={chartData.map(d => ({...d, referenceMin: referenceRange.min}))} 
                    />
                  )}
                  {referenceRange.max !== undefined && referenceRange.max !== null && (
                    <Line
                      dataKey="referenceMax"
                      stroke="var(--color-referenceMax)"
                      strokeDasharray="5 5"
                      dot={false}
                      strokeWidth={1}
                      data={chartData.map(d => ({...d, referenceMax: referenceRange.max}))} 
                    />
                  )}
                </LineChart>
              </ChartContainer>
            )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsTimelineChart; 