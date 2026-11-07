import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {crearServidor} from '../scripts/servidor.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const output=new URL('./capturas-etapa6a/',import.meta.url);await mkdir(output,{recursive:true});
const server=crearServidor();await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;const errors=[],checks=[];
try {
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.goto(`http://127.0.0.1:${server.address().port}/MathOs-Sky/`);
 await page.waitForSelector('.destination-option',{state:'attached'});
 const state=()=>page.evaluate(async()=> (await import('./js/main.js')).aplicacion.obtenerEstado());
 const confirm=accept=>page.once('dialog',dialog=>accept?dialog.accept():dialog.dismiss());
 const click=async selector=>{await page.locator(selector).click();await page.waitForTimeout(40);};
 assert.ok(await page.locator('#abrir-editor').isDisabled());assert.ok(await page.locator('#origen').isDisabled());assert.ok(await page.locator('#resolver').isDisabled());
 assert.ok(!requests.some(r=>/tsp\.js|tsp\.worker|diagnostico|fixtures/.test(r)));
 await click('#crear');let s=await state();assert.equal(s.idsGeograficos.length,5);assert.ok(s.grafo.aristas.length>=5);assert.equal(await page.locator('#grafo-plan .node').count(),5);assert.equal(await page.locator('#origen option').count(),6);
 checks.push('Automático5: grafo auténtico, origen, nombres y conexiones');
 await page.locator('#cantidad').fill('10');confirm(true);await click('#crear');s=await state();assert.equal(s.idsGeograficos.length,10);assert.ok(s.grafo.aristas.length>=10);
 await page.screenshot({path:fileURLToPath(new URL('automatico10-desktop.png',output)),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);assert.ok(await page.locator('#lista-conexiones').evaluate(e=>e.scrollWidth<=e.clientWidth),'Lista móvil sin recorte horizontal');await page.screenshot({path:fileURLToPath(new URL('automatico10-movil.png',output)),fullPage:true});
 const clipped=await page.locator('#grafo-plan svg').evaluate(svg=>{const width=svg.viewBox.baseVal.width;return [...svg.querySelectorAll('.node text')].filter(t=>{const b=t.getBBox();return b.x<0||b.x+b.width>width;}).map(t=>t.textContent);});assert.deepEqual(clipped,[]);
 await page.setViewportSize({width:1440,height:900});checks.push('Automático10 sin errores ni nombres recortados en móvil');
 const beforePersonalize=await state();await click('#personalizar');s=await state();assert.deepEqual(s.grafo,beforePersonalize.grafo);assert.deepEqual(s.idsGeograficos,beforePersonalize.idsGeograficos);assert.equal(s.origen,beforePersonalize.origen);assert.equal(s.modo,'manual');assert.equal(await page.locator('.destination-option input:checked').count(),10);
 assert.equal(await page.locator('.destination-option input:disabled').count(),14);
 await page.locator('#buscar').fill('ancash');assert.equal(await page.locator('.destination-option:visible').count(),1);await page.locator('#buscar').fill('');
 const beforeCancel=await state();confirm(false);await page.locator('[name=modo][value=automatico]').click();assert.deepEqual(await state(),beforeCancel);assert.ok(await page.locator('[name=modo][value=manual]').isChecked());
 checks.push('Personalizar conserva escenario; cancelar cambio de modo conserva datos');
 await click('#limpiar');for(const id of [13,9,3,6,4])await page.locator(`.destination-option input[value="${id}"]`).check();
 confirm(false);await click('#crear');assert.deepEqual((await state()).grafo,beforeCancel.grafo);
 confirm(true);await click('#crear');s=await state();assert.deepEqual(s.idsGeograficos,[13,9,3,6,4]);assert.equal(s.grafo.aristas.length,0);assert.equal(await page.locator('#grafo-plan .node').count(),5);
 assert.deepEqual(await page.locator('#origen option:not([value=""])').allTextContents(),['Lima','Ica','Arequipa','Cusco','Ayacucho']);
 checks.push('Manual5: selección exacta, IDs locales y grafo vacío');
 await click('#abrir-editor');await page.locator('#desde').selectOption('0');assert.ok(await page.locator('#hasta option[value="0"]').isDisabled());await page.locator('#hasta').selectOption('1');
 await click('#guardar-conexion');assert.match(await page.locator('#error-distancia').textContent(),/positivo/);assert.equal((await state()).grafo.aristas.length,0);
 for(const bad of ['0','-1','']){
  await page.locator('#distancia').fill(bad);await page.locator('#tiempo').fill('270');await page.locator('#costo').fill('70');await click('#guardar-conexion');assert.equal((await state()).grafo.aristas.length,0);
 }
 await page.locator('#distancia').fill('305');confirm(true);await click('#guardar-conexion');s=await state();assert.deepEqual(s.grafo.aristas,[[0,1,305,270,70]]);assert.match(await page.locator('#editor-valid').textContent(),/agregada/);
 await click('#cancelar-editor');assert.equal(await page.locator('.connection-item').count(),1);
 await click('nav a[href="#explorar"]');await click('[data-tab=matrices]');
 for(const [type,value] of [['adyacencia','1'],['distancia','305'],['tiempo','270'],['costo','70']]){
  await page.locator('#tipo-matriz').selectOption(type);const rows=page.locator('.matrix tbody tr');assert.equal(await rows.nth(0).locator('td').nth(1).textContent(),value);assert.equal(await rows.nth(1).locator('td').nth(0).textContent(),value);assert.equal(await rows.nth(0).locator('td').nth(0).textContent(),'0');
 }
 checks.push('Agregar Lima-Ica: cuatro matrices simétricas; pesos inválidos y lazos rechazados');
 await click('nav a[href="#planificar"]');await click('.connection-item');await page.locator('#distancia').fill('123.456789');await page.locator('#tiempo').fill('111.25');await page.locator('#costo').fill('66.75');confirm(true);await click('#guardar-conexion');s=await state();assert.equal(s.grafo.aristas[0][2],123.456789);await click('#cancelar-editor');
 await click('#abrir-editor');await page.locator('#desde').selectOption('1');await page.locator('#hasta').selectOption('0');assert.equal(await page.locator('#distancia').inputValue(),'123.456789');assert.equal(await page.locator('#guardar-conexion').textContent(),'Guardar cambios');assert.equal((await state()).grafo.aristas.length,1);
 const beforeSuggestion=await state();confirm(false);await click('#usar-modelo');assert.equal(await page.locator('#distancia').inputValue(),'123.456789');assert.deepEqual(await state(),beforeSuggestion);
 confirm(true);await click('#usar-modelo');const d=Number(await page.locator('#distancia').inputValue());assert.ok(Math.abs(d-265.03989705153657)<1e-9);assert.deepEqual(await state(),beforeSuggestion);await click('#guardar-conexion');assert.equal((await state()).grafo.aristas[0][2],d);
 checks.push('Editar inverso sin duplicar; sugerencias Lima-Ica exactas, editables y no guardadas automáticamente');
 const beforeDelete=await state();confirm(false);await click('#eliminar-conexion');assert.deepEqual(await state(),beforeDelete);confirm(true);await click('#eliminar-conexion');assert.equal((await state()).grafo.aristas.length,0);await click('#cancelar-editor');assert.equal(await page.locator('.connection-item').count(),0);
 await click('nav a[href="#explorar"]');assert.equal(await page.locator('.matrix td.absent').count(),20);
 checks.push('Eliminar en ambos sentidos; lista, SVG y matrices actualizados');
 await click('nav a[href="#planificar"]');const rev=(await state()).revision;await page.locator('#origen').selectOption('3');await page.locator('[name=metrica][value=Tiempo]').check();s=await state();assert.equal(s.origen,3);assert.equal(s.metrica,'Tiempo');assert.equal(s.revision,rev+2);
 assert.ok(await page.locator('#resolver').isEnabled());checks.push('Origen y prioridad en estado central; resolver habilitado desde 6B');
 // Crear conexión para verificar selección mediante teclado en SVG.
 await click('#abrir-editor');await page.locator('#desde').selectOption('0');await page.locator('#hasta').selectOption('1');await click('#usar-modelo');await click('#guardar-conexion');await click('#cancelar-editor');
 await page.locator('#grafo-plan .node').first().focus();await page.keyboard.press('Enter');assert.match(await page.locator('#graph-context').textContent(),/Capital: Lima/);
 await page.locator('#grafo-plan .edge-group').focus();await page.keyboard.press('Enter');assert.ok(await page.locator('#editor').isVisible());assert.equal(await page.locator('#desde').inputValue(),'0');await page.keyboard.press('Escape');assert.ok(!await page.locator('#editor').isVisible());
 for(const [width,height] of [[1366,768],[1440,900],[1920,1080],[768,1024],[360,800],[390,844],[430,932]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(120);
  for(const section of ['planificar','explorar','recorrido','modelo']){
   await click(`nav a[href="#${section}"]`);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${section}/${width}`);
  }
  await click('nav a[href="#planificar"]');await page.screenshot({path:fileURLToPath(new URL(`escenario-${width}.png`,output)),fullPage:true});
 }
 await click('.connection-item');await page.screenshot({path:fileURLToPath(new URL('editor-movil.png',output))});await click('#cancelar-editor');
 await click('nav a[href="#explorar"]');await page.locator('#tipo-matriz').selectOption('distancia');await page.screenshot({path:fileURLToPath(new URL('matrices-movil.png',output)),fullPage:true});
 checks.push('Teclado SVG/editor; siete tamaños sin overflow, tablas con scroll propio');
 // Reemplazo por automático confirmado, sin selecciones manuales residuales.
 await click('nav a[href="#planificar"]');confirm(true);await page.locator('[name=modo][value=automatico]').check();s=await state();assert.equal(s.grafo,null);assert.equal(s.origen,null);assert.deepEqual(s.idsGeograficos,[]);assert.ok(await page.locator('#abrir-editor').isDisabled());
 assert.deepEqual(errors,[]);const result={browser:await browser.version(),checks,consoleErrors:errors};await writeFile(new URL('./resultado-6a-browser.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
