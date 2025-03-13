import { nanoid } from 'nanoid';
import { Module } from '@/types/quiz';
import { storeQuizData } from './firebase';

export interface SharedQuiz {
  id: string;
  courseName: string;
  modules: Module[];
  createdAt: string;
}

export const createShareLink = async (courseName: string, modules: Module[]): Promise<string> => {
  try {
    // Generate a unique ID for the quiz
    const quizId = nanoid(8);
    
    // Store the quiz data in Firebase
    await storeQuizData(quizId, courseName, modules);
    
    // Return the quiz ID (the route will be constructed by the component)
    return quizId;
  } catch (error) {
    console.error('Error creating share link:', error);
    throw error;
  }
}; 