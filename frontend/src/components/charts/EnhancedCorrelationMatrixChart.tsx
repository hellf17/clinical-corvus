'use client'

import React, { useState, useMemo, useRef } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/Card'
import { calculatePearsonCorrelation } from '@/utils/statistics'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { Button } from '@/components/ui/Button'
import { Exam } from '@/store/patientStore'
import { cn } from '@/lib/utils'
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
  Info
} from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type Parameter = {
  id: string
  name: string
  data: { date: Date; value: number }[]
}

interface EnhancedCorrelationMatrixChartProps {
  exams: Exam[]
  title?: string
  onCellClick?: (param1: string, param2: string, correlation: number | null) => void
}

export function EnhancedCorrelationMatrixChart({ 
  exams, 
  title = 'Matriz de Correlação',
  onCellClick 
}: EnhancedCorrelationMatrixChartProps) {
  const [timeframe, setTimeframe] = useState<'all' | '30' | '90' | '180'>('all')
 const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Extrair todos os parâmetros numéricos com pelo menos 2 valores
  const parameters = useMemo(() => {
    const paramMap = new Map<string, Parameter>()
    
    exams.forEach(exam => {
      // Ensure exam_timestamp is a string, if it's undefined, this exam might be skipped or handled
      const timestamp = exam.exam_timestamp;
      if (!timestamp) return; // Skip exam if no timestamp
      const date = new Date(timestamp);
      
      // Apply date range filter
      if (dateRange.from || dateRange.to) {
        if ((dateRange.from && date < dateRange.from) || (dateRange.to && date > dateRange.to)) {
          return; // Skip this exam
        }
      }
      
      (exam.lab_results || []).forEach(result => {
        if (result.value_numeric === null || result.value_numeric === undefined) {
          return
        }
        
        const value = result.value_numeric
        const paramId = `${result.test_name}`
        const paramName = `${result.test_name} (${result.unit || '-'})`
        
        if (!paramMap.has(paramId)) {
          paramMap.set(paramId, {
            id: paramId,
            name: paramName,
            data: []
          })
        }
        
        paramMap.get(paramId)?.data.push({ date, value })
      })
    })
    
    // Filtrar parâmetros que têm pelo menos 2 valores
    return Array.from(paramMap.values())
      .filter(param => param.data.length >= 2)
      .map(param => {
        // Ordenar dados por data
        param.data.sort((a, b) => a.date.getTime() - b.date.getTime())
        return param
      })
  }, [exams, dateRange])
  
  // Filtrar dados pelo timeframe selecionado
  const filteredParameters = useMemo(() => {
    if (timeframe === 'all') return parameters
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeframe))
    
    return parameters.map(param => ({
      ...param,
      data: param.data.filter(item => item.date >= cutoffDate)
    })).filter(param => param.data.length >= 2)
  }, [parameters, timeframe])
  
  // Calcular a matriz de correlação
  const correlationMatrix = useMemo(() => {
    const matrix: { [key: string]: { [key: string]: number | null } } = {}
    
    // Inicializar matriz vazia
    filteredParameters.forEach(param1 => {
      matrix[param1.id] = {}
      
      filteredParameters.forEach(param2 => {
        matrix[param1.id][param2.id] = null
      })
    })
    
    // Calcular correlações
    filteredParameters.forEach(param1 => {
      filteredParameters.forEach(param2 => {
        // Na diagonal (mesmos parâmetros), a correlação é 1
        if (param1.id === param2.id) {
          matrix[param1.id][param2.id] = 1
          return
        }
        
        // Se já calculamos a correlação inversa, reutilizamos
        if (matrix[param2.id][param1.id] !== null) {
          matrix[param1.id][param2.id] = matrix[param2.id][param1.id]
          return
        }
        
        // Extrair os valores que possuem datas correspondentes
        const dates1 = param1.data.map(d => d.date.getTime())
        const dates2 = param2.data.map(d => d.date.getTime())
        
        // Encontrar datas em comum
        const commonDates = dates1.filter(date => dates2.includes(date))
        
        // Se temos menos de 2 datas em comum, não podemos calcular a correlação
        if (commonDates.length < 2) {
          matrix[param1.id][param2.id] = null
          return
        }
        
        // Extrair valores para as datas em comum
        const values1: number[] = []
        const values2: number[] = []
        
        commonDates.forEach(date => {
          const value1 = param1.data.find(d => d.date.getTime() === date)?.value
          const value2 = param2.data.find(d => d.date.getTime() === date)?.value
          
          if (value1 !== undefined && value2 !== undefined) {
            values1.push(value1)
            values2.push(value2)
          }
        })
        
        // Calcular correlação
        matrix[param1.id][param2.id] = calculatePearsonCorrelation(values1, values2)
      })
    })
    
    return matrix
  }, [filteredParameters])
  
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
        pdf.save(`correlation-matrix-${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `correlation-matrix-${new Date().toISOString().split('T')[0]}.png`;
        link.click();
      }
    } catch (error) {
      console.error('Error exporting chart:', error);
    }
  };
  
  // Get color based on correlation value
  const getCorrelationColor = (correlation: number | null) => {
    if (correlation === null) return 'bg-muted/50';
    
    const absCorr = Math.abs(correlation);
    
    if (correlation > 0) {
      // Positive correlations
      if (absCorr >= 0.9) return 'bg-green-200';
      if (absCorr >= 0.7) return 'bg-green-100';
      if (absCorr >= 0.5) return 'bg-green-50';
      if (absCorr >= 0.3) return 'bg-blue-50';
      return 'bg-muted/50';
    } else {
      // Negative correlations
      if (absCorr >= 0.9) return 'bg-red-200';
      if (absCorr >= 0.7) return 'bg-red-100';
      return 'bg-muted/50';
    }
  };
  
  // Get clinical interpretation of correlation
  const getCorrelationInterpretation = (correlation: number | null) => {
    if (correlation === null) return 'Sem dados suficientes';
    
    const absCorr = Math.abs(correlation);
    
    if (correlation > 0) {
      if (absCorr >= 0.9) return 'Correlação positiva muito forte';
      if (absCorr >= 0.7) return 'Correlação positiva forte';
      if (absCorr >= 0.5) return 'Correlação positiva moderada';
      if (absCorr >= 0.3) return 'Correlação positiva fraca';
      return 'Correlação positiva muito fraca';
    } else {
      if (absCorr >= 0.9) return 'Correlação negativa muito forte';
      if (absCorr >= 0.7) return 'Correlação negativa forte';
      if (absCorr >= 0.5) return 'Correlação negativa moderada';
      if (absCorr >= 0.3) return 'Correlação negativa fraca';
      return 'Correlação negativa muito fraca';
    }
  };
  
  if (parameters.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Correlação entre resultados de exames
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Não há dados suficientes para gerar uma matriz de correlação.
            São necessários pelo menos 2 parâmetros com múltiplos valores cada.
          </p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Correlação entre resultados de exames
            </CardDescription>
          </div>
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
            
            <div className="w-full sm:w-auto">
              <Select
                value={timeframe}
                onValueChange={(value: string) => setTimeframe(value as 'all' | '30' | '90' | '180')}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os dados</SelectItem>
                  <SelectItem value="180">Últimos 180 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
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
        {filteredParameters.length < 2 ? (
          <p className="text-center text-muted-foreground py-8">
            Não há dados suficientes no período selecionado.
            Selecione um período maior.
          </p>
        ) : (
          <div ref={chartRef} className="overflow-x-auto relative">
            <TooltipProvider>
              <table className="w-full border-collapse border border-border text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className="p-1 sm:p-2 border border-border bg-muted text-muted-foreground font-medium text-left sticky left-0 z-10">Parâmetro</th>
                    {filteredParameters.map(param => (
                      <th key={param.id} className="p-1 sm:p-2 border border-border bg-muted text-muted-foreground font-medium align-bottom h-[100px] sm:h-[120px]">
                        <div className="transform rotate-[-60deg] origin-bottom-left whitespace-nowrap absolute bottom-1 sm:bottom-2">
                          {param.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredParameters.map(param1 => (
                    <tr key={param1.id}>
                      <th className="p-1 sm:p-2 border border-border bg-muted text-muted-foreground font-medium text-left sticky left-0 z-10">
                        {param1.name}
                      </th>
                      {filteredParameters.map(param2 => {
                        const correlation = correlationMatrix[param1.id]?.[param2.id];
                        return (
                          <TooltipProvider key={param2.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "flex h-16 w-16 cursor-pointer items-center justify-center rounded border text-center text-xs font-medium",
                                    getCorrelationColor(correlation)
                                  )}
                                  onClick={() => onCellClick && onCellClick(param1.id, param2.id, correlation)}
                                >
                                  {correlation !== null ? correlation.toFixed(2) : '-'}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-medium">Correlação entre:</p>
                                  <p>{param1.name}</p>
                                  <p className="font-medium">e</p>
                                  <p>{param2.name}</p>
                                  <p className="mt-2 font-semibold">{getCorrelationInterpretation(correlation)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Valor: {correlation !== null ? correlation.toFixed(2) : 'N/A'}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TooltipProvider>
            <div className="mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4" />
                <p className="font-semibold">Interpretação Clínica:</p>
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <span className="inline-block w-4 h-4 bg-green-200 mr-1"></span>
                  <span className="mr-2">0.9 a 1.0:</span>
                  <span>Correlação positiva muito forte - indicam possível relação fisiológica direta</span>
                </li>
                <li>
                  <span className="inline-block w-4 h-4 bg-green-100 mr-1"></span>
                  <span className="mr-2">0.7 a 0.9:</span>
                  <span>Correlação positiva forte - podem estar clinicamente relacionados</span>
                </li>
                <li>
                  <span className="inline-block w-4 h-4 bg-green-50 mr-1"></span>
                  <span className="mr-2">0.5 a 0.7:</span>
                  <span>Correlação positiva moderada - relação clínica possível</span>
                </li>
                <li>
                  <span className="inline-block w-4 h-4 bg-blue-50 mr-1"></span>
                  <span className="mr-2">0.3 a 0.5:</span>
                  <span>Correlação positiva fraca - relação clínica duvidosa</span>
                </li>
                <li>
                  <span className="inline-block w-4 h-4 bg-red-200 mr-1"></span>
                  <span className="mr-2">-1.0 a -0.9:</span>
                  <span>Correlação negativa muito forte - indicam possível relação fisiológica inversa</span>
                </li>
                <li>
                  <span className="inline-block w-4 h-4 bg-red-100 mr-1"></span>
                  <span className="mr-2">-0.9 a -0.7:</span>
                  <span>Correlação negativa forte - podem estar clinicamente relacionados inversamente</span>
                </li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                <span className="font-semibold">Nota:</span> Correlação não implica causalidade. 
                Fatores como tratamento, condições subjacentes e variabilidade individual podem influenciar os resultados.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}