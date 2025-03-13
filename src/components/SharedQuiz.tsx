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

export function SharedQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<any>(null);
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
        const quizData = await getSharedQuiz(quizId);
        if (quizData) {
          setQuiz(quizData);
        } else {
          toast({
            title: 'Quiz Not Found',
            description: 'The quiz you are looking for does not exist.',
            variant: 'destructive',
          });
          navigate('/');
        }
      } catch (error) {
        console.error('Error loading quiz:', error);
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
      toast({
        title: 'Error',
        description: 'Failed to start quiz. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Verify we have exactly 30 questions
    if (quiz.modules[0].questions.length !== 30) {
      toast({
        title: 'Error',
        description: 'Quiz configuration error. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    // Initialize answers array for all 30 questions
    setAnswers(new Array(30).fill(''));
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
      await submitQuizResults(quizId!, userName, { [quiz.modules[0].id]: result });
      setQuizComplete(true);
      toast({
        title: 'Quiz Completed!',
        description: 'Your results have been submitted successfully.',
      });
      navigate(`/quiz/${quizId}/thank-you/${userName}`);
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
    if (!quiz || !quiz.modules[0] || !quiz.modules[0].questions) return 0;

    const module = quiz.modules[0];
    const questions = module.questions;
    
    // Map through all questions to create detailed results
    const questionsWithAnswers = questions.map((question, index) => {
      const selectedAnswer = answers[index];
      const isTimeout = selectedAnswer === 'timeout';
      const isCorrect = !isTimeout && selectedAnswer === question.correctOptionId;

      // Log the question data for debugging
      console.log('Processing question:', {
        questionText: question.text,
        correctOptionId: question.correctOptionId,
        selectedAnswer,
        isCorrect
      });

      // Extract the actual question text
      const questionText = typeof question === 'object' && question.text 
        ? question.text 
        : String(question || 'Question text unavailable');

      return {
        question: {
          text: questionText,
          correctOptionId: question.correctOptionId,
          options: question.options.map(option => ({
            id: option.id,
            text: typeof option === 'object' && option.text 
              ? option.text 
              : String(option || 'Option text unavailable')
          }))
        },
        selectedOptionId: selectedAnswer,
        isCorrect: isCorrect,
        isTimeout: isTimeout
      };
    });

    const correctAnswers = questionsWithAnswers.filter(qa => qa.isCorrect).length;
    const totalQuestions = questions.length;

    // Log the final results for debugging
    console.log('Final quiz results:', {
      moduleId: module.id,
      courseName: quiz.courseName,
      totalQuestions,
      correctAnswers,
      questionsCount: questionsWithAnswers.length
    });

    return {
      moduleId: module.id,
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
                This quiz contains 30 multiple-choice questions to test your knowledge.
              </p>
            </div>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="text-lg py-6"
                required
                autoFocus
              />
              <Button type="submit" className="w-full py-6 text-lg">
                Access Quiz
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
                  30 multiple-choice questions • Take your time to read the content below
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

    const pdfData = {
      userName: userName || 'User',
      courseName: result.courseName || 'Quiz Results',
      modules: result.modules || [],
      results: {
        [result.moduleId]: {
          moduleId: result.moduleId,
          totalQuestions: result.totalQuestions,
          correctAnswers: result.correctAnswers,
          incorrectAnswers: result.incorrectAnswers,
          questionsWithAnswers: result.questionsWithAnswers.map(qa => {
            // Log the question data for debugging
            console.log('Processing question for PDF:', {
              questionText: qa.question.text,
              correctOptionId: qa.question.correctOptionId,
              selectedOptionId: qa.selectedOptionId,
              isCorrect: qa.isCorrect,
              isTimeout: qa.isTimeout,
              options: qa.question.options
            });

            // Extract the actual question text
            const questionText = typeof qa.question.text === 'string'
              ? qa.question.text
              : typeof qa.question.text === 'object' && qa.question.text.text
              ? qa.question.text.text
              : String(qa.question.text || 'Question text unavailable');

            return {
              question: {
                text: questionText,
                correctOptionId: qa.question.correctOptionId,
                options: qa.question.options.map(opt => ({
                  id: opt.id,
                  text: typeof opt.text === 'string'
                    ? opt.text
                    : typeof opt.text === 'object' && opt.text.text
                    ? opt.text.text
                    : String(opt.text || 'Option text unavailable')
                }))
              },
              selectedOptionId: qa.selectedOptionId,
              isCorrect: qa.isCorrect,
              isTimeout: qa.isTimeout
            };
          })
        }
      }
    };

    // Log the final PDF data for debugging
    console.log('Final PDF data:', pdfData);

    return (
      <div className="container max-w-2xl mx-auto py-8 space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Thank You for Completing the Quiz!</h2>
          <p className="text-xl">Your results have been submitted successfully.</p>
          <Button 
            onClick={() => {
              try {
                generatePDF(pdfData);
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