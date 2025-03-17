import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

interface QuizSettings {
  numberOfQuestions: number;
  setNumberOfQuestions: (count: number) => void;
}

// Create a vanilla store
const store = createStore<QuizSettings>((set) => ({
  numberOfQuestions: 15,
  setNumberOfQuestions: (count: number) => set({ numberOfQuestions: count }),
}));

// Export a hook that uses the store
export const useQuizSettings = () => useStore(store); 