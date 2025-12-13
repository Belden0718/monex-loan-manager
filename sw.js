const CACHE_NAME = 'monex-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js'
];

// 安裝 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'})));
      })
      .catch(err => {
        console.log('Cache addAll error:', err);
      })
  );
  self.skipWaiting();
});

// 啟用 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 攔截請求
self.addEventListener('fetch', (event) => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') return;
  
  // 跳過 Firebase 和 Google APIs
  if (event.request.url.includes('firebasedatabase.app') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('accounts.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果在快取中找到，返回快取
        if (response) {
          return response;
        }
        
        // 否則發送網路請求
        return fetch(event.request).then((response) => {
          // 檢查是否是有效的回應
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // 克隆回應
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // 如果離線且沒有快取，返回離線頁面
        return caches.match('./index.html');
      })
  );
});
