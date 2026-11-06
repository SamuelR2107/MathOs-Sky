// Harness de desarrollo opcional: PLAYWRIGHT_MODULE apunta a una instalación externa.
// No es dependencia de producción; servidor efímero solo para probar módulos HTTP.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,sep} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const server=createServer(async(req,res)=>{
 try {
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/MathOs-Sky/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Prueba motor</title>');return;}
  if(!path.startsWith('/MathOs-Sky/'))throw Error();
  const file=resolve(root,decodeURIComponent(path.slice('/MathOs-Sky/'.length)));
  if(!file.startsWith(resolve(root)+sep))throw Error();
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'application/json');res.end(await readFile(file));
 }catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try {
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();
 await page.goto(`http://127.0.0.1:${server.address().port}/MathOs-Sky/`);
 const result=await page.evaluate(async()=>{
  const check=(x,m)=>{if(!x)throw Error(m);};
  const {Grafo}=await import('./js/grafo.js');
  const complete=n=>{const g=new Grafo(n);for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)g.agregarConexion(a,b,1,2,3);return g.toJSON();};
  const worker=new Worker(new URL('./js/tsp.worker.js',location.href),{type:'module'});
  const messages=[];const waiters=[];
  worker.onmessage=({data})=>{messages.push(data);for(const w of [...waiters])if(w.p(data)){waiters.splice(waiters.indexOf(w),1);clearTimeout(w.timer);w.resolve(data);}};
  const wait=p=>new Promise((resolve,reject)=>{const old=messages.find(p);if(old){resolve(old);return;}const w={p,resolve};w.timer=setTimeout(()=>reject(Error('Timeout Worker')),15000);waiters.push(w);});
  const start=(id,revision,g,extra={})=>worker.postMessage({tipo:'iniciar',id,revision,grafo:g,origen:0,metrica:'Distancia',...extra});
  const got=(id,tipo)=>wait(m=>m.id===id&&m.tipo===tipo);
  try {
   let beats=0;const interval=setInterval(()=>beats++,5);const t=performance.now();
   start('diez',1,complete(10));const r=await got('diez','resultado');const elapsed=performance.now()-t;clearInterval(interval);
   check(r.resultado.cantidadCandidatos===181440&&r.resultado.cantidadCiclosValidos===181440,'conteo 10');check(beats>0,'hilo principal bloqueado');
   check(!('rutas' in r.resultado),'transferencia masiva');
   worker.postMessage({tipo:'pagina',id:'diez',revision:1,inicio:181400,limite:100});const page=await got('diez','pagina');check(page.rutas.length===40,'última página');
   worker.postMessage({tipo:'pagina',id:'diez',revision:1,inicio:0,limite:101});await got('diez','error');
   start('cancelar',2,complete(10));const avance=await got('cancelar','progreso');check(avance.evaluadas>0&&avance.evaluadas<181440,'cancelación a mitad del trabajo');worker.postMessage({tipo:'cancelar',id:'cancelar',revision:2});await got('cancelar','cancelado');
   start('viejo',3,complete(10));await got('viejo','iniciado');start('nuevo',4,complete(5));await got('viejo','cancelado');const nuevo=await got('nuevo','resultado');check(nuevo.resultado.cantidadCandidatos===12,'nuevo escenario');
   start('revision-repetida',4,complete(5));await got('revision-repetida','error');
   start('vacio',5,new Grafo(5).toJSON());const vacio=await got('vacio','resultado');check(vacio.resultado.mejorValor===Infinity,'structured clone Infinity');check(vacio.diagnostico.cantidadMinimaConexiones===5,'diagnóstico automático');
   worker.postMessage({tipo:'pagina',id:'vacio',revision:5,inicio:0,limite:100});const invalidas=await got('vacio','pagina');check(invalidas.rutas.every(r=>!r.valida&&r.valorTotal===Infinity),'inválidas');
   start('diag10',6,new Grafo(10).toJSON(),{operacion:'diagnostico'});const d=await got('diag10','resultado');check(d.diagnostico.cantidadCandidatos===181440&&d.diagnostico.cantidadMinimaConexiones===10,'diagnóstico10');
   start('error',7,complete(5),{metrica:'incorrecta'});await got('error','error');
   start('recuperado',8,complete(5));check((await got('recuperado','resultado')).resultado.cantidadCiclosValidos===12,'recuperación');
   start('cancelar-diag',9,new Grafo(10).toJSON(),{operacion:'diagnostico'});await got('cancelar-diag','progreso');worker.postMessage({tipo:'cancelar',id:'cancelar-diag',revision:9});await got('cancelar-diag','cancelado');
   check(!messages.some(m=>['cancelar','cancelar-diag','viejo'].includes(m.id)&&m.tipo==='resultado'),'resultado obsoleto');
   const progress=messages.filter(m=>m.id==='diez'&&m.tipo==='progreso').length;check(progress<100,'demasiados mensajes');
   return {worker:'OK',checks:['10 nodos','5 nodos','heartbeat','paginación','límite100','cancelación durante TSP','cancelación durante diagnóstico','reemplazo','revisión obsoleta','Infinity','sin ciclo','diagnóstico10','error y recuperación'],tsp10WorkerMs:elapsed,heartbeat:beats,mensajesProgreso10:progress};
  } finally {worker.terminate();}
 });
 console.log(JSON.stringify({browser:await browser.version(),...result},null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
