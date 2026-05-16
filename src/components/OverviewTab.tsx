import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Card, CardContent } from './ui/card';
import { User } from 'firebase/auth';
import { BookOpen, FileText, CheckCircle, Users, Activity, Calendar } from 'lucide-react';
import { Button } from './ui/button';

export default function OverviewTab() {
  const [stats, setStats] = useState({
    exams: 0,
    submissions: 0,
    classes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Fetch exams count
        const examsQuery = query(collection(db, 'exams'), where('ownerId', '==', user.uid));
        const examsSnap = await getCountFromServer(examsQuery);
        const examsCount = examsSnap.data().count;

        // Fetch submissions count
        const subQuery = query(collection(db, 'submissions'), where('teacherId', '==', user.uid));
        const subSnap = await getCountFromServer(subQuery);
        const submissionsCount = subSnap.data().count;

        // Fetch classes count
        const classQuery = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
        const classSnap = await getCountFromServer(classQuery);
        const classesCount = classSnap.data().count;

        setStats({
          exams: examsCount,
          submissions: submissionsCount,
          classes: classesCount,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#0d9388]/30 border-t-[#0d9388] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-medium mb-1">HỆ THỐNG QUẢN LÝ, TỔ CHỨC ÔN TẬP</h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-blue-100 mb-8">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> {today}
            </span>
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> Trạng thái: Hoạt động bình thường
            </span>
          </div>

          <p className="text-lg">Chào mừng <span className="font-bold text-yellow-300">GIÁO VIÊN</span> đã trở lại</p>
          <p className="text-blue-100 mt-2 max-w-xl">
            Bạn có <span className="font-bold text-white">{stats.exams}</span> đề thi đang lưu trữ trong kho dữ liệu.
          </p>
        </div>
        
        {/* Background icon */}
        <BookOpen className="absolute -bottom-10 -right-10 w-64 h-64 text-white/10 rotate-[-15deg] pointer-events-none" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">KHO ĐỀ THI</p>
              <h3 className="text-4xl font-extrabold text-slate-800">{stats.exams}</h3>
            </div>
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">LỚP HỌC</p>
              <h3 className="text-4xl font-extrabold text-slate-800">{stats.classes}</h3>
            </div>
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">LƯỢT THI</p>
              <h3 className="text-4xl font-extrabold text-slate-800">{stats.submissions}</h3>
            </div>
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-7 h-7" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <div className="pt-6">
        <h3 className="text-lg font-bold text-[#0d9388] text-center mb-6 uppercase tracking-wider">Các tính năng cơ bản</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-slate-200 shadow-sm h-full hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 mb-3 text-base">QUẢN LÍ CHUNG</h4>
              <ul className="text-sm text-slate-600 space-y-2 text-left w-full pl-6 list-disc">
                <li>Có 2 cấp độ: giáo viên/học sinh</li>
                <li>Làm bài bằng tùy chọn tài khoản</li>
                <li>Làm bài không cần đăng nhập (nếu mở)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm h-full hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 mb-3 text-base">QUẢN LÍ ĐỀ THI</h4>
              <ul className="text-sm text-slate-600 space-y-2 text-left w-full pl-6 list-disc">
                <li>Kết hợp AI tự động tạo từ nội dung</li>
                <li>Import đề nhanh từ văn bản</li>
                <li>Tùy chỉnh cấu hình, thời gian làm bài</li>
                <li>Mỗi đề có thể chia sẻ tiện lợi</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm h-full hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 mb-3 text-base">QUẢN LÍ KẾT QUẢ</h4>
              <ul className="text-sm text-slate-600 space-y-2 text-left w-full pl-6 list-disc">
                <li>Tính điểm nhanh chóng, tự động</li>
                <li>Theo dõi tiến độ, bảng xếp hạng</li>
                <li>Lưu trữ lịch sử, học sinh xem lại bài</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
