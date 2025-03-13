import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle } from 'lucide-react';
import { generatePDF } from '@/lib/pdfGenerator';
import { getSharedQuiz, subscribeToQuizSubmissions } from '@/lib/firebase';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ThankYouPage() {
  const { quizId, userName } = useParams();
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);

  useEffect(() => {
    if (!quizId || !userName) return;

    // Subscribe to quiz submissions to get the user's results
    const unsubscribe = subscribeToQuizSubmissions(quizId, (submissions) => {
      const userSubmission = submissions.find(sub => 
        sub.userName === userName && 
        sub.results // Make sure results exist
      );
      
      if (userSubmission) {
        setQuizData(userSubmission);
      }
    });

    return () => unsubscribe();
  }, [quizId, userName]);

  const handleDownloadPDF = async () => {
    if (!quizId || !userName || !quizData) return;

    try {
      setIsGeneratingPDF(true);
      
      const pdfData = {
        userName,
        courseName: quizData.results.courseName || 'Quiz Results',
        modules: quizData.results.modules || [],
        results: {
          module1: {
            moduleId: 'module1',
            totalQuestions: quizData.results.totalQuestions,
            correctAnswers: quizData.results.correctAnswers,
            incorrectAnswers: quizData.results.totalQuestions - quizData.results.correctAnswers,
            questionsWithAnswers: quizData.results.questionsWithAnswers.map((qa: any) => {
              // Determine if this question was timed out
              const isTimeout = qa.selectedAnswer === 'timeout';
              
              // Create the options array with proper IDs and correct answer marking
              const options = qa.allOptions.map((text: string, i: number) => {
                const isCorrectOption = text === qa.correctAnswer;
                return {
                  id: isCorrectOption ? 'correct' : `wrong${i}`,
                  text: text
                };
              });

              return {
                question: {
                  text: qa.question,
                  correctOptionId: 'correct', // The correct option always has ID 'correct'
                  options: options
                },
                selectedOptionId: isTimeout ? 'timeout' : 
                  (qa.selectedAnswer === qa.correctAnswer ? 'correct' : 
                    `wrong${qa.allOptions.indexOf(qa.selectedAnswer)}`),
                isCorrect: qa.isCorrect,
                isTimeout: isTimeout
              };
            })
          }
        }
      };

      const pdfUrl = await generatePDF(pdfData);
      window.open(pdfUrl, '_blank');
      
      toast({
        title: 'PDF Generated',
        description: 'Your results have been downloaded successfully.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!quizData) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4">
        <div className="text-center">
          <div className="animate-pulse">Loading your results...</div>
        </div>
      </div>
    );
  }

  const score = Math.round((quizData.results.correctAnswers / quizData.results.totalQuestions) * 100);

  return (
    <div className="container max-w-2xl mx-auto py-16 px-4">
      <Card className="shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-3xl font-bold">Thank You!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-xl text-muted-foreground">
              Your quiz has been submitted successfully.
            </p>
            <div className="text-2xl font-semibold">
              Score: {score}%
            </div>
            <p className="text-sm text-muted-foreground">
              {quizData.results.correctAnswers} correct out of {quizData.results.totalQuestions} questions
            </p>
          </div>
          
          <div className="max-w-md mx-auto space-y-4">
            <Button 
              size="lg" 
              className="w-full py-6 text-lg"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
            >
              <Download className="mr-2 h-5 w-5" />
              {isGeneratingPDF ? 'Generating PDF...' : 'Download Your Results'}
            </Button>
            <p className="text-sm text-muted-foreground">
              You can now close this page or download your results PDF.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 