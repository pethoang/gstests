import { Mail, Phone, Facebook, X, MessageSquare, ShieldCheck, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0d9388]/10 flex items-center justify-center text-[#0d9388]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Thông tin hỗ trợ</h3>
              <p className="text-xs text-slate-500">Liên hệ hỗ trợ kỹ thuật và học tập</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="text-center pb-2">
            <h4 className="font-extrabold text-slate-800 text-base">THẦY NGUYỄN HOÀNG (ÔNG GIÁO)</h4>
            <p className="text-xs text-slate-500 mt-1">Sẵn sàng đồng hành cùng bạn trên chặng đường chinh phục kiến thức</p>
          </div>

          <div className="space-y-3">
            {/* Zalo / Phone */}
            <div className="flex items-center justify-between p-3.5 bg-sky-50/50 hover:bg-sky-50 border border-sky-100/70 rounded-xl transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-sky-800 uppercase tracking-wider">Phone / Zalo</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">0913.885.221</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 rounded-lg text-sky-600 hover:bg-sky-100"
                onClick={() => handleCopy('0913.885.221', 'phone')}
              >
                {copiedText === 'phone' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/70 rounded-xl transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Email liên hệ</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 select-all">petnguyenhoang@gmail.com</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:bg-emerald-100"
                onClick={() => handleCopy('petnguyenhoang@gmail.com', 'email')}
              >
                {copiedText === 'email' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>

            {/* Facebook */}
            <a 
              href="https://www.facebook.com/petnguyenmhoang"
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 bg-blue-50/50 hover:bg-blue-100/60 border border-blue-100/70 rounded-xl transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Facebook className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Facebook</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">Nguyễn Hoàng (Ông Giáo)</p>
                </div>
              </div>
              <span className="text-xs font-medium text-blue-600 group-hover:underline pr-2">Ghé thăm</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <Button 
            onClick={onClose} 
            className="bg-[#0d9388] hover:bg-[#0b7a71] text-white px-5 rounded-lg font-medium text-sm"
          >
            Đóng lại
          </Button>
        </div>

      </div>
    </div>
  );
}
