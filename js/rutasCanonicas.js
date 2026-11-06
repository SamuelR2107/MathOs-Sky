import {validarCantidad,validarOrigen} from './tipos.js';
export function cantidadCanonicas(n) {validarCantidad(n);let f=1;for(let i=2;i<n;i++)f*=i;return f/2;}
// Equivalente a std::next_permutation; permuta solo el interior ascendente.
function siguiente(a) {
 let i=a.length-2;while(i>=0&&a[i]>=a[i+1])i--;if(i<0)return false;
 let j=a.length-1;while(a[j]<=a[i])j--;[a[i],a[j]]=[a[j],a[i]];
 for(let l=i+1,r=a.length-1;l<r;l++,r--)[a[l],a[r]]=[a[r],a[l]];
 return true;
}
/** Cada yield es independiente. O(n!) tiempo, sin poda ni heurística. */
export function* rutasCanonicas(n,origen) {
 validarCantidad(n);validarOrigen(n,origen);
 const interior=Array.from({length:n},(_,i)=>i).filter(i=>i!==origen);
 do {if(interior[0]<interior.at(-1))yield [origen,...interior,origen];}while(siguiente(interior));
}
