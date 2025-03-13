import { Course, Module, Question } from '@/types/quiz';

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

const modules: Module[] = [
  {
    id: 'module1',
    title: 'Module 1: Fundamentals',
    content: 'This module covers the fundamental concepts...',
    questions: generateQuestions('module1', 0, 10)
  },
  {
    id: 'module2',
    title: 'Module 2: Advanced Concepts',
    content: 'Building upon the fundamentals, this module explores...',
    questions: generateQuestions('module2', 10, 10)
  }
];

export const courseData: Course = {
  modules
}; 