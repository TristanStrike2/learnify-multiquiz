import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface QuizGeneratorProps {
  onGenerate: (text: string) => Promise<void>;
  isLoading?: boolean;
}

export default function QuizGenerator({ onGenerate, isLoading = false }: QuizGeneratorProps) {
  const [text, setText] = useState('');
  const { toast } = useToast();

  const handleSubmit = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      toast({
        title: 'Error',
        description: 'Please enter some text content to generate a quiz.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedText.length < 100) {
      toast({
        title: 'Error',
        description: 'Please enter at least 100 characters of text to generate a meaningful quiz.',
        variant: 'destructive',
      });
      return;
    }

    await onGenerate(trimmedText);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Generate Quiz</h2>
          <p className="text-sm text-muted-foreground">
            Enter your educational content below, and we'll generate a quiz for you.
          </p>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your educational content here (minimum 100 characters)..."
          className="min-h-[200px]"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || text.trim().length < 100}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Quiz'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
