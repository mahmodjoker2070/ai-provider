const MODEL_NAME = "gemini-3.8-flash";
const WHATSAPP_NUMBER = "970567375571";

const PRODUCTS_AND_POLICY = `
- الصنف 1: تمور — السعر: حسب الصنف والوزن المعتمد عند تأكيد الطلب — الميزة: مختارة بعناية وجودة مناسبة للضيافة والاستهلاك اليومي.
- الصنف 2: قهوة — السعر: حسب الاختيار والوزن المعتمد عند تأكيد الطلب — الميزة: مناسبة للتحضير اليومي والضيافة.
- الصنف 3: بهارات — السعر: حسب النوع والوزن المعتمد عند تأكيد الطلب — الميزة: مناسبة لإعداد الطعام وتنكيه الأطباق.
- الصنف 4: عسل — السعر: حسب النوع والوزن المعتمد عند تأكيد الطلب — الميزة: مناسب للاستهلاك اليومي والإهداء.
- الصنف 5: عطور — السعر: حسب النوع والحجم المعتمد عند تأكيد الطلب — الميزة: مناسبة للاستخدام اليومي والإهداء.
- التوصيل: يتم التنسيق وتأكيد مدة وتكلفة التوصيل حسب العنوان والمنطقة عند إتمام الطلب.
- الدفع: يتم تأكيد آلية الدفع المناسبة مع العميل عند اعتماد الأوردر.
`;

const SYSTEM_PROMPT = `
أنت "وكيل الأوردرات الذكي" التابع لـ ai provider. مهمتك مساعدة الزبون في اختيار المنتج المناسب وإتمام أوردر شراء جاهز للتنفيذ.

القواعد الصارمة:
1. التزم فقط بالمعلومات الواردة في "قائمة المنتجات والسياسات" أدناه. يُمنع منعاً باتاً اختراع أي أسعار محددة أو أوزان أو أحجام أو خصومات أو مواعيد توصيل غير مذكورة في القائمة.
2. إذا سأل الزبون عن منتج أو تفصيل غير موجود في القائمة، وضّح بلطف أن هذا التفصيل يُؤكَّد مع فريق المبيعات ولا تخمّن من عندك.
3. اجعل ردودك مختصرة، ودودة، ومباشرة، ومناسبة للقراءة السريعة على الجوال.
4. عند رغبة الزبون في الشراء، اجمع منه بلطف البيانات الأربع المطلوبة لإتمام الأوردر:
   - الصنف والكمية (أو النوع/الوزن/الحجم المطلوب)
   - الاسم الكامل
   - رقم الهاتف
   - العنوان الكامل (المدينة / الحي)
5. بمجرد توفر البيانات الأربع، أخرج "بطاقة أوردر جاهز للتنفيذ" واضحة ومنظمة تحتوي على البنود الأربعة ورقم واتساب التنفيذ (${WHATSAPP_NUMBER}) وسياسة التوصيل والدفع دون اختراع أسعار.
`;

function extractSelectedItems(text, lower) {
  const items = [];
  if (text.includes("تمر") || text.includes("تمور") || lower.includes("dates")) {
    items.push("تمور");
  }
  if (text.includes("قهوة") || text.includes("بن") || lower.includes("coffee")) {
    items.push("قهوة");
  }
  if (text.includes("بهار") || text.includes("بهارات") || text.includes("توابل") || lower.includes("spices")) {
    items.push("بهارات");
  }
  if (text.includes("عسل") || lower.includes("honey")) {
    items.push("عسل");
  }
  if (text.includes("عطر") || text.includes("عطور") || lower.includes("perfume") || lower.includes("perfumes")) {
    items.push("عطور");
  }
  return items;
}

function buildLocalFallbackReply(message) {
  const text = (message || "").trim();
  const lower = text.toLowerCase();

  const items = extractSelectedItems(text, lower);
  const phoneMatch = text.match(/(\+?\d[\d\s\-]{6,15}\d)/);
  const hasPhone = Boolean(phoneMatch);
  const hasAddress = /(المدينة|الحي|شارع|منطقة|عنوان|غزة|خانيونس|خان يونس|رفح|رام الله|نابلس|الخليل|القدس|عمان|دبي|الرياض)/.test(text);
  const hasName = /(اسمي|الاسم|أنا|انا)\s+[\u0600-\u06FFa-zA-Z]{2,}/.test(text);

  if (items.length > 0 && (hasPhone || hasAddress || hasName)) {
    return [
      "بطاقة أوردر جاهز للتنفيذ — ai provider",
      "• الصنف والكمية: " + items.join("، ") + " (النوع/الوزن/الحجم والسعر يُعتمدان عند تأكيد الطلب)",
      "• الاسم الكامل: " + (hasName ? "مذكور في الرسالة" : "يُرجى تأكيد الاسم الكامل"),
      "• رقم الهاتف: " + (hasPhone ? phoneMatch[0].trim() : "يُرجى تأكيد رقم الهاتف"),
      "• العنوان الكامل: " + (hasAddress ? "مذكور في الرسالة" : "يُرجى تأكيد المدينة والحي"),
      "• التوصيل والدفع: يتم التنسيق وتأكيد المدة والتكلفة وآلية الدفع عند اعتماد الأوردر.",
      "• واتساب التنفيذ: " + WHATSAPP_NUMBER
    ].join("\n");
  }

  if (items.length > 1) {
    return (
      "متوفر لدينا: " +
      items.join("، ") +
      " (يتم تأكيد النوع/الوزن/الحجم والسعر عند تأكيد الطلب). لإتمام الأوردر أرسل: الصنف والكمية، الاسم الكامل، رقم الهاتف، والعنوان الكامل."
    );
  }

  if (items.length === 1) {
    const item = items[0];
    if (item === "تمور") {
      return "متوفر لدينا: تمور مختارة بعناية وجودة مناسبة للضيافة والاستهلاك اليومي (النوع/الوزن والسعر يُعتمدان عند تأكيد الطلب). لإتمام الأوردر أرسل: الصنف والكمية، الاسم الكامل، رقم الهاتف، والعنوان الكامل.";
    }
    if (item === "قهوة") {
      return "متوفر لدينا: قهوة مناسبة للتحضير اليومي والضيافة (النوع/الوزن والسعر يُعتمدان عند تأكيد الطلب). لإتمام الأوردر أرسل: الصنف والكمية، الاسم الكامل، رقم الهاتف، والعنوان الكامل.";
    }
    if (item === "بهارات") {
      return "متوفر لدينا: بهارات مناسبة لإعداد الطعام وتنكيه الأطباق (النوع/الوزن والسعر يُعتمدان عند تأكيد الطلب). لإتمام الأوردر أرسل: الصنف والكمية، الاسم الكامل، رقم الهاتف، والعنوان الكامل.";
    }
    if (item === "عسل") {
      return "متوفر لدينا: عسل مناسب للاستهلاك اليومي والإهداء (النوع/الوزن والسعر يُعتمدان عند تأكيد الطلب). لإتمام الأوردر أرسل: الصنف والكمية، الاسم الكامل، رقم الهاتف، والعنوان الكامل.";
    }
    if (item === "عطور") {
      return "متوفر لدينا: عطور مناسبة للاستخدام اليومي والإهداء (النوع/الحجم والسعر يُعتمدان عند تأكيد الطلب). لإتمام الأوردر أرسل: الصنف والكمية، الاسم الكامل، رقم الهاتف، والعنوان الكامل.";
    }
  }

  return "أهلاً بك في ai provider! نوفر (تمور، قهوة، بهارات، عسل، عطور)، ويتم تأكيد النوع/الوزن/الحجم والسعر والتوصيل والدفع عند إتمام الطلب. كيف يمكنني مساعدتك، أو ما البيانات الأربع (الصنف والكمية، الاسم الكامل، رقم الهاتف، العنوان الكامل) لأوردرك؟";
}

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const message = (body.message || "").trim();
    const useGemini = Boolean(body.useGemini);

    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "الرسالة مطلوبة." })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!useGemini || !apiKey) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          reply: buildLocalFallbackReply(message),
          model: MODEL_NAME,
          source: "local-zero-quota"
        })
      };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: `${SYSTEM_PROMPT}\n\nقائمة المنتجات والسياسات:\n${PRODUCTS_AND_POLICY}` }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: message }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 450
      }
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          reply: buildLocalFallbackReply(message),
          model: MODEL_NAME,
          source: "fallback-after-api-error",
          apiError: data?.error?.message || "Gemini API error"
        })
      };
    }

    const replyText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      buildLocalFallbackReply(message);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: replyText,
        model: MODEL_NAME,
        source: "gemini"
      })
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: buildLocalFallbackReply(""),
        model: MODEL_NAME,
        source: "fallback-exception"
      })
    };
  }
};
