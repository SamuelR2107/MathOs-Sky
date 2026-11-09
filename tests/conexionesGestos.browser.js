import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {crearServidor} from '../scripts/servidor.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const server=crearServidor();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],checks=[];
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:{width:touch?390:1440,height:900},hasTouch:touch,isMobile:touch});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('dialog',d=>d.accept());
  await p.goto(`http://127.0.0.1:${server.address().port}/MathOs-Sky/`);
  const state=()=>p.evaluate(async()=>(await import('./js/main.js')).aplicacion.obtenerEstado());
  const nd=i=>p.locator(`#grafo-plan .node[data-node="${i}"]`);
  const point=async i=>{await nd(i).scrollIntoViewIfNeeded();return nd(i).locator('circle').first().evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});};
  const cdp=await context.newCDPSession(p);
  const drag=async(a,b,finish=true)=>{
   await p.waitForTimeout(150);
   const x=await point(a),y=await point(b);
   // Read both after scrolling, since mobile can shift viewport.
   const start=await point(a);const end=await point(b);
   if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x,y:start.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:end.x,y:end.y}]});}
   else {await p.mouse.move(start.x,start.y);await p.mouse.down();await p.mouse.move(end.x,end.y,{steps:8});}
   assert.equal(await p.locator('.connection-preview').count(),1);assert.ok(await nd(b).evaluate(e=>e.classList.contains('connection-target')));
   if(finish){if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await p.mouse.up();}
  };
  await p.locator('[name=modo][value=manual]').check();for(const id of [13,9,3,6,4])await p.locator(`.destination-option input[value="${id}"]`).check();await p.locator('#crear').click();
  assert.equal((await state()).grafo.aristas.length,0);await nd(0).click();assert.match(await p.locator('#graph-context').textContent(),/Lima/);
  await drag(0,1);await p.waitForFunction(()=>document.querySelector('#editor').open);assert.equal(await p.locator('#desde').inputValue(),'0');assert.equal(await p.locator('#hasta').inputValue(),'1');assert.equal((await state()).grafo.aristas.length,0);
  assert.ok(await p.locator('#pesos-sugeridos').isVisible());assert.equal(await p.locator('#sugerencia-distancia').textContent(),'265 km');assert.equal(await p.locator('#sugerencia-distancia').getAttribute('title'),'265 km');assert.equal(await p.locator('#sugerencia-tiempo').textContent(),'76 min');assert.equal(await p.locator('#sugerencia-costo').textContent(),'S/ 73.6');for(const k of ['distancia','tiempo','costo']){assert.ok(await p.locator('#sugerencia-'+k).textContent());assert.equal(await p.locator('#'+k).inputValue(),'');assert.match(await p.locator('#'+k).getAttribute('aria-describedby'),new RegExp('sugerencia-'+k));}
  await mkdir(new URL('./capturas-gestos/',import.meta.url),{recursive:true});await p.screenshot({path:new URL(`./capturas-gestos/editor-${touch?'movil':'escritorio'}.png`,import.meta.url).pathname.replace(/^\/(.:)/,'$1'),fullPage:true});
  await p.locator('#cancelar-editor').click();assert.equal((await state()).grafo.aristas.length,0);
  await drag(0,1);await p.locator('#usar-modelo').click();await p.locator('#guardar-conexion').click();assert.equal((await state()).grafo.aristas.length,1);await p.locator('#cancelar-editor').click();
  await drag(1,0);assert.equal(await p.locator('#guardar-conexion').textContent(),'Guardar cambios');assert.ok(Number(await p.locator('#distancia').inputValue())>0);await p.locator('#cancelar-editor').click();assert.equal((await state()).grafo.aristas.length,1);
  // Native pointer cancellation and redraw cannot commit an edge.
  await drag(0,2,false);if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else {await p.keyboard.press('Escape');await p.mouse.up();}
  assert.equal(await p.locator('.connection-preview').count(),0);assert.ok(!await p.locator('#editor').isVisible());assert.equal((await state()).grafo.aristas.length,1);
  // Release outside a node, return to the source and resize mid-gesture.
  if(!touch){
   for(const target of ['outside','self','resize']){
    const a=await point(0);await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(a.x+35,a.y+35,{steps:3});
    if(target==='self')await p.mouse.move(a.x,a.y);
    if(target==='resize')await p.setViewportSize({width:1366,height:768});
    await p.mouse.up();assert.ok(!await p.locator('#editor').isVisible());assert.equal((await state()).grafo.aristas.length,1);assert.equal(await p.locator('.connection-preview').count(),0);
   }
  }
  // Keyboard alternative: select origin then destination, reject self, cancel with Escape.
  await nd(0).focus();await p.keyboard.press('Enter');await p.keyboard.press('Enter');assert.ok(!await p.locator('#editor').isVisible());await p.keyboard.press('Escape');assert.equal(await p.locator('.connection-preview').count(),0);
  await nd(0).focus();await p.keyboard.press('Space');await nd(2).focus();await p.keyboard.press('Enter');assert.ok(await p.locator('#editor').isVisible());assert.equal(await p.locator('#hasta').inputValue(),'2');await p.locator('#cancelar-editor').click();
  await p.locator('#abrir-editor').click();assert.equal(await p.locator('#desde').inputValue(),'');await p.locator('#cancelar-editor').click();
  // No drag in automatic scenarios or result views.
  await p.locator('[name=modo][value=automatico]').check();await p.locator('#crear').click();assert.ok(!await p.locator('#grafo-plan').evaluate(e=>e.classList.contains('connection-editable')));await p.locator('#resolver').click();await p.waitForFunction(()=>document.querySelector('#calculo-estado').dataset.estado==='completado');assert.equal((await state()).resultados.valor.cantidadCandidatos,12);assert.ok(!await p.locator('#resultado-contenido .connection-editable').count());
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push({touch,manual:true,sugerencias:true,confirmarAntesDeCrear:true,cancelacion:true,teclado:true,automatico:true});await context.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors},null,2));await writeFile(new URL('./resultado-conexiones-gestos.json',import.meta.url),JSON.stringify({checks,errors},null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
