/* TEE Atlas の service worker
   役割：初回に開いたときにアプリ一式を端末内に保存し、以後はオフラインでも開けるようにする。
   __VER__ はビルド時に内容のハッシュへ置き換わる。版が変わると新しいキャッシュを作り、古いものを消す。 */
const VER = 'd1b7fed6f2';
const CACHE = 'tee-atlas-' + VER;
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png", "./apple-touch-icon.png"];   // ビルド時に一覧へ置き換わる（同梱動画も含む）

/* インストール時：必要なファイルをまとめて保存する */
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

/* 有効化時：古い版のキャッシュを削除し、開いているページをすぐ新しい worker の管理下に置く */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 取得時：
   ・ページ本体（index.html）はネットワーク優先 … オンラインなら常に最新版を表示し、取れたら保存を更新。オフラインなら保存済みを返す
   ・それ以外（アイコン・動画など）は保存済みを優先し、無ければネットワークから取る */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (isPage) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => { c.put('./index.html', copy.clone()); c.put('./', copy); }); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
