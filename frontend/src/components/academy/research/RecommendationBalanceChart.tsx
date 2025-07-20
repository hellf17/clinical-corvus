import React from 'react';
import { CheckCircle, XCircle, Activity, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface RecommendationBalance {
  positive_factors: string[];
  negative_factors: string[];
  overall_balance: string;
  reasoning_tags: string[];
}

interface RecommendationBalanceChartProps {
  balance: RecommendationBalance;
}

export const RecommendationBalanceChart: React.FC<RecommendationBalanceChartProps> = ({ balance }) => {
  const positiveCount = balance.positive_factors.length;
  const negativeCount = balance.negative_factors.length;
  const totalFactors = positiveCount + negativeCount;

  if (totalFactors === 0) {
    return null; // Don't render if there are no factors
  }

  const positivePercentage = (positiveCount / totalFactors) * 100;
  const negativePercentage = (negativeCount / totalFactors) * 100;

  return (
    <div className="w-full my-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold text-green-800 flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Balanço da Recomendação
        </h4>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-green-700">
            {totalFactors} fator(es) avaliado(s)
          </span>
        </div>
      </div>
      
      <div className="flex w-full h-4 rounded-full overflow-hidden bg-red-200 border border-gray-300 shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 shadow-sm"
          style={{ width: `${positivePercentage}%` }}
          title={`${positiveCount} Fator(es) a favor`}
        />
        <div
          className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500 shadow-sm"
          style={{ width: `${negativePercentage}%` }}
          title={`${negativeCount} Fator(es) contra`}
        />
      </div>
      
      <div className="flex justify-between text-sm mt-3 text-gray-700">
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
          <span className="font-medium">{positiveCount} a favor</span>
        </div>
        <div className="flex items-center">
          <XCircle className="h-4 w-4 mr-2 text-red-600" />
          <span className="font-medium">{negativeCount} contra</span>
        </div>
      </div>
      
      <p className="text-sm text-gray-700 mt-3 p-3 bg-gradient-to-r from-gray-50 to-green-50 rounded-lg border border-gray-200 leading-relaxed">
        {balance.overall_balance}
      </p>

      {balance.reasoning_tags && balance.reasoning_tags.length > 0 && (
        <div className="mt-4 pt-3 border-t border-green-200">
          <div className="flex items-center mb-3">
            <Zap className="h-4 w-4 mr-2 text-green-600" />
            <h5 className="text-sm font-semibold text-green-700">Fatores Chave</h5>
          </div>
          <div className="flex flex-wrap gap-2">
            {balance.reasoning_tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200 hover:bg-green-200 transition-colors">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
