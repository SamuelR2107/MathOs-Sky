import {calcularPesosGeograficos,obtenerDepartamento} from './datosPeru.js';
/** Política de uso del FORMULARIO; no redefine los pesos admitidos por Grafo/TSP.
 * Multiplicadores UX, no tarifas ni límites científicos. Extremos inclusivos.
 * Cada campo se compara con su propia referencia, nunca con otro peso manual. */
export const LIMITES_PESOS_MANUALES=Object.freeze({
 distancia:Object.freeze({nombre:'Distancia',unidad:'km',habitualMin:.75,habitualMax:2.5,permitidoMin:.4,permitidoMax:4,absolutoMin:.01,absolutoMax:10000}),
 tiempo:Object.freeze({nombre:'Tiempo',unidad:'min',habitualMin:.7,habitualMax:3,permitidoMin:.3,permitidoMax:6,absolutoMin:.1,absolutoMax:14400}),
 costo:Object.freeze({nombre:'Costo',unidad:'S/',habitualMin:.6,habitualMax:3,permitidoMin:.2,permitidoMax:6,absolutoMin:.01,absolutoMax:100000})
});
function leerNumero(valor){
 if(typeof valor==='number')return valor;
 if(typeof valor!=='string'||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(valor.trim()))return NaN;
 return Number(valor);
}
export function evaluarPesosManuales(valores,referencia){
 const campos={};
 for(const [clave,l] of Object.entries(LIMITES_PESOS_MANUALES)){
  const valor=leerNumero(valores?.[clave]),ref=referencia?.[clave];
  const minimo=Math.max(l.absolutoMin,ref*l.permitidoMin),maximo=Math.min(l.absolutoMax,ref*l.permitidoMax);
  let nivel='habitual',mensaje='';
  if(!Number.isFinite(valor)||valor<=0) {nivel='invalido';mensaje=`Valor inválido.`;}
  else if(!Number.isFinite(ref)||ref<=0||minimo>maximo){nivel='invalido';mensaje=`Rango no válido.`;}
  else if(valor<minimo||valor>maximo){nivel='invalido';mensaje=`Fuera del rango permitido.`;}
  else if(valor<ref*l.habitualMin||valor>ref*l.habitualMax){nivel='atipico';mensaje=`Valor inusual. Requiere confirmación.`;}
  campos[clave]={nivel,mensaje,valor,referencia:ref,minimo,maximo};
 }
 const nivel=Object.values(campos).some(c=>c.nivel==='invalido')?'invalido':Object.values(campos).some(c=>c.nivel==='atipico')?'atipico':'habitual';
 return {nivel,campos,mensaje:{habitual:'Valores correctos.',atipico:'Valores inusuales. Revisa antes de guardar.',invalido:'Revisa los campos marcados.'}[nivel]};
}
export function evaluarPesosEntreDepartamentos(valores,idA,idB){
 return evaluarPesosManuales(valores,calcularPesosGeograficos(obtenerDepartamento(idA),obtenerDepartamento(idB)));
}
