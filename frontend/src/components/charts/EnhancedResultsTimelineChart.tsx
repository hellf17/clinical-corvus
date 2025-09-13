'use client';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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
  ReferenceArea,
  Brush
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
import { Calendar } from "@/components/ui/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { format, subDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Download, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ResultsTimelineChartProps {
  results: LabResult[];
  title?: string;
  fixedTest?: string;
  onAnnotationClick?: (dataPoint: ChartDataPoint) => void;
}

interface ChartDataPoint {
  date: string;
  value: number;
 isAbnormal: boolean | null | undefined;
  referenceMin?: number | null;
  referenceMax?: number | null;
  testName: string;
  unit?: string | null;
  comments?: string | null;
  collectionDatetime?: string | null;
}

export const EnhancedResultsTimelineChart: React.FC<ResultsTimelineChartProps> = ({ 
  results, 
  title = 'Resultados ao Longo do Tempo',
  fixedTest,
  onAnnotationClick
}) => {
  const [selectedTest, setSelectedTest] = useState<string | null>(fixedTest || null);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const chartRef = useRef<HTMLDivElement>(null);
  
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
    abnormal: {
      label: 'Valor Anormal',
      color: "hsl(var(--destructive))",
    },
    normal: {
      label: 'Valor Normal',
      color: "hsl(var(--primary))",
    }
  }), [selectedTest]) satisfies ChartConfig;
  
  useEffect(() => {
    if (fixedTest) {
      setSelectedTest(fixedTest);
    } else if (availableTests.length > 0 && (!selectedTest || !availableTests.includes(selectedTest))) {
      setSelectedTest(availableTests[0]);
    }
  }, [availableTests, selectedTest, fixedTest]);
  
  // Set default date range to last 30 days if not set
  useEffect(() => {
    if (!dateRange.from && !dateRange.to && results.length > 0) {
      const latestDate = new Date(Math.max(...results.map(r => new Date(r.timestamp).getTime())));
      const earliestDate = new Date(Math.min(...results.map(r => new Date(r.timestamp).getTime())));
      const defaultFrom = subDays(latestDate, 30);
      const defaultTo = latestDate;
      
      // Only set if the default range covers some data
      if (defaultFrom < latestDate) {
        setDateRange({ from: defaultFrom, to: defaultTo });
      } else {
        setDateRange({ from: earliestDate, to: latestDate });
      }
    }
  }, [results, dateRange]);
  
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!selectedTest) return [];
    
    let filteredResults = results
      .filter(r => r.test_name === selectedTest && r.value_numeric !== null && r.value_numeric !== undefined);
      
    // Apply date range filter
    if (dateRange.from || dateRange.to) {
      filteredResults = filteredResults.filter(r => {
        const resultDate = new Date(r.timestamp);
        return (
          (!dateRange.from || resultDate >= dateRange.from) &&
          (!dateRange.to || resultDate <= dateRange.to)
        );
      });
    }
    
    const mappedResults = filteredResults.map(r => ({
      date: r.timestamp,
      value: r.value_numeric!,
      isAbnormal: r.is_abnormal,
      referenceMin: r.reference_range_low,
      referenceMax: r.reference_range_high,
      testName: r.test_name,
      unit: r.unit,
      comments: r.comments,
      collectionDatetime: r.collection_datetime
    }));
    
    return mappedResults.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [results, selectedTest, dateRange]);
  
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
      const formattedDate = new Date(dataPoint.date).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const collectionDate = dataPoint.collectionDatetime 
        ? new Date(dataPoint.collectionDatetime).toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : null;
      
      return (
        <ChartTooltipContent className="w-[250px]">
           <div className="flex flex-col gap-1 p-1">
             <span className="font-semibold text-foreground">{dataPoint.testName}</span>
             <span className="text-muted-foreground text-xs">Data do resultado: {formattedDate}</span>
             {collectionDate && collectionDate !== formattedDate && (
               <span className="text-muted-foreground text-xs">Data da coleta: {collectionDate}</span>
             )}
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
             {dataPoint.comments && (
               <div className="mt-1 text-xs text-muted-foreground">
                 <span className="font-medium">Observações:</span> {dataPoint.comments}
               </div>
             )}
           </div>
         </ChartTooltipContent>
      );
    }
    return null;
  };
  
  const showSelector = !fixedTest && availableTests.length > 1;
  
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
        pdf.save(`${selectedTest || 'chart'}-${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `${selectedTest || 'chart'}-${new Date().toISOString().split('T')[0]}.png`;
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-lg font-semibold text-foreground">
            {title}: {selectedTest || 'Selecione um Exame'}
          </CardTitle>
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
        <div 
          ref={chartRef} 
          className="h-[400px] w-full"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
        >
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
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: '2-digit' 
                      });
                    }}
                    minTickGap={50}
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
                  
                  {/* Reference range area */}
                  {referenceRange.min !== undefined && referenceRange.min !== null && 
                   referenceRange.max !== undefined && referenceRange.max !== null && (
                    <ReferenceArea
                      y1={referenceRange.min}
                      y2={referenceRange.max}
                      fill="hsl(var(--secondary))"
                      fillOpacity={0.1}
                    />
                  )}
                  
                  {/* Data points - normal values */}
                  <Line 
                    dataKey="value" 
                    type="monotone" 
                    stroke="var(--color-normal)" 
                    strokeWidth={2} 
                    dot={(props) => {
                      const { payload, cx, cy } = props;
                      const isAbnormal = payload.isAbnormal;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={isAbnormal ? "var(--color-abnormal)" : "var(--color-normal)"}
                          stroke="white"
                          strokeWidth={1}
                          onClick={() => onAnnotationClick && onAnnotationClick(payload)}
                          style={{ cursor: onAnnotationClick ? 'pointer' : 'default' }}
                        />
                      );
                    }}
                    activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }}
                  />
                  
                  {/* Reference lines */}
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
        
        {/* Chart legend and info */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span>Valor normal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-destructive"></div>
              <span>Valor anormal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-1 bg-secondary"></div>
              <span>Intervalo de referência</span>
            </div>
          </div>
          <div>
            {chartData.length} resultados exibidos
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedResultsTimelineChart;