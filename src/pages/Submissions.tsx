import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { subscribeToQuizSubmissions, getSharedQuiz, deleteQuizSubmission } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateSubmissionReport, generatePDF } from '@/lib/pdfGenerator';
import { Download, Share2, Copy, CheckCircle2, FileText, User, Calendar, Trophy, PlusCircle, Trash2, Eye, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { DocumentData } from 'firebase/firestore';

interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  correctOptionId: string;
}

interface QuizModule {
  id: string;
  title: string;
  content: string;
  questions: QuizQuestion[];
}

interface QuestionWithAnswer {
  question: {
    text: string;
    correctOptionId: string;
    options: QuizOption[];
  };
  selectedOptionId: string;
  isCorrect: boolean;
  isTimeout: boolean;
}

interface QuizResults {
  correctAnswers: number;
  totalQuestions: number;
  incorrectAnswers: number;
  moduleId: string;
  courseName: string;
  modules: QuizModule[];
  questionsWithAnswers: QuestionWithAnswer[];
  answers?: Record<string, string>;
}

interface QuizSubmission {
  userName: string;
  timestamp: any; // Can be Firestore Timestamp, number, or string
  results: QuizResults;
}

function getValidDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  
  // Handle Firestore Timestamp
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // Handle numeric timestamp
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  // Handle string timestamp
  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }
  }
  
  // Fallback to current date
  return new Date();
}

function QuizResultsModal({ 
  submission, 
  isOpen, 
  onClose 
}: { 
  submission: QuizSubmission | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!submission) return null;

  // Validate submission data
  const hasValidData = submission.results && 
    submission.results.questionsWithAnswers && 
    Array.isArray(submission.results.questionsWithAnswers) &&
    submission.results.questionsWithAnswers.length > 0;

  if (!hasValidData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gradient-to-br from-white to-purple-50/30 dark:from-background dark:to-purple-950/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
              <User className="h-5 w-5" />
              {submission.userName}'s Quiz Results
            </DialogTitle>
            <DialogDescription className="text-destructive">
              Error: Unable to load quiz results. The data appears to be incomplete or corrupted.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const percentage = Math.round((submission.results.correctAnswers / submission.results.totalQuestions) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-white to-purple-50/30 dark:from-background dark:to-purple-950/10">
        <div className="flex flex-col space-y-8">
          <div className="flex items-center justify-between gap-6 pr-8">
            <DialogHeader className="flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {submission.userName}'s Quiz Results
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-1">
                    Completed on {format(getValidDate(submission.timestamp), 'PPP')}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex items-center gap-8 px-8 py-4 rounded-lg bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background border border-purple-100 dark:border-purple-900/50">
              <div className="text-center">
                <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-1">Score</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {submission.results.correctAnswers} / {submission.results.totalQuestions}
                </p>
              </div>
              <div className="h-14 w-px bg-purple-200 dark:bg-purple-800" />
              <div className="text-center">
                <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-1">Percentage</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {percentage}%
                </p>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[65vh] pr-4 -mr-4">
            <div className="space-y-6">
              {submission.results.questionsWithAnswers.map((qa, index) => {
                const selectedOption = qa.question.options.find(opt => opt.id === qa.selectedOptionId);
                const correctOption = qa.question.options.find(opt => opt.id === qa.question.correctOptionId);
                
                return (
                  <Card key={index} className={`border-l-4 overflow-hidden transition-all duration-200 ${
                    qa.isTimeout
                      ? 'border-l-yellow-500'
                      : qa.isCorrect
                      ? 'border-l-green-500'
                      : 'border-l-red-500'
                  }`}>
                    <CardHeader className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-950/20 dark:to-background py-4">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base flex-1 pr-4">
                          Question {index + 1}: {qa.question.text}
                        </CardTitle>
                        {qa.isTimeout ? (
                          <span className="px-2 py-1 rounded text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 whitespace-nowrap">
                            Timed Out
                          </span>
                        ) : qa.isCorrect ? (
                          <span className="px-2 py-1 rounded text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 whitespace-nowrap">
                            Correct
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-sm bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 whitespace-nowrap">
                            Incorrect
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        {qa.question.options.map((option) => (
                          <div
                            key={option.id}
                            className={`p-3 rounded-lg border ${
                              option.id === qa.question.correctOptionId
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                : option.id === qa.selectedOptionId && !qa.isCorrect
                                ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                : 'bg-white dark:bg-background border-gray-200 dark:border-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`${
                                option.id === qa.question.correctOptionId
                                  ? 'text-green-800 dark:text-green-200'
                                  : option.id === qa.selectedOptionId && !qa.isCorrect
                                  ? 'text-red-800 dark:text-red-200'
                                  : ''
                              }`}>
                                {option.text}
                              </span>
                              {option.id === qa.question.correctOptionId && (
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SubmissionsPage() {
  const { quizId, userName, courseName } = useParams();
  const location = useLocation();
  const [submissions, setSubmissions] = useState<(QuizSubmission & { id: string })[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<{ id: string; userName: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<QuizSubmission | null>(null);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  
  // More robust admin check
  const isAdmin = useMemo(() => {
    const path = location.pathname;
    console.log('Checking admin status for path:', path);
    const isAdminRoute = path.includes('/admin/') || path.endsWith('/results/admin');
    console.log('Is admin route?', isAdminRoute);
    return isAdminRoute;
  }, [location.pathname]);

  // Debug effect
  useEffect(() => {
    console.log('Current path:', location.pathname);
    console.log('Admin status:', isAdmin);
    console.log('URL params:', { quizId, userName, courseName });
  }, [location.pathname, isAdmin, quizId, userName, courseName]);

  useEffect(() => {
    if (!quizId) return;

    console.log('Setting up subscription for quiz:', quizId);
    const unsubscribe = subscribeToQuizSubmissions(quizId, (submissions) => {
      // Transform submissions to include their IDs
      const submissionsWithIds = submissions.map(doc => {
        // Handle both QueryDocumentSnapshot and raw data
        const data = doc.data ? doc.data() : doc;
        console.log('Processing submission:', { id: doc.id || data.id, data });
        
        // Validate submission data
        if (!data || !data.userName || !data.results) {
          console.warn('Invalid submission data:', data);
          return null;
        }

        // Create a properly structured submission object
        const submissionObj = {
          id: doc.id || data.id,
          userName: data.userName,
          timestamp: data.timestamp,
          results: {
            correctAnswers: data.results.correctAnswers || 0,
            totalQuestions: data.results.totalQuestions || 0,
            incorrectAnswers: data.results.incorrectAnswers || 0,
            moduleId: data.results.moduleId,
            questionsWithAnswers: Array.isArray(data.results.questionsWithAnswers) 
              ? data.results.questionsWithAnswers 
              : [],
            courseName: data.results.courseName,
            modules: Array.isArray(data.results.modules) 
              ? data.results.modules 
              : []
          }
        };

        console.log('Processed submission object:', submissionObj);
        return submissionObj;
      }).filter(Boolean) as (QuizSubmission & { id: string })[];
      
      console.log('Final submissions array:', submissionsWithIds);
      setSubmissions(submissionsWithIds);
      
      // Calculate average score
      if (submissionsWithIds.length > 0) {
        const totalScore = submissionsWithIds.reduce((acc, sub) => {
          if (!sub.results || typeof sub.results.correctAnswers !== 'number' || typeof sub.results.totalQuestions !== 'number') {
            console.warn('Invalid submission data for average calculation:', sub);
            return acc;
          }
          const correctAnswers = sub.results.correctAnswers;
          const totalQuestions = sub.results.totalQuestions;
          if (totalQuestions === 0) {
            console.warn('Submission has 0 total questions:', sub);
            return acc;
          }
          return acc + (correctAnswers / totalQuestions) * 100;
        }, 0);
        const average = Math.round(totalScore / submissionsWithIds.length);
        console.log('Calculated average score:', average);
        setAverageScore(average);
      } else {
        console.log('No submissions found, setting average to null');
        setAverageScore(null);
      }
    });

    return () => {
      console.log('Cleaning up subscription for quiz:', quizId);
      unsubscribe();
    };
  }, [quizId]);

  const handleDownloadPDF = async () => {
    if (!submissions.length) return;
    
    try {
      const validSubmissions = submissions.filter(
        sub => sub.results && 
        typeof sub.results.correctAnswers === 'number' && 
        typeof sub.results.totalQuestions === 'number' && 
        sub.results.totalQuestions > 0
      );
      
      if (!validSubmissions.length) {
        throw new Error('No valid submission data available');
      }
      
      const pdfData = {
        courseName: 'Quiz Results',
        submissions: validSubmissions.map(sub => {
          const correctAnswers = sub.results.correctAnswers || 0;
          const totalQuestions = sub.results.totalQuestions || 1;
          const percentage = Math.round((correctAnswers / totalQuestions) * 100);
          
          return {
            userName: sub.userName || 'Unknown User',
            date: format(getValidDate(sub.timestamp), 'PPP'),
            score: `${correctAnswers}/${totalQuestions}`,
            percentage: isNaN(percentage) ? 0 : percentage
          };
        })
      };
      
      await generateSubmissionReport(pdfData);
      
      toast({
        title: 'PDF Generated',
        description: 'Your results have been downloaded successfully.',
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/quiz/${courseName}/${quizId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link Copied!',
        description: 'Share this link with others to let them take the quiz.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadUserPDF = async (submission: QuizSubmission) => {
    try {
      // First check if we have all the required data
      if (!submission || !submission.results) {
        throw new Error('Submission data is missing or incomplete');
      }

      // Ensure we have all required fields
      if (!submission.results.questionsWithAnswers || 
          !Array.isArray(submission.results.questionsWithAnswers) ||
          !submission.results.modules ||
          !Array.isArray(submission.results.modules)) {
        throw new Error('Question data is missing or incomplete');
      }

      // Log the submission data for debugging
      console.log('Processing submission for PDF:', {
        userName: submission.userName,
        courseName: submission.results.courseName,
        totalQuestions: submission.results.totalQuestions,
        correctAnswers: submission.results.correctAnswers
      });

      // Create properly structured PDF data
      const pdfData = {
        userName: submission.userName || 'Unknown User',
        courseName: submission.results.courseName || 'Quiz Results',
        modules: submission.results.modules,
        results: {
          [submission.results.moduleId]: {
            moduleId: submission.results.moduleId,
            totalQuestions: submission.results.totalQuestions,
            correctAnswers: submission.results.correctAnswers,
            incorrectAnswers: submission.results.incorrectAnswers,
            questionsWithAnswers: submission.results.questionsWithAnswers.map(qa => {
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
      
      const result = await generatePDF(pdfData);
      
      // If result is a data URL (fallback for some browsers), create a download link
      if (result !== 'success') {
        const link = document.createElement('a');
        link.href = result;
        link.download = `${submission.userName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_quiz_results.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast({
        title: 'PDF Generated',
        description: `Results for ${submission.userName} have been downloaded successfully.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const handleDeleteClick = (submissionId: string, userName: string) => {
    setSubmissionToDelete({ id: submissionId, userName });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!quizId || !submissionToDelete) return;

    try {
      await deleteQuizSubmission(quizId, submissionToDelete.id);
      toast({
        title: 'Submission Deleted',
        description: `${submissionToDelete.userName}'s submission has been permanently deleted.`,
      });
      setShowDeleteModal(false);
      setSubmissionToDelete(null);
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete submission. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleViewResults = (submission: QuizSubmission) => {
    setSelectedSubmission(submission);
  };

  return (
    <div className="min-h-screen">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex flex-col space-y-8">
          <div>
            <Button 
              onClick={() => navigate('/admin/manage')}
              variant="outline"
              className="border-purple-200 mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Hub
            </Button>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Quiz Results
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  Track performance and engagement
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleDownloadPDF} 
                  disabled={!submissions.length}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
                <Button onClick={handleShare} variant="outline" className="border-purple-200">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Quiz
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background border-purple-100 dark:border-purple-900/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle>Total Submissions</CardTitle>
                    <CardDescription>Number of completed quizzes</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                  {submissions.length}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background border-blue-100 dark:border-blue-900/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Trophy className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle>Average Score</CardTitle>
                    <CardDescription>Across all submissions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {averageScore ? `${averageScore}%` : 'N/A'}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background border-green-100 dark:border-green-900/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle>Latest Submission</CardTitle>
                    <CardDescription>Most recent quiz completion</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-green-600 dark:text-green-400">
                  {submissions.length > 0 
                    ? format(getValidDate(submissions[0].timestamp), 'PPP')
                    : 'No submissions yet'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {submissions.length === 0 ? (
              <Card className="col-span-full bg-gradient-to-br from-gray-50 to-white dark:from-gray-950/20 dark:to-background">
                <CardHeader className="text-center">
                  <CardTitle>No Submissions Yet</CardTitle>
                  <CardDescription>Share the quiz link to start receiving submissions</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              submissions.map((submission) => {
                const percentage = submission.results && 
                  typeof submission.results.correctAnswers === 'number' && 
                  typeof submission.results.totalQuestions === 'number' && 
                  submission.results.totalQuestions > 0
                    ? Math.round((submission.results.correctAnswers / submission.results.totalQuestions) * 100)
                    : 0;
                
                return (
                  <Card 
                    key={submission.id}
                    className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-900/50"
                  >
                    <CardHeader className="border-b bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
                      <div className="flex items-center justify-between relative">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {submission.userName}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(getValidDate(submission.timestamp), 'PPP')}
                          </CardDescription>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 text-red-500 hover:text-red-50 hover:bg-red-500 dark:text-red-400 dark:hover:text-red-50 dark:hover:bg-red-500 transition-all duration-200 p-2.5 h-auto w-auto"
                            onClick={() => handleDeleteClick(submission.id, submission.userName)}
                          >
                            <Trash2 className="h-6 w-6" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">Score</span>
                            <span className={`font-medium ${getScoreColor(percentage)}`}>
                              {submission.results.correctAnswers}/{submission.results.totalQuestions}
                            </span>
                          </div>
                          <Progress 
                            value={percentage} 
                            className="h-2"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Percentage</span>
                          <span className={`text-lg font-semibold ${getScoreColor(percentage)}`}>
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-950/20 dark:to-background border-t flex justify-center gap-2 p-4">
                      <Button 
                        variant="outline" 
                        className="w-auto px-6 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                        onClick={() => handleViewResults(submission)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Results
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-auto px-6 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                        onClick={() => handleDownloadUserPDF(submission)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>

          <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
            <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-purple-50/30 dark:from-background dark:to-purple-950/10">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Share Quiz
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Share this quiz with others to collect their responses
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background border border-purple-100 dark:border-purple-900/50">
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">Quiz Link</p>
                  <button
                    onClick={handleCopyLink}
                    className="w-full text-left font-mono bg-white dark:bg-background hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors p-3 rounded-md flex items-center gap-2 group border border-purple-100 dark:border-purple-900/50"
                  >
                    <code className="flex-1 text-purple-800 dark:text-purple-200 break-all text-sm">
                      {`${window.location.origin}/quiz/${courseName}/${quizId}`}
                    </code>
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500 transition-opacity" />
                    ) : (
                      <Copy className="h-4 w-4 shrink-0 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Recipients can take the quiz and their results will appear on your dashboard
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Submission</DialogTitle>
                <DialogDescription className="text-destructive">
                  Are you sure you want to delete {submissionToDelete?.userName}'s submission? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                >
                  Delete Permanently
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <QuizResultsModal
            submission={selectedSubmission}
            isOpen={!!selectedSubmission}
            onClose={() => setSelectedSubmission(null)}
          />
        </div>
      </div>
    </div>
  );
}