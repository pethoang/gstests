import { LogIn, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans overflow-hidden bg-white">
      {/* Left side: Intro/Mockup */}
      <div className="hidden md:flex flex-1 bg-[#0d9388] relative flex-col items-center justify-center p-12 overflow-hidden">
        <div className="relative z-10 w-full max-w-2xl transform transition-all duration-700 hover:scale-[1.02]">
          {/* Mockup Frame */}
          <div className="bg-white rounded-[2rem] shadow-2xl p-4 border-[8px] border-white/20 aspect-[16/10] overflow-hidden relative">
            <div className="absolute inset-0 bg-slate-50 flex">
              {/* Sidebar Mockup */}
              <div className="w-1/4 h-full bg-[#0d9388] p-4 space-y-4">
                <div className="h-4 w-3/4 bg-white/20 rounded-full" />
                <div className="h-4 w-full bg-white/20 rounded-full" />
                <div className="h-4 w-2/3 bg-white/20 rounded-full" />
                <div className="h-4 w-1/2 bg-white/20 rounded-full" />
                <div className="h-4 w-3/4 bg-white/20 rounded-full" />
              </div>
              {/* Content Mockup */}
              <div className="flex-1 p-6 space-y-6">
                <div className="flex justify-between items-center mb-8">
                  <div className="h-6 w-32 bg-slate-200 rounded-lg" />
                  <div className="h-8 w-8 bg-slate-200 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-24 bg-white border border-slate-100 rounded-xl shadow-sm p-3 flex flex-col justify-between">
                      <div className="h-3 w-1/2 bg-slate-100 rounded-full" />
                      <div className="h-8 w-8 bg-slate-50 rounded-lg mx-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Gloss Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
          </div>
          
          {/* Floating dots indicator */}
          <div className="mt-12 flex justify-center gap-3">
            <div className="w-5 h-5 rounded-full bg-white shadow-inner" />
            <div className="w-5 h-5 rounded-full bg-white/40 shadow-inner" />
            <div className="w-5 h-5 rounded-full bg-white/40 shadow-inner" />
          </div>
          
          <div className="mt-8 text-white text-3xl font-bold tracking-tight">
            Chức năng
          </div>
        </div>
        
        {/* Decorative background shapes */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-black/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 text-center animate-in fade-in slide-in-from-right-8 duration-700">
        <div className="w-full max-w-md">
          {/* Logo Area */}
          <div className="mb-12">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 italic">
              GLobal Success Tests LMS
            </h1>
            <div className="relative inline-block mt-2">
              <div className="bg-[#0d9388] text-white p-6 rounded-full inline-flex items-center justify-center shadow-xl ring-8 ring-[#0d9388]/10 mb-2">
                <CheckCircle2 className="w-16 h-16" strokeWidth={2.5} />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#0d9388] text-white px-4 py-1 rounded-md font-bold text-xs whitespace-nowrap tracking-wider uppercase">
                Test Online
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-12 space-y-2">
            <h2 className="text-3xl font-extrabold text-[#0d9388] leading-tight max-w-[320px] mx-auto">
              Tạo đề, tạo lớp học,<br />giao đề cho học sinh
            </h2>
          </div>

          {/* Login Button */}
          <Button 
            onClick={onLogin}
            size="lg"
            className="w-full py-7 px-8 text-lg font-bold bg-[#f1f3f5] hover:bg-[#e9ecef] text-slate-700 border border-slate-200 shadow-sm rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Đăng nhập với Google
          </Button>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col items-center gap-2">
             <div className="text-slate-400 text-sm italic font-medium">
                Một sản phẩm của @globalsuccessfiles.com
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
