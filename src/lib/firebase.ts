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
  updateDoc, 
  collection, 
  serverTimestamp,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  DocumentData,
  Firestore,
  Timestamp
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
export async function storeQuizData(quizId: string, courseName: string, modules: Module[], numberOfQuestions: number) {
  try {
    const db = ensureFirestore();

    // Log input parameters
    console.log('storeQuizData input:', {
      quizId,
      courseName,
      modulesLength: modules?.length,
      numberOfQuestions,
      firstModule: modules?.[0] ? {
        id: modules[0].id,
        title: modules[0].title,
        questionsLength: modules[0].questions?.length,
        firstQuestion: modules[0].questions?.[0]
      } : null
    });

    // Validate inputs
    if (!quizId || !courseName || !modules || !Array.isArray(modules) || modules.length === 0) {
      throw new Error('Invalid input parameters');
    }

    // Deep validation and cleaning of modules
    const modulesWithIds = modules.map((module, index) => {
      if (!module.questions || !Array.isArray(module.questions)) {
        throw new Error(`Module at index ${index} has invalid questions`);
      }

      // Deep validation of questions
      const validatedQuestions = module.questions.map((q, qIndex) => {
        // Log any undefined values in the question
        const undefinedFields = Object.entries(q).filter(([_, value]) => value === undefined);
        if (undefinedFields.length > 0) {
          console.error(`Question ${qIndex} has undefined fields:`, undefinedFields);
        }

        if (!q.options || !Array.isArray(q.options)) {
          throw new Error(`Question ${qIndex} in module ${index} has invalid options`);
        }

        // Validate and clean options
        const validatedOptions = q.options.map((opt, i) => {
          if (!opt || typeof opt !== 'object') {
            throw new Error(`Invalid option at index ${i} in question ${qIndex}`);
          }

          // Ensure option has required fields
          return {
            id: opt.id || String.fromCharCode(65 + i),
            text: opt.text || `Option ${String.fromCharCode(65 + i)}`
          };
        });

        // Return cleaned question object
        return {
          id: q.id || `q${qIndex + 1}`,
          text: q.text || `Question ${qIndex + 1}`,
          options: validatedOptions,
          correctOptionId: q.correctOptionId || validatedOptions[0].id
        };
      });

      // Return cleaned module object
      return {
        id: module.id || `module_${index + 1}`,
        title: module.title || `Module ${index + 1}`,
        content: module.content || '',
        questions: validatedQuestions
      };
    });

    const quizData = {
      courseName: courseName || 'Untitled Course',
      modules: modulesWithIds,
      numberOfQuestions: numberOfQuestions || modulesWithIds[0].questions.length,
      createdAt: serverTimestamp(),
      isArchived: false,
      archivedAt: null
    };
    
    // Log the final data structure before saving
    console.log('Final quiz data structure:', {
      quizId,
      courseName: quizData.courseName,
      moduleCount: quizData.modules.length,
      firstModuleId: quizData.modules[0]?.id,
      questionCount: quizData.numberOfQuestions,
      timestamp: quizData.createdAt,
      fullData: JSON.stringify(quizData, null, 2)
    });

    // Validate no undefined values exist in the final structure
    const stringified = JSON.stringify(quizData);
    if (stringified.includes('undefined')) {
      throw new Error('Quiz data contains undefined values after validation');
    }
    
    const quizRef = doc(collection(db, 'quizzes'), quizId);
    await setDoc(quizRef, quizData);
    return true;
  } catch (error) {
    console.error('Error storing quiz data:', error);
    throw error;
  }
}

// Archive a quiz
export async function archiveQuiz(quizId: string) {
  try {
    const db = ensureFirestore();
    const quizRef = doc(collection(db, 'quizzes'), quizId);
    
    await updateDoc(quizRef, {
      isArchived: true,
      archivedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error archiving quiz:', error);
    throw error;
  }
}

// Unarchive a quiz
export async function unarchiveQuiz(quizId: string) {
  try {
    const db = ensureFirestore();
    const quizRef = doc(collection(db, 'quizzes'), quizId);
    
    await updateDoc(quizRef, {
      isArchived: false,
      archivedAt: null
    });
    
    return true;
  } catch (error) {
    console.error('Error unarchiving quiz:', error);
    throw error;
  }
}

// Get all archived quizzes
export async function getArchivedQuizzes(): Promise<DocumentData[]> {
  try {
    const db = ensureFirestore();
    const quizzesRef = collection(db, 'quizzes');
    const archivedQuery = query(
      quizzesRef,
      where('isArchived', '==', true),
      orderBy('archivedAt', 'desc')
    );
    
    const snapshot = await getDocs(archivedQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching archived quizzes:', error);
    throw error;
  }
}

// Subscribe to archived quizzes
export function subscribeToArchivedQuizzes(
  callback: (quizzes: DocumentData[]) => void
) {
  const db = ensureFirestore();
  const quizzesRef = collection(db, 'quizzes');
  const archivedQuery = query(
    quizzesRef,
    where('isArchived', '==', true),
    orderBy('archivedAt', 'desc')
  );
  
  return onSnapshot(archivedQuery, (snapshot) => {
    const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(quizzes);
  });
}

// Get active (non-archived) quizzes
export async function getActiveQuizzes(): Promise<DocumentData[]> {
  try {
    const db = ensureFirestore();
    const quizzesRef = collection(db, 'quizzes');
    const activeQuery = query(
      quizzesRef,
      where('isArchived', '==', false),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(activeQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching active quizzes:', error);
    throw error;
  }
}

// Subscribe to active quizzes
export function subscribeToActiveQuizzes(
  callback: (quizzes: DocumentData[]) => void
) {
  const db = ensureFirestore();
  const quizzesRef = collection(db, 'quizzes');
  const activeQuery = query(
    quizzesRef,
    where('isArchived', '==', false),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(activeQuery, (snapshot) => {
    const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(quizzes);
  });
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

    // Log the incoming results structure
    console.log('Processing quiz results:', {
      quizId,
      userName,
      resultsStructure: {
        isNested: Object.values(results)[0] !== results,
        hasModuleId: Boolean(moduleResults.moduleId),
        moduleId: moduleResults.moduleId,
        totalQuestions: moduleResults.totalQuestions
      }
    });

    // Ensure moduleId exists
    const moduleId = moduleResults.moduleId || quiz.modules[0]?.id || `module_${Date.now()}`;

    // Create a properly structured submission document
    const submissionData = {
      userName,
      timestamp: serverTimestamp(),
      results: {
        moduleId,
        totalQuestions: moduleResults.totalQuestions,
        correctAnswers: moduleResults.correctAnswers,
        incorrectAnswers: moduleResults.incorrectAnswers,
        questionsWithAnswers: moduleResults.questionsWithAnswers || [],
        courseName: quiz.courseName,
        submittedAt: serverTimestamp()
      }
    };

    // Validate required fields
    const requiredFields = ['totalQuestions', 'correctAnswers', 'incorrectAnswers'];
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

// Delete quiz document
export async function deleteQuiz(quizId: string) {
  try {
    const db = ensureFirestore();
    const quizRef = doc(db, `quizzes/${quizId}`);
    
    // First verify the quiz exists and is archived
    const quizDoc = await getDoc(quizRef);
    if (!quizDoc.exists()) {
      console.error('Quiz not found:', quizId);
      throw new Error('Quiz not found');
    }

    const quizData = quizDoc.data();
    if (!quizData.isArchived) {
      console.error('Cannot delete unarchived quiz:', quizId);
      throw new Error('Quiz must be archived before deletion');
    }

    // Get all submissions for this quiz
    const submissionsRef = collection(db, `quizzes/${quizId}/submissions`);
    const submissionsSnapshot = await getDocs(submissionsRef);
    
    // Delete all submissions first
    console.log(`Deleting ${submissionsSnapshot.size} submissions for quiz:`, quizId);
    const submissionDeletions = submissionsSnapshot.docs.map(async (doc) => {
      try {
        await deleteDoc(doc.ref);
        console.log(`Deleted submission: ${doc.id}`);
      } catch (error) {
        console.error(`Failed to delete submission ${doc.id}:`, error);
        throw error; // Propagate the error
      }
    });
    
    // Wait for all submission deletions to complete
    await Promise.all(submissionDeletions);
    
    // Now delete the quiz document
    console.log('Deleting quiz document:', quizId);
    await deleteDoc(quizRef);
    console.log('Successfully deleted quiz and all submissions:', quizId);
    return true;
  } catch (error) {
    console.error('Error deleting quiz:', error);
    throw error;
  }
} 