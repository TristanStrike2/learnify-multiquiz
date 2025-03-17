import React, { createContext, useContext, useState } from 'react';

interface QuizSettings {
  numberOfQuestions: number;
  setNumberOfQuestions: (count: number) => void;
}

const QuizSettingsContext = createContext<QuizSettings>({
  numberOfQuestions: 15,
  setNumberOfQuestions: () => {}
});

export function QuizSettingsProvider({ children }: { children: React.ReactNode }) {
  const [numberOfQuestions, setNumberOfQuestions] = useState(15);
  const value = { numberOfQuestions, setNumberOfQuestions };

  return (
    <QuizSettingsContext.Provider value={value}>
      {children}
    </QuizSettingsContext.Provider>
  );
}

export function useQuizSettings(): QuizSettings {
  const context = useContext(QuizSettingsContext);
  if (!context) {
    throw new Error('useQuizSettings must be used within a QuizSettingsProvider');
  }
  return context;
}

// For non-component usage
let currentSettings = { numberOfQuestions: 15 };
export const getQuizSettings = () => currentSettings;
export const updateQuizSettings = (settings: typeof currentSettings) => {
  currentSettings = settings;
}; 