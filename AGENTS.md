# AI 에이전트 개발 지침서 (AGENTS.md)

이 문서는 **"AI 냉장고 파먹기 (Fridge Recipe AI)"** 프로젝트를 개발하는 모든 AI 에이전트가 반드시 준수해야 하는 핵심 지침과 운영 규칙을 정의합니다. `PRD_step1.md`, `PRD_step2.md`, `PRD_step3.md`의 요구사항을 구현할 때 본 지침서를 최우선 기준으로 따릅니다.

---

## 📌 핵심 운영 원칙 6가지 (Core Rules)

### 1. 기술 스택 제약 (순수 웹 기술 + Vercel 서버리스)
- **프런트엔드**: 순수 **HTML5, CSS3, Vanilla JavaScript**만을 사용합니다.
  - 진입점 파일: `index.html`, 스타일: `style.css`, 메인 로직: `script.js`
  - **React, Vue, Next.js, Webpack, Vite 등의 프레임워크나 빌드 도구는 절대 사용하지 않습니다.**
  - 복잡한 컴포넌트 라이브러리 대신 표준 DOM API, Fetch API, CSS Flex/Grid 및 반응형 미디어 쿼리를 사용합니다.
- **백엔드/API**: **Vercel 서버리스 함수 (`api/*.js`)**만을 사용합니다.
  - Node.js 순수 환경(CommonJS 또는 ES Modules)으로 작성하며, 별도의 컴파일/번들링 없이 실행 가능해야 합니다.

### 2. OpenRouter API 호출 규칙
- **호출 위치**: OpenRouter API 호출은 보안을 위해 반드시 **`api/` 폴더 안의 서버리스 함수에서만 수행**합니다. (클라이언트 `script.js`에서 직접 호출 절대 금지)
- **환경 변수**:
  - API 키: `process.env.OPENROUTER_API_KEY`
  - 모델명: `process.env.OPENROUTER_MODEL` (환경변수 미설정 시 기본값: `google/gemma-4-26b-a4b-it:free`)
- **API 호출 표준 스펙**:
  - 엔드포인트: `https://openrouter.ai/api/v1/chat/completions`
  - 헤더: `Authorization: Bearer ${process.env.OPENROUTER_API_KEY}`, `HTTP-Referer`, `X-Title` 필수 전송
  - JSON 응답 정제(Clean Markdown fence block 제거) 유틸리티 포함 필수.

### 3. 단계별 단일 기능 개발 및 검증 (One Feature at a Time)
- 한 번에 여러 기능을 몰아서 개발하지 않고, **한 번에 한 가지 기능(단위 기능)**만 점진적으로 만듭니다.
- 기능을 구현한 직후에는 **사용자가 브라우저나 로컬 환경에서 어떻게 확인하고 테스트할 수 있는지 명확한 절차**를 안내합니다.

### 4. 모든 코드 한국어 주석 필수
- 작성되거나 수정되는 모든 코드(HTML, CSS, JavaScript, Vercel 함수)에는 **알기 쉬운 한국어 주석**을 상세히 작성합니다.
- 주요 함수의 역할, 매개변수/반환값 설명, 비동기 API 통신 로직, 예외 처리 부분에 주석을 빠짐없이 기재합니다.

### 5. 환경 변수 및 Git 보안 (.env.local, .gitignore)
- 민감한 API 키와 환경 설정값은 `.env.local`에 보관합니다.
- `.env.local` 파일은 깃 저장소에 노출되지 않도록 반드시 `.gitignore`에 등록합니다.
- 프로젝트 루트에 환경변수 안내를 위한 `.env.example`을 제공합니다.

### 6. 터미널 명령 직접 실행 및 결과 설명
- 프로젝트 개발, 서버 구동, 패키지 설치, 파일 검증 등에 필요한 터미널 명령은 **AI 에이전트가 직접 실행**합니다.
- 명령 실행 후에는 **결과가 성공적인지, 어떤 변화가 일어났는지 사용자에게 알기 쉽게 설명**합니다.

---

## 📁 프로젝트 표준 디렉토리 구조

```text
fridge프로젝트/
├── .env.local             # OpenRouter API 키 및 로컬 환경변수 (gitignore 대상)
├── .env.example           # 환경변수 템플릿 가이드
├── .gitignore             # Git 추적 제외 파일 목록
├── AGENTS.md              # AI 에이전트 개발 지침서 (본 문서)
├── PRD_step1.md           # 1단계 요구사항 (이미지 인식)
├── PRD_step2.md           # 2단계 요구사항 (레시피 생성)
├── PRD_step3.md           # 3단계 요구사항 (프로필 및 보관함)
├── package.json           # Vercel 로컬 테스트 및 의존성 관리용 (최소화)
├── vercel.json            # Vercel 배포 및 rewrite 라우팅 설정
├── index.html             # 메인 단일 페이지 반응형 웹앱
├── style.css              # 모바일 퍼스트 반응형 스타일 시트
├── script.js              # 프런트엔드 UI 인터랙션 및 상태 관리
└── api/
    ├── analyze-image.js   # [1단계] 이미지 분석 및 식재료 JSON 추출 API
    ├── generate-recipe.js # [2단계] 식재료 기반 맞춤 레시피 생성 API
    └── storage.js         # [3단계] 사용자 프로필 및 레시피 저장/조회 API (게스트/로컬 스토리지 또는 DB 연동)
```

---

## 🚀 단계별 구현 로드맵 (PRD 연계)

### 📌 1단계: 냉장고 사진 업로드 및 식재료 자동 인식 (PRD_step1.md)
1. **1-1. 프런트엔드 UI 골격 생성**
   - 모바일 친화적 레이아웃 (`index.html`, `style.css`)
   - 카메라 촬영 및 이미지 업로드 컴포넌트, 미리보기 영역
2. **1-2. 클라이언트 이미지 압축 및 Base64 인코딩**
   - `script.js`에서 Canvas API를 활용해 1MB 미만(최대 1280px)으로 압축
3. **1-3. Vercel 서버리스 이미지 분석 API 구현**
   - `api/analyze-image.js`: OpenRouter `google/gemma-4-26b-a4b-it:free` 호출
   - 비전 메시지 전송 및 정형화된 식재료 JSON 파싱
4. **1-4. 식재료 태그(Chip) 편집 UI 구현**
   - 인식된 재료 태그 렌더링, 수동 삭제(X), 신규 재료 입력/추가 기능

### 📌 2단계: 식재료 기반 맞춤 레시피 생성 및 조리 가이드 (PRD_step2.md)
1. **2-1. 레시피 필터 옵션 UI**
   - 난이도, 조리시간(15/30분), 식사 유형(한식/양식/간편식) 선택 UI
2. **2-2. 레시피 생성 서버리스 API 구현**
   - `api/generate-recipe.js`: 확정된 식재료와 필터 조건을 프롬프트에 주입하여 OpenRouter 호출
   - 레시피 3가지(재료 목록, 단계별 조리법, 꿀팁) JSON 구조화 응답
3. **2-3. 레시피 카드 및 반응형 상세 조리 뷰 구현**
   - 레시피 카드 그리드/캐러셀, 조리 단계별 체크리스트 및 간이 타이머

### 📌 3단계: 사용자 프로필 및 레시피 북마크 저장 (PRD_step3.md)
1. **3-1. 사용자 식생활 프로필 관리**
   - 알레르기, 기피 재료, 상비 양념 체크리스트 UI
   - 프로필 설정을 2단계 레시피 생성 API 호출 시 자동 반영
2. **3-2. 레시피 북마크 및 보관함 기능**
   - 원클릭 레시피 저장/삭제, 개인 요리 메모 및 별점 기록
   - 로컬스토리지 기반 게스트 모드 및 확장 가능한 저장소 구조 완성

---

## 🛠️ 개발 및 로컬 실행 지침

### 로컬 개발 서버 실행 방법
Vercel 서버리스 함수(`api/*.js`)와 정적 파일(`index.html`, `style.css`, `script.js`)을 로컬에서 함께 테스트하려면 `vercel dev`를 사용합니다.

```powershell
# 1. vercel CLI를 통한 로컬 실행 (권장)
npx.cmd vercel dev --listen 3000

# 2. 또는 가벼운 Node 로컬 서버 사용 시 (serve 또는 Express 간이 래퍼)
```

모든 개발 시 위 규칙을 엄격히 준수하여 단순하고 명확하며 유지보수가 용이한 순수 웹 애플리케이션을 구축합니다.
