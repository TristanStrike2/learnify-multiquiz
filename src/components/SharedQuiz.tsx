import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSharedQuiz, storeQuizSubmission } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import QuizQuestion from './QuizQuestion';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SharedQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleStartQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name to start the quiz.',
        variant: 'destructive',
      });
      return;
    }
    setHasStarted(true);
    setAnswers(new Array(quiz.modules[0].questions.length).fill(''));
  };

  const handleSelectOption = (optionId: string) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIndex] = optionId;
      return newAnswers;
    });
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    const correctAnswers = answers.filter((answer, index) => 
      answer === quiz.modules[0].questions[index].correctOptionId
    ).length;
    return Math.round((correctAnswers / quiz.modules[0].questions.length) * 100);
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < quiz.modules[0].questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Quiz completed, submit results
      if (!quizId) return;
      
      setIsSubmitting(true);
      try {
        // Prepare detailed results including questions and answers
        const questionsWithAnswers = quiz.modules[0].questions.map((question: any, index: number) => ({
          question: question.text,
          selectedAnswer: question.options.find((opt: any) => opt.id === answers[index])?.text || 'No answer',
          correctAnswer: question.options.find((opt: any) => opt.id === question.correctOptionId)?.text || 'Unknown',
          isCorrect: answers[index] === question.correctOptionId,
          allOptions: question.options.map((opt: any) => opt.text)
        }));

        const correctAnswersCount = questionsWithAnswers.filter(q => q.isCorrect).length;
        const results = {
          answers,
          score: calculateScore(),
          totalQuestions: quiz.modules[0].questions.length,
          correctAnswers: correctAnswersCount,
          questionsWithAnswers,
          courseName: quiz.courseName,
          modules: [{
            title: quiz.courseName,
            questions: questionsWithAnswers
          }]
        };

        await storeQuizSubmission(quizId, userName, results);
        
        toast({
          title: 'Quiz Completed!',
          description: 'Your results have been submitted successfully.',
        });
        
        navigate(`/quiz/${quizId}/thank-you/${userName}`);
      } catch (error) {
        console.error('Error submitting quiz:', error);
        toast({
          title: 'Submission Error',
          description: 'There was an error submitting your results. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    }
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

  if (!hasStarted) {
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
                Total questions: {quiz.modules[0].questions.length}
              </p>
            </div>
            <form onSubmit={handleStartQuiz} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="text-lg py-6"
                required
              />
              <Button type="submit" className="w-full py-6 text-lg">
                Start Quiz
              </Button>
            </form>
          </CardContent>
        </Card>
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