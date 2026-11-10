# 🧊 AI 냉장고 파먹기 (Fridge Recipe AI)

> **냉장고 속 재료 사진 한 장으로 시작하는 똑똑한 식재료 인식 & 맞춤형 요리 추천 웹 애플리케이션**  
> OpenRouter의 최신 비전·언어 AI 모델(`google/gemma-4-26b-a4b-it:free`)과 Vercel 서버리스 아키텍처를 기반으로 구축되었습니다.

---

## ✨ 핵심 기능 (3단계 파이프라인)

### 📸 1단계: 냉장고 사진 업로드 및 AI 식재료 자동 인식
- **모바일/PC 지원**: 스마트폰 카메라 즉시 촬영, 파일 업로드, 데스크톱 드래그 앤 드롭 지원.
- **클라이언트 이미지 압축**: Canvas API를 통해 원본 사진을 1280px 해상도, 1MB 미만 Base64로 자동 압축하여 모바일 데이터 절약 및 응답 속도 최적화.
- **OpenRouter Gemma 4 26B 비전 모델**: 사진 속 식재료를 시각적으로 감지하여 카테고리별 컬러 태그(Chip)로 정형화.
- **인터랙티브 태그 편집**: 잘못 인식된 재료는 ✕ 버튼으로 삭제하고, 빠진 재료는 직접 입력해 추가 가능.

### 🍳 2단계: 조건 맞춤형 황금 레시피 추천 및 조리 가이드
- **맞춤 요리 필터**: 조리 시간(15분 컷/30분/1시간), 난이도(쉬움/보통/어려움), 요리 스타일(한식/양식/일식·중식/간편식/다이어트), 추가 재료 허용 범위 선택.
- **AI 3선 레시피 생성**: 냉장고 재료를 최대로 활용하는 실현 가능한 요리 레시피 3가지를 자동 생성.
- **상세 조리 모달 (Bottom Sheet)**:
  - 🛒 **준비 재료 체크리스트**: 보유 재료와 추가 양념을 2열로 분리 제공.
  - 👩‍🍳 **단계별 조리 순서**: 체크 완료 토글 및 조리 주의점 팁.
  - 👨‍🍳 **셰프의 특급 팁**: 요리의 풍미를 극대화하는 비법 노하우.
  - ⏲️ **인터랙티브 간이 조리 타이머**: +1분, +3분, +5분 카운트다운 타이머 탑재.

### ⭐ 3단계: 사용자 식생활 프로필 & 레시피 북마크 보관함
- **초개인화 프로필 설정**:
  - 🚫 **알레르기 식재료 (8종 + 직접입력)**: 레시피 생성 시 100% 자동 배제.
  - ❌ **기피 식재료**: 원하지 않는 재료 제외.
  - 🧂 **주방 상비 양념 (14종)**: 집에 항상 있는 양념을 우선 활용하도록 AI 프롬프트에 주입.
- **레시피 북마크 보관함**:
  - 원클릭 레시피 저장 및 오프라인 영구 보존 (`localStorage` 기반 게스트 모드).
  - 나만의 별점(★ 1~5점) 평가 및 요리 메모 작성 기능.
  - 실시간 요리명/재료 검색 지원.

---

## 🛠️ 기술 스택 (Technology Stack)

본 프로젝트는 **AGENTS.md 지침서**에 따라 복잡한 프레임워크나 빌드 도구 없이 순수 웹 표준 기술로 작성되었습니다:

- **프런트엔드**: Pure HTML5, Vanilla CSS3, Vanilla JavaScript (ES6+)
- **백엔드 / API**: Vercel Serverless Functions (`api/*.js` - Node.js 표준)
- **AI 연동 엔진**: OpenRouter API (`google/gemma-4-26b-a4b-it:free`)
- **로컬 개발 서버**: 외부 의존성(0개) 없는 순수 Node.js 경량 개발 서버 (`server.js`)

---

## 🚀 로컬 실행 방법 (Local Getting Started)

### 1. 사전 준비 (Prerequisites)
- [Node.js](https://nodejs.org/) v18 이상 설치

### 2. OpenRouter API 키 발급 및 설정
1. [OpenRouter](https://openrouter.ai/keys)에서 무료 API 키를 발급받습니다.
2. 프로젝트 루트의 `.env.local` 파일을 열고 발급받은 키를 입력합니다:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-당신의_API_키_입력
   OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
   ```

### 3. 로컬 서버 실행
별도의 패키지 설치(`npm install`) 없이 바로 실행할 수 있습니다:

```powershell
# 프로젝트 폴더로 이동 후 실행
node server.js
# 또는
npm start
```

터미널에 다음 메시지가 출력되면 준비 완료입니다:
```text
====================================================
🧊 AI 냉장고 파먹기 로컬 서버가 실행되었습니다!
👉 접속 주소: http://localhost:3000
====================================================
```

### 4. 웹 브라우저 접속
크롬(Chrome), 엣지(Edge), 사파리(Safari) 등의 브라우저를 열고 `http://localhost:3000`에 접속합니다.

---

## 🌐 Vercel 무료 배포 방법 (Deployment)

본 프로젝트는 Vercel 서버리스 규격에 맞춰 제작되었으므로 1분 안에 전 세계로 배포할 수 있습니다:

### 방법 1: Vercel CLI로 즉시 배포
```powershell
# Vercel 로그인 및 배포
npx vercel

# 프로덕션 배포
npx vercel --prod
```
> 배포 후 Vercel 대시보드 `Settings -> Environment Variables`에 `OPENROUTER_API_KEY`를 등록해 주세요.

### 방법 2: GitHub 연동 자동 배포
1. 본 프로젝트 폴더를 본인의 GitHub 저장소에 푸시(Push)합니다.
2. [Vercel 대시보드](https://vercel.com/)에서 `Add New... -> Project`를 선택하고 GitHub 저장소를 가져옵니다.
3. 환경 변수(Environment Variables) 항목에 `OPENROUTER_API_KEY`를 추가하고 **Deploy**를 클릭합니다.

---

## 📁 디렉토리 구조

```text
fridge프로젝트/
├── .env.local             # OpenRouter API 키 (로컬 환경변수, git 추적 제외)
├── .env.example           # 환경변수 템플릿
├── .gitignore             # Git 제외 파일 목록
├── AGENTS.md              # AI 에이전트 개발 지침서
├── README.md              # 프로젝트 안내서 (본 문서)
├── PRD_step1.md           # 1단계 요구사항 명세서 (이미지 인식)
├── PRD_step2.md           # 2단계 요구사항 명세서 (레시피 생성)
├── PRD_step3.md           # 3단계 요구사항 명세서 (프로필 및 보관함)
├── package.json           # 로컬 실행 스크립트 정의
├── vercel.json            # Vercel 라우팅 설정
├── server.js              # 의존성 없는 로컬 개발용 Node.js 서버
├── index.html             # 메인 단일 반응형 페이지
├── style.css              # 모바일 퍼스트 반응형 스타일시트
├── script.js              # 1~3단계 프런트엔드 비즈니스 로직
└── api/
    ├── analyze-image.js   # [1단계] 이미지 분석 & 식재료 JSON 추출 서버리스 함수
    ├── generate-recipe.js # [2단계+3단계] 프로필 맞춤 레시피 생성 서버리스 함수
    └── storage.js         # [3단계] 사용자 프로필 및 북마크 저장소 서버리스 함수
```

---

## 📄 라이선스 (License)
MIT License. 자유롭게 수정하고 활용할 수 있습니다.
