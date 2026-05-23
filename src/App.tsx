/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { FileUp, FileText, Edit3, Eye, Users, FileType, CheckCircle, Library, LogIn, Menu, X, LayoutDashboard, ShieldAlert, RefreshCcw, AlertTriangle, GraduationCap, Sparkles, Brain } from 'lucide-react';
import { cn } from './lib/utils';
import { Button } from './components/ui/button';
import { Question, Grade, ExamType } from './types';
import UploadTab from './components/UploadTab';
import AnalysisTab from './components/AnalysisTab';
import EditTab from './components/EditTab';
import PreviewTab from './components/PreviewTab';
import GuidelinesTab from './components/GuidelinesTab';
import HistoryTab from './components/HistoryTab';
import ClassesTab from './components/ClassesTab';
import StudentDashboard from './components/StudentDashboard';
import LoginPage from './components/LoginPage';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

import OverviewTab from './components/OverviewTab';
import ViolationsTab from './components/ViolationsTab';
import BadgesTab from './components/BadgesTab';
import SupportModal from './components/SupportModal';

type TabType = 'overview' | 'upload' | 'analysis' | 'edit' | 'preview' | 'results' | 'guidelines' | 'history' | 'classes' | 'violations' | 'badges';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isTestPublished, setIsTestPublished] = useState(false);
  const [publishedLink, setPublishedLink] = useState('');
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Constants
  const TEACHER_EMAIL = 'chupro1311@gmail.com'; 

  // States for active exam
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState('Bài kiểm tra Tiếng Anh');
  const [timeLimit, setTimeLimit] = useState(45);
  const [allowRetake, setAllowRetake] = useState(false);
  const [currentStartTime, setCurrentStartTime] = useState<string | null>(null);
  const [currentEndTime, setCurrentEndTime] = useState<string | null>(null);
  const [currentGrade, setCurrentGrade] = useState<Grade | null>(null);
  const [currentExamType, setCurrentExamType] = useState<ExamType | null>(null);

  // Reset data state
  const [isResetting, setIsResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [statsKey, setStatsKey] = useState(0); // For forcing OverviewTab rerender

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsUnauthorized(false);

      if (currentUser) {
        try {
          // 1. Check if teacher
          if (currentUser.email === TEACHER_EMAIL) {
            setUserRole('teacher');
            setAuthLoading(false);
            return;
          }

          // 2. Check if student in whitelist (classes collection)
          const searchEmail = (currentUser.email || '').toLowerCase();
          
          const q = query(
             collection(db, 'classes'),
             where('studentEmails', 'array-contains', searchEmail)
          );
          const snapshot = await getDocs(q);
          
          let found = false;
          let debugInfo = 'Classes checked: ';
          snapshot.forEach(doc => {
            const data = doc.data();
            debugInfo += `[${data.name}: ${data.studentEmails?.length || 0} students], `;
            if (data.studentEmails && Array.isArray(data.studentEmails)) {
              if (data.studentEmails.includes(searchEmail)) {
                found = true;
              }
            }
          });

          if (found) {
            setUserRole('student');
            // Sync role to user doc for consistency (optional but good for other queries)
            try {
              const userRef = doc(db, 'users', currentUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                await setDoc(userRef, {
                  displayName: currentUser.displayName || 'Học sinh',
                  role: 'student'
                }, { merge: true });
              } else {
                await setDoc(userRef, {
                  displayName: currentUser.displayName || 'Học sinh',
                  email: currentUser.email,
                  role: 'student',
                  createdAt: new Date().toISOString()
                });
              }
            } catch (err) {
              console.error('Failed to sync user doc:', err);
              // Ignore syncing error and let user continue as student
            }
          } else {
            // Not in any class
            setUserRole(null);
            setIsUnauthorized(true);
            setAuthError(`Email không có trong lớp nào. ${debugInfo}`);
          }
        } catch (e: any) {
          console.error('Error during auth check', e);
          setUserRole(null);
          setIsUnauthorized(true);
          setAuthError(e.message);
        }
      } else {
        setUserRole(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection to help users switch if needed
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Login error:', error);
      alert(`Đăng nhập thất bại: ${error?.message || 'Lỗi không xác định'}`);
    }
  };

  const handleRoleSelection = async (role: 'teacher' | 'student') => {
    if (!user) return;
    setAuthLoading(true);
    try {
      setUserRole(role);
    } catch (error) {
      console.error('Error setting role:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAnalyzed = (parsedQuestions: Question[]) => {
    setQuestions(parsedQuestions);
    setHasAnalyzed(true);
    setCurrentExamId(null);
    setExamTitle('Bài kiểm tra Tiếng Anh');
    setTimeLimit(45);
    setAllowRetake(false);
    setCurrentGrade(null);
    setCurrentExamType(null);
    setActiveTab('analysis');
  };

  const handleEditExistingExam = (
    examId: string, 
    examQuestions: Question[], 
    title: string, 
    time: number, 
    allowRetakeValue?: boolean, 
    startTime?: string | null, 
    endTime?: string | null,
    grade?: Grade | null,
    examType?: ExamType | null
  ) => {
    setCurrentExamId(examId);
    setQuestions(examQuestions);
    setExamTitle(title);
    setTimeLimit(time || 45);
    setAllowRetake(allowRetakeValue || false);
    setCurrentStartTime(startTime || null);
    setCurrentEndTime(endTime || null);
    setCurrentGrade(grade || null);
    setCurrentExamType(examType || null);
    setHasAnalyzed(true);
    setIsTestPublished(true);
    setPublishedLink(`${window.location.origin}/#/exam/${examId}`);
    setActiveTab('edit');
  };

  const handleResetData = async () => {
    if (!user) return;

    setIsResetting(true);
    try {
      // 1. Fetch all classes of this teacher to get student emails
      const qClasses = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
      const classesSnap = await getDocs(qClasses);
      const studentEmails = new Set<string>();
      classesSnap.forEach(doc => {
        const data = doc.data();
        if (data.studentEmails && Array.isArray(data.studentEmails)) {
          data.studentEmails.forEach((email: string) => studentEmails.add(email.toLowerCase()));
        }
      });

      // 2. Fetch all submissions for this teacher
      const subQuery = query(collection(db, 'submissions'), where('teacherId', '==', user.uid));
      const subSnapshot = await getDocs(subQuery);
      
      // 3. Fetch all violations for this teacher
      const violQuery = query(collection(db, 'violations'), where('teacherId', '==', user.uid));
      const violSnapshot = await getDocs(violQuery);

      // Delete in batches of 500 (Firestore limit is 500 operations per batch)
      let batch = writeBatch(db);
      let count = 0;

      // Delete student stats
      const emailsArray = Array.from(studentEmails);
      for (const email of emailsArray) {
        batch.delete(doc(db, 'studentStats', email));
        count++;
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      for (const docSnap of subSnapshot.docs) {
        batch.delete(docSnap.ref);
        count++;
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      for (const docSnap of violSnapshot.docs) {
        batch.delete(docSnap.ref);
        count++;
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      setStatsKey(prev => prev + 1); // trigger refresh
      setShowResetModal(false);
      alert('Đã làm mới dữ liệu thành công! Tất cả điểm số, vi phạm và huy hiệu đã được xóa.');
    } catch (error) {
      console.error("Error resetting data:", error);
      alert('Có lỗi xảy ra khi làm mới dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsResetting(false);
    }
  };

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Tổng quan' },
    { id: 'upload', icon: FileUp, label: 'Tải đề' },
    { id: 'history', icon: Library, label: 'Kho đề thi' },
    { id: 'classes', icon: Users, label: 'Học sinh & Lớp học' },
    { id: 'violations', icon: ShieldAlert, label: 'Vi phạm' },
    { id: 'badges', icon: Sparkles, label: 'Quản lý huy hiệu' },
    { id: 'analysis', icon: FileText, label: 'Kết quả phân tích', disabled: !hasAnalyzed },
    { id: 'edit', icon: Edit3, label: 'Chỉnh sửa câu hỏi', disabled: !hasAnalyzed },
    { id: 'preview', icon: Eye, label: 'Xem trước bài làm', disabled: !hasAnalyzed },
    { id: 'guidelines', icon: FileType, label: 'Mẫu đề chuẩn' },
  ];

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Đang tải...</div>;
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (isUnauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-md w-full animate-in fade-in zoom-in duration-300">
          <div className="bg-red-100 text-red-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Truy cập bị từ chối</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Xin lỗi, email <span className="font-bold text-slate-900 break-all">{user?.email}</span> không nằm trong danh sách học sinh được phép truy cập hệ thống.
          </p>
          {authError && (
             <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-8 text-sm text-left break-words">
                <strong>Chi tiết lỗi:</strong> {authError}
             </div>
          )}
          <div className="space-y-3">
             <Button 
               variant="outline" 
               className="w-full py-6 rounded-xl font-bold gap-2 border-2 hover:bg-slate-50" 
               onClick={() => auth.signOut()}
             >
               Đăng xuất & Thử email khác
             </Button>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100">
             <p className="text-xs text-slate-400">Vui lòng liên hệ với Giáo viên để được cấp quyền vào lớp.</p>
          </div>
        </div>
      </div>
    );
  }

  if (userRole === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-md w-full animate-in fade-in zoom-in duration-300">
          <div className="bg-[#0d9388]/10 text-[#0d9388] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Chào mừng trở lại!</h2>
          <p className="text-slate-600 mb-8">Vui lòng chọn vai trò bạn muốn sử dụng để tiếp tục vào hệ thống.</p>
          
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => handleRoleSelection('student')}
              className="flex items-center gap-4 p-4 border-2 border-slate-100 hover:border-[#0d9388] hover:bg-[#0d9388]/5 rounded-xl transition-all group text-left"
            >
              <div className="bg-blue-100 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Học sinh</div>
                <div className="text-xs text-slate-500">Vào lớp học, làm bài tập và xem kết quả</div>
              </div>
            </button>
            <button 
              onClick={() => handleRoleSelection('teacher')}
              className="flex items-center gap-4 p-4 border-2 border-slate-100 hover:border-[#0d9388] hover:bg-[#0d9388]/5 rounded-xl transition-all group text-left"
            >
              <div className="bg-purple-100 text-purple-600 p-3 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Edit3 className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Giáo viên</div>
                <div className="text-xs text-slate-500">Quản lý lớp, tạo đề và xem báo cáo</div>
              </div>
            </button>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100">
             <button onClick={() => auth.signOut()} className="text-sm text-slate-400 hover:text-red-600 transition-colors">Đăng xuất</button>
          </div>
        </div>
      </div>
    );
  }

  if (userRole === 'student') {
    return (
      <StudentDashboard 
        user={user} 
        onLogout={() => auth.signOut()} 
        onSwitchRole={() => setUserRole(null)} 
      />
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col font-sans overflow-hidden">
      {/* GLOBAL HEADER */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 relative">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" className="md:hidden mr-1" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="bg-[#0d9388] p-1.5 rounded-lg text-white">
            <FileText className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-slate-900 tracking-tight text-lg hidden sm:block">GLobal Success Tests LMS</h1>
        </div>
        <div className="flex items-center gap-4">
          {isTestPublished && (
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
              <CheckCircle className="w-4 h-4" />
              Đã phát hành bài tập
            </div>
          )}
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4 ml-2">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-slate-900">{user.displayName}</div>
              <div className="text-xs text-slate-500">Giáo viên</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
              {user.displayName?.[0] || 'U'}
            </div>
            {user.email === TEACHER_EMAIL && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setUserRole(null)} 
                className="hidden sm:flex border-slate-200 ml-1"
              >
                Đổi vai trò
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2 hidden sm:flex" onClick={() => auth.signOut()}>
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      {/* BODY SECTION */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR */}
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden" 
            onClick={() => setIsSidebarOpen(false)} 
          />
        )}
        <aside className={cn(
          "bg-[#0d9388] border-r border-[#0d9388] flex flex-col z-50 shrink-0 h-full",
          "md:w-64 md:flex md:relative md:translate-x-0 absolute transition-transform duration-300 w-64 shadow-2xl md:shadow-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 no-scrollbar">
            <div className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] mb-3 px-3 mt-2">Quản lý</div>
            {navItems.filter(i => ['overview', 'upload', 'history', 'classes', 'violations', 'badges', 'guidelines'].includes(i.id)).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.disabled) {
                    setActiveTab(item.id as TabType);
                    setIsSidebarOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={cn(
                  "flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-200",
                  item.id === 'overview' ? "text-[14px]" : "text-sm",
                  activeTab === item.id
                    ? "bg-white text-[#0d9388] shadow-lg"
                    : item.disabled
                      ? "text-white/20 cursor-not-allowed"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-[#0d9388]" : "text-white/70")} />
                {item.label}
              </button>
            ))}
            
          </nav>

          <div className="h-[68px] flex items-center px-4 border-t border-white/10 shrink-0">
            <Button 
              size="sm" 
              className="w-full justify-start bg-orange-500 hover:bg-orange-600 text-white border-none shadow-sm transition-colors"
              onClick={() => setShowResetModal(true)}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Làm mới dữ liệu năm học
            </Button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Mobile Top Title/Action Bar */}
          <div className="bg-white border-b border-slate-200 h-14 flex items-center px-6 shrink-0 md:hidden justify-between sticky top-0 z-20">
             <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
               {navItems.find(i => i.id === activeTab)?.label}
             </h2>
             <div className="flex items-center gap-2">
               <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => auth.signOut()}>
                 Thoát
               </Button>
             </div>
          </div>

          <main className="flex-1 p-4 md:p-8 shrink-0 bg-slate-50/30">
            <div className="max-w-5xl mx-auto">
              {/* Tab Title / Horizontal Tabs */}
              {['upload', 'analysis', 'edit', 'preview'].includes(activeTab) ? (
                <div className="mb-6 border-b border-slate-200">
                  <div className="flex gap-6 overflow-x-auto no-scrollbar">
                    {navItems.filter(i => ['upload', 'analysis', 'edit', 'preview'].includes(i.id)).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (!item.disabled) setActiveTab(item.id as TabType);
                        }}
                        disabled={item.disabled}
                        className={cn(
                          "flex items-center gap-2 pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                          activeTab === item.id 
                            ? "border-[#0d9388] text-[#0d9388]" 
                            : item.disabled
                              ? "border-transparent text-slate-300 cursor-not-allowed"
                              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="hidden md:flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {navItems.find(i => i.id === activeTab)?.label}
                  </h2>
                </div>
              )}

              {activeTab === 'overview' && <OverviewTab key={statsKey} />}
              {activeTab === 'upload' && <UploadTab onAnalyzed={handleAnalyzed} />}
              {activeTab === 'classes' && <ClassesTab />}
              {activeTab === 'history' && <HistoryTab onEditExam={handleEditExistingExam} />}
              {activeTab === 'violations' && <ViolationsTab />}
              {activeTab === 'badges' && <BadgesTab />}
              {activeTab === 'analysis' && <AnalysisTab questions={questions} onNext={() => setActiveTab('edit')} />}
              {activeTab === 'edit' && <EditTab 
                questions={questions} 
                setQuestions={setQuestions}
                examId={currentExamId}
                title={examTitle}
                setTitle={setExamTitle}
                timeLimit={timeLimit}
                setTimeLimit={setTimeLimit}
                allowRetake={allowRetake}
                setAllowRetake={setAllowRetake}
                startTime={currentStartTime}
                setStartTime={setCurrentStartTime}
                endTime={currentEndTime}
                setEndTime={setCurrentEndTime}
                grade={currentGrade}
                setGrade={setCurrentGrade}
                examType={currentExamType}
                setExamType={setCurrentExamType}
                onPublish={(link) => { 
                  setIsTestPublished(true); 
                  setPublishedLink(link);
                  setActiveTab('preview'); 
                }} 
              />}
              {activeTab === 'preview' && <PreviewTab questions={questions} publishedLink={publishedLink} />}
              {activeTab === 'guidelines' && <GuidelinesTab />}
            </div>
          </main>

          {/* FOOTER */}
          <footer className="bg-slate-100 border-t border-slate-200 mt-auto shrink-0">
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-black flex-wrap flex items-center gap-1 md:gap-2 justify-center md:justify-start">
                <span>&copy; 2026 - {new Date().getFullYear()} Hệ thống tạo đề & chấm điểm tự động.</span>
              </div>
              <div className="flex gap-4 text-sm text-black">
                <button onClick={() => setShowSupportModal(true)} className="hover:text-blue-600 transition-colors">Hỗ trợ</button>
                <button className="hover:text-blue-600 transition-colors">Hướng dẫn</button>
                <button className="hover:text-blue-600 transition-colors">Phản hồi</button>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 text-orange-600 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Làm mới dữ liệu</h3>
              </div>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Bạn có chắc chắn muốn xóa tất cả <strong>kết quả nộp bài</strong>, <strong>lịch sử vi phạm</strong> và <strong>huy hiệu học sinh</strong>? 
                Thao tác này thường được sử dụng khi bắt đầu một <strong>năm học mới</strong> để dọn dẹp dữ liệu cũ.
              </p>
              <div className="bg-orange-50 p-3 rounded-md text-sm text-orange-800 border border-orange-200 mb-6 font-medium">
                Lưu ý: Các Đề thi và cấu hình Danh sách Lớp học vẫn sẽ được giữ nguyên. Chỉ điểm số là bị đặt lại.
              </div>
              
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                >
                  Hủy bỏ
                </Button>
                <Button 
                  className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]"
                  onClick={handleResetData}
                  disabled={isResetting}
                >
                  {isResetting ? 'Đang làm mới...' : 'Xác nhận xóa'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </div>
  );
}
