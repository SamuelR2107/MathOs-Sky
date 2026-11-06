import test from 'node:test';
import assert from 'node:assert/strict';
import {CalculoTSP} from '../js/calculoTSP.js';
function harness(){
 let s={grafo:{cantidadNodos:5,aristas:[]},origen:0,metrica:'Distancia',revision:1};const events=[],workers=[];
 const c=new CalculoTSP({leer:()=>s,notificar:m=>events.push(m),crearWorker:()=>{const w={sent:[],postMessage(m){this.sent.push(m);},terminate(){this.dead=true;}};workers.push(w);return w;}});
 const send=(tipo,extra={})=>{const w=workers.at(-1),start=w.sent[0];w.onmessage({data:{...start,tipo,...extra}});};
 return {c,events,workers,send,s};
}
test('6B: impide duplicados y recrea Worker al recalcular la misma revisión',()=>{const h=harness();h.c.iniciar();h.c.iniciar();assert.equal(h.workers.length,1);h.c.cancelar();assert.ok(h.workers[0].dead);h.c.iniciar();assert.equal(h.workers.length,2);assert.equal(h.workers[1].sent[0].revision,1);assert.notEqual(h.workers[0].sent[0].id,h.workers[1].sent[0].id);});
test('6B: cancelación envía protocolo, termina Worker y conserva escenario',()=>{const h=harness(),before=structuredClone(h.s);h.c.iniciar();h.c.cancelar();assert.equal(h.workers[0].sent[1].tipo,'cancelar');assert.equal(h.c.estado,'cancelado');assert.deepEqual(h.s,before);});
test('6B: rechaza respuesta de revisión antigua',()=>{const h=harness();h.c.iniciar();h.s.revision++;h.send('resultado',{resultado:{cantidadCiclosValidos:1}});assert.ok(!h.events.some(m=>m.tipo==='resultado'));h.c.invalidar();assert.equal(h.c.estado,'obsoleto');assert.ok(h.workers[0].dead);});
test('6B: rechaza callback tardío incluso recalculando misma revisión',()=>{const h=harness();h.c.iniciar();const old=h.workers[0].onmessage,start=h.workers[0].sent[0];h.c.cancelar();h.c.iniciar();old({data:{...start,tipo:'resultado',resultado:{cantidadCiclosValidos:1}}});assert.ok(!h.events.some(m=>m.tipo==='resultado'));});
test('6B: correlación evita páginas recibidas fuera de orden',()=>{const h=harness();h.c.iniciar();h.send('resultado',{resultado:{cantidadCiclosValidos:1}});h.c.consultar('pagina',{inicio:100});h.send('pagina',{pedido:1,inicio:0,rutas:[]});h.send('pagina',{pedido:2,inicio:100,rutas:[]});assert.deepEqual(h.events.filter(m=>m.tipo==='pagina').map(m=>m.inicio),[100]);});
test('6B: errores de página no destruyen el resultado',()=>{const h=harness();h.c.iniciar();h.send('resultado',{resultado:{cantidadCiclosValidos:1}});h.send('error',{solicitud:'pagina',pedido:1,mensaje:'Página inválida'});assert.equal(h.c.estado,'completado');assert.equal(h.events.at(-1).tipo,'error-consulta');});
test('6B: Worker no disponible permite reintento sin perder datos',()=>{const h=harness();h.c.crearWorker=()=>{throw Error('Worker no disponible');};h.c.iniciar();assert.equal(h.c.estado,'error');assert.ok(h.s.grafo);assert.equal(h.c.ocupado,false);});
test('6B: valida escenario, origen y métrica antes de crear Worker',()=>{for(const patch of [{grafo:null},{origen:8},{metrica:'otro'}]){const h=harness();Object.assign(h.s,patch);h.c.iniciar();assert.equal(h.c.estado,'error');assert.equal(h.workers.length,0);}});
test('6B: resultado sin ciclo conserva diagnóstico y solicita primera página',()=>{const h=harness();h.c.iniciar();h.send('resultado',{resultado:{cantidadCiclosValidos:0},diagnostico:{cantidadMinimaConexiones:5}});assert.equal(h.c.estado,'sin-ciclo');assert.equal(h.events.find(m=>m.tipo==='resultado').diagnostico.cantidadMinimaConexiones,5);assert.equal(h.workers[0].sent.at(-1).limite,100);});
test('6B: error de ejecución y error de clonación liberan recursos',()=>{for(const kind of ['onerror','onmessageerror']){const h=harness();h.c.iniciar();h.workers[0][kind]({preventDefault(){}});assert.equal(h.c.estado,'error');assert.ok(h.workers[0].dead);}});
