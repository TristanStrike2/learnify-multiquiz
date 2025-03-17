import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QuizSettings {
  numberOfQuestions: number;
  setNumberOfQuestions: (count: number) => void;
}

export const useQuizSettings = create<QuizSettings>()(
  persist(
    (set) => ({
      numberOfQuestions: 15, // Default value
      setNumberOfQuestions: (count: number) => set({ numberOfQuestions: count }),
    }),
    {
      name: 'quiz-settings',
    }
  )
); 