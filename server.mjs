// AI Physique Analyzer backend
// Node.js 20+
// Keeps the Gemini API key on the server, never in browser code.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const schema = {
  type: "object",
  properties: {
    score: { type: "number", description: "Overall visible development score from 1 to 10. Neutral training-analysis scale, not attractiveness." },
    confidence: { type: "integer", description: "0 to 100 confidence in the visual analysis." },
    comment: { type: "string" },
    quality: {
      type: "object",
      properties: {
        overall: { type: "string" },
        lighting: { type: "string" },
        visibility: { type: "string" },
        pose: { type: "string" }
      },
      required: ["overall","lighting","visibility","pose"]
    },
    measurements: {
      type: "object",
      properties: {
        shoulder_to_waist_proxy: { type: "number" },
        left_right_symmetry_proxy: { type: "number" },
        visible_definition_proxy: { type: "number" }
      },
      required: ["shoulder_to_waist_proxy","left_right_symmetry_proxy","visible_definition_proxy"]
    },
    subs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          score: { type: "number" },
          confidence: { type: "integer" },
          evidence: { type: "string" }
        },
        required: ["key","score","confidence","evidence"]
      }
    },
    limitations: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["score","confidence","comment","quality","measurements","subs","limitations"]
};

function send(res, status, data, type="application/json; charset=utf-8"){
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(typeof data === "string" ? data : JSON.stringify(data));
}

function readBody(req){
  return new Promise((resolve,reject)=>{
    let body = "";
    let size = 0;
    req.on("data", chunk => {
      size += chunk.length;
      if(size > 18 * 1024 * 1024){
        req.destroy();
        reject(new Error("Request quá lớn."));
        return;
      }
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseDataUrl(dataUrl){
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if(!match) throw new Error("Ảnh phải là JPEG, PNG hoặc WebP.");
  return { mime_type: match[1], data: match[2] };
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

async function analyzeWithGemini(input){
  if(!GEMINI_API_KEY){
    throw new Error("Thiếu GEMINI_API_KEY. Hãy đặt biến môi trường trước khi chạy server.");
  }

  const images = input.shots.map(s => {
    const img = parseDataUrl(s.img);
    return {
      type: "image",
      mime_type: img.mime_type,
      data: img.data
    };
  });

  const subList = input.subMuscles.map(s => `${s.key}: ${s.label}`).join("\n");

  const prompt = `
Bạn là một hệ thống computer-vision assistant cho ứng dụng phân tích thể hình.
Nhiệm vụ: phân tích KHÁCH QUAN những đặc điểm cơ bắp có thể nhìn thấy trong các ảnh được cung cấp.

Module: ${input.moduleKey} (${input.moduleLabel})
Tiêu chí của module: ${input.criteria}

Các sub-muscle cần trả về:
${subList}

YÊU CẦU QUAN TRỌNG:
1. Chỉ đánh giá những gì thực sự nhìn thấy trong ảnh. Không bịa số đo.
2. Điểm 1-10 là "mức độ phát triển nhìn thấy được trong ảnh" cho mục đích theo dõi tập luyện, KHÔNG phải điểm hấp dẫn/đẹp.
3. Không suy đoán giới tính, sức khỏe, bệnh lý, tuổi sinh học, hay giá trị của một cơ thể.
4. Không suy ra % mỡ cơ thể chính xác, FFMI hay "somatotype" từ một ảnh.
5. Không so sánh người dùng với người nổi tiếng, người mẫu hay "cơ thể lý tưởng".
6. Nếu pose, ánh sáng hoặc quần áo làm một nhóm cơ không nhìn rõ, giảm confidence và ghi rõ limitation thay vì đoán.
7. Symmetry/ratio chỉ là proxy hình ảnh, không phải số đo giải phẫu chính xác.
8. Với mỗi sub-muscle, score phải từ 1 đến 10; confidence từ 0 đến 100.
9. Trả JSON đúng schema, không markdown.
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/interactions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
        "Api-Revision": "2026-05-20"
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        input: [
          { type: "text", text: prompt },
          ...images
        ],
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema
        }
      })
    }
  );

  const raw = await response.text();
  if(!response.ok){
    throw new Error(`Gemini API ${response.status}: ${raw.slice(0, 1000)}`);
  }

  let data;
  try { data = JSON.parse(raw); } catch {
    throw new Error("Gemini trả về dữ liệu không phải JSON: " + raw.slice(0, 300));
  }

  const outputText = data.output_text ||
    data.steps?.flatMap(s => s.content || [])
      .filter(c => c.type === "text")
      .map(c => c.text)
      .join("") ||
    data.candidates?.flatMap(c => c.content?.parts || [])
      .filter(p => p.text)
      .map(p => p.text)
      .join("") || "";

  if(!outputText) {
    throw new Error("Gemini không trả về nội dung phân tích. Phản hồi: " + JSON.stringify(data).slice(0, 700));
  }

  let result;
  try { result = JSON.parse(outputText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "")); }
  catch { throw new Error("AI trả về JSON lỗi: " + outputText.slice(0, 500)); }

  result.score = clamp(Number(result.score) || 1, 1, 10);
  result.confidence = clamp(Math.round(Number(result.confidence) || 0), 0, 100);
  result.subs = (result.subs || []).map(x => ({
    ...x,
    score: clamp(Number(x.score) || 1, 1, 10),
    confidence: clamp(Math.round(Number(x.confidence) || 0), 0, 100)
  }));

  return result;
}

function serveStatic(req, res){
  let pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  if(pathname === "/") pathname = "/index.html";

  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const file = path.join(__dirname, safe);

  if(!file.startsWith(__dirname)) return send(res, 403, {error:"Forbidden"});

  fs.stat(file, (err, stat)=>{
    if(err || !stat.isFile()) return send(res, 404, {error:"Not found"});
    const ext = path.extname(file);
    const types = {
      ".html":"text/html; charset=utf-8",
      ".js":"text/javascript; charset=utf-8",
      ".css":"text/css; charset=utf-8",
      ".json":"application/json; charset=utf-8"
    };
    res.writeHead(200, {"Content-Type": types[ext] || "application/octet-stream"});
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req,res)=>{
  if(req.method === "OPTIONS"){
    res.writeHead(204, {
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
      "Access-Control-Allow-Headers":"Content-Type"
    });
    return res.end();
  }

  if(req.method === "GET" && req.url === "/api/health"){
    return send(res, 200, {
      ok: true,
      geminiKeyConfigured: !!GEMINI_API_KEY,
      model: GEMINI_MODEL
    });
  }

  if(req.method === "POST" && req.url === "/api/analyze"){
    try{
      const body = JSON.parse(await readBody(req));
      if(!body.moduleKey || !Array.isArray(body.shots) || !body.shots.length){
        return send(res, 400, {error:"Thiếu module hoặc ảnh."});
      }
      if(body.shots.length > 4){
        return send(res, 400, {error:"Tối đa 4 ảnh mỗi lần phân tích."});
      }
      const result = await analyzeWithGemini(body);
      return send(res, 200, {result});
    }catch(err){
      console.error(err);
      return send(res, 500, {error: err.message || "AI server error"});
    }
  }

  if(req.method === "GET"){
    return serveStatic(req,res);
  }

  send(res,405,{error:"Method not allowed"});
});

server.listen(PORT, HOST, ()=>{
  console.log(`AI Physique Analyzer listening on ${HOST}:${PORT}`);
  console.log(`Gemini model: ${GEMINI_MODEL}`);
});
