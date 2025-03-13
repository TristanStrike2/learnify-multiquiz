import type { QuizSubmission } from '@/lib/shareLink';
import type { QuizResult, Module, ModuleResult } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { generatePDF, type PDFGeneratorParams } from '@/lib/pdfGenerator';
import { useToast } from '@/components/ui/use-toast';

interface SubmissionsListProps {
  submissions: QuizSubmission[];
  currentQuizId?: string;
  modules: Module[];
}

interface GroupedSubmissions {
  [courseName: string]: {
    [quizId: string]: {
      submissions: QuizSubmission[];
      date: string;
    };
  };
}

export function SubmissionsList({ submissions, currentQuizId, modules }: SubmissionsListProps) {
  const { toast } = useToast();
  
  // Group submissions by course name and quiz ID
  const groupedSubmissions = submissions.reduce<GroupedSubmissions>((acc, submission) => {
    const courseName = submission.courseName || 'Unnamed Course';
    const quizId = submission.quizId;
    
    if (!acc[courseName]) {
      acc[courseName] = {};
    }
    
    if (!acc[courseName][quizId]) {
      acc[courseName][quizId] = {
        submissions: [],
        date: submission.date // Use the first submission's date as quiz creation date
      };
    }
    
    acc[courseName][quizId].submissions.push(submission);
    return acc;
  }, {});

  // Sort submissions within each quiz by date
  Object.values(groupedSubmissions).forEach(quizGroups => {
    Object.values(quizGroups).forEach(group => {
      group.submissions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  });

  // Calculate average score for a submission
  const calculateAverageScore = (results: Record<string, QuizResult>) => {
    const scores = Object.values(results).map(result => 
      result.correctAnswers / result.totalQuestions
    );
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const handleViewPDF = async (userName: string, courseName: string, results: Record<string, QuizResult>) => {
    try {
      const params: PDFGeneratorParams = {
        userName,
        courseName,
        modules,
        results
      };
      
      const pdfUrl = await generatePDF(params);
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: `Failed to generate PDF: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  if (Object.keys(groupedSubmissions).length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No submissions yet
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {Object.entries(groupedSubmissions).map(([courseName, quizGroups]) => (
        <div key={courseName} className="space-y-8">
          <h2 className="text-2xl font-bold border-b pb-2">{courseName}</h2>
          {Object.entries(quizGroups).map(([quizId, group]) => (
            <div key={quizId} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Quiz Session
                    {currentQuizId === quizId && (
                      <Badge variant="secondary" className="ml-2">Current</Badge>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Created {formatDate(group.date)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.submissions.map((submission, index) => (
                  <Card 
                    key={`${submission.quizId}-${index}`}
                    className={currentQuizId === quizId ? 'border-primary' : ''}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">{submission.userName}</CardTitle>
                      <CardDescription>
                        Submitted {formatDate(submission.date)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium">Average Score</p>
                          <p className="text-2xl font-bold">
                            {Math.round(calculateAverageScore(submission.results) * 100)}%
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Module Scores</p>
                          {Object.entries(submission.results).map(([moduleId, result]) => (
                            <div key={moduleId} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Module {parseInt(moduleId.replace('module', ''))}
                              </span>
                              <span className="font-medium">
                                {Math.round((result.correctAnswers / result.totalQuestions) * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => handleViewPDF(
                            submission.userName,
                            submission.courseName,
                            submission.results
                          )}
                        >
                          <FileText className="h-4 w-4" />
                          View Results PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
} 