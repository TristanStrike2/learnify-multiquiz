import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { submitQuizResults } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { QuizResult, Module } from '@/types/quiz';
import { generatePDF } from '@/lib/pdfGenerator';
import { Download } from 'lucide-react';

interface QuizResultsProps {
  result: QuizResult;
  onReset: () => void;
  modules: Module[];
  allResults: Record<string, QuizResult>;
  userName: string;
}

export default function QuizResults({
  result,
  onReset,
  modules,
  allResults,
  userName
}: QuizResultsProps) {
  const { quizId } = useParams();
  const { toast } = useToast();

  useEffect(() => {
    if (quizId && userName) {
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
  }, [quizId, userName, allResults, toast]);

  const handleDownloadPDF = () => {
    const pdfData = {
      userName,
      courseName: modules[0]?.title || 'Quiz Results',
      modules,
      results: allResults
    };
    generatePDF(pdfData);
  };

  const score = Math.round((result.correctAnswers / result.totalQuestions) * 100);
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Quiz Complete!</h2>
        <p className="text-xl">Well done, {userName}!</p>
        <div className="text-lg space-y-2">
          <p>You answered {result.correctAnswers} out of {result.totalQuestions} questions correctly.</p>
          <p className={`text-3xl font-bold ${scoreColor}`}>
            Score: {score}%
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button onClick={onReset} size="lg">
          Take Another Quiz
        </Button>
        <Button onClick={handleDownloadPDF} variant="outline" size="lg">
          <Download className="mr-2 h-4 w-4" />
          Download Results
        </Button>
      </div>
    </div>
  );
}
