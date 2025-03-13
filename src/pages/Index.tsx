import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useGenerateCourse } from '@/lib/hooks';
import ModuleContent from '@/components/ModuleContent';
import ModuleList from '@/components/ModuleList';
import TextInput from '@/components/TextInput';
import QuizGenerator from '@/components/QuizGenerator';
import QuizQuestion from '@/components/QuizQuestion';
import QuizResults from '@/components/QuizResults';
import { GraduationCap, Share2, Loader2 } from 'lucide-react';
import { QuizResult } from '@/types/quiz';
import UserNameInput from '@/components/UserNameInput';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NameInput } from '@/components/NameInput';
import { ShareCourseButton } from '@/components/ShareCourseButton';
import { createShareLink } from '@/lib/shareLink';
import { Input } from '@/components/ui/input';

export function IndexPage() {
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [showModuleContent, setShowModuleContent] = useState(false);
  const [moduleResults, setModuleResults] = useState<Record<string, QuizResult>>({});
  const [userName, setUserName] = useState<string>('');
  const [quizState, setQuizState] = useState<{
    isActive: boolean;
    currentQuestionIndex: number;
    answers: string[];
  }>({
    isActive: false,
    currentQuestionIndex: 0,
    answers: [],
  });
  const { toast } = useToast();
  const { generateCourse, course, isLoading, setCourse } = useGenerateCourse();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  const handleGenerateCourse = async (text: string) => {
    // Set content state
    setContent(text);
    
    // Generate course
    const success = await generateCourse(text);
    if (success) {
      setShowNameInput(true);
      setShowModuleContent(false);
    }
  };

  const handleStartModule = (index: number) => {
    if (index <= currentModuleIndex) {
      setShowModuleContent(true);
      setCurrentModuleIndex(index);
      setQuizState({
        isActive: false,
        currentQuestionIndex: 0,
        answers: [],
      });
    }
  };

  const handleViewResults = (moduleId: string) => {
    if (!course) return;
    const moduleIndex = course.modules.findIndex(m => m.id === moduleId);
    if (moduleIndex !== -1) {
      setCurrentModuleIndex(moduleIndex);
      setShowModuleContent(true);
      // Set answers to trigger results display
      const result = moduleResults[moduleId];
      if (result) {
        setQuizState({
          isActive: false,
          currentQuestionIndex: result.totalQuestions,
          answers: result.questionsWithAnswers.map(q => q.selectedOptionId || ''),
        });
      }
    }
  };

  const handleStartQuiz = () => {
    if (!course) return;
    const currentModule = course.modules[currentModuleIndex];
    console.log(`Starting quiz for ${currentModule.id} with ${currentModule.questions.length} questions`);
    setQuizState({
      isActive: true,
      currentQuestionIndex: 0,
      answers: Array(currentModule.questions.length).fill(''),
    });
  };

  const handleAnswerQuestion = (optionId: string) => {
    setQuizState(prev => ({
      ...prev,
      answers: prev.answers.map((ans, idx) => 
        idx === prev.currentQuestionIndex ? optionId : ans
      ),
    }));
  };

  const handleNextQuestion = () => {
    if (!course) return;
    const currentModule = course.modules[currentModuleIndex];
    
    setQuizState(prev => {
      const nextIndex = prev.currentQuestionIndex + 1;
      // If this is the last question
      if (nextIndex >= currentModule.questions.length) {
        const questionsWithAnswers = currentModule.questions.map((question, index) => ({
          question,
          selectedOptionId: prev.answers[index],
          isCorrect: prev.answers[index] === question.correctOptionId,
        }));
        
        const correctAnswers = questionsWithAnswers.filter(q => q.isCorrect).length;
        const result: QuizResult = {
          totalQuestions: currentModule.questions.length,
          correctAnswers,
          incorrectAnswers: currentModule.questions.length - correctAnswers,
          questionsWithAnswers,
          moduleId: currentModule.id,
        };
        
        // Save the results immediately
        setModuleResults(prevResults => ({
          ...prevResults,
          [currentModule.id]: result,
        }));

        // Return the final state that will trigger results display
        return {
          isActive: false,
          currentQuestionIndex: currentModule.questions.length,
          answers: prev.answers,
        };
      }
      
      // If not the last question, just move to next
      return { ...prev, currentQuestionIndex: nextIndex };
    });
  };

  const handleCompleteModule = () => {
    if (!course || currentModuleIndex >= course.modules.length - 1) return;
    
    // Save the quiz results before moving to next module
    const currentModule = course.modules[currentModuleIndex];
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
    
    setModuleResults(prev => ({
      ...prev,
      [currentModule.id]: result,
    }));
    
    setCurrentModuleIndex(prev => prev + 1);
    setShowModuleContent(false);
    setQuizState({
      isActive: false,
      currentQuestionIndex: 0,
      answers: [],
    });
  };

  const handleNameSubmit = async (name: string) => {
    if (!course) return;
    
    try {
      // Update the course with the provided name
      setCourse({
        ...course,
        courseName: name
      });

      // Create share link and navigate to submissions
      const quizId = await createShareLink(name, course.modules);
      navigate(`/quiz/${quizId}/results/admin`);
      
      setShowNameInput(false);
    } catch (error) {
      console.error('Error sharing quiz:', error);
      toast({
        title: 'Failed to share quiz',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    // Clear the course first
    generateCourse('');
    // Then reset all other state
    setCurrentModuleIndex(0);
    setShowModuleContent(false);
    setModuleResults({});
    setQuizState({
      isActive: false,
      currentQuestionIndex: 0,
      answers: [],
    });
    setUserName('');
  };

  const handleShare = async () => {
    if (!course || !course.modules || course.modules.length === 0) return;
    
    if (!course.courseName) {
      toast({
        title: "Course Name Required",
        description: "Please name your course before sharing.",
        variant: "destructive"
      });
      setShowNameInput(true);
      return;
    }
    
    try {
      const quizId = await createShareLink(course.courseName, course.modules);
      const fullUrl = `${window.location.origin}/quiz/${quizId}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(fullUrl);
      
      toast({
        title: 'Link Copied!',
        description: 'Share this link with others to let them take the quiz.',
      });

      // Navigate to submissions page
      navigate(`/quiz/${quizId}/results/admin`);
    } catch (error) {
      console.error('Error sharing quiz:', error);
      toast({
        title: "Failed to share quiz",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleNewCourse = () => {
    setContent('');
    setUserName('');
    setShowNameInput(false);
    setCurrentModuleIndex(0);
    setShowModuleContent(false);
    setModuleResults({});
  };

  const allModulesCompleted = course && course.modules && course.modules.length > 0 && 
    course.modules.every((module) => moduleResults[module.id]);

  const renderContent = () => {
    if (isLoading) {
      return <QuizGenerator onGenerate={handleGenerateCourse} isLoading={isLoading} />;
    }

    if (!course) {
      return (
        <div className="space-y-4">
          <QuizGenerator onGenerate={handleGenerateCourse} isLoading={isLoading} />
        </div>
      );
    }

    // Add share button after course generation
    const shareButton = course.modules.length > 0 && (
      <div className="flex justify-center mt-4">
        <Button
          size="lg"
          onClick={() => setShowNameInput(true)}
          className="bg-primary hover:bg-primary/90"
        >
          Share Quiz
        </Button>
      </div>
    );

    if (showNameInput) {
      return (
        <>
          <div className="container max-w-md mx-auto py-8">
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold">Name Your Course</h2>
                <p className="text-muted-foreground">
                  Give your course a descriptive name before sharing
                </p>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.querySelector('input');
                if (input && input.value.trim()) {
                  handleNameSubmit(input.value.trim());
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter course name"
                    className="w-full"
                    required
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Create and Share Course
                </Button>
              </form>
            </div>
          </div>
        </>
      );
    }

    if (showModuleContent) {
      if (quizState.isActive) {
        const currentModule = course.modules[currentModuleIndex];
        console.log(`Rendering question ${quizState.currentQuestionIndex + 1} of ${currentModule.questions.length}`);
        const currentQuestion = currentModule.questions[quizState.currentQuestionIndex];
        return (
          <>
            <QuizQuestion
              question={currentQuestion}
              questionNumber={quizState.currentQuestionIndex}
              totalQuestions={currentModule.questions.length}
              selectedOptionId={quizState.answers[quizState.currentQuestionIndex]}
              onSelectOption={handleAnswerQuestion}
              onNext={handleNextQuestion}
            />
            {shareButton}
          </>
        );
      }

      const currentModule = course.modules[currentModuleIndex];
      
      return (
        <>
          <ModuleContent
            module={currentModule}
            moduleNumber={currentModuleIndex}
            totalModules={course.modules.length}
            onStartQuiz={() => setShowNameInput(true)}
          />
          {shareButton}
        </>
      );
    }

    return (
      <>
        <ModuleList
          modules={course.modules}
          currentModuleIndex={currentModuleIndex}
          onModuleSelect={handleStartModule}
          moduleResults={moduleResults}
          onViewResults={handleViewResults}
          courseName={course.courseName || "Generated Course"}
        />
        {shareButton}
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-background/95">
      <div className="max-w-3xl mx-auto w-full flex-1 relative">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <GraduationCap className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              IxE Training Prototype
            </h1>
          </div>
          <p className="text-muted-foreground">
            Transform any text into a mini-course with modules and quizzes using Gemini API
          </p>
        </header>
        
        <main className="flex-1">
          {renderContent()}
        </main>
        
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} IxE Training Prototype. Create quizzes from any text content.</p>
        </footer>
      </div>
    </div>
  );
}

export default IndexPage;
