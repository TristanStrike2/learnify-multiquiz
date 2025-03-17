import { jsPDF } from 'jspdf';
import { Module } from '@/types/quiz';

interface QuizResultData {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  questionsWithAnswers: Array<{
    question: {
      text: string;
      correctOptionId: string;
      options: Array<{
        id: string;
        text: string;
      }>;
    };
    selectedOptionId: string;
    isCorrect: boolean;
  }>;
  moduleId: string;
}

export interface PDFGeneratorParams {
  userName: string;
  courseName: string;
  modules: Module[];
  results: Record<string, QuizResultData>;
  numberOfQuestions?: number; // Optional for backward compatibility
}

export function generatePDF(params: PDFGeneratorParams): string {
  const { userName, courseName, modules, results, numberOfQuestions } = params;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - (margin * 2);
  const lineHeight = {
    header: 24,
    title: 20,
    normal: 16,
    small: 14
  };

  // Constants for option indicators and spacing
  const OPTION_INDENT = 60;
  const SYMBOL_OFFSET = 6;
  const CIRCLE_RADIUS = 5;
  
  // Colors for different states
  const COLORS = {
    CORRECT: [34, 197, 94] as [number, number, number], // green-500
    INCORRECT: [239, 68, 68] as [number, number, number], // red-500
    TIMEOUT: [249, 115, 22] as [number, number, number], // orange-500
    UNSELECTED: [100, 116, 139] as [number, number, number], // slate-500
    HEADING: [67, 56, 89] as [number, number, number], // deep muted purple
    SUBHEADING: [121, 111, 147] as [number, number, number], // soft dusty purple
    ACCENT: [108, 99, 128] as [number, number, number] // gentle muted purple
  };

  // Using more reliable Unicode symbols
  const SYMBOLS = {
    CORRECT: '\u25CF', // Black circle
    INCORRECT: '\u25CF', // Black circle
    TIMEOUT: '\u25CF', // Black circle
    BULLET: '\u25CF', // Black circle
    CIRCLE: '\u25CB', // White circle
  };

  // Set default font and add symbol font
  doc.setFont('helvetica');
  
  // Helper function to draw symbols manually
  const drawSymbol = (type: keyof typeof SYMBOLS, x: number, y: number, color: [number, number, number]) => {
    const symbolSize = CIRCLE_RADIUS * 1.5;
    
    // Set colors
    doc.setFillColor(color[0], color[1], color[2]);
    doc.setDrawColor(color[0], color[1], color[2]);
    
    if (type === 'TIMEOUT') {
      // For timeout, draw a filled circle with a thick border
      doc.setLineWidth(2);
      doc.circle(x, y, symbolSize/2, 'FD'); // 'FD' means fill and draw (stroke)
      // Draw a small clock symbol
      const clockSize = symbolSize * 0.6;
      doc.setLineWidth(1);
      doc.circle(x, y, clockSize/3, 'S');
      // Draw clock hands
      doc.line(x, y, x + clockSize/4, y);
      doc.line(x, y, x, y - clockSize/4);
      doc.setLineWidth(0.5);
    } else if (type === 'CORRECT' || type === 'INCORRECT') {
      // For selected answers (correct or incorrect), fill the circle completely
      doc.circle(x, y, symbolSize/2, 'F');
    } else {
      // For unselected options
      doc.setLineWidth(0.5);
      doc.circle(x, y, symbolSize/2, 'S');
    }
  };

  // Helper function to set heading style
  const setHeadingStyle = (size: number, color: [number, number, number] = COLORS.HEADING) => {
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont('helvetica', 'bold');
  };

  // Helper function to reset text style
  const resetTextStyle = () => {
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
  };

  // Add decorative header
  doc.setFillColor(COLORS.HEADING[0], COLORS.HEADING[1], COLORS.HEADING[2]);
  doc.rect(0, 0, pageWidth, 140, 'F');

  // Add title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.text('Quiz Results', pageWidth / 2, 80, { align: 'center' });

  // Add subtitle with user name
  doc.setFontSize(18);
  doc.text(`Great work, ${userName}!`, pageWidth / 2, 120, { align: 'center' });

  let yPos = 180;

  // Add course information
  setHeadingStyle(28, COLORS.ACCENT);
  doc.text(courseName, margin, yPos);
  yPos += lineHeight.header + 20;

  if (numberOfQuestions) {
    setHeadingStyle(16, COLORS.SUBHEADING);
    doc.text(`Total Questions: ${numberOfQuestions}`, margin, yPos);
    yPos += lineHeight.normal + 10;
  }

  // Calculate overall score based on actual questions answered
  const scores = Object.values(results).map(result => ({
    score: (result.correctAnswers / result.totalQuestions) * 100,
    weight: result.totalQuestions
  }));
  
  // Calculate weighted average score
  const totalQuestions = scores.reduce((sum, item) => sum + item.weight, 0);
  const totalScore = scores.reduce((sum, item) => sum + (item.score * item.weight), 0) / totalQuestions;

  // Add overall score
  setHeadingStyle(20);
  const scoreText = `Overall Score: ${Math.round(totalScore)}%`;
  doc.text(scoreText, margin, yPos);
  yPos += lineHeight.title + 10;

  // Add encouraging message based on score
  let message = '';
  if (totalScore >= 90) {
    message = 'Outstanding performance! You\'ve mastered this material!';
  } else if (totalScore >= 70) {
    message = 'Great job! You\'ve shown good understanding of the content.';
  } else {
    message = 'Keep practicing! Every attempt helps you learn more.';
  }
  resetTextStyle();
  doc.setFontSize(16);
  doc.text(message, margin, yPos);
  yPos += lineHeight.normal + 30;

  // Add legend
  setHeadingStyle(14);
  doc.text('Legend:', margin, yPos);
  yPos += lineHeight.normal;

  // Draw legend items
  const legendItems: Array<{
    symbol: keyof typeof SYMBOLS;
    text: string;
    color: [number, number, number];
  }> = [
    { symbol: 'CORRECT', text: 'Correct answer selected', color: COLORS.CORRECT },
    { symbol: 'INCORRECT', text: 'Incorrect answer selected', color: COLORS.INCORRECT },
    { symbol: 'TIMEOUT', text: 'Question timed out', color: COLORS.TIMEOUT },
    { symbol: 'CIRCLE', text: 'Correct answer (not selected)', color: COLORS.CORRECT },
    { symbol: 'CIRCLE', text: 'Unselected option', color: COLORS.UNSELECTED }
  ];

  legendItems.forEach((item) => {
    const itemX = margin + 25;
    const textX = margin + 50;
    
    drawSymbol(item.symbol, itemX, yPos - 4, item.color);
    
    resetTextStyle();
    doc.text(item.text, textX, yPos);
    yPos += lineHeight.normal;
  });

  yPos += lineHeight.normal;

  // Add module results with detailed questions
  setHeadingStyle(20, COLORS.ACCENT);
  doc.text('Detailed Results:', margin, yPos);
  yPos += lineHeight.title + 20;

  Object.entries(results).forEach(([moduleId, result]) => {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      yPos = margin + 40;
    }

    const moduleNumber = parseInt(moduleId.replace('module', ''));
    const module = modules.find(m => m.id === moduleId);
    const moduleName = module ? module.title : `Module ${moduleNumber}`;

    // Add module header
    setHeadingStyle(18, COLORS.ACCENT);
    doc.text(`Module: ${moduleName}`, margin, yPos);
    yPos += lineHeight.title + 15;

    // Add module score with question count
    setHeadingStyle(14, COLORS.SUBHEADING);
    const score = Math.round((result.correctAnswers / result.totalQuestions) * 100);
    doc.text(
      `Score: ${score}% (${result.correctAnswers} out of ${result.totalQuestions} questions)`,
      margin + 20,
      yPos
    );
    yPos += lineHeight.normal + 20;

    // Add detailed question results
    result.questionsWithAnswers.forEach((qa, index) => {
      // Parse question text if it's a JSON string
      let questionText = qa.question.text;
      try {
        if (typeof questionText === 'string' && questionText.startsWith('{')) {
          const parsed = JSON.parse(questionText);
          questionText = parsed.text || questionText;
        }
      } catch (e) {
        console.error('Error parsing question text:', e);
        questionText = String(questionText || 'Question text unavailable');
      }

      // Calculate question block height
      const questionLines = doc.splitTextToSize(questionText, contentWidth - 90);
      let totalOptionsHeight = 0;
      qa.question.options.forEach(option => {
        // Parse option text if it's a JSON string
        let optionText = option.text;
        try {
          if (typeof optionText === 'string' && optionText.startsWith('{')) {
            const parsed = JSON.parse(optionText);
            optionText = parsed.text || optionText;
          }
        } catch (e) {
          console.error('Error parsing option text:', e);
          optionText = String(optionText || 'Option text unavailable');
        }
        const optionLines = doc.splitTextToSize(optionText, contentWidth - 100);
        totalOptionsHeight += optionLines.length * lineHeight.small;
      });
      const questionBlockHeight = (questionLines.length * lineHeight.normal) + totalOptionsHeight + lineHeight.normal + 20;

      // Check if we need a new page
      if (yPos > doc.internal.pageSize.getHeight() - questionBlockHeight - 40) {
        doc.addPage();
        yPos = margin + 40;
      }

      // Question number and text
      setHeadingStyle(13);
      doc.text(`Question ${index + 1}:`, margin, yPos);
      resetTextStyle();
      doc.text(questionLines, margin + 80, yPos);
      yPos += (questionLines.length * lineHeight.normal) + 10;

      // Show all options
      qa.question.options.forEach((option) => {
        // Ensure option text is a string
        const optionText = String(option.text || 'Option text unavailable');
        
        const isSelected = option.id === qa.selectedOptionId;
        const isCorrect = option.id === qa.question.correctOptionId;
        const isTimedOut = qa.selectedOptionId === 'timeout';
        
        doc.setFontSize(12);
        
        // Calculate positions
        const circleX = margin + OPTION_INDENT - 20;
        const symbolX = circleX;
        const symbolY = yPos - 4;
        const textX = margin + OPTION_INDENT;

        // Draw the appropriate symbol and set text color
        if (isTimedOut) {
          // Show timeout indicator for correct answer
          if (isCorrect) {
            drawSymbol('CIRCLE', symbolX, symbolY, COLORS.CORRECT);
            doc.setTextColor(COLORS.CORRECT[0], COLORS.CORRECT[1], COLORS.CORRECT[2]);
          } else {
            drawSymbol('CIRCLE', symbolX, symbolY, COLORS.UNSELECTED);
            doc.setTextColor(COLORS.UNSELECTED[0], COLORS.UNSELECTED[1], COLORS.UNSELECTED[2]);
          }
        } else if (isSelected) {
          // Show selected answer (correct or incorrect)
          drawSymbol(isCorrect ? 'CORRECT' : 'INCORRECT', symbolX, symbolY, 
            isCorrect ? COLORS.CORRECT : COLORS.INCORRECT);
          doc.setTextColor(
            isCorrect ? COLORS.CORRECT[0] : COLORS.INCORRECT[0],
            isCorrect ? COLORS.CORRECT[1] : COLORS.INCORRECT[1],
            isCorrect ? COLORS.CORRECT[2] : COLORS.INCORRECT[2]
          );
        } else if (isCorrect) {
          // Show unselected correct answer
          drawSymbol('CIRCLE', symbolX, symbolY, COLORS.CORRECT);
          doc.setTextColor(COLORS.CORRECT[0], COLORS.CORRECT[1], COLORS.CORRECT[2]);
        } else {
          // Show unselected incorrect answer
          drawSymbol('CIRCLE', symbolX, symbolY, COLORS.UNSELECTED);
          doc.setTextColor(COLORS.UNSELECTED[0], COLORS.UNSELECTED[1], COLORS.UNSELECTED[2]);
        }

        // Add the option text
        const optionLines = doc.splitTextToSize(optionText, contentWidth - 100);
        doc.text(optionLines, textX, yPos);
        
        yPos += Math.max((optionLines.length * lineHeight.small), lineHeight.normal);
      });

      // Add timeout message if the question timed out
      if (qa.selectedOptionId === 'timeout') {
        yPos += 5; // Add a small gap before the timeout message
        doc.setTextColor(COLORS.TIMEOUT[0], COLORS.TIMEOUT[1], COLORS.TIMEOUT[2]);
        doc.setFont('helvetica', 'italic');
        doc.text('⏱ This question timed out - no answer was submitted', margin + OPTION_INDENT, yPos);
        resetTextStyle();
        yPos += lineHeight.normal;
      }

      yPos += lineHeight.normal + 10; // Add more space between questions
    });

    yPos += lineHeight.title + 10; // Add more space between modules
  });

  // Add footer
  const footerYPos = doc.internal.pageSize.getHeight() - 60;
  doc.setFontSize(11);
  doc.setTextColor(COLORS.SUBHEADING[0], COLORS.SUBHEADING[1], COLORS.SUBHEADING[2]);
  const footerText = `Generated on ${new Date().toLocaleDateString()}`;
  doc.text(footerText, pageWidth / 2, footerYPos, { align: 'center' });

  const motivationalText = 'Keep learning and growing!';
  doc.text(motivationalText, pageWidth / 2, footerYPos + 20, { align: 'center' });

  // Instead of returning a data URL, save the PDF with a filename
  const filename = `${userName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_quiz_results.pdf`;
  
  // For mobile compatibility, use the save method with filename
  try {
    doc.save(filename);
    return 'success';
  } catch (error) {
    console.error('Error saving PDF:', error);
    // Fallback to data URL for browsers that don't support direct save
    return doc.output('dataurlstring');
  }
}

export interface SubmissionReportParams {
  courseName: string;
  submissions: Array<{
    userName: string;
    date: string;
    score: string;
    percentage: number;
  }>;
}

export function generateSubmissionReport(params: SubmissionReportParams) {
  const { courseName, submissions } = params;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - (margin * 2);
  const OPTION_INDENT = 120;
  const lineHeight = {
    header: 24,
    title: 20,
    normal: 16,
    small: 14
  };

  // Add title
  doc.setFontSize(24);
  doc.text(courseName, margin, margin + lineHeight.header);

  // Add subtitle
  doc.setFontSize(14);
  doc.text('Submissions Report', margin, margin + lineHeight.header * 2);

  // Add date
  doc.setFontSize(12);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, margin + lineHeight.header * 2.5);

  // Add summary
  doc.setFontSize(14);
  doc.text('Summary:', margin, margin + lineHeight.header * 3.5);
  doc.setFontSize(12);
  doc.text(`Total Submissions: ${submissions.length}`, margin, margin + lineHeight.header * 4);
  
  const averagePercentage = submissions.reduce((acc, sub) => acc + sub.percentage, 0) / submissions.length;
  doc.text(`Average Score: ${Math.round(averagePercentage)}%`, margin, margin + lineHeight.header * 4.5);

  // Add submissions
  doc.setFontSize(14);
  doc.text('Individual Submissions:', margin, margin + lineHeight.header * 5.5);

  let yOffset = margin + lineHeight.header * 6;
  submissions.forEach((submission, index) => {
    if (yOffset > doc.internal.pageSize.getHeight() - margin * 2) {
      doc.addPage();
      yOffset = margin + lineHeight.header;
    }

    doc.setFontSize(12);
    doc.text(`${index + 1}. ${submission.userName}`, margin, yOffset);
    doc.text(`Date: ${submission.date}`, margin + OPTION_INDENT, yOffset);
    doc.text(`Score: ${submission.score} (${submission.percentage}%)`, margin + OPTION_INDENT * 2, yOffset);
    
    yOffset += lineHeight.normal;
  });

  // Save the PDF
  doc.save('quiz-submissions-report.pdf');
}