import { Button } from '@/components/ui/button';
import { Share2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Module } from '@/types/quiz';
import { createShareLink } from '@/lib/shareLink';
import { useState } from 'react';

interface ShareCourseButtonProps {
  modules: Module[];
  courseName?: string;
}

export function ShareCourseButton({ modules, courseName = "Generated Course" }: ShareCourseButtonProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!modules || modules.length === 0) {
      toast({
        title: 'Cannot share empty quiz',
        description: 'Please add some questions first.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSharing(true);
    try {
      const quizId = await createShareLink(courseName, modules);
      const fullUrl = `${window.location.origin}/quiz/${quizId}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(fullUrl);
      
      toast({
        title: 'Link Copied!',
        description: 'Share this link with others to let them take the quiz.',
      });
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: 'Failed to share quiz',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Button 
      onClick={handleShare} 
      variant="outline" 
      className="gap-2"
      disabled={isSharing}
    >
      {isSharing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      {isSharing ? 'Sharing...' : 'Share Quiz'}
    </Button>
  );
}