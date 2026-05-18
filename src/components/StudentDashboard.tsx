import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { FileText, Clock, Play, GraduationCap, CheckCircle, Target, Trophy, Medal, BookOpen, AlertCircle, Award, Star } from 'lucide-react';
import StudentBadgesTab from './StudentBadgesTab';
import StudentLeaderboard from './StudentLeaderboard';

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
  onSwitchRole: () => void;
}

interface Exam {
  id: string;
  title: string;
  timeLimit: number;
  allowRetake?: boolean;
  createdAt: string;
  teacherName?: string;
  assignedClassIds?: string[];
  ownerId: string;
  grade?: string;
  examType?: string;
}

interface Submission {
  id: string;
  examId: string;
  examTitle?: string;
  score: number;
  maxScore: number;
  submittedAt: string;
}

interface LeaderboardEntry {
  id: string;
  studentId: string;
  studentName: string;
  month: string;
  totalScore: number;
  submissionCount: number;
}

const CustomBadgeIcon = ({ className = "w-6 h-6", starClassName = "w-[40%] h-[40%]" }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <Medal className="w-full h-full text-indigo-600" />
    <div className="absolute inset-0 flex items-center justify-center translate-y-1">
      <Star className={`${starClassName} text-white fill-white`} />
    </div>
  </div>
);

export default function StudentDashboard({ user, onLogout, onSwitchRole }: StudentDashboardProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [badgeCount, setBadgeCount] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'badges'>('pending');

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user.email) return;
      setLoading(true);
      try {
        // 1. Find all classes the student belongs to
        const classQuery = query(collection(db, 'classes'), where('studentEmails', 'array-contains', user.email.toLowerCase()));
        const classSnap = await getDocs(classQuery);
        const classIds = classSnap.docs.map(d => d.id);

        const examDocsMap = new Map();

        // 2. Query exams where explicitly allowed by email
        const examsQuery = query(
          collection(db, 'exams'), 
          where('allowedEmails', 'array-contains', user.email.toLowerCase())
        );
        const examsSnapshot = await getDocs(examsQuery);
        examsSnapshot.docs.forEach(doc => examDocsMap.set(doc.id, doc));

        // 3. Query exams assigned to the student's classes (chunking to respect Firestore limit of 30)
        if (classIds.length > 0) {
           for (let i = 0; i < classIds.length; i += 30) {
              const chunk = classIds.slice(i, i + 30);
              const classExamQuery = query(collection(db, 'exams'), where('assignedClassIds', 'array-contains-any', chunk));
              const classExamSnap = await getDocs(classExamQuery);
              classExamSnap.docs.forEach(doc => examDocsMap.set(doc.id, doc));
           }
        }

        const fetchedExams = await Promise.all(Array.from(examDocsMap.values()).map(async (examDoc) => {
          const data = examDoc.data();
          let teacherName = 'Giáo viên';
          // Find teacher name
          try {
            const userRef = doc(db, 'users', data.ownerId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists() && userSnap.data().displayName) {
              teacherName = userSnap.data().displayName;
            }
          } catch(e) {}
          
          return {
            id: examDoc.id,
            title: data.title,
            timeLimit: data.timeLimit || 0,
            allowRetake: data.allowRetake || false,
            createdAt: data.createdAt,
            ownerId: data.ownerId,
            grade: data.grade,
            examType: data.examType,
            teacherName
          };
        }));
        
        setExams(fetchedExams);

        // Query submissions by this student
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('studentId', '==', user.uid)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const fetchedSubmissions = await Promise.all(submissionsSnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let title = 'Bài tập đã bị xóa';
          const existing = fetchedExams.find(e => e.id === data.examId);
          if (existing) {
            title = existing.title;
          } else {
            try {
              const examRef = doc(db, 'exams', data.examId);
              const examSnap = await getDoc(examRef);
              if (examSnap.exists() && examSnap.data().title) {
                title = examSnap.data().title;
              }
            } catch(e) {}
          }
          return {
            id: docSnap.id,
            examId: data.examId,
            examTitle: title,
            score: data.score,
            maxScore: data.maxScore,
            submittedAt: data.submittedAt
          };
        }));
        setSubmissions(fetchedSubmissions);

        // Fetch Leaderboard for current month
        try {
          const currentMonth = new Date().toISOString().substring(0, 7);
          const lbQuery = query(
            collection(db, 'leaderboards'),
            where('month', '==', currentMonth)
          );
          const lbSnapshot = await getDocs(lbQuery);
          let fetchedLeaderboard = lbSnapshot.docs.map(doc => ({
             id: doc.id,
             studentId: doc.data().studentId,
             studentName: doc.data().studentName,
             month: doc.data().month,
             totalScore: doc.data().totalScore,
             submissionCount: doc.data().submissionCount
          }));
          
          fetchedLeaderboard.sort((a, b) => b.totalScore - a.totalScore);
          setLeaderboard(fetchedLeaderboard);
          
          const myIndex = fetchedLeaderboard.findIndex(entry => entry.studentId === user.uid);
          if (myIndex !== -1) {
            setMyRank(myIndex + 1);
          }
        } catch (lbError) {
          console.error("Error fetching leaderboard: ", lbError);
        }

        // Fetch Student Stats (Badges)
        try {
          const statsRef = doc(db, 'studentStats', user.email.toLowerCase());
          const statsSnap = await getDoc(statsRef);
          if (statsSnap.exists()) {
            setBadgeCount(statsSnap.data().badgeCount || 0);
          }
        } catch (statsErr) {
          console.error("Error fetching student stats: ", statsErr);
        }
      } catch (error) {
        console.error('Error fetching student dashboard info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const handleTakeExam = (examId: string) => {
    window.location.hash = `/exam/${examId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-10 h-10 border-4 border-[#0d9388]/30 border-t-[#0d9388] rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Đang tải GLobal Success Tests LMS...</p>
      </div>
    );
  }

  // Filter out exams that are already submitted UNLESS they allow retake
  const submittedExamIds = new Set(submissions.map(s => s.examId));
  const availableExams = exams.filter(e => !submittedExamIds.has(e.id) || e.allowRetake);
  const completedExams = exams.filter(e => submittedExamIds.has(e.id));

  // Compute stats
  const totalScore = submissions.reduce((acc, sub) => acc + sub.score, 0);
  const totalMaxScore = submissions.reduce((acc, sub) => acc + sub.maxScore, 0);
  const averageScore = submissions.length > 0 ? ((totalScore / totalMaxScore) * 10).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 w-full shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#0d9388] p-2 rounded-xl text-white shadow-sm ring-4 ring-[#0d9388]/10">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">GLobal Success Tests LMS</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 bg-slate-100/80 py-1.5 px-3 rounded-full border border-slate-200 shrink-0">
               <div className="w-6 h-6 bg-[#0d9388] text-white rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0">
                  {user.displayName?.[0] || user.email?.[0] || 'U'}
               </div>
               <span className="text-sm font-semibold text-slate-700 hidden md:inline-block max-w-[150px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
               </span>
            </div>
            {user.email === 'chupro1311@gmail.com' && (
              <Button variant="outline" size="sm" onClick={onSwitchRole} className="hidden sm:flex border-slate-200">
                 Chuyển vai trò
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onLogout} className="text-slate-500 hover:text-red-600 hover:bg-red-50 font-medium">Đăng xuất</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section - Full Width */}
        <div className="relative overflow-hidden rounded-lg bg-[#0d9388] p-6 sm:p-8 text-white shadow-sm border border-teal-700/30 mb-6">
          <div className="relative z-10 h-full flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-teal-50 text-[10px] font-bold uppercase tracking-wider mb-4 border border-white/10 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Hệ thống đang hoạt động
              </div>
              <h2 className="text-2xl sm:text-4xl font-black mb-4 tracking-tight leading-[1.1]">
                Xin chào, <span className="text-yellow-300">{user.displayName?.split(' ').pop() || user.email?.split('@')[0]}</span>! 👋
              </h2>
              <p className="text-teal-50/80 text-base max-w-md mb-6 leading-relaxed font-medium">
                {availableExams.length > 0 
                  ? `Bạn có ${availableExams.length} bài thi đang chờ. Hãy nỗ lực hết mình nhé!`
                  : "Bạn đã hoàn thành xuất sắc mọi bài thi. Nghỉ ngơi nhé!"}
              </p>
              
              <div className="flex flex-wrap items-center gap-4">
                <Button 
                  onClick={() => {
                    setActiveTab('pending');
                    document.getElementById('student-tabs-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-white text-[#0d9388] hover:bg-slate-50 font-black px-6 py-5 rounded-md shadow-sm group text-sm"
                >
                  Vào thi ngay
                  <Play className="w-4 h-4 ml-2 fill-current group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <div className="hidden sm:flex items-center gap-3 bg-teal-800/40 px-3 py-2 rounded-md border border-white/5 backdrop-blur-sm">
                   <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-7 h-7 rounded-full border-2 border-[#0d9388] bg-teal-700 flex items-center justify-center text-[10px] font-bold">
                           {String.fromCharCode(64 + i)}
                        </div>
                      ))}
                   </div>
                   <span className="text-[10px] font-bold text-teal-100">+12 bạn khác</span>
                </div>
              </div>
            </div>
            
            <div className="hidden lg:block relative shrink-0">
               <BookOpen className="w-48 h-48 text-white/10 rotate-[-15deg]" />
            </div>
          </div>
          
          {/* Background Decorations */}
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl" />
        </div>

        {/* Stats Section - 3 Columns Below */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              label: 'Huy hiệu đạt được', 
              value: badgeCount, 
              suffix: 'huy hiệu', 
              icon: CustomBadgeIcon, 
              color: 'text-indigo-600', 
              bg: 'bg-indigo-50',
              borderColor: 'border-indigo-100'
            },
            { 
              label: 'Bài thi đã xong', 
              value: submissions.length, 
              suffix: 'bài tập', 
              icon: Target, 
              color: 'text-emerald-600', 
              bg: 'bg-emerald-50',
              borderColor: 'border-emerald-100'
            },
            { 
              label: 'Điểm trung bình', 
              value: averageScore, 
              suffix: '/ 10 điểm', 
              icon: Trophy, 
              color: 'text-amber-600', 
              bg: 'bg-amber-50',
              borderColor: 'border-amber-100'
            }
          ].map((stat, idx) => (
            <Card key={idx} className={`flex-1 border shadow-sm hover:shadow transition-all duration-300 group overflow-hidden bg-white ${stat.borderColor} rounded-lg`}>
              <CardContent className="p-6 flex items-center gap-5 relative z-10">
                <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-md flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500`}>
                  <stat.icon className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{stat.label}</div>
                  <div className="flex items-baseline gap-1.5">
                    <div className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase">{stat.suffix}</div>
                  </div>
                </div>
              </CardContent>
              <div className={`absolute top-0 right-0 w-1.5 h-full ${stat.bg.replace('bg-', 'bg-opacity-50 bg-')} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            {/* Custom Tabs Navigation */}
        <div id="student-tabs-section" className="flex items-center gap-2 border-b border-slate-200">
           <button
             onClick={() => setActiveTab('pending')}
             className={`pb-4 px-4 font-semibold text-sm transition-all relative ${
               activeTab === 'pending' 
                 ? 'text-[#0d9388]' 
                 : 'text-slate-500 hover:text-slate-700'
             }`}
           >
             <div className="flex items-center gap-2">
               <FileText className="w-4 h-4" />
               Việc cần làm
               <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'pending' ? 'bg-[#0d9388] text-white' : 'bg-slate-100 text-slate-500'}`}>
                 {availableExams.length}
               </span>
             </div>
             {activeTab === 'pending' && (
               <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0d9388] rounded-t-full" />
             )}
           </button>
           
           <button
             onClick={() => setActiveTab('completed')}
             className={`pb-4 px-4 font-semibold text-sm transition-all relative ${
               activeTab === 'completed' 
                 ? 'text-[#0d9388]' 
                 : 'text-slate-500 hover:text-slate-700'
             }`}
           >
             <div className="flex items-center gap-2">
               <CheckCircle className="w-4 h-4" />
               Đã hoàn thành
               <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'completed' ? 'bg-[#0d9388] text-white' : 'bg-slate-100 text-slate-500'}`}>
                 {submissions.length}
               </span>
             </div>
             {activeTab === 'completed' && (
               <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0d9388] rounded-t-full" />
             )}
           </button>
           
           <button
             onClick={() => setActiveTab('badges')}
             className={`pb-4 px-4 font-semibold text-sm transition-all relative ${
               activeTab === 'badges' 
                 ? 'text-[#0d9388]' 
                 : 'text-slate-500 hover:text-slate-700'
             }`}
           >
             <div className="flex items-center gap-2">
               <Award className="w-4 h-4" />
               Bảng thành tích
             </div>
             {activeTab === 'badges' && (
               <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0d9388] rounded-t-full" />
             )}
           </button>
        </div>

        {/* Tab Contents */}
        <div className="pt-2">
          {activeTab === 'pending' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {availableExams.length === 0 ? (
                <div className="bg-white rounded-lg border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                   <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-10 h-10" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 mb-2">Tuyệt vời! Bạn đã hoàn thành hết nhiệm vụ.</h3>
                   <p className="text-slate-500 max-w-sm">Hiện tại không có bài tập nào đang chờ. Hãy dành thời gian ôn tập hoặc nghỉ ngơi nhé.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableExams.map(exam => (
                    <Card key={exam.id} className="group hover:shadow transition-all duration-300 border-slate-200 overflow-hidden flex flex-col bg-white">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                           {exam.grade ? (
                             <span className="bg-indigo-50 text-indigo-700 text-[10px] uppercase font-bold px-2 py-1 rounded-md border border-indigo-100 tracking-wider">
                                Khối {exam.grade}
                             </span>
                           ) : (
                             <span className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold px-2 py-1 rounded-md border border-slate-200 tracking-wider">
                                Chưa phân loại
                             </span>
                           )}
                           {exam.examType && (
                             <span className="bg-emerald-50 text-emerald-700 text-[10px] uppercase font-bold px-2 py-1 rounded-md border border-emerald-100 tracking-wider">
                               {exam.examType === 'Unit' ? 'Test Unit' : exam.examType}
                             </span>
                           )}
                           {submittedExamIds.has(exam.id) && exam.allowRetake && (
                             <span className="bg-amber-50 text-amber-600 text-[10px] uppercase font-bold px-2 py-1 rounded-md border border-amber-100 tracking-wider flex items-center gap-1">
                               <AlertCircle className="w-3 h-3" /> Được làm lại
                             </span>
                           )}
                        </div>
                        
                        <h3 className="font-bold text-xl text-slate-800 mb-2 line-clamp-2 leading-tight group-hover:text-[#0d9388] transition-colors" title={exam.title}>
                           {exam.title}
                        </h3>
                        
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                           <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-400">
                             {exam.teacherName?.[0] || 'G'}
                           </div>
                           Giao bởi: <span className="font-medium text-slate-700">{exam.teacherName}</span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                          <div className="flex items-center text-sm font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                            <Clock className="w-4 h-4 mr-1.5 text-slate-400" />
                            {exam.timeLimit > 0 ? `${exam.timeLimit} phút` : 'Không giới hạn'}
                          </div>
                          <Button 
                             onClick={() => handleTakeExam(exam.id)} 
                             className="bg-[#0d9388] hover:bg-[#0a7b72] shadow-none transition-all font-semibold rounded-md"
                          >
                            Làm bài <Play className="w-4 h-4 ml-1.5 fill-current" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'completed' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {submissions.length === 0 ? (
                <div className="bg-white rounded-lg border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                   <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-10 h-10" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa có bài tập nào hoàn thành</h3>
                   <p className="text-slate-500 max-w-sm">Kết quả và lịch sử làm bài của bạn sẽ xuất hiện ở đây.</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                   <div className="grid grid-cols-1 divide-y divide-slate-100">
                     {[...submissions].sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map(sub => {
                       const scorePercentage = (sub.score / sub.maxScore) * 100;
                       
                       return (
                         <div key={sub.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                           <div className="flex-1">
                             <h3 className="font-bold text-lg text-slate-800 mb-1">
                               {sub.examTitle || 'Bài tập đã bị xóa'}
                             </h3>
                             <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5">
                                   <Clock className="w-4 h-4" /> 
                                   Đã nộp: {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                                </span>
                             </div>
                           </div>
                           
                           <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-8 bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-md sm:rounded-none w-full sm:w-auto">
                             <div className="flex items-center justify-between sm:justify-start gap-4">
                               <div className="text-left sm:text-right">
                                 <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Điểm số</div>
                                 <div className={`font-black text-2xl leading-none ${
                                   scorePercentage >= 80 ? 'text-emerald-600' : 
                                   scorePercentage >= 50 ? 'text-amber-500' : 
                                   'text-red-500'
                                 }`}>
                                   {parseFloat(sub.score.toFixed(2))} <span className="text-slate-400 text-sm font-medium">/ {sub.maxScore}</span>
                                 </div>
                               </div>
                               
                               {/* Score progress circle indicator */}
                               <div className="w-12 h-12 rounded-full flex items-center justify-center relative overflow-hidden bg-slate-200 shrink-0">
                                  <div 
                                    className={`absolute bottom-0 w-full transition-all duration-1000 ease-out ${
                                      scorePercentage >= 80 ? 'bg-emerald-500' : 
                                      scorePercentage >= 50 ? 'bg-amber-400' : 
                                      'bg-red-400'
                                    }`}
                                    style={{ height: `${scorePercentage}%` }}
                                  />
                                  <div className="absolute inset-[3px] bg-white rounded-full" />
                                  <span className="relative z-10 text-xs font-bold text-slate-700">
                                    {Math.round(scorePercentage)}%
                                  </span>
                               </div>
                             </div>
                             
                             <div className="w-[1px] h-10 bg-slate-200 hidden sm:block"></div>
                             
                             <Button 
                               onClick={() => window.location.hash = `/review/${sub.id}`}
                               className="w-full sm:w-auto font-semibold text-white bg-[#0d9388] hover:bg-[#ff4500] shrink-0 border-0 transition-colors"
                             >
                                Xem lại
                             </Button>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                </div>
              )}
            </section>
          )}

          {activeTab === 'badges' && (
             <StudentBadgesTab badgeCount={badgeCount} />
          )}
        </div>
      </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-4 space-y-6">
          <StudentLeaderboard 
            leaderboard={leaderboard} 
            user={user} 
            myRank={myRank} 
          />
        </div>
      </div>
    </main>

      {/* FOOTER */}
      <footer className="bg-slate-100 border-t border-slate-200 mt-auto shrink-0 shadow-[0_-1px_3px_rgba(0,0,0,0.05)] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-black flex-wrap flex items-center gap-1 md:gap-2 justify-center md:justify-start">
            <span>&copy; 2026 - {new Date().getFullYear()} Hệ thống tạo đề & chấm điểm tự động.</span>
            <span className="hidden sm:inline">&middot;</span>
            <span>Một sản phẩm của <a href="https://globalsuccessfiles.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:text-blue-800 transition-colors hover:underline">GlobalSuccessFiles.Com</a></span>
          </div>
          <div className="flex gap-6 text-sm text-black">
            <button className="hover:text-blue-600 transition-colors">Hỗ trợ</button>
            <button className="hover:text-blue-600 transition-colors">Hướng dẫn</button>
            <button className="hover:text-blue-600 transition-colors">Báo lỗi</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
