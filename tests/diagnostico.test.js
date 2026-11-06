import test from 'node:test';import assert from 'node:assert/strict';import {Grafo} from '../js/grafo.js';import {diagnosticarConexionesFaltantes as diagnosticar} from '../js/diagnostico.js';import {fixture,completo} from './helpers.js';
for(const f of fixture('manual_diagnostico').diagnosticos)test(`diagnóstico fixture vacío ${f.n}`,()=>{const r=diagnosticar(new Grafo(f.n),0);assert.equal(r.cantidadCandidatos,f.candidatas);assert.deepEqual(r.rutaCandidata,f.ruta);assert.deepEqual(r.conexionesFaltantes.map(e=>[e.origen,e.destino]),f.faltantes);});
for(const faltan of [1,2])test(`mínimo ${faltan}, distintos orígenes, sin mutar`,()=>{
 const g=new Grafo(5);for(let i=0;i<5-faltan;i++)g.agregarConexion(i,i+1,1,2,3);const antes=g.toJSON();
 for(let o=0;o<5;o++){const r=diagnosticar(g,o);assert.equal(r.cantidadMinimaConexiones,faltan);assert.equal(r.rutaCandidata[0],o);assert.equal(r.rutaCandidata.at(-1),o);assert.equal(r.cantidadCandidatos,12);assert.deepEqual(g.toJSON(),antes);}
 const r=diagnosticar(g,0);assert.deepEqual(r.rutaCandidata,[0,1,2,3,4,0]);assert.deepEqual(r.conexionesFaltantes,faltan===1?[{origen:0,destino:4}]:[{origen:3,destino:4},{origen:0,destino:4}]);
});
test('ciclo existente no recomienda conexiones',()=>{const r=diagnosticar(completo(5),0);assert.equal(r.cantidadMinimaConexiones,0);assert.deepEqual(r.conexionesFaltantes,[]);assert.equal(r.cantidadCandidatos,12);assert.throws(()=>diagnosticar(completo(5),8));});

test('mínimo independiente en las 1024 topologías de cinco nodos',()=>{
 // Oráculo con todas las orientaciones (24), sin reutilizar la enumeración de producción.
 const permutar=a=>a.length?a.flatMap((v,i)=>permutar(a.filter((_,j)=>i!==j)).map(r=>[v,...r])):[[]];
 const rutas=permutar([1,2,3,4]).map(r=>[0,...r,0]);
 const pares=[];for(let a=0;a<5;a++)for(let b=a+1;b<5;b++)pares.push([a,b]);
 for(let mask=0;mask<1024;mask++){
  const g=new Grafo(5);pares.forEach(([a,b],i)=>{if(mask&(1<<i))g.agregarConexion(a,b,1,2,3);});
  const minimo=Math.min(...rutas.map(r=>r.slice(1).filter((b,i)=>!g.existeConexion(r[i],b)).length));
  const resultado=diagnosticar(g,0);assert.equal(resultado.cantidadMinimaConexiones,minimo);assert.equal(resultado.cantidadCandidatos,12);
 }
});
