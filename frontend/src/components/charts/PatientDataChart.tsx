'use client';

import React, { useState, useMemo } from 'react';
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
  ReferenceArea
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
  };
}

// Define prop types
interface PatientDataChartProps {
  vitals: VitalSign[];
  labs: LabResult[];
  title?: string;
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

export const PatientDataChart: React.FC<PatientDataChartProps> = ({
  vitals = [],
  labs = [],
  title = 'Dados Contínuos do Paciente'
}) => {

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

  const handleCheckboxChange = (param: string) => {
    setSelectedParameters(prev => ({ ...prev, [param]: !prev[param] }));
  };

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
        addDataPoint(timestamp, l.test_name, {
          value: l.value_numeric,
          unit: l.unit,
          refLow: l.reference_range_low,
          refHigh: l.reference_range_high,
          isAbnormal: l.is_abnormal
        });
      }
    });

    return Object.entries(data)
      .map(([ts, params]) => ({ timestamp: Number(ts), date: new Date(Number(ts)).toISOString(), ...params }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [vitals, labs, selectedParameters]);

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

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        {/* Parameter Selection Controls */}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
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
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
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
                      content={({ payload, label }) => {
                        if (!payload || payload.length === 0) return null;
                        const timestamp = label;
                        const formattedDate = new Date(timestamp).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});
                        
                        return (
                          <ChartTooltipContent className="min-w-[180px]">
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

                                if (typeof displayData === 'object' && displayData !== null && 'value' in displayData) {
                                  // It's a lab result object
                                  valueDisplay = displayData.value;
                                  unitDisplay = displayData.unit || null;
                                  if (displayData.refLow !== null && displayData.refLow !== undefined && displayData.refHigh !== null && displayData.refHigh !== undefined) {
                                    refRangeDisplay = `${displayData.refLow} - ${displayData.refHigh}`;
                                  }
                                  isAbnormalDisplay = displayData.isAbnormal || false;
                                } else {
                                  // It's a vital sign (direct number) or unknown
                                  valueDisplay = displayData;
                                }

                                const config = chartConfig[paramName];
                                const color = config?.color || '#888888';
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
                                  </div>
                                );
                              })}
                            </div>
                          </ChartTooltipContent>
                        );
                      }}
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
                            dot={false}
                            connectNulls={false}
                            name={parameterLabels[param] || param}
                        />
                    ))}
                  </LineChart>
                </ChartContainer>
              </ResponsiveContainer>
           )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientDataChart; 