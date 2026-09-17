# theWall: plan de desarrollo IA-first

Estado: primera version funcional implementada. Ver docs/CHECKLIST.md para avance y evidencia. Las mejoras opcionales no forman parte de esta entrega.

## 1. Objetivo y alcance

Construir una app personal de tareas cuya primera pantalla sea el tablero de trabajo. La diferenciacion estara en la composicion constructivista y en las transiciones entre tablero, colocacion y Focus.

Requisitos confirmados:

- Persistencia en el navegador, sin cuentas ni backend.
- Crear, editar, completar y eliminar tareas. Recuperar las completadas.
- Cada tarea contiene un unico texto editable, sin descripcion ni campo de contenido adicional.
- Sin subtareas, fechas de vencimiento, prioridades ni recordatorios.
- Campo de escritura arriba, Focus debajo y grupos de tareas a continuacion.
- Grupos iniciales: Urgente, Hoy y Cuando no haya nada. Urgente es un nombre, no una prioridad.
- Crear grupos y eliminar exclusivamente los que no tengan tareas.
- Crear una tarea abre el modo colocacion y obliga a elegir grupo. Focus no acepta tareas nuevas sin grupo.
- Clic o pulsacion larga sobre una tarea existente abre colocacion. Mantener pulsado produce un shake suave.
- Colocar mediante arrastre o pulsacion sobre el destino.
- En colocacion, destacar destinos y desenfocar sutilmente el resto.
- Focus tiene tres tamanos: compacto, destino ampliado y espacio de trabajo expandido.
- Al enfocar, mostrar solo la zona Focus con la tarea centrada; ocultar el campo de creacion, su cabecera y los grupos.
- Una tarea enfocada conserva su pertenencia al grupo de origen.

Mejoras propuestas por el asistente, pendientes de validar su inclusion: renombrar grupos, deshacer el borrado y exportar/importar JSON. Sus menciones en las fases siguientes son propuestas, no requisitos confirmados. El borrado directo de tareas ya esta solicitado e implementado.

## 2. Decisiones propuestas para cerrar casos limite

Son valores iniciales de implementacion, ajustables tras probar el prototipo:

- Una sola tarea en Focus y una sola operacion de colocacion a la vez.
- Una tarea nueva es un borrador hasta elegir grupo. Cancelar devuelve el texto al campo; no crea una tarea huerfana.
- Guardar tambien el borrador para recuperarlo al recargar. Restaurarlo en el campo, sin abrir colocacion automaticamente.
- Cancelar un movimiento conserva grupo y orden originales. Escape y un control de cancelar permiten salir.
- Soltar fuera de un destino valido devuelve la tarjeta a su posicion y mantiene colocacion para elegir destino o cancelar.
- Clic en el grupo actual termina colocacion sin duplicar ni cambiar de grupo. Soltar dentro permite ordenar.
- Una tarea enviada por clic a otro grupo se coloca al final. El arrastre respeta la posicion de insercion.
- Focus no es otro grupo: se representa con una referencia a una tarea pendiente existente.
- Salir de Focus restaura el tablero y su posicion de scroll. Completar o eliminar la tarea enfocada tambien sale de Focus.
- Para crear otra tarea, salir primero de Focus. Conservar cualquier borrador previo y restaurar el campo al salir.
- Las completadas se consultan en una vista secundaria y conservan su grupo. Tambien cuentan al impedir borrar ese grupo.
- Las completadas pueden reabrirse, eliminarse o reasignarse de grupo; no pueden entrar en Focus hasta reabrirlas.
- Se pueden borrar incluso los grupos iniciales cuando esten vacios. Si no queda ninguno, ofrecer crear grupo; nunca recrearlos automaticamente en cada recarga.
- Si se pulsa Crear sin grupos, conservar el borrador y abrir la creacion de grupo antes de colocarlo.
- Permitir renombrar los grupos iniciales. Rechazar nombres vacios y duplicados tras normalizar espacios y mayusculas.
- La seleccion y el movimiento son temporales. Al recargar, restaurar datos, borrador y Focus valido, pero no un arrastre interrumpido.

## 3. Base real del repositorio

Inspeccionado: Astro 7 declarado en package.json, TypeScript, Lumos 0.0.3 y CSS con variables. No hay framework cliente ni libreria de drag-and-drop declarados.

- src/pages/index.astro contiene la portada de ejemplo de Lumos.
- src/layouts/BaseLayout.astro incluye navegacion, footer e idioma ingles de forma fija.
- Existen Input, Textarea, Button, Modal, Heading, Grid, Card e Icon reutilizables.
- Card esta orientada a contenido editorial y admite HTML en algunos campos. Las tareas necesitan texto escapado y controles independientes.
- Hay una fuente Inter local. Evaluar sus pesos disponibles antes de decidir la tipografia final.
- Grid define los breakpoints 30rem, 48rem y 64rem.
- Scripts disponibles: npm run check y npm run build. No se ha encontrado configuracion de pruebas automatizadas.
- El arbol actual figura sin seguimiento en Git. No asumir un commit base ni atribuir estos archivos a este trabajo.

Seguir AGENTS.md y LUMOS.md. No aplicar convenciones de Lumos para Webflow. Consultar la documentacion Astro pertinente antes de modificar componentes, paginas o estilos.

## 4. Arquitectura

Usar Astro + TypeScript cliente + CSS de Lumos. Los scripts de Astro permiten encapsular interactividad sin incorporar otro framework: https://docs.astro.build/en/guides/client-side-scripts/

Usar SortableJS para arrastrar entre listas y ordenar tarjetas, con @types/sortablejs. Su soporte de listas conectadas, dispositivos tactiles, filtros y clases de arrastre encaja con el tablero: https://github.com/SortableJS/Sortable

La seleccion por clic, el modo colocacion, la elegibilidad de destinos y Focus pertenecen a la logica de la app. SortableJS traduce gestos a las mismas acciones que el clic y el teclado.

Organizacion prevista, ajustable si un archivo pequeno no justifica dividirse:

| Ruta | Responsabilidad |
| --- | --- |
| src/pages/index.astro | Componer la pantalla; sin CSS ni logica de negocio |
| src/layouts/BaseLayout.astro | Opciones minimas de idioma y visibilidad de nav/footer, preservando valores por defecto |
| src/components/Wall/ContentWall.astro | Raiz del tablero, plantillas, componentes Lumos y arranque del controlador |
| src/components/Wall/ContentWallComposer.astro | Entrada y creacion de tarea |
| src/components/Wall/ContentWallFocus.astro | Zona Focus y sus tres tamanos |
| src/components/Wall/ContentWallGroup.astro | Grupo, contador, lista y acciones |
| src/components/Wall/ContentWallTask.astro | Tarjeta interactiva y controles; justificada por gestos, edicion y completado |
| src/components/Wall/model.ts | Tipos, invariantes y transiciones puras |
| src/components/Wall/storage.ts | Validacion, versionado, lectura, escritura y copias JSON |
| src/components/Wall/controller.ts | Eventos y actualizacion de la vista desde el estado |
| src/components/Wall/drag.ts | Adaptador de SortableJS y ciclo de vida de sus instancias |
| tests/ | Pruebas de dominio y recorridos de navegador |

CSS propio dentro del componente que lo necesita, en @layer components. Tokens compartidos en src/styles/base.css. Respetar nombres *_wrap, prefijos de familia, longitudes rem y props de Lumos. No introducir un archivo global para todo el aspecto de la app.

Para tarjetas y grupos dinamicos, usar plantillas DOM renderizadas por Astro y clonarlas desde el controlador. Asignar datos del usuario con textContent o value; nunca interpolar tareas en HTML. Reutilizar una sola plantilla por tipo de elemento.

Una sola fuente de estado. El DOM y SortableJS no son bases de datos alternativas. Durante un drag no reconstruir el nodo activo; reconciliar la vista al terminar y liberar clones, estilos e instancias al desmontar.

## 5. Datos y persistencia

Modelo conceptual:

```ts
type Task = {
  id: string;
  title: string;
  groupId: string;
  status: "pending" | "completed";
  order: number;
};

type Group = { id: string; name: string; order: number };

type SavedWall = {
  schemaVersion: 1;
  tasks: Task[];
  groups: Group[];
  focusedTaskId: string | null;
  draft: { title: string } | null;
};
```

- IDs estables; nunca usar el titulo ni el indice como identidad.
- Toda tarea confirmada tiene un grupo existente; cada ID aparece una sola vez.
- Focus referencia una tarea pendiente existente. No duplicar el objeto ni cambiar groupId al enfocar.
- Ordenar de forma determinista y normalizar posiciones al confirmar movimientos.
- Inicializar los tres grupos solo cuando no hay datos guardados, distinguiendo ausencia de un tablero vacio valido.
- Clave propuesta: thewall:data. Validar schemaVersion y estructura al leer o importar.
- No sobrescribir datos corruptos o de una version desconocida: ofrecer descargar el contenido y reiniciar mediante una accion explicita.
- Capturar errores de escritura; mantener la sesion usable e indicar cuando los cambios no se pueden guardar.
- Persistir acciones confirmadas. Guardar el borrador con una breve espera tras escribir; no escribir en cada movimiento del puntero.
- Escuchar cambios de otras pestanas. Aplicarlos si no hay una operacion activa; si la hay, cancelar esa operacion conservando el borrador antes de cargar los datos externos. No prometer edicion simultanea sin conflictos.
- Importacion por reemplazo: validar primero, mostrar cantidades, permitir copia previa y confirmar el reemplazo. JSON invalido no altera el estado existente.

## 6. Estados y transiciones

Modelar la interaccion como union discriminada para evitar combinaciones como dos tarjetas seleccionadas o Focus activo para un borrador.

| Estado | Entrada | Destinos y aspecto | Salida |
| --- | --- | --- | --- |
| board | Inicio o salida de Focus | Campo, Focus compacto, grupos | Crear, seleccionar, editar, completar |
| placing-new | Crear con titulo valido | Preview del borrador; grupos activos; Focus inhabilitado; blur sutil | Confirmar grupo o cancelar al campo |
| placing-existing | Clic o pulsacion larga | Tarjeta activa; grupos y Focus ampliado como destinos | Mover, enfocar o cancelar |
| focused | Colocar tarea existente en Focus | Solo Focus expandido y tarjeta centrada | Salir, editar, completar o eliminar |

Editar es un dialogo asociado a una tarea, no un destino. Desactivar colocacion mientras esta abierto. Los botones internos no disparan seleccion ni drag.

Reglas de gestos:

- Clic corto selecciona. Mantener unos 300 ms inicia seleccion con shake; el umbral final se calibra en el prototipo.
- Arrastre de raton puede empezar al superar un umbral de movimiento. En tactil, preservar scroll antes de reconocer pulsacion larga.
- Un gesto produce una sola accion. Consumir el clic sintetico despues de drag o pulsacion larga.
- Cancelar temporizadores al soltar, cancelar el puntero o perder la ventana.
- Separar transformaciones del contenedor de arrastre y del cuerpo que hace shake para evitar conflictos.
- Una tarjeta nueva se muestra como preview arrastrable en un origen temporal. Solo se convierte en tarea al confirmar un grupo.
- Focus es un destino con una sola plaza. Al confirmar el drop, reflejar la referencia en el estado y reconciliar el DOM sin quitar la pertenencia al grupo.
- Mantener destinos estables mientras crece Focus. Probar que la expansion no desplace un destino bajo el puntero y confirme por accidente.
- Cancelar durante un drag debe revertir su movimiento y bloquear la confirmacion tardia del callback de SortableJS.

## 7. Direccion visual y movimiento

Constructivismo aplicado a una herramienta de uso diario:

- Nombre theWall reconocible en el primer viewport, sin hero promocional.
- Base blanca y negra, rojo de acento y un segundo acento frio contenido. Valores concretos a resolver en el prototipo.
- Sans-serif de titulares con peso real disponible; cuerpos legibles, espaciado de letras cero y tamanos que no dependan del ancho del viewport.
- Geometria marcada, bordes precisos y asimetria en la composicion; superficies de grupos abiertas, sin tarjetas decorativas conteniendo otras tarjetas.
- Tarjetas de tarea rectas o con radio minimo. Iconos existentes y Lucide para acciones sin icono adecuado, con nombres accesibles y tooltips.
- Explorar un pequeno recurso grafico constructivista o recorte monocromo en el estado vacio, usando un asset real. El area de tareas mantiene su legibilidad.
- Blur localizado: tarjeta activa y destinos quedan nitidos y operables. No aplicar filter a un ancestro comun que desenfoque tambien los destinos.
- Focus compacto siempre identificable. Al seleccionar una tarea existente, aumentar el area y mostrar "Traer al foco". Al crear, mostrarlo inhabilitado y sin invitacion a soltar.
- En Focus activo, usar el alto de pantalla disponible con unidades dinamicas y permitir scroll para contenido largo. El campo, su cabecera y los grupos quedan ocultos y fuera del orden de tabulacion.
- Microtransiciones iniciales de 120-180 ms; expansion de Focus de 280-400 ms; valores a ajustar con pruebas reales.
- El shake afecta solo a la tarjeta sostenida, con amplitud pequena y duracion limitada. No debe producir movimiento continuo del tablero.
- prefers-reduced-motion elimina shake y desplazamientos amplios, conservando indicadores claros de estado.

## 8. Fases de implementacion

Cada fase tiene una entrega verificable. No avanzar si queda roto un criterio de su flujo principal.

### Fase 1. Prototipo de interaccion de mayor riesgo

Entregar el campo, dos grupos de prueba y Focus, usando plantillas y datos de desarrollo que no se guardan como tareas reales.

- Integrar SortableJS y probar clic, pulsacion larga, drag, cancelacion y expansion de Focus.
- Probar el preview de tarea nueva: acepta grupo y rechaza Focus.
- Resolver superposicion, blur y coexistencia de shake con las transformaciones del drag.
- Permitir teclado para seleccionar y confirmar destinos.

Criterio: realizar ambos caminos de colocacion con raton y emulacion tactil, sin tarjetas duplicadas, clic fantasma ni saltos que confirmen un destino equivocado. Documentar limitaciones pendientes de probar en un dispositivo fisico.

### Fase 2. Estado de dominio y almacenamiento

- Implementar modelo, acciones e invariantes; conectar el prototipo al estado real.
- Implementar almacenamiento versionado, restauracion de borrador y errores de lectura/escritura.
- Incorporar los tres grupos iniciales solo en la primera visita.
- Agregar pruebas de transiciones y persistencia donde existe riesgo de perder datos.

Criterio: recargar conserva tareas, grupos, orden, completadas y Focus valido. Cancelar nunca deja tareas sin grupo.

### Fase 3. Flujo completo de tareas y grupos

- Crear, editar el texto de la tarea, completar, reabrir y eliminar con deshacer.
- Crear y renombrar grupos; bloquear borrado si contienen tareas pendientes o completadas.
- Construir vista secundaria de completadas y reasignacion de su grupo.
- Resolver tablero sin grupos, listas vacias, textos largos y restauracion del borrador al salir de Focus.
- Excluir los controles internos de los gestos de la tarjeta.

Criterio: todas las operaciones funcionan por clic y teclado; ningun movimiento requiere drag obligatoriamente.

### Fase 4. Identidad visual y acabado del movimiento

- Sustituir la portada de ejemplo por el tablero y configurar idioma espanol, titulo y metadatos.
- Aplicar tokens, tipografia, geometria y composicion constructivista.
- Afinar entrada, desplazamiento, shake, blur y las tres alturas de Focus.
- Adaptar grupos a escritorio, tablet y movil usando los breakpoints de Lumos.
- Comprobar Focus con teclado virtual, tareas largas y preferencias de movimiento reducido.

Criterio: interfaz legible y completa a 360, 390, 768 y 1440 de ancho de viewport, sin desbordamientos horizontales ni controles tapados. No guardar datos de demostracion en la instalacion del usuario.

### Fase 5. Recuperacion y copias

- Exportar e importar los datos versionados.
- Validar referencias de grupos, IDs unicos y Focus antes de importar.
- Mostrar estados de almacenamiento no disponible y recuperar cambios de otras pestanas.
- Verificar deshacer despues de eliminar una tarea enfocada o completada.

Criterio: una exportacion se puede restaurar sin alterar sus datos; una importacion invalida conserva el tablero anterior.

### Fase 6. Verificacion y entrega

- Ejecutar npm run check y npm run build.
- Ejecutar pruebas de dominio y recorridos de navegador.
- Arrancar mediante npm run dev -- --background; gestionar con astro dev status, astro dev logs y astro dev stop segun AGENTS.md. Usar otro puerto si ya esta ocupado.
- Revisar capturas reales de tablero, colocacion nueva, colocacion existente, Focus y completadas en escritorio y movil.
- Verificar foco de teclado, nombres accesibles, ausencia de controles ocultos alcanzables y estado anunciado al mover o completar.
- Documentar comandos, uso de almacenamiento local y limitaciones comprobadas en README.
- Entregar URL local, resultado de pruebas y cualquier limitacion concreta. No publicar automaticamente.

Criterio: todos los requisitos confirmados tienen evidencia funcional y la app queda disponible para probar.

## 9. Matriz minima de pruebas

Usar un runner de pruebas TypeScript compatible con el proyecto para dominio y Playwright para navegador. Seleccionar versiones al implementar, tras comprobar compatibilidad con Node y Astro instalados.

| Recorrido o regla | Evidencia |
| --- | --- |
| Crear -> elegir grupo -> recargar | Una tarea, grupo correcto, texto conservado |
| Crear -> intentar Focus | Destino rechazado por UI y por dominio |
| Crear -> cancelar o recargar | Borrador recuperable; ninguna tarea huerfana |
| Seleccionar -> pulsar grupo | Mueve una vez; persiste orden |
| Mantener -> arrastrar -> soltar | Shake controlado, movimiento unico, sin clic posterior |
| Arrastrar -> destino invalido o Escape | Sin cambio persistido ni clones sobrantes |
| Enfocar -> salir -> recargar | Conserva identidad, grupo y orden |
| Entrar en Focus -> salir/completar | Creacion oculta en Focus y borrador restaurado al volver |
| Editar/completar/eliminar desde tarjeta | No inicia colocacion accidentalmente |
| Completar/reabrir y borrar grupo | Completadas conservadas; grupo ocupado protegido |
| Borrar todos los grupos -> recargar -> crear | No reaparecen grupos borrados; borrador protegido |
| Importar JSON roto o version desconocida | Datos existentes intactos |
| Fallo de localStorage | Mensaje concreto y sesion utilizable |
| Texto con etiquetas HTML | Se muestra como texto; no ejecuta contenido |
| Teclado, tactil y movimiento reducido | Mismos resultados, scroll y foco utilizables |
| Cambios desde otra pestana | No confirma un drag sobre datos obsoletos |

## 10. Protocolo para la IA que implemente

1. Leer AGENTS.md, LUMOS.md y este plan; inspeccionar los archivos antes de editar.
2. Consultar solo los skills pertinentes a la fase. Usar lumos-audit-props si se amplian props publicas de la biblioteca; no cargar skills de importacion sin una importacion real.
3. Respetar trabajo existente y limitar los cambios a la fase activa.
4. Implementar cada fase de extremo a extremo, incluyendo su comprobacion, sin detenerse en una propuesta de codigo.
5. Si una decision propuesta resulta incompatible con la implementacion, registrar el motivo y la alternativa. Preguntar solo si cambia un requisito del usuario.
6. Mantener una tabla de avance aqui con fase, resultado, pruebas ejecutadas y pendientes reales.
7. No marcar una fase completa por compilar solamente: verificar su comportamiento en navegador cuando sea visual o interactiva.
8. Actualizar las pruebas cuando cambie una regla de negocio; no generar pruebas que solo reproduzcan el marcado o los estilos.

| Fase | Estado | Evidencia |
| --- | --- | --- |
| 1. Prototipo de interaccion | Completada | Clic, drag, pulsacion larga, destino invalido y Focus probados en navegador |
| 2. Estado y persistencia | Completada | 9 pruebas de dominio y almacenamiento; recarga y borrador en E2E |
| 3. Tareas y grupos | Alcance confirmado completado | Crear, editar texto, completar, reabrir, crear grupo y borrar solo vacios |
| 4. Visual y movimiento | Primera version completada | Capturas desktop/mobile; anchos 360, 390, 768 y 1440 |
| 5. Recuperacion y copias | Recuperacion basica completada; copias aplazadas | Datos invalidos preservados; importacion/exportacion y deshacer sin autorizar |
| 6. Verificacion y entrega | Completada | Tipos sin errores, build correcto, 22 E2E y 9 pruebas de dominio; servidor en http://127.0.0.1:4321 |

### Decisiones durante la implementacion

- WallLayout.astro da a la app su propio idioma, metadatos y acceso al contenido, sin cambiar el layout de los ejemplos de Lumos.
- Composer y Focus permanecen en ContentWall.astro porque comparten presentacion y estado. Tarjetas y grupos tienen sus propias plantillas y estilos reutilizables.
- Se usa @lucide/astro, nombre vigente del paquete de iconos. SortableJS sigue siendo la libreria de arrastre acordada.
- Las pruebas de navegador usan Edge instalado, con emulacion movil. Falta la comprobacion en hardware tactil real.
- El borrado directo de tareas se ha incorporado mediante papelera en pendientes, completadas y Focus. Renombrar grupos, deshacer e importar/exportar JSON siguen fuera; las menciones previas en las fases son propuestas.
