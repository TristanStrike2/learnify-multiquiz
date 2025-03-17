import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  subscribeToActiveQuizzes, 
  subscribeToArchivedQuizzes, 
  archiveQuiz, 
  unarchiveQuiz,
  deleteQuizSubmission
} from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Archive, ArchiveRestore, Box, Clock, FileBox, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { DocumentData } from 'firebase/firestore';
import { SharedQuiz } from '@/types/quiz';

interface ArchiveWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  oldestQuiz: SharedQuiz | null;
  oldestArchivedQuiz?: SharedQuiz | null;
  action: 'archive' | 'archive-and-delete';
}

function ArchiveWarningModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  oldestQuiz, 
  oldestArchivedQuiz, 
  action 
}: ArchiveWarningModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === 'archive' ? 'Archive Oldest Quiz?' : 'Archive and Delete Warning'}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            {action === 'archive' ? (
              <>
                <p>You have reached the maximum limit of 5 active quizzes.</p>
                <p>The following quiz will be archived:</p>
                <p className="font-medium text-foreground">{oldestQuiz?.courseName}</p>
              </>
            ) : (
              <>
                <p>You have reached the maximum limits for both active and archived quizzes.</p>
                <p>The following actions will occur:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Archive active quiz: <span className="font-medium text-foreground">{oldestQuiz?.courseName}</span></li>
                  <li>Delete archived quiz: <span className="font-medium text-foreground">{oldestArchivedQuiz?.courseName}</span></li>
                </ul>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant={action === 'archive' ? "default" : "destructive"}
            onClick={onConfirm}
          >
            {action === 'archive' ? 'Archive Quiz' : 'Archive and Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface QuizCardProps {
  quiz: SharedQuiz;
  type: 'active' | 'archived';
  onArchive?: () => void;
  onUnarchive?: () => void;
  onView: () => void;
}

function QuizCard({ quiz, type, onArchive, onUnarchive, onView }: QuizCardProps) {
  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-900/50">
      <CardHeader className="border-b bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FileBox className="h-4 w-4" />
              {quiz.courseName}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Created {format(quiz.createdAt.toDate(), 'PPP')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Questions</span>
            <span className="font-medium">{quiz.numberOfQuestions}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Modules</span>
            <span className="font-medium">{quiz.modules.length}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-950/20 dark:to-background border-t flex justify-center gap-2 p-4">
        <Button 
          variant="outline" 
          className="w-full hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          onClick={onView}
        >
          <Box className="mr-2 h-4 w-4" />
          View Submissions
        </Button>
        {type === 'active' && onArchive && (
          <Button 
            variant="outline" 
            className="w-full hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            onClick={onArchive}
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </Button>
        )}
        {type === 'archived' && onUnarchive && (
          <Button 
            variant="outline" 
            className="w-full hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            onClick={onUnarchive}
          >
            <ArchiveRestore className="mr-2 h-4 w-4" />
            Restore
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export function QuizManagementPage() {
  const [activeQuizzes, setActiveQuizzes] = useState<SharedQuiz[]>([]);
  const [archivedQuizzes, setArchivedQuizzes] = useState<SharedQuiz[]>([]);
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [archiveAction, setArchiveAction] = useState<'archive' | 'archive-and-delete'>('archive');
  const [quizToArchive, setQuizToArchive] = useState<SharedQuiz | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeActive = subscribeToActiveQuizzes((quizzes) => {
      setActiveQuizzes(quizzes as SharedQuiz[]);
    });

    const unsubscribeArchived = subscribeToArchivedQuizzes((quizzes) => {
      setArchivedQuizzes(quizzes as SharedQuiz[]);
    });

    return () => {
      unsubscribeActive();
      unsubscribeArchived();
    };
  }, []);

  const handleArchiveQuiz = async (quiz: SharedQuiz) => {
    if (activeQuizzes.length >= 5) {
      const oldestQuiz = activeQuizzes[activeQuizzes.length - 1];
      setQuizToArchive(oldestQuiz);
      
      if (archivedQuizzes.length >= 5) {
        setArchiveAction('archive-and-delete');
      } else {
        setArchiveAction('archive');
      }
      
      setShowArchiveWarning(true);
    } else {
      try {
        await archiveQuiz(quiz.id);
        toast({
          title: 'Quiz Archived',
          description: `${quiz.courseName} has been moved to the archive.`,
        });
      } catch (error) {
        console.error('Error archiving quiz:', error);
        toast({
          title: 'Error',
          description: 'Failed to archive quiz. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleUnarchiveQuiz = async (quiz: SharedQuiz) => {
    if (activeQuizzes.length >= 5) {
      toast({
        title: 'Cannot Unarchive',
        description: 'You have reached the maximum limit of 5 active quizzes. Please archive an active quiz first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await unarchiveQuiz(quiz.id);
      toast({
        title: 'Quiz Restored',
        description: `${quiz.courseName} has been restored to active quizzes.`,
      });
    } catch (error) {
      console.error('Error unarchiving quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore quiz. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmArchive = async () => {
    if (!quizToArchive) return;

    try {
      if (archiveAction === 'archive-and-delete' && archivedQuizzes.length > 0) {
        const oldestArchivedQuiz = archivedQuizzes[archivedQuizzes.length - 1];
        // Delete the oldest archived quiz
        await deleteQuizSubmission(oldestArchivedQuiz.id, oldestArchivedQuiz.id);
      }

      // Archive the oldest active quiz
      await archiveQuiz(quizToArchive.id);

      toast({
        title: 'Operation Complete',
        description: archiveAction === 'archive'
          ? `${quizToArchive.courseName} has been archived.`
          : `Quiz archived and oldest archived quiz deleted.`,
      });

      setShowArchiveWarning(false);
      setQuizToArchive(null);
    } catch (error) {
      console.error('Error during archive operation:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete the operation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Quiz Management
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage your active and archived quizzes
          </p>
        </div>
        <Button 
          onClick={() => navigate('/create')}
          className="bg-green-600 hover:bg-green-700"
        >
          Create New Quiz
        </Button>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            Active Quizzes
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archived Quizzes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {activeQuizzes.length === 0 ? (
            <Card>
              <CardHeader className="text-center">
                <CardTitle>No Active Quizzes</CardTitle>
                <CardDescription>Create a new quiz to get started</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeQuizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  type="active"
                  onArchive={() => handleArchiveQuiz(quiz)}
                  onView={() => navigate(`/quiz/${quiz.courseName}/${quiz.id}/results/admin`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-6">
          {archivedQuizzes.length === 0 ? (
            <Card>
              <CardHeader className="text-center">
                <CardTitle>No Archived Quizzes</CardTitle>
                <CardDescription>Archive a quiz to see it here</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {archivedQuizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  type="archived"
                  onUnarchive={() => handleUnarchiveQuiz(quiz)}
                  onView={() => navigate(`/quiz/${quiz.courseName}/${quiz.id}/results/admin`)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ArchiveWarningModal
        isOpen={showArchiveWarning}
        onClose={() => {
          setShowArchiveWarning(false);
          setQuizToArchive(null);
        }}
        onConfirm={handleConfirmArchive}
        oldestQuiz={quizToArchive}
        oldestArchivedQuiz={archiveAction === 'archive-and-delete' ? archivedQuizzes[archivedQuizzes.length - 1] : null}
        action={archiveAction}
      />
    </div>
  );
} 