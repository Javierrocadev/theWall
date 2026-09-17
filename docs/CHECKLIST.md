# theWall: checklist de desarrollo

Solo marcar un punto despues de implementarlo y verificarlo.

## Base

- [x] Revisar Lumos, componentes existentes y requisitos confirmados.
- [x] Integrar SortableJS y preparar pruebas de navegador.
- [x] Sustituir la portada por el tablero en espanol.

## Tareas y datos

- [x] Crear tareas de un solo texto, sin descripcion.
- [x] Colocar toda tarea nueva en un grupo; impedir Focus como primer destino.
- [x] Editar, completar y reabrir tareas.
- [x] Eliminar tareas pendientes, completadas o en Focus; guardar el borrado y actualizar el grupo.
- [x] Guardar tareas, grupos, orden y borrador en localStorage.
- [x] Restaurar al recargar y mostrar errores de almacenamiento sin sobrescribir datos invalidos.

## Grupos

- [x] Inicializar Urgente, Hoy y Cuando no haya nada.
- [x] Anadir grupos y borrar solo los completamente vacios.
- [x] Resolver el tablero sin grupos conservando el borrador.

## Interaccion

- [x] Seleccionar mediante clic o pulsacion larga.
- [x] Mover pulsando un destino o arrastrando con SortableJS.
- [x] Mostrar shake al mantener, blur sutil y destinos resaltados.
- [x] Cancelar colocacion sin perder tareas ni texto.
- [x] Evitar clics accidentales tras arrastrar y conflictos con botones internos.

## Focus

- [x] Zona compacta visible entre el campo y los grupos.
- [x] Ampliacion al seleccionar una tarea existente.
- [x] Expansion al enfocar, con tarjeta centrada y solo la zona Focus visible.
- [x] Conservar grupo y orden al entrar y salir.
- [x] Editar y completar desde Focus; restaurar creacion y borrador al salir.

## Diseno y calidad

- [x] Identidad constructivista, iconos y composicion responsive.
- [x] Teclado, foco visible y movimiento reducido.
- [x] Pruebas de reglas y persistencia.
- [x] Pruebas de clic, arrastre y pulsacion tactil en navegador.
- [x] Capturas revisadas en escritorio y movil.
- [x] npm run check y npm run build correctos.
- [x] Documentar uso y dejar servidor local disponible.

## Evidencia

- 10 pruebas de dominio y almacenamiento en tests/model.test.ts.
- 22 recorridos de navegador correctos; 6 combinaciones se omiten por ser exclusivas de raton o de tactil.
- 4 comprobaciones adicionales de borrado pasadas en escritorio y movil, incluyendo persistencia y salida de Focus.
- Arrastre real con raton y gestos tactiles emulados mediante CDP; tambien borrador arrastrable, destino invalido y Escape durante arrastre.
- Capturas de tablero, colocacion y Focus revisadas, con comprobaciones de ancho a 360, 390, 768 y 1440.
- Los datos usados por las pruebas solo existen en sus contextos aislados.
- Comprobacion final de Astro: 59 archivos, 0 errores, 0 avisos y 0 sugerencias. Build estatico correcto.
- En este entorno npm no estaba en PATH: se usaron los mismos CLI de los scripts a traves de Node; el resultado corresponde a astro check, astro build y Playwright.

## Fuera de esta entrega

- Renombrar grupos, deshacer el borrado e importar/exportar JSON: propuestas pendientes de validacion.
- Verificacion en un telefono fisico: requiere un dispositivo real; la emulacion no la sustituye.
