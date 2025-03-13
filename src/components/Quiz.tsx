import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Module, QuizResult } from '@/types/quiz';
import { QuizResults } from '@/components/QuizResults';
import { Timer } from '@/components/Timer';

interface QuizProps {
  module: Module;
  userName: string;
  onComplete: (result: QuizResult) => void;
  onTimeout?: () => void;
}

export function Quiz({ module, userName, onComplete, onTimeout }: QuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const currentQuestion = module.questions[currentQuestionIndex];
  const totalQuestions = module.questions.length;

  const handleAnswerSelect = (optionId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionId
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = () => {
    const moduleResults = [{
      moduleName: module.title,
      questions: module.questions.map(question => {
        const selectedOptionId = selectedAnswers[question.id];
        const selectedOption = question.options.find(opt => opt.id === selectedOptionId);
        const correctOption = question.options.find(opt => opt.id === question.correctOptionId);
        
        return {
          question: question.text,
          selectedAnswer: selectedOption?.text || 'No answer',
          correctAnswer: correctOption?.text || 'Unknown',
          isCorrect: selectedOptionId === question.correctOptionId
        };
      })
    }];

    const correctCount = moduleResults[0].questions.filter(q => q.isCorrect).length;
    const score = Math.round((correctCount / totalQuestions) * 100);

    const result: QuizResult = {
      userName,
      courseName: module.title.split(' - ')[0] || 'Course',
      score,
      moduleResults
    };

    setQuizResult(result);
    setIsComplete(true);
    onComplete(result);
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setIsComplete(false);
    setQuizResult(null);
  };

  if (isComplete && quizResult) {
    return <QuizResults quizResult={quizResult} onRetry={handleRetry} />;
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>
        <Timer duration={300} onTimeout={onTimeout} />
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">{currentQuestion.text}</h2>
        <div className="space-y-3">
          {currentQuestion.options.map(option => (
            <Button
              key={option.id}
              variant={selectedAnswers[currentQuestion.id] === option.id ? 'default' : 'outline'}
              className="w-full justify-start text-left"
              onClick={() => handleAnswerSelect(option.id)}
            >
              {option.text}
            </Button>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleNextQuestion}
          disabled={!selectedAnswers[currentQuestion.id]}
        >
          {currentQuestionIndex === totalQuestions - 1 ? 'Complete' : 'Next'}
        </Button>
      </div>
    </div>
  );
} 