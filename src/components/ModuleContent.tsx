import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Module } from '@/types/quiz';

interface ModuleContentProps {
  module: Module;
  moduleNumber: number;
  totalModules: number;
  onStartQuiz: () => void;
}

export default function ModuleContent({ module, moduleNumber, totalModules, onStartQuiz }: ModuleContentProps) {
  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">{module.title}</h1>
        <p className="text-sm text-muted-foreground">
          Module {moduleNumber + 1} of {totalModules}
        </p>
      </div>

      <Card className="p-6">
        <div className="prose dark:prose-invert max-w-none">
          {module.content.split('\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onStartQuiz} size="lg">
          Start Quiz
        </Button>
      </div>
    </div>
  );
}
