const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel,
  AlignmentType, LevelFormat, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, PageBreak, Header, Footer, PageNumber,
} = require("docx");

const NAVY = "111226";
const CYAN = "45b9d5";
const BLACK = "000000";
const GRAY = "555555";

const ASSETS = "C:/Users/siste/AppData/Roaming/Claude/local-agent-mode-sessions/skills-plugin/b7f1e765-d16b-4dca-9e00-adfee23c98f1/a3ab66c7-cbe1-4057-9747-98a4ccabed93/skills/adentu-brand/assets";
const logoWhite = fs.readFileSync(`${ASSETS}/logo_Adentu-04.png`);
const diagramPng = fs.readFileSync("C:/Users/siste/AppData/Local/Temp/claude/C--Users-siste/1fa0cd5b-def8-49dd-985f-ce67ec10605d/scratchpad/adentu-manual/proceso.png");

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
}
function p(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160 },
    children: [new TextRun({ text, ...opts })],
  });
}
function bullet(text, ref = "bullets") {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    numbering: { reference: ref, level: 0 },
    spacing: { after: 80 },
    children: [new TextRun(text)],
  });
}
function numbered(text, ref = "numbers") {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    numbering: { reference: ref, level: 0 },
    spacing: { after: 80 },
    children: [new TextRun(text)],
  });
}
function note(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: CYAN, space: 8 } },
    children: [new TextRun({ text, italics: true, color: GRAY })],
  });
}

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function simpleTable(headerRow, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const headerCells = headerRow.map((text, i) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF" })] })],
  }));
  const bodyRows = rows.map((row) => new TableRow({
    children: row.map((text, i) => new TableCell({
      borders, width: { size: widths[i], type: WidthType.DXA },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun(text)] })],
    })),
  }));
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [new TableRow({ children: headerCells }), ...bodyRows],
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: BLACK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 34, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 27, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: CYAN },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [
    // COVER
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children: [
        new Paragraph({ spacing: { before: 1600 }, alignment: AlignmentType.CENTER,
          children: [new ImageRun({ type: "png", data: logoWhite, transformation: { width: 260, height: 181 },
            altText: { title: "ADENTU", description: "Logo ADENTU", name: "Logo" } })] }),
        new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "MANUAL DE USUARIO", bold: true, size: 56, color: NAVY })] }),
        new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "CRM Comercial ADENTU", italics: true, size: 32, color: CYAN })] }),
        new Paragraph({ spacing: { before: 800 }, alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Junio 2026", size: 22, color: GRAY })] }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    // BODY
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "CRM Comercial ADENTU — Manual de Usuario", size: 16, color: GRAY })] })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun("Pagina "), new TextRun({ children: [PageNumber.CURRENT] })] })] }),
      },
      children: [
        h1("1. Introduccion"),
        p("Este manual describe como usar el CRM Comercial de ADENTU: como se capturan las interacciones con clientes y prospectos desde distintos canales, como se generan y gestionan tareas, como se administran las Oportunidades a lo largo del Pipeline, y como la Inteligencia Comercial (IA) apoya el analisis y las sugerencias de proximos pasos."),
        p("El CRM esta organizado en seis grandes areas: Comercial (Empresas, Contactos, Oportunidades, Mercado), Fuentes (Leads web, Correo, WhatsApp, Reuniones, LinkedIn), Actividad (Interacciones, Tareas), Estrategia (Playbooks, Inteligencia Comercial), Dashboard/Pipeline y Sistema (Importar, Configuracion)."),

        h1("2. Diagrama de proceso comercial"),
        p("El siguiente diagrama resume como la informacion capturada desde distintas fuentes se transforma en Interacciones, como estas generan Tareas, y como ambas se vinculan a Empresas, Contactos y Oportunidades (existentes o nuevas), alimentando el Pipeline, el Dashboard y la Inteligencia Comercial."),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 },
          children: [new ImageRun({ type: "png", data: diagramPng, transformation: { width: 612, height: 413 },
            altText: { title: "Proceso comercial", description: "Diagrama de proceso comercial del CRM ADENTU", name: "Diagrama" } })] }),
        note("Las flechas punteadas cyan indican el flujo de analisis de Inteligencia Comercial: la IA lee Interacciones u Oportunidades y propone cambios que un usuario debe revisar y aprobar antes de aplicarse."),

        h1("3. Acceso y roles"),
        p("El acceso al CRM requiere inicio de sesion. Existen tres roles, cada uno con distintos permisos:"),
        simpleTable(
          ["Rol", "Permisos"],
          [
            ["ADMIN", "Acceso total: crea/edita/elimina cualquier registro, administra Configuracion (servicios, diccionarios, usuarios, IA, conexiones), elimina permanentemente correos descartados y elimina analisis de IA rechazados."],
            ["COMERCIAL", "Crea y edita Empresas, Contactos, Oportunidades, Interacciones, Tareas, Reuniones, Documentos comerciales. No accede a Configuracion ni a eliminaciones administrativas."],
            ["LECTURA", "Solo consulta. No puede crear, editar ni eliminar registros."],
          ],
          [2200, 7160],
        ),
        p(""),

        h1("4. Menu principal"),
        p("El menu lateral agrupa las vistas en secciones colapsables (Dashboard y Pipeline quedan siempre visibles arriba). Un punto ambar en el encabezado de un grupo indica que alguno de sus modulos tiene elementos pendientes de revisar."),
        simpleTable(
          ["Grupo", "Modulos"],
          [
            ["(Principal)", "Dashboard, Pipeline comercial"],
            ["Comercial", "Empresas, Contactos, Oportunidades, Mercado"],
            ["Fuentes", "Leads web, Correo, WhatsApp, Reuniones, LinkedIn"],
            ["Actividad", "Interacciones, Tareas"],
            ["Estrategia", "Playbooks, Inteligencia Comercial"],
            ["Sistema", "Importar, Configuracion"],
          ],
          [2200, 7160],
        ),
        p(""),

        h1("5. Dashboard"),
        p("Punto de entrada con los indicadores comerciales principales:"),
        bullet("Pipeline abierto: monto total y ponderado de las Oportunidades en Exploracion, Propuesta enviada y Negociacion (no incluye Estancadas, Ganadas ni Perdidas)."),
        bullet("Tareas vencidas y proximas a vencer en los siguientes 7 dias."),
        bullet("Sin seguimiento por 14 dias: Oportunidades en Exploracion, Propuesta enviada o Negociacion sin interaccion reciente (se excluyen las Estancadas, que ya se gestionan por otra via)."),
        bullet("Grafico de Oportunidades por servicio (solo las 3 etapas de pipeline abierto) y por etapa del Pipeline."),
        bullet("Actividad reciente: ultimas Interacciones registradas, truncadas a 2 lineas con enlace directo a cada una."),

        h1("6. Empresas, Contactos y Oportunidades"),
        h2("6.1 Empresas"),
        p("Ficha de la cuenta o prospecto: estado comercial (Sin calificar, Prospectando, Cliente historico, Cliente activo, Perdida, Descartada), industria, region y responsable."),
        bullet("El listado permite filtrar por Estado (seleccion multiple), industria y responsable (incluye filtro “Sin responsable”)."),
        bullet("Al asignar o cambiar el responsable de una Empresa, este se propaga automaticamente a sus Oportunidades que aun no tengan responsable asignado (sin sobrescribir asignaciones manuales existentes)."),
        h2("6.2 Contactos"),
        p("Personas de contacto asociadas a una Empresa, con su estado de calificacion (Sin calificar, Calificado positivo, Con oportunidad, Cliente, Perdido, Calificado negativo) y origen del lead."),
        h2("6.3 Oportunidades"),
        p("Cada Oportunidad representa un proyecto o venta potencial, con Servicio, monto, probabilidad y etapa:"),
        simpleTable(
          ["Etapa", "Significado"],
          [
            ["Exploracion", "Primer contacto o calificacion del interes."],
            ["Propuesta enviada", "Se envio cotizacion o propuesta formal."],
            ["Negociacion", "Ajustes de alcance, plazos o condiciones comerciales."],
            ["Ganada", "Cierre exitoso. La probabilidad se fuerza automaticamente a 100%."],
            ["Estancada", "Sin avance relevante; requiere reactivacion o descarte."],
            ["Perdida", "Cierre negativo. La probabilidad se fuerza automaticamente a 0%."],
          ],
          [2400, 6960],
        ),
        p(""),
        note("Al mover una Oportunidad a Ganada o Perdida (desde el Pipeline, el listado o su edicion), la probabilidad se ajusta automaticamente a 100% o 0% y el Monto ponderado se recalcula. La probabilidad que tenia antes de cerrarse se guarda internamente, y si la Oportunidad vuelve a un estado abierto, esa probabilidad anterior se restaura sola."),
        bullet("El listado permite filtrar por Estado y por Seguimiento (ambos de seleccion multiple), y ocultar las Oportunidades cerradas con un checkbox."),
        bullet("Al elegir una Oportunidad en los formularios de Tarea o Interaccion, el Servicio se autocompleta con el de la Oportunidad."),

        h1("7. Pipeline comercial"),
        p("Vista de tablero (kanban) con las Oportunidades agrupadas por etapa. Permite arrastrar y soltar una Oportunidad entre columnas para cambiar su etapa."),
        bullet("Filtros disponibles: responsable, servicio y Seguimiento (seleccion multiple)."),
        bullet("Cada columna muestra el monto total y ponderado de las Oportunidades que contiene."),
        bullet("Mover una Oportunidad a Ganada o Perdida aplica la misma regla automatica de probabilidad descrita en la seccion de Oportunidades."),

        h1("8. Interacciones y Tareas"),
        h2("8.1 Interacciones"),
        p("Registran cada contacto comercial: llamada, correo, WhatsApp, reunion, etc. Pueden crearse manualmente o generarse automaticamente desde las Fuentes (Correo, WhatsApp, Reuniones, LinkedIn)."),
        bullet("El formulario de Nueva interaccion incluye un buscador de Empresa que filtra en cascada los listados de Contacto y Oportunidad."),
        bullet("Si se completa el campo “Proxima accion”, el sistema genera automaticamente una Tarea vinculada."),
        bullet("Por defecto, la fecha de la proxima accion se agenda para el siguiente dia habil a las 9:00. El boton “Urgente” permite agendarla para el mismo dia."),
        h2("8.2 Tareas"),
        p("Acciones pendientes con responsable, fecha limite y vinculo opcional a Empresa, Contacto, Oportunidad, Interaccion y Servicio."),
        bullet("El formulario de Nueva tarea tiene el mismo buscador y cascada de Empresa/Contacto/Oportunidad que Nueva interaccion."),
        bullet("En el listado, la seccion “Editar tarea” (desplegable) permite modificar el titulo y los vinculos sin salir de la pagina; tambien aplica el filtrado en cascada."),
        bullet("Es posible importar Tareas desde Google Tasks si el usuario tiene Google Calendar conectado con ese permiso."),

        h1("9. Fuentes de informacion"),
        h2("9.1 Leads web"),
        p("Formularios de contacto del sitio de ADENTU. Cada lead puede convertirse en Contacto/Empresa o descartarse."),
        h2("9.2 Correo"),
        p("Sincroniza buzones conectados (Gmail/Outlook). Cada mensaje se clasifica automaticamente (comercial o no, intencion, sentimiento) y puede vincularse a una Empresa/Oportunidad existente o nueva."),
        bullet("Reglas de descarte permiten ignorar automaticamente remitentes, dominios o asuntos recurrentes (ej. notificaciones de sistemas)."),
        bullet("La vista de detalle de un correo muestra el encabezado y un extracto del cuerpo, con boton “Ver completo” para desplegar el resto."),
        bullet("Los correos descartados por regla pueden eliminarse permanentemente (solo ADMIN); el sistema recuerda cuales se eliminaron para que no vuelvan a aparecer en una proxima sincronizacion."),
        h2("9.3 WhatsApp"),
        p("Integracion con WhatsApp Business. Los mensajes entrantes se intentan vincular automaticamente a un Contacto/Empresa por numero de telefono."),
        bullet("Se puede configurar un usuario por defecto (con Google Drive conectado) para guardar automaticamente las imagenes, documentos y audios recibidos, organizados en carpetas por numero de telefono."),
        bullet("Tambien existen reglas de descarte por numero, igual que en Correo."),
        h2("9.4 Reuniones"),
        p("Sincroniza reuniones de Google Calendar con enlace de Google Meet. Permite registrar minuta, asociar Empresa/Contacto/Oportunidad/Servicio, y generar una Interaccion al cerrar la reunion."),
        bullet("Las reuniones recurrentes se identifican con la etiqueta “Recurrente”; el boton “Ignorar serie recurrente” descarta esa reunion y todas las futuras instancias de la misma serie."),
        bullet("Se pueden importar transcripciones y notas inteligentes (Smart Notes) generadas por Google Meet, cuando estan disponibles para el usuario conectado."),
        h2("9.5 LinkedIn"),
        p("Capturas de perfiles de LinkedIn (exportados en PDF) que se procesan para extraer datos de Contacto. Cada captura reciente enlaza directamente a la ficha del Contacto identificado."),

        h1("10. Inteligencia Comercial"),
        p("Modulo de analisis con IA que entrega sugerencias estructuradas (resumen, intereses, objeciones, compromisos, riesgos, proximos pasos, cambios sugeridos de probabilidad/etapa) para revision humana antes de aplicarse."),
        bullet("Analisis por Interaccion: evalua un intercambio puntual. Se ejecuta con el boton “Analizar con IA” en cada Interaccion, Reunion o desde el listado de Inteligencia Comercial."),
        bullet("Analisis por Oportunidad: evalua el historial completo de interacciones de una Oportunidad en conjunto (no una por una), para detectar estancamiento real y sugerir avance/retroceso de etapa. Requiere al menos 2 interacciones registradas y se ejecuta manualmente desde la ficha de la Oportunidad."),
        bullet("Cada sugerencia debe Aprobarse o Rechazarse. Al aprobar, se aplican los cambios sugeridos (probabilidad, proxima tarea); al rechazar, queda registrada para trazabilidad."),
        bullet("Los analisis Rechazados pueden eliminarse desde el listado de Inteligencia Comercial."),

        h1("11. Playbooks"),
        p("Guias de venta por Servicio: preguntas clave para calificar, criterios de calificacion, objeciones comunes, proximos pasos sugeridos, checklist de propuesta y documentos sugeridos. Se muestran automaticamente en la ficha de la Oportunidad segun su Servicio."),

        h1("12. Configuracion"),
        p("Disponible solo para ADMIN:"),
        bullet("Servicios: catalogo de servicios ofrecidos (activar/desactivar, orden)."),
        bullet("Diccionarios: listas de valores configurables usadas en distintos formularios."),
        bullet("Usuarios: alta, edicion de rol y baja de usuarios del CRM."),
        bullet("Proveedor de IA: seleccion entre OpenAI o Anthropic para todos los analisis del sistema."),
        bullet("Calendario: conexion de Google Calendar/Drive por usuario, y configuracion del usuario que almacena los archivos de WhatsApp en Drive."),
        bullet("Auditoria: historial de cambios relevantes (creaciones, ediciones, cambios de etapa, aprobaciones de IA, eliminaciones)."),

        h1("13. Flujo tipico de uso"),
        numbered("Se recibe un correo, mensaje de WhatsApp o se agenda una reunion con un prospecto o cliente."),
        numbered("El sistema clasifica el mensaje (o el usuario lo revisa manualmente) y, si corresponde, se registra como Interaccion vinculada a una Empresa/Contacto y a una Oportunidad existente o nueva."),
        numbered("Si la Interaccion define una Proxima accion, se crea automaticamente una Tarea para el siguiente dia habil (o el mismo dia, si se marca Urgente)."),
        numbered("El responsable gestiona la Tarea y registra nuevas Interacciones a medida que avanza la conversacion comercial."),
        numbered("Cuando hay suficiente historial, se puede ejecutar el Analisis de IA por Oportunidad para revisar el estado real de avance y aprobar los cambios sugeridos."),
        numbered("La Oportunidad avanza en el Pipeline (Exploracion - Propuesta enviada - Negociacion) hasta cerrarse como Ganada o Perdida, momento en que su probabilidad se ajusta automaticamente."),
        numbered("El Dashboard y el Pipeline reflejan en todo momento el estado agregado de la cartera comercial."),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("C:/Users/siste/AppData/Local/Temp/claude/C--Users-siste/1fa0cd5b-def8-49dd-985f-ce67ec10605d/scratchpad/adentu-manual/Manual_Usuario_CRM_ADENTU_v2.docx", buffer);
  console.log("done");
});
