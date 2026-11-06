import test from 'node:test';
import assert from 'node:assert/strict';
import {Grafo} from '../js/grafo.js';
import {EntradaManual,validarDepartamentos} from '../js/entradaManual.js';
import {serializarResultado,deserializarResultado} from '../js/tipos.js';
for(const n of [4,11,5.5,NaN,'5',null])test(`rechaza cantidad ${n}`,()=>assert.throws(()=>new Grafo(n)));
test('CRUD simétrico, matrices independientes y consultas sin alias',()=>{
 const g=new Grafo(5);g.agregarConexion(0,1,305,270,70);
 assert.deepEqual(g.obtenerConexion(0,1),g.obtenerConexion(1,0));
 for(const [m,v] of [['Distancia',305],['Tiempo',270],['Costo',70]]){assert.equal(g.obtenerPeso(1,0,m),v);const mat=g.obtenerMatrizPesos(m);for(let i=0;i<5;i++){assert.equal(mat[i][i],0);for(let j=0;j<5;j++)assert.equal(mat[i][j],mat[j][i]);}}
 const c=g.obtenerConexion(0,1);c.distancia=-5;assert.equal(g.obtenerPeso(0,1,'Distancia'),305);
 const mat=g.obtenerMatrizAdyacencia();mat[0][1]=0;assert.ok(g.existeConexion(0,1));
 assert.equal(EntradaManual.agregarConexion(g,1,0,1,2,3).valido,false);
 assert.ok(EntradaManual.modificarConexion(g,1,0,1.25,2.5,3.75).valido);
 assert.equal(g.obtenerPeso(0,1,'Tiempo'),2.5);
 assert.ok(EntradaManual.eliminarConexion(g,0,1).valido);assert.equal(g.existeConexion(1,0),false);
 assert.equal(EntradaManual.eliminarConexion(g,0,1).valido,false);assert.throws(()=>g.obtenerPeso(0,1,'Costo'));
});
for(const w of [0,-1,NaN,Infinity,-Infinity,null,'5'])test(`pesos inválidos sin mutación ${w}`,()=>{
 const g=new Grafo(5);g.agregarConexion(0,1,1,2,3);const antes=g.toJSON();
 for(let i=0;i<3;i++){const ps=[1,2,3];ps[i]=w;assert.equal(EntradaManual.modificarConexion(g,0,1,...ps).valido,false);assert.deepEqual(g.toJSON(),antes);}
});
test('lazos, índices, métrica y DTO inválidos',()=>{
 const g=new Grafo(5);
 for(const [a,b] of [[0,0],[-1,2],[0,5],[0,1.5],[0,'1']])assert.throws(()=>g.agregarConexion(a,b,1,2,3));
 assert.throws(()=>g.obtenerMatrizPesos('x'));assert.throws(()=>g.modificarConexion(0,1,1,2,3));
 assert.throws(()=>Grafo.fromJSON({cantidadNodos:5,aristas:[[0,1,1,2,3],[1,0,1,2,3]]}));
 assert.deepEqual(Grafo.fromJSON(g.toJSON()).toJSON(),g.toJSON());
});
test('validación de nombres manuales',()=>{
 assert.ok(validarDepartamentos(['Lima','Ica','Cusco','Puno','Áncash']).valido);
 assert.equal(validarDepartamentos([' Lima ','LIMA','Cusco','Puno','Ica']).valido,false);
});
test('serialización distingue Infinity/null/0 y ausencia',()=>{
 const a={invalida:Infinity,cero:0,nulo:null,mejorRuta:[]};assert.deepEqual(deserializarResultado(serializarResultado(a)),a);
 assert.throws(()=>serializarResultado({a:NaN}));assert.throws(()=>serializarResultado({a:-Infinity}));
});
