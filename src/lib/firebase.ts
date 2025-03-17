// Add type declaration at the top of the file
declare global {
  interface Window {
    _firebaseInitError?: Error;
    _firebaseConfig?: any;
    _firebaseConnectionState?: string;
  }
}

import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase, ref, set, onValue, off, get } from 'firebase/database';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  connectFirestoreEmulator,
  initializeFirestore,
  enableIndexedDbPersistence
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

let app;
let analytics;
let database;
let firestore;
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
    
    try {
      analytics = getAnalytics(app);
      console.log('Analytics initialized successfully');
    } catch (analyticsError) {
      console.warn('Analytics initialization skipped:', analyticsError);
    }

    try {
      // Initialize Realtime Database with region
      database = getDatabase(app);
      
      // Initialize Firestore with explicit settings
      firestore = initializeFirestore(app, {
        experimentalForceLongPolling: false, // Use WebSocket by default
        experimentalAutoDetectLongPolling: true, // Auto-detect if WebSocket fails
        cacheSizeBytes: 100 * 1024 * 1024, // 100MB cache
      });
      
      console.log('Database services initialized');

      // Enable offline persistence with better error handling
      try {
        await enableIndexedDbPersistence(firestore).catch((err) => {
          if (err.code === 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab
            console.warn('Persistence disabled: Multiple tabs open');
          } else if (err.code === 'unimplemented') {
            // Client doesn't support persistence
            console.warn('Persistence not supported in this environment');
          } else {
            throw err;
          }
        });
        console.log('Offline persistence configured');
      } catch (persistenceError) {
        console.error('Error configuring persistence:', persistenceError);
        // Continue without persistence
      }
      
      // Monitor connection state
      const connectedRef = ref(database, '.info/connected');
      onValue(connectedRef, (snap) => {
        const isConnected = snap.val() === true;
        window._firebaseConnectionState = isConnected ? 'connected' : 'disconnected';
        console.log('Firebase connection state:', window._firebaseConnectionState);
      });
      
      console.log('Firebase services initialized successfully');
      return true;
    } catch (dbError) {
      console.error('Database initialization failed:', dbError);
      throw dbError;
    }
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
    database = null;
    firestore = null;
    throw error;
  }
};

// Initialize Firebase
initializeFirebase().catch(error => {
  console.error('Final Firebase initialization failed:', error);
});

// Enhanced database check with detailed error
const checkDatabase = () => {
  if (!database || !firestore) {
    const error = window._firebaseInitError || new Error('Firebase not initialized');
    console.error('Database check failed:', {
      hasDatabase: !!database,
      hasFirestore: !!firestore,
      connectionState: window._firebaseConnectionState,
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
      if (!database || !firestore) {
        console.log('Firebase services not initialized, attempting to initialize...');
        await initializeFirebase();
      }

      // Check connection state before attempting operation
      if (window._firebaseConnectionState === 'disconnected') {
        console.warn(`Firebase is disconnected, waiting before attempt ${attempt}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Skip this attempt if still disconnected
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
        connectionState: window._firebaseConnectionState,
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

// Store quiz data
export async function storeQuizData(quizId: string, courseName: string, modules: Module[]) {
  return retryOperation(async () => {
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
  });
}

// Get shared quiz
export async function getSharedQuiz(quizId: string) {
  return retryOperation(async () => {
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
  });
}

// Store quiz submission
export const storeQuizSubmission = async (
  quizId: string,
  userName: string,
  results: any
) => {
  return retryOperation(async () => {
    checkDatabase();
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
  });
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