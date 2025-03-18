import { useLocation } from 'react-router-dom';

interface AnimatedLayoutProps {
  children: React.ReactNode;
}

export function AnimatedLayout({ children }: AnimatedLayoutProps) {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-background">
      {children}
    </div>
  );
} 