/**
 * ==========================================================================
 * AI 냉장고 파먹기 - 서비스 워커 (sw.js)
 * ==========================================================================
 * [역할]
 * 1. 정적 자산(HTML, CSS, JS)을 캐싱하여 오프라인 상태에서도 기본 UI가 로드되도록 지원합니다.
 * 2. 주방에서 인터넷이 불안정해도 이미 저장된 레시피 보관함을 원활히 열람할 수 있습니다.
 */

const CACHE_NAME = 'fridge-ai-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

// 서비스 워커 설치 이벤트 (정적 자산 사전 캐싱)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] 정적 자산 캐싱 완료');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 서비스 워커 활성화 이벤트 (구버전 캐시 정리)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] 이전 버전 캐시 정리:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 네트워크 요청 가로채기 (네트워크 우선, 실패 시 캐시 폴백)
self.addEventListener('fetch', (event) => {
  // API 요청은 캐시하지 않고 항상 네트워크로 직접 통신
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 네트워크 응답이 유효하면 캐시 갱신 후 반환
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 오프라인 상태일 경우 캐시에서 응답 반환
        return caches.match(event.request);
      })
  );
});
