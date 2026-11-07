# MathOs-Sky Web — integración final de mejoras manuales

> Informe histórico de validación anterior a la autorización de publicación. Las referencias a cambios locales/no publicados describen ese momento; el estado posterior se consulta en GitHub Actions.

Fecha:6 de noviembre de 2026. Copia revisada: MathOs-Sky-Diagnostico. Rama local: fix/diagnostico-interactivo. Entregable: MathOs-Sky_Web_MejorasManual_Final.zip. No se ha realizado push, merge, commit nuevo ni despliegue; la web pública conserva su versión anterior.

## 1. Estado general

Las dos correcciones están presentes y funcionan juntas. Se revisaron estado central, controlador, interfaz, política de pesos, entrada manual, datos geográficos, HTML, CSS, pruebas y diff. Durante esta integración no fue necesario corregir código funcional: se añadió una prueba de extremo a extremo, se volvió a ejecutar la regresión y se actualizó documentación de preparación. El respaldo anterior al cambio de pesos y la copia de desarrollo se conservan.

## 2. Diagnóstico interactivo

El plan de corrección es independiente del resultado TSP y está vinculado al escenario. Guarda índices locales normalizados para aristas no dirigidas. Las pendientes se obtienen consultando las conexiones reales del único Grafo, no decrementando un contador. Un guardado válido actualiza matrices/SVG, invalida candidatas y óptimos anteriores, mantiene visible el plan, cierra el modal y devuelve el foco a la siguiente pendiente o al título.

Pesos, origen y métrica no destruyen el plan. Un alta ajena deja de afirmar minimalidad; una baja que afecta la ruta testigo se advierte y permite actualizar. Reemplazar escenario descarta el plan y exige confirmación. Completar las conexiones no inventa un óptimo: el botón final ejecuta el algoritmo sobre el grafo actual.

## 3. Validación de pesos

La política está centralizada en validacionPesosManuales.js y se usa tanto para Validar campos como para Guardar en el mismo formulario, incluida edición y acceso desde diagnóstico. Habituales se aceptan; atípicos dentro de límites requieren confirmación; inválidos bloquean el guardado sin mutación. Las referencias se obtienen por campo de datosPeru.js. Los valores no se reemplazan automáticamente y mantienen independencia.

| Campo | Habitual respecto del modelo | Rango permitido | Límites absolutos |
|---|---|---|---|
| Distancia | 0,75–2,5× | 0,4–4× | 0,01–10000 km |
| Tiempo | 0,7–3× | 0,3–6× | 0,1–14400 min |
| Costo | 0,6–3× | 0,2–6× | S/0,01–100000 |

Son rangos UX, no tarifas ni límites científicos. Todas las276 parejas del catálogo admiten sus estimaciones propias. Se aplican solo al formulario; los fixtures pequeños y las API matemáticas internas conservan su contrato original.

## 4. Compatibilidad y flujo integrado solicitado

Se ejecutaron los25 pasos completos desde controles reales sobre la carpeta estática, en1440px y390px:

1. Manual con Lima, Ica, Arequipa, Cusco y Ayacucho, inicialmente sin aristas:12 candidatas/0 válidas/5 pendientes.
2. Primera recomendación con distancia0,001km: rechazada; modal abierto, revisión y grafo sin cambios,5 pendientes.
3. Cargar modelo y guardar:4 pendientes.
4. Segunda recomendación con distancia3×referencia: Validar advierte; cancelar la confirmación conserva4 pendientes; aceptar guarda el valor exacto y deja3.
5. Completar las otras tres recomendaciones con el modelo:2→1→0, sin navegar a Planificar ni recrear el escenario.
6. Un recálculo al finalizar:12 candidatas,1 válida, óptimo2722,7754780519167km, contrastado con la suma real de las cinco aristas del anillo.
7. Consultar las12 candidatas y su desglose, reproducir, pausar, continuar y reiniciar el avión real.

Se observaron exactamente dos Workers: diagnóstico inicial y cálculo final. No se inició TSP en los guardados. SVG, matrices de adyacencia, progreso, foco y navegación se verificaron en cada paso. Los IDs del escenario se conservaron. La prueba reside en tests/integracionManual.browser.js y sus resultados en tests/resultado-integracion-manual-browser.json.

## 5. Pruebas Node

133/133 aprobadas,0 fallidas:109 originales,10 del plan y14 de validación. No se modificaron los fixtures ni las pruebas unitarias originales para hacerlas pasar. Se ejecutaron con Node24.22.1. Evidencia: tests/resultado-integracion-final-node.txt. El nuevo flujo integrado es una prueba de navegador adicional y no infla el conteo Node.

## 6. Pruebas de navegador

Edge156.0.4314.58. Suites: escenarios, cálculo, animación, Worker, diagnósticoInteractivo, pesosManuales, auditoría estática e integraciónManual. interfaz.browser.js es un alias de escenarios.browser.js; no se cuenta como otra suite independiente.

La prueba nueva usa una subruta /MathOs-Sky/ y sirve solo publicacion/, no el directorio de desarrollo. Verifica import del validador, Worker real, ausencia de errores de consola/HTTP y que no se soliciten fixtures ni tests. Pruebas específicas en escritorio1440 y móvil emulado390; la auditoría existente revisa también360/430/768/1366/1920. Capturas locales en tests/capturas-integracion-manual/ inspeccionadas; no se incluyen imágenes temporales en el ZIP.

La validación inválida mantiene el modal y el foco en el campo erróneo; los guardados desde diagnóstico recuperan el foco de la lista. Se verificaron controles disponibles, progreso y ausencia de desbordamiento horizontal. Los fixtures de óptimos conocidos se cargan internamente en los harnesses matemáticos; los formularios reales se prueban con pesos admisibles. Esta distinción se documenta en los tests.

## 7. Estado matemático e integridad

Completo5=12 candidatas/válidas; completo10=181440; vacío5=12/0; anillo5=12/1. Enumeración canónica, mínimo, empates, tres métricas, simetría, diagnóstico mínimo y Worker mantienen las pruebas previas.

Sin cambios en tsp.js, diagnostico.js, Grafo, tipos, EntradaManual, generador, datosPeru, calculoTSP ni tsp.worker.js. EstadoEscenario y controlador conservan íntegra la mejora del plan durante la incorporación de pesos. Los18 fixtures están intactos respecto de la versión base. No se tocó C++.

## 8. Archivos y alcance del diff

Aplicación consolidada: js/estadoEscenario.js, js/controlador.js, js/interfaz.js, nuevo js/validacionPesosManuales.js, index.html y css/style.css.

Tests nuevos: planCorreccion.test.js, validacionPesosManuales.test.js, diagnosticoInteractivo.browser.js, pesosManuales.browser.js e integracionManual.browser.js. Harnesses adaptados: escenarios.browser.js, calculo.browser.js, animacion.browser.js y auditoria.browser.js (textos, cierre del modal y entrada de pesos compatibles con la nueva política; resultados matemáticos conservados).

Documentación: README.md y PUBLICACION.md aclaran que la copia es candidata local y que hay22 archivos estáticos. PR_MEJORAS_MANUAL.md contiene título y descripción para una futura PR. El informe presente consolida las dos mejoras. No se incluyeron nuevas funcionalidades ni rediseño.

## 9. Build estático

Ejecutados preparar-publicacion.js y verificar-publicacion.js:22 archivos, copias correctas e imports relativos, incluido js/validacionPesosManuales.js. El sitio no necesita servidor Node en producción ni dependencias nuevas. El artefacto excluye fixtures, pruebas, logs, certificados, C++, ZIP y documentos internos. Los scripts, pruebas y fixtures sí se conservan en el ZIP fuente para reproducir la verificación. La carpeta generada publicacion/ no se duplica dentro del ZIP: se recrea con el script.

## 10. Riesgos pendientes

No se detectaron fallos pendientes en el alcance solicitado. Móvil emulado, no dispositivo físico; sin prueba de lector de pantalla real. Los rangos son convenciones de uso y las referencias de tiempo/costo son estimaciones. El plan y escenario permanecen en memoria y se pierden al recargar. La complejidad factorial y el límite10nodos siguen vigentes. No se afirma una prueba de esta versión en producción: todavía no está publicada.

## 11. Estado Git

Rama fix/diagnostico-interactivo; HEAD4c99423a42520ed8e18679927538469798bb8a3c. Los cambios quedan locales, sin commit nuevo. Se inspeccionaron git status, branch, diff y diff --check; este último sin errores. La rama main y el remoto no fueron modificados. Archivos de evidencia locales y snapshots de hashes no se incluyen como cambios funcionales ni en el artefacto público.

## 12. Entrega y preparación para Pages

ZIP consolidado: MathOs-Sky_Web_MejorasManual_Final.zip, con aplicación, configuración/workflow, scripts, pruebas, fixtures, README, guía de publicación, propuesta de PR e informe. Se comprueban CRC y contenido de cada entrada contra su fuente. Se excluyen .git, node_modules, capturas, resultados temporales, snapshots locales, certificados, binarios y ZIP anidados.

Para revisar: extraer, ejecutar node --test tests/*.test.js y node scripts/servidor.js. Para generar el sitio: node scripts/preparar-publicacion.js y node scripts/verificar-publicacion.js. El workflow de Pages existente ejecutará pruebas antes del despliegue cuando se autorice la subida correspondiente. La versión queda lista para revisión y publicación posterior, no publicada por esta tarea.

Los resultados y capturas citados permanecen en la copia local auditada; el ZIP conserva las pruebas reproducibles y este informe, sin esos temporales. Todas las suites citadas finalizaron correctamente en esta revisión.
