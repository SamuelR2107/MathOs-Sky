# MathOs-Sky Web

Aplicación de escenarios automáticos y manuales, conexiones, matrices, TSP real por fuerza bruta, resultados SVG, candidatas paginadas y diagnóstico de conexiones mínimas faltantes. HTML/CSS y módulos JavaScript, sin frameworks, backend ni dependencias de producción.

## Abrir

Extraer todo el ZIP. Desde esta carpeta, con Node 22 o posterior:

```sh
node scripts/servidor.js
```

Abrir http://127.0.0.1:4173/MathOs-Sky/ y detener el servidor con Ctrl+C. También sirve `npm start` si npm está instalado. No abrir index.html mediante file://: los módulos y el Worker requieren HTTP. No hace falta npm install.

Crear un escenario, elegir origen y prioridad y pulsar Encontrar mejor recorrido. En manual, seleccionar 5–10 departamentos y guardar sus conexiones. Un grafo incompleto también se puede resolver. Las recomendaciones sin ciclo nunca se agregan automáticamente ni reciben pesos inventados.

## Pruebas

```sh
node --test tests/*.test.js
node --expose-gc tests/benchmark.js
```

`npm test` ejecuta el mismo comando, sin --test-isolation (compatible con la sintaxis de Node22.16). Verificado aquí con Node24.22.1; no se ejecutó Node22 ni npm en este entorno.

Para pruebas opcionales en Edge: instalar Playwright fuera del proyecto y definir PLAYWRIGHT_MODULE con la ruta absoluta a su index.mjs; ejecutar:

```sh
node tests/escenarios.browser.js
node tests/calculo.browser.js
node tests/worker.browser.js
node tests/animacion.browser.js
```

Estos harnesses levantan y cierran su servidor y navegador. Los fixtures solo se cargan desde pruebas. La aplicación no los descarga ni usa datos de demostración.

## Organización

- js/grafo.js, tipos.js: modelo, DTO y validaciones.
- js/datosPeru.js, generador.js, entradaManual.js: catálogo, pesos académicos, generación y CRUD.
- js/rutasCanonicas.js, tsp.js, diagnostico.js: motor matemático conservado.
- js/tsp.worker.js: procesamiento por lotes, diagnóstico, páginas y consulta del mejor parcial.
- js/estadoEscenario.js: único propietario del escenario mutable y su revisión.
- js/calculoTSP.js: ciclo de vida y comunicaciones con el Worker.
- js/controlador.js: coordinación de estado, eventos ui:* y presentación.
- js/interfaz.js, visualizacion.js: componentes DOM y SVG; no resuelven TSP.
- index.html, css/style.css: diseño responsive existente.

## Reglas

Origen fijo, permutaciones lexicográficas, una orientación por ciclo no dirigido (primer interior < último interior). Cierre al origen. Verificación de conexiones antes de sumar pesos. Comparación estricta `<`: empate conserva la primera candidata. Completo5 =12 válidas; completo10 =181440. No todas las candidatas de un grafo incompleto son válidas. Rutas inválidas conservan Infinity internamente y se muestran sin valor.

Complejidad factorial; candidatas completas permanecen en el Worker (memoria O(n*(n−1)!/2)); la página recibe como máximo100. No hay poda ni heurísticas. Consultar el mejor parcial recorre los resultados ya calculados desde el índice0 hasta la candidata seleccionada, dentro del Worker; no vuelve a ejecutar TSP ni considera solamente la página visible.

Los IDs del grafo son locales 0..n−1, distintos de los IDs geográficos0..23. Distancia, tiempo y costo son independientes. Haversine entre capitales usa radio6371km. Tiempo =30 +60*(min(d,200)/300 +max(0,d−200)/650); costo =20 +0.15*d +0.30*(tiempo−30). Son estimaciones académicas, no carreteras, horarios ni precios comerciales. Los campos y cálculos conservan Number completo; solo la presentación redondea.

## Worker y revisiones

Mensajes iniciar/cancelar/pagina/detalle llevan id y revision. Inicio recibe grafo DTO, origen y metrica. Respuestas iniciado/progreso/resultado/pagina/detalle/error. Progreso real por fase tsp/diagnostico y lotes1024. La UI bloquea mutaciones mientras calcula. Cada ejecución crea un Worker nuevo: permite recalcular la misma revisión y libera memoria anterior. Cancelar envía cancelar y termina el Worker, preservando escenario. No es pausa/reanudación.

El adaptador verifica identidad del Worker, ID y revisión actuales; páginas y detalles llevan además pedido para descartar respuestas fuera de orden. Detalle recibe indice y devuelve candidata, conexionesFaltantes y mejorParcial con índice original. Error de página conserva el resultado y permite reintentar. Error de cálculo libera recursos y restablece controles. Los cambios del escenario invalidan y eliminan las vistas anteriores.

La aplicación solo persiste durante la sesión. La reproducción SVG utiliza rutas reales, con pausa, continuación, reinicio y velocidades0.5x/1x/2x. No hay publicación en GitHub Pages; importaciones relativas verificadas bajo /MathOs-Sky/.

Ver INFORME_ETAPA6C.md para el reporte y tests/resultado-6b-browser.json y resultado-6b-node.txt para evidencia. Las pruebas móviles son viewports de Edge en escritorio, no teléfonos físicos.


## Reproducción y exploración (6C)

Mi recorrido reproduce el óptimo real; Explorar el cálculo reproduce la candidata seleccionada, sin sustituirla por el óptimo. Ver mejor recorrido vuelve al resultado global y reinicia la reproducción, sin calcular nuevamente. Ninguna animación comienza automáticamente.

- reproductorRuta.js: estado temporal y RAF, con reloj inyectable para pruebas. 1100ms visuales por tramo a1x, independientes de los pesos. Pausa conserva segmento/progreso; reinicio vuelve al origen; completado se detiene sin bucle. Reproducir nuevamente empieza desde el origen. Se detiene antes de la primera arista inexistente.
- panelReproduccion.js: controles y progreso textual/visual compartidos por óptimo y candidatas. Estados: listo, reproduciendo, pausado, bloqueado y completado; destruir invalida callbacks.
- visualizacion.js: interpolación sobre geometría actual, orientación atan2 y avión SVG sin imágenes. Solo cambia transform y progreso por cuadro; estilos por cambio de tramo/estado. ResizeObserver recalcula geometría y reaplica el progreso conservado.
- Navegar, cambiar pestaña, ocultar documento o abrir editor pausa. Regresar requiere Continuar explícito. Cambiar candidata, página o resultado descarta la reproducción correspondiente. Una mutación del escenario limpia resultados y reproductores de su revisión.
- prefers-reduced-motion ofrece Siguiente tramo: posiciones estáticas sin RAF, respetando faltantes. Controles nativos por teclado y aria-live solo por estado/tramo.
- El detalle muestra conexiones y pesos reales, suma del motor si válida, faltantes, mejor parcial e inverso equivalente. Presentación redondeada; cálculos con precisión completa. Al abrir un par en el editor se destacan las dos celdas simétricas en matrices, sin cambiar sus valores.

Verificación:105 pruebas (91 anteriores intactas +14 nuevas). Edge real con tamaños360/390/430/768/1366/1440/1920; no teléfonos físicos ni otros navegadores. C++, motor y fixtures intactos; sin despliegue. Evidencia actual en tests/resultado-6c-node.txt y tests/resultado-6c-browser.json. Los ZIP excluyen capturas y dependencias instaladas.

## Auditoría final

Consultar PUBLICACION.md; el informe de auditoría se conserva en la copia de desarrollo. Se ejecutaron 109 pruebas Node y regresiones de navegador. Para repetir la auditoría estática: `node tests/auditoria.browser.js` (requiere PLAYWRIGHT_MODULE y Edge; BROWSER_CHANNEL=chrome selecciona Chrome).
