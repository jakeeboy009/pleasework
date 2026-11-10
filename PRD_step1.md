# [PRD] 1단계: 냉장고 이미지 업로드 및 AI 식재료 인식 (Image Recognition)

## 1. 개요 (Overview)
- **문서 버전**: v1.0.0
- **프로젝트명**: AI 냉장고 파먹기 (Fridge Recipe AI) - 반응형 웹앱
- **단계명**: 1단계 - 냉장고 이미지 입력 및 식재료 자동 인식/구조화
- **핵심 목표**: 사용자가 모바일 또는 데스크톱 환경에서 냉장고 사진을 업로드(또는 카메라 촬영)하면, OpenRouter API의 `google/gemma-4-26b-a4b-it:free` 모델을 통해 사진 속 식재료를 시각적으로 분석·인식하고, 정형화된 JSON 데이터로 변환하여 사용자가 검토·수정할 수 있는 화면을 제공한다.

---

## 2. 사용자 여정 (User Journey)
1. 사용자가 웹앱에 접속하여 첫 화면(랜딩/업로드 화면)을 본다.
2. 모바일에서는 카메라 촬영 버튼이나 갤러리 선택 버튼을 누르고, 데스크톱에서는 이미지 드래그 앤 드롭 또는 파일 탐색기를 통해 냉장고 내부 사진을 등록한다.
3. 이미지 미리보기(Preview)가 노출되며, 이미지 크기/용량이 클라이언트에 의해 자동으로 압축된다.
4. "식재료 분석 시작" 버튼을 클릭하면 로딩 상태(스켈레톤 UI, 분석 중 안내 문구)가 표시된다.
5. OpenRouter API(`google/gemma-4-26b-a4b-it:free`)를 통해 식재료 목록 및 카테고리가 추출된다.
6. 분석 완료 후, 감지된 식재료가 인터랙티브한 태그(Chip) 형태로 표시되며, 사용자는 오인식된 재료를 삭제하거나 누락된 재료를 직접 타이핑하여 추가할 수 있다.
7. 확정된 재료 목록을 가지고 "2단계: 레시피 추천받기" 버튼을 누를 수 있는 상태가 된다.

---

## 3. 기능적 요구사항 (Functional Requirements)

### 3.1. 이미지 입력 및 전처리 (Client-Side)
- **입력 방식 지원**:
  - 모바일 디바이스: 카메라 즉시 촬영 (`<input type="file" accept="image/*" capture="environment">`) 지원.
  - 공통: 로컬 이미지 파일 선택 (JPG, PNG, WEBP, HEIC/HEIF 등).
  - 데스크톱: 드래그 앤 드롭(Drag & Drop) 영역 제공.
- **이미지 미리보기 및 유효성 검사**:
  - 허용 확장자: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`
  - 최대 단일 파일 크기: 업로드 원본 최대 20MB.
  - 클라이언트 사이드 리사이징/압축:
    - OpenRouter API 전송 및 네트워크 최적화를 위해 브라우저 단에서 Canvas/압축 라이브러리(e.g., `browser-image-compression`)를 사용해 최대 해상도 1280x1280, JPEG 품질 0.8 이하, 1MB 미만으로 압축 후 Base64 Data URL로 변환.
- **재업로드 / 교체 / 삭제**:
  - 미리보기 상태에서 이미지를 삭제하거나 다른 사진으로 즉시 교체 가능.

### 3.2. OpenRouter API 연동 및 AI 비전 분석 (Backend/Serverless Proxy)
- **보안 요구사항**:
  - OpenRouter API Key는 클라이언트에 절대 노출되지 않도록 Next.js Route Handler / Express 서버 등 백엔드 프록시 엔드포인트(`POST /api/analyze-ingredients`)를 통해 호출.
- **사용 모델**: `google/gemma-4-26b-a4b-it:free`
- **호출 구조**:
  - OpenRouter Chat Completions 엔드포인트 (`https://openrouter.ai/api/v1/chat/completions`)
  - Multimodal Vision 메시지 구조 (Base64 data URL 지원).
  - System Prompt: 식재료 전문 인식기 역할 부여, 순수 JSON 스키마 반환 강제.
- **에러 핸들링 및 Fallback**:
  - 무료 티어(`:free`) 특성상 발생할 수 있는 Rate Limit(429), Model Overloaded(503), 응답 지연(Timeout: 30초 설정)에 대비한 재시도(Exponential Backoff 1회) 및 사용자 친화적 에러 메시지 반환.
  - Gemma 모델이 마크다운 코드블록(```json ... ```)을 포함하여 응답할 경우를 대비한 JSON 정제 파서 구현.

### 3.3. 식재료 검토 및 편집 UI
- **인식 결과 시각화**:
  - 카테고리별 분류 탭 또는 배지: 신선채소/과일, 육류/어패류, 유제품/계란, 가공식품/반찬, 양념/소스류, 기타.
  - 각 재료 아이템별 태그(Chip) 컴포넌트: 이름, 예상 신선도/상태, 삭제(X) 버튼.
- **수동 편집 기능**:
  - 오인식된 재료의 단일 클릭 삭제.
  - 텍스트 입력 인풋창을 통해 누락된 재료 직접 검색/입력 및 엔터(Enter)로 추가.
  - 재료 수량 또는 보관 상태(냉장/냉동/실온) 간이 토글(선택 사항).
- **상태 보존**:
  - 1단계에서 확정된 재료 리스트는 전역 상태 관리(Zustand, React Context 등) 또는 세션 스토리지에 저장되어 2단계로 매끄럽게 전달.

---

## 4. 기술 스택 및 아키텍처 (Technical Specifications)

### 4.1. 권장 기술 스택
- **Framework**: Next.js 14+ (App Router, TypeScript) 또는 React + Vite + Tailwind CSS
- **Styling**: Tailwind CSS, Shadcn UI / Lucide-react (반응형 모바일 우선 UI 컴포넌트)
- **State Management**: Zustand (클라이언트 단계별 데이터 및 세션 상태 유지)
- **API Client**: Fetch / Axios
- **이미지 압축**: `browser-image-compression`

### 4.2. API 데이터 명세

#### [Client → Server Proxy] `POST /api/analyze-ingredients`
- **Request Body**:
  ```json
  {
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
  }
  ```

#### [Server Proxy → OpenRouter API]
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Headers**:
  - `Authorization: Bearer ${OPENROUTER_API_KEY}`
  - `HTTP-Referer: ${SITE_URL}` (OpenRouter 필수 권장 헤더)
  - `X-Title: Fridge Recipe AI`
  - `Content-Type: application/json`
- **Request Payload**:
  ```json
  {
    "model": "google/gemma-4-26b-a4b-it:free",
    "messages": [
      {
        "role": "system",
        "content": "당신은 냉장고 사진을 보고 식재료를 식별하는 식재료 분석 전문가입니다. 주어진 이미지를 분석하여 식별 가능한 식재료 목록을 반드시 아래 JSON 형식으로만 응답하세요. 백틱(```json)이나 다른 설명 텍스트 없이 유효한 JSON 문자열만 출력해야 합니다.\n\n{\n  \"ingredients\": [\n    {\n      \"name\": \"재료명 (한국어)\",\n      \"category\": \"채소 | 과일 | 육류 | 수산물 | 유제품 | 가공/기타 | 양념/소스\",\n      \"confidence\": \"high | medium | low\",\n      \"quantity\": \"대략적인 추정 수량(예: 1개, 반쪽, 약간 등, 불확실하면 생략)\"\n    }\n  ],\n  \"note\": \"사진 상태(조명, 가려짐 등)에 대한 짧은 참고사항\"\n}"
      },
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "이 냉장고 사진에서 보이는 모든 식재료를 남김없이 식별해서 JSON 형식으로 알려줘."
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/jpeg;base64,..."
            }
          }
        ]
      }
    ],
    "temperature": 0.2,
    "max_tokens": 1500
  }
  ```

#### [Server Proxy → Client] 응답 포맷
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "ingredients": [
        { "id": "uuid-1", "name": "양파", "category": "채소", "confidence": "high", "quantity": "2개" },
        { "id": "uuid-2", "name": "달걀", "category": "유제품", "confidence": "high", "quantity": "6알" },
        { "id": "uuid-3", "name": "대파", "category": "채소", "confidence": "medium", "quantity": "1단" },
        { "id": "uuid-4", "name": "돼지고기 목살", "category": "육류", "confidence": "high", "quantity": "1팩" }
      ],
      "note": "신선실 서랍 내부 재료 일부가 음영으로 가려져 있을 수 있습니다."
    }
  }
  ```

---

## 5. UI/UX 및 반응형 디자인 가이드라인

### 5.1. 모바일 뷰 (Mobile First, 360px ~ 768px)
- 한 손 조작이 용이하도록 주요 액션 버튼(카메라 촬영, 업로드, 다음 단계)을 하단 고정(Bottom Sticky Bar) 형태로 배치.
- 칩(Chip) 태그는 가로 스크롤 또는 유연한 Flex-Wrap으로 정렬하여 좁은 화면에서도 가독성 확보.
- 모달이나 바텀 시트(Bottom Sheet)를 활용하여 재료 수동 추가 시 키보드가 올라와도 UI가 깨지지 않도록 설계.

### 5.2. 데스크톱 뷰 (769px ~ 1440px+)
- 2단 분할 레이아웃(Split View):
  - 좌측: 업로드된 냉장고 원본 사진 확대/축소 및 확인 영역.
  - 우측: 추출된 식재료 태그 목록 및 카테고리별 필터, 수동 추가 인풋.
- 드래그 앤 드롭 시 시각적 피드백(보더 강조, 오버레이 효과).

### 5.3. 상태별 UI 피드백
- **Empty State**: 친절한 일러스트/아이콘과 함께 "냉장고 사진을 올려주시면 식재료를 찾아드릴게요!" 문구 표시.
- **Loading State**: Gemma 4 26B 모델 처리 시간(약 3~7초 소요 예상) 동안 재료를 찾는 애니메이션(스캐닝 효과) 및 "AI가 냉장고 속 재료를 찾는 중입니다..." 프로그레스 표시.
- **Error State**: 흐릿하거나 인식이 불가능한 사진일 경우 재촬영 팁(빛이 충분한 곳에서 열린 문 전체가 보이도록 촬영) 안내.

---

## 6. 비기능적 요구사항 (Non-Functional Requirements)
1. **보안 & 개인정보**: 사용자가 업로드한 이미지는 서버 영구 저장소에 저장하지 않고 메모리 상에서 API 요청 처리 후 즉시 휘발 처리(Stateless).
2. **응답성 & 최적화**: 클라이언트 이미지 압축을 통해 업로드 페이로드 크기를 1MB 이하로 제한하여 3G/LTE 환경에서도 원활하게 전송.
3. **가용성**: OpenRouter 무료 엔드포인트 불안정 시 사용자에게 명확한 에러 토스트(Toast) 메시지 노출 및 즉시 재시도 버튼 제공.

---

## 7. 완료 기준 (Definition of Done, DoD)
- [ ] 모바일/PC 환경에서 이미지 파일 업로드 및 카메라 촬영이 정상 작동하는가?
- [ ] 1MB 이하로 클라이언트 압축이 이루어져 OpenRouter API로 정상 전달되는가?
- [ ] `google/gemma-4-26b-a4b-it:free` 모델로부터 식재료 JSON 데이터를 안정적으로 파싱해오는가?
- [ ] 추출된 식재료 목록을 화면에 렌더링하고, 사용자가 삭제 및 신규 재료 추가를 할 수 있는가?
- [ ] 확정된 재료 리스트가 상태 저장소에 보관되어 2단계로 전달될 준비가 완료되었는가?
