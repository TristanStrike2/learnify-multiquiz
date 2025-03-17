import { useState, useCallback } from 'react';
import { Question, QuizResult, QuizState, OpenAIQuizQuestion, Module, OpenAIModule, Course } from '@/types/quiz';
import { toast, useToast } from '@/components/ui/use-toast';
import { courseData } from '@/data/courseData';
import { useNavigate } from 'react-router-dom';
import { createShareLink } from '@/lib/shareLink';

const GEMINI_API_KEY = 'AIzaSyBGFkmJ-sdB2vAB-2eT2G2mTKHOo3XUPpU';

// Function to generate modules with content and questions using Gemini
const generateCourseFromText = async (text: string, retryCount = 0): Promise<Module[]> => {
  try {
    console.log('Generating course from text:', text.substring(0, 100) + '...');
    console.log('Using API key:', GEMINI_API_KEY);
    
    // Make the prompt even more explicit about needing 30 questions
    const requestBody = JSON.stringify({
      contents: [{
        parts: [{
          text: `Transform this text into a comprehensive quiz:

${text}

The quiz must have:
1. A clear, descriptive title
2. Educational content (400-600 words)
3. EXACTLY 30 multiple-choice quiz questions - This is a strict requirement!

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
      // IMPORTANT: Include all 30 questions here - exactly 30, no more, no less
    ]
  }
]

CRITICAL REQUIREMENTS:
- Generate EXACTLY 1 quiz module
- The quiz MUST have EXACTLY 30 questions - count carefully! This is a very strict requirement!
- Each question MUST have EXACTLY 4 options - This is a very strict requirement!
- Questions should test evaluation, analysis, application and understanding. Use Bloom's Taxonomy to ensure the questions are appropriate.
- Content should be educational and well-structured
- Return ONLY the valid JSON array with no additional text
- All content must directly relate to the input text
- Questions should progressively increase in difficulty

Failure to comply with the exact question count will require regeneration.`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 12000
      }
    });
    
    console.log('Request body:', requestBody);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    console.log('API URL (without key):', apiUrl.replace(GEMINI_API_KEY, '*****'));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: requestBody
    });

    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error details:', errorData);
      throw new Error(`API error: ${errorData.error?.message || 'Unknown error'} (Status: ${response.status})`);
    }

    const data = await response.json();
    console.log('Raw API response headers:', response.headers);
    
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
    
    // Check if we need to fix the question count
    if (!Array.isArray(module.questions)) {
      throw new Error('No questions found in module');
    }
    
    // If we don't have exactly 30 questions and we haven't retried too many times, 
    // try to generate the quiz again
    if (module.questions.length !== 30) {
      console.warn(`Generated module has ${module.questions.length} questions instead of 30`);
      
      // If we've tried too many times, we'll try to fix the questions
      if (retryCount >= 2) {
        console.log('Max retry count reached, attempting to normalize question count');
        // Fix question count by duplicating or trimming
        if (module.questions.length < 30) {
          // If we have too few questions, duplicate some existing ones to reach 30
          console.log('Too few questions, duplicating some to reach 30');
          const questionsNeeded = 30 - module.questions.length;
          for (let i = 0; i < questionsNeeded; i++) {
            // Clone a random question and slightly modify it
            const randomIndex = Math.floor(Math.random() * module.questions.length);
            const questionToClone = module.questions[randomIndex];
            
            // Create a modified clone
            const clonedQuestion = {
              ...questionToClone,
              question: `Additional: ${questionToClone.question}`
            };
            
            module.questions.push(clonedQuestion);
          }
        } else if (module.questions.length > 30) {
          // If we have too many questions, keep only the first 30
          console.log('Too many questions, trimming to 30');
          module.questions = module.questions.slice(0, 30);
        }
      } else {
        // Retry the generation with a more explicit prompt
        console.log(`Retrying quiz generation (attempt ${retryCount + 1})`);
        return generateCourseFromText(text, retryCount + 1);
      }
    }
    
    // Now validate that each question has exactly 4 options
    const questionsWithWrongOptionCount = module.questions.filter(
      question => !Array.isArray(question.options) || question.options.length !== 4
    );
    
    if (questionsWithWrongOptionCount.length > 0) {
      // Fix questions with wrong option counts if we've retried too many times
      if (retryCount >= 2) {
        console.log('Fixing questions with incorrect option counts');
        
        module.questions = module.questions.map(question => {
          if (!Array.isArray(question.options)) {
            question.options = ["Option A", "Option B", "Option C", "Option D"];
            question.correctAnswerIndex = 0;
          } else if (question.options.length < 4) {
            // Add missing options
            while (question.options.length < 4) {
              question.options.push(`Additional Option ${question.options.length + 1}`);
            }
            // Make sure correctAnswerIndex is valid
            if (question.correctAnswerIndex >= question.options.length) {
              question.correctAnswerIndex = 0;
            }
          } else if (question.options.length > 4) {
            // Trim extra options, keeping the correct one
            const correctOption = question.options[question.correctAnswerIndex];
            question.options = question.options.slice(0, 4);
            
            // If the correct option was removed, set it to the first option
            if (!question.options.includes(correctOption)) {
              question.correctAnswerIndex = 0;
            } else {
              question.correctAnswerIndex = question.options.indexOf(correctOption);
            }
          }
          return question;
        });
      } else {
        console.warn('Some questions don\'t have exactly 4 options, retrying');
        return generateCourseFromText(text, retryCount + 1);
      }
    }
    
    // Convert Gemini format to our Module format
    return parsedModules.map((m, moduleIndex) => ({
      id: `module${moduleIndex + 1}`,
      title: m.title,
      content: m.content,
      questions: m.questions.map((q, questionIndex) => {
        // Create array of all options
        const allOptions = [...q.options];
        const correctOption = allOptions[q.correctAnswerIndex];
        
        // Remove the correct option from the array
        allOptions.splice(q.correctAnswerIndex, 1);
        
        // Shuffle the remaining options
        for (let i = allOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
        }
        
        // Insert the correct option at a random position
        const randomPosition = Math.floor(Math.random() * 4);
        allOptions.splice(randomPosition, 0, correctOption);
        
        // Create the question object with randomized options
        return {
          id: `q${questionIndex + 1}`,
          text: q.question,
          options: allOptions.map((opt, i) => ({
            id: String.fromCharCode(65 + i), // A, B, C, D
            text: opt
          })),
          correctOptionId: String.fromCharCode(65 + randomPosition) // A, B, C, D based on where we inserted the correct option
        };
      })
    }));
  } catch (error) {
    console.error('Error generating course:', error);
    throw error;
  }
};

export const useQuiz = () => {
  const [quizState, setQuizState] = useState<QuizState>({ status: 'input' });
  const [apiKey, setApiKey] = useState<string | null>(GEMINI_API_KEY);
  const { toast } = useToast();
  const navigate = useNavigate();
  
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
      
      // Store the generated modules in localStorage
      localStorage.setItem('generatedModules', JSON.stringify(modules));
      
      // Create a temporary share link to get the URL parameters
      const { quizId, urlSafeName } = await createShareLink("Untitled Course", modules);
      
      // Navigate to the name input page with the quiz ID
      navigate(`/quiz/${urlSafeName}/${quizId}/name`);
      
      // Update state after navigation
      setQuizState({ 
        status: 'course', 
        modules,
        currentModuleIndex: 0,
        currentView: 'name'
      });
    } catch (error: any) {
      console.error('Error generating course:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast({
        title: "API Error",
        description: `Failed to generate course content: ${errorMessage}`,
        variant: "destructive"
      });
      setQuizState({ status: 'input' });
    }
  }, [navigate]);

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
  const navigate = useNavigate();

  const generateCourse = async (text: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Generate the course modules
      const modules = await generateCourseFromText(text);
      
      if (modules.length === 0) {
        toast({
          title: "Error",
          description: "Could not generate course modules from the provided text. Please try again with more detailed content.",
          variant: "destructive"
        });
        return false;
      }
      
      // Store the generated modules in localStorage
      localStorage.setItem('generatedModules', JSON.stringify(modules));
      
      // Create a temporary share link
      const { quizId, urlSafeName } = await createShareLink("Untitled Course", modules);
      
      // Navigate to the name input page
      navigate(`/quiz/${urlSafeName}/${quizId}/name`);
      
      // Update course state
      setCourse({ modules, courseName: '' });
      return true;
    } catch (error: any) {
      console.error('Error generating course:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast({
        title: "API Error",
        description: `Failed to generate course content: ${errorMessage}`,
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
