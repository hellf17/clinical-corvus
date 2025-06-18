import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { alertsService, AlertType, AlertListResponse } from '@/services/alertsService';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@clerk/nextjs';
import { format, subDays, startOfDay, isValid, parseISO } from 'date-fns';

interface AlertsHistoryChartProps {
  patientId: string;
  days?: number;
  height?: number | string;
  showControls?: boolean;
}

interface HistoryData {
  date: string;
  alerts_count: number;
  by_severity: {
    critical: number;
    severe: number;
    moderate: number;
    warning: number;
    info: number;
    normal: number;
  };
  critical_alerts: Array<{
    category: string;
    parameter: string;
    message: string;
    severity: string;
  }>;
}

export default function AlertsHistoryChart({ 
  patientId, 
  days = 30, 
  height = 300,
  showControls = true
}: AlertsHistoryChartProps) {
  const [allAlerts, setAllAlerts] = useState<AlertType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(days.toString());
  const { addNotification } = useUIStore();
  const [chartColors, setChartColors] = useState<Record<string, string>>({});
  const { getToken } = useAuth();

  // Function to get computed style
  const getCssVariableValue = (variableName: string): string => {
    if (typeof window !== 'undefined') {
      return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    }
    return ''; // Fallback for SSR or non-browser environments
  };

  // Effect to load chart colors from CSS variables once on mount
  useEffect(() => {
    // Define mappings from data keys to CSS variable names
    // Ensure these CSS variables are defined in your global CSS / theme setup
    const colorMappings: Record<string, string> = {
        Crítico: '--destructive', // e.g., hsl(var(--destructive))
        Grave: '--destructive-foreground-muted', // Need a distinct severe color, maybe a muted destructive?
        Moderado: '--warning', // Assuming --warning exists for amber/yellow
        Alerta: '--warning-foreground-muted', // Need a distinct warning color, maybe a muted warning?
        Informativo: '--info', // Assuming --info exists for blue
        Normal: '--success' // Assuming --success exists for green
    };

    const resolvedColors: Record<string, string> = {};
    // Iterate with index
    for (const [index, [key, cssVar]] of Object.entries(colorMappings).entries()) {
        // Attempt to resolve HSL variable, e.g., hsl(var(--destructive))
        let colorValue = getCssVariableValue(cssVar);
        if (!colorValue && cssVar.startsWith('--')) {
             // Maybe the variable name itself is the color or we need a fallback?
             // For simplicity, using fallbacks if CSS vars aren't resolved
             // TODO: Improve this fallback logic based on actual theme structure
             switch (key) {
                case 'Crítico': colorValue = '#ef4444'; break;
                case 'Grave': colorValue = '#f97316'; break;
                case 'Moderado': colorValue = '#f59e0b'; break;
                case 'Alerta': colorValue = '#facc15'; break;
                case 'Informativo': colorValue = '#3b82f6'; break;
                case 'Normal': colorValue = '#22c55e'; break;
                default: colorValue = '#888888';
             }
        }
        // Recharts needs the direct color value, not the HSL string
        // This basic regex attempts to extract HSL values. Needs refinement for robustness.
        const hslMatch = colorValue.match(/(\d+)\s*,?\s*(\d+%?)\s*,?\s*(\d+%?)/);
         if (hslMatch) {
           resolvedColors[key] = `hsl(${hslMatch[1]}, ${hslMatch[2]}, ${hslMatch[3]})`;
         } else {
            // If it's not HSL (e.g., hex fallback or direct color value)
            const baseColors = [
              '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#387908', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'
            ];
            // TODO: Improve theme integration for chart colors if CSS variables aren't sufficient.
            const resolvedColor = colorValue || baseColors[index % baseColors.length]; // Now index is available
            // console.log(`Resolved color for index ${index}: ${resolvedColor}`);
            resolvedColors[key] = resolvedColor;
         }
    }
    setChartColors(resolvedColors);
  }, []); // Run only once

  // --- Fetch ALL alerts and process client-side --- 
  useEffect(() => {
    const fetchAllPatientAlerts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error("Authentication Token not found.");

        // Fetch a large number of alerts (adjust limit as needed, pagination might be better later)
        // Fetch ALL alerts, not just active ones, for historical view
        const data: AlertListResponse = await alertsService.getPatientAlerts(
          patientId, 
          token, 
          { limit: 500, onlyActive: false } // Fetch all, large limit
        );
        setAllAlerts(data.items);
      } catch (err: any) {
        console.error('Erro ao carregar histórico de alertas:', err);
        setError('Não foi possível carregar o histórico de alertas');
        addNotification({
          type: 'error',
          title: 'Erro',
          message: 'Falha ao carregar histórico de alertas'
        });
        setAllAlerts([]); // Clear data on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPatientAlerts();
    // Dependencies: patientId, getToken, addNotification
  }, [patientId, getToken, addNotification]);

  // --- Process fetched alerts into chart data format --- 
  const historyData = useMemo(() => {
    if (!allAlerts || allAlerts.length === 0) return [];

    const numDays = parseInt(selectedDays, 10);
    const cutoffDate = startOfDay(subDays(new Date(), numDays));
    
    const filteredAlerts = allAlerts.filter(alert => {
        try {
            const alertDate = parseISO(alert.created_at);
            return isValid(alertDate) && alertDate >= cutoffDate;
        } catch (e) {
            console.warn(`Invalid date format for alert ${alert.alert_id}: ${alert.created_at}`);
            return false;
        }
    });

    const groupedByDate: Record<string, HistoryData> = {};

    filteredAlerts.forEach(alert => {
      const dateStr = format(parseISO(alert.created_at), 'yyyy-MM-dd');

      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = {
          date: dateStr,
          alerts_count: 0,
          by_severity: { critical: 0, severe: 0, moderate: 0, warning: 0, info: 0, normal: 0 },
          critical_alerts: [],
        };
      }

      groupedByDate[dateStr].alerts_count += 1;
      const severityKey = alert.severity as keyof HistoryData['by_severity'];
      if (severityKey in groupedByDate[dateStr].by_severity) {
        groupedByDate[dateStr].by_severity[severityKey] += 1;
      }

      // Collect critical/severe alerts for tooltip (optional)
      if (alert.severity === 'critical' || alert.severity === 'severe') {
           groupedByDate[dateStr].critical_alerts.push({
               category: alert.category || 'N/A',
               parameter: alert.parameter || 'N/A',
               message: alert.message,
               severity: alert.severity,
           });
      }
    });
    
    // Convert to array and sort by date
    return Object.values(groupedByDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  }, [allAlerts, selectedDays]);

  // Memoize chart data based on processed historyData
  const chartData = useMemo(() => historyData.map(item => ({
    date: item.date,
    Crítico: item.by_severity.critical,
    Grave: item.by_severity.severe,
    Moderado: item.by_severity.moderate,
    Alerta: item.by_severity.warning,
    Informativo: item.by_severity.info,
    Normal: item.by_severity.normal,
  })), [historyData]);

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayData = historyData.find(item => item.date === label);
      
      return (
        <div className="bg-popover text-popover-foreground p-3 border rounded shadow-sm text-xs max-w-xs">
          <p className="font-medium mb-1">{format(parseISO(label), 'dd/MM/yyyy')}</p> 
          <p className="text-muted-foreground mb-2">Total: {dayData?.alerts_count || 0} alertas</p>
          
          {payload.map((entry: any, index: number) => (
            entry.value > 0 && (
                <div key={`item-${index}`} className="flex items-center gap-2 mb-0.5">
                <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color || entry.payload.fill || '#888' }} 
                />
                <span className="text-xs">{entry.name}: {entry.value}</span>
                </div>
            )
          ))}
          
          {dayData?.critical_alerts && dayData.critical_alerts.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="font-medium text-destructive mb-1">Alertas Críticos/Graves:</p>
              <ul className="list-none space-y-1">
                {dayData.critical_alerts.slice(0, 3).map((alert, idx) => (
                  <li key={idx} className="truncate text-xs">
                    <span className={`font-semibold ${alert.severity === 'critical' ? 'text-destructive' : 'text-orange-600'}`}>
                         {alert.severity === 'critical' ? 'Crit:' : 'Sev:'}
                    </span> 
                     {alert.parameter || alert.category}: {alert.message}
                  </li>
                ))}
                 {dayData.critical_alerts.length > 3 && (
                     <li className="text-xs text-muted-foreground italic">...e mais {dayData.critical_alerts.length - 3}</li>
                 )}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Evolução de Alertas</span>
          {showControls && (
            <div className="flex gap-2">
              <Select 
                value={selectedDays} 
                onValueChange={setSelectedDays}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-[300px]">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>{error}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>Sem dados de alertas no período selecionado</p>
          </div>
        ) : !(isLoading || error || chartData.length === 0) && Object.keys(chartColors).length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              barSize={20}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(dateStr) => format(parseISO(dateStr), 'dd/MM')}
                angle={-45} 
                textAnchor="end" 
                height={50}
                tickMargin={15}
                scale="band"
              />
              <YAxis allowDecimals={false} />
              <Tooltip content={customTooltip} />
              <Legend />
              <Bar dataKey="Crítico" stackId="a" fill={chartColors['Crítico'] || '#ef4444'} />
              <Bar dataKey="Grave" stackId="a" fill={chartColors['Grave'] || '#f97316'} />
              <Bar dataKey="Moderado" stackId="a" fill={chartColors['Moderado'] || '#f59e0b'} />
              <Bar dataKey="Alerta" stackId="a" fill={chartColors['Alerta'] || '#facc15'} />
              <Bar dataKey="Informativo" stackId="a" fill={chartColors['Informativo'] || '#3b82f6'} />
              <Bar dataKey="Normal" stackId="a" fill={chartColors['Normal'] || '#22c55e'} />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </CardContent>
    </Card>
  );
} 