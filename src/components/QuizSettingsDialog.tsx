import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuizSettings } from '@/contexts/QuizSettingsContext';
import { useToast } from '@/components/ui/use-toast';

export function QuizSettingsDialog() {
  const { numberOfQuestions, setNumberOfQuestions } = useQuizSettings();
  const [inputValue, setInputValue] = useState(numberOfQuestions.toString());
  const { toast } = useToast();

  const handleSave = () => {
    const num = parseInt(inputValue);
    if (isNaN(num)) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid number between 10 and 50.",
        variant: "destructive",
      });
      return;
    }
    
    if (num < 10 || num > 50) {
      toast({
        title: "Invalid Range",
        description: "Number of questions must be between 10 and 50.",
        variant: "destructive",
      });
      return;
    }

    setNumberOfQuestions(num);
    toast({
      title: "Settings Saved",
      description: `Number of questions set to ${num}.`,
    });
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-purple-50/30 dark:from-background dark:to-purple-950/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Quiz Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure your quiz generation settings
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="questions">Number of Questions</Label>
            <Input
              id="questions"
              type="number"
              min={10}
              max={50}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter number (10-50)"
              className="col-span-3"
            />
            <p className="text-sm text-muted-foreground">
              Choose a number between 10 and 50 questions.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => {}}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 