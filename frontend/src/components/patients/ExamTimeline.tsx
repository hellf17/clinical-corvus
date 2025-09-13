'use client';

import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileTextIcon, CalendarIcon, ClockIcon } from 'lucide-react';

interface Exam {
  exam_id: number;
  patient_id: number;
  user_id: number;
  exam_timestamp: string;
  upload_timestamp: string;
  exam_type: string | null;
  source_file_name: string | null;
  source_file_path: string | null;
  processing_status: 'pending' | 'processing' | 'processed' | 'error';
  processing_log: string | null;
  created_at: string;
  updated_at: string;
  lab_results: any[];
}

interface ExamTimelineProps {
  exams: Exam[];
}

export function ExamTimeline({ exams }: ExamTimelineProps) {
  // Sort exams by exam_timestamp in descending order (newest first)
  const sortedExams = [...exams].sort(
    (a, b) => new Date(b.exam_timestamp).getTime() - new Date(a.exam_timestamp).getTime()
  );

  return (
    <div className="flow-root">
      <ul className="relative border-l border-gray-200 dark:border-gray-700">
        {sortedExams.map((exam, index) => (
          <li key={exam.exam_id} className="mb-10 ml-6">
            <div className="absolute -left-3 mt-1.5 flex items-center justify-center rounded-full bg-blue-100 p-1 ring-8 ring-white dark:bg-blue-900 dark:ring-gray-900">
              <FileTextIcon className="h-4 w-4 text-blue-800 dark:text-blue-300" />
            </div>
            <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {exam.exam_type || 'Exame Laboratorial'}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  exam.processing_status === 'processed' 
                    ? 'bg-green-100 text-green-800' 
                    : exam.processing_status === 'error' 
                      ? 'bg-red-100 text-red-800' 
                      : exam.processing_status === 'processing' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-gray-100 text-gray-800'
                }`}>
                  {exam.processing_status === 'processed' && 'Processado'}
                  {exam.processing_status === 'error' && 'Erro'}
                  {exam.processing_status === 'processing' && 'Processando'}
                  {exam.processing_status === 'pending' && 'Pendente'}
                </span>
              </div>
              <time className="mb-2 flex items-center text-sm font-normal text-gray-500 dark:text-gray-400">
                <CalendarIcon className="mr-1 h-4 w-4" />
                {format(new Date(exam.exam_timestamp), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </time>
              <time className="mb-2 flex items-center text-sm font-normal text-gray-500 dark:text-gray-400">
                <ClockIcon className="mr-1 h-4 w-4" />
                Enviado em {format(new Date(exam.upload_timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </time>
              {exam.source_file_name && (
                <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <FileTextIcon className="mr-1 h-4 w-4" />
                  <span className="truncate">{exam.source_file_name}</span>
                </div>
              )}
              {exam.lab_results && exam.lab_results.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Resultados: {exam.lab_results.length} itens
                  </p>
                </div>
              )}
              {exam.processing_log && (
                <div className="mt-3 rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {exam.processing_log}
                  </p>
                </div>
              )}
            </div>
          </li>
        ))}
        {sortedExams.length === 0 && (
          <li className="ml-6">
            <div className="rounded-lg bg-white p-4 text-center shadow dark:bg-gray-800">
              <FileTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                Nenhum exame encontrado
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Não há exames registrados para este paciente.
              </p>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}