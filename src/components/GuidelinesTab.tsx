import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BookOpen, Check, X, FileText, ChevronRight, AlertCircle, Type, LayoutList, AlignLeft } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export default function GuidelinesTab() {
  const [activeTab, setActiveTab] = useState<'rules' | 'template'>('template');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Mẫu Đề Tiếng Anh Chuẩn</h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Hướng dẫn cách soạn thảo file WORD / PDF để AI có thể nhận diện và bóc tách câu hỏi chính xác 100%. 
          Tuân thủ mẫu này giúp bạn giảm thiểu đến 90% thời gian phải chỉnh sửa lại lỗi.
        </p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="bg-slate-100 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setActiveTab('template')}
            className={cn(
              "px-6 py-2.5 rounded-md text-sm font-semibold transition-all duration-200",
              activeTab === 'template' ? "bg-white shadow-sm text-blue-700" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> Bản mẫu trực quan
            </div>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={cn(
              "px-6 py-2.5 rounded-md text-sm font-semibold transition-all duration-200",
              activeTab === 'rules' ? "bg-white shadow-sm text-blue-700" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Nguyên tắc soạn thảo
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'template' && (
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <LayoutList className="w-5 h-5 text-blue-600" />
              Lưu ý từng phần
            </h3>
            
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-4">
                <p className="font-semibold text-sm mb-1">1. Multiple Choice (Trắc nghiệm)</p>
                <p className="text-sm text-slate-600">Đánh số "Question X:" rõ ràng. Các đáp án A, B, C, D nên xuống dòng.</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <CardContent className="p-4">
                <p className="font-semibold text-sm mb-1">2. Reading (Đọc hiểu)</p>
                <p className="text-sm text-slate-600">Luôn có dòng chỉ dẫn "Read the passage..." ở ngay trên đầu đoạn văn.</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500 shadow-sm">
              <CardContent className="p-4">
                <p className="font-semibold text-sm mb-1">3. True/False</p>
                <p className="text-sm text-slate-600">Cũng phải được đánh số câu là "Question X:", nội dung chỉ chứa một nhận định.</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500 shadow-sm">
              <CardContent className="p-4">
                <p className="font-semibold text-sm mb-1">4. Writing (Viết / Điền từ)</p>
                <p className="text-sm text-slate-600">Những câu nối từ, chia động từ (fill the blanks) nên dùng "___" để tạo chỗ trống trơn tru.</p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 relative">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-300 to-indigo-300 rounded-2xl blur opacity-20"></div>
            <Card className="relative bg-white shadow-xl min-h-[800px] rounded-xl overflow-hidden border-slate-200">
              <div className="bg-slate-100 py-2 px-4 border-b border-slate-200 text-center font-mono text-xs text-slate-500 tracking-widest">
                KIEM_TRA_45P_TA9.PDF
              </div>
              <CardContent className="p-8 sm:p-12 text-slate-900 font-serif leading-relaxed text-sm sm:text-base selection:bg-blue-100 space-y-8">
                
                <div className="text-center font-bold text-lg mb-8 uppercase tracking-wide">
                  ENGLISH TEST - GRADE 9<br/>
                  <span className="text-sm font-normal normal-case">Time allowed: 45 minutes</span>
                </div>

                <div className="relative group">
                  <div className="absolute -left-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center h-full">
                    <span className="text-[10px] font-sans font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded w-20 text-center shadow-sm whitespace-nowrap -ml-8">Chuẩn xác</span>
                  </div>
                  <h4 className="font-bold uppercase">I. PRONUNCIATION</h4>
                  <p className="italic text-sm mb-3 text-slate-700">Choose the word whose underlined part is pronounced differently from the others.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="font-bold mr-1">Question 1:</span> Choose the pronounced difference.
                      <div className="ml-4 mt-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
                        <div>A. <span className="underline">a</span>rt</div>
                        <div>B. c<span className="underline">a</span>rt</div>
                        <div>C. m<span className="underline">a</span>rt</div>
                        <div>D. pl<span className="underline">a</span>y</div>
                      </div>
                    </div>
                    <div>
                      <span className="font-bold mr-1">Question 2:</span> Choose the pronounced difference.
                      <div className="ml-4 mt-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
                        <div>A. look<span className="underline">ed</span></div>
                        <div>B. watch<span className="underline">ed</span></div>
                        <div>C. stopp<span className="underline">ed</span></div>
                        <div>D. carri<span className="underline">ed</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200 border-dashed" />

                <div className="relative group">
                  <h4 className="font-bold uppercase">II. READING</h4>
                  <p className="italic text-sm mb-3">Read the following passage and decide whether the statements are True or False.</p>
                  
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-md mb-4 text-justify">
                    Tokyo is the capital of Japan and one of the most populated cities in the world. 
                    It is a bustling metropolis that mixes the ultramodern and the traditional, from
                    neon-lit skyscrapers to historic temples. The Meiji Shinto Shrine is known for 
                    its towering gate and surrounding woods...
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="font-bold mr-1">Question 3:</span> Tokyo is only known for traditional temples.
                    </div>
                    <div>
                      <span className="font-bold mr-1">Question 4:</span> The Meiji Shinto Shrine is surrounded by woods.
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200 border-dashed" />

                <div className="relative group">
                  <h4 className="font-bold uppercase">III. VOCABULARY & GRAMMAR</h4>
                  <p className="italic text-sm mb-3">Choose the best answer A, B, C or D to complete the sentences.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="font-bold mr-1">Question 5:</span> Nam is very _____ in playing soccer with his friends.
                      <div className="ml-4 mt-1 space-y-1">
                        <div>A. interest</div>
                        <div>B. interesting</div>
                        <div>C. interested</div>
                        <div>D. to interest</div>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200 border-dashed" />

                <div className="relative group pb-8">
                  <h4 className="font-bold uppercase">IV. WRITING</h4>
                  <p className="italic text-sm mb-3">Rewrite the sentences without changing their meaning.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="font-bold mr-1">Question 6:</span> "Why don't we go to the cinema?", he said.<br/>
                      He suggested ____________________________________.
                    </div>
                    <div>
                      <span className="font-bold mr-1">Question 7:</span> I don't have enough money to buy that car.<br/>
                      I wish _________________________________________.
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-green-200 col-span-full md:col-span-1 shadow-sm">
            <CardHeader className="bg-green-50 pb-4 border-b border-green-100">
              <CardTitle className="flex items-center gap-2 text-green-800 text-lg">
                <Check className="w-5 h-5" /> NÊN LÀM
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <p className="font-semibold text-slate-900 text-base mb-2 flex items-center gap-2"><Type className="w-4 h-4 text-slate-500" /> Trắc nghiệm dọc xuống</p>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm font-mono text-slate-700 shadow-inner">
                  Question 1: She _____ to school.<br />
                  A. go<br />
                  B. goes<br />
                  C. went<br />
                  D. going
                </div>
                <p className="text-xs text-slate-500 mt-2">Cho phép AI định diện chính xác từng ranh giới của đáp án, tránh bị dính chữ chữ khi dùng nút Tab giãn cách.</p>
              </div>
              
              <div>
                <p className="font-semibold text-slate-900 text-base mb-2 flex items-center gap-2"><AlignLeft className="w-4 h-4 text-slate-500" /> Chỉ dẫn đề bài (Instruction) nằm ngay trên câu hỏi</p>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm font-mono text-slate-700 shadow-inner">
                  Read the following passage and answer...<br /><br />
                  Da Lat is... [Đoạn văn]<br /><br />
                  Question 15: Where is Da Lat?
                </div>
                <p className="text-xs text-slate-500 mt-2">Dòng instruction cần đứng độc lập, không trộn lẫn vào đoạn văn hay vào thẳng câu hỏi.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 col-span-full md:col-span-1 shadow-sm">
            <CardHeader className="bg-red-50 pb-4 border-b border-red-100">
              <CardTitle className="flex items-center gap-2 text-red-800 text-lg">
                <X className="w-5 h-5" /> KHÔNG NÊN LÀM
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <p className="font-semibold text-slate-900 text-base mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" /> Không chia cột đáp án nằm ngang quá rối</p>
                <div className="bg-red-50/50 p-4 rounded-lg border border-red-100 text-sm font-mono text-slate-700 opacity-80">
                  Q1: ...  A. go   B. goes   C. went   D. going<br />
                  Q2: ...  A...     B...     C...     D...
                </div>
                <p className="text-xs text-red-600 mt-2">Hệ thống xử lý PDF thường quét theo từng dòng ngang (line by line). Xếp trắc nghiệm hàng ngang bằng phím Space/Tab rất dễ làm lẫn lộn đáp án của câu này sang câu khác.</p>
              </div>
              
              <div>
                <p className="font-semibold text-slate-900 text-base mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" /> Không dùng ảnh chụp mờ (Scan PDF kém)</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded border border-slate-200">
                  Nếu file PDF được tạo bằng cách dùng điện thoại chụp lật từng trang giấy, chữ sẽ bị xiên vẹo, bóng đen che khuất. Chức năng nhận dạng ký tự (OCR) sẽ sinh ra các lỗi sai chính tả như "clog" thành "dog". Tốt nhất hãy dùng file xuất từ file Word gốc.
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-slate-900 text-base mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" /> Không ngắt trang lơ lửng</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded border border-slate-200">
                  Một nửa câu hỏi nằm cuối trang 1, các đáp án A B C D lại trôi sang đầu trang 2. Xin hãy Enter để cho câu hỏi nảy xuống trọn vẹn ở trang sau.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

