import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSharedQuiz, submitQuizResults } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import QuizQuestion from './QuizQuestion';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { generatePDF } from '@/lib/pdfGenerator';
import { SharedQuiz as SharedQuizType } from '@/types/quiz';
import { DocumentData } from 'firebase/firestore';

export function SharedQuiz() {
  const { quizId, courseName } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<SharedQuizType | null>(null);
  const [userName, setUserName] = useState('');
  const [showContent, setShowContent] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [quizComplete, setQuizComplete] = useState(false);

  useEffect(() => {
    async function loadQuiz() {
      if (!quizId) return;
      
      try {
        console.log('Loading quiz with ID:', quizId);
        const quizData = await getSharedQuiz(quizId);
        console.log('Received quiz data:', quizData);
        
        if (quizData) {
          // Validate quiz data structure
          console.log('Quiz data validation:', {
            hasModules: Boolean(quizData.modules),
            moduleCount: quizData.modules?.length,
            firstModuleQuestions: quizData.modules?.[0]?.questions?.length,
            numberOfQuestions: quizData.numberOfQuestions,
            courseName: quizData.courseName
          });

          // Convert Firestore DocumentData to SharedQuizType
          const typedQuizData: SharedQuizType = {
            id: quizId,
            courseName: quizData.courseName,
            modules: quizData.modules,
            createdAt: quizData.createdAt,
            numberOfQuestions: quizData.numberOfQuestions
          };

          setQuiz(typedQuizData);
        } else {
          console.error('Quiz data is null or undefined');
          toast({
            title: 'Quiz Not Found',
            description: 'The quiz you are looking for does not exist.',
            variant: 'destructive',
          });
          navigate('/');
        }
      } catch (error) {
        console.error('Error loading quiz:', error);
        console.error('Error details:', {
          error,
          stack: error instanceof Error ? error.stack : undefined,
          quizId
        });
        toast({
          title: 'Error',
          description: 'Failed to load the quiz. Please try again.',
          variant: 'destructive',
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    }

    loadQuiz();
  }, [quizId, navigate, toast]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name to start the quiz.',
        variant: 'destructive',
      });
      return;
    }
    setShowContent(true);
  };

  const handleStartQuestions = () => {
    if (!quiz || !quiz.modules[0] || !quiz.modules[0].questions) {
      console.error('Invalid quiz data structure:', {
        quiz: Boolean(quiz),
        hasModules: quiz?.modules?.length > 0,
        hasQuestions: quiz?.modules?.[0]?.questions?.length,
        expectedQuestions: quiz?.numberOfQuestions
      });
      toast({
        title: 'Error',
        description: 'Failed to start quiz. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Log quiz structure before validation
    console.log('Quiz structure before starting:', {
      courseName: quiz.courseName,
      moduleCount: quiz.modules.length,
      firstModuleQuestions: quiz.modules[0].questions.length,
      expectedQuestions: quiz.numberOfQuestions,
      questionSample: quiz.modules[0].questions[0]
    });

    // Verify we have the correct number of questions
    if (quiz.modules[0].questions.length !== quiz.numberOfQuestions) {
      console.error('Question count mismatch:', {
        actual: quiz.modules[0].questions.length,
        expected: quiz.numberOfQuestions
      });
      toast({
        title: 'Error',
        description: 'Quiz configuration error. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    // Initialize answers array for all questions
    setAnswers(new Array(quiz.numberOfQuestions).fill(''));
    setCurrentQuestionIndex(0);
    setShowContent(false);
    setShowQuestions(true);
  };

  const handleSelectOption = (optionId: string) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIndex] = optionId;
      return newAnswers;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.modules[0].questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleQuizComplete();
    }
  };

  const handleQuizComplete = async () => {
    setIsSubmitting(true);
    try {
      const result = calculateScore();
      await submitQuizResults(quizId!, userName, result);
      setQuizComplete(true);
      toast({
        title: 'Quiz Completed!',
        description: 'Your results have been submitted successfully.',
      });
      navigate(`/quiz/${courseName}/${quizId}/thank-you/${userName}`);
    } catch (error) {
      console.error('Failed to submit results:', error);
      toast({
        title: 'Submission Failed',
        description: 'Failed to save your quiz results. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateScore = () => {
    if (!quiz || !quiz.modules[0] || !quiz.modules[0].questions) {
      console.error('Invalid quiz data structure:', {
        quiz: Boolean(quiz),
        hasModules: quiz?.modules?.length > 0,
        hasQuestions: quiz?.modules?.[0]?.questions?.length
      });
      return 0;
    }

    const module = quiz.modules[0];
    console.log('Module data:', {
      moduleId: module.id,
      title: module.title,
      questionsCount: module.questions.length
    });

    const questions = module.questions;
    
    // Map through all questions to create detailed results
    const questionsWithAnswers = questions.map((question, index) => {
      const selectedAnswer = answers[index];
      const isTimeout = selectedAnswer === 'timeout';
      const isCorrect = !isTimeout && selectedAnswer === question.correctOptionId;

      // Parse question text if it's a JSON string
      let questionText = question.text;
      try {
        if (typeof questionText === 'string' && questionText.startsWith('{')) {
          const parsed = JSON.parse(questionText);
          questionText = parsed.text || questionText;
        }
      } catch (e) {
        console.log('Error parsing question text:', e);
      }

      // Parse options if they're JSON strings
      const formattedOptions = question.options.map(opt => {
        let optionText = opt.text;
        try {
          if (typeof optionText === 'string' && optionText.startsWith('{')) {
            const parsed = JSON.parse(optionText);
            optionText = parsed.text || optionText;
          }
        } catch (e) {
          console.log('Error parsing option text:', e);
        }
        return {
          id: opt.id,
          text: optionText
        };
      });

      return {
        question: {
          text: questionText,
          correctOptionId: question.correctOptionId,
          options: formattedOptions
        },
        selectedOptionId: selectedAnswer,
        isCorrect: isCorrect,
        isTimeout: isTimeout
      };
    });

    const correctAnswers = questionsWithAnswers.filter(qa => qa.isCorrect).length;
    const totalQuestions = questions.length;

    // Ensure moduleId is set
    const moduleId = module.id || `module_${Date.now()}`;
    console.log('Final quiz results:', {
      moduleId,
      courseName: quiz.courseName,
      totalQuestions,
      correctAnswers,
      questionsCount: questionsWithAnswers.length
    });

    return {
      moduleId,
      courseName: quiz.courseName || 'Quiz Results',
      totalQuestions: totalQuestions,
      correctAnswers: correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
      questionsWithAnswers: questionsWithAnswers,
      modules: quiz.modules
    };
  };

  if (isLoading) {
    return (
      <div className="container max-w-md mx-auto py-8 text-center">
        <div className="animate-pulse">Loading quiz...</div>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  if (!userName || (!showContent && !showQuestions)) {
    return (
      <div className="container max-w-xl mx-auto py-12">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-bold">{quiz.courseName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground text-lg">
                Welcome to the quiz! Please enter your name to begin.
              </p>
              <p className="text-sm text-muted-foreground">
                This quiz contains {quiz.numberOfQuestions} multiple-choice questions to test your knowledge.
              </p>
            </div>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="text-center"
              />
              <Button type="submit" className="w-full">
                Start Quiz
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showContent && !showQuestions) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-bold">{quiz.courseName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose dark:prose-invert max-w-none">
              <div className="text-center mb-6">
                <p className="text-muted-foreground">
                  {quiz.numberOfQuestions} multiple-choice questions • Take your time to read the content below
                </p>
              </div>
              <div className="space-y-4">
                {quiz.modules[0].content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </div>
            <Button 
              onClick={handleStartQuestions} 
              className="w-full min-w-[150px] py-6 text-lg"
            >
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quizComplete) {
    const result = calculateScore();
    if (typeof result === 'number') {
      return (
        <div className="container max-w-2xl mx-auto py-8 space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Error</h2>
            <p className="text-xl">Failed to calculate quiz results.</p>
          </div>
        </div>
      );
    }

    // First check if we have all the required data
    if (!result || !result.questionsWithAnswers) {
      toast({
        title: 'Error',
        description: 'Quiz results data is missing or incomplete',
        variant: 'destructive',
      });
      return (
        <div className="container max-w-2xl mx-auto py-8 space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Error</h2>
            <p className="text-xl">Failed to generate results. Data is incomplete.</p>
          </div>
        </div>
      );
    }

    // Ensure we have all required fields
    if (!Array.isArray(result.questionsWithAnswers) ||
        !result.modules ||
        !Array.isArray(result.modules)) {
      toast({
        title: 'Error',
        description: 'Question data is missing or incomplete',
        variant: 'destructive',
      });
      return (
        <div className="container max-w-2xl mx-auto py-8 space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Error</h2>
            <p className="text-xl">Failed to generate results. Invalid data format.</p>
          </div>
        </div>
      );
    }

    // Log the submission data for debugging
    console.log('Processing submission for PDF:', {
      userName,
      courseName: result.courseName,
      totalQuestions: result.totalQuestions,
      correctAnswers: result.correctAnswers
    });

    // Create properly structured PDF data
    const pdfData = {
      userName: userName || 'Unknown User',
      courseName: result.courseName || 'Quiz Results',
      modules: result.modules,
      results: {
        [result.moduleId]: {
          moduleId: result.moduleId,
          totalQuestions: result.totalQuestions,
          correctAnswers: result.correctAnswers,
          incorrectAnswers: result.incorrectAnswers,
          questionsWithAnswers: result.questionsWithAnswers.map(qa => {
            // Log each question's data for debugging
            console.log('Processing question for PDF:', {
              questionText: qa.question.text,
              correctOptionId: qa.question.correctOptionId,
              selectedOptionId: qa.selectedOptionId,
              numOptions: qa.question.options.length
            });
            
            return {
              question: {
                text: qa.question.text,
                correctOptionId: qa.question.correctOptionId,
                options: qa.question.options.map(opt => ({
                  id: opt.id,
                  text: opt.text
                }))
              },
              selectedOptionId: qa.selectedOptionId,
              isCorrect: qa.isCorrect
            };
          })
        }
      }
    };

    // Log the final PDF data structure
    console.log('Final PDF data structure:', pdfData);

    return (
      <div className="container max-w-2xl mx-auto py-8 space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Thank You for Completing the Quiz!</h2>
          <p className="text-xl">Your results have been submitted successfully.</p>
          <Button 
            onClick={async () => {
              try {
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
              }
            }}
            size="lg"
            className="mt-4"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Results PDF
          </Button>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestionIndex + 1) / quiz.modules[0].questions.length) * 100;

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {quiz.modules[0].questions.length}
          </span>
          <span className="text-sm font-medium">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          {quiz.modules[0].questions[currentQuestionIndex] && (
            <QuizQuestion
              question={quiz.modules[0].questions[currentQuestionIndex]}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={quiz.modules[0].questions.length}
              selectedOptionId={answers[currentQuestionIndex]}
              onSelectOption={handleSelectOption}
              onNext={handleNextQuestion}
              isSubmitting={isSubmitting}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
} 