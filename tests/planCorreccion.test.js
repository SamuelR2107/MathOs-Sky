import test from 'node:test';
import assert from 'node:assert/strict';
import {EstadoEscenario} from '../js/estadoEscenario.js';
import {Grafo} from '../js/grafo.js';
import {diagnosticarConexionesFaltantes} from '../js/diagnostico.js';
import {resolverTSP} from '../js/tsp.js';
const ids=[13,9,3,6,4];
const save=(s,a,b,p=1)=>{s.prepararEdicion(a,b);s.guardarConexion({origen:a,destino:b,distancia:p,tiempo:p*2,costo:p*3});};
function calculate(s){const g=Grafo.fromJSON(s.leer().grafo),r=resolverTSP(g,s.leer().origen,s.leer().metrica);s.registrarResultado(r,s.revision);s.registrarPlan(r.cantidadCiclosValidos?null:diagnosticarConexionesFaltantes(g,s.leer().origen),s.revision);return r;}
function empty(){const s=new EstadoEscenario();s.crearManual(ids);calculate(s);return s;}
test('plan: vacío5, pendientes reales 5→0, resultados invalidados y TSP solo al final',()=>{
 const s=empty();assert.equal(s.leer().resultados.valor.cantidadCandidatos,12);assert.equal(s.leer().resultados.valor.cantidadCiclosValidos,0);
 const original=s.obtenerPlan();assert.equal(original.total,5);
 original.conexiones.forEach((e,i)=>{save(s,e.destino,e.origen);const p=s.obtenerPlan();assert.equal(p.pendientes.length,4-i);assert.equal(p.agregadas,i+1);assert.equal(p.minimoVigente,true);assert.equal(s.leer().resultados.valor,null);assert.equal(s.leer().grafo.aristas.length,i+1);});
 const r=calculate(s);assert.equal(r.cantidadCandidatos,12);assert.equal(r.cantidadCiclosValidos,1);assert.equal(r.mejorValor,5);assert.equal(s.obtenerPlan(),null);
});
test('plan: cancelar y pesos inválidos no cambian pendientes ni grafo',()=>{const s=empty(),before=s.obtenerPlan();s.prepararEdicion(0,1);s.cerrarEdicion();assert.deepEqual(s.obtenerPlan(),before);assert.throws(()=>save(s,0,1,0));assert.deepEqual(s.obtenerPlan(),before);assert.equal(s.leer().grafo.aristas.length,0);});
test('plan: normaliza y deduplica extremos no dirigidos',()=>{const s=empty();const d=diagnosticarConexionesFaltantes(Grafo.fromJSON(s.leer().grafo),0);d.conexionesFaltantes.push({origen:1,destino:0});s.registrarPlan(d,s.revision);assert.equal(s.obtenerPlan().total,5);save(s,1,0);assert.equal(s.obtenerPlan().pendientes.length,4);assert.ok(s.obtenerPlan().conexiones.every(e=>e.origen<e.destino));});
test('plan: arista ajena conserva utilidad pero no afirma mínimo actual',()=>{const s=empty();save(s,0,2);const p=s.obtenerPlan();assert.equal(p.pendientes.length,5);assert.equal(p.minimoVigente,false);assert.equal(p.garantizaRecorrido,true);});
test('plan: eliminar arista del recorrido no incluida originalmente requiere actualizar',()=>{const s=new EstadoEscenario();s.crearManual(ids);for(let i=0;i<4;i++)save(s,i,i+1);calculate(s);assert.equal(s.obtenerPlan().total,1);s.prepararEdicion(1,2);s.eliminarConexion();const p=s.obtenerPlan();assert.equal(p.garantizaRecorrido,false);assert.deepEqual(p.adicionales,[{origen:1,destino:2}]);assert.equal(p.minimoVigente,false);save(s,0,4);assert.equal(s.obtenerPlan().pendientes.length,0);assert.equal(s.obtenerPlan().garantizaRecorrido,false);calculate(s);assert.equal(s.obtenerPlan().pendientes.length,1);});
test('plan: eliminar recomendación agregada recupera pendiente por existencia real',()=>{const s=empty();save(s,0,1);s.eliminarConexion();assert.equal(s.obtenerPlan().pendientes.length,5);assert.equal(s.obtenerPlan().agregadas,0);});
test('plan: pesos, origen y métrica conservan propuesta; resultados se invalidan',()=>{const s=empty();save(s,0,1);const plan=s.obtenerPlan();save(s,1,0,2);s.cambiarOrigen(3);s.cambiarMetrica('Costo');assert.deepEqual(s.obtenerPlan(),plan);assert.equal(s.leer().resultados.valor,null);});
test('plan: escenario nuevo y cambio de modo descartan propuesta',()=>{const s=empty();s.crearManual(ids);assert.equal(s.obtenerPlan(),null);calculate(s);s.cambiarModo('automatico');assert.equal(s.obtenerPlan(),null);});
test('plan: resultado y diagnóstico tardíos no contaminan otro escenario',()=>{const s=empty();const rev=s.revision,d=diagnosticarConexionesFaltantes(Grafo.fromJSON(s.leer().grafo),0);s.crearManual(ids);assert.equal(s.registrarPlan(d,rev),false);assert.equal(s.registrarResultado({},rev),false);assert.equal(s.obtenerPlan(),null);});
test('plan: DTO defensivo no permite mutar propuesta ni grafo',()=>{const s=empty(),p=s.obtenerPlan();p.conexiones.length=0;p.pendientes[0].origen=99;p.ruta[0]=99;assert.equal(s.obtenerPlan().total,5);assert.equal(s.obtenerPlan().ruta[0],0);assert.equal(s.leer().grafo.aristas.length,0);});
