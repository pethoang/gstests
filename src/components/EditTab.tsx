import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, GripVertical, Loader2, ArrowLeft, Users, Image, FileImage } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Question } from '../types';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, getDoc, deleteField } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { getDirectGoogleDriveLink } from './PreviewTab';

interface EditTabProps {
  questions: Question[];
  setQuestions: (q: Question[]) => void;
  examId: string | null;
  title: string;
  setTitle: (t: string) => void;
  timeLimit: number;
  setTimeLimit: (t: number) => void;
  allowRetake?: boolean;
  setAllowRetake?: (val: boolean) => void;
  startTime?: string | null;
  setStartTime?: (val: string | null) => void;
  endTime?: string | null;
  setEndTime?: (val: string | null) => void;
  grade?: string | null;
  setGrade?: (val: any) => void;
  examType?: string | null;
  setExamType?: (val: any) => void;
  onPublish: (link: string) => void;
}

interface ClassData {
  id: string;
  name: string;
  studentEmails: string[];
}

export default function EditTab({ 
  questions, 
  setQuestions, 
  examId,
  title,
  setTitle,
  timeLimit,
  setTimeLimit,
  allowRetake = false,
  setAllowRetake,
  startTime = null,
  setStartTime,
  endTime = null,
  setEndTime,
  grade = null,
  setGrade,
  examType = null,
  setExamType,
  onPublish 
}: EditTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isClassRestricted, setIsClassRestricted] = useState(false);

  useEffect(() => {
    const fetchClassesAndExamPrefs = async () => {
      const user = auth.currentUser;
      if (!user) return;
      
      try {
        const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
        const snapshot = await getDocs(q);
        const fetchedClasses = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          studentEmails: doc.data().studentEmails || []
        }));
        setClasses(fetchedClasses);

        if (examId) {
          const examDoc = await getDoc(doc(db, 'exams', examId));
          if (examDoc.exists()) {
            const data = examDoc.data();
            const loadedClassIds = data.assignedClassIds || data.classIds;
            if (loadedClassIds && loadedClassIds.length > 0) {
              setIsClassRestricted(true);
              setSelectedClassIds(loadedClassIds);
            }
            if (data.grade && setGrade) setGrade(data.grade);
            if (data.examType && setExamType) setExamType(data.examType);
          }
        }
      } catch (error) {
        console.error("Error fetching class info", error);
      }
    };
    fetchClassesAndExamPrefs();
  }, [examId]);

  const toggleClass = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleAddQuestion = () => {
    const newQuestionId = `q_custom_${Date.now()}`;
    const newOrder = questions.length > 0 ? Math.max(...questions.map(q => q.order || 0)) + 1 : 1;
    const newQuestion: Question = {
      id: newQuestionId,
      order: newOrder,
      section: 'Vocabulary and Grammar',
      type: 'multiple_choice',
      content: 'Nội dung câu hỏi mới',
      options: ['A. ', 'B. ', 'C. ', 'D. '],
      correctAnswer: 'A',
      points: 0.25,
      confidence: 'high'
    };
    setQuestions([...questions, newQuestion]);
  };

  const getShareLink = (id: string) => {
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    return `${origin}/#/exam/${id}`;
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');

      let allowedEmails: string[] = [];
      let finalClassIds: string[] = [];
      
      if (isClassRestricted && selectedClassIds.length > 0) {
        finalClassIds = selectedClassIds;
        // Merge all emails from selected classes
        const emailsSet = new Set<string>();
        selectedClassIds.forEach(id => {
          const cls = classes.find(c => c.id === id);
          if (cls && cls.studentEmails) {
            cls.studentEmails.forEach(e => emailsSet.add(e));
          }
        });
        allowedEmails = Array.from(emailsSet);
      }

      const examData: any = {
        title: title,
        timeLimit: timeLimit,
        allowRetake: allowRetake,
        questions: questions,
        startTime: startTime,
        endTime: endTime,
        grade: grade,
        examType: examType,
      };
      
      if (isClassRestricted && finalClassIds.length > 0) {
        examData.assignedClassIds = finalClassIds;
        examData.allowedEmails = allowedEmails;
      } else {
        // If not restricted or no classes selected, remove restriction
        examData.assignedClassIds = [];
        examData.allowedEmails = [];
      }

      if (examId) {
        // Update existing
        const docRef = doc(db, 'exams', examId);
        examData.classIds = deleteField();
        await updateDoc(docRef, examData);
        onPublish(getShareLink(examId));
      } else {
        // Create new
        examData.ownerId = user.uid;
        examData.createdAt = new Date().toISOString();
        const docRef = await addDoc(collection(db, 'exams'), examData);
        onPublish(getShareLink(docRef.id));
      }
    } catch (error) {
      handleFirestoreError(error, examId ? OperationType.UPDATE : OperationType.CREATE, examId ? `exams/${examId}` : 'exams');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Chi tiết bài kiểm tra</h2>
          <p className="text-slate-500 text-sm">Thiết lập thông tin chung và danh sách câu hỏi.</p>
        </div>
        <Button onClick={handlePublish} disabled={isPublishing} size="lg" className="bg-[#0d9388] hover:bg-[#0b7a70]">
          {isPublishing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          {examId ? 'Cập nhật đề thi' : 'Tạo bài làm cho HS'}
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm text-sm text-blue-800">
        <strong className="block mb-1">💡 Mẹo định dạng văn bản:</strong>
        Bạn có thể sử dụng các ký tự đặc biệt sau để định dạng trong Nội dung câu hỏi, Đáp án hoặc Đoạn văn:
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Để <strong>in đậm</strong>: bao quanh bằng 2 dấu sao (Ví dụ: <code>**nội dung**</code> sẽ hiển thị là <strong>nội dung</strong>)</li>
          <li>Để <u>gạch chân</u>: bao quanh bằng 2 dấu gạch dưới (Ví dụ: <code>f__l__ight</code> sẽ hiển thị là f<u>l</u>ight) - <i>Rất hữu ích cho câu hỏi Ngữ âm.</i></li>
        </ul>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exam-title">Tên bài kiểm tra</Label>
            <Input 
              id="exam-title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="VD: Kiểm tra 15 phút Unit 3"
              className="font-medium text-lg"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exam-grade">Khối lớp</Label>
              <select 
                id="exam-grade"
                className="w-full h-10 border border-slate-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={grade || ''}
                onChange={(e) => setGrade && setGrade(e.target.value || null)}
              >
                <option value="">Chọn khối lớp...</option>
                <option value="6">Khối 6</option>
                <option value="7">Khối 7</option>
                <option value="8">Khối 8</option>
                <option value="9">Khối 9</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-type">Loại bài kiểm tra</Label>
              <select 
                id="exam-type"
                className="w-full h-10 border border-slate-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={examType || ''}
                onChange={(e) => setExamType && setExamType(e.target.value || null)}
              >
                <option value="">Chọn loại bài...</option>
                <option value="GK1">Giữa kì 1 (GK1)</option>
                <option value="CK1">Cuối kì 1 (CK1)</option>
                <option value="GK2">Giữa kì 2 (GK2)</option>
                <option value="CK2">Cuối kì 2 (CK2)</option>
                <option value="Unit">Test theo Unit</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time-limit">Thời gian làm bài (phút)</Label>
              <Input 
                id="time-limit" 
                type="number"
                min="0"
                value={timeLimit} 
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)} 
                placeholder="45"
                className="w-full"
              />
              <p className="text-xs text-slate-500">Đặt 0 để không giới hạn thời gian.</p>
            </div>
            <div className="space-y-2">
              <Label>Làm lại bài</Label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer bg-slate-50 border border-slate-200 p-2.5 rounded-md hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" 
                  checked={allowRetake}
                  onChange={(e) => setAllowRetake && setAllowRetake(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700">Cho phép học sinh làm lại bài nhiều lần</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Thời gian bắt đầu (Không bắt buộc)</Label>
              <Input 
                id="start-time" 
                type="datetime-local"
                value={startTime || ''} 
                onChange={(e) => setStartTime && setStartTime(e.target.value || null)} 
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Thời gian kết thúc (Không bắt buộc)</Label>
              <Input 
                id="end-time" 
                type="datetime-local"
                value={endTime || ''} 
                onChange={(e) => setEndTime && setEndTime(e.target.value || null)} 
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <Label>Học sinh được làm bài</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="class-restriction" 
                  checked={!isClassRestricted}
                  onChange={() => setIsClassRestricted(false)}
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Tất cả (cần đăng nhập)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="class-restriction" 
                  checked={isClassRestricted}
                  onChange={() => setIsClassRestricted(true)}
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Chỉ học sinh trong lớp của tôi</span>
              </label>
            </div>
            
            {isClassRestricted && (
              <div className="mt-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-3">Chọn lớp được phép làm bài:</p>
                {classes.length === 0 ? (
                  <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    Bạn chưa tạo lớp học nào. Hãy quay lại mục "Học sinh & Lớp học" để tạo lớp.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {classes.map(cls => {
                      const isSelected = selectedClassIds.includes(cls.id);
                      return (
                        <button
                          key={cls.id}
                          onClick={() => toggleClass(cls.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            isSelected 
                              ? 'bg-blue-100 border-blue-300 text-blue-800' 
                              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          {cls.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-200">
                  Phân quyền dựa trên Email học sinh bạn đã thiết lập trong quản lý lớp học.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {questions.map((q, index) => {
          const previousQ = index > 0 ? questions[index - 1] : null;
          const isGroupStart = !previousQ || 
            (previousQ.instructions?.trim() || '') !== (q.instructions?.trim() || '') || 
            (previousQ.passage?.trim() || '') !== (q.passage?.trim() || '');

          return (
          <Card key={`${q.id}-${index}`} className="relative overflow-hidden transition-all duration-200">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-100 flex items-center justify-center border-r border-slate-200 cursor-grab text-slate-400 hover:text-slate-600">
              <GripVertical className="w-4 h-4" />
            </div>
            <CardContent className="p-6 pl-12">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-lg">Câu {index + 1}</span>
                  <select 
                    className="text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-1 bg-slate-50"
                    value={q.section}
                    onChange={(e) => updateQuestion(q.id, { section: e.target.value })}
                  >
                    <option value="Pronunciation">Pronunciation</option>
                    <option value="Vocabulary and Grammar">Vocabulary and Grammar</option>
                    <option value="Reading">Reading</option>
                    <option value="Listening">Listening</option>
                    <option value="Writing">Writing</option>
                  </select>
                  <select 
                    className="text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-1 bg-slate-50"
                    value={q.type}
                    // @ts-ignore
                    onChange={(e) => updateQuestion(q.id, { type: e.target.value })}
                  >
                    <option value="multiple_choice">Trắc nghiệm</option>
                    <option value="true_false">True / False</option>
                    <option value="fill_blank">Điền từ</option>
                    <option value="short_answer">Trả lời ngắn</option>
                    <option value="writing">Viết đoạn văn</option>
                  </select>
                </div>
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteQuestion(q.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {(q.instructions !== undefined || ['short_answer', 'writing', 'reading'].includes(q.type) || q.section === 'Listening' || (q.instructions && q.instructions.toLowerCase().includes('listen'))) && (
                  <div className="space-y-3">
                    <div>
                      <Label className="mb-1 block">Chỉ dẫn / Yêu cầu (VD: Read the passage...)</Label>
                      <Input 
                        value={q.instructions || ''} 
                        onChange={(e) => updateQuestion(q.id, { instructions: e.target.value })}
                        placeholder="Nhập yêu cầu đề bài..."
                      />
                    </div>
                    {isGroupStart && ((q.instructions || '').toLowerCase().includes('listen') || (q.instructions || '').toLowerCase().includes('nghe') || q.section === 'Listening') && (
                      <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                        <Label className="mb-1 block text-blue-700">Link Audio (áp dụng cho cả nhóm câu hỏi này)</Label>
                        <Input 
                          value={q.audioUrl || ''} 
                          onChange={(e) => updateQuestion(q.id, { audioUrl: e.target.value })}
                          placeholder="https://drive.google.com/file/d/..."
                          className="bg-white border-blue-200"
                        />
                      </div>
                    )}
                  </div>
                )}

                {q.passage !== undefined && (
                  <div>
                    <Label className="mb-1 block">Đoạn văn (Reading)</Label>
                    <Textarea 
                      value={q.passage || ''} 
                      onChange={(e) => updateQuestion(q.id, { passage: e.target.value })}
                      rows={4}
                    />
                  </div>
                )}

                <div>
                  <Label className="mb-1 block">Nội dung câu hỏi</Label>
                  <Textarea 
                    value={q.content} 
                    onChange={(e) => updateQuestion(q.id, { content: e.target.value })}
                    rows={2}
                  />
                </div>

                {/* Chế độ chèn hình ảnh từ Google Drive cho câu hỏi */}
                {q.hasImage ? (
                  <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-orange-800 font-semibold text-xs uppercase tracking-wider">
                        <Image className="w-4 h-4 text-orange-600" />
                        <span>Câu hỏi có hình ảnh/biển báo (AI nhận diện hoặc giáo viên chọn)</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-orange-700 hover:bg-orange-100 hover:text-orange-900 h-7 text-xs px-2"
                        onClick={() => updateQuestion(q.id, { hasImage: false, imageUrl: '' })}
                      >
                        Bỏ chế độ hình ảnh
                      </Button>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-xs text-orange-800 font-medium block">
                        Link hình ảnh Google Drive (Mở quyền "Bất kỳ ai có liên kết đều có thể xem"):
                      </Label>
                      <Input 
                        value={q.imageUrl || ''} 
                        onChange={(e) => updateQuestion(q.id, { imageUrl: e.target.value })}
                        placeholder="https://drive.google.com/file/d/..."
                        className="bg-white border-orange-200 text-slate-800 text-sm focus-visible:ring-orange-500"
                      />
                    </div>
                    
                    {q.imageUrl && (
                      <div className="bg-white p-2 rounded border border-orange-100 text-xs text-slate-600 space-y-2">
                        <div className="flex items-center gap-1.5 text-green-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                          Đã thêm link ảnh. Hệ thống sẽ tự trực quan hóa link Drive này để học sinh nhìn thấy.
                        </div>
                        <div className="mt-1 border border-slate-100 rounded-md overflow-hidden bg-slate-50 p-1 max-w-xs mx-auto">
                          <img 
                            src={getDirectGoogleDriveLink(q.imageUrl)} 
                            alt="Preview" 
                            className="max-h-[120px] object-contain mx-auto rounded"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // Fallback silently if link loads failed
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-end p-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 h-7 py-0.5 px-2 bg-slate-50 hover:bg-slate-100 rounded-md"
                      onClick={() => updateQuestion(q.id, { hasImage: true })}
                    >
                      <FileImage className="w-3.5 h-3.5" />
                      Yêu cầu hình ảnh minh họa cho câu này
                    </Button>
                  </div>
                )}

                {q.type === 'multiple_choice' && (
                  <div>
                    <Label className="mb-2 block">Các phương án (A, B, C, D)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(q.options || ['', '', '', '']).map((opt, i) => {
                        const isCorrect = (() => {
                          const val = q.correctAnswer as string;
                          if (!val) return false;
                          const label = ['A', 'B', 'C', 'D'][i];
                          if (val === label) return true;
                          if (val.startsWith(label + '.') || val.startsWith(label + ' ')) return true;
                          if (opt === val || (opt && val && opt.includes(val) && val.length > 2)) return true;
                          return false;
                        })();

                        return (
                          <div key={i} className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-white border-transparent'}`}>
                            <span className={`font-bold w-6 h-6 flex items-center justify-center rounded-full text-xs ${isCorrect ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              {['A', 'B', 'C', 'D'][i]}
                            </span>
                            <Input 
                              value={opt} 
                              className={`border-none bg-transparent shadow-none focus-visible:ring-0 px-1 ${isCorrect ? 'text-green-900 font-medium' : ''}`}
                              onChange={(e) => {
                                const newOpts = [...(q.options || [])];
                                newOpts[i] = e.target.value;
                                updateQuestion(q.id, { options: newOpts });
                              }} 
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-100">
                  <div className="flex-1">
                    <Label className="mb-1 block">Đáp án đúng</Label>
                    {q.type === 'multiple_choice' ? (
                      <select 
                        className="w-full h-10 border border-slate-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={(() => {
                          const val = q.correctAnswer as string;
                          if (!val) return '';
                          if (['A', 'B', 'C', 'D'].includes(val)) return val;
                          if (val.startsWith('A.') || val.startsWith('A ')) return 'A';
                          if (val.startsWith('B.') || val.startsWith('B ')) return 'B';
                          if (val.startsWith('C.') || val.startsWith('C ')) return 'C';
                          if (val.startsWith('D.') || val.startsWith('D ')) return 'D';
                          
                          // Match by content
                          const optionIndex = q.options?.findIndex(opt => opt === val || opt.includes(val));
                          if (optionIndex !== undefined && optionIndex !== -1) {
                            return ['A', 'B', 'C', 'D'][optionIndex];
                          }
                          return '';
                        })()}
                        onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                      >
                        <option value="">Chọn đáp án...</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    ) : q.type === 'true_false' ? (
                      <select 
                        className="w-full h-10 border border-slate-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={q.correctAnswer?.toString() || ''}
                        onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value === 'true' })}
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    ) : (
                      <Input 
                        value={q.correctAnswer as string || ''} 
                        onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                        placeholder="Nhập đáp án đúng hoặc gợi ý..."
                      />
                    )}
                  </div>
                  <div className="w-full sm:w-24">
                    <Label className="mb-1 block">Điểm số</Label>
                    <Input 
                      type="number" 
                      step="0.25"
                      value={q.points} 
                      onChange={(e) => updateQuestion(q.id, { points: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                
                {['short_answer', 'writing'].includes(q.type) && (
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded text-blue-600 focus:ring-blue-500" 
                      checked={q.isManualGrading || false}
                      onChange={(e) => updateQuestion(q.id, { isManualGrading: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-slate-700">Giáo viên chấm tay (không tự động)</span>
                  </label>
                )}
              </div>
            </CardContent>
          </Card>
          );
        })}
        
        <Button 
          onClick={handleAddQuestion}
          variant="outline" 
          className="w-full border-dashed border-2 py-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-300"
        >
          <Plus className="w-5 h-5 mr-2" />
          Thêm câu hỏi mới
        </Button>
      </div>
    </div>
  );
}
