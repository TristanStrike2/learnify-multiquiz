import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { submitQuizResults } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { QuizResult, Module } from '@/types/quiz';
import { generatePDF } from '@/lib/pdfGenerator';

interface QuizResultsProps {
  result: QuizResult;
  onReset: () => void;
  onNextModule: () => void;
  hasNextModule: boolean;
  modules: Module[];
  allResults: Record<string, QuizResult>;
  isAllModulesCompleted: boolean;
  userName: string;
}

export default function QuizResults({
  result,
  onReset,
  onNextModule,
  hasNextModule,
  modules,
  allResults,
  isAllModulesCompleted,
  userName
}: QuizResultsProps) {
  const { quizId } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    // Only submit results when all modules are completed
    if (isAllModulesCompleted && quizId && userName) {
      submitQuizResults(quizId, userName, allResults)
        .then(() => {
          toast({
            title: 'Results Submitted',
            description: 'Your quiz results have been saved.',
          });
        })
        .catch((error) => {
          console.error('Failed to submit results:', error);
          toast({
            title: 'Submission Failed',
            description: 'Failed to save your quiz results. Please try again.',
            variant: 'destructive',
          });
        });
    }
  }, [isAllModulesCompleted, quizId, userName, allResults, toast]);

  const handleDownloadPDF = () => {
    const pdfData = {
      userName,
      courseName: modules[0]?.title || 'Quiz Results',
      modules,
      results: allResults
    };
    generatePDF(pdfData);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Quiz Results</h2>
        <p className="text-xl">Great work, {userName}!</p>
        <div className="text-lg">
          <p>You got {result.correctAnswers} out of {result.totalQuestions} questions correct!</p>
          <p className="text-2xl font-bold mt-2">
            Score: {Math.round((result.correctAnswers / result.totalQuestions) * 100)}%
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        {hasNextModule ? (
          <Button onClick={onNextModule} size="lg">
            Next Module
          </Button>
        ) : (
          <Button onClick={onReset} size="lg">
            Start Over
          </Button>
        )}
        {isAllModulesCompleted && (
          <Button onClick={handleDownloadPDF} variant="outline" size="lg">
            Download Results
          </Button>
        )}
      </div>
    </div>
  );
}
