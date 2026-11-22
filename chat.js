const MODEL_NAME = "gemini-2.0-flash";
const WHATSAPP_NUMBER = "970567375571";

const PRODUCTS_AND_POLICY = `
- الصنف 1: قهوة مختارة — السعر: حسب الاختيار والوزن المعتمد عند تأكيد الطلب — الميزة: نكهة غنية وقوام متوازن مناسب للتحضير اليومي والضيافة.
- الصنف 2: تمور فاخرة — السعر: حسب الصنف والوزن المعتمد عند تأكيد الطلب — الميزة: حبات مختارة بعناية وجودة عالية مناسبة للضيافة والاستهلاك اليومي.
- الصنف 3: ساعات — السعر: حسب الموديل المعتمد عند تأكيد الطلب — الميزة: تصميم عملي أنيق مناسب للاستخدام اليومي والإهداء.
- التوصيل: يتم التنسيق وتأكيد مدة وتكلفة التوصيل حسب العنوان والمنطقة عند إتمام الطلب.
- الدفع: يتم تأكيد آلية الدفع المناسبة مع العميل عند اعتماد الأوردر.
`;

const SYSTEM_PROMPT = `
أنت "وكيل الأوردرات الذكي" التابع لـ ai provider. مهمتك مساعدة الزبون في اختيار المنتج المناسب وإتمام أوردر شراء جاهز للتنفيذ.

القواعد الصارمة:
1. التزم فقط بالمعلومات الواردة في "قائمة المنتجات والسياسات" أدناه. يُمنع منعاً باتاً اختراع أي أسعار محددة أو أوزان أو خصومات أو مواعيد توصيل غير مذكورة في القائمة.
2. إذا سأل الزبون عن منتج أو تفصيل غير موجود في القائمة، وضّح بلطف أن هذا التفصيل يُؤكَّد مع فريق المبيعات ولا تخمّن من عندك.
3. اجعل ردودك مختصرة، ودودة، ومباشرة، ومناسبة للقراءة السريعة على الجوال.
4. عند رغبة الزبون في الشراء، اجمع منه بلطف البيانات الأربع المطلوبة لإتمام الأوردر:
   - الصنف والكمية (أو الموديل/الوزن المطلوب)
   - الاسم الكامل
   - رقم الهاتف
   - العنوان الكامل (المدينة / الحي)
5. بمجرد اكتمال البيانات الأربع، اعرض له ملخص الطلب بهذا الشكل الثابت:

✅ بطاقة أوردر جاهز للتنفيذ:
- العميل: [الاسم]
- الهاتف: [الرقم]
- العنوان: [العنوان]
- الطلب: [الصنف والكمية]
- الإجمالي المتوقع: [يُحدّد عند تأكيد السعر والتوصيل]

قائمة المنتجات والسياسات:
${PRODUCTS_AND_POLICY}
`.trim();

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(payload)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      error: "GEMINI_API_KEY is not configured in environment variables."
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return jsonResponse(400, { error: "Message is required." });
    }

    const sanitizedHistory = history
      .filter(
        (item) =>
          item &&
          (item.role === "user" || item.role === "model") &&
          Array.isArray(item.parts) &&
          item.parts.length > 0 &&
          typeof item.parts[0]?.text === "string"
      )
      .slice(-12)
      .map((item) => ({
        role: item.role,
        parts: [{ text: item.parts[0].text.slice(0, 2000) }]
      }));

    const contents = [
      ...sanitizedHistory,
      {
        role: "user",
        parts: [{ text: message }]
      }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 500
        }
      })
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return jsonResponse(geminiRes.status, {
        error: data?.error?.message || "Failed to fetch response from Gemini API."
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "عذراً، لم أتمكن من صياغة الرد الآن. حاول مرة أخرى.";

    return jsonResponse(200, {
      reply,
      whatsappNumber: WHATSAPP_NUMBER
    });
  } catch (err) {
    return jsonResponse(500, {
      error: err?.message || "Unexpected server error."
    });
  }
};
