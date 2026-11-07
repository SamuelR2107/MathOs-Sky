# Conservar el plan de corrección y validar pesos personalizados

Al guardar la primera conexión recomendada de un grafo sin ciclo, la interfaz ocultaba todo el diagnóstico. Ahora el plan se conserva separado de los resultados TSP: las pendientes se consultan en el grafo real, el editor vuelve a la siguiente recomendación y el usuario puede completar5→0 sin salir de Mi recorrido. Los resultados antiguos se invalidan y el óptimo se calcula de nuevo solo cuando se solicita. Altas ajenas y bajas dejan de afirmar minimalidad sin comprobarla; reemplazar escenario descarta el plan.

El formulario comparte una política de pesos basada en referencias geográficas por campo. Valores habituales se aceptan, atípicos permitidos requieren confirmación y extremos se rechazan sin mutar el grafo. Se mantienen las tres métricas independientes y el contrato interno del motor para fixtures matemáticos.

Validación:133/133 pruebas Node; regresión de escenarios, cálculo, Worker, animación y sitio estático; flujo integrado de25 pasos en Edge a1440 y390px. Rechazo y cancelación conservan las pendientes, completar el plan produce12 candidatas/1 válida y el óptimo real; SVG, matrices, foco y reproducción verificados. Artefacto estático22 archivos, sin dependencias de producción ni recursos internos.

TSP, diagnóstico matemático, Grafo, generador, datos geográficos y fixtures no cambian. No se incluye un despliegue. Límites: móvil emulado, sin prueba de lector de pantalla; rangos de pesos son política UX y no tarifas comerciales. Requiere autorización antes de push/merge/publicación.
