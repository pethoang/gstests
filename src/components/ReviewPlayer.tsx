import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Question } from '../types';
import PreviewTab from './PreviewTab';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ReviewPlayer() {
  const { submissionId } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examTitle, setExamTitle] = useState('Bài kiểm tra Tiếng Anh');
  const [timeLimit, setTimeLimit] = useState(45);
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string | boolean>>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setError('Bạn cần đăng nhập để xem lại bài làm.');
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchSubmissionAndExam = async () => {
      if (!submissionId) return;
      try {
        const subDocRef = doc(db, 'submissions', submissionId);
        const subDocSnap = await getDoc(subDocRef);
        
        if (subDocSnap.exists()) {
          const subData = subDocSnap.data();
          setSubmittedAnswers(subData.answers || {});

          const examDocRef = doc(db, 'exams', subData.examId);
          const examDocSnap = await getDoc(examDocRef);
          
          if (examDocSnap.exists()) {
             const examData = examDocSnap.data();
             setQuestions(examData.questions || []);
             setExamTitle(examData.title || 'Bài kiểm tra Tiếng Anh');
             setTimeLimit(examData.timeLimit || 0);
          } else {
             setError('Không tìm thấy bài kiểm tra gốc.');
          }
        } else {
          setError('Không tìm thấy bài làm.');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `submissions/${submissionId}`);
        setError('Có lỗi xảy ra khi tải bài làm.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubmissionAndExam();
  }, [submissionId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Đang tải...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <div className="text-red-600 font-medium">{error}</div>
        <Button onClick={() => window.location.hash = "/"} variant="outline">
          Quay lại trang chủ
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center shadow-sm">
        <Button variant="ghost" onClick={() => window.location.hash = "/"} className="mr-4">
           <ArrowLeft className="w-5 h-5 mr-1" /> Trang chủ
        </Button>
        <h1 className="font-bold text-lg text-slate-800">Xem lại bài: {examTitle}</h1>
      </div>
      <div className="py-8 px-4">
        <PreviewTab 
          questions={questions} 
          title={examTitle}
          timeLimit={timeLimit}
          isStudentView={true}
          initialAnswers={submittedAnswers}
          showCorrectAnswers={true}
        />
      </div>
    </div>
  );
}
