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
  DocumentData
} from 'firebase/firestore';
import { Module } from '@/types/quiz';

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase app and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Store quiz data
export async function storeQuizData(quizId: string, courseName: string, modules: Module[]) {
  try {
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
    const submissionRef = doc(collection(db, `quizzes/${quizId}/submissions`), `${Date.now()}_${userName}`);
    const submissionData = {
      userName,
      timestamp: serverTimestamp(),
      results: {
        ...results,
        submittedAt: serverTimestamp()
      }
    };
    
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
    const submissionRef = doc(db, `quizzes/${quizId}/submissions/${submissionId}`);
    await deleteDoc(submissionRef);
    return true;
  } catch (error) {
    console.error('Error deleting quiz submission:', error);
    throw error;
  }
}

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
    'VITE_FIREBASE_DATABASE_URL',
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

  // Store config for debugging (without sensitive data)
  window._firebaseConfig = {
    ...config,
    apiKey: '***',
    appId: '***'
  };

  return config;
};

let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 3;

const initializeFirebase = async () => {
  try {
    console.log('Initializing Firebase...');
    const firebaseConfig = validateEnvVariables();
    
    // Initialize Firebase app if not already initialized
    if (!app) {
      app = initializeApp(firebaseConfig);
      console.log('Firebase app initialized successfully');
    }
    
    // Initialize Firestore
    db = getFirestore(app);
    
    console.log('Firebase services initialized successfully');
    return true;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    initializationAttempts++;
    
    if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
      const retryDelay = Math.min(1000 * Math.pow(2, initializationAttempts - 1), 10000);
      console.log(`Retrying initialization in ${retryDelay}ms (attempt ${initializationAttempts + 1}/${MAX_INITIALIZATION_ATTEMPTS})...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return initializeFirebase();
    }
    
    window._firebaseInitError = error instanceof Error ? error : new Error(String(error));
    throw error;
  }
};

// Initialize Firebase
initializeFirebase().catch(error => {
  console.error('Final Firebase initialization failed:', error);
});

// Enhanced database check with detailed error
const checkDatabase = () => {
  if (!db) {
    const error = window._firebaseInitError || new Error('Firebase not initialized');
    console.error('Database check failed:', {
      hasFirestore: !!db,
      config: window._firebaseConfig,
      error
    });
    throw error;
  }
};

// Enhanced retry operation with better error handling
const retryOperation = async (operation: () => Promise<any>, maxAttempts = 3, delay = 1000) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check Firebase initialization
      if (!db) {
        console.log('Firebase services not initialized, attempting to initialize...');
        await initializeFirebase();
      }

      const result = await operation();
      console.log('Operation succeeded after attempt', attempt);
      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`Operation failed (attempt ${attempt}/${maxAttempts}):`, {
        error: {
          message: error.message,
          code: error.code,
          name: error.name
        },
        stack: error instanceof Error ? error.stack : undefined,
        details: error.details || error.serverResponse || undefined
      });
      
      // Check if error is due to network/connection issues
      if (error.code === 'unavailable' || error.code === 'network-request-failed') {
        console.log('Network error detected, waiting longer before retry...');
        delay *= 2; // Double the delay for network issues
      }
      
      if (attempt < maxAttempts) {
        const backoffDelay = Math.min(delay * Math.pow(2, attempt - 1), 10000); // Cap at 10 seconds
        console.log(`Waiting ${backoffDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  throw lastError;
};

// Store quiz submission
export const storeQuizSubmission = async (
  quizId: string,
  userName: string,
  results: any
) => {
  return retryOperation(async () => {
    checkDatabase();
    const quiz = await getSharedQuiz(quizId);
    const submissionRef = doc(collection(db, `quizzes/${quizId}/submissions`), `${Date.now()}_${userName}`);
    const submissionData = {
      userName,
      timestamp: Date.now(),
      results: {
        ...results,
        modules: quiz?.modules || [],
        courseName: quiz?.courseName || 'Quiz Results'
      }
    };
    
    await setDoc(submissionRef, submissionData);
    return true;
  });
}; 