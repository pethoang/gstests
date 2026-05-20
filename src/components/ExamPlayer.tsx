import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, setDoc, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { Question } from '../types';
import PreviewTab from './PreviewTab';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ArrowLeft, CheckCircle, LogIn, Power, Loader2, AlertTriangle } from 'lucide-react';

export default function ExamPlayer() {
  const { examId } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examTitle, setExamTitle] = useState('Bài kiểm tra Tiếng Anh');
  const [timeLimit, setTimeLimit] = useState(45);
  const [allowRetake, setAllowRetake] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [allowedEmails, setAllowedEmails] = useState<string[] | null>(null);
  const [assignedClassIds, setAssignedClassIds] = useState<string[] | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [isExamAccessible, setIsExamAccessible] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [studentName, setStudentName] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasAlreadySubmitted, setHasAlreadySubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);

  useEffect(() => {
    if (hasStarted && timeLimit > 0 && !isSubmitted) {
      setTimeLeft(timeLimit * 60);
    }
  }, [hasStarted, timeLimit, isSubmitted]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isSubmitted || isSubmitting) return;

    const intervalId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(intervalId);
          // Auto submit could be handled here if we had access to the ref of answers
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft, isSubmitted, isSubmitting]);

  const formatTimeFull = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const min = Math.floor((seconds % 3600) / 60);
    const sec = seconds % 60;
    return `${hrs.toString().padStart(2, '0')} : ${min.toString().padStart(2, '0')} : ${sec.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.displayName && !studentName) {
        setStudentName(currentUser.displayName);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      try {
        const docRef = doc(db, 'exams', examId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setQuestions(data.questions || []);
          setExamTitle(data.title || 'Bài kiểm tra Tiếng Anh');
          setTimeLimit(data.timeLimit || 0);
          setAllowRetake(data.allowRetake || false);
          setTeacherId(data.ownerId || null);
          setStartTime(data.startTime || null);
          setEndTime(data.endTime || null);
          if (data.allowedEmails && data.allowedEmails.length > 0) {
            setAllowedEmails(data.allowedEmails);
          }
          if (data.assignedClassIds && data.assignedClassIds.length > 0) {
            setAssignedClassIds(data.assignedClassIds);
          }
        } else {
          setError('Không tìm thấy bài kiểm tra.');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `exams/${examId}`);
        setError('Có lỗi xảy ra khi tải bài kiểm tra.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchExam();
  }, [examId]);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!user || (!allowedEmails && !assignedClassIds)) {
        setIsExamAccessible(true); // Default allow, or let specific checks handle it later
        return;
      }
      
      const userEmail = user.email?.toLowerCase();
      if (!userEmail) return;

      let hasAccess = false;
      
      // Check static allowed emails
      if (allowedEmails && allowedEmails.includes(userEmail)) {
        hasAccess = true;
      }

      // If still no access, check if student is part of assigned classes
      if (!hasAccess && assignedClassIds && assignedClassIds.length > 0) {
        try {
          const classQuery = query(collection(db, 'classes'), where('studentEmails', 'array-contains', userEmail));
          const classSnap = await getDocs(classQuery);
          const studentClassIds = classSnap.docs.map(doc => doc.id);
          
          if (assignedClassIds.some((id: string) => studentClassIds.includes(id))) {
            hasAccess = true;
          }
        } catch (e) {
          console.error("Error verifying class access", e);
        }
      }

      setIsExamAccessible(hasAccess);
    };

    verifyAccess();
  }, [user, allowedEmails, assignedClassIds]);

  useEffect(() => {
    let isActive = true;
    const checkSubmission = async () => {
      if (!user || !examId || loading) return;
      if (allowRetake) {
        if (isActive) setHasAlreadySubmitted(false);
        return;
      }
      try {
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('studentId', '==', user.uid),
          where('examId', '==', examId)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        if (isActive) {
          if (!submissionsSnapshot.empty) {
            setHasAlreadySubmitted(true);
          } else {
            setHasAlreadySubmitted(false);
          }
        }
      } catch (err) {
        console.error("Error checking submission:", err);
      }
    };
    checkSubmission();
    return () => { isActive = false; };
  }, [user, examId, allowRetake, loading]);

  // Anti-cheating effect
  useEffect(() => {
    if (!hasStarted || isSubmitted) return;

    const recordViolation = async (type: string, details: string) => {
      setViolationCount(prev => prev + 1);
      try {
        if (!examId || !teacherId || !user) return;
        // Only save violations if the exam is restricted (not 'Tất cả')
        if (!allowedEmails || allowedEmails.length === 0) return;

        await addDoc(collection(db, 'violations'), {
          examId,
          examTitle,
          teacherId,
          studentId: user.uid,
          studentName,
          studentEmail: user.email || '',
          type,
          timestamp: new Date().toISOString(),
          details
        });
      } catch (e) {
        console.error("Failed to record violation", e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setCheatWarning("Bạn đã thoát chế độ Toàn màn hình hoặc chuyển sang Tab khác! Hệ thống đã ghi nhận hành vi này.");
        recordViolation('tab_switch', 'Học sinh chuyển tab hoặc ẩn trình duyệt');
      }
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setCheatWarning("KHÔNG ĐƯỢC PHÉP SAO CHÉP HOẶC DÁN (COPY/PASTE).\nHành động của bạn đã được báo cáo cho giáo viên.");
      recordViolation('copy_paste', 'Học sinh cố tình copy hoặc paste dữ liệu');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setCheatWarning("Bạn đã thoát chế độ Toàn màn hình hoặc chuyển sang Tab khác! Hệ thống đã ghi nhận hành vi này.");
        recordViolation('leave_fullscreen', 'Thu nhỏ màn hình');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [hasStarted, isSubmitted, user, examId, teacherId, examTitle, studentName]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Auto register student to users collection
      if (result.user) {
        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            displayName: result.user.displayName || 'Học sinh',
            email: result.user.email,
            role: 'student',
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      alert(`Đăng nhập thất bại: ${error?.message || 'Lỗi không xác định'}`);
    }
  };

  const handleSubmit = async (answers: Record<string, string | boolean>) => {
    if (!user) {
      alert("Bạn chưa đăng nhập!");
      return;
    }
    setIsSubmitting(true);
    let totalScore = 0;
    let maxScore = 0;
    
    questions.forEach(q => {
      maxScore += q.points;
      if (answers[q.id] && String(answers[q.id]) === String(q.correctAnswer)) {
        totalScore += q.points;
      }
    });

    setScore(totalScore);

    try {
      if (examId && teacherId) {
        // Only save results if the exam is restricted (not 'Tất cả')
        if (allowedEmails && allowedEmails.length > 0) {
          await addDoc(collection(db, 'submissions'), {
            examId,
            teacherId,
            studentId: user.uid,
            studentEmail: user.email || '',
            studentName,
            answers,
            score: totalScore,
            maxScore,
            submittedAt: new Date().toISOString()
          });

          // Update leaderboard
          const month = new Date().toISOString().substring(0, 7); // yyyy-mm
          const leaderboardRef = doc(db, 'leaderboards', `${user.uid}_${month}`);
          
          try {
            const leaderboardSnap = await getDoc(leaderboardRef);
            if (leaderboardSnap.exists()) {
              await updateDoc(leaderboardRef, {
                 totalScore: increment(totalScore),
                 submissionCount: increment(1),
                 lastUpdatedAt: new Date().toISOString()
              });
            } else {
              await setDoc(leaderboardRef, {
                 studentId: user.uid,
                 studentName: studentName,
                 month: month,
                 totalScore: totalScore,
                 submissionCount: 1,
                 lastUpdatedAt: new Date().toISOString()
              });
            }
          } catch (lbErr) {
            console.error("Error updating leaderboard: ", lbErr);
            // Don't fail the whole submission if leaderboard update fails
          }

          // Award Badge if score >= 50%
          if (maxScore > 0 && totalScore / maxScore >= 0.5) {
            try {
              const studentStatsRef = doc(db, 'studentStats', user.email!.toLowerCase());
              const statsSnap = await getDoc(studentStatsRef);
              
              const isPerfectScore = totalScore === maxScore;
              const badgesToAward = isPerfectScore ? 2 : 1;
              
              if (statsSnap.exists()) {
                await updateDoc(studentStatsRef, {
                  badgeCount: increment(badgesToAward),
                  updatedAt: new Date().toISOString()
                });
              } else {
                await setDoc(studentStatsRef, {
                  email: user.email!.toLowerCase(),
                  badgeCount: badgesToAward,
                  updatedAt: new Date().toISOString()
                });
              }
            } catch (badgeErr) {
              console.error("Error awarding badge:", badgeErr);
            }
          }
        }
      }
      setIsSubmitted(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'submissions');
      alert('Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Đang tải...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-600">{error}</div>;
  }

  // Time check logic - Move to top so it blocks even before login
  const now = new Date();
  
  const parseDate = (dateVal: any) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'string') return new Date(dateVal);
    if (dateVal && typeof dateVal.toDate === 'function') return dateVal.toDate();
    return new Date(dateVal);
  };

  const startObj = parseDate(startTime);
  const endObj = parseDate(endTime);

  if (startObj && now < startObj) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-6 space-y-6">
           <CardTitle className="text-2xl text-amber-600">Chưa tới giờ làm bài</CardTitle>
           <p className="text-slate-600">
             Bài thi này sẽ bắt đầu vào lúc <strong>{startObj.toLocaleString('vi-VN')}</strong>. Vui lòng quay lại sau.
           </p>
           <Button variant="outline" onClick={() => window.location.hash = "/"} className="w-full">
             Quay về trang chủ
           </Button>
        </Card>
      </div>
    );
  }

  if (endObj && now > endObj) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-6 space-y-6">
           <CardTitle className="text-2xl text-red-600">Đã hết hạn làm bài</CardTitle>
           <p className="text-slate-600">
             Bài thi này đã kết thúc vào lúc <strong>{endObj.toLocaleString('vi-VN')}</strong>. Bạn không thể làm bài nữa.
           </p>
           <Button variant="outline" onClick={() => window.location.hash = "/"} className="w-full">
             Quay về trang chủ
           </Button>
        </Card>
      </div>
    );
  }

  if (!questions.length) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Đề thi trống.</div>;
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-6 space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-slate-900">Chúc mừng bạn đã hoàn thành bài thi!</CardTitle>
          <div className="space-y-2">
            <p className="text-slate-500 text-lg">Điểm số ước tính ban đầu:</p>
            <p className="text-4xl font-bold text-blue-600">{score.toFixed(2)}</p>
            <p className="text-sm text-slate-400 mt-2">Phần viết và điền từ có thể cần giáo viên chấm lại.</p>
          </div>
          <div className="pt-4">
             <Button onClick={() => window.location.hash = "/"} className="w-full bg-slate-900 text-white hover:bg-slate-800">
               Quay về trang chủ
             </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-6 space-y-6">
           <CardTitle className="text-2xl text-slate-900">{examTitle}</CardTitle>
           <p className="text-slate-500">
             Bạn cần đăng nhập bằng tài khoản Google để bắt đầu làm bài. Tính năng này giúp giáo viên quản lý điểm và theo dõi tiến độ của học sinh.
           </p>
           <Button onClick={handleLogin} className="w-full flex items-center justify-center gap-2" size="lg">
             <LogIn className="w-5 h-5" />
             Đăng nhập với Google
           </Button>
        </Card>
      </div>
    );
  }

  // Wait for access verification
  if (isExamAccessible === null && (allowedEmails || assignedClassIds)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-500">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // Check if user is allowed to take the exam
  if (isExamAccessible === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-6 space-y-6">
           <CardTitle className="text-2xl text-red-600">Không có quyền truy cập</CardTitle>
           <p className="text-slate-600">
             Bài kiểm tra này chỉ dành riêng cho danh sách lớp hoặc học sinh được giáo viên chỉ định. Tài khoản <strong>{user.email}</strong> không nằm trong danh sách được phép.
           </p>
           <Button variant="outline" onClick={() => auth.signOut()} className="w-full">
             Đăng xuất hoặc sử dụng tài khoản khác
           </Button>
        </Card>
      </div>
    );
  }

  if (hasAlreadySubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-6 space-y-6">
           <CardTitle className="text-2xl text-amber-600">Bạn đã làm bài kiểm tra này</CardTitle>
           <p className="text-slate-600">
             Giáo viên chọn thiết lập không cho phép làm lại bài này. Bạn có thể xem lại kết quả bài làm của mình trong mục Lịch sử làm bài.
           </p>
           <Button variant="outline" onClick={() => window.location.hash = "/"} className="w-full">
             Quay về trang chủ
           </Button>
        </Card>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative">
        <Button variant="ghost" onClick={() => window.location.hash = "/"} className="absolute top-4 left-4 sm:top-6 sm:left-6">
           <ArrowLeft className="w-5 h-5 mr-1" /> Trang chủ
        </Button>
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{examTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
               <label className="text-sm font-medium">Họ và tên học sinh</label>
               <Input 
                 placeholder="VD: Nguyễn Văn A"
                 value={studentName}
                 onChange={(e) => setStudentName(e.target.value)}
                 className="w-full"
               />
               <p className="text-xs text-slate-500">Đăng nhập bằng: {user.email}</p>
             </div>
             <p className="text-sm text-slate-500">
               Thời gian làm bài: {timeLimit > 0 ? `${timeLimit} phút` : 'Không giới hạn'}
             </p>
             <Button 
               className="w-full" 
               disabled={!studentName.trim()}
               onClick={async () => {
                 try {
                   if (document.documentElement.requestFullscreen) {
                     await document.documentElement.requestFullscreen();
                   }
                 } catch (e) {
                   console.log("Could not enter fullscreen", e);
                 }
                 setHasStarted(true);
               }}
             >
               Bắt đầu làm bài
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] font-sans relative">
      {cheatWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1a1c23] p-6">
          <div className="max-w-md w-full flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                <AlertTriangle className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-4xl font-black mb-6 uppercase tracking-tight text-white drop-shadow-sm leading-tight">
              Cảnh báo<br/>gian lận
            </h2>
            <p className="text-xl text-slate-200 mb-10 font-medium leading-relaxed">
              {cheatWarning}
            </p>
            <button 
              onClick={() => {
                setCheatWarning(null);
                // Try to go back to fullscreen to encourage them to stay
                if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              className="w-full py-4 bg-[#dc3545] hover:bg-[#c82333] text-white font-bold rounded-2xl text-xl uppercase tracking-wider transition-all duration-200 active:scale-[0.98] shadow-lg shadow-red-500/20"
            >
              Quay lại làm bài
            </button>
          </div>
        </div>
      )}

      {/* FIXED STUDENT HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-md z-50 px-4 md:px-8 flex items-center justify-between border-b border-slate-100">
        <button 
          onClick={() => window.location.hash = "/"} 
          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center justify-center"
          title="Thoát"
        >
          <Power className="w-8 h-8 stroke-[2.5]" />
        </button>
        
        <div className="text-xl md:text-2xl font-bold text-slate-800 truncate px-4">
          {studentName}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-xl md:text-2xl font-mono font-bold text-slate-900 min-w-[120px] text-right">
            {timeLeft !== null ? formatTimeFull(timeLeft) : "-- : -- : --"}
          </div>
        </div>
      </header>

      <div className="pt-24 pb-12 px-4">
        <PreviewTab 
          questions={questions} 
          title={examTitle}
          timeLimit={timeLimit}
          isStudentView={true}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
