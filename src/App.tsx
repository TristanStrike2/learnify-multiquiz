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

const queryClient = new QueryClient();

const App = () => (
  <Router>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <TooltipProvider>
          <div className="min-h-screen bg-background text-foreground">
            <header className="border-b">
              <div className="container flex h-16 items-center justify-between">
                <h1 className="text-xl font-bold">IxE Learning Prototype</h1>
                <ThemeToggle />
              </div>
            </header>
            <Routes>
              <Route path="/" element={<IndexPage />} />
              <Route path="/quiz/:quizId" element={<SharedQuiz />} />
              <Route path="/quiz/:quizId/results/:userName" element={<SubmissionsPage />} />
              <Route path="/quiz/:quizId/thank-you/:userName" element={<ThankYouPage />} />
              <Route path="/submissions" element={<SubmissionsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
            <Sonner />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </Router>
);

export default App;
