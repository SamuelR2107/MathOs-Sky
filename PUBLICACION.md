# Publicación de MathOs-Sky

Preparación local. No se ha creado repositorio ni desplegado el sitio.

## Uso local

Con Node 24 LTS: `node scripts/servidor.js`. Abrir http://127.0.0.1:4173/MathOs-Sky/. El visitante de la web publicada no necesitará Node ni instalar dependencias.

## Construcción estática

```
node --test tests/*.test.js
node scripts/preparar-publicacion.js
node scripts/verificar-publicacion.js
```

El sitio generado contiene 21 archivos: index.html, .nojekyll, css/style.css y 18 módulos js/. El verificador rechaza archivos adicionales, enlaces simbólicos, recursos faltantes, diferencias respecto al fuente y referencias locales. No elimina archivos inesperados automáticamente. No abrir mediante file://; los módulos y el Worker requieren HTTP/HTTPS.

## GitHub Actions

.github/workflows/pages.yml usa Node 24 y acciones oficiales checkout, setup-node, configure-pages, upload-pages-artifact y deploy-pages. Build solo puede leer contenido; deploy recibe pages:write e id-token:write y depende del éxito de build. Solo main despliega, mediante push o ejecución manual. El artifact contiene exclusivamente publicacion/. No se instalan dependencias npm porque no existen dependencias del proyecto.

Después de la aprobación explícita del propietario: crear/configurar el repositorio acordado, subir la selección revisada de fuentes y pruebas, elegir Settings > Pages > Source > GitHub Actions y comprobar workflow y URL real. No iniciar estos pasos antes de aprobar. Las pruebas de navegador son adicionales y locales; el workflow ejecuta las pruebas Node y verifica el artefacto.

La rama prevista es main. Cuenta confirmada: SamuelR2107. Nombre propuesto: MathOs-Sky. URL prevista, todavía no publicada: https://samuelr2107.github.io/MathOs-Sky/.

Un repositorio público permite consultar y descargar sus fuentes, pruebas y fixtures matemáticos. Estos últimos NO se copian al sitio público. No confundir la privacidad del repositorio con el contenido del artifact.

## Evidencia y límites

Verificados localmente el sitio bajo /MathOs-Sky/, sus imports y Worker, en la etapa 7 y repetidos para esta preparación. Los resultados locales no prueban un despliegue remoto. Comprobar después de publicar automático, manual/CRUD, matrices, TSP, candidatas, diagnóstico, animación y cancelación, sin errores de consola ni recursos 404.

Referencia oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
