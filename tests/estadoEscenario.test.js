import test from 'node:test';
import assert from 'node:assert/strict';
import {EstadoEscenario} from '../js/estadoEscenario.js';
import {calcularPesosGeograficos,obtenerDepartamento} from '../js/datosPeru.js';
const ids=[13,9,3,6,4];
const manual=()=>{const e=new EstadoEscenario();e.crearManual(ids);return e;};
test('integración: IDs geográficos altos traducidos a índices locales',()=>{
 const e=manual(),v=e.obtenerVista();assert.deepEqual(v.nodos.map(n=>n.id),[0,1,2,3,4]);assert.deepEqual(v.nodos.map(n=>n.idGeografico),ids);assert.deepEqual(v.nodos.map(n=>n.nombre),['Lima','Ica','Arequipa','Cusco','Ayacucho']);assert.equal(v.conexiones.length,0);
 assert.equal(e.obtenerMatrices().adyacencia.flat().reduce((a,b)=>a+b,0),0);assert.equal(e.leer().origen,0);
});
for(const n of [5,7,10])test(`integración: automático ${n} reproduce generador y crea aristas reales`,()=>{
 const e=new EstadoEscenario();e.crearAutomatico({cantidadNodos:n,semilla:42,garantizarCicloHamiltoniano:true,probabilidadConexion:0});const s=e.leer();assert.equal(s.idsGeograficos.length,n);assert.equal(s.grafo.aristas.length,n);assert.equal(new Set(s.idsGeograficos).size,n);
 for(const [a,b,d,t,c] of s.grafo.aristas)assert.deepEqual({distancia:d,tiempo:t,costo:c},calcularPesosGeograficos(obtenerDepartamento(s.idsGeograficos[a]),obtenerDepartamento(s.idsGeograficos[b])));
});
test('integración: CRUD simétrico, matrices y revisiones',()=>{
 const e=manual();let rev=e.revision;e.prepararEdicion(0,1);e.guardarConexion({origen:0,destino:1,distancia:305,tiempo:270,costo:70});assert.equal(e.revision,++rev);
 for(const [m,v] of [['distancia',305],['tiempo',270],['costo',70]]){const a=e.obtenerMatrices()[m];assert.equal(a[0][1],v);assert.equal(a[1][0],v);}
 e.prepararEdicion(1,0);e.guardarConexion({origen:1,destino:0,distancia:.125,tiempo:3.55,costo:91});assert.equal(e.revision,++rev);assert.equal(e.leer().grafo.aristas.length,1);assert.equal(e.obtenerMatrices().distancia[0][1],.125);
 e.eliminarConexion();assert.equal(e.revision,++rev);assert.equal(e.leer().grafo.aristas.length,0);assert.equal(e.obtenerMatrices().adyacencia[1][0],0);
});
test('integración: sugerencias no mutan el grafo ni la revisión',()=>{
 const e=manual(),before=e.leer(),p=e.sugerirPesos(0,1);assert.deepEqual(e.leer(),before);assert.equal(p.distancia,calcularPesosGeograficos(obtenerDepartamento(13),obtenerDepartamento(9)).distancia);
});
for(const bad of [0,-1,NaN,Infinity])test(`integración: rechazo ${bad} sin mutación parcial`,()=>{
 const e=manual();e.prepararEdicion(0,1);const before=e.leer();assert.throws(()=>e.guardarConexion({origen:0,destino:1,distancia:1,tiempo:bad,costo:3}));assert.deepEqual(e.leer(),before);
});
test('integración: sin escenario, lazos, índices inválidos y selecciones inválidas',()=>{
 const e=new EstadoEscenario();assert.throws(()=>e.prepararEdicion(0,1));assert.throws(()=>e.sugerirPesos(0,1));
 for(const invalid of [[1,2],[0,1,2,3,3],[0,1,2,3,24]])assert.throws(()=>e.crearManual(invalid));assert.equal(e.leer().grafo,null);
 e.crearManual(ids);for(const [a,b] of [[0,0],[13,1],[-1,2],[0,1.1]])assert.throws(()=>e.prepararEdicion(a,b));assert.equal(e.leer().grafo.aristas.length,0);
});
test('integración: personalizar conserva departamentos, origen y pesos',()=>{
 const e=new EstadoEscenario();e.crearAutomatico({cantidadNodos:5,semilla:19,garantizarCicloHamiltoniano:true});e.cambiarOrigen(3);e.cambiarMetrica('Costo');const before=e.leer();e.personalizar();const after=e.leer();assert.deepEqual(after.grafo,before.grafo);assert.deepEqual(after.idsGeograficos,before.idsGeograficos);assert.equal(after.origen,3);assert.equal(after.metrica,'Costo');assert.equal(after.modo,'manual');
});
test('integración: resultados obsoletos y protección contra revisiones antiguas',()=>{
 const e=manual(),r=e.revision;assert.equal(e.registrarResultado({prueba:true},r),true);e.cambiarOrigen(2);assert.equal(e.revision,r+1);assert.equal(e.leer().resultados.estado,'obsoleto');assert.equal(e.leer().resultados.valor,null);assert.equal(e.registrarResultado({},r),false);const rev=e.revision;e.cambiarMetrica('Tiempo');assert.equal(e.revision,rev+1);e.cambiarMetrica('Tiempo');assert.equal(e.revision,rev+1);
});
test('integración: cambiar modo limpia dependencias y una edición obsoleta no guarda',()=>{
 const e=manual();e.prepararEdicion(0,1);e.cambiarOrigen(3);assert.throws(()=>e.guardarConexion({origen:0,destino:1,distancia:1,tiempo:2,costo:3}));e.cambiarModo('automatico');const s=e.leer();assert.equal(s.grafo,null);assert.equal(s.origen,null);assert.equal(s.edicion,null);assert.deepEqual(s.idsGeograficos,[]);
});
test('integración: snapshots defensivos no exponen el grafo mutable',()=>{
 const e=manual();const a=e.leer();a.idsGeograficos[0]=0;a.grafo.aristas.push([0,1,1,2,3]);const view=e.obtenerVista();view.nodos[0].nombre='falso';assert.equal(e.leer().idsGeograficos[0],13);assert.equal(e.leer().grafo.aristas.length,0);assert.equal(e.obtenerVista().nodos[0].nombre,'Lima');
});
