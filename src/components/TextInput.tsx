import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen } from 'lucide-react';

interface TextInputProps {
  onSubmit: (text: string) => void;
  isLoading?: boolean;
}

const TextInput = ({ onSubmit, isLoading = false }: TextInputProps) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
    }
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    console.log('Input received, length:', newText.length);
    setText(newText);
    if (error) setError(null);
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto animate-fade-in glass-panel">
      <CardHeader>
        <CardTitle className="text-2xl font-medium flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Create a Mini-Course
        </CardTitle>
        <CardDescription>
          Paste in text content to generate a 3-module course with quizzes (minimum 100 characters)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Enter the educational content you want to create a quiz for..."
          className="min-h-[200px] resize-y focus:ring-primary/20 text-base"
          value={text}
          onChange={handleTextChange}
          onPaste={(e) => {
            console.log('Paste event detected');
            const pastedText = e.clipboardData.getData('text');
            console.log('Pasted text length:', pastedText.length);
          }}
        />
        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          Current text length: {text.trim().length} characters
        </p>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading}
          className="px-8 transition-all duration-300 hover:shadow-md"
        >
          {isLoading ? 'Generating...' : 'Generate Quiz'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TextInput;
