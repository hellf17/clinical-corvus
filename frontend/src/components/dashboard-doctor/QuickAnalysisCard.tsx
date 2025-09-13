import { Card } from "@/components/ui/Card";
import { Microscope, Upload, FileText, BarChart3, CloudUpload } from "lucide-react";
import { useState } from 'react';
import { QuickAnalysisModal } from "./QuickAnalysisModal";

interface QuickAnalysisCardProps {
  onClick: () => void;
}

export default function QuickAnalysisCard({
  onClick
}: QuickAnalysisCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <Card
        className="border rounded-lg p-4 sm:p-6 cursor-pointer transition-all duration-200 h-full hover:shadow-lg hover:border-blue-500 hover:scale-[1.02]"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      >
        <div className="flex items-start">
          <div className="p-2 bg-blue-100 rounded-lg mr-3">
            <Microscope className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base sm:text-lg text-gray-900">Análise Laboratorial Rápida</h3>
            <p className="text-sm text-gray-600 mt-1 mb-3">
              Arraste e solte um arquivo PDF ou clique para fazer upload de exames para análise instantânea.
            </p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="text-blue-600 font-medium">Começar →</span>
          </div>
        </div>
      </Card>

      <QuickAnalysisModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}