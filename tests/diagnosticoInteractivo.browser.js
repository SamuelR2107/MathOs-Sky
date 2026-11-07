import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
const baseline=process.env.BASELINE==='1';
const {crearServidor}=await import(baseline?'../../MathOs-Sky-Web/scripts/servidor.js':'../scripts/servidor.js');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const server=crearServidor();await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;const errors=[],checks=[];const output=new URL('./capturas-diagnostico/',import.meta.url);await mkdir(output,{recursive:true});
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of baseline?[1440]:[1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});let workers=0,accept=true;
  page.on('worker',()=>workers++);page.on('dialog',d=>accept?d.accept():d.dismiss());page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}/MathOs-Sky/`);
  const nav=id=>page.locator(`nav a[href="#${id}"]`).click();
  const state=()=>page.evaluate(async()=> (await import('./js/main.js')).aplicacion.obtenerEstado());
  const fill=async(value=1)=>{if(!baseline&&value>0){await page.locator('#usar-modelo').click();for(const id of ['distancia','tiempo','costo'])await page.locator('#'+id).fill(String(Number(await page.locator('#'+id).inputValue())*value));}else for(const id of ['distancia','tiempo','costo'])await page.locator('#'+id).fill(String(value));};
  const pending=()=>page.locator('#recomendaciones li button');
  await page.locator('[name=modo][value=manual]').check();for(const id of [13,9,3,6,4])await page.locator(`.destination-option input[value="${id}"]`).check();await page.locator('#crear').click();await page.locator('#resolver').click();await page.waitForFunction(()=>document.querySelector('#calculo-estado').dataset.estado==='sin-ciclo');
  assert.equal(pending()&&await pending().count(),5);assert.equal((await state()).resultados.valor.cantidadCandidatos,12);assert.equal(workers,1);
  if(baseline){await pending().first().click();await fill();await page.locator('#guardar-conexion').click();assert.ok(await page.locator('#sin-ciclo').isHidden());assert.equal((await state()).grafo.aristas.length,1);checks.push('Reproducido: guardar una recomendación oculta todo el panel, aunque quedan cuatro aristas por agregar');await page.close();continue;}
  // Cancelar, errores y sugerencias sin mutación.
  await pending().first().click();await page.locator('#cancelar-editor').click();assert.equal(await pending().count(),5);
  await pending().first().click();await fill(0);await page.locator('#guardar-conexion').click();assert.ok(await page.locator('#editor').isVisible());assert.equal((await state()).grafo.aristas.length,0);assert.equal(await pending().count(),5);
  await page.locator('#usar-modelo').click();assert.ok(Number(await page.locator('#distancia').inputValue())>0);assert.equal((await state()).grafo.aristas.length,0);await page.locator('#cancelar-editor').click();await page.locator('#descartar').click();assert.equal(await pending().count(),5);
  for(let i=0;i<5;i++){
   const pair=await pending().first().getAttribute('data-pendiente');await pending().first().click();await fill();await page.locator('#guardar-conexion').click();await page.waitForFunction(()=>!document.querySelector('#editor').open);
   assert.equal(new URL(page.url()).hash,'#recorrido');assert.equal(await pending().count(),4-i);assert.equal(await page.locator(`[data-pendiente="${pair}"]`).count(),0);
   const s=await state();assert.equal(s.planCorreccion.agregadas,i+1);assert.equal(s.grafo.aristas.length,i+1);assert.equal(s.resultados.valor,null);assert.equal(workers,1);assert.equal(await page.locator('#tabla-rutas tbody').count(),0);assert.equal(await page.locator('#grafo-plan .graph-edge').count(),i+1);assert.equal(await page.locator('#tabla-matriz tbody tr').count(),5);
   await page.waitForFunction(()=>document.activeElement.matches('[data-pendiente],#titulo-correccion'));
   assert.ok(await page.locator('#sin-ciclo').isVisible());if(!(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))){console.log('overflow',width,await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>({tag:e.tagName,id:e.id,cls:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})).slice(0,20)));await page.screenshot({path:fileURLToPath(new URL('overflow.png',output)),fullPage:true});throw Error('overflow');}
   if(i===1)await page.screenshot({path:fileURLToPath(new URL(`progreso-${width}.png`,output)),fullPage:true});
  }
  assert.match(await page.locator('#recomendaciones').textContent(),/Has completado/);await page.locator('#resolver-correccion').click();await page.waitForFunction(()=>document.querySelector('#calculo-estado').dataset.estado==='completado');
  let s=await state();assert.equal(workers,2);assert.equal(s.resultados.valor.cantidadCandidatos,12);assert.equal(s.resultados.valor.cantidadCiclosValidos,1);assert.ok(Math.abs(s.resultados.valor.mejorValor-s.grafo.aristas.reduce((sum,e)=>sum+e[2],0))<1e-8);assert.equal(s.planCorreccion,null);assert.ok(await page.locator('#resultado-contenido').isVisible());
  checks.push(`${width}px: vacío5 12/0; cancelar/invalidar/modelo sin guardar; 5→0 sin navegar ni Worker adicional; foco, SVG, matrices; recálculo12/1 con suma real de pesos geográficos`);
  if(width===1440){
   await nav('planificar');await page.locator('#crear').click();await page.locator('#resolver').click();await page.waitForFunction(()=>document.querySelector('#calculo-estado').dataset.estado==='sin-ciclo');
   // Editor general desde diagnóstico: arista ajena al anillo original.
   await page.locator('#sin-ciclo [data-editor]').click();await page.locator('#desde').selectOption('0');await page.locator('#hasta').selectOption('2');await fill();await page.locator('#guardar-conexion').click();await page.waitForFunction(()=>!document.querySelector('#editor').open);assert.equal(await pending().count(),5);assert.match(await page.locator('#recomendaciones').textContent(),/podría no ser el mínimo/);assert.equal((await state()).planCorreccion.minimoVigente,false);
   await page.locator('#resolver-correccion').click();await page.waitForFunction(()=>document.querySelector('#calculo-estado').dataset.estado==='sin-ciclo');s=await state();assert.equal(s.planCorreccion.total,4);assert.equal(s.planCorreccion.minimoVigente,true);
   // Borrar 0—2, que pertenece al recorrido testigo pero no a las recomendaciones nuevas.
   await page.locator('#sin-ciclo [data-editor]').click();await page.locator('#desde').selectOption('0');await page.locator('#hasta').selectOption('2');await page.locator('#eliminar-conexion').click();await page.locator('#cancelar-editor').click();assert.equal((await state()).planCorreccion.garantizaRecorrido,false);assert.match(await page.locator('#recomendaciones').textContent(),/ya no garantiza/);
   await page.locator('#resolver-correccion').click();await page.waitForFunction(()=>document.querySelector('#calculo-estado').dataset.estado==='sin-ciclo');assert.equal(await pending().count(),5);
   await pending().first().click();await fill();await page.locator('#guardar-conexion').click();await page.waitForFunction(()=>!document.querySelector('#editor').open);const plan=(await state()).planCorreccion;
   await page.locator('#sin-ciclo [data-editor]').click();await page.locator('#desde').selectOption('1');await page.locator('#hasta').selectOption('0');await fill(2);await page.locator('#guardar-conexion').click();await page.waitForFunction(()=>!document.querySelector('#editor').open);assert.deepEqual((await state()).planCorreccion,plan);
   await nav('planificar');await page.locator('#origen').selectOption('3');await page.locator('[name=metrica][value=Costo]').check();assert.deepEqual((await state()).planCorreccion,plan);
   accept=false;await page.locator('#crear').click();assert.deepEqual((await state()).planCorreccion,plan);accept=true;await page.locator('#crear').click();assert.equal((await state()).planCorreccion,null);await nav('recorrido');assert.ok(await page.locator('#sin-ciclo').isHidden());
   checks.push('Arista ajena: mínimo no afirmado; actualización explícita; eliminación de testigo requiere actualizar; pesos/origen/métrica conservan plan; reemplazo requiere confirmación y descarta plan');
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);const result={browser:browser.version(),baseline,checks,errors};await writeFile(new URL(baseline?'./resultado-diagnostico-antes.json':'./resultado-diagnostico-browser.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
