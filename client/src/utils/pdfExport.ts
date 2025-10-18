import jsPDF from 'jspdf';

export interface ResumeAnalysisData {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  detectedSkills: string[];
  score: number;
  roleFit: number;
  notes: string;
}

export const exportResumeAnalysisToPDF = (analysisData: ResumeAnalysisData, fileName: string = 'resume-analysis') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    const lines = doc.splitTextToSize(text, maxWidth);
    
    // Check if we need a new page
    if (yPosition + (lines.length * fontSize * 0.4) > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.text(lines, margin, yPosition);
    yPosition += lines.length * fontSize * 0.4 + 5;
  };

  // Helper function to add a section header
  const addSectionHeader = (title: string) => {
    yPosition += 10;
    addWrappedText(title, 16, true);
    yPosition += 5;
  };

  // Helper function to add bullet points
  const addBulletPoints = (items: string[]) => {
    items.forEach(item => {
      if (yPosition > pageHeight - margin - 20) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      const bulletText = `• ${item}`;
      const lines = doc.splitTextToSize(bulletText, maxWidth - 10);
      doc.text(lines, margin + 5, yPosition);
      yPosition += lines.length * 12 * 0.4 + 3;
    });
  };

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Resume Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 30;

  // Date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Score and Role Fit Summary
  addSectionHeader('Overall Assessment');
  addWrappedText(`Resume Score: ${analysisData.score}/10`);
  addWrappedText(`Role Fit: ${analysisData.roleFit}%`);
  yPosition += 10;

  // Executive Summary
  addSectionHeader('Executive Summary');
  addWrappedText(analysisData.summary);

  // Strengths
  if (analysisData.strengths.length > 0) {
    addSectionHeader('Key Strengths');
    addBulletPoints(analysisData.strengths);
  }

  // Weaknesses
  if (analysisData.weaknesses.length > 0) {
    addSectionHeader('Areas for Improvement');
    addBulletPoints(analysisData.weaknesses);
  }

  // Missing Skills
  if (analysisData.missingSkills.length > 0) {
    addSectionHeader('Recommended Skills to Develop');
    addBulletPoints(analysisData.missingSkills);
  }

  // Detected Skills
  if (analysisData.detectedSkills.length > 0) {
    addSectionHeader('Detected Technical Skills');
    const skillsText = analysisData.detectedSkills.join(', ');
    addWrappedText(skillsText);
  }

  // Professional Recommendations
  if (analysisData.notes) {
    addSectionHeader('Professional Recommendations');
    addWrappedText(analysisData.notes);
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${totalPages} | SkillBridge Resume Analysis`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`${fileName}.pdf`);
};