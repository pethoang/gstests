import { Medal, Trophy, Award, Lock, Star } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface StudentBadgesTabProps {
  badgeCount: number;
}

// Helper component for the custom badge icon matching the user's image
const CustomBadgeIcon = ({ className = "w-6 h-6", starClassName = "w-[40%] h-[40%]" }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <Medal className="w-full h-full text-indigo-500" />
    <div className="absolute inset-0 flex items-center justify-center translate-y-1">
      <Star className={`${starClassName} text-white fill-white`} />
    </div>
  </div>
);

export default function StudentBadgesTab({ badgeCount }: StudentBadgesTabProps) {
  // Define badge tiers
  const tiers = [
    { name: 'Hạng Vàng', icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50', borderColor: 'border-yellow-200', minBadge: 10, description: 'Dành cho những chiến binh xuất sắc nhất (10+ huy hiệu)' },
    { name: 'Hạng Bạc', icon: Award, color: 'text-slate-500', bg: 'bg-slate-50', borderColor: 'border-slate-200', minBadge: 5, description: 'Sự nỗ lực không ngừng nghỉ (5-9 huy hiệu)' },
    { name: 'Hạng Đồng', icon: Medal, color: 'text-orange-500', bg: 'bg-orange-50', borderColor: 'border-orange-200', minBadge: 1, description: 'Bước đầu chinh phục thử thách (1-4 huy hiệu)' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Bộ Sưu Tập Huy Hiệu</h3>
        <p className="text-slate-500">Hoàn thành bài tập với kết quả tốt để mở khóa thêm nhiều huy hiệu quý giá.</p>
        <div className="pt-4 flex justify-center">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl shadow-sm">
                <CustomBadgeIcon className="w-6 h-6" />
                <span className="text-lg font-black text-indigo-700">{badgeCount} huy hiệu đã thu thập</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier, idx) => {
          const isUnlocked = badgeCount >= tier.minBadge;
          const TierIcon = tier.icon;
          
          return (
            <Card key={idx} className={`relative overflow-hidden border-2 transition-all duration-500 ${isUnlocked ? `${tier.bg} ${tier.borderColor} shadow-lg shadow-${tier.color.split('-')[1]}-500/10` : 'bg-slate-50 border-slate-100 opacity-60'}`}>
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center relative ${isUnlocked ? 'bg-white shadow-xl' : 'bg-slate-100 grayscale'}`}>
                  {isUnlocked ? (
                    <>
                      {idx === 2 ? (
                         <CustomBadgeIcon className="w-14 h-14" starClassName="w-6 h-6" />
                      ) : (
                        <TierIcon className={`w-12 h-12 ${tier.color}`} />
                      )}
                      <div className="absolute -top-1 -right-1">
                        <Star className="w-6 h-6 text-yellow-400 fill-yellow-400 animate-pulse" />
                      </div>
                    </>
                  ) : (
                    <Lock className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                
                <div className="space-y-2">
                  <h4 className={`text-xl font-black tracking-tight ${isUnlocked ? 'text-slate-800' : 'text-slate-400'}`}>
                    {tier.name}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed min-h-[32px]">
                    {tier.description}
                  </p>
                </div>

                <div className="w-full pt-4">
                   {isUnlocked ? (
                     <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${tier.color.replace('text', 'bg').replace('500', '100')} ${tier.color}`}>
                        Đã mở khóa
                     </div>
                   ) : (
                     <div className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-200 text-slate-400">
                        Cần thêm {tier.minBadge - badgeCount} huy hiệu
                     </div>
                   )}
                </div>
              </CardContent>
              
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-10" />
            </Card>
          );
        })}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
        <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CustomBadgeIcon className="w-5 h-5" />
            Chi tiết huy hiệu đạt được
        </h4>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-4">
            {Array.from({ length: Math.max(badgeCount + 1, 20) }).map((_, i) => (
                <div key={i} className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-500 ${i < badgeCount ? 'bg-indigo-50 text-indigo-500 shadow-inner' : 'bg-slate-50 text-slate-200 border-2 border-dashed border-slate-100'}`}>
                    {i < badgeCount ? (
                        <CustomBadgeIcon className="w-8 h-8" starClassName="w-3 h-3" />
                    ) : (
                        <span className="text-xs font-bold">{i + 1}</span>
                    )}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
