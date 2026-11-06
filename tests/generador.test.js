import test from 'node:test';import assert from 'node:assert/strict';import {generarGrafo,seleccionarDepartamentos,crearAleatorio} from '../js/generador.js';import {resolverTSP} from '../js/tsp.js';import {calcularPesosGeograficos,obtenerDepartamento} from '../js/datosPeru.js';
for(const n of [5,7,10])for(const garantia of [true,false])for(const prob of [0,1,0.35])test(`generador n=${n} garantía=${garantia} p=${prob}`,()=>{
 const ids=seleccionarDepartamentos(n,42),c={cantidadNodos:n,garantizarCicloHamiltoniano:garantia,probabilidadConexion:prob,semilla:42};
 const g=generarGrafo(c,ids);assert.deepEqual(g.toJSON(),generarGrafo(c,ids).toJSON());assert.equal(new Set(ids).size,n);
 const e=g.toJSON().aristas;
 if(prob===0)assert.equal(e.length,garantia?n:0);if(prob===1)assert.equal(e.length,n*(n-1)/2);
 assert.equal(new Set(e.map(x=>`${x[0]}-${x[1]}`)).size,e.length);
 for(const [a,b,d,t,costo] of e)assert.deepEqual({distancia:d,tiempo:t,costo},calcularPesosGeograficos(obtenerDepartamento(ids[a]),obtenerDepartamento(ids[b])));
 const r=resolverTSP(g,0,'Distancia');if(garantia)assert.ok(r.cantidadCiclosValidos>0);if(!garantia&&prob===0)assert.equal(r.cantidadCiclosValidos,0);
});
test('configuraciones inválidas',()=>{for(const c of [{cantidadNodos:4},{semilla:-1},{semilla:1.1},{probabilidadConexion:NaN},{probabilidadConexion:2},{garantizarCicloHamiltoniano:'sí'}])assert.throws(()=>generarGrafo(c));assert.throws(()=>generarGrafo({},[0,1,2,3,3]));assert.throws(()=>generarGrafo({},[0,1,2,3,24]));});
test('Mulberry32 secuencia fija',()=>{const a=crearAleatorio(42);assert.deepEqual(Array.from({length:3},a),[0.6011037519201636,0.44829055899754167,0.8524657934904099]);});
