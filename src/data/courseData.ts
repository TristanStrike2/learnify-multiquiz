import { getQuizSettings } from '@/lib/store';
import { Course, Module, Question } from '@/types/quiz';

const generateQuestions = (moduleId: string, startIndex: number, count: number): Question[] => {
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    questions.push({
      id: `${moduleId}-q${startIndex + i + 1}`,
      text: `Question ${startIndex + i + 1}`,
      options: [
        { id: 'a', text: 'Option A' },
        { id: 'b', text: 'Option B' },
        { id: 'c', text: 'Option C' },
        { id: 'd', text: 'Option D' }
      ],
      correctOptionId: 'a'
    });
  }
  return questions;
};

const { numberOfQuestions } = getQuizSettings();
const questionsPerModule = Math.ceil(numberOfQuestions / 2);

export const courseData: Course = {
  modules: [
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
  ],
  numberOfQuestions
}; 