import { nanoid } from 'nanoid';
import { Module } from '@/types/quiz';
import { storeQuizData } from './firebase';
import { useQuizSettings } from '@/lib/store';

export interface SharedQuiz {
  id: string;
  courseName: string;
  modules: Module[];
  createdAt: string;
  numberOfQuestions: number;
}

// Function to create a URL-safe version of the course name
const createUrlSafeName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

export const createShareLink = async (courseName: string, modules: Module[]): Promise<{ quizId: string; urlSafeName: string }> => {
  try {
    // Get the current question count from settings
    const { numberOfQuestions } = useQuizSettings.getState();
    
    // Generate a unique ID for the quiz
    const quizId = nanoid(8);
    
    // Create URL-safe version of the course name
    const urlSafeName = createUrlSafeName(courseName);
    
    // Store the quiz data in Firebase with the number of questions
    await storeQuizData(quizId, courseName, modules, numberOfQuestions);
    
    // Return both the quiz ID and URL-safe name
    return { quizId, urlSafeName };
  } catch (error) {
    console.error('Error creating share link:', error);
    throw error;
  }
}; 