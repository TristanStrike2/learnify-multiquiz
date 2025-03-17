import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
); 