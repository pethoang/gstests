import { useEffect, useState } from 'react';
import { Search, Filter, Download, UserCircle, CheckCircle, XCircle, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ResultsTabProps {
  examId: string | null;
  onBack?: () => void;
}

interface Submission {
  id: string;
  studentName: string;
  studentEmail: string;
  score: number;
  maxScore: number;
  submittedAt: string;
  answers: Record<string, any>;
}

interface Class {
  id: string;
  name: string;
  studentEmails: string[];
}

export default function ResultsTab({ examId, onBack }: ResultsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [classes, setClasses] = useState<Class[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [studentStats, setStudentStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const q = query(
          collection(db, 'classes'),
          where('teacherId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetched: Class[] = [];
        querySnapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as Class);
        });
        setClasses(fetched);
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!examId) return;

    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
          collection(db, 'submissions'),
          where('examId', '==', examId),
          where('teacherId', '==', user.uid),
          orderBy('score', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const submissionMap = new Map<string, Submission>();
        querySnapshot.forEach((doc) => {
          const sub = { id: doc.id, ...doc.data() } as Submission;
          const key = (sub.studentEmail && sub.studentEmail.trim()) 
            ? sub.studentEmail.toLowerCase().trim() 
            : (sub.studentName ? sub.studentName.toLowerCase().trim() : sub.id);
          
          const existing = submissionMap.get(key);
          if (!existing) {
            submissionMap.set(key, sub);
          } else {
            const existingTime = new Date(existing.submittedAt || 0).getTime();
            const currentTime = new Date(sub.submittedAt || 0).getTime();
            if (currentTime > existingTime) {
              submissionMap.set(key, sub);
            }
          }
        });

        const deduplicated = Array.from(submissionMap.values());
        deduplicated.sort((a, b) => b.score - a.score);
        setSubmissions(deduplicated);

        // Fetch Stats for these students safely
        const emails = Array.from(
          new Set(
            deduplicated
              .map(s => (s.studentEmail || '').toLowerCase())
              .filter(Boolean)
          )
        );
        if (emails.length > 0) {
          const statsMap: Record<string, number> = {};
          for (let i = 0; i < emails.length; i += 30) {
            const chunk = emails.slice(i, i + 30);
            const qStats = query(collection(db, 'studentStats'), where('email', 'in', chunk));
            const statsSnap = await getDocs(qStats);
            statsSnap.forEach(doc => {
              const emailData = doc.data().email;
              if (emailData) {
                statsMap[emailData.toLowerCase()] = doc.data().badgeCount || 0;
              }
            });
          }
          setStudentStats(statsMap);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'submissions');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [examId]);

  const filteredSubmissions = submissions.filter(sub => {
    const matchSearch = sub.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       (sub.studentEmail && sub.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (selectedClassId === 'all') {
      return matchSearch;
    }
    
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass) return matchSearch;

    return matchSearch && selectedClass.studentEmails.includes(sub.studentEmail || '');
  });

  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClassId]);

  const avgScore = filteredSubmissions.length > 0 
    ? (filteredSubmissions.reduce((sum, sub) => sum + sub.score, 0) / filteredSubmissions.length).toFixed(1)
    : '0.0';

  const generateChartData = () => {
    if (filteredSubmissions.length === 0) return [];

    const bins = {
      '0-2 điểm': 0,
      '2-4 điểm': 0,
      '4-6 điểm': 0,
      '6-8 điểm': 0,
      '8-10 điểm': 0,
    };

    filteredSubmissions.forEach(sub => {
      // Normalize to 10 scale just in case maxScore is not 10.
      const normalizedScore = sub.maxScore > 0 ? (sub.score / sub.maxScore) * 10 : 0;
      if (normalizedScore <= 2) bins['0-2 điểm']++;
      else if (normalizedScore <= 4) bins['2-4 điểm']++;
      else if (normalizedScore <= 6) bins['4-6 điểm']++;
      else if (normalizedScore <= 8) bins['6-8 điểm']++;
      else bins['8-10 điểm']++;
    });

    return Object.keys(bins).map(key => ({
      name: key,
      count: bins[key as keyof typeof bins]
    }));
  };
  const chartData = generateChartData();

  const exportToExcel = () => {
    if (filteredSubmissions.length === 0) return;

    const dataToExport = filteredSubmissions.map((sub, index) => ({
      'STT': index + 1,
      'Họ và tên': sub.studentName,
      'Email': sub.studentEmail,
      'Điểm đạt được': sub.score.toFixed(2),
      'Tổng điểm': sub.maxScore,
      'Ngày nộp': new Intl.DateTimeFormat('vi-VN', {
         day: '2-digit', month: '2-digit', year: 'numeric',
         hour: '2-digit', minute: '2-digit'
      }).format(new Date(sub.submittedAt)),
      'Trạng thái': 'Đã tự động chấm'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ket qua hoc sinh');

    XLSX.writeFile(workbook, 'Danh_sach_diem.xlsx');
  };

  if (!examId) {
    return (
      <Card>
         <CardContent className="flex flex-col items-center justify-center py-16">
           <p className="text-slate-500">Vui lòng chọn 1 đề thi từ Kho đề thi để xem kết quả.</p>
         </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Kết quả học sinh</h2>
            <p className="text-slate-500">Xem điểm, bài làm chi tiết và xuất báo cáo điểm số.</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportToExcel} disabled={submissions.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Xuất file Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Đã nộp bài</p>
            <p className="text-2xl font-bold text-blue-600">{filteredSubmissions.length} hs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Điểm trung bình</p>
            <p className="text-2xl font-bold">{avgScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Cao điểm nhất</p>
            <p className="text-2xl font-bold text-green-600">
              {filteredSubmissions.length > 0 ? Math.max(...filteredSubmissions.map(s => s.score)).toFixed(2) : '--'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Cần chấm tay</p>
            <p className="text-2xl font-bold text-amber-500">0 bài</p>
          </CardContent>
        </Card>
      </div>

      {filteredSubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Phổ điểm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip 
                    formatter={(value: any) => [`${value} học sinh`, 'Số lượng']}
                    cursor={{fill: '#f1f5f9'}}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input 
              placeholder="Tìm kiếm tên học sinh..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="h-10 px-3 py-2 border border-slate-200 rounded-md text-sm bg-white min-w-[200px]"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="all">Tất cả bài nộp</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Lọc thêm
          </Button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
             <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
             </div>
          ) : submissions.length === 0 ? (
             <div className="text-center p-8 text-slate-500">Chưa có học sinh nào nộp bài.</div>
          ) : (
          <table className="w-full text-sm text-left align-middle">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Học sinh</th>
                <th className="px-6 py-4 font-medium">Điểm số</th>
                <th className="px-6 py-4 font-medium">Ngày nộp</th>
                <th className="px-6 py-4 font-medium">Trạng thái</th>
                <th className="px-6 py-4 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {paginatedSubmissions.map((sub, i) => {
                const studentEmailLower = (sub.studentEmail || '').toLowerCase();
                const badgeCount = studentEmailLower ? (studentStats[studentEmailLower] || 0) : 0;
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserCircle className="w-8 h-8 text-slate-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 block">{sub.studentName}</span>
                            {badgeCount > 0 && (
                              <div className="flex items-center gap-0.5 bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full border border-indigo-100 text-[10px] font-bold" title={`${badgeCount} Huy hiệu`}>
                                <Sparkles className="w-2.5 h-2.5 fill-indigo-500" />
                                {badgeCount}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{sub.studentEmail || 'Không có email'}</span>
                        </div>
                      </div>
                    </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-lg text-slate-900">{sub.score.toFixed(2)}</span>
                    <span className="text-slate-500">/{sub.maxScore}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Intl.DateTimeFormat('vi-VN', {
                       day: '2-digit', month: '2-digit', year: 'numeric',
                       hour: '2-digit', minute: '2-digit'
                    }).format(new Date(sub.submittedAt))}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="success">Đã tự động chấm</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Button variant="ghost" size="sm" className="text-blue-600 font-medium">Xem chi tiết</Button>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
          )}
          
          {!loading && filteredSubmissions.length > itemsPerPage && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
              <p className="text-sm text-slate-500">
                Hiển thị <span className="font-medium text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> đến <span className="font-medium text-slate-700">{Math.min(currentPage * itemsPerPage, filteredSubmissions.length)}</span> trong tổng số <span className="font-medium text-slate-700">{filteredSubmissions.length}</span> kết quả
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
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
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
        </div>
      </Card>
    </div>
  );
}
