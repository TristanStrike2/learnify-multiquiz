import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface UserNameInputProps {
  onSubmit: (name: string) => void;
}

export default function UserNameInput({ onSubmit }: UserNameInputProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Enter Your Name</h2>
          <p className="text-sm text-muted-foreground">
            Please enter your name to start the quiz. Multiple users can take this quiz.
          </p>
        </div>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full"
        />
        <Button type="submit" className="w-full" disabled={!name.trim()}>
          Start Quiz
        </Button>
      </form>
    </Card>
  );
} 