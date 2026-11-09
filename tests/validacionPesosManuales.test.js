import test from 'node:test';
import assert from 'node:assert/strict';
import {LIMITES_PESOS_MANUALES as L,evaluarPesosManuales as evaluar,evaluarPesosEntreDepartamentos} from '../js/validacionPesosManuales.js';
import {departamentosPeru,calcularPesosGeograficos} from '../js/datosPeru.js';
import {Grafo} from '../js/grafo.js';
import {EntradaManual} from '../js/entradaManual.js';
const ref={distancia:100,tiempo:100,costo:100};
test('formulario: las 276 parejas y sus valores de modelo son habituales y simétricos',()=>{
 let count=0;
 for(let a=0;a<24;a++)for(let b=a+1;b<24;b++){
  const r=calcularPesosGeograficos(departamentosPeru[a],departamentosPeru[b]);assert.equal(evaluarPesosEntreDepartamentos(r,a,b).nivel,'habitual');assert.equal(evaluarPesosEntreDepartamentos(r,b,a).nivel,'habitual');count++;
 }assert.equal(count,276);
});
test('formulario: aproximaciones y decimales se aceptan sin cambiar pesos independientes',()=>{
 const v={distancia:'120.125',tiempo:'90.5',costo:'150.01'},copy={...v};const e=evaluar(v,ref);assert.equal(e.nivel,'habitual');assert.deepEqual(v,copy);assert.equal(e.campos.costo.valor,150.01);
});
for(const [key,l] of Object.entries(L)){
 test(`formulario: ${key} límites inclusivos y mensajes por campo`,()=>{
  for(const factor of [l.habitualMin,l.habitualMax])assert.equal(evaluar({...ref,[key]:100*factor},ref).campos[key].nivel,'habitual');
  for(const factor of [l.permitidoMin,l.permitidoMax]){const c=evaluar({...ref,[key]:100*factor},ref).campos[key];assert.equal(c.nivel,'atipico');assert.match(c.mensaje,/Requiere confirmación/);assert.equal(c.mensaje,'Valor inusual. Requiere confirmación.');}
  for(const v of [100*l.permitidoMin-1e-6,100*l.permitidoMax+1e-6]){const e=evaluar({...ref,[key]:v},ref);assert.equal(e.nivel,'invalido');assert.match(e.campos[key].mensaje,/Fuera del rango permitido/);assert.equal(e.campos[Object.keys(ref).find(k=>k!==key)].nivel,'habitual');}
 });
 test(`formulario: ${key} valores no numéricos, vacíos y peligrosos`,()=>{
  for(const v of ['', ' ', 'texto','0x10',null,undefined,false,NaN,Infinity,-Infinity,'NaN','Infinity',0,-1,1e-7,Number.MAX_VALUE])assert.equal(evaluar({...ref,[key]:v},ref).nivel,'invalido',String(v));
 });
 test(`formulario: ${key} límites absolutos también restringen referencias artificiales`,()=>{
  const v=l.absolutoMax*2;assert.equal(evaluar({...ref,[key]:v},{...ref,[key]:v}).nivel,'invalido');assert.equal(evaluar({...ref,[key]:l.absolutoMin/2},{...ref,[key]:l.absolutoMin/2}).nivel,'invalido');
 });
}
test('formulario: referencia ausente no permite guardar',()=>{assert.equal(evaluar(ref,{}).nivel,'invalido');assert.match(evaluar(ref,{}).campos.tiempo.mensaje,/Rango no válido/);});
test('formulario: Lima-Ica acepta300/450, advierte800 y rechaza extremos',()=>{
 const r=calcularPesosGeograficos(departamentosPeru[13],departamentosPeru[9]);
 for(const d of [300,450])assert.equal(evaluar({...r,distancia:d},r).nivel,'habitual');assert.equal(evaluar({...r,distancia:800},r).nivel,'atipico');for(const d of [.001,100000])assert.equal(evaluar({...r,distancia:d},r).nivel,'invalido');
});
test('formulario: restricciones no redefinen Grafo ni EntradaManual matemáticos',()=>{const g=new Grafo(5);assert.equal(EntradaManual.agregarConexion(g,0,1,1e-7,1,999999999).valido,true);assert.equal(g.obtenerPeso(1,0,'Distancia'),1e-7);});

test('formulario: mensajes breves sin perder clasificación ni referencia numérica',()=>{
 for(const [key,l] of Object.entries(L))for(const value of ['',100*l.permitidoMin-1,100*l.permitidoMax]){
  const c=evaluar({...ref,[key]:value},ref).campos[key];assert.ok(c.mensaje.length<115);assert.equal(c.referencia,100);assert.ok(Number.isFinite(c.minimo));assert.ok(Number.isFinite(c.maximo));
 }
});

test('formulario: errores simples sin rangos decimales y sin alterar límites',()=>{
 const cases=[['','Valor inválido.'],[0,'Valor inválido.'],[.001,'Fuera del rango permitido.'],[10000,'Fuera del rango permitido.']];
 for(const [valor,mensaje] of cases){const c=evaluar({...ref,distancia:valor},ref).campos.distancia;assert.equal(c.mensaje,mensaje);assert.equal(c.minimo,40);assert.equal(c.maximo,400);assert.equal(c.nivel,'invalido');}
});
