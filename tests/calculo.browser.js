import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {crearServidor} from '../scripts/servidor.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const server=crearServidor();await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;const checks=[],errors=[],timings=[];const output=new URL('./capturas-etapa6b/',import.meta.url);await mkdir(output,{recursive:true});
try {
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
 const base=`http://127.0.0.1:${server.address().port}/MathOs-Sky/`;
 await page.goto(base);await page.waitForSelector('.destination-option',{state:'attached'});
 const state=()=>page.evaluate(async()=> (await import('./js/main.js')).aplicacion.obtenerEstado());
 const nav=async id=>page.locator(`nav a[href="#${id}"]`).click();
 const run=async()=>{await nav('planificar');const t=Date.now();await page.locator('#resolver').click();await page.waitForFunction(()=>['completado','sin-ciclo'].includes(document.getElementById('calculo-estado').dataset.estado));await page.waitForSelector('#tabla-rutas tbody',{state:'attached'});return Date.now()-t;};
 const load=async f=>{
  await nav('planificar');await page.evaluate(async f=>{
   const {interfaz}=await import('./js/main.js');
   interfaz.establecerPreferencias({modo:'manual',idsDepartamentos:Array.from({length:f.n},(_,i)=>i),cantidadNodos:f.n,metrica:f.metrica});
   const emit=(name,detail)=>document.dispatchEvent(new CustomEvent(`ui:${name}`,{detail}));
   emit('crear-escenario',{modo:'manual',idsDepartamentos:Array.from({length:f.n},(_,i)=>i),cantidadNodos:f.n,metrica:f.metrica});
   for(const [origen,destino,distancia,tiempo,costo] of f.aristas){emit('editar-par',{origen,destino});emit('guardar-conexion',{origen,destino,distancia,tiempo,costo});}
   emit('preferencias',{modo:'manual',idsDepartamentos:Array.from({length:f.n},(_,i)=>i),cantidadNodos:f.n,metrica:f.metrica,origen:String(f.origen)});
  },f);
 };
 // Flujo real con botones de generación y cálculo.
 await page.locator('#crear').click();assert.ok(await page.locator('#resolver').isEnabled());await run();assert.equal((await state()).resultados.valor.cantidadCandidatos,12);assert.ok((await state()).resultados.valor.cantidadCiclosValidos>=1);assert.equal(await page.locator('.itinerary li').count(),6);checks.push('Automático5 desde botones, resultado y ruta cerrada');
 // Manual completo construido con controles reales: 10 conexiones, sin cargar escenario por API.
 await nav('planificar');await page.locator('[name=modo][value=manual]').check();
 for(const id of [13,9,3,6,4])await page.locator(`.destination-option input[value="${id}"]`).check();
 await page.locator('#crear').click();await page.locator('#abrir-editor').click();
 for(let a=0;a<5;a++)for(let b=a+1;b<5;b++){
  await page.locator('#desde').selectOption(String(a));await page.locator('#hasta').selectOption(String(b));
  await page.locator('#distancia').fill('1');await page.locator('#tiempo').fill('2');await page.locator('#costo').fill('3');await page.locator('#guardar-conexion').click();
 }
 await page.locator('#cancelar-editor').click();await run();assert.equal((await state()).resultados.valor.cantidadCiclosValidos,12);assert.equal((await state()).resultados.valor.mejorValor,5);checks.push('Manual completo mediante selectores y 10 guardados reales:12 válidas, empate primera canónica');
 // Fixtures cargados por eventos del controlador, sin modificar producción ni importar TSP en el hilo principal.
 for(const name of ['completo5_origen0','anillo5','vacio5','camino_sin_ciclo','optimo_distancia','optimo_tiempo','optimo_costo','completo5_origen3','completo10']){
  const f=JSON.parse(await readFile(new URL(`./fixtures/${name}.json`,import.meta.url),'utf8'));await load(f);
  await page.evaluate(()=>{window.beats=0;window.beatTimer=setInterval(()=>window.beats++,5);});
  const ms=await run();const beats=await page.evaluate(()=>{clearInterval(window.beatTimer);return window.beats;});
  const r=(await state()).resultados.valor;assert.equal(r.cantidadCandidatos,f.cantidadCandidatos);assert.equal(r.cantidadCiclosValidos,f.cantidadCiclosValidos);assert.deepEqual(r.mejorRuta,f.mejorRuta);
  if(f.mejorValor!==null)assert.ok(Math.abs(r.mejorValor-f.mejorValor)<1e-9);
  assert.ok(!('rutas' in r));assert.ok(await page.locator('#tabla-rutas tbody tr').count()<=100);
  timings.push({caso:name,ms,latidosHiloPrincipal:beats});
  await nav('explorar');await page.locator('[data-tab=rutas]').click();
  const index=f.n===10?181439:f.rutas.findIndex(r=>!r.valida)>=0?f.rutas.findIndex(r=>!r.valida):f.rutas.length-1;
  const start=Math.floor(index/100)*100;
  if(start){const t=Date.now();await page.locator('#numero-pagina').fill(String(start/100+1));await page.locator('#ir-pagina').click();await page.waitForFunction(start=>document.querySelector('#tabla-rutas tbody tr td').textContent===String(start+1),start);timings.push({caso:'pagina1815',ms:Date.now()-t});assert.equal(await page.locator('#tabla-rutas tbody tr').count(),40);}
  const rows=await page.locator('#tabla-rutas tbody tr td:nth-child(2)').allTextContents();assert.equal(rows.length,Math.min(100,f.rutas.length-start));
  await page.locator('#tabla-rutas tbody button').nth(index-start).click();await page.waitForFunction(i=>document.querySelector('#detalle-ruta h3')?.textContent===`Candidata ${i+1}`,index);
  let best=null;for(let i=0;i<=index;i++)if(f.rutas[i].valida&&(!best||f.rutas[i].valorTotal<best.valorTotal))best={...f.rutas[i],indice:i};
  const detail=await page.locator('#detalle-ruta').textContent();assert.ok(best?detail.includes(`Candidata ${best.indice+1}:`):detail.includes('Todavía no se encontró'));
  assert.equal(await page.locator('#candidata-grafo .node').count(),f.n);
  if(!f.rutas[index].valida){assert.match(detail,/No realizable/);assert.ok(await page.locator('#candidata-grafo .missing').count()>0);assert.ok(!/Infinity|NaN/.test(detail));}
  if(name==='vacio5'){
   await page.screenshot({path:fileURLToPath(new URL('candidata-invalida.png',output)),fullPage:true});
   await nav('recorrido');assert.ok(await page.locator('#sin-ciclo').isVisible());await page.screenshot({path:fileURLToPath(new URL('diagnostico.png',output)),fullPage:true});assert.match(await page.locator('#recomendaciones').textContent(),/5 conexiones nuevas/);
   await page.locator('#recomendaciones button').first().click();assert.ok(await page.locator('#editor').isVisible());assert.equal(await page.locator('#distancia').inputValue(),'');await page.locator('#cancelar-editor').click();assert.equal((await state()).grafo.aristas.length,0);
  }
  checks.push(`${name}: paridad fixture, paginación, candidata y mejor parcial`);
 }
 // Cancelación 10 nodos real y reintento en la misma revisión.
 await nav('planificar');const before=await state();await page.locator('#resolver').click();await page.waitForFunction(()=>document.querySelector('#calculo-progreso').hasAttribute('value'));assert.ok(await page.locator('#crear').isDisabled());assert.ok(await page.locator('#origen').isDisabled());assert.ok(await page.locator('#abrir-editor').isDisabled());await page.locator('#cancelar-calculo').click();assert.equal(await page.locator('#calculo-estado').getAttribute('data-estado'),'cancelado');assert.deepEqual((await state()).grafo,before.grafo);await run();checks.push('Cancelación efectiva en10, bloqueo de mutaciones y reintento');
 // Invalida por prioridad, origen y edición real en el diálogo.
 await nav('planificar');await page.locator('[name=metrica][value=Tiempo]').check();assert.equal(await page.locator('#calculo-estado').getAttribute('data-estado'),'obsoleto');assert.ok(await page.locator('#resultado-contenido').isHidden());await run();await nav('planificar');await page.locator('#origen').selectOption('2');assert.equal(await page.locator('#calculo-estado').getAttribute('data-estado'),'obsoleto');await run();await nav('planificar');await page.locator('.connection-item').first().click();await page.locator('#distancia').fill('999');await page.locator('#guardar-conexion').click();assert.equal(await page.locator('#calculo-estado').getAttribute('data-estado'),'obsoleto');await page.locator('#cancelar-editor').click();checks.push('Cambio de prioridad, origen y pesos invalida resultados');
 // Automático7 y recorrido/matrices móviles.
 await page.locator('[name=modo][value=automatico]').click();await page.locator('#cantidad').fill('7');await page.locator('#crear').click();const auto7Ms=await run();timings.push({caso:'automatico7',ms:auto7Ms});assert.equal((await state()).resultados.valor.cantidadCandidatos,360);checks.push('Automático7:360 candidatas');
 for(const [width,height] of [[1366,768],[1440,900],[1920,1080],[360,800],[390,844]]){
  await page.setViewportSize({width,height});for(const section of ['recorrido','explorar','planificar']){await nav(section);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${section} overflow ${width}`);}
  await nav('recorrido');await page.screenshot({path:fileURLToPath(new URL(`resultado-${width}.png`,output)),fullPage:true});
 }
 await nav('explorar');await page.locator('[data-tab=matrices]').click();for(const value of ['adyacencia','distancia','tiempo','costo']){await page.locator('#tipo-matriz').selectOption(value);assert.equal(await page.locator('.matrix tbody tr').count(),7);}
 checks.push('Responsive escritorio/móvil y cuatro matrices sin recalcular');assert.deepEqual(errors,[]);
 const report={browser:browser.version(),checks,timings,errors,nota:'Casos fixture por eventos públicos UI; generación, resolver, editor, cancelación y páginas mediante controles reales.'};
 await writeFile(new URL('./resultado-6b-browser.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}

