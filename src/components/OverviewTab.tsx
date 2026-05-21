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
        {/* Card: Kho đề thi */}
        <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
          {/* Top highlight bar */}
          <div className="absolute top-0 inset-x-0 h-[4px] bg-gradient-to-r from-blue-500 to-indigo-600" />
          
          <div className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">KHO ĐỀ THI</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight transition-transform group-hover:scale-105 duration-300">{stats.exams}</h3>
                <span className="text-xs font-medium text-slate-400"> đề</span>
              </div>
              <p className="text-xs text-slate-500">Tài nguyên lưu trữ trực tuyến</p>
            </div>
            
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:bg-blue-100/80 shadow-sm border border-blue-100/50">
              <FileText className="w-7 h-7 stroke-[2.25]" />
            </div>
          </div>
          
          {/* Decorative background circle */}
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-blue-500/5 rounded-full pointer-events-none" />
        </div>

        {/* Card: Lớp học */}
        <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
          {/* Top highlight bar */}
          <div className="absolute top-0 inset-x-0 h-[4px] bg-gradient-to-r from-emerald-500 to-teal-600" />
          
          <div className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">LỚP HỌC</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight transition-transform group-hover:scale-105 duration-300">{stats.classes}</h3>
                <span className="text-xs font-medium text-slate-400"> lớp</span>
              </div>
              <p className="text-xs text-slate-500">Đang hoạt động & giao đề</p>
            </div>
            
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-100/80 shadow-sm border border-emerald-100/50">
              <Users className="w-7 h-7 stroke-[2.25]" />
            </div>
          </div>
          
          {/* Decorative background circle */}
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-emerald-500/5 rounded-full pointer-events-none" />
        </div>

        {/* Card: Lượt thi */}
        <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
          {/* Top highlight bar */}
          <div className="absolute top-0 inset-x-0 h-[4px] bg-gradient-to-r from-purple-500 to-fuchsia-600" />
          
          <div className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">LƯỢT THI</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight transition-transform group-hover:scale-105 duration-300">{stats.submissions}</h3>
                <span className="text-xs font-medium text-slate-400"> lượt</span>
              </div>
              <p className="text-xs text-slate-500">Hoàn thành nộp bài làm</p>
            </div>
            
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:bg-purple-100/80 shadow-sm border border-purple-100/50">
              <CheckCircle className="w-7 h-7 stroke-[2.25]" />
            </div>
          </div>
          
          {/* Decorative background circle */}
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-purple-500/5 rounded-full pointer-events-none" />
        </div>
      </div>

      {/* Features */}
      <div className="pt-6">
        <h3 className="text-lg font-bold text-[#0d9388] text-center mb-6 uppercase tracking-wider">Các tính năng cơ bản</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-50/60 to-indigo-50/30 border-blue-100/80 shadow-sm h-full hover:shadow-md hover:border-blue-200/80 transition-all duration-300">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100/80 text-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-sm border border-blue-200/40">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-blue-900 mb-4 text-[15px] tracking-wide uppercase">QUẢN LÝ CHUNG</h4>
              <ul className="text-sm text-slate-700 space-y-3.5 text-left w-full pl-1">
                <li className="flex items-start gap-2.5">
                  <span className="text-blue-500 font-bold text-base leading-none select-none">•</span>
                  <span>Có 2 cấp độ phân quyền người dùng là giáo viên và học sinh rõ ràng.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-blue-500 font-bold text-base leading-none select-none">•</span>
                  <span>Học sinh làm bài nộp trực tiếp bằng tùy chọn đa dạng tài khoản học tập.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-blue-500 font-bold text-base leading-none select-none">•</span>
                  <span>Hỗ trợ làm bài tự do không cần đăng nhập nếu giáo viên mở cấu hình.</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50/60 to-teal-50/30 border-emerald-100/80 shadow-sm h-full hover:shadow-md hover:border-emerald-200/80 transition-all duration-300">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-100/80 text-emerald-600 rounded-xl flex items-center justify-center mb-4 shadow-sm border border-emerald-200/40">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-emerald-900 mb-4 text-[15px] tracking-wide uppercase">QUẢN LÝ ĐỀ THI</h4>
              <ul className="text-sm text-slate-700 space-y-3.5 text-left w-full pl-1">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold text-base leading-none select-none">•</span>
                  <span>Kết hợp trí tuệ nhân tạo AI tự động tạo đề từ bất kỳ nội dung bài học.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold text-base leading-none select-none">•</span>
                  <span>Import đề vô cùng nhanh chóng trực tiếp từ văn bản thô tiện lợi.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold text-base leading-none select-none">•</span>
                  <span>Tự do tùy chỉnh cấu hình đề, thời gian làm và chấm điểm chi tiết.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold text-base leading-none select-none">•</span>
                  <span>Mỗi đề thi được đóng gói chuyên nghiệp và chia sẻ link dễ dàng.</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50/60 to-fuchsia-50/30 border-purple-100/80 shadow-sm h-full hover:shadow-md hover:border-purple-200/80 transition-all duration-300">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-purple-100/80 text-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-sm border border-purple-200/40">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-purple-900 mb-4 text-[15px] tracking-wide uppercase">QUẢN LÝ KẾT QUẢ</h4>
              <ul className="text-sm text-slate-700 space-y-3.5 text-left w-full pl-1">
                <li className="flex items-start gap-2.5">
                  <span className="text-purple-500 font-bold text-base leading-none select-none">•</span>
                  <span>Tính điểm thông minh, tự động phân loại đúng sai theo giây cực kỳ chính xác.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-purple-500 font-bold text-base leading-none select-none">•</span>
                  <span>Theo dõi tiến độ, bảng tổng sắp thi đua học sinh (Leaderboard) trực quan.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-purple-500 font-bold text-base leading-none select-none">•</span>
                  <span>Lưu trữ lịch sử bài kiểm tra trọn đời, học sinh dễ dàng xem lại lỗi sai để ôn tập.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
