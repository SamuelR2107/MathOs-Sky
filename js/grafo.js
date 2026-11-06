import {validarCantidad,validarOrigen,validarPesos,validarMetrica} from './tipos.js';
const ausente=()=>({existe:false,distancia:0,tiempo:0,costo:0});
export class Grafo {
 #matriz;
 constructor(n) { validarCantidad(n); this.#matriz=Array.from({length:n},()=>Array.from({length:n},ausente)); }
 obtenerCantidadNodos() { return this.#matriz.length; }
 #validar(a,b) { validarOrigen(this.#matriz.length,a); validarOrigen(this.#matriz.length,b); }
 /** Como Core C++: inserta o reemplaza simétricamente; EntradaManual rechaza duplicados. */
 agregarConexion(a,b,distancia,tiempo,costo) {
  this.#validar(a,b); if(a===b) throw new RangeError('No se permiten lazos.');
  validarPesos(distancia,tiempo,costo);
  const c=Object.freeze({existe:true,distancia,tiempo,costo});
  this.#matriz[a][b]=c;this.#matriz[b][a]=c;
 }
 modificarConexion(a,b,...pesos) {
  if (!this.existeConexion(a,b)) throw new Error('La conexión no existe.');
  this.agregarConexion(a,b,...pesos);
 }
 eliminarConexion(a,b) {this.#validar(a,b);this.#matriz[a][b]=ausente();this.#matriz[b][a]=ausente();}
 existeConexion(a,b) {this.#validar(a,b);return this.#matriz[a][b].existe;}
 obtenerConexion(a,b) {this.#validar(a,b);return {...this.#matriz[a][b]};}
 obtenerPeso(a,b,m) {
  this.#validar(a,b);if(!this.#matriz[a][b].existe) throw new Error('Conexión inexistente: no tiene peso.');
  return this.#matriz[a][b][validarMetrica(m)];
 }
 obtenerMatrizAdyacencia() {return this.#matriz.map(f=>f.map(c=>c.existe?1:0));}
 /** Ausencia y diagonal = 0; consultar existeConexion antes de usar un peso. */
 obtenerMatrizPesos(m) {const campo=validarMetrica(m);return this.#matriz.map(f=>f.map(c=>c[campo]));}
 /** DTO validado y sin referencias mutables internas, para Worker/almacenamiento. */
 toJSON() {
  const aristas=[];
  for(let a=0;a<this.#matriz.length;a++)for(let b=a+1;b<this.#matriz.length;b++) {
   const c=this.#matriz[a][b];if(c.existe) aristas.push([a,b,c.distancia,c.tiempo,c.costo]);
  }
  return {cantidadNodos:this.#matriz.length,aristas};
 }
 static fromJSON(dto) {
  if(!dto||!Array.isArray(dto.aristas))throw new TypeError('Grafo serializado inválido.');
  const g=new Grafo(dto.cantidadNodos);
  for(const e of dto.aristas) {
   if(!Array.isArray(e)||e.length!==5)throw new TypeError('Arista inválida.');
   if(g.existeConexion(e[0],e[1]))throw new Error('Arista duplicada.');
   g.agregarConexion(...e);
  }
  return g;
 }
}
