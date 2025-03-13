import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSharedQuiz, submitQuizResults } from '@/lib/shareLink';
import { Module, QuizResult, QuizState } from '@/types/quiz';
import { NameInput } from '@/components/NameInput';
import ModuleList from '@/components/ModuleList';
import ModuleContent from '@/components/ModuleContent';
import QuizResults from '@/components/QuizResults';
import QuizQuestion from '@/components/QuizQuestion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { generatePDF } from '@/lib/pdfGenerator';

export function SharedQuizPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [userName, setUserName] = useState<string>('');
  const [moduleResults, setModuleResults] = useState<Record<string, QuizResult>>({});
  const [quiz, setQuiz] = useState<{ courseName: string; modules: Module[] } | null>(null);
  const [quizState, setQuizState] = useState<QuizState>({ status: 'input' });

  useEffect(() => {
    if (!id) return;
    const sharedQuiz = getSharedQuiz(id);
    if (!sharedQuiz) {
      toast({
        title: 'Quiz Not Found',
        description: 'The shared quiz you\'re looking for doesn\'t exist.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }
    setQuiz(sharedQuiz);
  }, [id]);

  const resetQuizState = () => {
    setUserName('');
    setModuleResults({});
    setQuizState({ status: 'input' });
  };

  const handleNameSubmit = (name: string) => {
    setUserName(name);
    if (quiz) {
      setQuizState({ 
        status: 'course', 
        modules: quiz.modules, 
        currentModuleIndex: 0, 
        currentView: 'content' 
      });
    }
  };

  const handleModuleSelect = (index: number) => {
    if (!quiz) return;
    setQuizState({ 
      status: 'course', 
      modules: quiz.modules, 
      currentModuleIndex: index, 
      currentView: 'content' 
    });
  };

  const handleStartQuiz = () => {
    if (!quiz || quizState.status !== 'course') return;
    const currentModule = quiz.modules[quizState.currentModuleIndex];
    setQuizState({
      status: 'quiz',
      currentQuestionIndex: 0,
      questions: currentModule.questions,
      answers: Array(currentModule.questions.length).fill(null),
      quizStartTime: Date.now(),
      moduleId: currentModule.id
    });
  };

  const handleAnswerQuestion = (optionId: string) => {
    if (quizState.status !== 'quiz') return;
    setQuizState(prev => {
      if (prev.status !== 'quiz') return prev;
      return {
        ...prev,
        answers: prev.answers.map((ans, idx) => 
          idx === prev.currentQuestionIndex ? optionId : ans
        ),
      };
    });
  };

  const handleNextQuestion = () => {
    if (!quiz || quizState.status !== 'quiz') return;
    const currentModule = quiz.modules.find(m => m.id === quizState.moduleId);
    if (!currentModule) return;
    
    const nextIndex = quizState.currentQuestionIndex + 1;
    // If this is the last question
    if (nextIndex >= currentModule.questions.length) {
      const questionsWithAnswers = currentModule.questions.map((question, index) => ({
        question,
        selectedOptionId: quizState.answers[index],
        isCorrect: quizState.answers[index] === question.correctOptionId,
      }));
      
      const correctAnswers = questionsWithAnswers.filter(q => q.isCorrect).length;
      const result: QuizResult = {
        totalQuestions: currentModule.questions.length,
        correctAnswers,
        incorrectAnswers: currentModule.questions.length - correctAnswers,
        questionsWithAnswers,
        moduleId: currentModule.id,
      };
      
      // Save the results
      setModuleResults(prevResults => ({
        ...prevResults,
        [currentModule.id]: result,
      }));

      const currentModuleIndex = quiz.modules.findIndex(m => m.id === currentModule.id);
      const hasNextModule = currentModuleIndex < quiz.modules.length - 1;

      setQuizState({
        status: 'results',
        result,
        hasNextModule
      });
      return;
    }
    
    // Move to next question
    setQuizState(prev => {
      if (prev.status !== 'quiz') return prev;
      return { ...prev, currentQuestionIndex: nextIndex };
    });
  };

  const handleSubmitResults = async () => {
    if (!id || !quiz) return;

    try {
      // Show loading toast
      toast({
        title: 'Generating Results',
        description: 'Please wait while we generate your results PDF...',
      });

      const pdfUrl = await generatePDF(userName, quiz.courseName, quiz.modules, moduleResults);
      
      // Submit results
      await submitQuizResults(id, userName, moduleResults);
      
      toast({
        title: 'Results Submitted',
        description: 'Your quiz results have been submitted successfully! You can now take the quiz again with a different name.',
      });
      
      // Reset the quiz state for the next user
      resetQuizState();
    } catch (error) {
      console.error('Error submitting results:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit results. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!quiz) {
    return <div>Loading...</div>;
  }

  if (quizState.status === 'input') {
    const firstModule = quiz.modules[0];
    const description = firstModule.content.split('.')[0] + '.'; // Get first sentence

    return (
      <div className="container max-w-4xl mx-auto py-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">{quiz.courseName}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {description}
          </p>
          <p className="text-sm text-muted-foreground">
            Enter your name below to begin the quiz.
          </p>
        </div>
        <NameInput onSubmit={handleNameSubmit} />
      </div>
    );
  }

  const allModulesCompleted = quiz.modules.every(
    (module) => moduleResults[module.id]
  );

  if (allModulesCompleted) {
    const lastModuleResult = moduleResults[quiz.modules[quiz.modules.length - 1].id];
    return (
      <div className="container max-w-4xl mx-auto py-8 space-y-8">
        <QuizResults
          result={lastModuleResult}
          onReset={() => {}}
          onNextModule={() => {}}
          hasNextModule={false}
          modules={quiz.modules}
          allResults={moduleResults}
          isAllModulesCompleted={true}
          userName={userName}
        />
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            onClick={handleSubmitResults}
            className="px-8 py-4 text-lg"
          >
            Submit Results
          </Button>
          <p className="text-sm text-gray-600">
            After submitting, another user can take the quiz by entering their name.
          </p>
        </div>
      </div>
    );
  }

  if (quizState.status === 'course' && quizState.currentView === 'content') {
    return (
      <ModuleContent
        module={quiz.modules[quizState.currentModuleIndex]}
        moduleNumber={quizState.currentModuleIndex}
        totalModules={quiz.modules.length}
        onStartQuiz={handleStartQuiz}
      />
    );
  }

  if (quizState.status === 'quiz') {
    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    return (
      <QuizQuestion
        question={currentQuestion}
        questionNumber={quizState.currentQuestionIndex}
        totalQuestions={quizState.questions.length}
        selectedOptionId={quizState.answers[quizState.currentQuestionIndex]}
        onSelectOption={handleAnswerQuestion}
        onNext={handleNextQuestion}
      />
    );
  }

  if (quizState.status === 'results') {
    return (
      <QuizResults
        result={quizState.result}
        onReset={() => {}}
        onNextModule={() => {
          if (!quiz) return;
          const currentModuleIndex = quiz.modules.findIndex(m => m.id === quizState.result.moduleId);
          if (currentModuleIndex < quiz.modules.length - 1) {
            setQuizState({
              status: 'course',
              modules: quiz.modules,
              currentModuleIndex: currentModuleIndex + 1,
              currentView: 'content'
            });
          }
        }}
        hasNextModule={quizState.hasNextModule}
        modules={quiz.modules}
        allResults={moduleResults}
        isAllModulesCompleted={false}
        userName={userName}
      />
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <ModuleList
        modules={quiz.modules}
        currentModuleIndex={quizState.status === 'course' ? quizState.currentModuleIndex : 0}
        onSelectModule={handleModuleSelect}
        onModuleSelect={handleModuleSelect}
        moduleResults={moduleResults}
        courseName={quiz.courseName}
      />
    </div>
  );
} 