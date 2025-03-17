import { useState, useEffect } from 'react';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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

  // Reset everything when the page mounts
  useEffect(() => {
    handleReset();
  }, []);

  const handleGenerateCourse = async (text: string) => {
    // Store the content first
    setContent(text);
    
    // Generate the course with the provided text
    const success = await generateCourse(text);
    
    if (!success) {
      // Reset states if generation failed
      setShowModuleContent(false);
      setQuizState({
        isActive: false,
        currentQuestionIndex: 0,
        answers: [],
      });
      setCurrentModuleIndex(0);
      setModuleResults({});
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const courseName = (form.querySelector('input') as HTMLInputElement).value.trim();
    
    if (!courseName) {
      toast({
        title: 'Course Name Required',
        description: 'Please enter a name for your course.',
        variant: 'destructive',
      });
      return;
    }

    if (!course) return;

    try {
      // Update course with name
      setCourse({
        ...course,
        courseName
      });

      // Create share link and navigate to submissions
      const { quizId, urlSafeName } = await createShareLink(courseName, course.modules);
      
      // Clear any stored state before navigating
      localStorage.removeItem('currentCourse');
      localStorage.removeItem('moduleResults');
      localStorage.removeItem('quizState');
      
      // Navigate to admin page
      navigate(`/quiz/${urlSafeName}/${quizId}/results/admin`);
    } catch (error) {
      console.error('Error sharing quiz:', error);
      toast({
        title: 'Failed to share quiz',
        description: 'Please try again later.',
        variant: 'destructive',
      });
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
    setQuizState({
      isActive: true,
      currentQuestionIndex: 0,
      answers: new Array(currentModule.questions.length).fill(''),
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
        
        // Save the results
        setModuleResults(prevResults => ({
          ...prevResults,
          [currentModule.id]: result,
        }));

        // Return to module list
        setShowModuleContent(false);
        return {
          isActive: false,
          currentQuestionIndex: 0,
          answers: [],
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

  const handleReset = () => {
    // Reset all state without triggering loading
    setCurrentModuleIndex(0);
    setShowModuleContent(false);
    setModuleResults({});
    setQuizState({
      isActive: false,
      currentQuestionIndex: 0,
      answers: [],
    });
    setUserName('');
    setContent('');
    setCourse(null);
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
      const { quizId, urlSafeName } = await createShareLink(course.courseName, course.modules);
      const fullUrl = `${window.location.origin}/quiz/${urlSafeName}/${quizId}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(fullUrl);
      
      toast({
        title: 'Link Copied!',
        description: 'Share this link with others to let them take the quiz.',
      });

      // Navigate to submissions page
      navigate(`/quiz/${urlSafeName}/${quizId}/results/admin`);
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
    if (!course) {
      return (
        <QuizGenerator onGenerate={handleGenerateCourse} isLoading={isLoading} />
      );
    }

    if (showNameInput) {
      return (
        <div className="container max-w-xl mx-auto py-12">
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-bold">Name Your Course</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground text-lg">
                  Give your course a descriptive name before sharing
                </p>
                <p className="text-sm text-muted-foreground">
                  Your course has {course.modules[0].questions.length} questions
                </p>
              </div>
              <form onSubmit={handleNameSubmit} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter course name"
                  className="text-lg py-6"
                  required
                  autoFocus
                />
                <Button type="submit" className="w-full py-6 text-lg">
                  Create and Share Course
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Return null for other states to prevent showing quiz content
    return null;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
}

export default IndexPage;
