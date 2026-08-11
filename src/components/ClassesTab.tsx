import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Users, Plus, Trash2, Edit3, X, Save, Search, 
  GraduationCap, Mail, UserCheck, Sparkles, Check, 
  Grid, List, UserPlus, Calendar, ArrowRight, BookOpen
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface ClassData {
  id: string;
  name: string;
  teacherId: string;
  studentEmails: string[];
  createdAt: string;
}

export default function ClassesTab() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  
  // Create / Edit modal states
  const [isCreating, setIsCreating] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newEmailsStr, setNewEmailsStr] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmailsStr, setEditEmailsStr] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Quick add student to specific class
  const [quickAddClassId, setQuickAddClassId] = useState<string | null>(null);
  const [quickAddEmail, setQuickAddEmail] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'classes'),
        where('teacherId', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const fetchedClasses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClassData[];
      
      setClasses(fetchedClasses.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'classes');
    } finally {
      setLoading(false);
    }
  };

  const parseEmails = (str: string) => {
    return Array.from(new Set(
      str.split(/[\n,;]+/)
        .map(e => e.trim().toLowerCase())
        .filter(e => e && e.includes('@'))
    ));
  };

  const handleCreate = async () => {
    if (!auth.currentUser || !newClassName.trim()) return;
    const emails = parseEmails(newEmailsStr);
    try {
      await addDoc(collection(db, 'classes'), {
        name: newClassName.trim(),
        teacherId: auth.currentUser.uid,
        studentEmails: emails,
        createdAt: new Date().toISOString()
      });
      setNewClassName('');
      setNewEmailsStr('');
      setIsCreating(false);
      fetchClasses();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'classes');
      alert("Lỗi khi tạo lớp học.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'classes', id));
      fetchClasses();
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'classes');
      alert("Lỗi khi xóa lớp học.");
    }
  };

  const startEdit = (cls: ClassData) => {
    setEditingId(cls.id);
    setEditName(cls.name);
    setEditEmailsStr(cls.studentEmails.join('\n'));
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const emails = parseEmails(editEmailsStr);
    try {
      const updates: any = {
        name: editName.trim(),
        studentEmails: emails
      };

      await updateDoc(doc(db, 'classes', editingId), updates);
      setEditingId(null);
      fetchClasses();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'classes');
      alert("Lỗi khi cập nhật lớp học.");
    }
  };

  const handleRemoveSingleEmail = async (cls: ClassData, emailToRemove: string) => {
    const updatedEmails = cls.studentEmails.filter(e => e !== emailToRemove);
    try {
      await updateDoc(doc(db, 'classes', cls.id), {
        studentEmails: updatedEmails
      });
      setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, studentEmails: updatedEmails } : c));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `classes/${cls.id}`);
    }
  };

  const handleQuickAddEmail = async (cls: ClassData) => {
    if (!quickAddEmail.trim() || !quickAddEmail.includes('@')) return;
    const cleanEmail = quickAddEmail.trim().toLowerCase();
    if (cls.studentEmails.includes(cleanEmail)) {
      setQuickAddEmail('');
      setQuickAddClassId(null);
      return;
    }
    const updatedEmails = [...cls.studentEmails, cleanEmail];
    try {
      await updateDoc(doc(db, 'classes', cls.id), {
        studentEmails: updatedEmails
      });
      setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, studentEmails: updatedEmails } : c));
      setQuickAddEmail('');
      setQuickAddClassId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `classes/${cls.id}`);
    }
  };

  // Helper to derive grade badge color from class name
  const getGradeBadge = (name: string) => {
    const match = name.match(/(\d+)/);
    if (!match) return { label: 'Lớp', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    const num = parseInt(match[1], 10);
    if (num === 6) return { label: 'Khối 6', color: 'bg-blue-50 text-blue-600 border-blue-200' };
    if (num === 7) return { label: 'Khối 7', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' };
    if (num === 8) return { label: 'Khối 8', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    if (num === 9) return { label: 'Khối 9', color: 'bg-amber-50 text-amber-600 border-amber-200' };
    return { label: `Khối ${num}`, color: 'bg-purple-50 text-purple-600 border-purple-200' };
  };

  const filteredClasses = classes.filter(cls => {
    const matchName = cls.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEmail = cls.studentEmails.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchName || matchEmail;
  });

  const totalStudentsCount = Array.from(new Set(classes.flatMap(c => c.studentEmails))).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Modern Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-blue-100 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Quản lý danh sách & Giới hạn quyền thi</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Quản lý Lớp học & Học sinh</h1>
            <p className="text-blue-100 text-sm leading-relaxed">
              Tạo lớp học, quản lý email học sinh để cấp quyền làm bài kiểm tra chính thức và phân tích tiến độ dễ dàng.
            </p>
          </div>

          <Button 
            onClick={() => setIsCreating(true)} 
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50 font-bold shadow-md hover:shadow-lg transition-all duration-200 gap-2 shrink-0 border-0"
          >
            <Plus className="w-5 h-5" /> Thêm lớp mới
          </Button>
        </div>

        {/* Decorative Blurred Circles */}
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl" />
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-slate-200/80 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng số lớp học</p>
              <p className="text-2xl font-black text-slate-800">{classes.length} <span className="text-sm font-semibold text-slate-500">lớp</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng học sinh độc lập</p>
              <p className="text-2xl font-black text-slate-800">{totalStudentsCount} <span className="text-sm font-semibold text-slate-500">em</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sĩ số trung bình</p>
              <p className="text-2xl font-black text-slate-800">
                {classes.length > 0 ? (totalStudentsCount / classes.length).toFixed(1) : '0'} <span className="text-sm font-semibold text-slate-500">hs/lớp</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar: Search & View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <Input
            placeholder="Tìm kiếm lớp học hoặc email học sinh..."
            className="pl-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs font-medium text-slate-400">Hiển thị:</span>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white text-blue-600 shadow-sm font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Dạng Thẻ
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'table' 
                  ? 'bg-white text-blue-600 shadow-sm font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Dạng Bảng
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Create Class */}
      {isCreating && (
        <Card className="border border-blue-200 shadow-xl overflow-hidden animate-in fade-in duration-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/50 pb-4 border-b border-blue-100">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Tạo lớp học mới</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Điền tên lớp và danh sách email học sinh</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="rounded-full">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Tên lớp học <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="VD: Lớp 7A1 - Tiếng Anh" 
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="text-sm font-medium"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-700 font-semibold">Danh sách Email học sinh</Label>
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 font-semibold text-xs">
                  {parseEmails(newEmailsStr).length} email hợp lệ
                </Badge>
              </div>
              <textarea 
                className="w-full flex min-h-[130px] rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Dán danh sách email tại đây (Mỗi email một dòng, hoặc cách nhau bởi dấu phẩy, dấu chấm phẩy)&#10;VD:&#10;nam@gmail.com&#10;tu@gmail.com, lan@gmail.com"
                value={newEmailsStr}
                onChange={(e) => setNewEmailsStr(e.target.value)}
              />
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                Học sinh dùng đúng email Google này đăng nhập sẽ được cấp quyền làm các bài kiểm tra được giao cho lớp.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Hủy bỏ
              </Button>
              <Button onClick={handleCreate} disabled={!newClassName.trim()} className="bg-blue-600 hover:bg-blue-700 font-bold px-6">
                Lưu lớp học
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Area */}
      {loading ? (
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Đang tải danh sách lớp học...</p>
          </CardContent>
        </Card>
      ) : filteredClasses.length === 0 ? (
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">
                {searchTerm ? 'Không tìm thấy lớp học phù hợp' : 'Chưa có lớp học nào'}
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                {searchTerm 
                  ? `Không có kết quả nào khớp với từ khóa "${searchTerm}".`
                  : 'Hãy tạo lớp học đầu tiên để bắt đầu thêm danh sách học sinh và giao bài thi.'}
              </p>
            </div>
            {searchTerm ? (
              <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                Xóa từ khóa tìm kiếm
              </Button>
            ) : (
              <Button onClick={() => setIsCreating(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Tạo lớp mới ngay
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW (Modern Cards) */
        <div className="grid gap-6 md:grid-cols-2">
          {filteredClasses.map(cls => {
            const badge = getGradeBadge(cls.name);
            const isEditing = editingId === cls.id;
            const isDeleting = deleteConfirmId === cls.id;
            const isQuickAdding = quickAddClassId === cls.id;

            return (
              <Card key={cls.id} className="overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between bg-white group">
                {isEditing ? (
                  /* Edit State */
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-blue-600" /> Sửa lớp học
                      </h4>
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <Label className="text-xs font-semibold text-slate-600">Tên lớp</Label>
                        <Input 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-xs font-semibold text-slate-600">Danh sách Email</Label>
                          <span className="text-[11px] font-bold text-blue-600">
                            {parseEmails(editEmailsStr).length} email
                          </span>
                        </div>
                        <textarea 
                          className="w-full flex min-h-[110px] rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono outline-none focus:bg-white focus:border-blue-500"
                          value={editEmailsStr}
                          onChange={(e) => setEditEmailsStr(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                        Hủy
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700 font-bold gap-1">
                        <Save className="w-3.5 h-3.5" /> Lưu thay đổi
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View State */
                  <div>
                    {/* Card Header */}
                    <div className="p-5 pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                                {cls.name}
                              </h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Tạo ngày {new Date(cls.createdAt).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {isDeleting ? (
                            <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-lg border border-red-200 animate-in fade-in">
                              <span className="text-xs font-bold text-red-600 px-1">Xóa lớp?</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-xs text-slate-600 hover:bg-slate-200" 
                                onClick={() => setDeleteConfirmId(null)}
                              >
                                Hủy
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-6 px-2 text-xs font-bold bg-red-600 hover:bg-red-700" 
                                onClick={() => handleDelete(cls.id)}
                              >
                                Xác nhận
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-8 h-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                onClick={() => startEdit(cls)}
                                title="Chỉnh sửa lớp"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-8 h-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                onClick={() => setDeleteConfirmId(cls.id)}
                                title="Xóa lớp"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Body: Student Chips */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Danh sách học sinh
                          </span>
                          <span className="bg-slate-100 text-slate-700 text-xs font-extrabold px-2 py-0.5 rounded-full border border-slate-200">
                            {cls.studentEmails.length}
                          </span>
                        </div>

                        {!isQuickAdding && (
                          <button
                            onClick={() => {
                              setQuickAddClassId(cls.id);
                              setQuickAddEmail('');
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors hover:underline"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Thêm nhanh
                          </button>
                        )}
                      </div>

                      {/* Quick Add Inline Form */}
                      {isQuickAdding && (
                        <div className="flex gap-2 items-center bg-blue-50/70 p-2 rounded-xl border border-blue-200 animate-in fade-in">
                          <Input
                            placeholder="Nhập email học sinh..."
                            className="text-xs h-8 bg-white border-blue-200"
                            value={quickAddEmail}
                            onChange={(e) => setQuickAddEmail(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleQuickAddEmail(cls);
                            }}
                            autoFocus
                          />
                          <Button 
                            size="sm" 
                            className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 font-bold shrink-0"
                            onClick={() => handleQuickAddEmail(cls)}
                            disabled={!quickAddEmail.trim() || !quickAddEmail.includes('@')}
                          >
                            Thêm
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 shrink-0"
                            onClick={() => setQuickAddClassId(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {/* Student Chips List */}
                      {cls.studentEmails.length > 0 ? (
                        <div className="max-h-[140px] overflow-y-auto custom-scrollbar flex flex-wrap gap-2 p-1">
                          {cls.studentEmails.map((email, i) => {
                            const initial = email.charAt(0).toUpperCase();
                            return (
                              <div 
                                key={i} 
                                className="group/chip inline-flex items-center gap-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 text-slate-700 hover:text-blue-700 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 shadow-2xs"
                              >
                                <span className="w-4 h-4 rounded-full bg-slate-200 group-hover/chip:bg-blue-200 text-slate-600 group-hover/chip:text-blue-800 flex items-center justify-center text-[9px] font-black shrink-0">
                                  {initial}
                                </span>
                                <span className="truncate max-w-[170px]">{email}</span>
                                <button
                                  onClick={() => handleRemoveSingleEmail(cls, email)}
                                  className="text-slate-400 hover:text-red-500 opacity-0 group-hover/chip:opacity-100 transition-opacity ml-0.5"
                                  title="Xóa học sinh này"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                          <p className="text-xs text-slate-400 italic">Chưa có học sinh nào trong lớp này.</p>
                          <button
                            onClick={() => {
                              setQuickAddClassId(cls.id);
                              setQuickAddEmail('');
                            }}
                            className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
                          >
                            + Bấm để thêm ngay
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left align-middle">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold">Tên Lớp học</th>
                  <th className="px-6 py-4 font-bold">Khối</th>
                  <th className="px-6 py-4 font-bold">Sĩ số</th>
                  <th className="px-6 py-4 font-bold">Danh sách Email</th>
                  <th className="px-6 py-4 font-bold">Ngày tạo</th>
                  <th className="px-6 py-4 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClasses.map((cls) => {
                  const badge = getGradeBadge(cls.name);
                  return (
                    <tr key={cls.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 font-extrabold text-slate-900 text-base">
                        <span>{cls.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800">{cls.studentEmails.length}</span> hs
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        {cls.studentEmails.length > 0 ? (
                          <div className="text-xs text-slate-600 truncate">
                            {cls.studentEmails.join(', ')}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa có email</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(cls.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-blue-600 hover:bg-blue-50 font-semibold text-xs"
                            onClick={() => startEdit(cls)}
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" /> Sửa
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-red-600 hover:bg-red-50 font-semibold text-xs"
                            onClick={() => setDeleteConfirmId(cls.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
