import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {crearServidor} from '../scripts/servidor.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const server=crearServidor();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],checks=[];
const output=new URL('./capturas-pesos/',import.meta.url);await mkdir(output,{recursive:true});
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [1440,390]){
  const p=await browser.newPage({viewport:{width,height:900}});let confirmUnusual=false;const dialogs=[];
  p.on('dialog',d=>{dialogs.push(d.message());return d.message().includes('Guardar los valores personalizados')&&!confirmUnusual?d.dismiss():d.accept();});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.goto(`http://127.0.0.1:${server.address().port}/MathOs-Sky/`);
  const state=()=>p.evaluate(async()=>(await import('./js/main.js')).aplicacion.obtenerEstado());
  const fill=async v=>{for(const [key,val] of Object.entries(v))await p.locator('#'+key).fill(String(val));};
  const values=async()=>Object.fromEntries(await Promise.all(['distancia','tiempo','costo'].map(async k=>[k,Number(await p.locator('#'+k).inputValue())])));
  await p.locator('[name=modo][value=manual]').check();for(const id of [13,9,3,6,4])await p.locator(`.destination-option input[value="${id}"]`).check();await p.locator('#crear').click();await p.locator('#resolver').click();await p.waitForFunction(()=>document.querySelector('#calculo-estado').dataset.estado==='sin-ciclo');
  await p.locator('[data-pendiente]').first().click();await p.locator('#usar-modelo').click();const ref=await values();assert.ok(Math.abs(ref.distancia-265.03989705153657)<1e-8);await p.locator('#validar-borrador').click();assert.match(await p.locator('#editor-valid').textContent(),/Valores correctos/);assert.equal((await state()).grafo.aristas.length,0);
  await fill({distancia:300,tiempo:ref.tiempo*1.12345,costo:ref.costo*.9});await p.locator('#validar-borrador').click();assert.match(await p.locator('#editor-valid').textContent(),/Valores correctos/);
  await fill({distancia:800});await p.locator('#validar-borrador').click();assert.match(await p.locator('#editor-valid').textContent(),/Valores inusuales/);assert.match(await p.locator('#error-distancia').textContent(),/Referencia|referencia/);assert.equal(await p.locator('#distancia').getAttribute('aria-invalid'),'false');
  const before=await state();await p.locator('#guardar-conexion').click();assert.deepEqual((await state()).grafo,before.grafo);assert.equal((await state()).revision,before.revision);assert.equal((await state()).planCorreccion.pendientes.length,5);assert.ok(await p.locator('#editor').isVisible());assert.match(await p.locator('#editor-valid').textContent(),/No se guardaron/);
  await p.screenshot({path:fileURLToPath(new URL(`advertencia-${width}.png`,output)),fullPage:true});
  confirmUnusual=true;const expected=await values();await p.locator('#guardar-conexion').click();await p.waitForFunction(()=>!document.querySelector('#editor').open);assert.equal((await state()).planCorreccion.pendientes.length,4);assert.deepEqual((await state()).grafo.aristas[0],[0,1,expected.distancia,expected.tiempo,expected.costo]);assert.equal(new URL(p.url()).hash,'#recorrido');
  await p.locator('#sin-ciclo [data-editor]').click();await p.locator('#desde').selectOption('1');await p.locator('#hasta').selectOption('0');assert.deepEqual(await values(),expected);
  const original=(await state()).grafo;
  for(const [key,val] of [['distancia','0.001'],['distancia','100000'],['tiempo','1000000'],['costo','999999999'],['distancia','0'],['distancia','-1'],['distancia','']]){
   await fill(ref);await fill({[key]:val});await p.locator('#guardar-conexion').click();assert.ok(await p.locator('#editor').isVisible());assert.equal(await p.locator('#'+key).getAttribute('aria-invalid'),'true');assert.deepEqual((await state()).grafo,original);assert.equal((await state()).planCorreccion.pendientes.length,4);
  }
  for(const bad of ['NaN','Infinity','texto']){await fill(ref);await p.locator('#distancia').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},bad);await p.locator('#guardar-conexion').click();assert.deepEqual((await state()).grafo,original);assert.equal(await p.locator('#distancia').getAttribute('aria-invalid'),'true');}
  for(const [key,factor] of [['tiempo',4],['costo',4]]){await fill(ref);await fill({[key]:ref[key]*factor});await p.locator('#validar-borrador').click();assert.match(await p.locator('#error-'+key).textContent(),/inusual/);assert.match(await p.locator('#editor-valid').textContent(),/Valores inusuales/);}
  await fill(ref);await fill({distancia:450.125,tiempo:ref.tiempo*1.1,costo:ref.costo*.8});const final=await values(),nDialogs=dialogs.length;await p.locator('#guardar-conexion').click();await p.waitForFunction(()=>!document.querySelector('#editor').open);assert.equal(dialogs.length,nDialogs);assert.deepEqual((await state()).grafo.aristas[0],[0,1,final.distancia,final.tiempo,final.costo]);assert.equal((await state()).planCorreccion.pendientes.length,4);
  checks.push(`${width}px: modelo/aproximación/decimales; validar distingue advertencias; atípico cancelar/aceptar; extremos/vacío/NaN/Infinity; edición atómica inversa y plan4 pendientes`);await p.close();
 }
 assert.deepEqual(errors,[]);const r={browser:browser.version(),checks,errors};await writeFile(new URL('./resultado-pesos-browser.json',import.meta.url),JSON.stringify(r,null,2));console.log(JSON.stringify(r,null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
