# [PRD] 3단계: 사용자 프로필 및 맞춤형 레시피 보관함 (User Profile & Recipe Bookmarks)

## 1. 개요 (Overview)
- **문서 버전**: v1.0.0
- **프로젝트명**: AI 냉장고 파먹기 (Fridge Recipe AI) - 반응형 웹앱
- **단계명**: 3단계 - 사용자 프로필(개인화 설정) 및 레시피 북마크/보관함 구축
- **핵심 목표**: 사용자 인증 및 프로필 관리 시스템을 도입하여, 2단계에서 생성된 맞춤형 레시피를 개인 보관함에 영구 저장·관리할 수 있게 한다. 또한 알레르기, 기피 재료, 상시 보유 기본 양념 목록 등 사용자 프로필 설정을 1~2단계 레시피 생성 파이프라인에 자동으로 연계하여 고도화된 개인 맞춤형 서비스를 완성한다.

---

## 2. 사용자 여정 (User Journey)
1. **회원가입 / 로그인 / 게스트 온보딩**:
   - 사용자는 간편 소셜 로그인(Google, Kakao) 또는 이메일 로그인으로 가입한다.
   - 비로그인(게스트) 사용자도 브라우저 로컬스토리지 기반으로 1~2단계 및 간이 저장을 체험할 수 있으며, 로그인 시 기존 저장 데이터가 계정으로 자동 동기화(Migration)된다.
2. **프로필 설정 (최초 온보딩 및 마이페이지)**:
   - 사용자는 자신의 식습관 정보를 설정한다:
     - 알레르기 식재료 (예: 갑각류, 땅콩, 메밀 등)
     - 기피/불호 식재료 (예: 오이, 고수 등)
     - 집에 항상 구비되어 있는 기본 양념류 (간장, 설탕, 고추장, 된장, 식용유, 마늘 등)
     - 1회 요리 기준 인원수 (기본 1인분, 2인분 등)
3. **레시피 북마크 저장**:
   - 2단계 결과 화면에서 레시피 카드나 상세 모달의 '북마크 아이콘(저장하기)'을 클릭한다.
   - 즉시 저장 완료 토스트 알림이 뜨며, 원할 경우 폴더 선택 또는 나만의 메모(예: "주말 저녁에 해볼 것")를 남길 수 있다.
4. **내 레시피 보관함 (마이페이지/저장 목록)**:
   - 상단/하단 네비게이션의 "내 레시피" 탭으로 이동한다.
   - 자신이 저장한 레시피 목록을 카드 그리드 또는 리스트 형태로 열람한다.
   - 키워드 검색, 태그 필터(자주 한 요리, 15분 컷, 안주 등), 조리 시간순/최신순 정렬을 수행한다.
   - 요리를 직접 만들어 본 후 별점(Rating)과 조리 후기 메모를 수정/저장한다.
   - 외부 공유(SNS 링크 복사, 카카오톡 공유) 또는 불필요해진 레시피 삭제가 가능하다.
5. **개인화 연동**:
   - 프로필이 등록된 사용자가 다시 1단계(사진 분석) 및 2단계(레시피 생성)를 실행하면, 프로필의 알레르기/기피 재료가 프롬프트에 자동 배제 조건으로 들어가고, 보유 양념류가 기본 반영되어 레시피가 생성된다.

---

## 3. 기능적 요구사항 (Functional Requirements)

### 3.1. 인증 및 사용자 관리 (Authentication)
- **인증 방식**:
  - OAuth 2.0 소셜 로그인 (Google, Kakao) 권장 (NextAuth.js / Supabase Auth / Firebase Auth).
  - 이메일/비밀번호 간편 가입 및 비밀번호 재설정.
  - **게스트 모드 지원**: 로그인하지 않아도 IndexedDB 또는 LocalStorage에 최대 5개까지 레시피 저장 가능, 로그인 시 계정 DB로 이전 유도.
- **세션 유지 및 보안**:
  - JWT 기반의 안전한 세션 쿠키 관리(HttpOnly, Secure, SameSite).

### 3.2. 사용자 프로필 및 식생활 선호 설정
- **기본 프로필 필드**:
  - 닉네임, 프로필 이미지, 이메일.
- **식습관/헬스케어 개인화 설정**:
  - **알레르기 필터 (Allergies)**: 견과류, 갑각류, 조개류, 유당, 메밀, 대두, 밀가루, 계란 등 (다중 선택 + 직접 입력).
  - **기피 재료 (Disliked Ingredients)**: 오이, 가지, 고수, 당근 등 (자유 태그 입력).
  - **상시 보유 양념장 (Pantry Spices & Sauces)**:
    - 체크리스트 UI: 식용유, 참기름, 진간장, 국간장, 고추장, 된장, 고춧가루, 설탕, 소금, 후추, 다진마늘, 식초, 올리고당, 굴소스, 마요네즈, 케첩 등.
  - **기본 가구 인원수**: 1인, 2인, 3~4인, 5인 이상.
- **1·2단계 자동 파이프라인 주입**:
  - 2단계 `POST /api/generate-recipes` 요청 시, 서버 세션에서 해당 유저의 프로필 정보를 읽어 `allergies`, `disliked`, `pantry`를 OpenRouter 시스템/유저 프롬프트에 자동 병합.

### 3.3. 레시피 보관함 (Recipe Bookmarks & Collections)
- **저장/북마크 기능**:
  - 레시피의 전체 JSON 스냅샷(제목, 요약, 재료, 단계별 순서, 셰프 팁, 사용된 식재료 사진 썸네일 등)을 저장하여 원본 모델이 바뀌거나 삭제되어도 보존.
- **메모 및 평점 (Notes & Rating)**:
  - 직접 요리해 본 후 별점(1~5점) 부여.
  - 개인 코멘트(예: "간장을 반 스푼 덜 넣으니 딱 맞음!") 저장.
- **폴더/태그 관리**:
  - 기본 폴더: '전체', '자주 만드는 요리', '주말 특식'.
  - 커스텀 태그 생성 및 분류 기능.
- **검색 및 정렬**:
  - 요리명, 사용된 재료명 검색.
  - 정렬 옵션: 최신 저장순, 별점 높은순, 조리 시간 짧은순.
- **공유 및 내보내기**:
  - 웹 공유 API (`navigator.share`) 연동으로 모바일에서 카카오톡/메시지로 레시피 링크 즉시 전송.
  - 텍스트 요약본 클립보드 복사.

---

## 4. 데이터베이스 모델 및 기술 아키텍처

### 4.1. 권장 백엔드 & DB 스택
- **DB & Auth**: Supabase (PostgreSQL + Built-in Auth) 또는 Prisma + PostgreSQL / MongoDB
- **상태 관리**: TanStack Query (React Query) - 캐싱, 낙관적 업데이트(Optimistic Update)로 저장 버튼 반응 속도 극대화.

### 4.2. 데이터베이스 스키마 설계 (ERD / Relational Schema)

```sql
-- 1. 사용자 프로필 및 취향 테이블
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  allergies TEXT[] DEFAULT '{}',         -- e.g. ['갑각류', '땅콩']
  disliked_ingredients TEXT[] DEFAULT '{}', -- e.g. ['오이', '고수']
  pantry_items TEXT[] DEFAULT '{}',     -- e.g. ['간장', '설탕', '식용유', '고추장']
  default_servings INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 저장된 레시피 테이블
CREATE TABLE saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  summary TEXT,
  cooking_time_minutes INT NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  servings VARCHAR(20),
  recipe_data JSONB NOT NULL,            -- 재료, 단계별 조리과정 전체 구조체 보관
  rating INT CHECK (rating >= 1 AND rating <= 5),
  user_note TEXT,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_saved_recipes_user_id ON saved_recipes(user_id);
CREATE INDEX idx_saved_recipes_tags ON saved_recipes USING GIN(tags);
```

### 4.3. API 엔드포인트 명세

#### [GET] `/api/profile`
- 현재 로그인한 사용자의 프로필, 알레르기, 양념장 목록 조회.

#### [PUT] `/api/profile`
- 프로필 정보 업데이트 (알레르기 추가, 보유 양념 체크리스트 수정 등).

#### [GET] `/api/recipes/saved`
- **Query Params**: `?search=대파&tag=한식&sort=latest&page=1`
- 저장된 레시피 목록 페이지네이션 반환.

#### [POST] `/api/recipes/saved`
- **Request Body**:
  ```json
  {
    "title": "대파 목살 덮밥",
    "summary": "달큰한 대파 기름에 목살을 볶아 얹은 덮밥",
    "cookingTimeMinutes": 20,
    "difficulty": "쉬움",
    "servings": "1인분",
    "recipeData": { /* 2단계에서 생성된 full JSON */ },
    "tags": ["덮밥", "초간단"],
    "userNote": "대파 많이 넣을 것!"
  }
  ```

#### [DELETE] `/api/recipes/saved/:id`
- 저장된 특정 레시피 삭제.

#### [PATCH] `/api/recipes/saved/:id`
- 별점, 메모, 태그, 즐겨찾기(`isFavorite`) 수정.

---

## 5. UI/UX 및 반응형 디자인 가이드라인

### 5.1. 모바일 뷰 (Mobile First)
- **하단 글로벌 네비게이션 바(Bottom Nav)**:
  - [냉장고 찍기(홈)] / [추천 레시피] / [내 레시피 보관함] / [마이페이지(설정)]
- **원터치 북마크 애니메이션**:
  - 레시피 카드 상단의 하트/북마크 아이콘 터치 시 햅틱 진동 피드백(지원 브라우저) 및 부드러운 스케일 업 애니메이션.
- **슬라이드 투 딜리트(Swipe to Delete)**:
  - 모바일 목록에서 좌측 스와이프 시 간편 삭제/보관 액션 노출.

### 5.2. 데스크톱 뷰
- **사이드바 + 콘텐츠 영역 대시보드 레이아웃**:
  - 좌측: 프로필 요약 카드, 보관함 카테고리/태그 목록, 기본 양념장 바로가기.
  - 우측: 저장된 레시피 카드 그리드(3~4열), 상단 검색창 및 다중 필터 드롭다운.

### 5.3. 빈 상태 (Empty States)
- 저장된 레시피가 없을 때: "아직 저장된 레시피가 없어요! 냉장고 사진을 찍고 나만의 황금 레시피를 보관해 보세요." 문구와 함께 [1단계: 사진 찍으러 가기] CTA 버튼 노출.

---

## 6. 보안, 개인정보 및 신뢰성 요건
1. **Row Level Security (RLS)**:
   - 데이터베이스 수준에서 사용자 본인의 레시피 및 프로필 데이터만 접근(SELECT/INSERT/UPDATE/DELETE)할 수 있도록 RLS 정책 엄격 적용.
2. **개인 건강 정보(알레르기) 취급**:
   - 알레르기 정보는 식품 안전과 직결되므로 변경 시 즉시 캐시를 무효화(Cache Invalidation)하여 다음 레시피 생성 시 100% 반영 보장.
3. **오프라인 지원 (PWA 대비)**:
   - 저장된 레시피 데이터는 서비스 워커(Service Worker) 또는 IndexedDB 캐싱을 통해 인터넷 연결이 불안정한 주방 환경에서도 열람 가능하도록 지원.

---

## 7. 완료 기준 (Definition of Done, DoD)
- [ ] 소셜 로그인(또는 이메일 간편인증) 및 게스트 모드에서 계정 전환이 매끄럽게 동작하는가?
- [ ] 프로필 화면에서 알레르기, 기피 재료, 상시 보유 양념 목록을 등록/수정/저장할 수 있는가?
- [ ] 프로필에 저장된 식습관 데이터가 2단계 레시피 생성 프롬프트에 자동으로 올바르게 반영되는가?
- [ ] 2단계에서 생성된 레시피를 1클릭으로 내 보관함에 저장할 수 있는가?
- [ ] 저장된 레시피 보관함에서 검색, 필터링, 정렬, 상세 조회, 삭제가 모바일/PC 반응형 환경에서 정상 작동하는가?
- [ ] 레시피에 개인 메모 및 별점을 기록하고 업데이트할 수 있는가?
