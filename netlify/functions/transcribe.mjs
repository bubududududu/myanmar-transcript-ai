
import Groq from "groq-sdk";

const timeFormat = (seconds) => {
  const ms = Math.round(seconds * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  const milli = String(ms % 1000).padStart(3, "0");
  return `${h}:${m}:${s},${milli}`;
};

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY မတွေ့ပါ။");

    const form = await req.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      throw new Error("Audio သို့မဟုတ် Video ဖိုင်ရွေးပါ။");
    }

    if (file.size > 3.5 * 1024 * 1024) {
      throw new Error("ဖိုင်အရွယ်အစား 3.5 MB ထက်ကြီးနေပါတယ်။");
    }

    const groq = new Groq({ apiKey });

    const transcription = await groq.audio.transcriptions.create({
      file: new File(
        [await file.arrayBuffer()],
        file.name,
        { type: file.type || "application/octet-stream" }
      ),
      model: "whisper-large-v3",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"]
    });

    const segments = transcription.segments || [];

    if (!segments.length) {
      throw new Error("အသံထဲမှ စာသားမရရှိပါ။");
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: 'Translate each segment into natural Burmese. Preserve order and meaning. Return JSON only in this format: {"translations":["translation 1","translation 2"]}. The number of translations must equal the number of input segments.'
        },
        {
          role: "user",
          content: JSON.stringify(segments.map(s => s.text))
        }
      ]
    });

    const result = JSON.parse(
      response.choices[0].message.content
    );

    const translations = result.translations || [];

    const srt = segments.map((seg, i) => {
      const text = translations[i] || seg.text;
      return `${i + 1}\n${timeFormat(seg.start)} --> ${timeFormat(seg.end)}\n${text}\n`;
    }).join("\n");

    return new Response(
      JSON.stringify({
        text: translations.join(" "),
        srt
      }),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        }
      }
    );
  }
};
