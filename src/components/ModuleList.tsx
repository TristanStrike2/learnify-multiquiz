import { Module, QuizResult } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle } from 'lucide-react';

interface ModuleListProps {
  modules: Module[];
  currentModuleIndex: number;
  onModuleSelect: (index: number) => void;
  moduleResults: Record<string, QuizResult>;
  onViewResults: (moduleId: string) => void;
  courseName: string;
}

export default function ModuleList({
  modules,
  currentModuleIndex,
  onModuleSelect,
  moduleResults,
  onViewResults,
  courseName
}: ModuleListProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{courseName}</h2>
        <p className="text-muted-foreground mt-2">
          Select a module to begin
        </p>
      </div>
      
      <div className="space-y-4">
        {modules.map((module, index) => {
          const isCompleted = moduleResults[module.id];
          const isActive = index === currentModuleIndex;
          const canAccess = index <= currentModuleIndex;
          
          return (
            <div
              key={module.id}
              className={`
                p-4 rounded-lg border
                ${isActive ? 'border-primary' : 'border-border'}
                ${!canAccess ? 'opacity-50' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <h3 className="font-medium">
                    Module {index + 1}
                  </h3>
                </div>
                
                <div className="flex gap-2">
                  {isCompleted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewResults(module.id)}
                    >
                      View Results
                    </Button>
                  )}
                  <Button
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => onModuleSelect(index)}
                    disabled={!canAccess}
                  >
                    {isCompleted ? 'Review' : 'Start'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 