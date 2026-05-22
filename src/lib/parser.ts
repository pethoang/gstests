import { Question } from '../types';
import { GoogleGenAI, Type } from '@google/genai';

export const parsePDF = async (file: File): Promise<Question[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        
        const apiKey = process.env.GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `Bạn là chuyên gia phân tích đề Tiếng Anh tại Việt Nam. Tôi cung cấp cho bạn base64 của một file PDF đề Tiếng Anh.
Nhiệm vụ của bạn là đọc và tách TẤT CẢ các câu hỏi trong đề này thành một danh sách JSON có cấu trúc.

Tuân thủ nghiêm ngặt các quy tắc sau:
1. Đọc từng câu hỏi, kể cả câu trắc nghiệm, đọc hiểu, tự luận.
2. Tìm và ghép nối các dòng "chỉ dẫn" (instructions) hoặc "đoạn văn" (passage) nếu câu hỏi đó phụ thuộc vào (ví dụ: đoạn văn Reading).
3. GIẢI ĐỀ (BẮT BUỘC): Bạn phải đóng vai một giáo viên tiếng Anh để giải từng câu hỏi. Kết quả giải đề (đáp án đúng) PHẢI được đưa vào trường \`correctAnswer\`. Đối với câu hỏi trắc nghiệm, \`correctAnswer\` là chữ cái đại diện (A, B, C, D). Đối với câu hỏi điền từ hoặc viết lại câu, \`correctAnswer\` là nội dung câu trả lời đầy đủ.
4. Đánh giá mức độ tin cậy (confidence) của hệ thống với câu hỏi đó (high, medium, low).
5. Trả về mảng JSON đúng định dạng được yêu cầu. Không được bọc kết quả trong markdown code block (json).
5. ĐỊNH DẠNG VĂN BẢN (QUAN TRỌNG): 
   - Đối với các từ/chữ cái được IN ĐẬM: bao quanh bằng \`**\` (ví dụ \`**word**\`).
   - Đối với các bài tập Phát âm (Pronunciation) và Trọng âm (Stress): TUYỆT ĐỐI KHÔNG đưa danh sách từ vào trường \`content\`. Thay vào đó, hãy đưa chúng vào trường \`options\` và chỉ gạch chân đúng phần chữ cái cần được kiểm tra bằng \`__\` (ví dụ: \`f__l__ight\`) hoặc in đậm âm tiết trọng âm bằng \`**\` bên trong từng lựa chọn của mảng \`options\`.
   - ĐỐI VỚI CHỖ TRỐNG (BLANK): Luôn sử dụng tối thiểu 3 dấu gạch dưới \`___\` hoặc 3 dấu chấm \`...\` để ký hiệu chỗ trống cần điền từ. Hệ thống sẽ tự động hiển thị chúng thành khoảng trống rộng cho học sinh.
   - TUYỆT ĐỐI KHÔNG sử dụng cú pháp gạch chân \`__\` cho toàn bộ câu hoặc đoạn văn dài.
6. TÁCH NỘI DUNG VÀ LỰA CHỌN: Tuyệt đối KHÔNG gộp các lựa chọn đáp án (A, B, C, D) vào nội dung câu hỏi (\`content\`). Trường \`content\` chỉ chứa câu hỏi dẫn, nếu không có câu dẫn (như bài Pronunciation/Stress) thì hãy để \`content\` là chuỗi rỗng.
7. NHÓM CÂU HỎI VÀ THỨ TỰ (CỰC KỲ QUAN TRỌNG): 
   - Tuyệt đối giữ đúng số thứ tự câu hỏi (Question number) như trong PDF (ví dụ: Q1, Q2... Q21, Q22). KHÔNG tự ý đánh số lại hoặc thay đổi thứ tự xuất hiện của các câu hỏi.
   - Nếu có một dòng yêu cầu chung, hãy đưa nó vào trường \`instructions\` của TẤT CẢ các câu hỏi thuộc nhóm đó.
8. CÂU TRẢ LỜI NGẮN / VIẾT LẠI CÂU: Đối với các yêu cầu viết lại câu (Rewrite), hoàn thành câu, hãy ƯU TIÊN phân loại là 'short_answer'. KHÔNG sao chép các dòng kẻ "______" hay mũi tên "->" vào trong nội dung của câu hỏi, thay thế bằng \`___\`.
9. BÀI ĐIỀN TỪ (CLOZE TEST): 
   - Trong phần \`passage\`: Sử dụng số thứ tự trong ngoặc đơn, ví dụ: "The (11) of Australia...".
   - Tách từng số thành một câu hỏi 'multiple_choice' riêng biệt. 
10. TÌM LỖI SAI (ERROR IDENTIFICATION): Đây là dạng bài TRẮC NGHIỆM (multiple_choice). 
   - Trường \`content\`: Đưa toàn bộ câu văn vào. Sử dụng cú pháp \`__\` bao quanh chính xác các từ được gạch chân tương ứng với A, B, C, D.
   - Trường \`options\`: Chứa 4 từ/cụm từ bị sai tương ứng với A, B, C, D.
   - PHÂN LOẠI: Giữ đúng \`section\` là "Writing" nếu đề bài đặt nó ở mục đó, nhưng \`type\` vẫn là \`multiple_choice\`.

11. GIỮ NGUYÊN ĐOẠN VĂN (PARAGRAPHS): Đối với các đoạn văn dài (Reading), bạn PHẢI giữ nguyên cấu trúc các đoạn văn của bản gốc bằng cách sử dụng các ký tự xuống dòng (\n). Tuyệt đối không gộp nhiều đoạn văn thành một khối văn bản duy nhất.
12. CÂU HỎI CÓ HÌNH ẢNH (VISUAL QUESTIONS): Nếu nội dung hoặc chỉ dẫn câu hỏi nhắc tới biển báo, tranh vẽ, hình ảnh minh họa (ví dụ: "Look at the sign", "What does the sign say?", "Look at the picture", "nhìn hình/biển báo...", "Look at... and answer"), hãy gán thuộc tính \`hasImage\` là true.
13. XỬ LÝ LAYOUT ĐA CỘT (MULTI-COLUMN LAYOUTS): Một số đề thi có thiết kế dạng hai cột song song (ví dụ: hình ảnh/bảng thông báo/biển quảng cáo ở bên trái và các câu hỏi hoặc các phương án lựa chọn A, B, C, D trắc nghiệm ở cột bên phải). Bạn phải phân tích cục bộ và chiết tách cẩn thận các phương án A, B, C, D này vào trường \`options\`, đổi loại câu hỏi thành \`multiple_choice\`. Tránh nhận diện lầm thành câu hỏi tự luận không có đáp án do bỏ sót dữ liệu cột bên phải.

Các loại câu hỏi (type) hỗ trợ: 'multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'writing', 'reading', 'listening', 'ordering'
Đối với trắc nghiệm, 'options' phải chứa chính xác các chuỗi phản hồi ví dụ: ["A. go", "B. goes", "C. went", "D. going"]. Nếu biết đáp án đúng, hãy đưa vào 'correctAnswer' (ví dụ chuỗi 'B' hoặc 'goes').
Đối với mỗi câu hỏi, bạn phải xác định đúng thuộc tính (section) của nó như: "Pronunciation", "Vocabulary and Grammar", "Reading", "Writing".
Nếu đề không có ghi điểm số, mặc định cho 'points' là 0.25.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: 'application/pdf',
              },
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              description: "A list of parsed English questions",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "A unique random string ID for this question" },
                  order: { type: Type.NUMBER, description: "The number of the question" },
                  section: { type: Type.STRING, description: "The section this question belongs to" },
                  type: { type: Type.STRING, description: "Must be one of: 'multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'writing', 'reading', 'listening', 'ordering'" },
                  content: { type: Type.STRING, description: "The main content/text of the question itself" },
                  options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "For multiple choice only, the list of options like ['A. go', 'B. goes', ...]" },
                  correctAnswer: { type: Type.STRING, description: "The correct answer if inferrable (e.g. 'B' or 'goes'). Optional." },
                  points: { type: Type.NUMBER, description: "Points for this question. Default 0.25 if unknown." },
                  notes: { type: Type.STRING, description: "Any warnings or notes if the parsing seems ambiguous." },
                  confidence: { type: Type.STRING, description: "Confidence in parsing this question correctly: 'high', 'medium', or 'low'" },
                  passage: { type: Type.STRING, description: "For reading questions, the reading passage text." },
                  instructions: { type: Type.STRING, description: "Instructions proceeding the question, like 'Choose the correct answer A, B, C or D...'." },
                  hasImage: { type: Type.BOOLEAN, description: "Whether this question contains references to visual signs or illustrations needing an external image." },
                },
                required: ["id", "order", "section", "type", "content", "points", "confidence"]
              }
            }
          }
        });

        if (!response.text) {
          throw new Error('No response text generated.');
        }

        let rawText = response.text;
        // Strip markdown code block if present
        if (rawText.startsWith('```json')) {
          rawText = rawText.replace(/^```json\n?|\n?```$/g, '');
        } else if (rawText.startsWith('```')) {
          rawText = rawText.replace(/^```\n?|\n?```$/g, '');
        }

        try {
          const parsedQuestions = JSON.parse(rawText);
          resolve(parsedQuestions);
        } catch (parseError) {
          console.error("Failed to parse JSON string:", rawText);
          throw new Error("Lỗi khi định dạng dữ liệu từ AI. Hãy thử lại.");
        }
      } catch (err: any) {
        console.error("Gemini Error: ", err);
        let errorMsg = err.message || 'Lỗi không xác định khi quá trình phân tích.';
        if (errorMsg.includes('API key not valid') || errorMsg.includes('API_KEY_INVALID')) {
           errorMsg = 'GEMINI_API_KEY không hợp lệ. Vui lòng kiểm tra lại cấu hình API key.';
        } else if (errorMsg.includes('The document has no pages')) {
           errorMsg = 'Không thể phân tích nội dung PDF. File tải lên có thể là file trống, file JSON bị sai định dạng mở rộng, hoặc PDF không chứa nội dung hợp lệ. Vui lòng kiểm tra lại file.';
        }
        reject(new Error(errorMsg));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};
