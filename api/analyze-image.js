/**
 * ==========================================================================
 * Vercel 서버리스 함수: 냉장고 사진 식재료 분석 API
 * 파일 경로: api/analyze-image.js
 * ==========================================================================
 * [역할]
 * 1. 클라이언트로부터 Base64 인코딩된 이미지 데이터를 수신합니다.
 * 2. OpenRouter API를 통해 'google/gemma-4-26b-a4b-it:free' 비전 모델을 호출합니다.
 * 3. 사진 속 식재료를 식별하고 정형화된 JSON 배열 형태로 정제하여 클라이언트에 반환합니다.
 */

// Node.js 환경에서 Vercel 서버리스 함수 핸들러 (CommonJS/Node 표준 규격)
module.exports = async function handler(req, res) {
  // CORS 및 HTTP 메소드 검증 (POST 요청만 허용)
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

    // API 키 미설정 시 친절한 안내 반환
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: '.env.local 파일에 OPENROUTER_API_KEY가 설정되어 있지 않습니다. API 키를 등록해 주세요.'
      });
    }

    // 2. 요청 본문(Body) 데이터 추출 및 검증
    const { image } = req.body || {};
    if (!image) {
      return res.status(400).json({
        success: false,
        message: '분석할 이미지 데이터(image base64)가 누락되었습니다.'
      });
    }

    // 3. OpenRouter 비전 프롬프트 구성
    const systemPrompt = `당신은 냉장고 사진을 보고 식재료를 식별하는 식재료 분석 전문가입니다.
주어진 냉장고 사진을 정밀하게 분석하여 식별 가능한 식재료 목록을 반드시 아래 순수 JSON 형식으로만 응답하세요.
마크다운 백틱(\`\`\`json)이나 다른 인사말, 설명 텍스트는 절대 출력하지 말고 유효한 JSON 문자열만 반환해야 합니다.

{
  "ingredients": [
    {
      "name": "식재료 이름 (한국어, 예: 양파, 대파, 달걀, 돼지고기)",
      "category": "채소 | 과일 | 육류 | 수산물 | 유제품 | 양념/소스 | 가공식품 | 기타",
      "confidence": "high | medium | low",
      "quantity": "추정 수량(예: 2개, 1팩, 약간 등)"
    }
  ],
  "note": "사진 상태(음영, 가려짐 등)에 대한 짧은 참고 코멘트 (1문장)"
}`;

    const userPrompt = "이 냉장고 사진에서 보이는 모든 식재료를 남김없이 식별해서 지정된 JSON 형식으로 알려줘.";

    // 4. OpenRouter Chat Completions API 호출
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
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: image // data:image/jpeg;base64,... 형식
                }
              }
            ]
          }
        ],
        temperature: 0.2, // 정밀한 식별을 위해 낮은 온도로 설정
        max_tokens: 1500
      })
    });

    // HTTP 응답 상태 확인
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenRouter API Error]', response.status, errorText);

      // 모델 과부하(503) 또는 요청 한도 초과(429) 처리
      if (response.status === 429) {
        return res.status(429).json({
          success: false,
          message: 'AI 모델 요청 한도(Rate Limit)에 도달했습니다. 잠시 후 다시 시도해 주세요.'
        });
      }

      return res.status(response.status).json({
        success: false,
        message: `OpenRouter API 호출 실패 (${response.status}): ${errorText}`
      });
    }

    const data = await response.json();
    const rawContent = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    if (!rawContent) {
      return res.status(500).json({
        success: false,
        message: 'AI 모델로부터 응답 내용을 전달받지 못했습니다.'
      });
    }

    // 5. AI 응답에서 JSON 파싱 (마크다운 코드블록 제거 유틸리티)
    let parsedResult;
    try {
      // ```json 또는 ``` 마크다운 펜스 블록 제거
      const cleanedJson = rawContent
        .replace(/```json\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .trim();

      parsedResult = JSON.parse(cleanedJson);
    } catch (parseErr) {
      console.warn('[JSON Parse Warning] 원본 응답 정제 실패, 정규식 추출 시도:', rawContent);

      // JSON 객체 부분만 정규식으로 추출 재시도
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI 모델 응답을 JSON 형식으로 변환할 수 없습니다: ' + rawContent);
      }
    }

    // 6. 결과 반환 (각 식재료에 고유 식별자 id 부여)
    const ingredientsWithId = (parsedResult.ingredients || []).map((item, index) => ({
      id: `ing-${Date.now()}-${index}`,
      name: item.name || '알 수 없는 재료',
      category: item.category || '기타',
      confidence: item.confidence || 'medium',
      quantity: item.quantity || '적당량'
    }));

    return res.status(200).json({
      success: true,
      data: {
        ingredients: ingredientsWithId,
        note: parsedResult.note || '식재료가 성공적으로 분석되었습니다.'
      }
    });

  } catch (error) {
    console.error('[Analyze Image Handler Error]', error);
    return res.status(500).json({
      success: false,
      message: '이미지 분석 처리 중 서버 오류가 발생했습니다: ' + error.message
    });
  }
};
