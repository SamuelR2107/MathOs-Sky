import test from 'node:test';import assert from 'node:assert/strict';import {readdirSync} from 'node:fs';
import {resolverTSP} from '../js/tsp.js';import {Grafo} from '../js/grafo.js';import {fixture,construir,cercano,completo} from './helpers.js';
for(const file of readdirSync(new URL('./fixtures/',import.meta.url)).filter(f=>!['pares_geograficos.json','manual_diagnostico.json'].includes(f)))test(`paridad C++ completa: ${file}`,()=>{
 const f=fixture(file.slice(0,-5)),r=resolverTSP(construir(f),f.origen,f.metrica);
 assert.equal(r.cantidadCandidatos,f.cantidadCandidatos);assert.equal(r.cantidadCiclosValidos,f.cantidadCiclosValidos);assert.deepEqual(r.mejorRuta,f.mejorRuta);
 if(f.mejorValor===null)assert.equal(r.mejorValor,Infinity);else cercano(r.mejorValor,f.mejorValor);
 assert.equal(r.rutas.length,f.rutas.length);
 for(let i=0;i<f.rutas.length;i++){const a=r.rutas[i],b=f.rutas[i];assert.deepEqual(a.ruta,b.ruta);assert.equal(a.valida,b.valida);if(b.valorTotal===null)assert.equal(a.valorTotal,Infinity);else cercano(a.valorTotal,b.valorTotal);}
});
test('validación incluso grafo vacío y overflow',()=>{const g=new Grafo(5);assert.throws(()=>resolverTSP(g,0,'x'));assert.throws(()=>resolverTSP(g,5,'Distancia'));assert.throws(()=>resolverTSP(g,0.5,'Distancia'));const grande=completo(5,Number.MAX_VALUE/4);assert.throws(()=>resolverTSP(grande,0,'Distancia'));});
test('no consulta ningún peso si falta una arista',()=>{const g=new Grafo(5);g.agregarConexion(0,1,1,2,3);g.obtenerPeso=()=>{throw new Error('No debe consultarse');};assert.equal(resolverTSP(g,0,'Distancia').cantidadCiclosValidos,0);});
