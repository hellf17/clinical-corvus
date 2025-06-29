'use client'

import React, { useState, useMemo, useEffect } from 'react'
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
import { Exam } from '@/store/patientStore'
import { cn } from '@/lib/utils'

type Parameter = {
  id: string
  name: string
  data: { date: Date; value: number }[]
}

interface CorrelationMatrixChartProps {
  exams: Exam[]
}

export function CorrelationMatrixChart({ exams }: CorrelationMatrixChartProps) {
  const [timeframe, setTimeframe] = useState<'all' | '30' | '90' | '180'>('all')
  
  // Extrair todos os parâmetros numéricos com pelo menos 2 valores
  const parameters = useMemo(() => {
    const paramMap = new Map<string, Parameter>()
    
    exams.forEach(exam => {
      // Ensure exam_timestamp is a string, if it's undefined, this exam might be skipped or handled
      const timestamp = exam.exam_timestamp;
      if (!timestamp) return; // Skip exam if no timestamp
      const date = new globalThis.Date(timestamp);
      
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
  }, [exams])
  
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

  if (parameters.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Correlação</CardTitle>
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
            <CardTitle>Matriz de Correlação</CardTitle>
            <CardDescription>
              Correlação entre resultados de exames
            </CardDescription>
          </div>
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
        </div>
      </CardHeader>
      <CardContent>
        {filteredParameters.length < 2 ? (
          <p className="text-center text-muted-foreground py-8">
            Não há dados suficientes no período selecionado.
            Selecione um período maior.
          </p>
        ) : (
          <div className="overflow-x-auto relative">
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
                                    "flex h-16 w-16 cursor-default items-center justify-center rounded border text-center text-xs font-medium",
                                    "bg-muted/50" // Default background
                                  )}
                                >
                                  {correlation !== null ? correlation.toFixed(2) : '-'}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Correlação entre {param1.name} e {param2.name}</p>
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
              <p className="font-semibold mb-1">Interpretação:</p>
              <ul className="list-disc list-inside">
                <li>
                  <span className="inline-block w-4 h-4 bg-green-200 mr-1"></span>
                  <span className="mr-2">0.9 a 1.0:</span>
                  <span>Correlação positiva muito forte</span>
                </li>
                <li>
                  <span className="inline-block w-4 h-4 bg-green-100 mr-1"></span>
                  <span className="mr-2">0.7 a 0.9:</span>
                  <span>Correlação positiva forte</span>
                </li>
                <li>
                  <span className="inline-block w-4 h-4 bg-green-50 mr-1"></span>
                  <span className="mr-2">0.5 a 0.7:</span>
                  <span>Correlação positiva moderada</span>
                </li>
                <li>
                  <span className="inline-block w-4 h-4 bg-blue-50 mr-1"></span>
                  <span className="mr-2">0.3 a 0.5:</span>
                  <span>Correlação positiva fraca</span>
                </li>
                <li>
                  <span className="inline-block w-4 h-4 bg-red-200 mr-1"></span>
                  <span className="mr-2">-1.0 a -0.9:</span>
                  <span>Correlação negativa muito forte</span>
                </li>
                <li>
                  <span className="inline-block w-4 h-4 bg-red-100 mr-1"></span>
                  <span className="mr-2">-0.9 a -0.7:</span>
                  <span>Correlação negativa forte</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 