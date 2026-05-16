import { useEffect, useState } from 'react';
import { Search, Filter, Download, UserCircle, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import * as XLSX from 'xlsx';

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
  const [loading, setLoading] = useState(false);

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
        const fetched: Submission[] = [];
        querySnapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as Submission);
        });
        setSubmissions(fetched);
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

  const avgScore = filteredSubmissions.length > 0 
    ? (filteredSubmissions.reduce((sum, sub) => sum + sub.score, 0) / filteredSubmissions.length).toFixed(1)
    : 0;

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
              {filteredSubmissions.map((sub, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserCircle className="w-8 h-8 text-slate-400" />
                      <div>
                        <span className="font-semibold text-slate-900 block">{sub.studentName}</span>
                        <span className="text-xs text-slate-500">{sub.studentEmail}</span>
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
              ))}
            </tbody>
          </table>
          )}
        </div>
      </Card>
    </div>
  );
}
