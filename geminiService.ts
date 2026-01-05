
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "./types";

export async function analyzeFinancials(transactions: Transaction[]) {
  // Initialize the AI client inside the function to ensure it uses the latest process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const summary = transactions.map(t => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    date: t.date,
    status: t.status
  }));

  const prompt = `
    أنت مستشار مالي خبير. قم بتحليل بيانات الصندوق التالية وقدم تقريراً ملخصاً باللغة العربية:
    البيانات: ${JSON.stringify(summary)}

    المطلوب:
    1. تحليل موجز للتدفقات النقدية.
    2. تحديد أكبر بنود المصروفات.
    3. تقديم 3 نصائح لتحسين الإدارة المالية وتقليل التكاليف.
    4. تقييم سريع للمخاطر (إن وجد).
    
    اجعل الإجابة بتنسيق Markdown احترافي وواضح.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "عذراً، لم يتمكن النظام من تحليل البيانات حالياً.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "حدث خطأ أثناء محاولة الحصول على تحليل الذكاء الاصطناعي.";
  }
}
