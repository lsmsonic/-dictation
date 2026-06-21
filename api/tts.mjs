// CLOVA Voice (Premium) TTS 서버리스 프록시
// - 네이버 클라우드 키는 서버 env 시크릿으로만 보관(브라우저 비노출)
// - 입력 검증, 화자/포맷 화이트리스트, 정수 범위 클램프, 오류 비노출(OWASP)
// - env 미설정 시 503 → 클라이언트는 애플 음성으로 폴백

const CLOVA_URL = "https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts";

// UI에서 제공하는 화자만 허용 (그 외 값은 기본값으로 대체)
const ALLOWED_SPEAKERS = new Set([
  "nara", "nara_call", "nminyoung", "nyejin", "vara", "vmikyung", "vdain",
  "vyuna", "vhyeri", "mijin", "jinho", "ndain", "nhajun", "ndaeseong", "nseonghoon",
]);
const DEFAULT_SPEAKER = "nara";

function clampInt(v, min, max, dflt) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

function sameOrigin(req) {
  // 우리 페이지(동일 호스트)에서의 호출만 허용 → 외부에서 우리 quota 남용 방지
  const host = req.headers["host"] || "";
  const origin = req.headers["origin"] || "";
  const referer = req.headers["referer"] || "";
  if (!origin && !referer) return true; // 동일 출처 fetch는 Origin이 생략될 수 있음
  try {
    const src = origin || referer;
    const u = new URL(src);
    return u.host === host;
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const keyId = process.env.NCP_CLOVA_VOICE_KEY_ID;
  const key = process.env.NCP_CLOVA_VOICE_KEY;
  if (!keyId || !key) {
    res.status(503).json({ error: "not_configured" }); // 키 미설정 → 클라이언트가 애플 음성으로 폴백
    return;
  }

  // body 파싱 (Vercel은 application/json 자동 파싱)
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const text = String(body.text == null ? "" : body.text);
  if (!text.trim()) { res.status(400).json({ error: "text_required" }); return; }
  if (text.length > 2000) { res.status(400).json({ error: "text_too_long" }); return; } // CLOVA 한도

  const speaker = ALLOWED_SPEAKERS.has(body.speaker) ? body.speaker : DEFAULT_SPEAKER;
  const speed = clampInt(body.speed, -5, 10, 0);   // 양수=느리게, 음수=빠르게
  const pitch = clampInt(body.pitch, -5, 5, 0);
  const volume = clampInt(body.volume, -5, 5, 0);
  const format = body.format === "wav" ? "wav" : "mp3";

  const params = new URLSearchParams();
  params.set("speaker", speaker);
  params.set("text", text);
  params.set("speed", String(speed));
  params.set("pitch", String(pitch));
  params.set("volume", String(volume));
  params.set("format", format);

  try {
    const upstream = await fetch(CLOVA_URL, {
      method: "POST",
      headers: {
        "X-NCP-APIGW-API-KEY-ID": keyId,
        "X-NCP-APIGW-API-KEY": key,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!upstream.ok) {
      const detail = (await upstream.text().catch(() => "")).slice(0, 300);
      res.status(upstream.status === 429 ? 429 : 502).json({ error: "tts_failed", status: upstream.status, detail });
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", format === "wav" ? "audio/wav" : "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).json({ error: "upstream_error" });
  }
}
