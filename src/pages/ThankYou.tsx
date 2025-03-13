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
      
      // Ensure questionsWithAnswers exists before attempting to map it
      if (!quizData.results || !quizData.results.questionsWithAnswers) {
        throw new Error('Quiz results data is incomplete');
      }

      // Log the raw quiz data for debugging
      console.log('Raw quiz data:', quizData.results);
      
      const pdfData = {
        userName,
        courseName: quizData.results.courseName || 'Quiz Results',
        modules: quizData.results.modules || [],
        results: {
          [quizData.results.moduleId || 'module1']: {
            moduleId: quizData.results.moduleId || 'module1',
            totalQuestions: quizData.results.totalQuestions || 0,
            correctAnswers: quizData.results.correctAnswers || 0,
            incorrectAnswers: (quizData.results.totalQuestions || 0) - (quizData.results.correctAnswers || 0),
            questionsWithAnswers: Array.isArray(quizData.results.questionsWithAnswers) 
              ? quizData.results.questionsWithAnswers.map((qa: any) => {
                  if (!qa || !qa.question) {
                    return {
                      question: {
                        text: 'Unknown question',
                        correctOptionId: 'correct',
                        options: [{ id: 'correct', text: 'Unknown' }]
                      },
                      selectedOptionId: 'unknown',
                      isCorrect: false
                    };
                  }

                  // Parse question text if it's a JSON string
                  let questionText = qa.question.text;
                  try {
                    if (typeof questionText === 'string' && questionText.startsWith('{')) {
                      const parsed = JSON.parse(questionText);
                      questionText = parsed.text || questionText;
                    }
                  } catch (e) {
                    console.log('Error parsing question text:', e);
                    questionText = String(questionText || 'Question text unavailable');
                  }

                  // Parse and format options
                  const options = qa.question.options.map((opt: any) => {
                    let optionText = opt.text;
                    try {
                      if (typeof optionText === 'string' && optionText.startsWith('{')) {
                        const parsed = JSON.parse(optionText);
                        optionText = parsed.text || optionText;
                      }
                    } catch (e) {
                      console.log('Error parsing option text:', e);
                      optionText = String(optionText || 'Option text unavailable');
                    }
                    return {
                      id: opt.id,
                      text: optionText
                    };
                  });

                  // Log the processed question data
                  console.log('Processed question:', {
                    text: questionText,
                    options: options,
                    correctOptionId: qa.question.correctOptionId,
                    selectedOptionId: qa.selectedOptionId
                  });

                  return {
                    question: {
                      text: questionText,
                      correctOptionId: qa.question.correctOptionId,
                      options: options
                    },
                    selectedOptionId: qa.selectedOptionId,
                    isCorrect: qa.isCorrect
                  };
                })
              : []
          }
        }
      };

      // Log the final PDF data structure
      console.log('Final PDF data structure:', pdfData);

      const result = await generatePDF(pdfData);
      
      // If result is a data URL (fallback for some browsers), create a download link
      if (result !== 'success') {
        const link = document.createElement('a');
        link.href = result;
        link.download = `${userName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_quiz_results.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
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

  const score = quizData.results && 
    typeof quizData.results.correctAnswers === 'number' && 
    typeof quizData.results.totalQuestions === 'number' && 
    quizData.results.totalQuestions > 0 
      ? Math.round((quizData.results.correctAnswers / quizData.results.totalQuestions) * 100) 
      : 0;

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