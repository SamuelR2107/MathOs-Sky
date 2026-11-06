import test from 'node:test';import assert from 'node:assert/strict';
import {departamentosPeru,obtenerDepartamento,calcularDistanciaHaversine,calcularPesosGeograficos} from '../js/datosPeru.js';
import {fixture,cercano} from './helpers.js';
test('catálogo completo inmutable, 24 IDs y fuentes',()=>{assert.equal(departamentosPeru.length,24);departamentosPeru.forEach((p,i)=>{assert.equal(p.id,i);assert.ok(p.fuente&&p.urlFuente&&p.pagina);assert.ok(Object.isFrozen(p));});});
for(const f of fixture('pares_geograficos'))test(`referencia ${f.nombreA}-${f.nombreB}`,()=>{
 const a=obtenerDepartamento(f.a),b=obtenerDepartamento(f.b);assert.equal(a.latitud,f.latA);assert.equal(a.longitud,f.lonA);assert.equal(b.latitud,f.latB);assert.equal(b.longitud,f.lonB);
 const p=calcularPesosGeograficos(a,b);for(const k of ['distancia','tiempo','costo'])cercano(p[k],f[k]);cercano(calcularDistanciaHaversine(b,a),p.distancia);
});
test('puntos iguales, antipodales y coordenadas inválidas',()=>{
 const a=obtenerDepartamento(0);assert.equal(calcularDistanciaHaversine(a,a),0);assert.throws(()=>calcularPesosGeograficos(a,a));
 cercano(calcularDistanciaHaversine({latitud:0,longitud:0},{latitud:0,longitud:180}),Math.PI*6371);
 for(const latitud of [91,NaN,Infinity,null])assert.throws(()=>calcularDistanciaHaversine({latitud,longitud:0},a));
 assert.throws(()=>obtenerDepartamento(24));
});

test('los 24 pares DMS originales se conservan exactamente',async()=>{
 const {readFileSync}=await import('node:fs');
 const filas=JSON.parse(readFileSync(new URL('./catalogo-dms.json',import.meta.url),'utf8'));
 for(const [id,nombre,capital,a,b,c,d,e,f,pagina] of filas){const p=obtenerDepartamento(+id);assert.equal(p.departamento,nombre);assert.equal(p.capital,capital);assert.equal(p.latitud,-(+a+b/60+c/3600));assert.equal(p.longitud,-(+d+e/60+f/3600));assert.equal(p.pagina,+pagina);}
});
