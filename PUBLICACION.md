# Publicación de MathOs-Sky

Sitio publicado: https://samuelr2107.github.io/MathOs-Sky/

Repositorio: https://github.com/SamuelR2107/MathOs-Sky. Rama: main. GitHub Actions completó la generación y el despliegue.

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

## Configuración activa

Repositorio público SamuelR2107/MathOs-Sky, rama main, Pages con origen GitHub Actions. El workflow vuelve a probar y desplegar al actualizar main. Las pruebas de navegador se ejecutan adicionalmente fuera de CI; el workflow ejecuta las pruebas Node y verifica el artefacto.

## Verificación de producción

El 6 de noviembre de 2026 se ejecutaron en Edge los flujos reales de la URL pública: automático 5/7/10, manual y edición de conexiones, matrices, TSP y Worker, resultados, candidatas, diagnóstico, avión y cancelación. Sin errores de consola ni recursos HTTP fallidos. Los siete anchos responsive son emulados; no equivalen a pruebas en móviles físicos. Las 109 pruebas Node también aprobaron en GitHub Actions.


Un repositorio público permite consultar y descargar sus fuentes, pruebas y fixtures matemáticos. Estos últimos NO se copian al sitio público. No confundir la privacidad del repositorio con el contenido del artifact.

## Evidencia y límites

Verificados localmente el sitio bajo /MathOs-Sky/, sus imports y Worker, en la etapa 7 y repetidos para esta preparación. La verificación remota está documentada arriba. Para futuras actualizaciones comprobar automático, manual/CRUD, matrices, TSP, candidatas, diagnóstico, animación y cancelación, sin errores de consola ni recursos 404.

Referencia oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
