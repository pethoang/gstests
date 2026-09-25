import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { CategoryItem } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  Tags, Plus, Trash2, Edit3, Save, X, RefreshCw, 
  BookOpen, FileText, Check, AlertCircle 
} from 'lucide-react';

interface CategoriesTabProps {
  grades: CategoryItem[];
  examTypes: CategoryItem[];
  onUpdateCategories: (newGrades: CategoryItem[], newExamTypes: CategoryItem[]) => void;
}

export const DEFAULT_GRADES: CategoryItem[] = [
  { id: '6', name: 'Khối 6' },
  { id: '7', name: 'Khối 7' },
  { id: '8', name: 'Khối 8' },
  { id: '9', name: 'Khối 9' },
];

export const DEFAULT_EXAM_TYPES: CategoryItem[] = [
  { id: 'GK1', name: 'Giữa kỳ 1' },
  { id: 'CK1', name: 'Cuối kỳ 1' },
  { id: 'GK2', name: 'Giữa kỳ 2' },
  { id: 'CK2', name: 'Cuối kỳ 2' },
  { id: 'Unit', name: 'Bài học (Unit)' },
];

export default function CategoriesTab({ grades, examTypes, onUpdateCategories }: CategoriesTabProps) {
  const [localGrades, setLocalGrades] = useState<CategoryItem[]>(grades);
  const [localExamTypes, setLocalExamTypes] = useState<CategoryItem[]>(examTypes);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Add Grade Form
  const [newGradeId, setNewGradeId] = useState('');
  const [newGradeName, setNewGradeName] = useState('');

  // Add Exam Type Form
  const [newTypeId, setNewTypeId] = useState('');
  const [newTypeName, setNewTypeName] = useState('');

  // Editing state
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editGradeName, setEditGradeName] = useState('');

  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState('');

  const handleAddGrade = () => {
    if (!newGradeId.trim() || !newGradeName.trim()) return;
    const id = newGradeId.trim();
    if (localGrades.some(g => g.id.toLowerCase() === id.toLowerCase())) {
      alert('Mã khối lớp này đã tồn tại!');
      return;
    }
    const updated = [...localGrades, { id, name: newGradeName.trim() }];
    setLocalGrades(updated);
    setNewGradeId('');
    setNewGradeName('');
    saveToFirestore(updated, localExamTypes);
  };

  const handleDeleteGrade = (id: string) => {
    if (localGrades.length <= 1) {
      alert('Phải giữ lại ít nhất 1 khối lớp!');
      return;
    }
    const updated = localGrades.filter(g => g.id !== id);
    setLocalGrades(updated);
    saveToFirestore(updated, localExamTypes);
  };

  const handleStartEditGrade = (g: CategoryItem) => {
    setEditingGradeId(g.id);
    setEditGradeName(g.name);
  };

  const handleSaveEditGrade = (id: string) => {
    if (!editGradeName.trim()) return;
    const updated = localGrades.map(g => g.id === id ? { ...g, name: editGradeName.trim() } : g);
    setLocalGrades(updated);
    setEditingGradeId(null);
    saveToFirestore(updated, localExamTypes);
  };

  const handleAddExamType = () => {
    if (!newTypeId.trim() || !newTypeName.trim()) return;
    const id = newTypeId.trim();
    if (localExamTypes.some(t => t.id.toLowerCase() === id.toLowerCase())) {
      alert('Mã dạng bài này đã tồn tại!');
      return;
    }
    const updated = [...localExamTypes, { id, name: newTypeName.trim() }];
    setLocalExamTypes(updated);
    setNewTypeId('');
    setNewTypeName('');
    saveToFirestore(localGrades, updated);
  };

  const handleDeleteExamType = (id: string) => {
    if (localExamTypes.length <= 1) {
      alert('Phải giữ lại ít nhất 1 dạng bài!');
      return;
    }
    const updated = localExamTypes.filter(t => t.id !== id);
    setLocalExamTypes(updated);
    saveToFirestore(localGrades, updated);
  };

  const handleStartEditType = (t: CategoryItem) => {
    setEditingTypeId(t.id);
    setEditTypeName(t.name);
  };

  const handleSaveEditType = (id: string) => {
    if (!editTypeName.trim()) return;
    const updated = localExamTypes.map(t => t.id === id ? { ...t, name: editTypeName.trim() } : t);
    setLocalExamTypes(updated);
    setEditingTypeId(null);
    saveToFirestore(localGrades, updated);
  };

  const handleResetDefaults = () => {
    if (confirm('Bạn có chắc chắn muốn khôi phục danh mục Khối & Dạng bài về mặc định ban đầu?')) {
      setLocalGrades(DEFAULT_GRADES);
      setLocalExamTypes(DEFAULT_EXAM_TYPES);
      saveToFirestore(DEFAULT_GRADES, DEFAULT_EXAM_TYPES);
    }
  };

  const saveToFirestore = async (gList: CategoryItem[], tList: CategoryItem[]) => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'categories', 'examCategories'), {
        grades: gList,
        examTypes: tList,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser.email
      });
      onUpdateCategories(gList, tList);
      setSuccessMsg('Đã lưu cấu hình danh mục thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('Error saving categories:', err);
      alert(`Lỗi khi lưu danh mục: ${err?.message || 'Không xác định'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-800 text-white p-6 sm:p-8 rounded-2xl shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold">
              <Tags className="w-3.5 h-3.5 text-teal-200" /> Quản lý danh mục động
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Cấu hình Khối & Dạng bài thi</h1>
            <p className="text-teal-100 text-sm max-w-xl">
              Thêm bớt Khối lớp và Dạng đề thi tùy chỉnh cho toàn hệ thống. Tất cả bộ lọc, dropdown phân loại sẽ tự động cập nhật ngay lập tức.
            </p>
          </div>
          <Button 
            onClick={handleResetDefaults} 
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-semibold gap-2 shrink-0 self-start md:self-auto"
          >
            <RefreshCw className="w-4 h-4" /> Khôi phục mặc định
          </Button>
        </div>

        {/* Decorative Blurred Circles */}
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 font-semibold shadow-sm animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Grid: 2 Columns for Grades and Exam Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* CARD 1: KHỐI LỚP (GRADES) */}
        <Card className="border border-slate-200 shadow-md bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Danh sách Khối lớp</CardTitle>
                  <CardDescription className="text-xs text-slate-500">VD: Khối 6, Khối 7, Khối 10, Khối 12...</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 font-bold">
                {localGrades.length} Khối
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Form Thêm Khối Mới */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Thêm Khối lớp mới</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input 
                  placeholder="Mã (VD: 10)" 
                  value={newGradeId}
                  onChange={(e) => setNewGradeId(e.target.value)}
                  className="text-xs bg-white"
                />
                <Input 
                  placeholder="Tên (VD: Khối 10)" 
                  value={newGradeName}
                  onChange={(e) => setNewGradeName(e.target.value)}
                  className="text-xs bg-white sm:col-span-2"
                />
              </div>
              <Button 
                onClick={handleAddGrade}
                disabled={!newGradeId.trim() || !newGradeName.trim() || saving}
                size="sm"
                className="w-full bg-teal-600 hover:bg-teal-700 font-bold gap-1.5"
              >
                <Plus className="w-4 h-4" /> Thêm Khối lớp
              </Button>
            </div>

            {/* List Khối Hiện Có */}
            <div className="space-y-2">
              {localGrades.map((g) => (
                <div 
                  key={g.id} 
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-colors shadow-2xs"
                >
                  {editingGradeId === g.id ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <Input 
                        value={editGradeName}
                        onChange={(e) => setEditGradeName(e.target.value)}
                        className="text-xs h-8 bg-slate-50"
                        autoFocus
                      />
                      <Button size="sm" className="h-8 px-3 bg-teal-600" onClick={() => handleSaveEditGrade(g.id)}>
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingGradeId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-teal-100 text-teal-800 font-bold px-2.5 py-1 text-xs">
                          Mã: {g.id}
                        </Badge>
                        <span className="font-bold text-slate-800 text-sm">{g.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-500 hover:text-teal-600"
                          onClick={() => handleStartEditGrade(g)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                          onClick={() => handleDeleteGrade(g.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: DẠNG BÀI THI (EXAM TYPES) */}
        <Card className="border border-slate-200 shadow-md bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Danh mục Dạng đề thi</CardTitle>
                  <CardDescription className="text-xs text-slate-500">VD: GK1, CK1, Đề HSG, Thi thử...</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">
                {localExamTypes.length} Dạng đề
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Form Thêm Dạng Đề Mới */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Thêm Dạng bài thi mới</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input 
                  placeholder="Mã (VD: HSG)" 
                  value={newTypeId}
                  onChange={(e) => setNewTypeId(e.target.value)}
                  className="text-xs bg-white"
                />
                <Input 
                  placeholder="Tên (VD: Đề thi HSG)" 
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="text-xs bg-white sm:col-span-2"
                />
              </div>
              <Button 
                onClick={handleAddExamType}
                disabled={!newTypeId.trim() || !newTypeName.trim() || saving}
                size="sm"
                className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold gap-1.5"
              >
                <Plus className="w-4 h-4" /> Thêm Dạng bài thi
              </Button>
            </div>

            {/* List Dạng Bài Hiện Có */}
            <div className="space-y-2">
              {localExamTypes.map((t) => (
                <div 
                  key={t.id} 
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors shadow-2xs"
                >
                  {editingTypeId === t.id ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <Input 
                        value={editTypeName}
                        onChange={(e) => setEditTypeName(e.target.value)}
                        className="text-xs h-8 bg-slate-50"
                        autoFocus
                      />
                      <Button size="sm" className="h-8 px-3 bg-indigo-600" onClick={() => handleSaveEditType(t.id)}>
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingTypeId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1 text-xs">
                          Mã: {t.id}
                        </Badge>
                        <span className="font-bold text-slate-800 text-sm">{t.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                          onClick={() => handleStartEditType(t)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                          onClick={() => handleDeleteExamType(t.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
