// Arranque: monta la app y registra el service worker
import {App,ErrorBoundary} from './ui/app.js';

const h=React.createElement;

ReactDOM.createRoot(document.getElementById('root')).render(h(ErrorBoundary,null,h(App,null)));
// Service worker para uso offline (solo funciona servido por http/https, no abriendo el archivo directamente)
if('serviceWorker' in navigator&&location.protocol.startsWith('http')){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
