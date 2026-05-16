import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { FileText, Clock, Play, GraduationCap, CheckCircle, Target, Trophy, Sparkles, BookOpen, AlertCircle } from 'lucide-react';

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

export default function StudentDashboard({ user, onLogout, onSwitchRole }: StudentDashboardProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'leaderboard'>('pending');

  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  const handleJoinClass = async () => {
    if (!joinCode.trim()) return;
    setIsJoining(true);
    setJoinError('');
    setJoinSuccess('');
    try {
      const q = query(collection(db, 'classes'), where('classCode', '==', joinCode.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setJoinError('Mã lớp không hợp lệ hoặc không tồn tại.');
        setIsJoining(false);
        return;
      }
      
      const classDoc = snap.docs[0];
      const classData = classDoc.data();
      const currentEmails = classData.studentEmails || [];
      const userEmail = user.email!.toLowerCase();

      if (currentEmails.includes(userEmail)) {
        setJoinError('Bạn đã ở trong lớp này rồi.');
        setIsJoining(false);
        return;
      }

      await updateDoc(doc(db, 'classes', classDoc.id), {
        studentEmails: [...currentEmails, userEmail]
      });

      setJoinSuccess(`Tham gia lớp ${classData.name} thành công!`);
      setJoinCode('');
      
      // Refresh exams (delay slightly to allow Firestore to update)
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error(error);
      setJoinError('Có lỗi xảy ra khi tham gia lớp. Vui lòng thử lại.');
    } finally {
      setIsJoining(false);
    }
  };

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
        
        {/* Welcome & Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
           <div className="md:col-span-8 bg-gradient-to-br from-[#0d9388] to-[#0a7b72] rounded-2xl p-8 text-white relative overflow-hidden shadow-lg border border-[#0d9388]/20">
              <div className="relative z-10">
                 <h2 className="text-3xl font-extrabold mb-2 flex items-center gap-2">
                    Xin chào, {user.displayName || user.email?.split('@')[0]}! <Sparkles className="w-6 h-6 text-yellow-300" />
                 </h2>
                 <p className="text-teal-50 text-lg max-w-lg mb-6 leading-relaxed">
                    Hôm nay là một ngày tuyệt vời để học hỏi thêm những điều mới. Bạn có {availableExams.length} nhiệm vụ đang chờ hoàn thành.
                 </p>
                 <Button 
                   onClick={() => setActiveTab('pending')}
                   className="bg-white text-[#0d9388] hover:bg-slate-50 font-bold border-0 shadow-sm"
                 >
                    Xem nhiệm vụ ngay
                 </Button>
              </div>
              <BookOpen className="absolute -bottom-6 -right-6 w-48 h-48 text-white/10 rotate-[-15deg] pointer-events-none" />
           </div>

           <div className="md:col-span-4 flex flex-col gap-4">
              <Card className="flex-1 border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                 <CardContent className="p-6 flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                       <Target className="w-6 h-6" />
                    </div>
                    <div>
                       <div className="text-sm font-medium text-slate-500 mb-1">Đã hoàn thành</div>
                       <div className="text-3xl font-black text-slate-800">{submissions.length} <span className="text-lg font-medium text-slate-400">bài</span></div>
                    </div>
                 </CardContent>
                 <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none" />
              </Card>

              <Card className="flex-1 border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                 <CardContent className="p-6 flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center shrink-0">
                       <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                       <div className="text-sm font-medium text-slate-500 mb-1">Điểm trung bình</div>
                       <div className="text-3xl font-black text-slate-800">{averageScore} <span className="text-lg font-medium text-slate-400">/ 10</span></div>
                    </div>
                 </CardContent>
                 <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-yellow-50/50 to-transparent pointer-events-none" />
              </Card>
           </div>
        </div>

        {/* Custom Tabs Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
             <button
               onClick={() => setActiveTab('pending')}
               className={`pb-4 px-4 font-semibold text-sm transition-all relative whitespace-nowrap ${
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
               className={`pb-4 px-4 font-semibold text-sm transition-all relative whitespace-nowrap ${
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
               onClick={() => setActiveTab('leaderboard')}
               className={`pb-4 px-4 font-semibold text-sm transition-all relative whitespace-nowrap ${
                 activeTab === 'leaderboard' 
                   ? 'text-[#0d9388]' 
                   : 'text-slate-500 hover:text-slate-700'
               }`}
             >
               <div className="flex items-center gap-2">
                 <Trophy className="w-4 h-4" />
                 Bảng xếp hạng
               </div>
               {activeTab === 'leaderboard' && (
                 <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0d9388] rounded-t-full" />
               )}
             </button>
          </div>
          
          <div className="flex items-center gap-2 pb-4 sm:pb-2">
             {joinError && <span className="text-xs text-red-500 font-medium whitespace-nowrap">{joinError}</span>}
             {joinSuccess && <span className="text-xs text-teal-600 font-medium whitespace-nowrap">{joinSuccess}</span>}
             <input 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Nhập mã lớp"
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md outline-none focus:border-teal-500 w-32 uppercase"
                maxLength={10}
             />
             <Button size="sm" onClick={handleJoinClass} disabled={isJoining || !joinCode.trim()} className="bg-slate-800 hover:bg-slate-700 text-white border-0 h-8">
               {isJoining ? 'Đang...' : 'Tham gia'}
             </Button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="pt-2">
          {activeTab === 'pending' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {availableExams.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                   <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-10 h-10" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 mb-2">Tuyệt vời! Bạn đã hoàn thành hết nhiệm vụ.</h3>
                   <p className="text-slate-500 max-w-sm">Hiện tại không có bài tập nào đang chờ. Hãy dành thời gian ôn tập hoặc nghỉ ngơi nhé.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableExams.map(exam => (
                    <Card key={exam.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200 overflow-hidden flex flex-col bg-white">
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
                          <div className="flex items-center text-sm font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                            <Clock className="w-4 h-4 mr-1.5 text-slate-400" />
                            {exam.timeLimit > 0 ? `${exam.timeLimit} phút` : 'Không giới hạn'}
                          </div>
                          <Button 
                             onClick={() => handleTakeExam(exam.id)} 
                             className="bg-[#0d9388] hover:bg-[#0a7b72] shadow-sm shadow-[#0d9388]/20 transition-all font-semibold rounded-lg"
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
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                   <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-10 h-10" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa có bài tập nào hoàn thành</h3>
                   <p className="text-slate-500 max-w-sm">Kết quả và lịch sử làm bài của bạn sẽ xuất hiện ở đây.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
                           
                           <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-8 bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-xl sm:rounded-none w-full sm:w-auto">
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

          {activeTab === 'leaderboard' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="bg-gradient-to-r from-amber-500 to-orange-400 p-8 text-white text-center relative overflow-hidden">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-200 opacity-90 shadow-sm" />
                    <h2 className="text-2xl font-bold mb-2">Bảng Xếp Hạng Tháng {new Date().getMonth() + 1}</h2>
                    <p className="text-amber-50">Cố gắng hoàn thành bài tập để tích lũy điểm số và lọt vào top 10 nhé!</p>
                    {myRank !== null && (
                      <div className="mt-6 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full border border-white/30 backdrop-blur-sm">
                        <span className="font-medium text-amber-50">Vị trí của bạn:</span>
                        <span className="font-bold text-xl text-yellow-100">Top {myRank}</span>
                      </div>
                    )}
                 </div>
                 
                 <div className="p-0">
                    {leaderboard.length === 0 ? (
                      <div className="p-12 text-center text-slate-500">
                         Chưa có dữ liệu bảng xếp hạng tháng này.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                         {leaderboard.slice(0, 10).map((entry, index) => {
                           const isTop3 = index < 3;
                           const isMe = entry.studentId === user.uid;
                           return (
                             <div 
                               key={entry.id} 
                               className={`flex items-center p-4 sm:p-6 transition-colors ${isMe ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}
                             >
                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base shrink-0 border-2 ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-600 border-yellow-200' :
                                  index === 1 ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                  index === 2 ? 'bg-orange-100 text-orange-600 border-orange-200' :
                                  'bg-transparent text-slate-400 border-transparent'
                                }`}>
                                  {index + 1}
                                </div>
                                
                                <div className="ml-4 sm:ml-6 flex-1 flex items-center gap-3 space-x-2">
                                   <div className="w-10 h-10 bg-[#0d9388]/10 text-[#0d9388] rounded-full flex items-center justify-center font-bold uppercase shrink-0">
                                      {entry.studentName?.[0] || 'U'}
                                   </div>
                                   <div>
                                     <div className="font-bold text-slate-800 flex items-center gap-2">
                                        {entry.studentName}
                                        {isMe && <span className="text-[10px] bg-[#0d9388] text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">Bạn</span>}
                                     </div>
                                     <div className="text-xs text-slate-500">
                                        {entry.submissionCount} bài đã nộp
                                     </div>
                                   </div>
                                </div>
                                
                                <div className="text-right ml-4">
                                   <div className="font-black text-xl text-slate-800">{entry.totalScore.toFixed(0)}</div>
                                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm</div>
                                </div>
                             </div>
                           );
                         })}
                      </div>
                    )}
                 </div>
               </div>
            </section>
          )}
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
