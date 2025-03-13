import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Pause } from 'lucide-react';

interface TimerProps {
  duration: number; // Duration in seconds
  onTimeout?: () => void;
  resetKey?: number; // New prop to trigger reset
  isPaused?: boolean; // New prop to pause the timer
}

export function Timer({ duration, onTimeout, resetKey = 0, isPaused = false }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(true);
  const [lastTimeLeft, setLastTimeLeft] = useState(duration);

  useEffect(() => {
    // Only reset and start timer when resetKey changes
    setTimeLeft(duration);
    setLastTimeLeft(duration);
    setIsActive(true);

    const timer = setInterval(() => {
      if (!isPaused) {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsActive(false);
            onTimeout?.();
            return 0;
          }
          const newTime = prev - 1;
          setLastTimeLeft(newTime); // Store the last time before pause
          return newTime;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [resetKey, duration, onTimeout]);

  // When paused, keep the last time
  useEffect(() => {
    if (isPaused) {
      setTimeLeft(lastTimeLeft);
    }
  }, [isPaused, lastTimeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const isLowTime = timeLeft <= 10 && isActive && !isPaused; // Last 10 seconds
  const isWarningTime = timeLeft <= 20 && isActive && !isPaused; // Last 20 seconds

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "font-mono text-lg transition-colors duration-200",
        isLowTime && "text-red-500 dark:text-red-400 animate-pulse font-bold",
        isWarningTime && !isLowTime && "text-orange-500 dark:text-orange-400",
        isPaused && "text-gray-500 dark:text-gray-400"
      )}>
        {timeLeft > 0 ? (
          `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        ) : (
          "Time's up!"
        )}
      </div>
      {isPaused && timeLeft > 0 && (
        <Pause className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      )}
    </div>
  );
} 