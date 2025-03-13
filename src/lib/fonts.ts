import { jsPDF } from 'jspdf';

// Base64 encoded Poppins font files
const POPPINS_REGULAR = 'YOUR_BASE64_FONT_HERE';
const POPPINS_MEDIUM = 'YOUR_BASE64_FONT_HERE';
const POPPINS_BOLD = 'YOUR_BASE64_FONT_HERE';

export function loadFonts(doc: jsPDF) {
  doc.addFileToVFS('Poppins-Regular.ttf', POPPINS_REGULAR);
  doc.addFont('Poppins-Regular.ttf', 'Poppins-Regular', 'normal');
  
  doc.addFileToVFS('Poppins-Medium.ttf', POPPINS_MEDIUM);
  doc.addFont('Poppins-Medium.ttf', 'Poppins-Medium', 'normal');
  
  doc.addFileToVFS('Poppins-Bold.ttf', POPPINS_BOLD);
  doc.addFont('Poppins-Bold.ttf', 'Poppins-Bold', 'normal');
} 