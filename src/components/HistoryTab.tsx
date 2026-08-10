import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc, where, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Loader2, Calendar, FileEdit, Users, Trash2, Send, X, Brain } from 'lucide-react';
import { Question, Grade, ExamType } from '../types';
import ResultsTab from './ResultsTab';
import SmarterAnalyticsTab from './SmarterAnalyticsTab';

interface ExamRecord {
  id: string;
  title: string;
  createdAt: string;
  questionCount: number;
  timeLimit: number;
  allowRetake?: boolean;
  questions: Question[];
  assignedClassIds?: string[];
  startTime?: string | null;
  endTime?: string | null;
  grade?: Grade | null;
  examType?: ExamType | null;
}

interface ClassData {
  id: string;
  name: string;
}

interface HistoryTabProps {
  onEditExam: (
    examId: string, 
    questions: Question[], 
    title: string, 
    timeLimit: number, 
    allowRetake?: boolean, 
    startTime?: string | null, 
    endTime?: string | null,
    grade?: Grade | null,
    examType?: ExamType | null
  ) => void;
}

export default function HistoryTab({ onEditExam }: HistoryTabProps) {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const [viewResultExamId, setViewResultExamId] = useState<string | null>(null);
  const [viewAnalyticsExamId, setViewAnalyticsExamId] = useState<string | null>(null);
  const [filterGrade, setFilterGrade] = useState<Grade | 'all'>('all');
  const [filterType, setFilterType] = useState<ExamType | 'all'>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterGrade, filterType]);

  // Assignment Modal States
  const [examToAssign, setExamToAssign] = useState<string | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<ClassData[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [assignStartTime, setAssignStartTime] = useState<string>('');
  const [assignEndTime, setAssignEndTime] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const q = query(
        collection(db, 'exams'), 
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc'), 
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      
      const fetchedExams: ExamRecord[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedExams.push({
          id: doc.id,
          title: data.title || 'Bài kiểm tra không tên',
          createdAt: data.createdAt || new Date().toISOString(),
          questionCount: data.questions?.length || 0,
          timeLimit: data.timeLimit || 0,
          allowRetake: data.allowRetake || false,
          questions: data.questions || [],
          assignedClassIds: data.assignedClassIds || [],
          startTime: data.startTime || null,
          endTime: data.endTime || null,
          grade: data.grade || null,
          examType: data.examType || null
        });
      });
      
      setExams(fetchedExams);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
      const snap = await getDocs(q);
      const cls = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setTeacherClasses(cls);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'classes');
    }
  };

  const openAssignModal = async (exam: ExamRecord) => {
    setExamToAssign(exam.id);
    setSelectedClassIds(exam.assignedClassIds || []);
    setAssignStartTime(exam.startTime || '');
    setAssignEndTime(exam.endTime || '');
    await fetchClasses();
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const handleAssignSubmit = async () => {
    if (!examToAssign) return;
    setIsAssigning(true);
    try {
      // Aggregate all student emails from selected classes
      let aggregatedEmails: string[] = [];
      const classEmailsPromises = selectedClassIds.map(async (classId) => {
        try {
          const classDoc = await getDocs(query(collection(db, 'classes'), where('__name__', '==', classId)));
          if (!classDoc.empty) {
            const emails = classDoc.docs[0].data().studentEmails || [];
            return emails as string[];
          }
        } catch(e) {}
        return [];
      });
      
      const emailsArrays = await Promise.all(classEmailsPromises);
      emailsArrays.forEach(emails => {
        aggregatedEmails = [...aggregatedEmails, ...emails];
      });
      
      // Deduplicate emails
      const uniqueEmails = Array.from(new Set(aggregatedEmails));

      await updateDoc(doc(db, 'exams', examToAssign), {
        assignedClassIds: selectedClassIds,
        allowedEmails: uniqueEmails,
        startTime: assignStartTime || null,
        endTime: assignEndTime || null
      });
      setExams(exams.map(e => e.id === examToAssign ? { 
        ...e, 
        assignedClassIds: selectedClassIds,
        startTime: assignStartTime || null,
        endTime: assignEndTime || null
      } : e));
      setExamToAssign(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `exams/${examToAssign}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const confirmDelete = (examId: string) => {
    setExamToDelete(examId);
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    const examId = examToDelete;
    
    setIsDeleting(examId);
    try {
      await deleteDoc(doc(db, 'exams', examId));
      setExams(exams.filter(exam => exam.id !== examId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `exams/${examId}`);
    } finally {
      setIsDeleting(null);
      setExamToDelete(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(date);
    } catch {
      return isoString;
    }
  };

  if (viewResultExamId) {
    return (
      <ResultsTab 
        examId={viewResultExamId} 
        onBack={() => setViewResultExamId(null)} 
      />
    );
  }

  if (viewAnalyticsExamId) {
    return (
      <SmarterAnalyticsTab 
        examId={viewAnalyticsExamId} 
        onBack={() => setViewAnalyticsExamId(null)} 
      />
    );
  }

  const filteredExams = exams.filter(exam => {
    const matchGrade = filterGrade === 'all' || exam.grade === filterGrade;
    const matchType = filterType === 'all' || exam.examType === filterType;
    return matchGrade && matchType;
  });

  const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
  const paginatedExams = filteredExams.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Kho đề thi đã tạo</h2>
          <p className="text-slate-500">Danh sách các bài làm bạn đã tạo và phát hành cho học sinh.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            className="text-sm border-slate-200 rounded-md p-2 bg-white min-w-[100px]"
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value as any)}
          >
            <option value="all">Tất cả Khối</option>
            <option value="6">Khối 6</option>
            <option value="7">Khối 7</option>
            <option value="8">Khối 8</option>
            <option value="9">Khối 9</option>
          </select>
          <select 
            className="text-sm border-slate-200 rounded-md p-2 bg-white min-w-[100px]"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">Tất cả Loại</option>
            <option value="GK1">Giữa kì 1</option>
            <option value="CK1">Cuối kì 1</option>
            <option value="GK2">Giữa kì 2</option>
            <option value="CK2">Cuối kì 2</option>
            <option value="Unit">Theo Unit</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-500">Đang tải danh sách đề thi...</p>
          </CardContent>
        </Card>
      ) : filteredExams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">Không tìm thấy đề thi</h3>
            <p className="text-slate-500 max-w-md">Không có đề thi nào khớp với bộ lọc của bạn.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setFilterGrade('all'); setFilterType('all'); }}>
              Xoá bộ lọc
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {paginatedExams.map((exam) => (
            <Card key={exam.id} className="overflow-hidden hover:border-blue-200 transition-colors">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center p-6 gap-4 border-b border-slate-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {exam.grade && (
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">
                          Khối {exam.grade}
                        </span>
                      )}
                      {exam.examType && (
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">
                          {exam.examType === 'Unit' ? 'Test Unit' : exam.examType}
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-slate-900 truncate">{exam.title}</h3>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(exam.createdAt)}
                      </span>
                      <span>•</span>
                      <span>{exam.questionCount} câu hỏi</span>
                      <span>•</span>
                      <span>{exam.timeLimit > 0 ? `${exam.timeLimit} phút` : 'Không giới hạn thời gian'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2.5 w-full sm:w-auto mt-4 sm:mt-0 shrink-0">
                    {/* Hàng 1: 3 nút đầu */}
                    <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => onEditExam(exam.id, exam.questions, exam.title, exam.timeLimit, exam.allowRetake, exam.startTime, exam.endTime, exam.grade, exam.examType)}
                      >
                        <FileEdit className="w-4 h-4 mr-2" /> Sửa đề
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 hover:text-amber-800 font-medium"
                        onClick={() => setViewResultExamId(exam.id)}
                      >
                        <Users className="w-4 h-4 mr-2" /> Xem điểm
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800 font-medium"
                        onClick={() => setViewAnalyticsExamId(exam.id)}
                      >
                        <Brain className="w-4 h-4 mr-2" /> Phân tích bẫy
                      </Button>
                    </div>

                    {/* Hàng 2: 2 nút sau */}
                    <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                      <Button 
                        variant={(exam.assignedClassIds && exam.assignedClassIds.length > 0) ? "default" : "outline"}
                        size="sm"
                        className={!exam.assignedClassIds || exam.assignedClassIds.length === 0 ? "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 font-medium" : "bg-blue-600 hover:bg-blue-700 text-white font-medium"}
                        onClick={() => openAssignModal(exam)}
                      >
                        <Send className="w-4 h-4 mr-2" /> {exam.assignedClassIds && exam.assignedClassIds.length > 0 ? 'Đã giao' : 'Giao bài'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-700 bg-red-50 border-red-200 hover:bg-red-100 hover:text-red-800 font-medium"
                        onClick={() => confirmDelete(exam.id)}
                        disabled={isDeleting === exam.id}
                      >
                        {isDeleting === exam.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Xoá đề
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && filteredExams.length > itemsPerPage && (
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200 bg-white rounded-lg shadow-sm">
          <p className="text-sm text-slate-500">
            Hiển thị <span className="font-medium text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> đến <span className="font-medium text-slate-700">{Math.min(currentPage * itemsPerPage, filteredExams.length)}</span> trong tổng số <span className="font-medium text-slate-700">{filteredExams.length}</span> đề thi
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Trang trước
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Trang sau
            </Button>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {examToAssign && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full flex flex-col max-h-[90vh]">
            <div className="p-6 pb-4 border-b flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-900">Giao bài cho lớp</h3>
              <Button variant="ghost" size="sm" onClick={() => setExamToAssign(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {teacherClasses.length === 0 ? (
                <div className="text-center p-4 border rounded bg-slate-50">
                  <p className="text-slate-500 mb-2">Bạn chưa tạo lớp học nào.</p>
                  <p className="text-sm">Hãy vào tab "Quản lý Lớp học" để tạo lớp trước khi giao bài.</p>
                </div>
              ) : (
                <div className="space-y-3 p-1">
                  {teacherClasses.map(cls => (
                    <label key={cls.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-blue-600 rounded"
                        checked={selectedClassIds.includes(cls.id)}
                        onChange={() => toggleClassSelection(cls.id)}
                      />
                      <span className="font-medium text-slate-700">{cls.name}</span>
                    </label>
                  ))}
                </div>
              )}
              
              <div className="space-y-4 pt-2">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-[#0d9388] font-bold text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Cấu hình Hẹn giờ
                  </div>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between items-center">
                        Thời gian bắt đầu
                        <span className="text-[10px] font-normal text-slate-400 italic">Không bắt buộc</span>
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="datetime-local" 
                          className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0d9388]/20 focus:border-[#0d9388] outline-none transition-all"
                          value={assignStartTime}
                          onChange={(e) => setAssignStartTime(e.target.value)}
                        />
                        {assignStartTime && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto px-2 text-slate-400 hover:text-red-500"
                            onClick={() => setAssignStartTime('')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {/* Quick presets for start time */}
                      {!assignStartTime && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-7 px-2 border-slate-200 text-slate-600 hover:bg-[#0d9388]/5 hover:text-[#0d9388] hover:border-[#0d9388]/30"
                            onClick={() => {
                              const now = new Date();
                              now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                              setAssignStartTime(now.toISOString().slice(0, 16));
                            }}
                          >
                            Mở ngay
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between items-center">
                        Thời gian kết thúc
                        <span className="text-[10px] font-normal text-slate-400 italic">Không bắt buộc</span>
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="datetime-local" 
                          className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0d9388]/20 focus:border-[#0d9388] outline-none transition-all"
                          value={assignEndTime}
                          onChange={(e) => setAssignEndTime(e.target.value)}
                        />
                        {assignEndTime && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto px-2 text-slate-400 hover:text-red-500"
                            onClick={() => setAssignEndTime('')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {/* Quick presets for end time */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-7 px-2 border-slate-200 text-slate-600 hover:bg-[#0d9388]/5 hover:text-[#0d9388] hover:border-[#0d9388]/30"
                          onClick={() => {
                            const date = new Date(assignStartTime || new Date());
                            date.setHours(date.getHours() + 24);
                            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                            setAssignEndTime(date.toISOString().slice(0, 16));
                          }}
                        >
                          + 24 giờ
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-7 px-2 border-slate-200 text-slate-600 hover:bg-[#0d9388]/5 hover:text-[#0d9388] hover:border-[#0d9388]/30"
                          onClick={() => {
                            const date = new Date(assignStartTime || new Date());
                            date.setDate(date.getDate() + 7);
                            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                            setAssignEndTime(date.toISOString().slice(0, 16));
                          }}
                        >
                          + 1 tuần
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {assignStartTime && assignEndTime && new Date(assignStartTime) > new Date(assignEndTime) && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 flex items-center gap-2">
                     <X className="w-4 h-4 shrink-0" />
                     Thời gian kết thúc phải sau thời gian bắt đầu.
                  </div>
                )}
                
                <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-dashed border-slate-200">
                  Lưu ý: Nếu không đặt thời gian, học sinh có thể làm bài bất cứ lúc nào. Khi quá hạn kết thúc, bài thi sẽ tự động đóng lại.
                </p>
              </div>
            </div>

            <div className="p-6 pt-4 border-t flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setExamToAssign(null)}>Hủy</Button>
              <Button 
                onClick={handleAssignSubmit} 
                disabled={isAssigning || teacherClasses.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isAssigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Lưu lại
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {examToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Xác nhận xoá</h3>
            <p className="text-slate-600 text-sm">
              Bạn có chắc chắn muốn xoá bài kiểm tra này không? Mọi kết quả bài làm của học sinh cũng sẽ <b>bị mất vĩnh viễn</b> và không thể truy cập lại.
            </p>
            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" onClick={() => setExamToDelete(null)}>
                Huỷ bỏ
              </Button>
              <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteExam}>
                Vâng, xoá đề
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
