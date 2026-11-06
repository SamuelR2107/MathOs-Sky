import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {Grafo} from '../js/grafo.js';
export const fixture=n=>JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`,import.meta.url),'utf8'));
export const construir=f=>Grafo.fromJSON({cantidadNodos:f.n,aristas:f.aristas});
// Tolerancia solo en pruebas de flotantes; jamás en decisión de óptimos.
export const cercano=(a,b)=>assert.ok(Math.abs(a-b)<=1e-10+1e-12*Math.abs(b),`${a} != ${b}`);
export function completo(n,p=1){const g=new Grafo(n);for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)g.agregarConexion(a,b,p,p*2,p*3);return g;}
