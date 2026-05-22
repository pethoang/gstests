export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'writing'
  | 'reading'
  | 'listening'
  | 'ordering';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface Question {
  id: string;
  order: number;
  section: string;
  type: QuestionType;
  content: string;
  options?: string[]; // Mostly for multiple_choice
  correctAnswer?: string | boolean | string[]; // Can be string, true/false, or array of possible correct words
  points: number;
  notes?: string;
  confidence: ConfidenceLevel;
  passage?: string; // For reading/listening context
  instructions?: string; // e.g. "Choose the best answers"
  audioUrl?: string; // Google Drive audio link
  hasImage?: boolean; // Whether the question contains references to an image
  imageUrl?: string; // Google Drive image link
  isManualGrading?: boolean;
}

export type Grade = '6' | '7' | '8' | '9';
export type ExamType = 'GK1' | 'CK1' | 'GK2' | 'CK2' | 'Unit';

export interface TestData {
  id: string;
  title: string;
  timeLimit?: number; // in minutes
  allowRetake?: boolean;
  createdAt?: string;
  questions: Question[];
  grade?: Grade;
  examType?: ExamType;
}

export interface StudentSubmission {
  id: string;
  studentName: string;
  testId: string;
  answers: Record<string, string | boolean>; // questionId -> answer
  totalScore: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  sectionScores: Record<string, { earned: number; max: number }>;
  incorrectQuestions: string[]; // List of question IDs that were wrong
  submittedAt: string;
  needsManualGrading: boolean;
}
