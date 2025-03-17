import * as zustand from 'zustand';

interface QuizSettings {
  numberOfQuestions: number;
  setNumberOfQuestions: (count: number) => void;
}

export const useQuizSettings = zustand.create<QuizSettings>()((set) => ({
  numberOfQuestions: 15,
  setNumberOfQuestions: (count: number) => set({ numberOfQuestions: count }),
}));

// Export getState for non-component usage
export const getQuizSettings = () => useQuizSettings.getState(); 