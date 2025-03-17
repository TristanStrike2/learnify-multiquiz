// Add type declaration at the top of the file
declare global {
  interface Window {
    _firebaseInitError?: Error;
    _firebaseConfig?: any;
    _firebaseConnectionState?: string;
  }
}

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  serverTimestamp,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  DocumentData,
  Firestore
} from 'firebase/firestore';
import { Module } from '@/types/quiz';

// Debug function to safely log environment variables
const debugEnvVariables = () => {
  const envVars = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'));
  console.log('Environment Mode:', import.meta.env.MODE);
  console.log('Base URL:', import.meta.env.BASE_URL);
  console.log('Available Firebase env variables:', envVars);
  return envVars;
};

// Validate environment variables
const validateEnvVariables = () => {
  const envVars = debugEnvVariables();
  
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  const missingVars = requiredVars.filter(key => !import.meta.env[key]);
  
  if (missingVars.length > 0) {
    const error = new Error(`Missing required Firebase configuration: ${missingVars.join(', ')}`);
    console.error(error);
    throw error;
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };
};

// Initialize Firebase
let firebaseApp;
let firestoreDb: Firestore;

try {
  const firebaseConfig = validateEnvVariables();
  firebaseApp = initializeApp(firebaseConfig);
  firestoreDb = getFirestore(firebaseApp);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization failed:', error);
  throw error;
}

// Helper function to check if Firestore is initialized
const ensureFirestore = () => {
  if (!firestoreDb) {
    throw new Error('Firestore is not initialized');
  }
  return firestoreDb;
};

// Store quiz data
export async function storeQuizData(quizId: string, courseName: string, modules: Module[]) {
  try {
    const db = ensureFirestore();
    const quizRef = doc(collection(db, 'quizzes'), quizId);
    const quizData = {
      courseName,
      modules,
      numberOfQuestions: modules[0]?.questions?.length || 0,
      createdAt: serverTimestamp()
    };
    
    await setDoc(quizRef, quizData);
    return true;
  } catch (error) {
    console.error('Error storing quiz data:', error);
    throw error;
  }
}

// Get shared quiz
export async function getSharedQuiz(quizId: string) {
  try {
    const db = ensureFirestore();
    const quizRef = doc(collection(db, 'quizzes'), quizId);
    const quizDoc = await getDoc(quizRef);
    
    if (!quizDoc.exists()) {
      return null;
    }
    
    return quizDoc.data();
  } catch (error) {
    console.error('Error fetching shared quiz:', error);
    throw error;
  }
}

// Store quiz submission
export async function submitQuizResults(quizId: string, userName: string, results: any) {
  try {
    const db = ensureFirestore();
    
    // First get the quiz data to ensure it exists
    const quiz = await getSharedQuiz(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Validate and structure the results data
    if (!results || typeof results !== 'object') {
      throw new Error('Invalid results data');
    }

    // Handle both flat and nested result structures
    const moduleResults = Object.values(results)[0] || results;
    
    if (!moduleResults || typeof moduleResults !== 'object') {
      throw new Error('Invalid module results data');
    }

    // Create a properly structured submission document
    const submissionData = {
      userName,
      timestamp: serverTimestamp(),
      results: {
        moduleId: moduleResults.moduleId,
        totalQuestions: moduleResults.totalQuestions,
        correctAnswers: moduleResults.correctAnswers,
        incorrectAnswers: moduleResults.incorrectAnswers,
        questionsWithAnswers: moduleResults.questionsWithAnswers || [],
        courseName: quiz.courseName,
        submittedAt: serverTimestamp()
      }
    };

    // Validate required fields
    const requiredFields = ['moduleId', 'totalQuestions', 'correctAnswers', 'incorrectAnswers'];
    const missingFields = requiredFields.filter(field => !moduleResults[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const submissionRef = doc(collection(db, `quizzes/${quizId}/submissions`), `${Date.now()}_${userName}`);
    await setDoc(submissionRef, submissionData);
    return true;
  } catch (error) {
    console.error('Error submitting quiz results:', error);
    throw error;
  }
}

// Get quiz submissions
export async function getQuizSubmissions(quizId: string): Promise<DocumentData[]> {
  try {
    const db = ensureFirestore();
    const submissionsRef = collection(db, `quizzes/${quizId}/submissions`);
    const submissionsQuery = query(submissionsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(submissionsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching quiz submissions:', error);
    throw error;
  }
}

// Subscribe to quiz submissions
export function subscribeToQuizSubmissions(
  quizId: string,
  callback: (submissions: DocumentData[]) => void
) {
  const db = ensureFirestore();
  const submissionsRef = collection(db, `quizzes/${quizId}/submissions`);
  const submissionsQuery = query(submissionsRef, orderBy('timestamp', 'desc'));
  
  return onSnapshot(submissionsQuery, (snapshot) => {
    const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(submissions);
  });
}

// Delete quiz submission
export async function deleteQuizSubmission(quizId: string, submissionId: string) {
  try {
    const db = ensureFirestore();
    const submissionRef = doc(db, `quizzes/${quizId}/submissions/${submissionId}`);
    await deleteDoc(submissionRef);
    return true;
  } catch (error) {
    console.error('Error deleting quiz submission:', error);
    throw error;
  }
} 