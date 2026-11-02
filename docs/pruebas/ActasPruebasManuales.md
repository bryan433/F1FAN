# Actas de pruebas manuales — F1Fan

Versión 0.3. Fecha de **registro documental**: 2026-11-02, America/Santiago. Relacionado con [casos](CasosDePrueba.md), [defectos](Defectos.md), [integración](EvidenciasIntegracion.md) y [resultados](InformeResultados.md).

Estas actas consolidan retrospectivamente comprobaciones comunicadas por el usuario durante el desarrollo. No hubo nueva ejecución manual en esta tarea. No se conoce la fecha/hora exacta ni el nombre del ejecutor de aquellas sesiones; no se sustituyen por la fecha documental ni se asignan responsables. No hay firmas ni aprobación académica registradas.

## 1. Criterio de registro y evidencia

- **Confirmado por observación informada:** comportamiento específico que el usuario comunicó haber comprobado. No implica captura adjunta ni aceptación de todo el flujo.
- **Parcial:** existe una observación, pero faltan variantes, metadatos o evidencia suficiente para aprobar el alcance completo.
- **Pendiente:** no hay comprobación manual confirmada para ese escenario/versión.
- **Fallo histórico confirmado:** problema observado antes de la corrección. No se transforma en PASS por existir después un test automatizado aprobado.

Jest/RNTL y AsyncStorage simulado se registran en el informe automatizado. El remontaje de un componente en Jest no equivale a recargar Expo Web ni reiniciar una aplicación instalada. VIS-001 se conserva aparte porque utilizó API interceptada con datos simulados.

## 2. Resumen de actas

| Caso | Comprobación | Estado manual |
|---|---|---|
| MAN-005 | Comparador: selección independiente, intercambio, impedir mismo piloto y selección sin HTTP adicional | Confirmado para esos comportamientos; acta retrospectiva con metadatos incompletos |
| MAN-006 | Clasificación: consulta Jolpica, procedencia, temporada y caché | Parcial: HTTP 200 informado en Chrome; contenido/temporada/caché completa sin evidencia |
| MAN-007 | Navegación: Más → Favoritos, flecha y regreso/fallback | Parcial: acceso y flecha visible confirmados; pulsación final/fallback pendientes |
| MAN-008 | Favoritos múltiples, eliminación, migración y recarga final | Pendiente de revalidación posterior a la última corrección de DEF-008 |
| MAN-001 | Calendario/Detalle/horarios/persistencia con API real, alcance completo | Pendiente; apertura histórica de DetalleGP confirmada como antecedente parcial |
| MAN-002 | Usabilidad con tareas/observaciones | Pendiente |
| MAN-003 | Accesibilidad y matriz de resoluciones | Pendiente; VIS-001 no cubre todo el alcance |
| MAN-004 | Rendimiento de renderizado RNF-01 | Pendiente |

## 3. MAN-005 — Comparador Estadístico

| Campo | Registro |
|---|---|
| Fuente | Confirmación del usuario después de corregir DEF-007 |
| Entorno informado | Aplicación en formato móvil; resolución/navegador/versiones de aquella sesión no archivados |
| Datos | Pilotos disponibles en la clasificación cargada; pareja concreta y temporada no registradas |
| Precondición informada | Clasificaciones ya cargadas |
| Fecha/hora de ejecución / responsable nominal | No proporcionados |
| Capturas de esa sesión | No adjuntas |

| Paso comunicado | Esperado | Resultado informado |
|---|---|---|
| Cambiar piloto izquierdo y derecho | Selecciones independientes | Confirmado |
| Intercambiar ambos | Cambian de lado conservando la pareja | Confirmado |
| Intentar comparar el mismo piloto | Combinación impedida | Confirmado |
| Observar peticiones al seleccionar | Selección local sin nuevas solicitudes HTTP | Confirmado |

**Conclusión limitada:** el flujo descrito fue confirmado manualmente. No se informó una inspección del JSON externo, una comparación de todas las estadísticas con una fuente oficial, una medición de usabilidad con participantes ni un protocolo de caché vencida. La ausencia de peticiones al seleccionar no prueba el funcionamiento del TTL.

Complemento visual separado: VIS-001 tiene [captura](evidencias/comparador-375-demo.png) y [medidas](evidencias/comparador-375-demo-medidas.json) de Chrome a 375 × 1000 px, **con datos simulados**. No corresponde necesariamente a esta sesión manual.

## 4. MAN-006 — Clasificación y consulta HTTP real

| Campo | Registro |
|---|---|
| Fuente | Observaciones del usuario en Expo Web/Chrome y solicitud de registrar el HTTP 200 observado |
| Entorno conocido | Expo Web, Chrome; versión y resolución no registradas |
| Observación de transporte | HTTP 200 de una consulta de clasificaciones Jolpica |
| URL exacta / temporada / ronda / hora | No proporcionadas en la evidencia disponible |
| Captura Network / HAR / cuerpo JSON | No adjuntos |
| Estado de caché del navegador y de la aplicación | No documentado para esa consulta |

Antecedente de DEF-006: el usuario observó CAMPEONATO MUNDIAL 2024, aviso de falta de conexión y errores 404 en championship_drivers/championship_teams de OpenF1 con year=2024. Es un fallo histórico confirmado, distinto del HTTP 200 posterior de Jolpica.

**Resultado: PARCIAL.** El HTTP 200 es una observación de transporte informada. No se afirma que se hayan verificado ambos endpoints, la temporada actual, nombres/identidades, puntos/victorias, estructura o integridad del JSON ni procedencia de cada fila visible. Tampoco se afirma que un 200 no proviniera de caché del navegador: faltan detalles de Network.

Para completar: seguir INT-001 a INT-003 en [EvidenciasIntegracion.md](EvidenciasIntegracion.md), registrar URL y cuerpo realmente observados, temporada y estados de caché. Las pruebas de Jest del cliente/servicio ya están aprobadas con respuestas simuladas y se mantienen separadas.

## 5. MAN-007 — Navegación y flecha de Favoritos

| Comprobación | Estado / observación |
|---|---|
| Entrar desde Más → Favoritos | Confirmado: el usuario accedió por ese recorrido durante DEF-008 |
| Ausencia original de regreso visible | Fallo histórico informado; motivó la incorporación de la flecha |
| Flecha visible después del cambio | Confirmado expresamente por el usuario en la siguiente validación |
| Pulsar flecha después de la última corrección múltiple | Pendiente de confirmación manual |
| Acceso directo sin historial → Más | Pendiente de confirmación manual |
| Preferencias conservadas al volver y recargar | Pendiente de protocolo manual final |
| Equivalente en dispositivo Android/iOS | Pendiente; no hay evidencia nativa registrada |

El botón actual se llama Volver para consultas de accesibilidad. AUT-048 comprueba goBack una vez cuando hay historial y la ruta registrada MainTabs → Más cuando no se puede confirmar historial; AUT-047 comprueba actualización tras eliminar/regresar sin focus. Son callbacks de navegación simulada, no una ejecución real del stack.

Antecedente de otra pantalla: tras DEF-001, el usuario confirmó que DetalleGPScreen volvía a abrirse manualmente. No hay captura ni acta del recorrido completo Inicio/Calendario → Detalle → regreso. MAN-001 conserva ese alcance pendiente.

**Resultado: PARCIAL.** La presencia del icono no acredita navegación por teclado, foco, lector de pantalla, contraste WCAG ni fallback operativo en un navegador real.

## 6. MAN-008 — Favoritos: historial del defecto y revalidación final

### 6.1. Observaciones efectivamente comunicadas

| Observación anterior a la corrección final | Registro |
|---|---|
| Marcar Verstappen en Clasificación y verlo en Más → Favoritos | Confirmado para una selección |
| Existencia de preferencias guardadas/persistencia | Informada; no se registró un protocolo de recarga o reinicio |
| Marcar un segundo piloto y perder la estrella del anterior | Fallo histórico confirmado: mantenía selección única |
| Eliminar desde Favoritos y encontrar estrella desactualizada en Clasificación | Fallo histórico confirmado, observado de forma intermitente |
| Flecha de Favoritos ya visible | Confirmado; debía conservarse |

Estas observaciones reabrieron DEF-008 y fijaron el requisito de **múltiples pilotos simultáneos**. No son una aprobación de la versión final: después se cambió la fuente a @f1fan_favorite_drivers y se añadieron suscripciones/migración.

### 6.2. Protocolo pendiente para la versión final

Precondición: Expo Web con la versión corregida y clasificación de temporada identificada. Usar un perfil de prueba y proteger las preferencias existentes; no borrar almacenamiento personal para preparar el escenario.

1. Marcar dos pilotos disponibles realmente en Clasificación; registrar identidades y ambas estrellas.
2. Entrar desde Más → Favoritos; comprobar que aparecen los dos, sin duplicados.
3. Quitar uno; volver con Volver y comprobar que solo su estrella se desmarca.
4. Quitar/agregar desde Clasificación y comprobar el otro sentido de sincronización.
5. Recargar la aplicación y comprobar conservación de la colección resultante.
6. En perfiles de prueba separados, verificar migración desde favorito único y lista antigua, y prioridad de la colección nueva vacía frente a un favorito antiguo. Registrar claves antes/después sin publicar datos personales.
7. Eliminar el último, recargar y comprobar que no reaparece; repetir selección/eliminación para escuderías.
8. Archivar capturas y datos del entorno, fecha/hora/zona, versión de código y resultados reales por paso.

**Resultado: PENDIENTE.** No hay confirmación manual posterior al último cambio. Las regresiones AUT-045 a AUT-048 están aprobadas; no sustituyen este protocolo físico de persistencia/migración.

## 7. Pendientes de evaluación y cierre

MAN-002/003/004 no tienen resultados registrados de usuarios, satisfacción, tiempos, contraste, teclado, NVDA, Lighthouse, Axe ni rendimiento. E2E y CI/CD no están implementados. No se declaran conformidad WCAG, objetivo <3 s ni aprobación del profesor.

Para futuras entradas utilizar: caso/versión, fecha/hora/zona de ejecución, persona que ejecuta y revisa (nombres reales por asignar), sistema/navegador/viewport, temporada/identidades, datos y caché iniciales, pasos, resultado por paso, evidencia enlazada, defecto y decisión de cierre. Este formato no es un acta ejecutada ni una firma.
