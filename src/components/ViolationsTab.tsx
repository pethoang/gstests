import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchViolations = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const vQuery = query(
        collection(db, 'violations'),
        where('teacherId', '==', user.uid)
      );
      const snapshot = await getDocs(vQuery);
      const fetchedViolations = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as Violation));
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const validViolations: Violation[] = [];

      for (const v of fetchedViolations) {
        if (new Date(v.timestamp) < thirtyDaysAgo) {
          // Tự động xoá những vi phạm cũ hơn 30 ngày //
          try {
            await deleteDoc(doc(db, 'violations', v.id));
          } catch (e) {
            console.error("Failed to auto-delete old violation", e);
          }
        } else {
          validViolations.push(v);
        }
      }
      
      // Sort explicitly on client
      validViolations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setViolations(validViolations);
    } catch (error) {
      console.error("Error fetching violations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const handleDelete = async (id: string) => {
    try {
       await deleteDoc(doc(db, 'violations', id));
       setDeleteConfirmId(null);
       fetchViolations();
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, 'violations');
       alert("Lỗi khi xoá vi phạm.");
    }
  };

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
    <Card className="border-0 shadow-sm bg-white overflow-hidden max-w-7xl mx-auto">
      <CardHeader className="bg-red-50 border-b border-red-100 pb-6 hidden md:block">
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
                  <th className="font-semibold py-3 px-6 text-right">Thao tác</th>
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
                    <td className="text-slate-700 py-4 px-2 font-medium max-w-[150px] truncate" title={violation.examTitle}>
                      {violation.examTitle}
                    </td>
                    <td className="py-4 px-2">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getTypeBadge(violation.type)}`}>
                        {getTypeLabel(violation.type)}
                      </span>
                    </td>
                    <td className="text-sm py-4 px-2 text-slate-600 max-w-[200px] truncate" title={violation.details}>
                      {violation.details}
                    </td>
                    <td className="py-4 px-6 text-right">
                       {deleteConfirmId === violation.id ? (
                          <div className="flex items-center justify-end gap-2 bg-red-50 p-1 rounded-md border border-red-100">
                             <span className="text-xs text-red-600 font-medium px-1">Xóa?</span>
                             <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-500 hover:bg-slate-200" onClick={() => setDeleteConfirmId(null)}>Hủy</Button>
                             <Button variant="destructive" size="sm" className="h-7 px-2" onClick={() => handleDelete(violation.id)}>Xóa</Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(violation.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
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
