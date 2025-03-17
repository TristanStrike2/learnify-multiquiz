import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Settings } from 'lucide-react';
import { QuizSettingsDialog } from './QuizSettingsDialog';
import { useQuizSettings } from '@/contexts/QuizSettingsContext';
import { useToast } from '@/components/ui/use-toast';

interface QuizGeneratorProps {
  onSubmit: (text: string) => Promise<void>;
  isLoading: boolean;
}

export function QuizGenerator({ onSubmit, isLoading }: QuizGeneratorProps) {
  const [text, setText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const { numberOfQuestions } = useQuizSettings();

  const handleSubmit = async () => {
    if (text.length < 100) return;
    await onSubmit(text);
  };

  return (
    <div className="space-y-4 w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Generate Quiz</h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowSettings(true)}
          className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
      <Textarea
        placeholder={`Enter your text here (minimum 100 characters).\nThis will generate ${numberOfQuestions} questions.`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-[200px] resize-none"
        disabled={isLoading}
      />
      <Button
        onClick={handleSubmit}
        disabled={text.length < 100 || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Quiz...
          </>
        ) : (
          'Submit Content'
        )}
      </Button>
      <QuizSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </div>
  );
}
