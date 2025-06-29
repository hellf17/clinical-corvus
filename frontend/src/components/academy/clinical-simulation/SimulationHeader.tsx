import { Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SimulationHeaderProps {
  title: string;
  description: string;
  showReset?: boolean;
  onReset?: () => void;
}

export function SimulationHeader({ title, description, showReset = false, onReset }: SimulationHeaderProps) {
  return (
    <section className="relative text-center py-10 academy-gradient-header rounded-xl border border-primary/20 shadow-lg">
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center justify-center mb-4">
          <Users className="h-12 w-12 md:h-16 md:w-16 mr-4 text-white" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            {title}
          </h1>
        </div>
        <p className="mt-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>
      </div>
      {showReset && (
        <Button 
          onClick={onReset}
          variant="outline" 
          className="absolute top-4 right-4 bg-white/10 text-white hover:bg-white/20 border-white/30"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reiniciar Simulação
        </Button>
      )}
    </section>
  );
}
