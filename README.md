# 받아쓰기 마스터 (Dictation Master)

촬영한 이미지에서 받아쓰기 문장을 인식하여 **학습모드 / 시험모드**로 작동하는 서버리스 웹앱.

- 띄어쓰기·문장부호까지 정확 인식 (받아쓰기 채점 기준)
- **예시 문장 음성 읽기(TTS) + 읽기 속도 조절** (필수 기능)
- 시험모드는 **주관식 전용** — 문장부호까지 완전 일치해야 정답
- 1차 기본 OCR(Tesseract.js, 클라이언트) → 품질 저하 시 2차 Gemini API 폴백
- **BYOK**: 사용자가 본인 Gemini 키를 직접 입력해 성능 개선 (우리 가족 전용, 사용량 제한 없음)
- 순수 정적 서버리스 HTML (서버 함수 없음, 키는 본인 기기 localStorage)
- 레퍼런스: 영어 단어 학습 앱 https://voca-study-mu.vercel.app/ (lsmsonic/voca-study)
- 환경: GitHub(lsmsonic/-dictation) + Vercel

## CLOVA 음성 키 (사용자 입력 방식)
CLOVA Voice 키는 **앱 설정(⚙️)에서 사용자가 직접 입력**한다(Client ID/Secret). 키는 그 기기 localStorage에만 저장되고, 음성 생성 요청 때만 서버 함수 `api/tts.mjs`(CORS 우회 프록시)를 거쳐 네이버로 전달된다. **코드·배포물·서버 env에는 키를 두지 않는다.**

- 키 미입력 시 앱은 애플(Yuna) 음성으로 동작.
- (선택) 운영자가 공용으로 쓰고 싶으면 Vercel env `NCP_CLOVA_VOICE_KEY_ID` / `NCP_CLOVA_VOICE_KEY` 를 폴백으로 둘 수도 있으나, 기본 설계는 사용자 입력이다.

## 문서
- [개발 계획 초안](docs/개발계획-초안.md)

## 상태
초안 단계 — 착수 전 결정 사항 검토 중 (개발 계획 7장 참조).
