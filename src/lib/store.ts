import { create } from 'zustand';

interface QuizSettings {
  numberOfQuestions: number;
  setNumberOfQuestions: (count: number) => void;
}

// Create the store using standard Zustand
export const useQuizSettings = create<QuizSettings>((set) => ({
  numberOfQuestions: 15,
  setNumberOfQuestions: (count: number) => set({ numberOfQuestions: count }),
}));

// Export getState for non-component usage
export const getQuizSettings = () => useQuizSettings.getState(); 