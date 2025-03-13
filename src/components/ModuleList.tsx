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
  const module = modules[0]; // We only have one module now
  const isCompleted = moduleResults[module.id];
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{courseName}</h2>
        <p className="text-muted-foreground mt-2">
          Start your quiz when you're ready
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="p-6 rounded-lg border border-primary bg-card">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <h3 className="font-medium text-lg">
                  {module.title}
                </h3>
              </div>
              
              <div className="flex gap-2">
                {isCompleted && (
                  <Button
                    variant="outline"
                    onClick={() => onViewResults(module.id)}
                  >
                    View Results
                  </Button>
                )}
                <Button
                  variant="default"
                  onClick={() => onModuleSelect(0)}
                  className="min-w-[100px]"
                >
                  {isCompleted ? 'Review' : 'Start Quiz'}
                </Button>
              </div>
            </div>
            
            <div className="text-muted-foreground">
              <p>30 multiple-choice questions</p>
              {isCompleted && (
                <p className="mt-1">
                  Score: {Math.round((moduleResults[module.id].correctAnswers / moduleResults[module.id].totalQuestions) * 100)}%
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 