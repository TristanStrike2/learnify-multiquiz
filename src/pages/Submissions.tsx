import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToQuizSubmissions, getSharedQuiz } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateSubmissionReport, generatePDF } from '@/lib/pdfGenerator';
import { Download, Share2, Copy, CheckCircle2, FileText, User, Calendar, Trophy, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';

interface QuizSubmission {
  userName: string;
  timestamp: number;
  results: {
    courseName: string;
    modules: any[];
    moduleId?: string;
    totalQuestions: number;
    correctAnswers: number;
    questionsWithAnswers: any[];
  };
}

export function SubmissionsPage() {
  const { quizId } = useParams();
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);

  useEffect(() => {
    if (!quizId) return;

    // Subscribe to real-time updates
    const unsubscribe = subscribeToQuizSubmissions(quizId, (newSubmissions) => {
      setSubmissions(newSubmissions);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [quizId]);

  const handleDownloadPDF = async () => {
    if (!submissions.length) return;
    
    try {
      // Filter out submissions with invalid scores for PDF generation
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
          // Calculate percentage safely
          const correctAnswers = sub.results.correctAnswers || 0;
          const totalQuestions = sub.results.totalQuestions || 1; // Avoid division by zero
          const percentage = Math.round((correctAnswers / totalQuestions) * 100);
          
          return {
            userName: sub.userName || 'Unknown User',
            date: format(new Date(sub.timestamp || Date.now()), 'PPP'),
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
    const shareUrl = `${window.location.origin}/quiz/${quizId}`;
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

  const getAverageScore = () => {
    if (!submissions.length) return 0;
    
    // Filter out submissions with invalid scores
    const validSubmissions = submissions.filter(
      sub => sub.results && 
      typeof sub.results.correctAnswers === 'number' && 
      typeof sub.results.totalQuestions === 'number' && 
      sub.results.totalQuestions > 0
    );
    
    if (!validSubmissions.length) return 0;
    
    const totalPercentage = validSubmissions.reduce((acc, sub) => 
      acc + (sub.results.correctAnswers / sub.results.totalQuestions) * 100, 0);
    return Math.round(totalPercentage / validSubmissions.length);
  };

  const handleDownloadUserPDF = async (submission: QuizSubmission) => {
    try {
      // First check if we have all the required data
      if (!submission || !submission.results) {
        throw new Error('Submission data is missing or incomplete');
      }

      // Ensure questionsWithAnswers exists and is an array
      if (!Array.isArray(submission.results.questionsWithAnswers)) {
        throw new Error('Question data is missing or incomplete');
      }

      const pdfData = {
        userName: submission.userName || 'Unknown User',
        courseName: submission.results.courseName || 'Quiz Results',
        modules: submission.results.modules || [],
        results: {
          [submission.results.moduleId || 'module1']: {
            moduleId: submission.results.moduleId || 'module1',
            totalQuestions: submission.results.totalQuestions || 0,
            correctAnswers: submission.results.correctAnswers || 0,
            incorrectAnswers: (submission.results.totalQuestions || 0) - (submission.results.correctAnswers || 0),
            questionsWithAnswers: submission.results.questionsWithAnswers.map((qa: any) => {
              if (!qa || !qa.question) {
                return {
                  question: {
                    text: 'Unknown question',
                    correctOptionId: 'correct',
                    options: [{ id: 'correct', text: 'Unknown' }]
                  },
                  selectedOptionId: 'unknown',
                  isCorrect: false
                };
              }

              // Create options array with proper structure
              const options = qa.options?.map((opt: any, i: number) => ({
                id: opt.id || (opt.isCorrect ? 'correct' : `wrong${i}`),
                text: opt.text || opt
              })) || [{ id: 'correct', text: qa.correctAnswer || 'Unknown' }];

              return {
                question: {
                  text: qa.question,
                  correctOptionId: 'correct',
                  options
                },
                selectedOptionId: qa.selectedOptionId || (qa.isCorrect ? 'correct' : 'wrong0'),
                isCorrect: qa.isCorrect || false
              };
            })
          }
        }
      };
      
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

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Quiz Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Monitor quiz submissions and performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={() => navigate('/')}
            className="bg-green-600 hover:bg-green-700"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Quiz
          </Button>
          <div className="flex gap-4">
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
              {getAverageScore()}%
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
                ? format(new Date(submissions[0].timestamp), 'PPP')
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
          submissions.map((submission, index) => {
            // Calculate percentage safely with validation
            const percentage = submission.results && 
              typeof submission.results.correctAnswers === 'number' && 
              typeof submission.results.totalQuestions === 'number' && 
              submission.results.totalQuestions > 0
                ? Math.round((submission.results.correctAnswers / submission.results.totalQuestions) * 100)
                : 0;
            
            return (
              <Card 
                key={submission.timestamp}
                className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-900/50"
              >
                <CardHeader className="border-b bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                      <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{submission.userName}</CardTitle>
                      <CardDescription>
                        {format(new Date(submission.timestamp), 'PPP pp')}
                      </CardDescription>
                    </div>
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
                <CardFooter className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-950/20 dark:to-background border-t flex justify-center p-4">
                  <Button 
                    variant="outline" 
                    className="w-auto px-6 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    onClick={() => handleDownloadUserPDF(submission)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Download Results PDF
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
                <code className="flex-1 text-purple-800 dark:text-purple-200">
                  {`${window.location.origin}/quiz/${quizId}`}
                </code>
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 transition-opacity" />
                ) : (
                  <Copy className="h-4 w-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Recipients can take the quiz and their results will appear on your dashboard
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}