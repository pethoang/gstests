import { Trophy } from 'lucide-react';
import { User } from 'firebase/auth';

interface LeaderboardEntry {
  id: string;
  studentId: string;
  studentName: string;
  month: string;
  totalScore: number;
  submissionCount: number;
}

interface StudentLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  user: User;
  myRank: number | null;
}

export default function StudentLeaderboard({ leaderboard, user, myRank }: StudentLeaderboardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden sticky top-24">
      <div className="bg-gradient-to-br from-amber-500 to-orange-400 p-6 text-white text-center relative overflow-hidden">
        <Trophy className="w-12 h-12 mx-auto mb-3 text-yellow-200 opacity-90 shadow-sm" />
        <h2 className="text-xl font-black mb-1 tracking-tight">Vinh Danh Top 10</h2>
        <p className="text-amber-50 text-xs font-medium opacity-90">Tháng {new Date().getMonth() + 1}</p>
        
        {myRank !== null && (
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full border border-white/30 backdrop-blur-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-50">Hạng của bạn</span>
            <span className="font-black text-lg text-yellow-100">#{myRank}</span>
          </div>
        )}
        
        {/* Decorative elements */}
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
      </div>
      
      <div className="p-0 max-h-[500px] overflow-y-auto custom-scrollbar">
        {leaderboard.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm italic font-medium">
             Chưa có dữ liệu vinh danh.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
             {leaderboard.slice(0, 10).map((entry, index) => {
               const isMe = entry.studentId === user.uid;
               return (
                 <div 
                    key={entry.id} 
                    className={`flex items-center p-4 transition-colors ${isMe ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}
                 >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                      index === 0 ? 'bg-yellow-100 text-yellow-600 ring-2 ring-yellow-400/20' :
                      index === 1 ? 'bg-slate-100 text-slate-500 ring-2 ring-slate-400/20' :
                      index === 2 ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-400/20' :
                      'text-slate-400'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="ml-3 flex-1 min-w-0">
                       <div className="flex items-center gap-1.5">
                         <div className="font-bold text-slate-800 text-sm truncate">
                            {entry.studentName}
                         </div>
                         {isMe && <span className="text-[8px] bg-[#0d9388] text-white px-1 py-0.5 rounded-md uppercase font-black tracking-wider shrink-0">Bạn</span>}
                       </div>
                       <div className="text-[10px] text-slate-400 font-bold">
                          {entry.submissionCount} bài tập
                       </div>
                    </div>
                    
                    <div className="text-right ml-2 shrink-0">
                       <div className="font-black text-sm text-slate-800 leading-none">{entry.totalScore.toFixed(0)}</div>
                       <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">điểm</div>
                    </div>
                 </div>
               );
             })}
          </div>
        )}
      </div>
      
      <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
         <p className="text-[10px] text-slate-500 font-bold leading-tight">
            Hoàn thành nhiều bài thi để vươn lên dẫn đầu!
         </p>
      </div>
    </div>
  );
}
