// IronLog service worker — permite abrir la app sin conexión.
// Sube la versión de CACHE cuando cambie la lista de ASSETS.
const CACHE='ironlog-v1';
const ASSETS=[
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
];
const NETWORK_TIMEOUT_MS=3000;

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>Promise.all(ASSETS.map(u=>c.add(u).catch(()=>{}))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

function putInCache(req,res){
  if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
  return res;
}

// Archivos propios: red primero (para recibir actualizaciones), caché si no hay red o tarda demasiado
function networkFirst(req){
  const net=fetch(req).then(res=>putInCache(req,res));
  const timeout=new Promise(r=>setTimeout(r,NETWORK_TIMEOUT_MS));
  return Promise.race([net.catch(()=>null),timeout.then(()=>null)])
    .then(res=>res||caches.match(req,{ignoreSearch:true}).then(c=>c||(req.mode==='navigate'?caches.match('./index.html'):null)))
    .then(res=>res||net);
}

// Librerías del CDN (versionadas, no cambian): caché primero
function cacheFirst(req){
  return caches.match(req).then(c=>c||fetch(req).then(res=>putInCache(req,res)));
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin===self.location.origin)e.respondWith(networkFirst(req));
  else if(url.hostname==='cdnjs.cloudflare.com')e.respondWith(cacheFirst(req));
});
