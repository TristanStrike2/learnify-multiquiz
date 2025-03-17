import { create } from 'zustand';

interface QuizSettings {
  numberOfQuestions: number;
  setNumberOfQuestions: (count: number) => void;
}

// Create the store without persistence initially
export const useQuizSettings = create<QuizSettings>((set) => ({
  numberOfQuestions: 15, // Default value
  setNumberOfQuestions: (count: number) => set({ numberOfQuestions: count }),
})); 