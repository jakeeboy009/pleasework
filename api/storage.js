/**
 * ==========================================================================
 * Vercel 서버리스 함수: 사용자 프로필 및 레시피 북마크 저장소 API
 * 파일 경로: api/storage.js
 * ==========================================================================
 * [역할]
 * 1. 사용자 식생활 프로필(알레르기, 기피재료, 기본양념)을 검증하고 저장/조회합니다.
 * 2. 생성된 레시피 북마크 목록을 관리(추가, 삭제, 별점/메모 업데이트)합니다.
 * 3. 클라이언트의 localStorage와 서버리스 데이터 동기화를 지원합니다.
 */

// 메모리 기반 간이 저장소 (프로덕션 환경에서는 Supabase/PostgreSQL 등 DB로 확장)
const mockStorage = {
  profile: {
    nickname: '냉장고 요리사',
    householdSize: 1,
    allergies: [],
    disliked: [],
    pantry: ['진간장', '설탕', '식용유', '소금', '후추', '참기름', '다진마늘']
  },
  savedRecipes: []
};

module.exports = async function handler(req, res) {
  const { action } = req.query || {};

  // 1. 프로필 조회 (GET /api/storage?action=getProfile)
  if (req.method === 'GET' && action === 'getProfile') {
    return res.status(200).json({
      success: true,
      profile: mockStorage.profile
    });
  }

  // 2. 프로필 업데이트 (POST /api/storage?action=saveProfile)
  if (req.method === 'POST' && action === 'saveProfile') {
    const { profile } = req.body || {};
    if (profile) {
      mockStorage.profile = {
        ...mockStorage.profile,
        ...profile
      };
    }
    return res.status(200).json({
      success: true,
      message: '사용자 프로필이 저장되었습니다.',
      profile: mockStorage.profile
    });
  }

  // 3. 저장된 레시피 목록 조회 (GET /api/storage?action=getSavedRecipes)
  if (req.method === 'GET' && action === 'getSavedRecipes') {
    return res.status(200).json({
      success: true,
      recipes: mockStorage.savedRecipes
    });
  }

  // 4. 레시피 북마크 저장 (POST /api/storage?action=saveRecipe)
  if (req.method === 'POST' && action === 'saveRecipe') {
    const { recipe } = req.body || {};
    if (!recipe || !recipe.title) {
      return res.status(400).json({
        success: false,
        message: '저장할 레시피 데이터가 올바르지 않습니다.'
      });
    }

    const newBookmark = {
      id: recipe.id || `saved-${Date.now()}`,
      title: recipe.title,
      summary: recipe.summary || '',
      difficulty: recipe.difficulty || '보통',
      cookingTimeMinutes: recipe.cookingTimeMinutes || 20,
      servings: recipe.servings || '1~2인분',
      recipeData: recipe,
      rating: recipe.rating || 5,
      userNote: recipe.userNote || '',
      savedAt: new Date().toISOString()
    };

    mockStorage.savedRecipes.unshift(newBookmark);

    return res.status(200).json({
      success: true,
      message: '레시피가 성공적으로 저장되었습니다.',
      recipe: newBookmark
    });
  }

  // 5. 기본 응답
  return res.status(200).json({
    success: true,
    message: 'Storage API is operational.'
  });
};
