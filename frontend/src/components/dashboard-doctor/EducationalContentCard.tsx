import { Card } from "@/components/ui/Card";
import { GraduationCap, BookOpen, Clock, Trophy, Search, Heart, Brain } from "lucide-react";

interface EducationalContentCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  examples: {
    title: string;
    description: string;
    icon: React.ReactNode;
  }[];
}

export default function EducationalContentCard({
  title,
  description,
  icon,
  link,
  examples,
}: EducationalContentCardProps) {

  return (
    <Card
      className="border rounded-lg p-4 sm:p-6 cursor-pointer transition-all duration-200 h-full hover:shadow-lg hover:border-blue-500 hover:scale-[1.02]"
      onClick={() => window.location.href = link}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && (window.location.href = link)}
    >
      <div className="flex items-start">
        <div className="p-2 bg-purple-100 rounded-lg mr-3">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-base sm:text-lg text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1 mb-3">
            {description}
          </p>
        </div>
      </div>
      
      {/* Examples Section */}
      <div className="space-y-3 mb-4">
        {examples.map((example, index) => (
          <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                {example.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-purple-800">
                  {example.title}
                </p>
                <p className="text-xs text-purple-600 mt-1 leading-relaxed">
                  {example.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="text-purple-600 font-medium">Explorar {title} →</span>
        </div>
      </div>
    </Card>
  );
}