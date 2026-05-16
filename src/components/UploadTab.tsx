import React, { useState } from 'react';
import { UploadCloud, File, Loader2, FileType } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { parsePDF } from '../lib/parser';
import { Question } from '../types';

interface UploadTabProps {
  onAnalyzed: (questions: Question[]) => void;
}

export default function UploadTab({ onAnalyzed }: UploadTabProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const isJson = droppedFile.type === 'application/json' || droppedFile.name.toLowerCase().endsWith('.json');
      if (droppedFile.type === 'application/pdf' || isJson) {
        setFile(droppedFile);
      } else {
        alert('Vui lòng tải lên file PDF hoặc JSON');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
      
      if (isJson) {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const questions: Question[] = data.map((item: any, index: number) => {
          let options: string[] | undefined = undefined;
          
          if (item.options && Array.isArray(item.options)) {
            options = item.options.map((opt: any) => `${opt.key}. ${opt.text}`);
          }
          
          return {
            id: item.id ? String(item.id) : `q_${index}`,
            order: index + 1,
            section: item.level || 'General',
            type: 'multiple_choice',
            content: item.question_content || '',
            options: options,
            correctAnswer: item.correct_answer,
            points: 0.25,
            confidence: 'high'
          };
        });
        
        onAnalyzed(questions);
      } else {
        // API call to parse PDF into English questions
        const questions = await parsePDF(file);
        onAnalyzed(questions);
      }
    } catch (error: any) {
      alert(`Lỗi khi phân tích đề: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Tải đề Tiếng Anh của bạn lên</h2>
        <p className="text-slate-500">Hỗ trợ định dạng PDF (sử dụng AI phân tích) và định dạng JSON mẫu.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            {file ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
                  <File className="w-8 h-8" />
                </div>
                <div className="text-lg font-medium text-slate-900">{file.name}</div>
                <div className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.name.toLowerCase().endsWith('.json') ? 'JSON' : 'PDF'}</div>
                <Button variant="outline" onClick={() => setFile(null)}>Bỏ chọn</Button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-slate-100 text-slate-500 rounded-full">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-lg font-medium text-slate-900">Kéo thả file PDF hoặc JSON vào đây</div>
                  <div className="text-sm text-slate-500 mt-1">hoặc click để chọn file từ máy tính</div>
                </div>
                <div>
                  <input type="file" id="file-upload" className="hidden" accept=".pdf,.json" onChange={handleFileInput} />
                  <Button variant="outline" className="cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>
                    Chọn file
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {file && (
            <div className="mt-6 flex justify-center">
              <Button size="lg" className="w-full sm:w-auto" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Đang phân tích đề...
                  </>
                ) : (
                  'Phân tích đề ngay'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {!file && (
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 flex items-start gap-4 text-blue-800">
            <FileType className="w-6 h-6 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-1">Mẹo để phân tích chính xác nhất:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Bố cục định dạng file PDF đề gốc rõ ràng, không bị lỗi font chữ.</li>
                <li>Hoặc tải lên file JSON có chứa các thông tin như ID, Nội dung và Các lựa chọn của câu hỏi.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
