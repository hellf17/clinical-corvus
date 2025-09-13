'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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
  ChartTooltip as ShadcnChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartConfig
} from '@/components/ui/Chart';
import { VitalSign } from '@/types/health';
import { LabResult } from '@/types/health';
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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

// Define combined data type
interface CombinedDataPoint {
  timestamp: number; // Use epoch milliseconds for easier sorting/plotting
  date: string; // Formatted date string for display
  // Value can be a number for vitals, or an object for labs containing more details
  [key: string]: number | string | { 
    value: number;
    unit?: string | null;
    refLow?: number | null;
    refHigh?: number | null;
    isAbnormal?: boolean | null;
    testName?: string;
    comments?: string | null;
  };
}

// Define prop types
interface EnhancedPatientDataChartProps {
  vitals: VitalSign[];
  labs: LabResult[];
  title?: string;
  onParameterClick?: (parameter: string, dataPoint: CombinedDataPoint) => void;
}

// Mapping for display names
const parameterLabels: { [key: string]: string } = {
  heart_rate: "Freq. Cardíaca",
  systolic_bp: "PAS",
  diastolic_bp: "PAD",
  temperature: "Temperatura",
  respiratory_rate: "Freq. Respiratória",
  oxygen_saturation: "Sat O₂",
  hemoglobin: "Hemoglobina",
  hematocrit: "Hematócrito",
  leukocytes: "Leucócitos",
  platelets: "Plaquetas",
  glucose: "Glicose",
};

// Function to generate distinct HSL colors
const generateHslColor = (index: number, count: number): string => {
  const hue = Math.round((index * (360 / count)) % 360);
  // Use fixed saturation and lightness for vibrant, distinct colors
  return `hsl(${hue}, 70%, 50%)`; 
};

export const EnhancedPatientDataChart: React.FC<EnhancedPatientDataChartProps> = ({
  vitals = [],
  labs = [],
  title = 'Dados Contínuos do Paciente',
  onParameterClick
}) => {
  // State for selected parameters
  const [selectedParameters, setSelectedParameters] = useState<Record<string, boolean>>(() => {
    // Initially select a few common parameters if available
    const initialState: Record<string, boolean> = {};
    const defaultSelection = ['heart_rate', 'systolic_bp', 'diastolic_bp', 'temperature', 'oxygen_saturation'];
    availableParameters.forEach(param => {
        initialState[param] = defaultSelection.includes(param);
    });
    return initialState;
  });
  
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showReferenceRanges, setShowReferenceRanges] = useState<boolean>(true);
  const [showAbnormalMarkers, setShowAbnormalMarkers] = useState<boolean>(true);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Get available parameters from data
  const availableParameters = useMemo(() => {
    const params = new Set<string>();
    vitals.forEach(v => {
      // Iterate over keys of the VitalSign object
      Object.keys(v).forEach(key => {
        // Check if the key is a valid parameter and has a value
        if (key !== 'vital_id' && key !== 'patient_id' && key !== 'timestamp' && 
            parameterLabels[key] && v[key as keyof VitalSign] !== null && v[key as keyof VitalSign] !== undefined) {
          params.add(key);
        }
      });
    });
    labs.forEach(l => {
      // Only include labs with numeric values and known labels/colors
      if (l.test_name && parameterLabels[l.test_name] && l.value_numeric !== null && l.value_numeric !== undefined) {
        params.add(l.test_name);
      }
    });
    return Array.from(params).sort();
  }, [vitals, labs]);

  const handleCheckboxChange = (param: string) => {
    setSelectedParameters(prev => ({ ...prev, [param]: !prev[param] }));
  };
  
  // Set default date range to last 30 days if not set
  const chartData = useMemo(() => {
    const data: Record<number, Record<string, any>> = {}; // Allow 'any' for lab objects temporarily

    const addDataPoint = (timestamp: number, param: string, value: any) => {
      if (value === null || value === undefined) return;
      if (!data[timestamp]) {
        data[timestamp] = {};
      }
      data[timestamp][param] = value;
    };

    // Process Vitals
    vitals.forEach(v => {
      const timestamp = new Date(v.timestamp).getTime();
      
      // Apply date range filter
      if (dateRange.from || dateRange.to) {
        const date = new Date(timestamp);
        if ((dateRange.from && date < dateRange.from) || (dateRange.to && date > dateRange.to)) {
          return; // Skip this data point
        }
      }
      
      Object.keys(v).forEach(key => {
        const vitalValue = v[key as keyof VitalSign];
        if (key !== 'vital_id' && key !== 'patient_id' && key !== 'timestamp' && 
            selectedParameters[key] && typeof vitalValue === 'number') {
           addDataPoint(timestamp, key, vitalValue);
        }
      });
    });

    // Process Labs
    labs.forEach(l => {
      if (l.test_name && selectedParameters[l.test_name] && l.value_numeric !== null && l.value_numeric !== undefined) {
        const timestamp = new Date(l.timestamp).getTime();
        
        // Apply date range filter
        if (dateRange.from || dateRange.to) {
          const date = new Date(timestamp);
          if ((dateRange.from && date < dateRange.from) || (dateRange.to && date > dateRange.to)) {
            return; // Skip this data point
          }
        }
        
        addDataPoint(timestamp, l.test_name, {
          value: l.value_numeric,
          unit: l.unit,
          refLow: l.reference_range_low,
          refHigh: l.reference_range_high,
          isAbnormal: l.is_abnormal,
          testName: l.test_name,
          comments: l.comments
        });
      }
    });

    return Object.entries(data)
      .map(([ts, params]) => ({ timestamp: Number(ts), date: new Date(Number(ts)).toISOString(), ...params }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [vitals, labs, selectedParameters, dateRange]);

  // Assign parameters to Y-axes (limit to 2 axes: left/right)
  const axisAssignments = useMemo(() => {
    const assignments: { [param: string]: { axisId: 'left' | 'right', color: string } } = {};
    const selected = Object.entries(selectedParameters)
        .filter(([, isSelected]) => isSelected)
        .map(([param]) => param);
    
    selected.forEach((param, index) => {
      const axisId = index % 2 === 0 ? 'left' : 'right'; // Alternate axes
      const color = generateHslColor(index, selected.length); // Generate color based on selected index
      assignments[param] = { axisId, color };
    });
    return assignments;
  }, [selectedParameters]);

  // Generate dynamic ChartConfig for Shadcn components
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    Object.entries(axisAssignments).forEach(([param, { color }]) => {
      config[param] = {
        label: parameterLabels[param] || param,
        color: color,
      };
    });
    return config;
  }, [axisAssignments]);

  // Determine which axes need to be rendered
  const yAxesToRender = useMemo(() => {
    const axes = new Set<'left' | 'right'>();
    Object.values(axisAssignments).forEach(({ axisId }) => axes.add(axisId));
    return Array.from(axes);
  }, [axisAssignments]);
  
  // Set default date range to last 30 days if not set
  React.useEffect(() => {
    if (!dateRange.from && !dateRange.to && (vitals.length > 0 || labs.length > 0)) {
      const allDates = [
        ...vitals.map(v => new Date(v.timestamp).getTime()),
        ...labs.map(l => new Date(l.timestamp).getTime())
      ];
      
      if (allDates.length > 0) {
        const latestDate = new Date(Math.max(...allDates));
        const earliestDate = new Date(Math.min(...allDates));
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
  }, [vitals, labs, dateRange]);
  
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
        pdf.save(`patient-data-chart-${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `patient-data-chart-${new Date().toISOString().split('T')[0]}.png`;
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
  
  // Custom tooltip with more clinical information
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const timestamp = label;
      const formattedDate = new Date(timestamp).toLocaleDateString('pt-BR', {
        day: '2-digit', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
      });
      
      return (
        <ChartTooltipContent className="min-w-[200px]">
          <div className="p-1 space-y-1">
            <div className="text-center font-medium text-foreground mb-1.5">
              {formattedDate}
            </div>
            {payload.map((item: any, index: number) => {
              const paramName = item.dataKey as string;
              const displayData = item.payload[paramName];
              
              let valueDisplay: string | number;
              let unitDisplay: string | null = null;
              let refRangeDisplay: string | null = null;
              let isAbnormalDisplay: boolean | null = false;
              let commentsDisplay: string | null = null;
              let testNameDisplay: string | null = null;

              if (typeof displayData === 'object' && displayData !== null && 'value' in displayData) {
                // It's a lab result object
                valueDisplay = displayData.value;
                unitDisplay = displayData.unit || null;
                if (displayData.refLow !== null && displayData.refLow !== undefined && displayData.refHigh !== null && displayData.refHigh !== undefined) {
                  refRangeDisplay = `${displayData.refLow} - ${displayData.refHigh}`;
                }
                isAbnormalDisplay = displayData.isAbnormal || false;
                commentsDisplay = displayData.comments || null;
                testNameDisplay = displayData.testName || null;
              } else {
                // It's a vital sign (direct number) or unknown
                valueDisplay = displayData;
              }

              const config = chartConfig[paramName];
              const color = config?.color || '#88888';
              const labelText = config?.label || paramName;

              return (
                <div key={index} className="flex flex-col text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-medium text-muted-foreground">{labelText}:</span>
                    <span 
                      className={`font-semibold ${isAbnormalDisplay ? 'text-destructive' : 'text-foreground'}`}
                    >
                      {valueDisplay} {unitDisplay || ''}
                    </span>
                  </div>
                  {refRangeDisplay && (
                    <div className="ml-[16px] text-muted-foreground/80">
                      Ref: {refRangeDisplay}
                    </div>
                  )}
                  {isAbnormalDisplay && unitDisplay && (
                     <Badge variant="destructive" className="ml-[16px] mt-0.5 text-xs w-fit px-1.5 py-0.5">Anormal</Badge>
                  )}
                  {commentsDisplay && (
                    <div className="ml-[16px] text-muted-foreground/80">
                      Obs: {commentsDisplay}
                    </div>
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

  if (availableParameters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum parâmetro disponível para visualização.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
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
                    <Label htmlFor="reference-ranges">Intervalos de Referência</Label>
                    <Checkbox 
                      id="reference-ranges" 
                      checked={showReferenceRanges}
                      onCheckedChange={(checked) => setShowReferenceRanges(Boolean(checked))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="abnormal-markers">Marcadores Anormais</Label>
                    <Checkbox 
                      id="abnormal-markers" 
                      checked={showAbnormalMarkers}
                      onCheckedChange={(checked) => setShowAbnormalMarkers(Boolean(checked))}
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
      </CardHeader>
      <CardContent>
        {/* Parameter Selection Controls */}
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
            {availableParameters.map((param, index) => {
                // Find assigned color if selected, otherwise use gray
                const assignment = axisAssignments[param];
                const color = assignment ? assignment.color : '#ccc';
                const isSelected = selectedParameters[param];

                return (
                    <div key={param} className="flex items-center space-x-2">
                        <Checkbox
                            id={`param-${param}`}
                            checked={isSelected}
                            onCheckedChange={() => handleCheckboxChange(param)}
                            // Visually indicate color association
                            className={`data-[state=checked]:border-[${color}] data-[state=checked]:bg-[${color}]/20`}
                        />
                        <Label 
                            htmlFor={`param-${param}`} 
                            className="text-sm font-normal cursor-pointer"
                            style={{ color: isSelected ? color : undefined }} // Color label when selected
                        >
                            {parameterLabels[param] || param}
                        </Label>
                    </div>
                );
            })}
            {availableParameters.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum parâmetro disponível.</p>
            )}
        </div>
        
        <div 
          ref={chartRef} 
          className="h-[400px]"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
        >
          {chartData.length === 0 ? (
             <div className="flex items-center justify-center h-full text-muted-foreground">
                Selecione parâmetros ou não há dados disponíveis no período.
             </div>
           ) : (
              <ResponsiveContainer width="100%" height="100%">
                {/* Pass dynamic chartConfig */}
                <ChartContainer config={chartConfig}> 
                  <LineChart data={chartData} margin={{ top: 5, right: yAxesToRender.includes('right') ? 30 : 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()} // Format timestamp for axis
                      axisLine={false}
                      tickLine={false}
                    />
                    {/* Render Y Axes Dynamically */}
                    {yAxesToRender.map((axisId) => (
                        <YAxis
                            key={axisId}
                            yAxisId={axisId}
                            orientation={axisId}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: `hsl(var(--foreground))` }} // Match axis tick color to parameter color if needed, complex
                            // Consider adding domain adjustments per axis if scales vary wildly
                        />
                    ))}
                    <ShadcnChartTooltip
                      cursor={false}
                      content={<CustomTooltip />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    
                    {/* Render Lines Dynamically with Axis Assignment */}
                    {Object.entries(axisAssignments).map(([param, { axisId, color }]) => (
                        <Line
                            key={param}
                            yAxisId={axisId} // Assign line to specific Y-axis
                            type="monotone"
                            dataKey={param}
                            stroke={color} // Use generated color
                            strokeWidth={2}
                            dot={(props) => {
                              const { cx, cy, payload } = props;
                              const data = payload[param];
                              
                              // For lab results, check if abnormal
                              const isAbnormal = typeof data === 'object' && data !== null && 'isAbnormal' in data 
                                ? data.isAbnormal 
                                : false;
                              
                              return (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={showAbnormalMarkers && isAbnormal ? 6 : 4}
                                  fill={showAbnormalMarkers && isAbnormal ? "hsl(var(--destructive))" : color}
                                  stroke="white"
                                  strokeWidth={1}
                                  onClick={() => onParameterClick && onParameterClick(param, payload)}
                                  style={{ cursor: onParameterClick ? 'pointer' : 'default' }}
                                />
                              );
                            }}
                            activeDot={{ r: 8, stroke: "white", strokeWidth: 2 }}
                            connectNulls={false}
                            name={parameterLabels[param] || param}
                        />
                    ))}
                  </LineChart>
                </ChartContainer>
              </ResponsiveContainer>
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
          </div>
          <div>
            {chartData.length} pontos de dados exibidos
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedPatientDataChart;