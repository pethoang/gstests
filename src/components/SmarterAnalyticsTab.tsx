import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  AlertTriangle, 
  HelpCircle, 
  BookOpen, 
  CheckCircle, 
  XCircle, 
  Brain, 
  TrendingDown, 
  LineChart, 
  Sparkles, 
  ChevronRight, 
  RefreshCw,
  Search,
  BookMarked,
  Layers,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

interface Question {
  id: string;
  order: number;
  section: string;
  type: string;
  content: string;
  options?: string[];
  correctAnswer?: string | boolean | string[];
  points: number;
  notes?: string;
}

interface ExamRecord {
  id: string;
  title: string;
  questions: Question[];
  grade?: string;
  examType?: string;
  createdAt?: string;
}

interface Submission {
  id: string;
  examId: string;
  studentName: string;
  studentEmail: string;
  score: number;
  maxScore: number;
  answers: Record<string, string | boolean>;
}

interface QuestionStats {
  questionId: string;
  questionText: string;
  section: string;
  order: number;
  type: string;
  totalSubmissions: number;
  correctCount: number;
  incorrectCount: number;
  successRate: number; // percentage
  optionsStats: Record<string, number>; // optionLetter/optionText -> choiceCount
  correctAnswer: string;
  primaryTrapOption: string | null;  // option chosen the most after the correct one
  primaryTrapCount: number;
  primaryTrapRate: number; // % of incorrect answers that chose this trap
  commonWrongAnswers: { text: string; count: number }[]; // for fill_blank / short_answer
  pedagogicalInsight: string;
}

interface SmarterAnalyticsTabProps {
  examId?: string;
  onBack?: () => void;
}

export default function SmarterAnalyticsTab({ examId, onBack }: SmarterAnalyticsTabProps) {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<ExamRecord | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSubs, setLoadingSubs] = useState<boolean>(false);
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [activeSubtab, setActiveSubtab] = useState<'overview' | 'traps' | 'pedagogy'>('overview');
  const [searchQuestion, setSearchQuestion] = useState<string>('');

  // Fetch Teacher Exams on mount
  useEffect(() => {
    fetchTeacherExams();
  }, []);

  const fetchTeacherExams = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, 'exams'),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetched: ExamRecord[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetched.push({
          id: doc.id,
          title: data.title || 'Bài kiểm tra không tên',
          questions: data.questions || [],
          grade: data.grade,
          examType: data.examType,
          createdAt: data.createdAt
        });
      });
      setExams(fetched);
      if (examId) {
        setSelectedExamId(examId);
      } else if (fetched.length > 0) {
        setSelectedExamId(fetched[0].id);
      }
    } catch (err) {
      console.error("Error fetching exams for analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch submissions and analyze details when selectedExamId changes
  useEffect(() => {
    if (!selectedExamId) {
      setSelectedExam(null);
      setSubmissions([]);
      setQuestionStats([]);
      return;
    }

    const current = exams.find(e => e.id === selectedExamId) || null;
    setSelectedExam(current);

    if (current) {
      fetchSubmissionsForExam(current);
    }
  }, [selectedExamId, exams]);

  const fetchSubmissionsForExam = async (exam: ExamRecord) => {
    setLoadingSubs(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, 'submissions'),
        where('examId', '==', exam.id),
        where('teacherId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const fetchedSubs: Submission[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        fetchedSubs.push({
          id: doc.id,
          examId: d.examId || '',
          studentName: d.studentName || 'Học sinh ẩn danh',
          studentEmail: d.studentEmail || '',
          score: d.score || 0,
          maxScore: d.maxScore || 10,
          answers: d.answers || {}
        });
      });
      setSubmissions(fetchedSubs);
      analyzeSubmissionsData(exam, fetchedSubs);
    } catch (err) {
      console.error("Error fetching submissions for analysis:", err);
    } finally {
      setLoadingSubs(false);
    }
  };

  // Generate automated pedagogical suggestions based on questions and trap options
  const getInsightText = (
    question: Question, 
    trap: string | null, 
    rate: number, 
    totalIncorrect: number,
    commonWrongs: { text: string; count: number }[]
  ): string => {
    const text = question.content.toLowerCase();
    const correctVal = String(question.correctAnswer).trim();
    const isMultipleChoice = question.type === 'multiple_choice';

    // 1. CONSTRUCTED RESPONSE (TỰ LUẬN / ĐIỀN KHUYẾT) INSIGHTS
    if (!isMultipleChoice) {
      const topWrong = commonWrongs.length > 0 ? commonWrongs[0].text : '';
      
      if (topWrong) {
        return `HS viết sai nhiều nhất là "${topWrong}" (đáp án đúng: "${correctVal}"). GV cần hướng dẫn cách sửa lỗi chính tả, chia động từ hoặc giới từ tại cụm này.`;
      }

      if (text.includes('should') || text.includes('must') || text.includes('have to') || correctVal.toLowerCase().includes('should') || correctVal.toLowerCase().includes("shouldn't")) {
        return `Câu tự luận về động từ khuyết thiếu (Modal Verbs). HS dễ chia sai dạng động từ nguyên thể (V-bare) hoặc quên từ khóa biểu đạt ý phủ định/khẳng định.`;
      }
      
      if (text.includes('too') || text.includes('enough') || text.includes('such') || text.includes('so')) {
        return `Câu tự luận về cấu trúc so/such/too/enough. Cần lưu ý HS về trật tự từ tính từ/danh từ và tránh viết lặp lại đại từ tân ngữ ở vế sau.`;
      }

      if (text.includes('wish') || text.includes('if ') || text.includes('unless')) {
        return `Kiểm tra viết lại câu điều kiện hoặc câu ước. Nhắc nhở HS cẩn thận quy tắc lùi thì động từ và đảo ngược thể khẳng định/phủ định so với đề.`;
      }

      return `Dạng tự luận viết câu/điền khuyết (đáp án đúng: "${correctVal}"). Lỗi thường gặp do chia động từ sai thì, thiếu giới từ hoặc phát sinh lỗi chính tả nhỏ.`;
    }

    // 2. MULTIPLE CHOICE (TRẮC NGHIỆM) INSIGHTS
    if (trap) {
      const pPercent = (rate * 100).toFixed(0);
      return `HS sập bẫy nhiều nhất ở đáp án [${trap}] (chiếm ${pPercent}% lỗi sai, đáp án đúng: [${correctVal}]. GV nên giúp HS phân biệt kỹ 2 lựa chọn này.`;
    }

    if (text.includes('pronounced') || text.includes('pronunciation')) {
      return `HS nhầm cách phát âm của từ chính. Hãy củng cố quy tắc ngữ âm, vị trí trọng âm hoặc cách phát âm đuôi -ed/-s/es của đáp án đúng [${correctVal}].`;
    }

    if (text.includes('interested in') || text.includes('fond of') || text.includes('keen on') || text.includes('good at') || text.includes('afraid of')) {
      return `HS dễ nhầm giới từ đi kèm tính từ/động từ (Collocations). Cung cấp cách học thuộc lòng trực quan cụm từ đúng [${correctVal}].`;
    }

    return `Lỗi sai phân bổ đều cho thấy HS còn mơ hồ, chưa nắm chắc từ vựng/ngữ pháp để loại trừ đáp án nhiễu. Cần củng cố về nghĩa ngữ cảnh của [${correctVal}].`;
  };

  const analyzeSubmissionsData = (exam: ExamRecord, subs: Submission[]) => {
    if (subs.length === 0 || !exam.questions) {
      setQuestionStats([]);
      return;
    }

    const calculatedStats: QuestionStats[] = exam.questions.map(q => {
      let correct = 0;
      let incorrect = 0;
      const optionCounts: Record<string, number> = {};
      const wrongTextCounts: Record<string, number> = {};

      // Initialize option map for multiple choice
      if (q.type === 'multiple_choice') {
        ['A', 'B', 'C', 'D'].forEach(letter => {
          optionCounts[letter] = 0;
        });
      }

      subs.forEach(sub => {
        const studentAns = sub.answers[q.id];
        const isCorrect = studentAns !== undefined && String(studentAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();

        if (isCorrect) {
          correct++;
        } else {
          incorrect++;
        }

        if (studentAns !== undefined && studentAns !== "") {
          const ansStr = String(studentAns).trim();
          if (q.type === 'multiple_choice') {
            const letter = ansStr.toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(letter)) {
              optionCounts[letter] = (optionCounts[letter] || 0) + 1;
            }
          } else {
            // Text values for blank fills
            wrongTextCounts[ansStr] = (wrongTextCounts[ansStr] || 0) + 1;
          }
        }
      });

      const totalCount = correct + incorrect || 1;
      const successRate = (correct / totalCount) * 100;

      // Primary trap Analysis
      let primaryTrapOption: string | null = null;
      let primaryTrapCount = 0;
      let primaryTrapRate = 0;

      const correctAnsStr = String(q.correctAnswer).toUpperCase();

      if (q.type === 'multiple_choice') {
        Object.entries(optionCounts).forEach(([option, count]) => {
          if (option !== correctAnsStr && count > primaryTrapCount) {
            primaryTrapCount = count;
            primaryTrapOption = option;
          }
        });

        if (incorrect > 0 && primaryTrapOption) {
          primaryTrapRate = primaryTrapCount / incorrect;
        }
      }

      // Sorted common wrong answers
      const commonWrongAnswers = Object.entries(wrongTextCounts)
        .filter(([ansText]) => ansText.toLowerCase() !== String(q.correctAnswer).toLowerCase())
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      const insight = getInsightText(q, primaryTrapOption, primaryTrapRate, incorrect, commonWrongAnswers);

      return {
        questionId: q.id,
        questionText: q.content,
        section: q.section || 'Khác',
        order: q.order,
        type: q.type,
        totalSubmissions: subs.length,
        correctCount: correct,
        incorrectCount: incorrect,
        successRate,
        optionsStats: optionCounts,
        correctAnswer: String(q.correctAnswer),
        primaryTrapOption,
        primaryTrapCount,
        primaryTrapRate,
        commonWrongAnswers,
        pedagogicalInsight: insight
      };
    });

    // Sort by success rate ascending (hardest questions first)
    calculatedStats.sort((a, b) => a.successRate - b.successRate);
    setQuestionStats(calculatedStats);
  };

  // Aggregated analytics helper
  const totalSubmissionsCount = submissions.length;
  const difficultQuestions = questionStats.filter(q => q.successRate < 50);
  const trapQuestions = questionStats.filter(q => q.type === 'multiple_choice' && q.primaryTrapRate >= 0.4 && q.successRate < 70);

  const getSectionColor = (sect: string) => {
    if (sect.toLowerCase().includes('vocabulary') || sect.toLowerCase().includes('grammar') || sect.toLowerCase().includes('từ vựng')) {
      return 'bg-blue-50 text-blue-700 border-blue-200/60';
    }
    if (sect.toLowerCase().includes('pronunciation') || sect.toLowerCase().includes('ngữ âm') || sect.toLowerCase().includes('phát âm')) {
      return 'bg-purple-50 text-purple-700 border-purple-200/60';
    }
    if (sect.toLowerCase().includes('reading') || sect.toLowerCase().includes('đọc')) {
      return 'bg-amber-50 text-amber-700 border-amber-200/60';
    }
    if (sect.toLowerCase().includes('writing') || sect.toLowerCase().includes('viết')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200/60';
  };

  const getOptionLabel = (qId: string, optionLetter: string) => {
    if (!selectedExam) return optionLetter;
    const q = selectedExam.questions.find(item => item.id === qId);
    if (!q || !q.options) return optionLetter;
    const index = ['A', 'B', 'C', 'D'].indexOf(optionLetter);
    if (index === -1 || !q.options[index]) return optionLetter;
    const rawOption = q.options[index];
    // Strip prefixes like "A. ", "A) ", "A: " case-insensitively
    return rawOption.replace(/^[A-D]\s*[.)\-:]\s*/i, '');
  };

  const getAvailableOptions = (qId: string): string[] => {
    if (!selectedExam) return ['A', 'B', 'C', 'D'];
    const q = selectedExam.questions.find(item => item.id === qId);
    if (!q || !q.options) return ['A', 'B', 'C', 'D'];
    
    return ['A', 'B', 'C', 'D'].filter((letter, index) => {
      if (index >= q.options.length) return false;
      const val = q.options[index]?.trim();
      if (!val) return false;
      if (index === 3) {
        if (
          val.toUpperCase() === 'D' || 
          val.toUpperCase() === 'D.' || 
          val.toUpperCase() === 'D. '
        ) {
          return false;
        }
      }
      return true;
    });
  };

  const filteredStatsList = questionStats.filter(q => 
    q.questionText.toLowerCase().includes(searchQuestion.toLowerCase()) || 
    q.section.toLowerCase().includes(searchQuestion.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER SECTION WITH DROPDOWN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm font-sans">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onBack}
              className="border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 mr-1 shrink-0 h-10 w-10 rounded-xl"
              title="Quay lại Kho đề thi"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600 animate-pulse" />
              Phân tích "Bẫy" & Câu hỏi khó
            </h2>
            <p className="text-slate-500 text-sm">
              {selectedExam 
                ? `Đang phân tích bài làm của học sinh cho: "${selectedExam.title}"` 
                : 'Tự động dò quét lỗi hệ thống và xác định các phương án gây nhiễu thu hút nhiều học sinh chọn nhất.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!onBack && (
            <>
              <span className="text-sm font-medium text-slate-500 hidden sm:inline">Chọn đề thi:</span>
              {loading ? (
                <div className="w-40 h-10 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="px-4 py-2 border-2 border-slate-200 rounded-xl bg-white text-sm font-semibold max-w-[280px] focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  {exams.length === 0 ? (
                    <option value="">Chưa có đề thi nào</option>
                  ) : (
                    exams.map(exam => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title}
                      </option>
                    ))
                  )}
                </select>
              )}
            </>
          )}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
              if (selectedExam) fetchSubmissionsForExam(selectedExam);
            }} 
            className="border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loadingSubs ? (
        <div className="flex justify-center items-center py-20 flex-col gap-3">
          <div className="w-9 h-9 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">Đang giải mã và thống kê dữ liệu làm bài...</p>
        </div>
      ) : submissions.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 flex flex-col items-center justify-center py-16 px-4">
          <BookMarked className="w-16 h-16 text-slate-300 mb-4 stroke-[1.5]" />
          <h3 className="text-lg font-bold text-slate-800 mb-1">Chưa thể phục vụ phân tích bẫy</h3>
          <p className="text-slate-500 text-sm max-w-md text-center leading-relaxed">
            Hiện chưa có bất cứ lượt nộp bài nào của học sinh cho đề thi này. Hãy phân phối mã đề thi và đợi học sinh hoàn thành để lấy cơ sở dữ liệu phân tích.
          </p>
        </Card>
      ) : (
        <>
          {/* STATS COUNT GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-none border border-slate-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 tracking-wider block">PHÂN TÍCH</span>
                  <h4 className="text-3xl font-extrabold text-slate-900 tracking-tight">{totalSubmissionsCount}</h4>
                  <p className="text-xs text-slate-500">Lượt học sinh nộp bài</p>
                </div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none border border-slate-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 tracking-wider block">CÂU HỎI KHÓ</span>
                  <h4 className={`text-3xl font-extrabold tracking-tight ${difficultQuestions.length > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                    {difficultQuestions.length}
                  </h4>
                  <p className="text-xs text-slate-500">Tỷ lệ chính xác dưới 50%</p>
                </div>
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none border border-slate-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 tracking-wider block">BẪY NỔI TRỘI</span>
                  <h4 className="text-3xl font-extrabold text-[#0d9388] tracking-tight">{trapQuestions.length}</h4>
                  <p className="text-xs text-slate-500">Bẫy lựa chọn {`>=`} 40% sai lệch</p>
                </div>
                <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none border border-slate-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 tracking-wider block">ĐIỂM TRUNG BÌNH</span>
                  <h4 className="text-3xl font-extrabold text-[#0d9388] tracking-tight">
                    {(submissions.reduce((s, u) => s + u.score, 0) / submissions.length).toFixed(1)}
                  </h4>
                  <p className="text-xs text-slate-500">Thang điểm chuẩn 10</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-[#0d9388] rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TAB SEGMENTS */}
          <div className="border-b border-slate-200">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveSubtab('overview')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                  activeSubtab === 'overview' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                1. Bộ câu hỏi cực khó & Trích xuất Bẫy
              </button>
              <button
                onClick={() => setActiveSubtab('traps')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                  activeSubtab === 'traps' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                2. Bản đồ phân phối lỗi sai (Distractor Map)
              </button>
              <button
                onClick={() => setActiveSubtab('pedagogy')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                  activeSubtab === 'pedagogy' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                3. Gợi ý sư phạm & Giải thích bẫy thông minh
              </button>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & DIFFICULT QUESTIONS LIST */}
          {activeSubtab === 'overview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative w-full max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuestion}
                    onChange={(e) => setSearchQuestion(e.target.value)}
                    placeholder="Tìm theo nội dung câu hỏi hoặc phần kiến thức..."
                    className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Sắp xếp mặc định: <span className="font-bold text-indigo-600">Trả lời đúng thấp nhất tăng dần</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredStatsList.map((stat, idx) => {
                  return (
                    <Card key={stat.questionId} className="shadow-none border border-slate-200 overflow-hidden hover:border-indigo-300 transition-all duration-200">
                      <div className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="font-bold text-indigo-600 border-indigo-200/50 bg-indigo-50">
                              Câu {stat.order}
                            </Badge>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getSectionColor(stat.section)}`}>
                              {stat.section}
                            </span>
                            {stat.successRate < 50 && (
                              <span className="bg-red-50 text-red-600 border border-red-200/40 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" /> Cực khó
                              </span>
                            )}
                            {stat.type === 'multiple_choice' && stat.primaryTrapRate >= 0.4 && (
                              <span className="bg-orange-50 text-orange-600 border border-orange-200/40 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> "Bẫy sập" cao
                              </span>
                            )}
                          </div>

                          <p className="text-slate-800 font-bold leading-relaxed">{stat.questionText}</p>

                          {stat.type === 'multiple_choice' ? (
                            <div className="pt-2">
                              <span className="text-xs font-bold text-slate-400 block uppercase mb-1">CÁC LỰA CHỌN ĐÁP ÁN:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {getAvailableOptions(stat.questionId).map((letter) => {
                                  const isCorrect = letter === stat.correctAnswer.toUpperCase();
                                  const isTrap = letter === stat.primaryTrapOption;
                                  return (
                                    <div 
                                      key={letter} 
                                      className={`p-2.5 rounded-md text-xs border flex items-center justify-between ${
                                        isCorrect 
                                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' 
                                          : isTrap && stat.primaryTrapRate >= 0.3
                                            ? 'bg-rose-50 border-rose-200 text-rose-800 font-semibold'
                                            : 'bg-white border-slate-100 text-slate-600'
                                      }`}
                                    >
                                      <span className="line-clamp-1">
                                        <b className="mr-1.5">{letter}.</b> 
                                        {getOptionLabel(stat.questionId, letter)}
                                      </span>
                                      {isCorrect && <span className="bg-emerald-600 text-white rounded-full p-0.5 text-[8px] font-bold">ĐÚNG</span>}
                                      {isTrap && stat.primaryTrapRate >= 0.3 && (
                                        <span className="bg-rose-600 text-white rounded-full px-1.5 py-0.5 text-[9px] font-extrabold animate-shimmer scale-95" title="Học sinh chọn sai nhắm vào phương án này">
                                          BẪY {Math.round(stat.primaryTrapRate * 100)}%
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            stat.commonWrongAnswers.length > 0 && (
                              <div className="pt-2 space-y-1.5">
                                <span className="text-xs font-bold text-slate-400 block tracking-wider">CÁC PHƯƠNG ÁN SAI PHỔ BIẾN:</span>
                                <div className="flex flex-wrap gap-2">
                                  {stat.commonWrongAnswers.map((wa, i) => (
                                    <div key={i} className="bg-amber-50 text-amber-900 border border-amber-200/50 text-xs px-3 py-1 rounded-lg font-medium">
                                      "{wa.text}" <span className="text-slate-400 font-bold ml-1">x{wa.count} học sinh</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          )}
                        </div>

                        {/* Stats side-badge */}
                        <div className="w-full md:w-32 flex md:flex-col items-center justify-between md:justify-center p-3 bg-slate-50 border border-slate-100 rounded-xl shrink-0 text-center gap-1">
                          <div className="text-xs font-semibold text-slate-500">Tỷ lệ làm đúng</div>
                          <div className={`text-2xl font-extrabold ${stat.successRate < 50 ? 'text-red-500' : 'text-slate-800'}`}>
                            {Math.round(stat.successRate)}%
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {stat.correctCount}/{stat.totalSubmissions} học sinh
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {filteredStatsList.length === 0 && (
                  <div className="text-center py-10 bg-white border border-slate-200/50 rounded-xl text-slate-500">
                    Không tìm thấy câu hỏi tương ứng. Vui lòng gõ lại từ khóa.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CHOICE DISTRIBUTION (DISTRACTOR MAP) */}
          {activeSubtab === 'traps' && (
            <div className="space-y-6">
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200/50 text-indigo-900 text-sm flex gap-3 items-start">
                <LineChart className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Bản đồ lựa chọn (Distractor Map)</strong> phân tích tổng lượng đáp án học sinh làm sai được phân phối vào các phương án nhiễu nào. Một đề thi chuẩn mực cần đảm bảo phương án bẫy không quá dễ nhận biết và có khả năng phân hóa học sinh hiệu quả.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {questionStats.filter(q => q.type === 'multiple_choice').map((stat) => {
                  const chartData = getAvailableOptions(stat.questionId).map(letter => ({
                    name: letter,
                    'Học sinh chọn': stat.optionsStats[letter] || 0,
                    isCorrect: letter === stat.correctAnswer.toUpperCase()
                  }));

                  return (
                    <Card key={stat.questionId} className="shadow-none border border-slate-200 overflow-hidden">
                      <CardHeader className="bg-slate-50 px-5 py-4 flex flex-row items-center justify-between border-b border-slate-200/60">
                        <div className="space-y-0.5 max-w-[70%]">
                          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                            <Badge className="bg-indigo-600 text-white font-extrabold text-[10px]">Câu {stat.order}</Badge>
                            <span className="truncate">{stat.questionText}</span>
                          </CardTitle>
                        </div>
                        <Badge className="bg-slate-200 text-slate-800 text-[10px] uppercase font-bold shrink-0">
                          {stat.section}
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        {/* CHART HOUSING */}
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} />
                              <Tooltip cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }} />
                              <Bar dataKey="Học sinh chọn" radius={[4, 4, 0, 0]} maxBarSize={32}>
                                {chartData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.isCorrect ? '#10b981' : (entry.name === stat.primaryTrapOption && stat.primaryTrapRate >= 0.3 ? '#f43f5e' : '#cbd5e1')} 
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* CAPTION */}
                        <div className="flex text-xs items-center justify-between px-2 pt-2 border-t border-slate-100">
                          <div className="flex gap-4">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#10b981] rounded-full" /> Đúng ( {stat.correctAnswer} )</span>
                            {stat.primaryTrapOption && (
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 bg-[#f43f5e] rounded-full" /> Bẫy chính ( {stat.primaryTrapOption} - {Math.round(stat.primaryTrapRate*100)}% )
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400">Đúng: {Math.round(stat.successRate)}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PEDAGOGICAL INSIGHTS */}
          {activeSubtab === 'pedagogy' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-teal-700 to-[#0e5c54] rounded-2xl p-6 text-white flex items-start gap-4 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="relative z-10 space-y-2">
                  <span className="text-xs font-bold text-yellow-300 uppercase tracking-widest block flex items-center gap-1">
                    <Sparkles className="w-4 h-4 fill-current" /> ĐÁNH GIÁ SƯ PHẠM THỜI GIAN THỰC
                  </span>
                  <h3 className="text-xl font-bold">Phương pháp khắc chế lỗi "Sập bẫy" cho học sinh</h3>
                  <p className="text-teal-100 text-sm max-w-2xl leading-relaxed">
                    Hệ thống đã tự động lọc ra <b className="font-bold text-white text-base">{difficultQuestions.length} câu hỏi khó có tỉ lệ sai vượt quá 50%</b> và gán gợi ý khắc phục kiến thức thích hợp để giúp giáo viên chữa bài đạt hiệu quả tối đa.
                  </p>
                </div>
                {/* Decorative math symbol */}
                <span className="absolute right-6 -bottom-8 text-9xl font-black text-white/5 font-mono select-none pointer-events-none">ENG</span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {questionStats.slice(0, 4).map((stat, idx) => {
                  return (
                    <Card key={stat.questionId} className="shadow-none border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                            #{idx+1}
                          </span>
                          <span className="font-bold text-sm text-slate-800">
                            Khuyết thiếu kiến thức nghiêm trọng nhất tại Câu {stat.order}
                          </span>
                        </div>
                        <Badge className="bg-red-50 border border-red-200 text-red-600 text-[10px] font-extrabold uppercase py-0.5.x px-2">
                          Điểm đúng: {Math.round(stat.successRate)}% ( {stat.correctCount}/{stat.totalSubmissions} học sinh )
                        </Badge>
                      </div>

                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-1 bg-slate-50/50 p-3 rounded-lg border border-slate-200/50 text-slate-800">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider block">NỘI DUNG CÂU HỎI:</div>
                          <p className="font-bold text-sm leading-relaxed text-slate-900">
                            {stat.questionText}
                          </p>
                          {stat.type === 'multiple_choice' && (
                            <div className="mt-2 text-xs text-slate-500">
                              Đáp án chính xác: <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{stat.correctAnswer}. {getOptionLabel(stat.questionId, stat.correctAnswer)}</span>
                              {stat.primaryTrapOption && (
                                <span className="ml-3">
                                  Bẫy sập chính: <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">{stat.primaryTrapOption}. {getOptionLabel(stat.questionId, stat.primaryTrapOption)} ( {Math.round(stat.primaryTrapRate*100)}% sai lệch chọn )</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* INSIGHT BOX */}
                        <div className="space-y-2 bg-indigo-50/30 p-4 rounded-xl border border-indigo-200/40 relative">
                          <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs uppercase tracking-wide">
                            <Brain className="w-4 h-4 text-indigo-600" />
                            Gợi ý giảng dạy súc tích chuyên sâu:
                          </div>
                          <p className="text-slate-700 text-sm leading-relaxed">
                            {stat.pedagogicalInsight}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
