// Add type declaration at the top of the file
declare global {
  interface Window {
    _firebaseInitError?: Error;
  }
}

import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase, ref, set, onValue, off, get } from 'firebase/database';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { Module } from '@/types/quiz';

// Debug function to safely log environment variables
const debugEnvVariables = () => {
  console.log('Environment Mode:', import.meta.env.MODE);
  console.log('Base URL:', import.meta.env.BASE_URL);
  console.log('Available env variables:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
};

// Validate environment variables
const validateEnvVariables = () => {
  debugEnvVariables();

  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };

  // Check each configuration value
  const missing = Object.entries(config)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error('Missing Firebase configuration values:', missing);
    console.error('Current config (sanitized):', {
      ...config,
      apiKey: config.apiKey ? '***' : undefined,
      appId: config.appId ? '***' : undefined
    });
    throw new Error(`Missing Firebase configuration values: ${missing.join(', ')}`);
  }

  return config;
};

let app;
let analytics;
let database;
let firestore;

try {
  console.log('Initializing Firebase...');
  const firebaseConfig = validateEnvVariables();
  
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
  
  try {
    analytics = getAnalytics(app);
    console.log('Analytics initialized successfully');
  } catch (analyticsError) {
    console.warn('Analytics initialization failed:', analyticsError);
    // Continue without analytics
  }

  try {
    database = getDatabase(app);
    firestore = getFirestore(app);
    console.log('Database and Firestore initialized successfully');
  } catch (dbError) {
    console.error('Database initialization failed:', dbError);
    throw dbError;
  }
} catch (error) {
  console.error('Firebase initialization failed:', error);
  // Instead of throwing, we'll set a global flag
  window._firebaseInitError = error;
  // Create dummy implementations to prevent crashes
  database = null;
  firestore = null;
}

// Modify all database operations to check for initialization
const checkDatabase = () => {
  if (!database) {
    const error = window._firebaseInitError || new Error('Firebase not initialized');
    throw error;
  }
};

// Store quiz data
export async function storeQuizData(quizId: string, courseName: string, modules: Module[]) {
  try {
    console.log('Storing quiz data:', {
      quizId,
      courseName,
      moduleCount: modules.length,
      firstModuleQuestions: modules[0]?.questions?.length
    });
    
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }
    
    const quizRef = doc(collection(firestore, 'quizzes'), quizId);
    const quizData = {
      courseName,
      modules,
      numberOfQuestions: modules[0]?.questions?.length || 0,
      createdAt: serverTimestamp()
    };
    
    await setDoc(quizRef, quizData);
    console.log('Successfully stored quiz data');
    
    return true;
  } catch (error) {
    console.error('Error storing quiz data:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      quizId,
      courseName
    });
    throw error;
  }
}

// Get shared quiz
export async function getSharedQuiz(quizId: string) {
  try {
    console.log('Fetching shared quiz:', quizId);
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }
    
    const quizRef = doc(collection(firestore, 'quizzes'), quizId);
    const quizDoc = await getDoc(quizRef);
    
    if (!quizDoc.exists()) {
      console.error('Quiz document not found:', quizId);
      return null;
    }
    
    const quizData = quizDoc.data();
    console.log('Retrieved quiz data:', {
      id: quizId,
      exists: quizDoc.exists(),
      dataFields: Object.keys(quizData || {}),
      hasModules: Boolean(quizData?.modules),
      moduleCount: quizData?.modules?.length,
      numberOfQuestions: quizData?.numberOfQuestions
    });
    
    return quizData;
  } catch (error) {
    console.error('Error fetching shared quiz:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      quizId
    });
    throw error;
  }
}

// Store quiz submission
export const storeQuizSubmission = async (
  quizId: string,
  userName: string,
  results: any
) => {
  checkDatabase();
  try {
    const quiz = await getSharedQuiz(quizId);
    const submissionRef = ref(database!, `submissions/${quizId}/${Date.now()}_${userName}`);
    await set(submissionRef, {
      userName,
      timestamp: Date.now(),
      results: {
        ...results,
        modules: quiz?.modules || [],
        courseName: quiz?.courseName || 'Quiz Results'
      }
    });
    return true;
  } catch (error) {
    console.error('Error storing quiz submission:', error);
    throw error;
  }
};

// Get quiz submissions
export const subscribeToQuizSubmissions = (
  quizId: string,
  callback: (submissions: any[]) => void
) => {
  checkDatabase();
  const submissionsRef = ref(database!, `submissions/${quizId}`);
  
  onValue(submissionsRef, (snapshot) => {
    const data = snapshot.val();
    const submissions = data ? Object.values(data) : [];
    callback(submissions);
  });

  // Return unsubscribe function
  return () => off(submissionsRef);
};

// Submit quiz results
export const submitQuizResults = async (
  quizId: string,
  userName: string,
  results: Record<string, any>
) => {
  checkDatabase();
  try {
    const quiz = await getSharedQuiz(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Get the module results (we only have one module for now)
    const moduleResult = Object.values(results)[0];
    if (!moduleResult) {
      throw new Error('No module results found');
    }

    // Log the incoming data for debugging
    console.log('Submitting quiz results:', {
      quizId,
      userName,
      moduleResult
    });

    // Structure the results data properly
    const submissionData = {
      userName,
      timestamp: Date.now(),
      results: {
        courseName: quiz.courseName,
        modules: quiz.modules,
        numberOfQuestions: quiz.numberOfQuestions,
        moduleId: moduleResult.moduleId,
        totalQuestions: moduleResult.totalQuestions,
        correctAnswers: moduleResult.correctAnswers,
        incorrectAnswers: moduleResult.incorrectAnswers,
        questionsWithAnswers: moduleResult.questionsWithAnswers.map((qa: any) => {
          // Log the question data for debugging
          console.log('Processing question for submission:', {
            questionText: qa.question.text,
            correctOptionId: qa.question.correctOptionId,
            selectedOptionId: qa.selectedOptionId,
            numOptions: qa.question.options?.length
          });
          
          return {
            question: {
              text: qa.question.text,
              correctOptionId: qa.question.correctOptionId,
              options: qa.question.options.map((opt: any) => ({
                id: opt.id,
                text: opt.text
              }))
            },
            selectedOptionId: qa.selectedOptionId,
            isCorrect: qa.isCorrect
          };
        })
      }
    };

    // Log the final submission data for debugging
    console.log('Final submission data:', submissionData);

    const submissionRef = ref(database!, `submissions/${quizId}/${Date.now()}_${userName}`);
    await set(submissionRef, submissionData);
    return true;
  } catch (error) {
    console.error('Error submitting quiz results:', error);
    throw error;
  }
};

// Export analytics instance
export { analytics }; 

// Delete quiz submission
export const deleteQuizSubmission = async (quizId: string, submissionId: string) => {
  checkDatabase();
  try {
    const submissionRef = ref(database!, `submissions/${quizId}/${submissionId}`);
    await set(submissionRef, null); // Using null to delete the node
    return true;
  } catch (error) {
    console.error('Error deleting quiz submission:', error);
    throw error;
  }
}; 