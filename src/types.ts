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

export type Grade = string;
export type ExamType = string;

export interface CategoryItem {
  id: string;
  name: string;
}

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

export function checkIsCorrect(q: Question, studentAnswer: string | boolean | undefined | null): boolean {
  if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') {
    return false;
  }

  if (q.type === 'writing' || q.isManualGrading) {
    return false;
  }

  const correctAnswer = q.correctAnswer;
  if (correctAnswer === undefined || correctAnswer === null) {
    return false;
  }

  // 1. True / False
  if (q.type === 'true_false') {
    const studentBoolStr = String(studentAnswer).trim().toLowerCase();
    const correctBoolStr = String(correctAnswer).trim().toLowerCase();
    return studentBoolStr === correctBoolStr;
  }

  // 2. Multiple Choice
  if (q.type === 'multiple_choice') {
    const studentStr = String(studentAnswer).trim().toUpperCase();
    const correctStr = String(correctAnswer).trim().toUpperCase();

    if (studentStr === correctStr) return true;
    
    if (correctStr.startsWith(studentStr + '.') || correctStr.startsWith(studentStr + ' ')) return true;
    if (studentStr.startsWith(correctStr + '.') || studentStr.startsWith(correctStr + ' ')) return true;

    if (q.options && q.options.length > 0) {
      const optionLetters = ['A', 'B', 'C', 'D'];
      const studentOptIndex = optionLetters.indexOf(studentStr);
      if (studentOptIndex !== -1 && q.options[studentOptIndex]) {
        const studentOptText = q.options[studentOptIndex].trim().toLowerCase();
        const correctOptText = String(correctAnswer).trim().toLowerCase();
        if (studentOptText === correctOptText || (correctOptText.length > 2 && studentOptText.includes(correctOptText))) {
          return true;
        }
      }
    }

    return false;
  }

  // 3. Fill in the blank / Short answer / Ordering
  if (q.type === 'fill_blank' || q.type === 'short_answer' || q.type === 'ordering') {
    const studentStr = String(studentAnswer).trim().toLowerCase();

    if (Array.isArray(correctAnswer)) {
      return correctAnswer.some(ans => String(ans).trim().toLowerCase() === studentStr);
    }

    const correctStr = String(correctAnswer).trim().toLowerCase();

    if (studentStr === correctStr) return true;

    if (correctStr.includes('/') || correctStr.includes('|') || correctStr.includes(';')) {
      const alternatives = correctStr.split(/[/|;]/).map(s => s.trim().toLowerCase());
      return alternatives.includes(studentStr);
    }

    return false;
  }

  return false;
}
