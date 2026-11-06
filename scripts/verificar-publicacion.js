// Verifica únicamente el artefacto estático, sin modificarlo.
import assert from 'node:assert/strict';
import {readdir,readFile,lstat} from 'node:fs/promises';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)), out=resolve(root,'publicacion');
const expected=['index.html','.nojekyll'];
for(const dir of ['js','css'])for(const e of await readdir(resolve(root,dir),{withFileTypes:true}))if(e.isFile()&&e.name.endsWith(dir==='js'?'.js':'.css'))expected.push(`${dir}/${e.name}`);
async function walk(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,e.name);assert.ok(!(await lstat(path)).isSymbolicLink(),'No se permiten enlaces simbólicos');if(e.isDirectory())files.push(...await walk(path));else files.push(relative(out,path).split(sep).join('/'));}return files;}
assert.deepEqual((await walk(out)).sort(),expected.sort(),'El artefacto contiene archivos inesperados o faltantes');
for(const name of expected){const data=await readFile(resolve(out,name),'utf8');if(name==='.nojekyll'){assert.equal(data,'');continue;}
 assert.equal(data,await readFile(resolve(root,name),'utf8'),`Copia distinta: ${name}`);
 assert.ok(!/(?:localhost|127\.0\.0\.1|[A-Z]:\\Users\\|BEGIN (?:RSA |EC )?PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{20,})/i.test(data),`Referencia local o secreto: ${name}`);
 const refs=name.endsWith('.html')?[...data.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]):name.endsWith('.js')?[...data.matchAll(/(?:from\s*|import\s*|new URL\(\s*)["']([^"']+)["']/g)].map(m=>m[1]):[...data.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)].map(m=>m[1]);
 for(const ref of refs){if(/^(?:#|https?:|data:)/.test(ref))continue;assert.ok(ref.startsWith('./')||ref.startsWith('../'),`Ruta no relativa: ${ref}`);const target=resolve(dirname(resolve(out,name)),ref.split(/[?#]/)[0]);assert.ok(target.startsWith(out+sep),'Ruta fuera del artefacto');assert.ok((await lstat(target)).isFile(),`Recurso inexistente: ${ref}`);}
}
console.log(`Publicación verificada: ${expected.length} archivos, index.html y rutas relativas, sin archivos internos.`);
