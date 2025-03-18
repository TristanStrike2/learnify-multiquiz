import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createShareLink } from '@/lib/shareLink';
import { Course } from '@/types/quiz';

export default function NameInputPage() {
  const [courseName, setCourseName] = useState('');
  const navigate = useNavigate();
  const { quizId } = useParams();
  const { toast } = useToast();

  // Check for stored modules on mount
  useEffect(() => {
    const storedModules = localStorage.getItem('generatedModules');
    if (!storedModules) {
      toast({
        title: 'Error',
        description: 'No quiz content found. Please generate a quiz first.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courseName.trim()) {
      toast({
        title: 'Course Name Required',
        description: 'Please enter a name for your course.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get the stored modules from localStorage
      const storedData = localStorage.getItem('generatedModules');
      if (!storedData) {
        throw new Error('No modules found. Please generate the quiz again.');
      }
      
      // Parse the stored course data
      const course = JSON.parse(storedData) as Course;
      
      // Update the course name
      const updatedCourse = {
        ...course,
        courseName: courseName.trim()
      };
      
      // Create a new share link with the proper course name and modules
      const { quizId: newQuizId, urlSafeName } = await createShareLink(
        updatedCourse.courseName,
        updatedCourse.modules
      );
      
      // Clear the stored modules
      localStorage.removeItem('generatedModules');
      
      // Navigate to the admin results page
      navigate(`/quiz/${urlSafeName}/${newQuizId}/results/admin`);
    } catch (error) {
      console.error('Error updating course name:', error);
      toast({
        title: 'Error',
        description: 'Failed to update course name. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Name Your Course</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter course name"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">
              Create and Share Course
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 