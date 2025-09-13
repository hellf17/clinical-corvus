'use client'; // Mark as client component

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Activity, AlertCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { getLabSummaryClient } from '@/services/labService.client';
import { useAuth } from '@clerk/nextjs';

// Helper function to generate colors for lines
const generateLineColor = (index: number): string => {
  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2))", // Assuming theme defines chart colors
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];
  return colors[index % colors.length];
};

interface PatientLabSummaryChartProps { // Define props
  patientId: number;
}

export default function PatientLabSummaryChart({ patientId }: PatientLabSummaryChartProps) {
    const { getToken } = useAuth();
    const [chartData, setChartData] = useState<any[]>([]); // Use any initially for dynamic keys
    const [linesToPlot, setLinesToPlot] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        if (!patientId) { // Guard clause if patientId might be undefined/null initially
            setIsLoading(false);
            // setError("Patient ID not provided for lab summary chart."); // Optional: set error
            setChartData([]);
            setLinesToPlot([]);
            return;
        }
        (async () => {
            try {
                const token = await getToken();
                if (!token) throw new Error('Authentication token not found.');
                const fetchedData = await getLabSummaryClient(token, patientId); // Pass patientId
                if (fetchedData && Array.isArray(fetchedData) && fetchedData.length > 0) {
                    setChartData(fetchedData);
                    const firstDataPoint = fetchedData[0];
                    const dataKeys = Object.keys(firstDataPoint).filter(key => key !== 'name');
                    const dynamicLines = dataKeys.map((key, index) => ({
                        dataKey: key,
                        stroke: generateLineColor(index),
                        name: key,
                    }));
                    setLinesToPlot(dynamicLines);
                } else {
                    setChartData([]);
                    setLinesToPlot([]);
                }
            } catch (err: any) {
                setError(err.message || 'Erro ao buscar dados de exames.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [getToken, patientId]); // Add patientId to dependency array

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="mr-2 h-5 w-5 text-green-500" />
          Evolução de Exames (Paciente ID: {patientId})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex justify-center items-center h-[250px]">
                <Spinner />
            </div>
        ) : error ? (
            <div className="flex justify-center items-center h-[250px]">
                <Alert className="text-destructive border-destructive dark:border-destructive [&>svg]:text-destructive text-xs w-full">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        ) : chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={250}>
                <LineChart
                data={chartData} // Use fetched data
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                 {linesToPlot.map(line => (
                    <Line 
                        key={line.dataKey} 
                        type="monotone" 
                        dataKey={line.dataKey} 
                        stroke={line.stroke} 
                        strokeWidth={2} 
                        dot={false} 
                        activeDot={{ r: 6 }} 
                        name={line.name}
                    />
                 ))}
                </LineChart>
            </ResponsiveContainer>
             <p className="text-xs text-muted-foreground mt-2 text-center">
                Gráfico simplificado. Consulte a seção de exames para detalhes.
            </p>
           </>
        ) : (
           <p className="text-muted-foreground text-sm text-center py-10">
                Dados de evolução indisponíveis para o paciente ID {patientId} para exibir gráfico.
            </p>
        )}
      </CardContent>
    </Card>
  );
} 