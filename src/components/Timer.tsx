import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TimerProps {
  duration: number; // Duration in seconds
  onTimeout?: () => void;
  resetKey?: number; // New prop to trigger reset
}

export function Timer({ duration, onTimeout, resetKey = 0 }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    // Only reset and start timer when resetKey changes
    setTimeLeft(duration);
    setIsActive(true);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsActive(false);
          onTimeout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resetKey]); // Only depend on resetKey, not duration

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const isLowTime = timeLeft <= 10 && isActive; // Last 10 seconds
  const isWarningTime = timeLeft <= 20 && isActive; // Last 20 seconds

  return (
    <div className={cn(
      "font-mono text-lg transition-colors duration-200",
      isLowTime && "text-red-500 dark:text-red-400 animate-pulse font-bold",
      isWarningTime && !isLowTime && "text-orange-500 dark:text-orange-400",
      !isActive && "text-gray-500 dark:text-gray-400"
    )}>
      {timeLeft > 0 ? (
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      ) : (
        "Time's up!"
      )}
    </div>
  );
} 