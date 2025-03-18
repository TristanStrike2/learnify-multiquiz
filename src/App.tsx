import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";
import { IndexPage } from "@/pages/Index";
import { SharedQuiz } from "@/components/SharedQuiz";
import { SubmissionsPage } from "@/pages/Submissions";
import NotFound from "./pages/NotFound";
import { ThankYouPage } from '@/pages/ThankYou';
import NameInputPage from '@/pages/NameInput';
import { QuizSettingsProvider } from '@/contexts/QuizSettingsContext';
import { QuizManagementPage } from '@/pages/QuizManagement';
import { AnimatedLayout } from '@/components/AnimatedLayout';

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
    <QuizSettingsProvider>
      <Router>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <div className="min-h-screen bg-background text-foreground">
              <header className="border-b">
                <div className="container flex h-16 items-center justify-between">
                  <h1 className="text-xl font-bold">IxE Learning Prototype</h1>
                  <ThemeToggle />
                </div>
              </header>
              <AnimatedLayout>
                <Routes>
                  <Route path="/" element={<QuizManagementPage />} />
                  <Route path="/admin/manage" element={<QuizManagementPage />} />
                  <Route path="/admin/create" element={<IndexPage />} />
                  <Route path="/admin/submissions/:quizId" element={<SubmissionsPage />} />
                  <Route path="/quiz/:courseName/:quizId" element={<SharedQuiz />} />
                  <Route path="/quiz/:courseName/:quizId/name" element={<NameInputPage />} />
                  <Route path="/quiz/:courseName/:quizId/results/:userName" element={<SubmissionsPage />} />
                  <Route path="/quiz/:courseName/:quizId/thank-you/:userName" element={<ThankYouPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AnimatedLayout>
              <Toaster />
              <Sonner />
            </div>
          </TooltipProvider>
        </QueryClientProvider>
      </Router>
    </QuizSettingsProvider>
  </ThemeProvider>
);

export default App;
