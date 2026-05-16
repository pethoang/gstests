import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Users, Plus, Trash2, Edit3, X, Save } from 'lucide-react';
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
  
  const [isCreating, setIsCreating] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newEmailsStr, setNewEmailsStr] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmailsStr, setEditEmailsStr] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    return str.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(e => e && e.includes('@'));
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Quản lý Lớp học
          </h2>
          <p className="text-slate-500 mt-1">Tạo lớp học và quản lý danh sách email học sinh để giới hạn quyền làm bài.</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Thêm lớp mới
          </Button>
        )}
      </div>

      {isCreating && (
        <Card className="border-blue-200 shadow-md">
          <CardHeader className="bg-blue-50/50 pb-4 border-b border-blue-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg text-blue-800">Tạo lớp học mới</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Tên lớp học</Label>
              <Input 
                placeholder="VD: Lớp 10A1 - 2024" 
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Danh sách Email học sinh (Mỗi email 1 dòng hoặc cách nhau bằng dấu phẩy)</Label>
              <textarea 
                className="w-full flex min-h-[120px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="nguyenvana@gmail.com&#10;tranmathb@gmail.com"
                value={newEmailsStr}
                onChange={(e) => setNewEmailsStr(e.target.value)}
              />
              <p className="text-xs text-slate-500">Giáo viên thêm email của học sinh vào đây. Học sinh đăng nhập bằng Google bằng các email này sẽ có quyền làm bài kiểm tra của lớp.</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleCreate} disabled={!newClassName.trim()}>
                Lưu lớp học
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500">Đang tải danh sách lớp...</div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">Chưa có lớp học nào</h3>
          <p className="text-slate-500 mb-4">Tạo lớp học đầu tiên để quản lý học sinh của bạn dễ dàng hơn.</p>
          <Button onClick={() => setIsCreating(true)} variant="outline">Thêm lớp học</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map(cls => (
            <Card key={cls.id} className="overflow-hidden">
              {editingId === cls.id ? (
                <>
                  <CardHeader className="bg-slate-50 pb-4 border-b border-slate-100">
                     <div className="flex justify-between items-center">
                        <CardTitle className="text-base">Sửa lớp học</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                           <X className="w-4 h-4" />
                        </Button>
                     </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Tên lớp</Label>
                      <Input 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Danh sách Email ({parseEmails(editEmailsStr).length})</Label>
                      <textarea 
                        className="w-full flex min-h-[120px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white outline-none focus:border-blue-500"
                        value={editEmailsStr}
                        onChange={(e) => setEditEmailsStr(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Hủy</Button>
                      <Button size="sm" onClick={handleSaveEdit} className="gap-1">
                        <Save className="w-4 h-4" /> Lưu
                      </Button>
                    </div>
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader className="bg-slate-50 pb-4 border-b border-slate-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {cls.name}
                        </CardTitle>
                        <CardDescription>{new Date(cls.createdAt).toLocaleDateString('vi-VN')}</CardDescription>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {deleteConfirmId === cls.id ? (
                          <div className="flex items-center gap-2 bg-red-50 p-1 rounded-md border border-red-100">
                             <span className="text-xs text-red-600 font-medium px-2">Xóa?</span>
                             <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-500 hover:bg-slate-200" onClick={() => setDeleteConfirmId(null)}>Hủy</Button>
                             <Button variant="destructive" size="sm" className="h-7 px-2" onClick={() => handleDelete(cls.id)}>Xóa</Button>
                          </div>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => startEdit(cls)}>
                              <Edit3 className="w-4 h-4 text-slate-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(cls.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{cls.studentEmails.length} học sinh</span>
                    </div>
                    {cls.studentEmails.length > 0 ? (
                      <div className="max-h-[100px] overflow-y-auto space-y-1 text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                         {cls.studentEmails.map((email, i) => (
                           <div key={i} className="truncate">{email}</div>
                         ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">Chưa có học sinh nào</p>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
