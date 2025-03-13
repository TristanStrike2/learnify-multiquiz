import { useState, useCallback } from 'react';
import { Question, QuizResult, QuizState, OpenAIQuizQuestion, Module, OpenAIModule, Course } from '@/types/quiz';
import { toast, useToast } from '@/components/ui/use-toast';
import { courseData } from '@/data/courseData';

const GEMINI_API_KEY = 'AIzaSyBGFkmJ-sdB2vAB-2eT2G2mTKHOo3XUPpU';

// Function to generate modules with content and questions using Gemini
const generateCourseFromText = async (text: string): Promise<Module[]> => {
  try {
    console.log('Generating course from text:', text.substring(0, 100) + '...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Transform this text into a comprehensive quiz: "${text}". 
            The quiz must have:
            1. A clear, descriptive title
            2. Educational content (400-600 words)
            3. EXACTLY 30 multiple-choice quiz questions

            Format your response as a JSON array with this exact structure:
            [
              {
                "title": "Quiz Title",
                "content": "Educational content that teaches the topic in a clear way...",
                "questions": [
                  {
                    "question": "Question text",
                    "options": ["option1", "option2", "option3", "option4"],
                    "correctAnswerIndex": 0
                  }
                ]
              }
            ]
            
            Strict Requirements:
            - Generate EXACTLY 1 quiz module
            - The quiz MUST have EXACTLY 30 questions
            - Each question MUST have EXACTLY 4 options
            - Questions should test understanding and application, not just recall
            - Content should be educational and well-structured
            - Return ONLY the valid JSON array with no additional text
            - All content must directly relate to the input text
            - Questions should progressively increase in difficulty`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 12000
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('Raw API response:', data);
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API');
    }
    
    // Parse the content from Gemini response
    const content = data.candidates[0].content.parts[0].text;
    console.log('Extracted content:', content);
    
    // Extract JSON from response
    let parsedModules;
    try {
      parsedModules = JSON.parse(content) as OpenAIModule[];
    } catch (e) {
      // Try to find JSON in the response if direct parsing fails
      const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
      if (!jsonMatch) {
        throw new Error('Could not extract valid JSON from response');
      }
      parsedModules = JSON.parse(jsonMatch[0]) as OpenAIModule[];
    }
    
    console.log('Parsed modules:', parsedModules);
    
    if (!Array.isArray(parsedModules) || parsedModules.length !== 1) {
      throw new Error('Invalid module count - expected exactly 1 module');
    }

    // Validate module has exactly 30 questions
    const module = parsedModules[0];
    if (!Array.isArray(module.questions) || module.questions.length !== 30) {
      throw new Error('Module does not have exactly 30 questions');
    }
    
    // Validate each question has exactly 4 options
    module.questions.forEach((question, qIdx) => {
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        throw new Error(`Question ${qIdx + 1} does not have exactly 4 options`);
      }
    });
    
    // Convert Gemini format to our Module format
    return parsedModules.map((m, moduleIndex) => ({
      id: `module${moduleIndex + 1}`,
      title: m.title,
      content: m.content,
      questions: m.questions.map((q, questionIndex) => ({
        id: `q${questionIndex + 1}`,
        text: q.question,
        options: q.options.map((opt, i) => ({
          id: String.fromCharCode(65 + i), // A, B, C, D
          text: opt
        })),
        correctOptionId: String.fromCharCode(65 + q.correctAnswerIndex) // A, B, C, D
      }))
    }));
  } catch (error) {
    console.error('Error generating course:', error);
    throw error;
  }
};

export const useQuiz = () => {
  const [quizState, setQuizState] = useState<QuizState>({ status: 'input' });
  // Always use the hardcoded API key
  const [apiKey, setApiKey] = useState<string | null>(GEMINI_API_KEY);
  const { toast } = useToast();
  
  const saveApiKey = useCallback((key: string) => {
    // No need to use localStorage anymore
    // localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    toast({
      title: "API Key Saved",
      description: "Your Gemini API key has been saved",
    });
  }, []);
  
  const startQuizGeneration = useCallback(async (text: string) => {
    try {
      // Always use the hardcoded API key instead of checking localStorage
      // const apiKey = localStorage.getItem('gemini_api_key');
      // if (!apiKey) {
      //   toast({
      //     title: "API Key Required",
      //     description: "Please enter your Gemini API key in settings",
      //     variant: "destructive"
      //   });
      //   return;
      // }
      
      setQuizState({ status: 'generating' });
      const modules = await generateCourseFromText(text);
      
      if (modules.length === 0) {
        toast({
          title: "Error",
          description: "Could not generate course modules from the provided text. Please try again with more detailed content.",
          variant: "destructive"
        });
        setQuizState({ status: 'input' });
        return;
      }
      
      // After generating the quiz, we move to the name input state
      setQuizState({ 
        status: 'course', 
        modules,
        currentModuleIndex: 0,
        currentView: 'name' // Start with name input
      });
    } catch (error) {
      console.error('Error generating course:', error);
      toast({
        title: "Error",
        description: "Failed to generate course content. Please check your API key and try again.",
        variant: "destructive"
      });
      setQuizState({ status: 'input' });
    }
  }, []);

  const handleNameSubmit = useCallback((name: string) => {
    setQuizState(prev => {
      if (prev.status !== 'course') return prev;
      return {
        ...prev,
        userName: name,
        currentView: 'content' // After name input, show content
      };
    });
  }, []);
  
  const startModuleQuiz = useCallback(() => {
    setQuizState((prevState) => {
      if (prevState.status !== 'course') return prevState;
      
      const currentModule = prevState.modules[prevState.currentModuleIndex];
      
      return { 
        status: 'quiz', 
        currentQuestionIndex: 0, 
        questions: currentModule.questions,
        answers: Array(currentModule.questions.length).fill(null),
        quizStartTime: Date.now(),
        moduleId: currentModule.id,
        userName: prevState.userName
      };
    });
  }, []);
  
  const answerQuestion = useCallback((optionId: string) => {
    setQuizState((prevState) => {
      if (prevState.status !== 'quiz') return prevState;
      
      const newAnswers = [...prevState.answers];
      newAnswers[prevState.currentQuestionIndex] = optionId;
      
      return {
        ...prevState,
        answers: newAnswers
      };
    });
  }, []);
  
  const moveToNextQuestion = useCallback(() => {
    setQuizState((prevState) => {
      if (prevState.status !== 'quiz') return prevState;
      
      const nextIndex = prevState.currentQuestionIndex + 1;
      
      // If this was the last question, calculate and show results
      if (nextIndex >= prevState.questions.length) {
        const questionsWithAnswers = prevState.questions.map((question, index) => {
          const selectedOptionId = prevState.answers[index];
          return {
            question,
            selectedOptionId,
            isCorrect: selectedOptionId === question.correctOptionId
          };
        });
        
        const correctAnswers = questionsWithAnswers.filter(q => q.isCorrect).length;
        
        // Check if this is the last module
        let hasNextModule = false;
        if (quizState.status === 'course') {
          const moduleIndex = quizState.modules.findIndex(m => m.id === prevState.moduleId);
          hasNextModule = moduleIndex < quizState.modules.length - 1;
        }
        
        const result: QuizResult = {
          totalQuestions: prevState.questions.length,
          correctAnswers,
          incorrectAnswers: prevState.questions.length - correctAnswers,
          questionsWithAnswers,
          moduleId: prevState.moduleId
        };
        
        return { 
          status: 'results', 
          result,
          hasNextModule: hasNextModule
        };
      }
      
      // Otherwise, move to the next question
      return {
        ...prevState,
        currentQuestionIndex: nextIndex
      };
    });
  }, [quizState]);
  
  const moveToNextModule = useCallback(() => {
    setQuizState((prevState) => {
      if (prevState.status !== 'results') return prevState;
      
      // Find the current module index
      if (quizState.status === 'course') {
        const moduleId = prevState.result.moduleId;
        const currentModuleIndex = quizState.modules.findIndex(m => m.id === moduleId);
        
        // Move to the next module
        if (currentModuleIndex < quizState.modules.length - 1) {
          return {
            status: 'course',
            modules: quizState.modules,
            currentModuleIndex: currentModuleIndex + 1,
            currentView: 'content'
          };
        }
      }
      
      // If it was the last module, go back to input
      return { status: 'input' };
    });
  }, [quizState]);
  
  const resetQuiz = useCallback(() => {
    setQuizState({ status: 'input' });
  }, []);
  
  return {
    quizState,
    startQuizGeneration,
    startModuleQuiz,
    answerQuestion,
    moveToNextQuestion,
    moveToNextModule,
    resetQuiz,
    apiKey,
    saveApiKey,
    handleNameSubmit
  };
};

export const useGenerateCourse = () => {
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateCourse = async (text: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const modules = await generateCourseFromText(text);
      setCourse({ modules, courseName: '' });
      return true;
    } catch (error) {
      console.error('Error generating course:', error);
      toast({
        title: "Error",
        description: "Failed to generate course content. Please check your API key and try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateCourse,
    course,
    isLoading,
    setCourse
  };
};
