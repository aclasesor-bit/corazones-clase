/* Solo toca sus propias cachés: el origen github.io lo comparten otras apps. */
var CACHE = "corazones-clase-v1";
var FICHEROS = ["./", "index.html", "manifest.webmanifest", "icono.svg", "icono-180.png", "icono-192.png", "icono-512.png"];
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FICHEROS); }));
  self.skipWaiting();
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k.indexOf("corazones-clase-") === 0 && k !== CACHE; })
      .map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(function(r){
    var copia = r.clone();
    if (r.ok && new URL(e.request.url).origin === location.origin) caches.open(CACHE).then(function(c){ c.put(e.request, copia); });
    return r;
  }).catch(function(){ return caches.match(e.request, {ignoreSearch: true}); }));
});
