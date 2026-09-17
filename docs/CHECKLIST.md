# theWall: checklist de desarrollo

Solo marcar un punto despues de implementarlo y verificarlo.

## Base

- [x] Revisar Lumos, componentes existentes y requisitos confirmados.
- [ ] Integrar SortableJS y preparar pruebas de navegador.
- [ ] Sustituir la portada por el tablero en espanol.

## Tareas y datos

- [ ] Crear tareas de un solo texto, sin descripcion.
- [ ] Colocar toda tarea nueva en un grupo; impedir Focus como primer destino.
- [ ] Editar, completar y reabrir tareas.
- [ ] Guardar tareas, grupos, orden y borrador en localStorage.
- [ ] Restaurar al recargar y mostrar errores de almacenamiento sin sobrescribir datos invalidos.

## Grupos

- [ ] Inicializar Urgente, Hoy y Cuando no haya nada.
- [ ] Anadir grupos y borrar solo los completamente vacios.
- [ ] Resolver el tablero sin grupos conservando el borrador.

## Interaccion

- [ ] Seleccionar mediante clic o pulsacion larga.
- [ ] Mover pulsando un destino o arrastrando con SortableJS.
- [ ] Mostrar shake al mantener, blur sutil y destinos resaltados.
- [ ] Cancelar colocacion sin perder tareas ni texto.
- [ ] Evitar clics accidentales tras arrastrar y conflictos con botones internos.

## Focus

- [ ] Zona compacta visible entre el campo y los grupos.
- [ ] Ampliacion al seleccionar una tarea existente.
- [ ] Expansion al enfocar, con tarjeta centrada y campo visible.
- [ ] Conservar grupo y orden al entrar y salir.
- [ ] Resolver crear, editar y completar desde Focus.

## Diseno y calidad

- [ ] Identidad constructivista, iconos y composicion responsive.
- [ ] Teclado, foco visible y movimiento reducido.
- [ ] Pruebas de reglas y persistencia.
- [ ] Pruebas de clic, arrastre y pulsacion tactil en navegador.
- [ ] Capturas revisadas en escritorio y movil.
- [ ] npm run check y npm run build correctos.
- [ ] Documentar uso y dejar servidor local disponible.

## Fuera de esta entrega

- Renombrar grupos, eliminar tareas con deshacer e importar/exportar JSON: propuestas pendientes de validacion.
- Verificacion en un telefono fisico: requiere un dispositivo real; la emulacion no la sustituye.
