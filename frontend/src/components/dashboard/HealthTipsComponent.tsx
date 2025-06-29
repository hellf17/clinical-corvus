'use client'; // Mark as client component

import React from 'react'; // Removed useState, useEffect as they are no longer needed here
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Lightbulb, AlertCircle } from 'lucide-react'; // Removed Info as it wasn't used
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from "@/components/ui/Alert"; // Removed AlertTitle as it wasn't used
// import { useAuth } from '@clerk/nextjs'; // REMOVED
// import { toast } from 'sonner'; // REMOVED
// import { getHealthTips } from '@/services/healthTipService.client'; // REMOVED
import type { HealthTip } from '@/types/healthTip';

interface HealthTipsComponentProps { // Define props interface
  tips: HealthTip[];
  isLoading: boolean;
  error?: string | null; // Optional error prop from parent
}

export default function HealthTipsComponent({ tips, isLoading, error }: HealthTipsComponentProps) {
  // Internal state and useEffect for fetching data are removed.
  // The component now relies on props passed from the parent (DashboardPage).

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />
          Dicas de Saúde
        </CardTitle>
      </CardHeader>
      <CardContent>
         {isLoading ? (
            <div className="flex justify-center items-center h-20">
                <Spinner size="sm" />
            </div>
        ) : error ? (
             <Alert className="text-destructive border-destructive dark:border-destructive [&>svg]:text-destructive text-xs">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        ) : tips.length > 0 ? (
             <ul className="space-y-2 list-disc list-inside pl-4">
                 {tips.map((tip) => (
                    <li key={tip.tip_id} className="text-sm text-muted-foreground">
                      {tip.text}
                    </li>
                ))}
            </ul>
        ) : (
             <p className="text-sm text-muted-foreground text-center">Nenhuma dica disponível no momento.</p>
        )}
      </CardContent>
    </Card>
  );
} 