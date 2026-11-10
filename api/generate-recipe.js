/**
 * ==========================================================================
 * Vercel 서버리스 함수: 맞춤형 레시피 생성 API
 * 파일 경로: api/generate-recipe.js
 * ==========================================================================
 * [역할]
 * 1. 1단계에서 확정된 식재료 배열, 사용자 요리 선호도(필터), 
 *    그리고 3단계 사용자 식생활 프로필(알레르기, 기피재료, 보유양념)을 수신합니다.
 * 2. OpenRouter API를 통해 'google/gemma-4-26b-a4b-it:free' 모델을 호출합니다.
 * 3. 사용자 알레르기/기피 식재료는 100% 배제하고, 보유 양념을 적극 활용하는
 *    초개인화된 요리 레시피 3가지를 생성하여 JSON으로 반환합니다.
 */

module.exports = async function handler(req, res) {
  // POST 메소드 검증
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: '허용되지 않는 메소드입니다. POST 요청을 사용하세요.'
    });
  }

  try {
    // 1. 환경 변수에서 OpenRouter API 키 및 모델명 로드
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free';
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const siteName = process.env.SITE_NAME || 'FridgeRecipeAI';

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: '.env.local 파일에 OPENROUTER_API_KEY가 설정되어 있지 않습니다.'
      });
    }

    // 2. 요청 본문(Body) 데이터 추출 (3단계 프로필 정보 포함)
    const { ingredients = [], preferences = {}, profile = {} } = req.body || {};

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        message: '레시피를 생성할 식재료 목록이 비어 있습니다. 최소 1개 이상의 재료가 필요합니다.'
      });
    }

    // 식재료 이름 목록 추출
    const ingredientNames = ingredients.map((item) => (typeof item === 'string' ? item : item.name)).join(', ');

    // 2단계 기본 필터
    const mealType = preferences.mealType || '한 끼 식사';
    const cuisine = preferences.cuisine || '한식';
    const maxTime = preferences.maxTime || '30분 이내';
    const difficulty = preferences.difficulty || '쉬움';
    const allowExtra = preferences.allowExtra ? '추가 재료 약간 허용' : '냉장고 재료 및 기본 양념만 사용';

    // 3단계 프로필 개인화 항목 (알레르기, 기피재료, 보유양념)
    const allergies = Array.isArray(profile.allergies) && profile.allergies.length > 0 
      ? profile.allergies.join(', ') 
      : '없음';
    const disliked = Array.isArray(profile.disliked) && profile.disliked.length > 0 
      ? profile.disliked.join(', ') 
      : '없음';
    const pantry = Array.isArray(profile.pantry) && profile.pantry.length > 0 
      ? profile.pantry.join(', ') 
      : '기본 조미료(간장, 소금, 설탕, 식용유)';

    // 3. OpenRouter 시스템 및 유저 프롬프트 작성
    const systemPrompt = `당신은 대한민국 최고의 냉장고 파먹기 요리 연구가입니다.
사용자가 제공한 보유 식재료를 가장 알차게 소진할 수 있는, 실패 없고 맛있는 현실적인 레시피 3가지를 추천해야 합니다.

[🚨 절대 준수해야 할 건강 & 개인화 규칙]
1. 알레르기 유발 식재료(${allergies})와 기피 식재료(${disliked})는 레시피 주재료 및 양념에서 100% 절대 배제해야 합니다.
2. 사용자가 상시 보유 중인 양념 목록(${pantry})을 적극 활용하여 불필요한 추가 구매 없이 조리할 수 있도록 구성하세요.

반드시 아래 JSON 스키마를 엄격히 준수하여 순수 JSON 문자열만 출력하세요. 마크다운 백틱(\`\`\`json)이나 설명글을 포함하지 마세요.

출력 JSON 형식:
{
  "recipes": [
    {
      "id": "recipe-고유아이디",
      "title": "요리 이름 (예: 대파 목살 덮밥)",
      "summary": "요리에 대한 군침 도는 1문장 소개",
      "difficulty": "쉬움 | 보통 | 어려움",
      "cookingTimeMinutes": 20,
      "servings": "1~2인분",
      "matchRate": 90,
      "usedIngredients": [
        { "name": "보유재료명", "amount": "1개" }
      ],
      "extraIngredients": [
        { "name": "추가필요재료 또는 기본양념", "amount": "1스푼", "isPantryItem": true }
      ],
      "steps": [
        {
          "stepNumber": 1,
          "instruction": "상세한 조리 순서 설명",
          "timerMinutes": 3,
          "tip": "조리 시 주의점 또는 꿀팁 (없으면 null)"
        }
      ],
      "chefTip": "맛을 극대화하는 셰프의 특급 비법 1가지"
    }
  ]
}`;

    const userPrompt = `[보유 식재료 목록]
${ingredientNames}

[조리 선호 조건]
- 식사 유형: ${mealType}
- 요리 스타일: ${cuisine}
- 선호 조리시간: ${maxTime}
- 선호 난이도: ${difficulty}
- 추가 재료 범위: ${allowExtra}

[사용자 건강 & 주방 프로필]
- 🚫 알레르기 식재료 (절대 제외): ${allergies}
- ❌ 기피 식재료 (제외): ${disliked}
- 🧂 주방 상비 양념 (활용 권장): ${pantry}

위 조건에 맞춰 사용자가 지금 바로 주방에서 만들어 먹을 수 있는 최고의 맞춤 레시피 3가지를 생성해줘.`;

    // 4. OpenRouter API 호출
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': siteUrl,
        'X-Title': siteName,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 3500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenRouter Recipe API Error]', response.status, errorText);

      if (response.status === 429) {
        return res.status(429).json({
          success: false,
          message: 'AI 모델 요청 한도(Rate Limit)에 도달했습니다. 잠시 후 다시 시도해 주세요.'
        });
      }

      return res.status(response.status).json({
        success: false,
        message: `레시피 생성 실패 (${response.status}): ${errorText}`
      });
    }

    const data = await response.json();
    const rawContent = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    if (!rawContent) {
      return res.status(500).json({
        success: false,
        message: 'AI 모델로부터 레시피 내용을 응답받지 못했습니다.'
      });
    }

    // 5. 마크다운 코드블록 정제 및 파싱
    let parsedResult;
    try {
      const cleaned = rawContent
        .replace(/```json\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .trim();
      parsedResult = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn('[JSON Parse Warning in Recipe]', parseErr);
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI 모델 응답을 JSON 형식으로 변환할 수 없습니다: ' + rawContent);
      }
    }

    const recipes = parsedResult.recipes || [];

    return res.status(200).json({
      success: true,
      recipes: recipes
    });

  } catch (error) {
    console.error('[Generate Recipe Handler Error]', error);
    return res.status(500).json({
      success: false,
      message: '레시피 생성 중 서버 오류가 발생했습니다: ' + error.message
    });
  }
};
