import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase, ref, set, onValue, off, get } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// Store quiz data
export const storeQuizData = async (
  quizId: string,
  courseName: string,
  modules: any[]
) => {
  try {
    const quizRef = ref(database, `quizzes/${quizId}`);
    await set(quizRef, {
      courseName,
      modules,
      createdAt: Date.now()
    });
    return true;
  } catch (error) {
    console.error('Error storing quiz data:', error);
    throw error;
  }
};

// Get shared quiz
export const getSharedQuiz = async (quizId: string) => {
  try {
    const quizRef = ref(database, `quizzes/${quizId}`);
    const snapshot = await get(quizRef);
    return snapshot.val();
  } catch (error) {
    console.error('Error getting shared quiz:', error);
    return null;
  }
};

// Store quiz submission
export const storeQuizSubmission = async (
  quizId: string,
  userName: string,
  results: any
) => {
  try {
    const quiz = await getSharedQuiz(quizId);
    const submissionRef = ref(database, `submissions/${quizId}/${Date.now()}_${userName}`);
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
  const submissionsRef = ref(database, `submissions/${quizId}`);
  
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
  try {
    const submissionRef = ref(database, `submissions/${quizId}/${Date.now()}_${userName}`);
    await set(submissionRef, {
      userName,
      timestamp: Date.now(),
      results,
    });
    return true;
  } catch (error) {
    console.error('Error submitting quiz results:', error);
    throw error;
  }
};

// Export analytics instance
export { analytics }; 