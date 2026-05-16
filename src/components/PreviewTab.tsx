import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Question } from '../types';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Copy, CheckCircle, Loader2, LayoutGrid, X, Clock } from 'lucide-react';
import { renderFormattedText } from '../lib/formatter';
import { cn } from '../lib/utils';

interface PreviewTabProps {
  questions: Question[];
  title?: string;
  timeLimit?: number;
  publishedLink?: string;
  isStudentView?: boolean;
  isSubmitting?: boolean;
  onSubmit?: (answers: Record<string, string | boolean>) => void;
  initialAnswers?: Record<string, string | boolean>;
  showCorrectAnswers?: boolean;
}

export default function PreviewTab({ 
  questions, 
  title = "Bài kiểm tra Tiếng Anh", 
  timeLimit = 45, 
  publishedLink, 
  isStudentView = false, 
  isSubmitting = false,
  onSubmit,
  initialAnswers = {},
  showCorrectAnswers = false
}: PreviewTabProps) {
  const [answers, setAnswers] = useState<Record<string, string | boolean>>(initialAnswers);
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(isStudentView && timeLimit > 0 && !showCorrectAnswers ? timeLimit * 60 : null);

  const shuffledOptionsMap = useMemo(() => {
    const map: Record<string, { opt: string; letter: string }[]> = {};
    questions.forEach((q) => {
      if (q.type === 'multiple_choice' && q.options) {
        const optionsWithLetters = q.options.map((opt, i) => ({
          opt,
          letter: ['A', 'B', 'C', 'D'][i] || String.fromCharCode(65 + i)
        }));
        
        // Fisher-Yates shuffle
        for (let i = optionsWithLetters.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [optionsWithLetters[i], optionsWithLetters[j]] = [optionsWithLetters[j], optionsWithLetters[i]];
        }
        map[q.id] = optionsWithLetters;
      }
    });
    return map;
  }, [questions]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isSubmitting || showCorrectAnswers) return;
    
    const intervalId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(intervalId);
          if (onSubmit) {
            onSubmit(answers);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [timeLeft, isSubmitting, showCorrectAnswers, onSubmit, answers]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Sort questions by order first to ensure PDF sequence
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  
  // Group questions by section based on sorted order
  const sections = Array.from(new Set(sortedQuestions.map(q => q.section)));

  const handleCopyLink = () => {
    if (publishedLink) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(publishedLink).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
          // Silent fallback, the input is already rendered in the UI
        });
      }
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(answers);
    }
  };

  const scrollToQuestion = (id: string) => {
    const el = document.getElementById(`question-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setIsMenuOpen(false);
    }
  };

  const isQuestionAnswered = (qId: string) => {
    const ans = answers[qId];
    return ans !== undefined && ans !== '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {publishedLink && !isStudentView && (
        <Card className="border-green-200 bg-green-50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" /> 
                  Đã tạo bài làm thành công!
                </h3>
                <p className="text-sm text-green-700 mt-1">Gửi đường link sau cho học sinh để làm bài:</p>
                <div className="flex mt-3 items-center">
                  <Input readOnly value={publishedLink} className="bg-white rounded-r-none focus-visible:ring-0" />
                  <Button onClick={handleCopyLink} className="rounded-l-none bg-green-600 hover:bg-green-700">
                    {copied ? 'Đã copy' : <><Copy className="w-4 h-4 mr-2" /> Sao chép</>}
                  </Button>
                </div>
                <p className="text-xs text-amber-700 mt-3 bg-amber-50 p-2 rounded border border-amber-200">
                  * <b>LƯU Ý QUAN TRỌNG:</b> Để học sinh có thể mở được link mà không bị lỗi "Page not found", bạn phải bật tính năng <b>Share (Chia sẻ)</b> ở góc trên cùng bên phải cửa sổ AI Studio. 
                  (Tuyệt đối không copy đường link trên thanh địa chỉ của trình duyệt)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-white min-h-[800px] border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* EXAM INFO BLOCK */}
        <div className={cn(
          "p-6 text-center border-b border-slate-100",
          isStudentView ? "bg-white" : "bg-[#0d9388] text-white"
        )}>
          <h1 className={cn("text-2xl md:text-3xl font-bold mb-3", isStudentView ? "text-slate-900" : "text-white")}>
            {title}
          </h1>
          
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-4 text-sm md:text-base font-medium">
            <div className={isStudentView ? "text-slate-600 font-bold" : "text-white/90"}>
              Thời gian làm bài: <span className={isStudentView ? "text-slate-900" : "text-white"}>
                {timeLimit > 0 ? `${timeLimit} phút` : 'Không giới hạn'}
              </span>
            </div>
            {isStudentView && (
              <div className="text-slate-600 font-bold">
                Bắt đầu: <span className="text-slate-900">{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} {new Date().toLocaleDateString('vi-VN')}</span>
              </div>
            )}
            {!isStudentView && (
               <div className="bg-white/20 px-3 py-1 rounded-full">
                 Tổng điểm: {questions.reduce((sum, q) => sum + q.points, 0)}
               </div>
            )}
          </div>
          
          {!isStudentView && (
            <p className="opacity-90 mt-4 max-w-lg mx-auto">Học sinh làm bài, chọn đáp án và ấn Nộp bài ở cuối trang.</p>
          )}
        </div>

      <div className="p-6 sm:p-10 space-y-10">
        {sections.map((section, sIndex) => {
          const sectionQuestions = sortedQuestions.filter(q => q.section === section);
          
          // Group consecutive questions with same passage and instructions
          const groups: { passage?: string; instructions?: string; questions: Question[] }[] = [];
          
          sectionQuestions.forEach(q => {
            const lastGroup = groups[groups.length - 1];
            const currentPassage = q.passage?.trim();
            const currentInstructions = q.instructions?.trim();
            const lastPassage = lastGroup?.passage?.trim();
            const lastInstructions = lastGroup?.instructions?.trim();

            if (lastGroup && lastPassage === currentPassage && lastInstructions === currentInstructions) {
              lastGroup.questions.push(q);
            } else {
              groups.push({
                passage: q.passage,
                instructions: q.instructions,
                questions: [q]
              });
            }
          });

          return (
            <div key={section} className="space-y-8">
              <div className="border-b-2 border-slate-900 pb-2">
                <h3 className="text-xl font-bold font-serif">Part {sIndex + 1}: {section}</h3>
              </div>

              {groups.map((group, gIndex) => (
                <div key={`${section}-group-${gIndex}`} className="space-y-6 bg-white/50 p-0 rounded-xl">
                  {group.instructions && (
                    <div className="italic text-sm text-slate-700 font-medium mb-2 px-1">
                      {renderFormattedText(group.instructions)}
                    </div>
                  )}
                  
                  {group.passage && (
                    <div className="bg-slate-50/80 p-5 sm:p-7 border border-slate-200 rounded-2xl text-slate-800 leading-relaxed mb-8 text-base sm:text-lg sm:leading-8 md:text-[1.125rem] whitespace-pre-line shadow-sm">
                      {renderFormattedText(group.passage)}
                    </div>
                  )}

                  <div className="space-y-8">
                    {group.questions.map((q) => (
                      <div key={q.id} id={`question-${q.id}`} className="space-y-4 scroll-m-24">
                        <div className="text-slate-900 leading-relaxed">
                          <span className="font-bold mr-2">Question {q.order}.</span>
                          <span className="text-base">{renderFormattedText(q.content)}</span>
                          <span className="ml-2 text-xs text-slate-400 whitespace-nowrap">
                            [{q.points} pt{q.points !== 1 ? 's' : ''}]
                          </span>
                        </div>
                        
                        <div className="pl-0 sm:pl-4 space-y-4">
                          {q.type === 'multiple_choice' && q.options && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(shuffledOptionsMap[q.id] || []).map(({ opt, letter }, i) => {
                                const isSelected = answers[q.id] === letter;
                                const isCorrect = String(q.correctAnswer) === letter;
                                
                                let borderClass = 'border-slate-200 hover:border-blue-300 hover:bg-slate-50';
                                if (showCorrectAnswers) {
                                  if (isCorrect) borderClass = 'border-green-500 bg-green-50 ring-1 ring-green-500';
                                  else if (isSelected) borderClass = 'border-red-500 bg-red-50 ring-1 ring-red-500';
                                  else borderClass = 'border-slate-200 opacity-50';
                                } else if (isSelected) {
                                  borderClass = 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-sm';
                                }

                                return (
                                  <label 
                                    key={i} 
                                    className={`flex items-start p-3 sm:p-4 border rounded-xl transition-all duration-200 ${showCorrectAnswers ? 'cursor-default' : 'cursor-pointer'} ${borderClass}`}
                                  >
                                    <div className="flex items-center h-5">
                                      <input 
                                        type="radio" 
                                        name={q.id} 
                                        value={letter} 
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-600 shrink-0 mt-0.5"
                                        onChange={() => !showCorrectAnswers && setAnswers({...answers, [q.id]: letter})}
                                        checked={isSelected}
                                        disabled={showCorrectAnswers}
                                      />
                                    </div>
                                    <span className="ml-3 text-slate-700 leading-tight">{renderFormattedText(opt)}</span>
                                  </label>
                                )
                              })}
                            </div>
                          )}

                          {q.type === 'true_false' && (
                            <div className="flex flex-wrap gap-4">
                              {['True', 'False'].map((label) => {
                                const val = label === 'True';
                                const isSelected = answers[q.id] === val;
                                const isCorrect = q.correctAnswer === val || String(q.correctAnswer).toLowerCase() === label.toLowerCase();
                                
                                let borderClass = 'border-slate-200 hover:border-blue-300 hover:bg-slate-50';
                                if (showCorrectAnswers) {
                                  if (isCorrect) borderClass = 'border-green-500 bg-green-50 ring-1 ring-green-500';
                                  else if (isSelected) borderClass = 'border-red-500 bg-red-50 ring-1 ring-red-500';
                                  else borderClass = 'border-slate-200 opacity-50';
                                } else if (isSelected) {
                                  borderClass = 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-sm';
                                }

                                return (
                                  <label key={label} className={`flex items-center px-6 py-3 border rounded-xl transition-all duration-200 ${showCorrectAnswers ? 'cursor-default' : 'cursor-pointer'} ${borderClass}`}>
                                    <input 
                                      type="radio" 
                                      name={q.id} 
                                      className="w-4 h-4 text-blue-600 focus:ring-blue-600 mr-3"
                                      onChange={() => !showCorrectAnswers && setAnswers({...answers, [q.id]: val})}
                                      checked={isSelected}
                                      disabled={showCorrectAnswers}
                                    />
                                    <span className="font-medium text-slate-700">{label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {q.type === 'fill_blank' && (
                            <div>
                              <Input 
                                placeholder="Your answer..." 
                                className={`w-full sm:max-w-md bg-white transition-shadow focus-visible:ring-blue-500 ${showCorrectAnswers ? (String(answers[q.id] || '').trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase() ? 'border-green-500 text-green-700 focus-visible:ring-green-500' : 'border-red-500 text-red-700 focus-visible:ring-red-500') : ''}`}
                                onChange={(e) => !showCorrectAnswers && setAnswers({...answers, [q.id]: e.target.value})}
                                value={answers[q.id] as string || ''}
                                readOnly={showCorrectAnswers}
                              />
                              {showCorrectAnswers && String(answers[q.id] || '').trim().toLowerCase() !== String(q.correctAnswer || '').trim().toLowerCase() && (
                                <div className="mt-2 text-sm text-green-600 font-medium">
                                  Đáp án đúng: {String(q.correctAnswer)}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {q.type === 'short_answer' && (
                            <div>
                              <Input 
                                placeholder="Type your answer here..." 
                                className={`w-full bg-white transition-shadow focus-visible:ring-blue-500 ${showCorrectAnswers ? (String(answers[q.id] || '').trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase() ? 'border-green-500 text-green-700 focus-visible:ring-green-500' : 'border-red-500 text-red-700 focus-visible:ring-red-500') : ''}`}
                                onChange={(e) => !showCorrectAnswers && setAnswers({...answers, [q.id]: e.target.value})}
                                value={answers[q.id] as string || ''}
                                readOnly={showCorrectAnswers}
                              />
                              {showCorrectAnswers && String(answers[q.id] || '').trim().toLowerCase() !== String(q.correctAnswer || '').trim().toLowerCase() && (
                                <div className="mt-2 text-sm text-green-600 font-medium">
                                  Đáp án đúng: {String(q.correctAnswer)}
                                </div>
                              )}
                            </div>
                          )}

                          {q.type === 'writing' && (
                            <div>
                              <Textarea 
                                placeholder="Write your paragraph here..." 
                                className="w-full min-h-[150px] bg-white transition-shadow focus-visible:ring-blue-500 leading-relaxed disabled:opacity-80"
                                onChange={(e) => !showCorrectAnswers && setAnswers({...answers, [q.id]: e.target.value})}
                                value={answers[q.id] as string || ''}
                                readOnly={showCorrectAnswers}
                              />
                              {showCorrectAnswers && (
                                <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
                                  <div className="font-bold text-blue-800 mb-1">Gợi ý đáp án / Tiêu chí:</div>
                                  <div className="text-blue-700 whitespace-pre-wrap">{String(q.correctAnswer || 'Không có')}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      
      <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-center gap-4">
        {isStudentView && !showCorrectAnswers && (
           <Button 
             size="lg" 
             className="px-8 shadow-md bg-[#0d9388] hover:bg-[#0b7a70]"
             onClick={handleSubmit}
             disabled={isSubmitting}
           >
             {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Đang nộp...</> : 'Nộp bài'}
           </Button>
        )}
      </div>
    </div>
    
      {/* Floating Action Button */}
      {isStudentView && !isMenuOpen && (
        <Button
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center bg-[#0d9388] hover:bg-[#0b7a70] z-40 text-white p-0"
          onClick={() => setIsMenuOpen(true)}
        >
          <LayoutGrid className="w-6 h-6" />
        </Button>
      )}

      {/* Grid Drawer */}
      {isStudentView && isMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity" 
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="relative bg-white w-full max-w-2xl mx-auto rounded-t-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300 pb-4">
             <div className="flex justify-between items-center p-4 border-b border-slate-100">
               <h3 className="font-bold text-lg text-slate-800">Danh sách câu hỏi</h3>
               <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                 <X className="w-5 h-5 text-slate-500" />
               </Button>
             </div>
             
             <div className="p-6 overflow-y-auto space-y-6">
                {sections.map(section => {
                  const sectionQs = sortedQuestions.filter(q => q.section === section);
                  return (
                    <div key={section}>
                      <h4 className="font-bold text-slate-800 italic mb-3">{section}</h4>
                      <div className="flex flex-wrap gap-2">
                        {sectionQs.map(q => {
                           const answered = isQuestionAnswered(q.id);
                           return (
                             <button
                               key={q.id}
                               onClick={() => scrollToQuestion(q.id)}
                               className={`w-12 h-10 rounded text-sm font-medium flex items-center justify-center border transition-colors shadow-sm ${
                                 answered
                                   ? 'bg-amber-300/80 border-amber-400 text-amber-900' 
                                   : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                               }`}
                             >
                               {q.order}
                             </button>
                           );
                        })}
                      </div>
                    </div>
                  );
                })}
             </div>
             
             <div className="px-6 pt-2 pb-2 flex justify-center border-t border-slate-100">
                <Button variant="destructive" onClick={() => setIsMenuOpen(false)} className="px-10 bg-red-500 hover:bg-red-600 shadow-sm rounded-lg">
                  Đóng
                </Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
