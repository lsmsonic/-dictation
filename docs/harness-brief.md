# 받아쓰기 마스터 — 하네스 구성 브리프

> myharness(하네스 팩토리) 실행 시 Phase 1(도메인 분석) 입력으로 사용. 이 프로젝트 디렉토리에서 "하네스 구성해줘"를 트리거하면 팩토리가 이 문서를 참고해 에이전트 팀 + 스킬을 생성한다.

## 1. 도메인 요약
- **제품:** 촬영 이미지에서 받아쓰기 문장(띄어쓰기·문장부호 포함)을 인식해 **학습모드/시험모드**로 작동하는 순수 정적 서버리스 웹앱.
- **운영 모델:** 우리 가족 전용 · BYOK(각자 본인 키 입력) · 사용량 제한/공유키 없음 · 이미지 무보관 · 한국어 전용.
- **현황:** MVP 구현 완료 + 브라우저 검증 통과. 라이브 https://dictation-master-one.vercel.app

## 2. 기술 스택 / 아키텍처 제약 (하네스가 반드시 인지)
- **단일 `index.html`** (~83KB, HTML+CSS+JS 전부 인라인) 자기완결형 구조. 빌드 도구 없음.
- **서버리스 함수:** `api/tts.mjs`(Vercel, ESM 필수 — `.js`는 CJS로 깨짐) — CLOVA TTS 프록시(BYOK, 키 미저장/미로깅).
- **CDN 고정 + SRI:** tesseract.js@5.1.1, canvas-confetti@1.9.3.
- **배포:** Vercel 정적 + 서버 함수. `vercel.json`에 CSP·보안헤더.
- GitHub origin: lsmsonic/-dictation.

## 3. 핵심 작업 영역 (에이전트 분리 후보)
| 영역 | 내용 | 난이도 |
|------|------|--------|
| OCR 파이프라인 | Tesseract(kor) 1차 → 품질 저하 시 Gemini BYOK 폴백, 이미지 압축, 문장 단위 검수·편집 | 중 |
| 채점 엔진 | 시험모드 주관식 전용, 글자·띄어쓰기·문장부호 **완전 일치**, LCS 글자단위 diff(빨강밑줄/취소선/␣) | 중 |
| TTS/오디오 | 엔진 3종: apple(기본·오프라인·Yuna 강제) / clova(권장·한국어·속도조절O) / gemini(BYOK·속도조절X). IndexedDB 영구캐싱(L1메모리+L2 dm_tts_cache). **Gemini 배치(전체 1요청→무음 분할 splitAudioBySilence→문장별 저장)** RPD 한도 우회 | **상(최고 복잡)** |
| UI/UX | 화면전환(goToScreen), 업로드/검수UI, 결과 점수링·오답복습, localStorage 보관함, 설정 모달 | 중 |
| 보안 | **BYOK 맥락 핵심 리스크 = XSS→키 탈취.** 모든 표시 텍스트 escapeHtml + CSP/SRI 철저, 키 password·삭제버튼·외부전송 금지 | 상(필수) |

## 4. 권장 하네스 형태 (팩토리 Phase 2 시작점 — 확정 아님)
- **도메인 등급:** 코드 경량 (단일 파일·가역) → **기본 슬림 경로**. 내부 QA 필수, 외부 리뷰·TDD·평가 루프는 생략 가능.
- **실행 모드:** 에이전트 팀(2명+ 협업). 파이프라인 + 생성-검증 하이브리드.
- **에이전트 후보(3~4명, 집중형):**
  1. `frontend-builder` — 단일 index.html 바닐라 JS 인라인 구현/수정 (UI·화면전환·보관함)
  2. `audio-tts-specialist` — TTS 3엔진·IndexedDB 캐싱·Gemini 배치 무음분할 (도메인 최난이도)
  3. `ocr-grading-specialist` — OCR 파이프라인 + 완전일치 채점·diff
  4. `security-qa` — escapeHtml/CSP/SRI/BYOK 키 안전 검증 + 경계면 교차 QA (general-purpose 타입)
- **교리 주입:** 코드 에이전트(1~4 전원)에 dev-rules 주입. 시큐어코딩/OWASP 관점은 security-qa에 강화.

## 5. 외부 리뷰어 환경 (점검 결과 2026-06-21)
- RUNNER=claude / **REVIEWERS: agy** (codex·gemini 미설치 → 저하 모드 1개만 가능).
- 코드 경량 도메인이라 외부 리뷰는 선택. 필요 시 agy 단독 저하 모드로 external-review-loop 생성 가능.

## 6. 누락 의존성 (선택 설치)
- `gtimeout`/`timeout` 미설치 → 대규모 fan-out 백프레셔 타임아웃 제어에 사용. 소규모 팀(3~4명)이라 필수 아님. 필요 시 `brew install coreutils`.
- `codex` 미설치 → 듀얼 런타임 원하면 Codex CLI 설치 후 `install.sh`. 현재는 Claude Code 단독.
