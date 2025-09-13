'use client';

import React from 'react';
import { GroupWithCounts } from '@/types/group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Users, Calendar, ChevronRight, UserCheck, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GroupCardProps {
  group: GroupWithCounts;
  isSelected?: boolean;
  onSelect?: (groupId: string) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, isSelected = false, onSelect }) => {
  const utilizationRate = {
    doctors: group.max_members ? Math.round(((group.member_count || 0) / group.max_members) * 100) : null,
    patients: group.max_patients ? Math.round(((group.patient_count || 0) / group.max_patients) * 100) : null
  };

  return (
    <Card
      className={`group transition-all duration-300 cursor-pointer h-full overflow-hidden ${
        isSelected
          ? 'shadow-2xl border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 ring-2 ring-blue-500 ring-opacity-30'
          : 'hover:shadow-xl hover:scale-[1.02] shadow-lg border-0 bg-gradient-to-br from-white via-gray-50 to-blue-50/30 backdrop-blur-sm hover:ring-2 hover:ring-gray-300/50'
      }`}
      onClick={() => onSelect && onSelect(group.id.toString())}
    >
      {/* Header Section with Enhanced Gradient */}
      <CardHeader className={`pb-4 relative overflow-hidden ${
        isSelected
          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'
          : 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 group-hover:from-blue-700 group-hover:via-indigo-700 group-hover:to-purple-700'
      }`}>
        <div className="absolute inset-0 bg-black/10"></div>
        <CardTitle className="relative flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2 text-white drop-shadow-md">
              {group.name}
            </h3>
            {group.description && (
              <p className="text-sm line-clamp-2 text-white/90 leading-relaxed">
                {group.description}
              </p>
            )}
          </div>
          {isSelected && (
            <div className="flex-shrink-0 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ml-3 ring-2 ring-white/30">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6 relative">
        {/* Enhanced Stats Section */}
        <div className="grid grid-cols-2 gap-4">
          {/* Doctors Card */}
          <div className={`relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${
            isSelected
              ? 'bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 border-2 border-blue-200/50 shadow-lg'
              : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30 border border-gray-200 hover:border-blue-300 hover:shadow-md group-hover:bg-gradient-to-br group-hover:from-blue-50 group-hover:via-white group-hover:to-indigo-50'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent"></div>
            <div className="relative flex items-center">
              <div className={`p-2 rounded-lg ${
                isSelected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
              } transition-all duration-300`}>
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${
                  isSelected ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'
                }`}>
                  Médicos
                </p>
                <div className="flex items-baseline space-x-1">
                  <p className={`text-2xl font-black ${
                    isSelected ? 'text-blue-800' : 'text-gray-900 group-hover:text-blue-800'
                  }`}>
                    {group.member_count || 0}
                  </p>
                  {group.max_members && (
                    <p className="text-sm text-gray-500">
                      /{group.max_members}
                    </p>
                  )}
                </div>
                {utilizationRate.doctors && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Ocupação</span>
                      <span className="text-xs font-semibold text-blue-600">{utilizationRate.doctors}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${utilizationRate.doctors}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Patients Card */}
          <div className={`relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${
            isSelected
              ? 'bg-gradient-to-br from-emerald-100 via-green-50 to-teal-100 border-2 border-emerald-200/50 shadow-lg'
              : 'bg-gradient-to-br from-gray-50 via-white to-green-50/30 border border-gray-200 hover:border-green-300 hover:shadow-md group-hover:bg-gradient-to-br group-hover:from-emerald-50 group-hover:via-white group-hover:to-green-50'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent"></div>
            <div className="relative flex items-center">
              <div className={`p-2 rounded-lg ${
                isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
              } transition-all duration-300`}>
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${
                  isSelected ? 'text-emerald-600' : 'text-gray-500 group-hover:text-emerald-600'
                }`}>
                  Pacientes
                </p>
                <div className="flex items-baseline space-x-1">
                  <p className={`text-2xl font-black ${
                    isSelected ? 'text-emerald-800' : 'text-gray-900 group-hover:text-emerald-800'
                  }`}>
                    {group.patient_count || 0}
                  </p>
                  {group.max_patients && (
                    <p className="text-sm text-gray-500">
                      /{group.max_patients}
                    </p>
                  )}
                </div>
                {utilizationRate.patients && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Ocupação</span>
                      <span className="text-xs font-semibold text-emerald-600">{utilizationRate.patients}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${utilizationRate.patients}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Group Info */}
        <div className={`rounded-xl p-4 border-t ${
          isSelected
            ? 'bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 border-purple-200/30'
            : 'bg-gradient-to-r from-gray-50 via-white to-gray-50 border-gray-200 group-hover:from-purple-50 group-hover:via-pink-50 group-hover:to-blue-50'
        }`}>
          <div className={`flex items-center text-sm ${
            isSelected ? 'text-purple-700' : 'text-gray-600 group-hover:text-purple-700'
          }`}>
            <Calendar className="h-4 w-4 mr-3" />
            <span className="font-medium">
              Criado em {format(new Date(group.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </span>
          </div>
          
          {/* Limits Display */}
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className={`text-center py-2 px-3 rounded-lg border ${
              isSelected
                ? 'bg-blue-100 border-blue-200 text-blue-700'
                : 'bg-gray-100 border-gray-200 text-gray-600 group-hover:bg-blue-100 group-hover:border-blue-200 group-hover:text-blue-700'
            }`}>
              <p className="text-xs font-semibold">Limite Médicos</p>
              <p className="font-bold">{group.max_members || '∞'}</p>
            </div>
            <div className={`text-center py-2 px-3 rounded-lg border ${
              isSelected
                ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                : 'bg-gray-100 border-gray-200 text-gray-600 group-hover:bg-emerald-100 group-hover:border-emerald-200 group-hover:text-emerald-700'
            }`}>
              <p className="text-xs font-semibold">Limite Pacientes</p>
              <p className="font-bold">{group.max_patients || '∞'}</p>
            </div>
          </div>
        </div>
        
        {/* Enhanced Action Button */}
        <div className="pt-4">
          <Button
            asChild
            variant={isSelected ? "default" : "outline"}
            size="lg"
            className={`w-full justify-center font-semibold transition-all duration-300 ${
              isSelected
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl"
                : "border-2 border-gray-300 hover:border-transparent hover:bg-gradient-to-r hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 hover:text-white hover:shadow-lg"
            }`}
          >
            <Link href={`/dashboard-doctor/groups/${group.id}`} className="flex items-center">
              Ver Detalhes Completos
              <ChevronRight className="h-5 w-5 ml-2" />
            </Link>
          </Button>
        </div>
        
        {/* Enhanced Selection Indicator */}
        {isSelected && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 rounded-xl border-2 border-blue-200/50">
            <div className="flex items-center justify-center">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              </div>
              <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700">
                ✓ Grupo Ativo - Pronto para gerenciamento
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};