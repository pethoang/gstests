import { useEffect, useState } from 'react';
import { Sparkles, Search, UserCircle, Loader2, Download, MinusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';

interface StudentBadgeInfo {
  email: string;
  name: string;
  badgeCount: number;
  classNames: string[];
}

export default function BadgesTab() {
  const [students, setStudents] = useState<StudentBadgeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [deductModal, setDeductModal] = useState<{ isOpen: boolean; email: string; currentBadges: number } | null>(null);
  const [deductAmount, setDeductAmount] = useState<number>(1);
  const [isDeducting, setIsDeducting] = useState(false);

  useEffect(() => {
    const fetchStudentBadges = async () => {
      const user = auth.currentUser;
      if (!user) return;

      setLoading(true);
      try {
        // 1. Fetch all classes of this teacher to get the list of students
        const qClasses = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
        const classesSnap = await getDocs(qClasses);
        
        const studentMap: Record<string, { name: string, classes: string[] }> = {}; 
        const emails: string[] = [];

        classesSnap.forEach(doc => {
          const data = doc.data();
          const className = data.name || 'Lớp chưa đặt tên';
          if (data.studentEmails && Array.isArray(data.studentEmails)) {
            data.studentEmails.forEach((email: string) => {
              const lowerEmail = email.toLowerCase();
              if (!emails.includes(lowerEmail)) {
                emails.push(lowerEmail);
                studentMap[lowerEmail] = { 
                  name: 'Học sinh', 
                  classes: [className] 
                };
              } else {
                // If student is in multiple classes, add the class name
                if (!studentMap[lowerEmail].classes.includes(className)) {
                  studentMap[lowerEmail].classes.push(className);
                }
              }
            });
          }
        });

        if (emails.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        // 2. Fetch badge counts for these emails
        const statsMap: Record<string, number> = {};
        for (let i = 0; i < emails.length; i += 30) {
          const chunk = emails.slice(i, i + 30);
          const qStats = query(collection(db, 'studentStats'), where('email', 'in', chunk));
          const statsSnap = await getDocs(qStats);
          statsSnap.forEach(doc => {
            const data = doc.data();
            statsMap[data.email.toLowerCase()] = data.badgeCount || 0;
          });
        }

        // 3. Combine data
        const combined = emails.map(email => ({
          email,
          name: studentMap[email].name,
          classNames: studentMap[email].classes,
          badgeCount: statsMap[email] || 0
        })).sort((a, b) => b.badgeCount - a.badgeCount);

        setStudents(combined);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'studentStats');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentBadges();
  }, []);

  const allClasses = Array.from(new Set(students.flatMap(s => s.classNames))).sort();

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.classNames.some(cn => cn.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesClass = selectedClass === 'all' || s.classNames.includes(selectedClass);
    return matchesSearch && matchesClass;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClass]);

  const exportToExcel = () => {
    // We add BOM \uFEFF so Excel opens UTF-8 properly
    const header = ['Học sinh', 'Email', 'Lớp', 'Tổng huy hiệu', 'Phân loại'].join(',');
    const rows = filteredStudents.map(s => {
       const classes = s.classNames.join('; ');
       const rank = s.badgeCount >= 10 ? 'Vàng' : (s.badgeCount >= 5 ? 'Bạc' : (s.badgeCount >= 1 ? 'Đồng' : 'Chưa có'));
       return `"${s.name || s.email}","${s.email}","${classes}","${s.badgeCount}","${rank}"`;
    });
    const csvContent = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_Sach_Huy_Hieu_${selectedClass === 'all' ? 'Tat_Ca' : selectedClass}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeduct = async () => {
    if (!deductModal) return;
    const { email, currentBadges } = deductModal;
    const amountToDeduct = Math.min(Math.max(1, deductAmount), currentBadges);
    
    setIsDeducting(true);
    try {
      const studentStatsRef = doc(db, 'studentStats', email.toLowerCase());
      await updateDoc(studentStatsRef, {
        badgeCount: increment(-amountToDeduct),
        updatedAt: new Date().toISOString()
      });
      
      setStudents(prev => prev.map(s => 
        s.email === email 
          ? { ...s, badgeCount: s.badgeCount - amountToDeduct } 
          : s
      ));
      setDeductModal(null);
      setDeductAmount(1);
    } catch (error) {
      console.error('Error deducting badges:', error);
      alert('Không thể trừ huy hiệu. Vui lòng thử lại.');
    } finally {
      setIsDeducting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500 fill-indigo-500" />
                Quản lý huy hiệu học sinh
              </CardTitle>
              <CardDescription>Theo dõi và quản lý điểm thưởng huy hiệu toàn hệ thống của học sinh.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Tìm kiếm theo tên, email hoặc lớp..." 
                className="pl-10 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                className="flex h-10 w-full sm:w-[180px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="all">Tất cả các lớp</option>
                {allClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              
              <Button onClick={exportToExcel} className="gap-2 shrink-0 bg-[#0d9388] hover:bg-[#0b7a71] text-white">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Xuất Excel</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">Học sinh</th>
                  <th className="px-6 py-4">Lớp</th>
                  <th className="px-6 py-4 text-center">Tổng huy hiệu</th>
                  <th className="px-6 py-4 text-center">Phân loại</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4" colSpan={5}>
                        <div className="h-10 bg-slate-100 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <UserCircle className="w-12 h-12 text-slate-200" />
                        <p>Không tìm thấy học sinh nào hoặc chưa có huy hiệu.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                            {student.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{student.email}</div>
                            <div className="text-xs text-slate-500">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {student.classNames.map((name, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded border border-slate-200">
                              {name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-indigo-700 font-bold">
                          <Sparkles className="w-3.5 h-3.5 fill-indigo-500" />
                          {student.badgeCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {student.badgeCount >= 10 ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded uppercase border border-yellow-200">Vàng</span>
                        ) : student.badgeCount >= 5 ? (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase border border-slate-200">Bạc</span>
                        ) : student.badgeCount >= 1 ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase border border-orange-200">Đồng</span>
                        ) : (
                          <span className="text-xs text-slate-300">Chưa có</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1.5 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                          onClick={() => {
                            setDeductModal({ isOpen: true, email: student.email, currentBadges: student.badgeCount });
                            setDeductAmount(1);
                          }}
                          disabled={student.badgeCount === 0}
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                          Trừ/Quy đổi
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredStudents.length > itemsPerPage && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
              <p className="text-sm text-slate-500">
                Hiển thị <span className="font-medium text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> đến <span className="font-medium text-slate-700">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> kết quả
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Trước
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {deductModal && deductModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Trừ / Quy đổi huy hiệu</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                Thao tác với học sinh: <span className="font-semibold text-slate-900">{deductModal.email}</span>
              </p>
              <div className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg border border-indigo-100">
                <Sparkles className="w-4 h-4 fill-indigo-500" />
                Hiện có: <span className="font-bold">{deductModal.currentBadges}</span> huy hiệu
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Số lượng cần trừ/quy đổi:
                </label>
                <Input 
                  type="number" 
                  min={1} 
                  max={deductModal.currentBadges}
                  value={deductAmount} 
                  onChange={(e) => setDeductAmount(parseInt(e.target.value) || 1)}
                  className="font-semibold"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDeductModal(null)} 
                disabled={isDeducting}
              >
                Hủy
              </Button>
              <Button 
                onClick={handleDeduct} 
                disabled={isDeducting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeducting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : 'Xác nhận trừ'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
