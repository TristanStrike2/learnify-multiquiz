import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Module } from "@/types/quiz"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate a random ID for the shared quiz
function generateShareId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function createShareLink(courseName: string, modules: Module[]): string {
  try {
    // Create a minimal version of the course data
    const minimalModules = modules.map(module => ({
      id: module.id,
      title: module.title,
      questions: module.questions.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options.map(o => ({
          id: o.id,
          text: o.text
        })),
        correctOptionId: q.correctOptionId
      }))
    }));

    const shareData = {
      courseName,
      modules: minimalModules,
      createdAt: new Date().toISOString()
    };

    // Generate a unique ID for this shared quiz
    const shareId = generateShareId();
    
    // Store the quiz data in localStorage with an expiration time (24 hours)
    const storageData = {
      data: shareData,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    localStorage.setItem(`shared_quiz_${shareId}`, JSON.stringify(storageData));
    
    // Clean up expired shared quizzes
    cleanupExpiredShares();
    
    return `/shared/${shareId}`;
  } catch (error) {
    console.error('Error creating share link:', error);
    return '/error-sharing';
  }
}

// Function to clean up expired shared quizzes
function cleanupExpiredShares() {
  try {
    const now = new Date().getTime();
    
    // Get all keys from localStorage that start with 'shared_quiz_'
    const keys = Object.keys(localStorage).filter(key => key.startsWith('shared_quiz_'));
    
    // Remove expired entries
    keys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        const { expiresAt } = JSON.parse(item);
        if (new Date(expiresAt).getTime() < now) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Error cleaning up expired shares:', error);
  }
}

// Function to retrieve shared quiz data
export function getSharedQuiz(shareId: string) {
  try {
    const item = localStorage.getItem(`shared_quiz_${shareId}`);
    if (!item) return null;
    
    const { data, expiresAt } = JSON.parse(item);
    
    // Check if the share has expired
    if (new Date(expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(`shared_quiz_${shareId}`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error retrieving shared quiz:', error);
    return null;
  }
}
