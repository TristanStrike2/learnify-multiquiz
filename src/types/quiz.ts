import { Timestamp } from 'firebase/firestore';

export interface Question {
  id: string;
  text: string;
  options: Option[];
  correctOptionId: string;
}

export interface Option {
  id: string;
  text: string;
}

export interface Module {
  id: string;
  title: string;
  content: string;
  questions: Question[];
}

export interface Course {
  modules: Module[];
  numberOfQuestions: number;
  courseName?: string;
}

export interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  questionsWithAnswers: Array<{
    question: Question;
    selectedOptionId: string;
    isCorrect: boolean;
  }>;
  moduleId: string;
  numberOfQuestions?: number;
}

export type QuizState = 
  | { status: 'input' }
  | { status: 'generating' }
  | { status: 'course', modules: Module[], currentModuleIndex: number, currentView: 'name' | 'content' | 'quiz', userName?: string }
  | { status: 'quiz', currentQuestionIndex: number, questions: Question[], answers: (string | null)[], quizStartTime: number, moduleId: string, userName: string }
  | { status: 'results', result: QuizResult, hasNextModule: boolean };

export interface OpenAIQuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface OpenAIModule {
  title: string;
  content: string;
  questions: OpenAIQuizQuestion[];
}

export interface SharedQuiz {
  id: string;
  courseName: string;
  modules: Module[];
  createdAt: Timestamp;
  numberOfQuestions: number;
}

