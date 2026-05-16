import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Question } from '../types';

interface AnalysisTabProps {
  questions: Question[];
  onNext: () => void;
}

export default function AnalysisTab({ questions, onNext }: AnalysisTabProps) {
  const highConfidenceCount = questions.filter(q => q.confidence === 'high').length;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Kết quả phân tích đề</h2>
          <p className="text-slate-500">Hệ thống đã nhận diện được {questions.length} câu hỏi.</p>
        </div>
        <Button onClick={onNext}>
          Chuyển sang Chỉnh sửa <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Tổng số câu hỏi</p>
              <p className="text-2xl font-bold">{questions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Độ tin cậy cao</p>
              <p className="text-2xl font-bold text-green-600">{highConfidenceCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-full text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Cần kiểm tra kỹ</p>
              <p className="text-2xl font-bold text-amber-600">{questions.length - highConfidenceCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {questions.map((q) => (
          <Card key={q.id} className={q.confidence !== 'high' ? 'border-amber-200 bg-amber-50/30' : ''}>
            <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">Câu {q.order}</span>
                <Badge variant="secondary">{q.section}</Badge>
                <Badge variant="outline">{q.type.replace('_', ' ')}</Badge>
              </div>
              {q.confidence !== 'high' && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Chú ý
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm">
              {q.instructions && <p className="italic text-slate-600 mb-2">{q.instructions}</p>}
              {q.passage && <div className="bg-slate-50 p-3 rounded-md mb-3 text-slate-700 border border-slate-200 whitespace-pre-line leading-relaxed">{q.passage}</div>}
              <p className="font-medium text-slate-900 mb-2 whitespace-pre-wrap">{q.content}</p>
              
              {q.options && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {q.options.map((opt, i) => {
                    // Quick check if this string matches the correct answer string (e.g. if option is "A. go" and correct is "A" or "A. go")
                    const isCorrect = q.correctAnswer === opt || (typeof q.correctAnswer === 'string' && opt.startsWith(q.correctAnswer));
                    return (
                      <div key={i} className={`p-2 rounded-md border ${isCorrect ? 'bg-green-50 border-green-200 text-green-800 font-medium' : 'bg-white border-slate-200 text-slate-600'}`}>
                        {opt}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {['short_answer', 'writing'].includes(q.type) && q.correctAnswer && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md text-slate-700">
                  <span className="font-semibold text-blue-900">Gợi ý / Đáp án:</span> {q.correctAnswer.toString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
