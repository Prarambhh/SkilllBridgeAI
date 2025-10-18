import React, { useState, useEffect } from 'react';
import { Upload, FileText, Download, Sparkles, Target, TrendingUp, CheckCircle, AlertCircle, Brain, Zap } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Pill';
import { SectionHeader } from '../components/ui/SectionHeader';
import BackgroundAnimation from '../components/BackgroundAnimation';
import { exportResumeAnalysisToPDF } from '../utils/pdfExport';
import { toast } from 'react-hot-toast';

interface ResumeAnalysisData {
  summary: string;
  score: number;
  detectedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  notes: string;
  roleFit?: number;
  weeklyRoadmap: Array<{
    week: number;
    focus: string;
    tasks: string[];
  }>;
}

const ResumeAnalysis: React.FC = () => {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // localStorage functions
  const saveResumeData = async (file: File, analysis: ResumeAnalysisData | null = null) => {
    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    };
    localStorage.setItem('skillbridge_resume_file', JSON.stringify(fileData));
    
    // Also save file content for re-analysis
    try {
      const content = await extractTextFromFile(file);
      localStorage.setItem('skillbridge_resume_content', content);
    } catch (error) {
      console.error('Error saving file content:', error);
    }
    
    if (analysis) {
      localStorage.setItem('skillbridge_resume_analysis', JSON.stringify(analysis));
    }
  };

  const loadSavedData = () => {
    try {
      const savedFileData = localStorage.getItem('skillbridge_resume_file');
      const savedAnalysis = localStorage.getItem('skillbridge_resume_analysis');
      
      if (savedFileData) {
        const fileData = JSON.parse(savedFileData);
        // Create a mock file object for display purposes
        const mockFile = new File([''], fileData.name, {
          type: fileData.type,
          lastModified: fileData.lastModified
        });
        setResumeFile(mockFile);
      }
      
      if (savedAnalysis) {
        setResumeAnalysis(JSON.parse(savedAnalysis));
      }
    } catch (error) {
      console.error('Error loading saved resume data:', error);
    }
  };

  const clearSavedData = () => {
    localStorage.removeItem('skillbridge_resume_file');
    localStorage.removeItem('skillbridge_resume_content');
    localStorage.removeItem('skillbridge_resume_analysis');
    setResumeFile(null);
    setResumeAnalysis(null);
  };

  // Load saved data on component mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setResumeFile(file);
      await saveResumeData(file); // Save file data to localStorage
      
      // Provide feedback based on file type
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        toast.success('Text file uploaded successfully!');
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        toast.success('PDF uploaded! Note: Text extraction may be limited. For best results, use a text file.');
      } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        toast.success('Word document uploaded! Note: Text extraction may be limited. For best results, use a text file.');
      } else {
        toast.success('File uploaded! Note: For best results, use a plain text (.txt) file with your resume content.');
      }
    }
  };

  const analyzeResume = async () => {
    if (!resumeFile) {
      toast.error('Please upload a resume first');
      return;
    }

    console.log('Starting resume analysis...');
    setIsAnalyzing(true);

    try {
      // Try to get saved content first, otherwise extract from file
      let text = localStorage.getItem('skillbridge_resume_content');
      if (!text) {
        console.log('Extracting text from file:', resumeFile.name);
        text = await extractTextFromFile(resumeFile);
        console.log('Extracted text length:', text.length);
      } else {
        console.log('Using saved file content, length:', text.length);
      }
      
      if (!text.trim()) {
        toast.error('Could not extract text from the file. Please try a different format.');
        setIsAnalyzing(false);
        return;
      }

      // Send text to the correct API endpoint
      console.log('Sending request to API...');
      const response = await fetch('http://localhost:8000/resume/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          target_role: 'Full-Stack Developer' // Default role, can be made configurable later
        }),
      });

      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        // Map the API response to our expected format
        const mappedData = {
          summary: data.summary,
          score: data.resume_score,
          detectedSkills: data.extracted_skills || [],
          missingSkills: data.missing_skills || [],
          strengths: data.strengths || [],
          weaknesses: data.weaknesses || [],
          notes: data.notes ? data.notes.join('\n\n') : '',
          roleFit: data.fit || 0,
          weeklyRoadmap: [] // This endpoint doesn't provide roadmap, keeping empty for now
        };
        setResumeAnalysis(mappedData);
        await saveResumeData(resumeFile!, mappedData); // Save analysis results to localStorage
        console.log('Resume analysis completed successfully');
        toast.success('Resume analysis completed!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        toast.error('Failed to analyze resume');
      }
    } catch (error) {
      console.error('Error analyzing resume:', error);
      toast.error('Error analyzing resume');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to extract text from uploaded file
  const extractTextFromFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      // For now, read as text. This works for .txt files and some simple formats
      // TODO: Add proper PDF/DOC parsing later
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        // For other file types, try to read as text anyway (might work for some formats)
        reader.readAsText(file);
      }
    });
  };

  const clearAnalysis = () => {
    clearSavedData(); // This will clear both state and localStorage
    toast.success('Analysis cleared');
  };

  const downloadResumeAnalysisPDF = () => {
    if (!resumeAnalysis) {
      toast.error('No analysis data available');
      return;
    }

    try {
      const analysisData = {
        summary: resumeAnalysis.summary,
        score: resumeAnalysis.score,
        strengths: resumeAnalysis.strengths,
        weaknesses: resumeAnalysis.weaknesses,
        detectedSkills: resumeAnalysis.detectedSkills,
        missingSkills: resumeAnalysis.missingSkills,
        notes: resumeAnalysis.notes,
        roleFit: resumeAnalysis.roleFit || 0,
        weeklyRoadmap: resumeAnalysis.weeklyRoadmap
      };

      exportResumeAnalysisToPDF(analysisData);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'gradient-success';
    if (score >= 60) return 'gradient-warning';
    return 'bg-gradient-to-r from-red-500 to-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative">
      <BackgroundAnimation variant="default" intensity="medium" />
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center animate-fade-in">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
                <Brain className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              AI-Powered Resume Analysis
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
              Get comprehensive insights, personalized recommendations, and actionable feedback to optimize your resume for success
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-900"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-10 relative z-10">
        {/* Upload Section */}
        <Card className="modern-card modern-card-hover mb-8 animate-slide-up">
          <div className="p-8">
            <SectionHeader 
              title="Upload Your Resume" 
              icon={<Upload className="h-6 w-6" />}
              className="mb-6"
            />
            
            <div className="space-y-6">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-100/50 transition-all duration-300 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:bg-slate-700/50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileText className="w-12 h-12 mb-4 text-slate-400" />
                    <p className="mb-2 text-lg font-medium text-slate-600 dark:text-slate-300">
                      {resumeFile ? resumeFile.name : 'Click to upload your resume'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      TXT, PDF, DOC, or DOCX (MAX. 10MB)
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      For best results, use a plain text (.txt) file
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".txt,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  onClick={analyzeResume}
                  disabled={!resumeFile || isAnalyzing}
                  className="btn-modern btn-primary"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyze Resume
                    </>
                  )}
                </Button>

                {resumeAnalysis && (
                  <Button
                    onClick={downloadResumeAnalysisPDF}
                    className="btn-modern btn-accent"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF Report
                  </Button>
                )}

                {(resumeFile || resumeAnalysis) && (
                  <Button
                    onClick={clearAnalysis}
                    className="btn-modern btn-secondary"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Analysis Results */}
        {resumeAnalysis && (
          <div className="space-y-8 animate-slide-up">
            {/* Score Overview */}
            <Card className="modern-card modern-card-hover">
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreGradient(resumeAnalysis.score)} text-white text-4xl font-bold mb-4 animate-bounce-in`}>
                    {resumeAnalysis.score}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Resume Score
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Your resume has been analyzed and scored based on industry standards
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6">
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {resumeAnalysis.summary}
                  </p>
                </div>
              </div>
            </Card>

            {/* Skills Analysis */}
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="modern-card modern-card-hover animate-slide-in-right">
                <div className="p-6">
                  <SectionHeader 
                    title="Detected Skills" 
                    icon={<CheckCircle className="h-5 w-5 text-green-600" />}
                    className="mb-4"
                  />
                  <div className="flex flex-wrap gap-2">
                    {resumeAnalysis.detectedSkills.map((skill, index) => (
                      <Pill 
                        key={index} 
                        text={skill} 
                        className="pill-modern bg-green-100 text-green-800 ring-green-600/20 dark:bg-green-900/30 dark:text-green-300"
                      />
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="modern-card modern-card-hover animate-slide-in-right">
                <div className="p-6">
                  <SectionHeader 
                    title="Missing Skills" 
                    icon={<AlertCircle className="h-5 w-5 text-orange-600" />}
                    className="mb-4"
                  />
                  <div className="flex flex-wrap gap-2">
                    {resumeAnalysis.missingSkills.map((skill, index) => (
                      <Pill 
                        key={index} 
                        text={skill} 
                        className="pill-modern bg-orange-100 text-orange-800 ring-orange-600/20 dark:bg-orange-900/30 dark:text-orange-300"
                      />
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Strengths and Weaknesses */}
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="modern-card modern-card-hover">
                <div className="p-6">
                  <SectionHeader 
                    title="Strengths" 
                    icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                    className="mb-4"
                  />
                  <ul className="space-y-3">
                    {resumeAnalysis.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card className="modern-card modern-card-hover">
                <div className="p-6">
                  <SectionHeader 
                    title="Areas for Improvement" 
                    icon={<Target className="h-5 w-5 text-orange-600" />}
                    className="mb-4"
                  />
                  <ul className="space-y-3">
                    {resumeAnalysis.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>

            {/* Recommendations */}
            {resumeAnalysis.notes && (
              <Card className="modern-card modern-card-hover">
                <div className="p-8">
                  <SectionHeader 
                    title="Personalized Recommendations" 
                    icon={<Zap className="h-5 w-5 text-blue-600" />}
                    className="mb-6"
                  />
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {resumeAnalysis.notes}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Weekly Roadmap */}
            {resumeAnalysis.weeklyRoadmap && resumeAnalysis.weeklyRoadmap.length > 0 && (
              <Card className="modern-card modern-card-hover">
                <div className="p-8">
                  <SectionHeader 
                    title="Development Roadmap" 
                    icon={<Target className="h-5 w-5 text-purple-600" />}
                    className="mb-6"
                  />
                  <div className="space-y-6">
                    {resumeAnalysis.weeklyRoadmap.map((week, index) => (
                      <div key={index} className="border-l-4 border-purple-500 pl-6 pb-6">
                        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                          Week {week.week}: {week.focus}
                        </h4>
                        <ul className="space-y-2">
                          {week.tasks.map((task, taskIndex) => (
                            <li key={taskIndex} className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-slate-600 dark:text-slate-400">{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalysis;