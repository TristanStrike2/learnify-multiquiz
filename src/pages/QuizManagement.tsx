import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  subscribeToActiveQuizzes, 
  subscribeToArchivedQuizzes, 
  archiveQuiz, 
  unarchiveQuiz,
  deleteQuizSubmission,
  subscribeToQuizSubmissions,
  getQuizSubmissions,
  deleteQuiz,
  getSharedQuiz
} from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Archive, ArchiveRestore, Box, Clock, FileBox, Trash2, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { DocumentData } from 'firebase/firestore';
import { SharedQuiz } from '@/types/quiz';
import { cn } from '@/lib/utils';

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
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log(`Setting up subscription for quiz ${quiz.id}`);
    const unsubscribe = subscribeToQuizSubmissions(quiz.id, (submissions) => {
      console.log(`Received ${submissions.length} submissions for quiz ${quiz.id}`);
      setSubmissionsCount(submissions.length);
      
      // Calculate average score
      if (submissions.length > 0) {
        const validSubmissions = submissions.filter(
          sub => sub.results && 
          typeof sub.results.correctAnswers === 'number' && 
          typeof sub.results.totalQuestions === 'number' && 
          sub.results.totalQuestions > 0
        );
        
        if (validSubmissions.length > 0) {
          const totalScore = validSubmissions.reduce((acc, sub) => {
            const correctAnswers = sub.results.correctAnswers;
            const totalQuestions = sub.results.totalQuestions;
            return acc + (correctAnswers / totalQuestions) * 100;
          }, 0);
          const newAverage = Math.round(totalScore / validSubmissions.length);
          console.log(`Calculated new average score for quiz ${quiz.id}:`, newAverage);
          setAverageScore(newAverage);
        } else {
          setAverageScore(null);
        }
      } else {
        console.log(`No submissions for quiz ${quiz.id}, setting average to null`);
        setAverageScore(null);
      }
    });

    return () => {
      console.log(`Cleaning up subscription for quiz ${quiz.id}`);
      unsubscribe();
    };
  }, [quiz.id]);

  const handleDelete = async (quiz: SharedQuiz) => {
    if (!quiz.isArchived) {
      toast({
        title: 'Error',
        description: 'Only archived quizzes can be deleted.',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Starting deletion process for quiz:', quiz.id);
      await deleteQuiz(quiz.id);
      
      toast({
        title: 'Quiz Deleted',
        description: `${quiz.courseName} and all its submissions have been permanently deleted.`,
      });
    } catch (error) {
      console.error('Error in deletion process:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete quiz. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (type === 'archived') {
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
              <span className="text-sm text-muted-foreground">Submissions</span>
              <span className="font-medium">{submissionsCount}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/50 flex justify-end gap-2 py-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(quiz);
            }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          {onUnarchive && (
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onUnarchive();
              }}
              className="gap-2"
            >
              <ArchiveRestore className="h-4 w-4" />
              Restore
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <div 
      className="group relative bg-card hover:bg-accent/50 transition-all duration-200 rounded-lg border shadow-sm hover:shadow-lg cursor-pointer overflow-hidden"
      onClick={onView}
    >
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5 group-hover:opacity-75 transition-opacity" />

      <div className="relative p-6 flex items-start gap-6">
        {/* Left section - Title and metadata */}
        <div className="flex-1">
          <h3 className="text-xl font-semibold tracking-tight mb-2 group-hover:text-primary transition-colors bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {quiz.courseName}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-500" />
            Created {format(quiz.createdAt.toDate(), 'PPP')}
          </p>
          
          {/* Hover message */}
          <div className="absolute right-[280px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
            <div className="bg-popover/95 rounded-lg shadow-lg px-3 py-2 text-sm text-popover-foreground border min-w-[160px]">
              {averageScore !== null ? (
                <div className="space-y-0.5">
                  <div className="font-medium">
                    {Math.round(quiz.numberOfQuestions * (averageScore / 100))} / {quiz.numberOfQuestions}
                  </div>
                  <div className={cn(
                    "text-sm font-medium",
                    averageScore >= 80 ? "text-green-500" :
                    averageScore >= 60 ? "text-yellow-500" :
                    "text-red-500"
                  )}>
                    {averageScore}% Success
                  </div>
                </div>
              ) : (
                <div className="font-medium">No Data</div>
              )}
            </div>
          </div>
        </div>

        {/* Stats section with archive button */}
        <div className="flex items-center gap-4">
          {/* Archive button that appears on hover */}
          {onArchive && (
            <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative group/archive">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive();
                  }}
                  className="h-8 w-8 hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <div className="absolute right-0 top-full mt-2 whitespace-nowrap rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 opacity-0 group-hover/archive:opacity-100 pointer-events-none">
                  Archive Quiz
                </div>
              </div>
            </div>
          )}

          <div className="text-center px-4 py-2 rounded-lg bg-purple-50 dark:bg-purple-950/20">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{quiz.numberOfQuestions}</div>
            <div className="text-xs text-purple-600/70 dark:text-purple-400/70 uppercase tracking-wide">Questions</div>
          </div>
          
          <div className="text-center px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{submissionsCount}</div>
            <div className="text-xs text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wide">Submissions</div>
          </div>

          <div className={cn(
            "text-center px-4 py-2 rounded-lg transition-colors",
            averageScore === null 
              ? "bg-gray-50 dark:bg-gray-900/20" 
              : averageScore >= 80
                ? "bg-green-50 dark:bg-green-950/20"
                : averageScore >= 60
                  ? "bg-yellow-50 dark:bg-yellow-950/20"
                  : "bg-red-50 dark:bg-red-950/20"
          )}>
            <div className={cn(
              "text-2xl font-bold transition-colors",
              averageScore === null 
                ? "text-gray-600 dark:text-gray-400" 
                : averageScore >= 80
                  ? "text-green-600 dark:text-green-400"
                  : averageScore >= 60
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
            )}>
              {averageScore !== null ? `${averageScore}%` : '-'}
            </div>
            <div className={cn(
              "text-xs uppercase tracking-wide transition-colors",
              averageScore === null 
                ? "text-gray-600/70 dark:text-gray-400/70" 
                : averageScore >= 80
                  ? "text-green-600/70 dark:text-green-400/70"
                  : averageScore >= 60
                    ? "text-yellow-600/70 dark:text-yellow-400/70"
                    : "text-red-600/70 dark:text-red-400/70"
            )}>
              Avg Score
            </div>
          </div>
        </div>
      </div>

      {/* Question success rate bars */}
      <div className="relative h-1.5 w-full bg-muted overflow-hidden group/progress flex gap-px">
        {[...Array(quiz.numberOfQuestions)].map((_, index) => {
          const successRate = averageScore ? averageScore / 100 : 0;
          const isFilledBar = index < Math.round(quiz.numberOfQuestions * successRate);
          
          return (
            <div
              key={index}
              className={cn(
                "h-full flex-1 transition-all duration-500 group-hover/progress:opacity-95",
                isFilledBar
                  ? "bg-teal-500/70 dark:bg-teal-400/70 group-hover/progress:bg-teal-500/85 dark:group-hover/progress:bg-teal-400/85"
                  : "bg-muted-foreground/15 group-hover/progress:bg-muted-foreground/20"
              )}
            />
          );
        })}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/progress:opacity-100 transition-all duration-200 pointer-events-none">
          <div className="bg-popover rounded-lg shadow-lg px-4 py-3 text-sm text-popover-foreground border">
            <div className="font-medium mb-2">Question Success Rate</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-teal-500/70 dark:bg-teal-400/70" />
                <span className="text-muted-foreground">
                  {averageScore !== null 
                    ? `${Math.round(quiz.numberOfQuestions * (averageScore / 100))} of ${quiz.numberOfQuestions} questions`
                    : 'No data available'}
                </span>
              </div>
              {averageScore !== null && (
                <>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Average Score:</span>
                    <span className={cn(
                      "font-medium",
                      averageScore >= 80 ? "text-green-600 dark:text-green-400" :
                      averageScore >= 60 ? "text-yellow-600 dark:text-yellow-400" :
                      "text-red-600 dark:text-red-400"
                    )}>
                      {averageScore}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Total Submissions:</span>
                    <span className="font-medium">{submissionsCount}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
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

  // Subscribe to quiz changes
  useEffect(() => {
    const unsubscribeActive = subscribeToActiveQuizzes((quizzes) => {
      const sortedQuizzes = (quizzes as SharedQuiz[]).sort((a, b) => 
        a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime()
      );
      setActiveQuizzes(sortedQuizzes);

      // Auto-archive if more than 5 quizzes
      if (sortedQuizzes.length > 5) {
        const quizzesToArchive = sortedQuizzes.slice(0, sortedQuizzes.length - 5);
        
        // Archive oldest quizzes
        Promise.all(quizzesToArchive.map(quiz => archiveQuiz(quiz.id)))
          .then(() => {
            if (quizzesToArchive.length > 0) {
              toast({
                title: 'Quizzes Auto-Archived',
                description: `${quizzesToArchive.length} older ${quizzesToArchive.length === 1 ? 'quiz has' : 'quizzes have'} been archived to maintain the 5-quiz limit.`,
              });
            }
          })
          .catch(error => {
            console.error('Error during auto-archiving:', error);
            toast({
              title: 'Auto-Archive Error',
              description: 'Failed to archive some quizzes automatically.',
              variant: 'destructive'
            });
          });
      }
    });

    const unsubscribeArchived = subscribeToArchivedQuizzes((quizzes) => {
      const sortedQuizzes = (quizzes as SharedQuiz[]).sort((a, b) => 
        a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime()
      );
      setArchivedQuizzes(sortedQuizzes);
    });

    return () => {
      unsubscribeActive();
      unsubscribeArchived();
    };
  }, []);

  const handleArchiveQuiz = async (quiz: SharedQuiz) => {
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
  };

  const handleUnarchiveQuiz = async (quiz: SharedQuiz) => {
    if (activeQuizzes.length >= 5) {
      toast({
        title: "Active Quiz Limit Reached",
        description: "You can only have 5 active quizzes at a time. Please archive an active quiz first.",
        variant: "destructive"
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
      console.error('Error restoring quiz:', error);
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
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl blur-lg opacity-20" />
          <div className="relative">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Quiz Hub
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Manage and monitor your learning platform
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button 
            onClick={() => navigate('/admin/create')}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Quiz
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-950/50 dark:to-blue-950/50">
          <TabsTrigger 
            value="active" 
            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
          >
            <Box className="h-4 w-4" />
            Active Quizzes
          </TabsTrigger>
          <TabsTrigger 
            value="archived" 
            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
          >
            <Archive className="h-4 w-4" />
            Archived Quizzes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {activeQuizzes.length === 0 ? (
            <Card className="border-dashed">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-950/50 dark:to-blue-950/50 flex items-center justify-center mb-4">
                  <PlusCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">No Active Quizzes</CardTitle>
                <CardDescription>Create your first quiz to get started</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeQuizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  type="active"
                  onArchive={() => handleArchiveQuiz(quiz)}
                  onView={() => navigate(`/admin/submissions/${quiz.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-6">
          {archivedQuizzes.length === 0 ? (
            <Card className="border-dashed">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-950/50 dark:to-blue-950/50 flex items-center justify-center mb-4">
                  <Archive className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">No Archived Quizzes</CardTitle>
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
                  onView={() => navigate(`/admin/submissions/${quiz.id}`)}
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