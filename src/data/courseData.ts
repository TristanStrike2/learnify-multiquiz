import { Course, Module, Question } from '@/types/quiz';
import { useQuizSettings } from '@/lib/store';

const generateQuestions = (moduleId: string, startIndex: number, count: number): Question[] => {
  const questions = Array.from({ length: count }, (_, i) => ({
    id: `${moduleId}-q${startIndex + i + 1}`,
    text: `Question ${startIndex + i + 1} for ${moduleId}`,
    options: [
      { id: 'A', text: 'Option A' },
      { id: 'B', text: 'Option B' },
      { id: 'C', text: 'Option C' },
      { id: 'D', text: 'Option D' }
    ],
    correctOptionId: 'A' // This should be randomized in a real implementation
  }));
  
  console.log(`Generated ${questions.length} questions for ${moduleId}`);
  return questions;
};

// Get the number of questions from settings
const { numberOfQuestions } = useQuizSettings.getState();

const questionsPerModule = Math.ceil(numberOfQuestions / 2); // Split questions between two modules

const modules: Module[] = [
  {
    id: 'module1',
    title: 'Module 1: Fundamentals',
    content: 'This module covers the fundamental concepts...',
    questions: generateQuestions('module1', 0, questionsPerModule)
  },
  {
    id: 'module2',
    title: 'Module 2: Advanced Concepts',
    content: 'Building upon the fundamentals, this module explores...',
    questions: generateQuestions('module2', questionsPerModule, numberOfQuestions - questionsPerModule)
  }
];

export const courseData: Course = {
  modules,
  numberOfQuestions
}; 