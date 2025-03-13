import { create } from 'zustand';
import { Course, QuizState, Question } from '@/types/quiz';

interface QuizStore {
  state: QuizState;
  setCourse: (course: Course) => void;
  startQuiz: (moduleId: string, questions: Question[]) => void;
  selectAnswer: (questionIndex: number, optionId: string) => void;
  nextQuestion: () => void;
  finishQuiz: () => void;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizStore>((set) => ({
  state: { status: 'input' },
  
  setCourse: (course) => set({
    state: {
      status: 'course',
      modules: course.modules,
      currentModuleIndex: 0,
      currentView: 'content'
    }
  }),
  
  startQuiz: (moduleId, questions) => set({
    state: {
      status: 'quiz',
      currentQuestionIndex: 0,
      questions,
      answers: new Array(questions.length).fill(null),
      quizStartTime: Date.now(),
      moduleId
    }
  }),
  
  selectAnswer: (questionIndex, optionId) => set((state) => {
    if (state.state.status !== 'quiz') return state;
    
    const newAnswers = [...state.state.answers];
    newAnswers[questionIndex] = optionId;
    
    return {
      state: {
        ...state.state,
        answers: newAnswers
      }
    };
  }),
  
  nextQuestion: () => set((state) => {
    if (state.state.status !== 'quiz') return state;
    
    return {
      state: {
        ...state.state,
        currentQuestionIndex: state.state.currentQuestionIndex + 1
      }
    };
  }),
  
  finishQuiz: () => set((state) => {
    if (state.state.status !== 'quiz') return state;
    
    const { currentQuestionIndex, questions, answers, quizStartTime, moduleId } = state.state;
    const questionsWithAnswers = questions.map((question, index) => ({
      question,
      selectedOptionId: answers[index],
      isCorrect: answers[index] === question.correctOptionId
    }));
    
    const correctAnswers = questionsWithAnswers.filter(q => q.isCorrect).length;
    
    return {
      state: {
        status: 'results',
        result: {
          totalQuestions: questions.length,
          correctAnswers,
          incorrectAnswers: questions.length - correctAnswers,
          questionsWithAnswers,
          moduleId
        },
        hasNextModule: true // This should be calculated based on the current module index
      }
    };
  }),
  
  resetQuiz: () => set({
    state: { status: 'input' }
  })
})); 