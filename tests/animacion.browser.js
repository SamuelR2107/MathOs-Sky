import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';import {pathToFileURL,fileURLToPath} from 'node:url';
import {crearServidor} from '../scripts/servidor.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const server=crearServidor();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const output=new URL('./capturas-etapa6c/',import.meta.url);await mkdir(output,{recursive:true});
let browser;const errors=[],checks=[];let workers=0;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());page.on('worker',()=>workers++);
 await page.goto(`http://127.0.0.1:${server.address().port}/MathOs-Sky/`);await page.waitForSelector('.destination-option',{state:'attached'});
 const nav=async id=>page.locator(`nav a[href="#${id}"]`).click();
 const state=()=>page.evaluate(async()=> (await import('./js/main.js')).aplicacion.obtenerEstado());
 const load=async name=>{const f=JSON.parse(await readFile(new URL(`./fixtures/${name}.json`,import.meta.url),'utf8'));await nav('planificar');await page.evaluate(async f=>{
   const {interfaz}=await import('./js/main.js');const ids=Array.from({length:f.n},(_,i)=>i);
   interfaz.establecerPreferencias({modo:'manual',idsDepartamentos:ids,cantidadNodos:f.n,metrica:f.metrica});
   const emit=(name,detail)=>document.dispatchEvent(new CustomEvent(`ui:${name}`,{detail}));
   emit('crear-escenario',{modo:'manual',idsDepartamentos:ids,cantidadNodos:f.n,metrica:f.metrica});
   for(const [origen,destino,distancia,tiempo,costo] of f.aristas){emit('editar-par',{origen,destino});emit('guardar-conexion',{origen,destino,distancia,tiempo,costo});}
   emit('preferencias',{modo:'manual',idsDepartamentos:ids,cantidadNodos:f.n,metrica:f.metrica,origen:String(f.origen)});
 },f);return f;};
 const run=async()=>{await nav('planificar');await page.locator('#resolver').click();await page.waitForFunction(()=>['completado','sin-ciclo'].includes(document.getElementById('calculo-estado').dataset.estado));await page.waitForSelector('#tabla-rutas tbody',{state:'attached'});};
 const opt=()=>page.locator('#resultado-contenido .playback'),cand=()=>page.locator('#candidata-controles .playback');
 const button=(panel,action)=>panel.locator(`[data-action=${action}]`);
 const snapshot=panel=>panel.evaluate(e=>({...e.dataset}));
 const waitStatus=async(selector,value)=>page.waitForFunction(({selector,value})=>document.querySelector(selector)?.dataset.estado===value,{selector,value});
 const geometry=async(panelSelector,graphSelector,route)=>page.evaluate(({panelSelector,graphSelector,route})=>{
  const panel=document.querySelector(panelSelector),svg=document.querySelector(`${graphSelector} svg`),s=Number(panel.dataset.segmento),p=Number(panel.dataset.progreso);
  const point=id=>{const c=svg.querySelector(`[data-node="${id}"] circle`);return {x:+c.getAttribute('cx'),y:+c.getAttribute('cy')};};
  const a=point(route[s]),b=point(route[s+1]);const nums=svg.querySelector('.route-plane').getAttribute('transform').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
  return Math.abs(nums[0]-(a.x+(b.x-a.x)*p))<1e-6&&Math.abs(nums[1]-(a.y+(b.y-a.y)*p))<1e-6;
 },{panelSelector,graphSelector,route});
 const f=await load('anillo5');await run();const original=await state(),count=workers;
 assert.equal((await snapshot(opt())).estado,'listo');await opt().locator('select').selectOption('2');
 await page.evaluate(()=>window.savedSVG=document.querySelector('#resultado-contenido svg'));
 await button(opt(),'play').click();await page.waitForTimeout(220);await button(opt(),'pause').click();
 assert.ok(await page.evaluate(()=>window.savedSVG===document.querySelector('#resultado-contenido svg')),'No se reconstruye el SVG por fotograma');
 const paused=await snapshot(opt());assert.ok(+paused.progreso>0&&+paused.progreso<1);await page.waitForTimeout(200);assert.deepEqual(await snapshot(opt()),paused);
 await button(opt(),'play').click();await page.waitForTimeout(120);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(120);await button(opt(),'pause').click();
 assert.ok(await geometry('#resultado-contenido .playback','#resultado-contenido',f.mejorRuta));assert.equal((await state()).revision,original.revision);
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);await page.screenshot({path:fileURLToPath(new URL('avion-movil.png',output)),fullPage:true});
 await button(opt(),'reset').click();assert.equal((await snapshot(opt())).progreso,'0');assert.equal((await snapshot(opt())).segmento,'0');
 for(const speed of ['0.5','1','2']){await opt().locator('select').selectOption(speed);await button(opt(),'play').click();await page.waitForTimeout(80);await button(opt(),'pause').click();assert.equal((await state()).grafo.aristas.length,original.grafo.aristas.length);}
 await button(opt(),'reset').click();await button(opt(),'play').click();await waitStatus('#resultado-contenido .playback','completado');assert.ok(await geometry('#resultado-contenido .playback','#resultado-contenido',f.mejorRuta));const completed=await snapshot(opt());await page.waitForTimeout(160);assert.deepEqual(await snapshot(opt()),completed);
 checks.push('Óptimo real: play/pause/continue/reset,3 velocidades,final sin bucle y resize proporcional');
 await button(opt(),'play').click();await page.waitForTimeout(80);await nav('modelo');assert.equal((await snapshot(opt())).estado,'pausado');const away=await snapshot(opt());await page.waitForTimeout(150);assert.deepEqual(await snapshot(opt()),away);await nav('recorrido');assert.deepEqual(await snapshot(opt()),away);
 checks.push('Navegación pausa y conserva progreso; no consume cuadros ocultos');
 await nav('explorar');await page.locator('[data-tab=rutas]').click();await page.locator('#tabla-rutas tbody button').nth(1).click();await page.waitForSelector('#candidata-controles .playback');assert.match(await page.locator('#detalle-ruta').textContent(),/Conexión inexistente/);
 await cand().locator('select').selectOption('2');await button(cand(),'play').click();await waitStatus('#candidata-controles .playback','bloqueado');const stopped=await snapshot(cand());assert.equal(stopped.segmento,'2');assert.equal(stopped.progreso,'0');assert.ok(await geometry('#candidata-controles .playback','#candidata-grafo',f.rutas[1].ruta));
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);await page.screenshot({path:fileURLToPath(new URL('invalida-movil.png',output)),fullPage:true});
 await page.locator('#ver-optimo').click();assert.equal((await snapshot(opt())).estado,'listo');assert.equal(workers,count);checks.push('Candidata inválida se detiene en primera arista ausente; volver al óptimo sin nuevo TSP');
 await nav('explorar');await page.locator('#tabla-rutas tbody button').first().click();await page.waitForSelector('#candidata-controles .playback');await button(cand(),'play').click();await page.waitForTimeout(80);await page.locator('#tabla-rutas tbody button').nth(2).click();await page.waitForFunction(()=>document.querySelector('#candidata-controles h3')?.textContent.includes('3'));assert.equal((await snapshot(cand())).estado,'listo');
 await button(cand(),'play').click();await page.locator('[data-tab=matrices]').click();assert.notEqual((await snapshot(cand())).estado,'reproduciendo');checks.push('Cambiar candidata cancela reproducción anterior; ocultar pestaña pausa');
 // Edición desde el óptimo: pausa al abrir modal, invalidación al guardar.
 await nav('recorrido');await button(opt(),'play').click();await page.waitForTimeout(100);await page.evaluate(async()=> (await import('./js/main.js')).interfaz.abrirEditor({origen:0,destino:1}));assert.equal((await snapshot(opt())).estado,'pausado');await page.locator('#usar-modelo').click();await page.locator('#guardar-conexion').click();await page.locator('#cancelar-editor').click();assert.equal(await page.locator('.playback').count(),0);await page.waitForTimeout(100);assert.equal(await page.locator('.route-plane').count(),0);checks.push('Edición elimina reproducción y cuadros obsoletos');
 await run();await nav('planificar');await page.locator('#origen').selectOption('2');assert.equal(await page.locator('.playback').count(),0);await run();await nav('planificar');await page.locator('[name=metrica][value=Costo]').check();assert.equal(await page.locator('.playback').count(),0);checks.push('Origen y prioridad invalidan reproducción y resultado');
 // Diez nodos con todos los tramos reales y movimiento reducido por pasos.
 const ten=await load('completo10');await run();assert.equal((await state()).resultados.valor.cantidadCandidatos,181440);
 await opt().locator('select').selectOption('2');await button(opt(),'play').click();await waitStatus('#resultado-contenido .playback','completado');assert.ok(await geometry('#resultado-contenido .playback','#resultado-contenido',ten.mejorRuta));
 await page.emulateMedia({reducedMotion:'reduce'});await button(opt(),'reset').click();assert.ok(await button(opt(),'play').isDisabled());assert.ok(await button(opt(),'step').isVisible());await button(opt(),'step').focus();await page.keyboard.press('Enter');assert.equal((await snapshot(opt())).segmento,'1');assert.equal((await snapshot(opt())).progreso,'0');assert.equal((await snapshot(opt())).estado,'pausado');await page.emulateMedia({reducedMotion:'no-preference'});checks.push('Diez nodos completa181440 y reproduce10 tramos; teclado y reduced-motion sin RAF');
 for(const [width,height] of [[360,800],[390,844],[430,932],[768,1024],[1366,768],[1440,900],[1920,1080]]){
  await page.setViewportSize({width,height});await nav('recorrido');await button(opt(),'reset').click();await button(opt(),'play').click();await page.waitForTimeout(90);await button(opt(),'pause').click();assert.ok(await geometry('#resultado-contenido .playback','#resultado-contenido',ten.mejorRuta));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);await page.screenshot({path:fileURLToPath(new URL(`diez-${width}.png`,output)),fullPage:true});
  await nav('explorar');await page.locator('[data-tab=rutas]').click();await page.locator('#tabla-rutas tbody button').first().click();await page.waitForSelector('#candidata-controles .playback');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('[data-tab=matrices]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 checks.push('Siete resoluciones: avión, etiquetas, controles, candidatas y matrices sin overflow global');
 await load('vacio5');await run();assert.equal(await page.locator('#resultado-contenido .playback').count(),0);await nav('explorar');await page.locator('[data-tab=rutas]').click();await page.locator('#tabla-rutas tbody button').first().click();await page.waitForSelector('#candidata-controles .playback');assert.equal(await page.locator('#ver-optimo').count(),0);await button(cand(),'play').click();assert.equal((await snapshot(cand())).estado,'bloqueado');assert.equal((await snapshot(cand())).progreso,'0');
 await nav('recorrido');await page.locator('#recomendaciones button').first().click();assert.equal(await page.locator('#distancia').inputValue(),'');await page.locator('#usar-modelo').click();await page.locator('#guardar-conexion').click();await page.waitForFunction(()=>!document.querySelector('#editor').open);assert.match(await page.locator('#recomendaciones').textContent(),/4 pendientes/);await run();assert.match(await page.locator('#recomendaciones').textContent(),/4 recomendadas originalmente/);checks.push('Sin ciclo: sin óptimo ficticio, candidata bloqueada, recomendación editable y recálculo real');
 assert.deepEqual(errors,[]);const report={browser:browser.version(),checks,errors,nota:'Edge de escritorio con viewports emulados; RAF y tiempos reales. Fixtures solo en harness.'};await writeFile(new URL('./resultado-6c-browser.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
