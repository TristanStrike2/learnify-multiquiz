import { nanoid } from 'nanoid';
import { Module, Course } from '@/types/quiz';
import { storeQuizData } from '@/lib/firebase';
import { getQuizSettings } from '@/contexts/QuizSettingsContext';

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
    // Log input parameters
    console.log('createShareLink input:', {
      courseName,
      modulesLength: modules?.length,
      firstModule: modules?.[0] ? {
        id: modules[0].id,
        title: modules[0].title,
        questionsLength: modules[0].questions?.length
      } : null
    });

    // Get the current question count from settings
    const { numberOfQuestions } = getQuizSettings();
    
    console.log('Quiz settings:', { numberOfQuestions });
    
    // Generate a unique ID for the quiz
    const quizId = nanoid(8);
    
    // Create URL-safe version of the course name
    const urlSafeName = createUrlSafeName(courseName);
    
    console.log('Generated IDs:', { quizId, urlSafeName });
    
    // Store the quiz data in Firebase with the number of questions
    await storeQuizData(quizId, courseName, modules, numberOfQuestions);
    
    // Return both the quiz ID and URL-safe name
    return { quizId, urlSafeName };
  } catch (error) {
    console.error('Error creating share link:', error);
    throw error;
  }
}; 