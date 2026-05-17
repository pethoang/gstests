import { useEffect, useState } from 'react';
import { Sparkles, Search, UserCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const filteredStudents = students.filter(s => 
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.classNames.some(cn => cn.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">Học sinh</th>
                  <th className="px-6 py-4">Lớp</th>
                  <th className="px-6 py-4 text-center">Tổng huy hiệu</th>
                  <th className="px-6 py-4 text-right">Phân loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4" colSpan={4}>
                        <div className="h-10 bg-slate-100 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
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
                      <td className="px-6 py-4 text-right">
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
    </div>
  );
}
