import { LogIn, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 font-sans bg-slate-100">
      <div className="w-full max-w-4xl bg-white rounded-xl md:rounded-2xl shadow-xl border border-slate-200/60 flex flex-col md:flex-row overflow-hidden md:min-h-[500px] animate-in fade-in duration-500">
        
        {/* Left side: Intro/Mockup */}
        <div className="hidden md:flex flex-1 bg-[#0d9388] relative flex-col items-center justify-center p-8 overflow-hidden">
          <div className="relative z-10 w-full max-w-sm transform transition-all duration-700 hover:scale-[1.01]">
            {/* Mockup Frame */}
            <div className="bg-white rounded-xl shadow-lg p-3 border-[6px] border-white/20 aspect-[16/10] overflow-hidden relative">
              <div className="absolute inset-0 bg-slate-50 flex">
                {/* Sidebar Mockup */}
                <div className="w-1/4 h-full bg-[#0d9388] p-3 space-y-3">
                  <div className="h-3 w-3/4 bg-white/20 rounded-full" />
                  <div className="h-3 w-full bg-white/20 rounded-full" />
                  <div className="h-3 w-2/3 bg-white/20 rounded-full" />
                  <div className="h-3 w-1/2 bg-white/20 rounded-full" />
                  <div className="h-3 w-3/4 bg-white/20 rounded-full" />
                </div>
                {/* Content Mockup */}
                <div className="flex-1 p-4 space-y-4">
                  <div className="flex justify-between items-center mb-6">
                    <div className="h-5 w-24 bg-slate-200 rounded-lg" />
                    <div className="h-6 w-6 bg-slate-200 rounded-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-16 bg-white border border-slate-100 rounded-lg shadow-sm p-2 flex flex-col justify-between">
                        <div className="h-2 w-1/2 bg-slate-100 rounded-full" />
                        <div className="h-5 w-5 bg-slate-50 rounded mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Gloss Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
            </div>
            
            {/* Floating dots indicator */}
            <div className="mt-6 flex justify-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-white" />
              <div className="w-2 h-2 rounded-full bg-white/40" />
              <div className="w-2 h-2 rounded-full bg-white/40" />
            </div>
            
            <div className="mt-4 text-white text-2xl font-extrabold tracking-tight">
              Chức năng
            </div>
          </div>
          
          {/* Decorative background shapes */}
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-black/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Right side: Login Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 text-center">
          <div className="w-full max-w-xs">
            {/* Logo Area */}
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-4 uppercase italic">
                Global Success Tests HUB
              </h1>
              <div className="relative inline-block mt-1">
                <div className="bg-[#0b867c] text-white p-3.5 rounded-full inline-flex items-center justify-center shadow-md ring-6 ring-[#0fa599]/10 mb-1">
                  <CheckCircle2 className="w-10 h-10" strokeWidth={2.5} />
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#0b867c] text-white px-2.5 py-0.5 rounded-md font-bold text-[9px] whitespace-nowrap tracking-wider uppercase">
                  Test Online
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-lg font-extrabold text-[#0d9388] leading-snug">
                Tạo đề, tạo lớp học, giao đề<br />cho học sinh
              </h2>
            </div>

            {/* Login Button */}
            <Button 
              onClick={onLogin}
              size="lg"
              className="w-full py-5 px-4 text-sm font-bold bg-[#f1f3f5] hover:bg-[#e9ecef] text-slate-700 border border-slate-200 shadow-sm rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col items-center gap-1.5">
              <div className="text-slate-400 text-xs font-semibold tracking-wide uppercase">
                Một sản phẩm của @globalsuccessfiles.com
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
