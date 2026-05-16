import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ShieldAlert } from 'lucide-react';

interface Violation {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  type: string;
  timestamp: string;
  details: string;
}

export default function ViolationsTab() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViolations = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const vQuery = query(
          collection(db, 'violations'),
          where('teacherId', '==', user.uid)
        );
        const snapshot = await getDocs(vQuery);
        const fetchedViolations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Violation));
        
        // Sort explicitly on client because we might need a composite index for orderBy('timestamp', 'desc')
        fetchedViolations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setViolations(fetchedViolations);
      } catch (error) {
        console.error("Error fetching violations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchViolations();
  }, []);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'tab_switch':
        return 'Chuyển Tab';
      case 'copy_paste':
        return 'Copy/Paste';
      case 'leave_fullscreen':
        return 'Thoát Toàn Màn Hình';
      default:
        return type;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'tab_switch':
        return 'bg-amber-100 text-amber-800';
      case 'copy_paste':
        return 'bg-red-100 text-red-800';
      case 'leave_fullscreen':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu vi phạm...</div>;
  }

  return (
    <Card className="border-0 shadow-sm bg-white overflow-hidden max-w-6xl mx-auto">
      <CardHeader className="bg-red-50 border-b border-red-100 pb-6">
        <CardTitle className="text-xl font-bold text-red-700 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6" />
          Nhật ký vi phạm
        </CardTitle>
        <p className="text-sm text-red-600/80">Theo dõi các hành vi có dấu hiệu gian lận của học sinh trong quá trình diễn ra bài kiểm tra.</p>
      </CardHeader>
      <CardContent className="p-0">
        {violations.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <ShieldAlert className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            Không có dữ liệu vi phạm nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full relative text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="font-semibold px-6 py-3">Thời gian</th>
                  <th className="font-semibold py-3 px-2">Học sinh</th>
                  <th className="font-semibold py-3 px-2">Bài kiểm tra</th>
                  <th className="font-semibold py-3 px-2">Loại vi phạm</th>
                  <th className="font-semibold py-3 px-2">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {violations.map((violation) => (
                  <tr key={violation.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {new Date(violation.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-4 px-2">
                      <div className="font-medium text-slate-800">{violation.studentName}</div>
                      <div className="text-xs text-slate-500">{violation.studentEmail}</div>
                    </td>
                    <td className="text-slate-700 py-4 px-2 font-medium max-w-[200px] truncate" title={violation.examTitle}>
                      {violation.examTitle}
                    </td>
                    <td className="py-4 px-2">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getTypeBadge(violation.type)}`}>
                        {getTypeLabel(violation.type)}
                      </span>
                    </td>
                    <td className="text-sm py-4 px-2 text-slate-600 max-w-[250px] truncate" title={violation.details}>
                      {violation.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
