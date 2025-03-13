import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Question } from '@/types/quiz';
import { Timer } from '@/components/Timer';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';

export interface QuizQuestionProps {
  question: {
    text: string;
    options: Array<{
      id: string;
      text: string;
    }>;
    correctOptionId: string;
  };
  questionNumber: number;
  totalQuestions: number;
  selectedOptionId: string;
  onSelectOption: (optionId: string) => void;
  onNext: () => void;
  isSubmitting?: boolean;
}

export default function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionId,
  onSelectOption,
  onNext,
  isSubmitting = false,
}: QuizQuestionProps) {
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [showQuestion, setShowQuestion] = useState(true);
  const [timerKey, setTimerKey] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isLastQuestion = questionNumber === totalQuestions;

  // Randomize options when the question changes
  const randomizedOptions = useMemo(() => {
    const shuffled = [...question.options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [question.options]);

  // Reset states when question changes
  useEffect(() => {
    setIsTimedOut(false);
    setShowQuestion(true);
    setTimerKey(prev => prev + 1);
    setIsSubmitted(false);
  }, [questionNumber]);

  const handleTimeout = () => {
    setIsTimedOut(true);
    setIsSubmitted(true);
    // If no option selected on timeout, mark as timeout
    if (!selectedOptionId) {
      onSelectOption('timeout');
    }
    // If an option was selected before timeout, keep that selection
  };

  const handleOptionClick = (optionId: string) => {
    if (isSubmitted) return; // Only prevent changes after submission
    onSelectOption(optionId);
  };

  const handleSubmit = () => {
    if (!selectedOptionId) return;
    setIsSubmitted(true);
    // If the answer was timed out but they had selected something, keep their selection
    if (isTimedOut && selectedOptionId !== 'timeout') {
      onSelectOption(selectedOptionId);
    }
  };

  const getOptionClasses = (optionId: string) => {
    const baseClasses = "w-full p-4 text-left transition-all duration-200 rounded-lg border-2 relative";
    
    if (!isSubmitted) {
      return cn(
        baseClasses, 
        "hover:border-primary/50 bg-background",
        selectedOptionId === optionId && "border-primary bg-primary/10"
      );
    }

    // Correct answer
    if (optionId === question.correctOptionId) {
      return cn(baseClasses, "border-green-500 bg-green-50 dark:bg-green-900/20");
    }

    // Selected but incorrect (including timeout)
    if (optionId === selectedOptionId && optionId !== question.correctOptionId) {
      return cn(baseClasses, "border-red-500 bg-red-50 dark:bg-red-900/20");
    }

    // Other options after submission
    return cn(baseClasses, "opacity-50");
  };

  const getOptionIcon = (optionId: string) => {
    if (!isSubmitted) return null;

    if (optionId === question.correctOptionId) {
      return <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />;
    }

    if (optionId === selectedOptionId && optionId !== question.correctOptionId) {
      return <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />;
    }

    return null;
  };

  const getFeedbackMessage = () => {
    if (isTimedOut && (!selectedOptionId || selectedOptionId === 'timeout')) {
      return "Time's up! You didn't select an answer.";
    }
    if (isTimedOut) {
      return "Time's up! Your last selection has been recorded.";
    }
    if (selectedOptionId === question.correctOptionId) {
      return "Correct! Well done!";
    }
    return "Incorrect. The correct answer has been highlighted.";
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Question {questionNumber} of {totalQuestions}
        </div>
        <Timer 
          duration={45} 
          onTimeout={handleTimeout}
          resetKey={timerKey}
          isPaused={isSubmitted}
        />
      </div>

      <Card className="p-6">
        <h2 className="text-2xl font-semibold leading-tight mb-4">
          {question.text}
        </h2>
        <div className="space-y-4">
          <div className="grid gap-4">
            {randomizedOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                disabled={isSubmitted}
                className={getOptionClasses(option.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                    selectedOptionId === option.id ? "border-primary" : "border-muted-foreground"
                  )}>
                    {selectedOptionId === option.id && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="flex-1">{option.text}</span>
                  {getOptionIcon(option.id)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex items-start gap-4 pt-4">
        <div className={cn(
          "flex-1 transition-all duration-200",
          isSubmitted ? "opacity-100" : "opacity-0 invisible"
        )}>
          <div className={cn(
            "p-4 rounded-lg text-center font-medium",
            isTimedOut 
              ? "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
              : selectedOptionId === question.correctOptionId
                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
          )}>
            <div className="flex items-center justify-center gap-2">
              {isTimedOut && <Clock className="h-5 w-5" />}
              <span>{getFeedbackMessage()}</span>
            </div>
          </div>
        </div>

        {!isSubmitted ? (
          <Button
            onClick={handleSubmit}
            disabled={!selectedOptionId || isSubmitting}
            size="lg"
            className="min-w-[120px]"
          >
            Submit Answer
          </Button>
        ) : (
          <Button
            onClick={onNext}
            disabled={isSubmitting}
            size="lg"
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Submitting...
              </div>
            ) : isLastQuestion ? (
              'Finish Quiz'
            ) : (
              'Next Question'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
