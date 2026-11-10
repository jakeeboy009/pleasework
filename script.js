/**
 * ==========================================================================
 * AI 냉장고 파먹기 (Fridge Recipe AI) - 클라이언트 메인 스크립트
 * ==========================================================================
 * [구현 범위: 1단계 + 2단계 + 3단계 전체 통합]
 * - 1단계: 냉장고 이미지 업로드, 클라이언트 Canvas 압축, OpenRouter 식재료 인식 및 태그 편집
 * - 2단계: 필터 조건 설정, OpenRouter Gemma 4 모델 맞춤 레시피 3선 생성,
 *          레시피 카드 그리드, 상세 조리 가이드 모달, 인터랙티브 조리 타이머
 * - 3단계: 사용자 식생활 프로필 관리 (알레르기, 기피재료, 상비양념 -> 2단계 프롬프트 자동 주입),
 *          레시피 북마크 보관함 (검색, 별점 평가, 나만의 요리 메모, 삭제)
 */

// 엄격 모드 활성화
'use strict';

// --------------------------------------------------------------------------
// 1. DOM 요소 캐싱
// --------------------------------------------------------------------------

// 진행 단계 표시기 (Stepper Navigation)
const stepIndicator1 = document.getElementById('step-indicator-1');
const stepIndicator2 = document.getElementById('step-indicator-2');
const stepIndicator3 = document.getElementById('step-indicator-3');

// 1, 2, 3단계 메인 섹션 컨테이너
const step1Section = document.getElementById('step1-section');
const step2Section = document.getElementById('step2-section');
const step3Section = document.getElementById('step3-section');

// 글로벌 상태 메시지
const statusMessage = document.getElementById('status-message');

// [1단계] 이미지 업로드 관련
const dropZone = document.getElementById('drop-zone');
const imageInput = document.getElementById('image-input');
const cameraInput = document.getElementById('camera-input');
const selectFileBtn = document.getElementById('select-file-btn');
const cameraBtn = document.getElementById('camera-btn');
const uploadPrompt = document.getElementById('upload-prompt');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');
const fileNameDisplay = document.getElementById('file-name-display');
const fileSizeDisplay = document.getElementById('file-size-display');
const compressedSizeDisplay = document.getElementById('compressed-size-display');
const analyzeBtn = document.getElementById('analyze-btn');
const loadingContainer = document.getElementById('loading-container');

// [1단계 결과] 식재료 태그 편집 관련
const ingredientCount = document.getElementById('ingredient-count');
const ingredientTagsList = document.getElementById('ingredient-tags-list');
const ingredientsEmptyState = document.getElementById('ingredients-empty-state');
const aiNoteBox = document.getElementById('ai-note-box');
const aiNoteText = document.getElementById('ai-note-text');
const addIngredientForm = document.getElementById('add-ingredient-form');
const manualIngredientName = document.getElementById('manual-ingredient-name');
const manualIngredientQty = document.getElementById('manual-ingredient-qty');
const goToStep2Btn = document.getElementById('go-to-step2-btn');

// [2단계] 레시피 생성 및 필터 관련
const backToStep1Btn = document.getElementById('back-to-step1-btn');
const confirmedIngredientsSummary = document.getElementById('confirmed-ingredients-summary');
const profileActiveSummary = document.getElementById('profile-active-summary');
const profileActiveText = document.getElementById('profile-active-text');
const filterTime = document.getElementById('filter-time');
const filterDifficulty = document.getElementById('filter-difficulty');
const filterCuisine = document.getElementById('filter-cuisine');
const filterExtra = document.getElementById('filter-extra');
const generateRecipesBtn = document.getElementById('generate-recipes-btn');
const recipeLoadingContainer = document.getElementById('recipe-loading-container');
const recipeLoadingTip = document.getElementById('recipe-loading-tip');
const recipesResultArea = document.getElementById('recipes-result-area');
const recipesGrid = document.getElementById('recipes-grid');
const regenerateRecipesBtn = document.getElementById('regenerate-recipes-btn');

// [2단계 모달] 레시피 상세 조리 뷰 & 타이머 관련
const recipeModal = document.getElementById('recipe-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalDifficulty = document.getElementById('modal-difficulty');
const modalTime = document.getElementById('modal-time');
const modalMatch = document.getElementById('modal-match');
const modalTitle = document.getElementById('modal-title');
const modalSummary = document.getElementById('modal-summary');
const modalUsedIngredients = document.getElementById('modal-used-ingredients');
const modalExtraIngredients = document.getElementById('modal-extra-ingredients');
const modalStepsList = document.getElementById('modal-steps-list');
const modalChefTip = document.getElementById('modal-chef-tip');
const modalChefTipBox = document.getElementById('modal-chef-tip-box');
const saveRecipeBtn = document.getElementById('save-recipe-btn');

// 조리 타이머
const timerDisplay = document.getElementById('timer-display');
const btnTimer1m = document.getElementById('btn-timer-1m');
const btnTimer3m = document.getElementById('btn-timer-3m');
const btnTimer5m = document.getElementById('btn-timer-5m');
const btnTimerToggle = document.getElementById('btn-timer-toggle');
const btnTimerReset = document.getElementById('btn-timer-reset');

// [3단계] 내 보관함 및 프로필 관련
const tabBookmarksBtn = document.getElementById('tab-bookmarks-btn');
const tabProfileBtn = document.getElementById('tab-profile-btn');
const tabContentBookmarks = document.getElementById('tab-content-bookmarks');
const tabContentProfile = document.getElementById('tab-content-profile');
const savedRecipeCount = document.getElementById('saved-recipe-count');
const bookmarkSearchInput = document.getElementById('bookmark-search-input');
const savedRecipesList = document.getElementById('saved-recipes-list');
const bookmarksEmptyState = document.getElementById('bookmarks-empty-state');
const btnEmptyGoStep1 = document.getElementById('btn-empty-go-step1');

// 프로필 폼 필드
const profileForm = document.getElementById('profile-form');
const profileNickname = document.getElementById('profile-nickname');
const profileServings = document.getElementById('profile-servings');
const allergiesGrid = document.getElementById('allergies-checkbox-grid');
const profileDislikedInput = document.getElementById('profile-disliked-input');
const pantryGrid = document.getElementById('pantry-checkbox-grid');

// --------------------------------------------------------------------------
// 2. 애플리케이션 전역 상태 관리
// --------------------------------------------------------------------------
const appState = {
  currentStep: 1,              // 현재 화면 (1, 2, 3)
  selectedFile: null,          // 원본 이미지 파일
  compressedBase64: null,      // 압축된 Base64 데이터
  isAnalyzing: false,          // 1단계 분석 상태
  ingredients: [],             // 확정된 식재료 배열
  aiNote: '',                  // 1단계 AI 메모

  isGeneratingRecipes: false,  // 2단계 생성 상태
  recipes: [],                 // 추천 레시피 배열
  activeRecipe: null,          // 상세 모달 열람 중인 레시피

  // 조리 타이머 상태
  timerSeconds: 0,
  timerInterval: null,
  isTimerRunning: false,

  // 3단계 사용자 프로필 기본값
  profile: {
    nickname: '냉장고 요리사',
    householdSize: 2,
    allergies: [],
    disliked: [],
    pantry: ['진간장', '고추장', '된장', '설탕', '소금', '후추', '식용유', '참기름', '다진마늘', '고춧가루']
  },

  // 3단계 저장된 레시피 목록
  savedRecipes: []
};

// --------------------------------------------------------------------------
// 3. 공통 유틸리티 함수
// --------------------------------------------------------------------------

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function showStatusMessage(message, type = 'info') {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove('hidden');
}

function hideStatusMessage() {
  if (!statusMessage) return;
  statusMessage.classList.add('hidden');
  statusMessage.textContent = '';
}

// --------------------------------------------------------------------------
// 4. [1단계 로직] 이미지 압축 및 식재료 태그 편집
// --------------------------------------------------------------------------

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const head = 'data:image/jpeg;base64,';
        const rawBase64 = compressedDataUrl.substring(head.length);
        const approxBytes = Math.round((rawBase64.length * 3) / 4);

        resolve({ base64: compressedDataUrl, sizeBytes: approxBytes });
      };
      img.onerror = () => reject(new Error('이미지 로드에 실패했습니다.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
}

async function handleFileSelection(file) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showStatusMessage('이미지 파일(JPG, PNG, WEBP 등)만 등록할 수 있습니다.', 'error');
    return;
  }

  const MAX_LIMIT = 20 * 1024 * 1024;
  if (file.size > MAX_LIMIT) {
    showStatusMessage('이미지 크기가 너무 큽니다. 20MB 이하의 사진을 올려주세요.', 'error');
    return;
  }

  appState.selectedFile = file;
  hideStatusMessage();

  try {
    const { base64, sizeBytes } = await compressImage(file);
    appState.compressedBase64 = base64;

    imagePreview.src = base64;
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = `원본: ${formatFileSize(file.size)}`;
    compressedSizeDisplay.textContent = `전송용: ${formatFileSize(sizeBytes)}`;
    compressedSizeDisplay.classList.remove('hidden');

    uploadPrompt.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    analyzeBtn.disabled = false;
  } catch (err) {
    console.error('[Image Compression Error]', err);
    showStatusMessage('이미지 압축 처리 중 오류가 발생했습니다: ' + err.message, 'error');
    resetImageSelection();
  }
}

function resetImageSelection() {
  appState.selectedFile = null;
  appState.compressedBase64 = null;

  if (imageInput) imageInput.value = '';
  if (cameraInput) cameraInput.value = '';
  if (imagePreview) imagePreview.src = '';
  if (previewContainer) previewContainer.classList.add('hidden');
  if (uploadPrompt) uploadPrompt.classList.remove('hidden');
  if (compressedSizeDisplay) compressedSizeDisplay.classList.add('hidden');

  if (analyzeBtn) analyzeBtn.disabled = true;
  hideStatusMessage();
}

function getCategoryClass(category) {
  if (!category) return 'cat-기타';
  const clean = category.replace(/\//g, '-').trim();
  return `cat-${clean}`;
}

function renderIngredients() {
  if (!ingredientTagsList) return;
  ingredientTagsList.innerHTML = '';
  if (ingredientCount) ingredientCount.textContent = appState.ingredients.length;

  // 재료가 없으면 당근 Empty State 표시, 있으면 칩 목록 표시
  if (appState.ingredients.length === 0) {
    if (ingredientsEmptyState) ingredientsEmptyState.classList.remove('hidden');
    ingredientTagsList.classList.add('hidden');
    return;
  }

  if (ingredientsEmptyState) ingredientsEmptyState.classList.add('hidden');
  ingredientTagsList.classList.remove('hidden');

  appState.ingredients.forEach((item) => {
    const chip = document.createElement('div');
    chip.className = 'ingredient-chip';
    chip.setAttribute('data-id', item.id);

    const catClass = getCategoryClass(item.category);

    chip.innerHTML = `
      <span class="category-badge ${catClass}">${item.category || '기타'}</span>
      <span class="chip-name">${item.name}</span>
      ${item.quantity ? `<span class="chip-qty">(${item.quantity})</span>` : ''}
      <button type="button" class="btn-delete-chip" title="${item.name} 삭제" aria-label="${item.name} 삭제">
        ✕
      </button>
    `;

    const deleteBtn = chip.querySelector('.btn-delete-chip');
    deleteBtn.addEventListener('click', () => {
      deleteIngredient(item.id);
    });

    ingredientTagsList.appendChild(chip);
  });
}

function deleteIngredient(id) {
  appState.ingredients = appState.ingredients.filter((item) => item.id !== id);
  renderIngredients();
}

function addManualIngredient(rawName, rawQty = '') {
  const trimmedName = rawName.trim();
  const trimmedQty = rawQty.trim();
  if (!trimmedName) return;

  const isDuplicate = appState.ingredients.some(
    (item) => item.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (isDuplicate) {
    showStatusMessage(`'${trimmedName}'은(는) 이미 목록에 있습니다.`, 'info');
    return;
  }

  const newIngredient = {
    id: `ing-manual-${Date.now()}`,
    name: trimmedName,
    category: '기타',
    confidence: 'high',
    quantity: trimmedQty || '직접추가'
  };

  appState.ingredients.push(newIngredient);
  renderIngredients();
  hideStatusMessage();
}

async function requestImageAnalysis() {
  if (!appState.compressedBase64 || appState.isAnalyzing) return;

  appState.isAnalyzing = true;
  analyzeBtn.disabled = true;
  if (loadingContainer) loadingContainer.classList.remove('hidden');
  hideStatusMessage();

  try {
    const response = await fetch('/api/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: appState.compressedBase64 })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || '식재료 분석에 실패했습니다.');
    }

    const { ingredients, note } = result.data;
    appState.ingredients = ingredients || [];
    appState.aiNote = note || '';

    renderIngredients();

    if (appState.aiNote && aiNoteBox && aiNoteText) {
      aiNoteText.textContent = appState.aiNote;
      aiNoteBox.classList.remove('hidden');
    } else if (aiNoteBox) {
      aiNoteBox.classList.add('hidden');
    }

    showStatusMessage(`🎉 식재료 ${appState.ingredients.length}개가 성공적으로 감지되었습니다!`, 'info');
  } catch (error) {
    console.error('[API Request Error]', error);
    showStatusMessage(error.message, 'error');
  } finally {
    appState.isAnalyzing = false;
    analyzeBtn.disabled = false;
    if (loadingContainer) loadingContainer.classList.add('hidden');
  }
}

// --------------------------------------------------------------------------
// 5. [글로벌 단계 네비게이션] 1단계 / 2단계 / 3단계 전환
// --------------------------------------------------------------------------

/**
 * 지정된 단계(1, 2, 3)로 화면을 안전하게 전환합니다.
 * @param {number} targetStep 
 */
function switchToStep(targetStep) {
  // 2단계 진입 시 재료 유무 검사
  if (targetStep === 2 && appState.ingredients.length === 0) {
    showStatusMessage('2단계로 가려면 최소 1개 이상의 식재료가 등록되어 있어야 합니다.', 'info');
    return;
  }

  appState.currentStep = targetStep;

  // 인디케이터 상태 갱신
  [stepIndicator1, stepIndicator2, stepIndicator3].forEach((indicator, idx) => {
    if (idx + 1 === targetStep) {
      indicator.classList.add('active');
    } else {
      indicator.classList.remove('active');
    }
  });

  // 섹션 표시 제어
  step1Section.classList.add('hidden');
  step2Section.classList.add('hidden');
  step3Section.classList.add('hidden');

  if (targetStep === 1) {
    step1Section.classList.remove('hidden');
  } else if (targetStep === 2) {
    step2Section.classList.remove('hidden');
    renderConfirmedIngredientsSummary();
    updateProfileBannerInStep2();
  } else if (targetStep === 3) {
    step3Section.classList.remove('hidden');
    renderSavedRecipes();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  hideStatusMessage();
}

function renderConfirmedIngredientsSummary() {
  if (!confirmedIngredientsSummary) return;
  confirmedIngredientsSummary.innerHTML = '';
  appState.ingredients.forEach((item) => {
    const span = document.createElement('span');
    span.className = 'mini-tag';
    span.textContent = item.name;
    confirmedIngredientsSummary.appendChild(span);
  });
}

function updateProfileBannerInStep2() {
  if (!profileActiveText) return;
  const allergyCount = appState.profile.allergies.length;
  const pantryCount = appState.profile.pantry.length;

  let text = '내 프로필 설정이 자동 반영됩니다: ';
  if (allergyCount > 0) {
    text += `알레르기 ${allergyCount}종 100% 제외, `;
  } else {
    text += `알레르기 없음, `;
  }
  text += `상비 양념 ${pantryCount}종 적극 활용.`;

  profileActiveText.textContent = text;
}

// --------------------------------------------------------------------------
// 6. [2단계 로직] 레시피 생성 및 카드 렌더링
// --------------------------------------------------------------------------

const COOKING_TIPS = [
  '파기름을 낼 땐 불을 켜기 전에 대파와 기름을 먼저 넣어보세요!',
  '달걀말이를 할 때 우유나 마요네즈를 반 스푼 넣으면 한결 부드러워집니다.',
  '고기를 볶을 때 설탕을 먼저 넣으면 양념이 훨씬 깊게 배어듭니다.',
  '남은 찌개에 물 대신 쌀뜨물을 넣으면 감칠맛이 살아납니다.',
  '마늘은 센 불에 볶으면 쓴맛이 나므로 중약불에 은은히 익혀주세요.'
];

let tipInterval = null;

function startTipRotation() {
  let index = 0;
  if (recipeLoadingTip) recipeLoadingTip.textContent = COOKING_TIPS[0];
  tipInterval = setInterval(() => {
    index = (index + 1) % COOKING_TIPS.length;
    if (recipeLoadingTip) recipeLoadingTip.textContent = COOKING_TIPS[index];
  }, 3000);
}

function stopTipRotation() {
  if (tipInterval) {
    clearInterval(tipInterval);
    tipInterval = null;
  }
}

async function generateRecipes() {
  if (appState.ingredients.length === 0 || appState.isGeneratingRecipes) return;

  appState.isGeneratingRecipes = true;
  generateRecipesBtn.disabled = true;
  recipeLoadingContainer.classList.remove('hidden');
  recipesResultArea.classList.add('hidden');
  hideStatusMessage();
  startTipRotation();

  const preferences = {
    maxTime: filterTime.value,
    difficulty: filterDifficulty.value,
    cuisine: filterCuisine.value,
    allowExtra: filterExtra.value === 'true'
  };

  try {
    // 3단계 프로필(알레르기, 기피재료, 상비양념)을 API 페이로드에 자동 주입
    const response = await fetch('/api/generate-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: appState.ingredients,
        preferences: preferences,
        profile: appState.profile
      })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || '레시피 생성에 실패했습니다.');
    }

    appState.recipes = result.recipes || [];

    if (appState.recipes.length === 0) {
      throw new Error('추천 가능한 레시피를 찾지 못했습니다. 조건을 변경해 보세요.');
    }

    renderRecipeCards();
    recipesResultArea.classList.remove('hidden');
    recipesResultArea.scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    console.error('[Generate Recipe Error]', error);
    showStatusMessage(error.message, 'error');
  } finally {
    stopTipRotation();
    appState.isGeneratingRecipes = false;
    generateRecipesBtn.disabled = false;
    recipeLoadingContainer.classList.add('hidden');
  }
}

function renderRecipeCards() {
  if (!recipesGrid) return;
  recipesGrid.innerHTML = '';

  appState.recipes.forEach((recipe, index) => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.setAttribute('data-index', index);

    const matchRate = recipe.matchRate || 85;

    card.innerHTML = `
      <div class="recipe-card-header">
        <h4 class="recipe-card-title">${recipe.title}</h4>
        <span class="recipe-card-arrow">➔</span>
      </div>
      <p class="recipe-card-summary">${recipe.summary || '맛있는 맞춤 요리'}</p>
      <div class="recipe-card-meta">
        <span class="badge">🍳 ${recipe.difficulty || '보통'}</span>
        <span class="badge">⏱️ ${recipe.cookingTimeMinutes || 20}분</span>
        <span class="badge">👥 ${recipe.servings || '1~2인분'}</span>
        <span class="badge badge-match">✨ 일치도 ${matchRate}%</span>
      </div>
    `;

    card.addEventListener('click', () => {
      openRecipeModal(recipe);
    });

    recipesGrid.appendChild(card);
  });
}

// --------------------------------------------------------------------------
// 7. [상세 모달 & 타이머]
// --------------------------------------------------------------------------

function openRecipeModal(recipe) {
  if (!recipe || !recipeModal) return;
  appState.activeRecipe = recipe;

  modalTitle.textContent = recipe.title;
  modalSummary.textContent = recipe.summary;
  modalDifficulty.textContent = `🍳 ${recipe.difficulty || '보통'}`;
  modalTime.textContent = `⏱️ ${recipe.cookingTimeMinutes || 20}분`;
  modalMatch.textContent = `일치도 ${recipe.matchRate || 90}%`;

  modalUsedIngredients.innerHTML = '';
  (recipe.usedIngredients || []).forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'checklist-item';
    li.innerHTML = `
      <label>
        <input type="checkbox" id="used-ing-${i}" checked />
        <span><strong>${item.name}</strong> ${item.amount ? `(${item.amount})` : ''}</span>
      </label>
    `;
    modalUsedIngredients.appendChild(li);
  });

  modalExtraIngredients.innerHTML = '';
  (recipe.extraIngredients || []).forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'checklist-item';
    li.innerHTML = `
      <label>
        <input type="checkbox" id="extra-ing-${i}" />
        <span>${item.name} ${item.amount ? `(${item.amount})` : ''}</span>
      </label>
    `;
    modalExtraIngredients.appendChild(li);
  });

  modalStepsList.innerHTML = '';
  (recipe.steps || []).forEach((step) => {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'step-card';
    stepDiv.innerHTML = `
      <div class="step-num-badge">${step.stepNumber}</div>
      <div class="step-content">
        <p class="step-instruction">${step.instruction}</p>
        ${step.tip ? `<p class="step-tip">💡 <strong>팁:</strong> ${step.tip}</p>` : ''}
      </div>
    `;
    stepDiv.addEventListener('click', () => {
      stepDiv.classList.toggle('completed');
    });
    modalStepsList.appendChild(stepDiv);
  });

  if (recipe.chefTip) {
    modalChefTip.textContent = recipe.chefTip;
    modalChefTipBox.classList.remove('hidden');
  } else {
    modalChefTipBox.classList.add('hidden');
  }

  recipeModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeRecipeModal() {
  if (!recipeModal) return;
  recipeModal.classList.add('hidden');
  document.body.style.overflow = '';
  appState.activeRecipe = null;
  resetTimer();
}

function updateTimerDisplay() {
  const minutes = Math.floor(appState.timerSeconds / 60);
  const seconds = appState.timerSeconds % 60;
  if (timerDisplay) {
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}

function addTimerSeconds(addSec) {
  appState.timerSeconds += addSec;
  updateTimerDisplay();
}

function toggleTimer() {
  if (appState.isTimerRunning) {
    clearInterval(appState.timerInterval);
    appState.timerInterval = null;
    appState.isTimerRunning = false;
    btnTimerToggle.textContent = '재개';
  } else {
    if (appState.timerSeconds <= 0) {
      showStatusMessage('타이머 시간을 먼저 추가해 주세요 (+1분, +3분 등)', 'info');
      return;
    }
    appState.isTimerRunning = true;
    btnTimerToggle.textContent = '일시정지';
    appState.timerInterval = setInterval(() => {
      if (appState.timerSeconds > 0) {
        appState.timerSeconds -= 1;
        updateTimerDisplay();
      } else {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
        appState.isTimerRunning = false;
        btnTimerToggle.textContent = '시작';
        alert('⏰ 조리 타이머가 종료되었습니다! 음식을 확인해 주세요.');
      }
    }, 1000);
  }
}

function resetTimer() {
  if (appState.timerInterval) {
    clearInterval(appState.timerInterval);
    appState.timerInterval = null;
  }
  appState.isTimerRunning = false;
  appState.timerSeconds = 0;
  updateTimerDisplay();
  if (btnTimerToggle) btnTimerToggle.textContent = '시작';
}

// --------------------------------------------------------------------------
// 8. [3단계 로직] 프로필 관리 및 레시피 북마크 저장소
// --------------------------------------------------------------------------

/**
 * 로컬스토리지에서 프로필 데이터를 로드하고 폼 UI에 반영합니다.
 */
function loadProfile() {
  try {
    const savedProfile = localStorage.getItem('user_profile');
    if (savedProfile) {
      appState.profile = { ...appState.profile, ...JSON.parse(savedProfile) };
    }
  } catch (e) {
    console.warn('[Profile Load Warning]', e);
  }

  // 폼에 반영
  if (profileNickname) profileNickname.value = appState.profile.nickname || '냉장고 요리사';
  if (profileServings) profileServings.value = String(appState.profile.householdSize || 2);

  // 알레르기 체크박스 세팅
  if (allergiesGrid) {
    allergiesGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = (appState.profile.allergies || []).includes(cb.value);
    });
  }

  // 기피 재료 세팅
  if (profileDislikedInput) {
    profileDislikedInput.value = (appState.profile.disliked || []).join(', ');
  }

  // 상비 양념 세팅
  if (pantryGrid) {
    pantryGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = (appState.profile.pantry || []).includes(cb.value);
    });
  }
}

/**
 * 폼에 입력된 프로필 설정을 로컬스토리지에 저장합니다.
 */
function saveProfile(event) {
  if (event) event.preventDefault();

  const nickname = profileNickname ? profileNickname.value.trim() : '냉장고 요리사';
  const householdSize = profileServings ? parseInt(profileServings.value, 10) : 2;

  // 알레르기 수집
  const allergies = [];
  if (allergiesGrid) {
    allergiesGrid.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
      allergies.push(cb.value);
    });
  }

  // 기피 재료 수집
  const dislikedRaw = profileDislikedInput ? profileDislikedInput.value : '';
  const disliked = dislikedRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // 상비 양념 수집
  const pantry = [];
  if (pantryGrid) {
    pantryGrid.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
      pantry.push(cb.value);
    });
  }

  appState.profile = {
    nickname,
    householdSize,
    allergies,
    disliked,
    pantry
  };

  localStorage.setItem('user_profile', JSON.stringify(appState.profile));
  showStatusMessage('✅ 식습관 및 상비 양념 프로필이 성공적으로 저장되었습니다! 다음 레시피 생성 시 자동 적용됩니다.', 'info');
}

/**
 * 로컬스토리지에서 저장된 레시피 목록을 로드합니다.
 */
function loadSavedRecipes() {
  try {
    const data = localStorage.getItem('saved_recipes');
    if (data) {
      appState.savedRecipes = JSON.parse(data);
    }
  } catch (e) {
    console.warn('[Saved Recipes Load Warning]', e);
    appState.savedRecipes = [];
  }
  updateSavedRecipeCount();
}

function updateSavedRecipeCount() {
  if (savedRecipeCount) {
    savedRecipeCount.textContent = appState.savedRecipes.length;
  }
}

/**
 * 저장된 레시피 목록을 화면에 렌더링합니다.
 * @param {string} filterKeyword - 검색 키워드
 */
function renderSavedRecipes(filterKeyword = '') {
  if (!savedRecipesList) return;
  savedRecipesList.innerHTML = '';
  updateSavedRecipeCount();

  const keyword = filterKeyword.trim().toLowerCase();
  const filtered = appState.savedRecipes.filter((item) => {
    if (!keyword) return true;
    const inTitle = item.title.toLowerCase().includes(keyword);
    const inSummary = (item.summary || '').toLowerCase().includes(keyword);
    return inTitle || inSummary;
  });

  if (filtered.length === 0) {
    bookmarksEmptyState.classList.remove('hidden');
    return;
  }

  bookmarksEmptyState.classList.add('hidden');

  filtered.forEach((recipe) => {
    const card = document.createElement('div');
    card.className = 'saved-card';
    card.setAttribute('data-id', recipe.id || recipe.title);

    const rating = recipe.rating || 5;
    const note = recipe.userNote || '';
    const dateFormatted = recipe.savedAt ? new Date(recipe.savedAt).toLocaleDateString('ko-KR') : '저장됨';

    // 별점 별 UI 생성
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      starsHtml += `<span class="star ${i <= rating ? 'filled' : ''}" data-star="${i}">★</span>`;
    }

    card.innerHTML = `
      <div class="saved-card-top">
        <div>
          <h4 class="saved-card-title">${recipe.title}</h4>
          <span class="badge">⏱️ ${recipe.cookingTimeMinutes || 20}분</span>
          <span class="badge">🍳 ${recipe.difficulty || '보통'}</span>
        </div>
        <button type="button" class="btn-delete-saved" title="보관함에서 삭제">🗑️</button>
      </div>

      <div class="saved-card-rating-row">
        <span style="font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted);">내 평점:</span>
        <div class="star-rating">${starsHtml}</div>
      </div>

      <div class="saved-card-memo-area">
        <textarea class="saved-memo-input" placeholder="요리 메모를 적어보세요 (예: 간장 1스푼 줄이기, 대파 많이 넣기)">${note}</textarea>
      </div>

      <div class="saved-card-actions">
        <span class="saved-date">저장일: ${dateFormatted}</span>
        <button type="button" class="btn-view-recipe">조리법 열기 ➔</button>
      </div>
    `;

    // 1) 레시피 열기 이벤트
    const openBtn = card.querySelector('.btn-view-recipe');
    const titleBtn = card.querySelector('.saved-card-title');
    const openHandler = () => openRecipeModal(recipe);
    openBtn.addEventListener('click', openHandler);
    titleBtn.addEventListener('click', openHandler);

    // 2) 삭제 이벤트
    const deleteBtn = card.querySelector('.btn-delete-saved');
    deleteBtn.addEventListener('click', () => {
      deleteSavedRecipe(recipe.id || recipe.title);
    });

    // 3) 별점 클릭 변경 이벤트
    const stars = card.querySelectorAll('.star');
    stars.forEach((star) => {
      star.addEventListener('click', (e) => {
        const newRating = parseInt(e.target.getAttribute('data-star'), 10);
        updateRecipeRating(recipe.id || recipe.title, newRating);
      });
    });

    // 4) 메모 변경(blur) 이벤트
    const memoInput = card.querySelector('.saved-memo-input');
    memoInput.addEventListener('blur', (e) => {
      updateRecipeMemo(recipe.id || recipe.title, e.target.value);
    });

    savedRecipesList.appendChild(card);
  });
}

function bookmarkActiveRecipe() {
  if (!appState.activeRecipe) return;

  const target = appState.activeRecipe;
  const isAlreadySaved = appState.savedRecipes.some(
    (r) => r.title === target.title
  );

  if (!isAlreadySaved) {
    const newBookmark = {
      ...target,
      id: `saved-${Date.now()}`,
      rating: 5,
      userNote: '',
      savedAt: new Date().toISOString()
    };
    appState.savedRecipes.unshift(newBookmark);
    localStorage.setItem('saved_recipes', JSON.stringify(appState.savedRecipes));
    updateSavedRecipeCount();
    alert(`⭐ '${target.title}' 레시피가 내 보관함에 안전하게 저장되었습니다!`);
  } else {
    alert(`이미 보관함에 저장되어 있는 레시피입니다.`);
  }
}

function deleteSavedRecipe(identifier) {
  if (!confirm('이 레시피를 보관함에서 삭제하시겠습니까?')) return;
  appState.savedRecipes = appState.savedRecipes.filter(
    (r) => (r.id || r.title) !== identifier
  );
  localStorage.setItem('saved_recipes', JSON.stringify(appState.savedRecipes));
  renderSavedRecipes(bookmarkSearchInput ? bookmarkSearchInput.value : '');
}

function updateRecipeRating(identifier, newRating) {
  const target = appState.savedRecipes.find((r) => (r.id || r.title) === identifier);
  if (target) {
    target.rating = newRating;
    localStorage.setItem('saved_recipes', JSON.stringify(appState.savedRecipes));
    renderSavedRecipes(bookmarkSearchInput ? bookmarkSearchInput.value : '');
  }
}

function updateRecipeMemo(identifier, newNote) {
  const target = appState.savedRecipes.find((r) => (r.id || r.title) === identifier);
  if (target) {
    target.userNote = newNote.trim();
    localStorage.setItem('saved_recipes', JSON.stringify(appState.savedRecipes));
  }
}

// --------------------------------------------------------------------------
// 9. 이벤트 리스너 바인딩
// --------------------------------------------------------------------------

// 상단 Stepper 직접 클릭하여 단계 이동
if (stepIndicator1) stepIndicator1.addEventListener('click', () => switchToStep(1));
if (stepIndicator2) stepIndicator2.addEventListener('click', () => switchToStep(2));
if (stepIndicator3) stepIndicator3.addEventListener('click', () => switchToStep(3));

// [1단계 이벤트]
// 1) 📁 사진 선택 버튼 클릭
if (selectFileBtn && imageInput) {
  selectFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    imageInput.click();
  });
}

// 2) 📷 카메라로 촬영 버튼 클릭
if (cameraBtn && cameraInput) {
  cameraBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cameraInput.click();
  });
}

// 3) 드롭존 클릭 (버튼 영역 외 카드 영역 클릭 시 사진 선택창 오픈)
if (dropZone && imageInput) {
  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('#remove-image-btn')) return;
    if (e.target.closest('#select-file-btn') || e.target.closest('#camera-btn')) return;
    if (!appState.selectedFile) imageInput.click();
  });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'));
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'));
  });

  dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelection(file);
  });
}

// 4) 파일 인풋 변경 감지 (갤러리 & 카메라)
if (imageInput) {
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  });
}

if (cameraInput) {
  cameraInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  });
}

if (removeImageBtn) {
  removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetImageSelection();
  });
}

if (analyzeBtn) {
  analyzeBtn.addEventListener('click', () => {
    requestImageAnalysis();
  });
}

// 5) 우측 카드: 식재료 수동 직접 추가 폼 전송
if (addIngredientForm && manualIngredientName) {
  addIngredientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameVal = manualIngredientName.value;
    const qtyVal = manualIngredientQty ? manualIngredientQty.value : '';

    if (nameVal && nameVal.trim()) {
      addManualIngredient(nameVal, qtyVal);
      manualIngredientName.value = '';
      if (manualIngredientQty) manualIngredientQty.value = '';
      manualIngredientName.focus();
    }
  });
}

// 1단계 -> 2단계 이동 버튼
if (goToStep2Btn) {
  goToStep2Btn.addEventListener('click', () => {
    switchToStep(2);
  });
}

// 2단계 -> 1단계 뒤로가기 버튼
if (backToStep1Btn) {
  backToStep1Btn.addEventListener('click', () => {
    switchToStep(1);
  });
}

// 2단계 레시피 생성 및 재생성
if (generateRecipesBtn) {
  generateRecipesBtn.addEventListener('click', generateRecipes);
}

if (regenerateRecipesBtn) {
  regenerateRecipesBtn.addEventListener('click', generateRecipes);
}

// 모달 닫기
if (closeModalBtn) closeModalBtn.addEventListener('click', closeRecipeModal);
if (recipeModal) {
  recipeModal.addEventListener('click', (e) => {
    if (e.target === recipeModal) closeRecipeModal();
  });
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && recipeModal && !recipeModal.classList.contains('hidden')) {
    closeRecipeModal();
  }
});

// 타이머 컨트롤
if (btnTimer1m) btnTimer1m.addEventListener('click', () => addTimerSeconds(60));
if (btnTimer3m) btnTimer3m.addEventListener('click', () => addTimerSeconds(180));
if (btnTimer5m) btnTimer5m.addEventListener('click', () => addTimerSeconds(300));
if (btnTimerToggle) btnTimerToggle.addEventListener('click', toggleTimer);
if (btnTimerReset) btnTimerReset.addEventListener('click', resetTimer);

// 모달에서 레시피 북마크 저장
if (saveRecipeBtn) {
  saveRecipeBtn.addEventListener('click', bookmarkActiveRecipe);
}

// 모달에서 레시피 텍스트 클립보드 복사
const copyRecipeBtn = document.getElementById('copy-recipe-btn');
if (copyRecipeBtn) {
  copyRecipeBtn.addEventListener('click', () => {
    if (!appState.activeRecipe) return;
    const r = appState.activeRecipe;

    // 공유용 텍스트 포맷 생성
    let text = `[🧊 AI 냉장고 파먹기] ${r.title}\n`;
    text += `${r.summary}\n`;
    text += `⏱️ 소요시간: ${r.cookingTimeMinutes || 20}분 | 난이도: ${r.difficulty || '보통'}\n\n`;

    text += `[재료]\n`;
    (r.usedIngredients || []).forEach((item) => {
      text += `- ${item.name} ${item.amount ? `(${item.amount})` : ''}\n`;
    });
    (r.extraIngredients || []).forEach((item) => {
      text += `- ${item.name} ${item.amount ? `(${item.amount})` : ''} (추가/양념)\n`;
    });

    text += `\n[조리 순서]\n`;
    (r.steps || []).forEach((s) => {
      text += `${s.stepNumber}. ${s.instruction}\n`;
    });

    if (r.chefTip) {
      text += `\n👨‍🍳 셰프 팁: ${r.chefTip}\n`;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('📋 레시피가 클립보드에 복사되었습니다! 카카오톡이나 메모장에 붙여넣기 해보세요.');
      }).catch(() => {
        alert('클립보드 복사 권한이 거부되었습니다.');
      });
    } else {
      alert('이 브라우저에서는 클립보드 복사를 지원하지 않습니다.');
    }
  });
}

// [3단계 이벤트]
// 서브탭 전환
if (tabBookmarksBtn && tabProfileBtn) {
  tabBookmarksBtn.addEventListener('click', () => {
    tabBookmarksBtn.classList.add('active');
    tabProfileBtn.classList.remove('active');
    tabContentBookmarks.classList.remove('hidden');
    tabContentProfile.classList.add('hidden');
    renderSavedRecipes(bookmarkSearchInput ? bookmarkSearchInput.value : '');
  });

  tabProfileBtn.addEventListener('click', () => {
    tabProfileBtn.classList.add('active');
    tabBookmarksBtn.classList.remove('active');
    tabContentProfile.classList.remove('hidden');
    tabContentBookmarks.classList.add('hidden');
  });
}

// 보관함 실시간 검색 인풋
if (bookmarkSearchInput) {
  bookmarkSearchInput.addEventListener('input', (e) => {
    renderSavedRecipes(e.target.value);
  });
}

// 보관함 빈 상태에서 사진 찍으러 가기
if (btnEmptyGoStep1) {
  btnEmptyGoStep1.addEventListener('click', () => {
    switchToStep(1);
  });
}

// 프로필 저장 폼 제출
if (profileForm) {
  profileForm.addEventListener('submit', saveProfile);
}

// --------------------------------------------------------------------------
// 10. 초기 실행 (Initialization) & 서비스 워커 등록
// --------------------------------------------------------------------------
loadProfile();
loadSavedRecipes();

// PWA 서비스 워커 등록 (주방 오프라인 지원)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('✅ [PWA] Service Worker 등록 완료:', reg.scope))
      .catch((err) => console.warn('⚠️ [PWA] Service Worker 등록 실패:', err));
  });
}

console.log('🧊 [1~3단계 통합 완료] AI 냉장고 파먹기 웹앱이 준비되었습니다.');
