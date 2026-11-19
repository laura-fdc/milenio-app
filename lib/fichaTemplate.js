// Plantilla de la ficha "FIM Ficha Inscripción Milenio 2627": posición de cada campo
// [clave, página, x, y, ancho, alto] en puntos PDF (origen abajo a la izquierda).
export const PAGE_W = 595.2;
export const PAGE_H = 841.68;

const B = 13; // casillas
export const FIELDS = [
  // Página 1 — datos del deportista
  ['nombre', 0, 115, 708, 311, 10], ['dni', 0, 481, 708, 74, 10],
  ['nacimiento', 0, 123, 694, 94, 10], ['pais', 0, 302, 694, 94, 10], ['nacionalidad', 0, 463, 695, 94, 10],
  ['domicilio', 0, 72, 680, 215, 10], ['localidad', 0, 342, 680, 89, 10], ['provincia', 0, 485, 680, 86, 10],
  ['cp', 0, 91, 665, 74, 10], ['telefono', 0, 216, 665, 77, 10], ['mail', 0, 321, 665, 201, 10],
  // Tutores
  ['tutor1.nombre', 0, 115, 632, 311, 10], ['tutor1.dni', 0, 483, 632, 77, 10], ['tutor1.mail', 0, 46, 618, 311, 10], ['tutor1.telefono', 0, 411, 617, 77, 10],
  ['tutor2.nombre', 0, 113, 599, 311, 10], ['tutor2.dni', 0, 483, 600, 77, 10], ['tutor2.mail', 0, 45, 585, 311, 10], ['tutor2.telefono', 0, 411, 584, 77, 10],
  // Banco
  ['iban', 0, 147, 553, 311, 10], ['titular', 0, 131, 537, 311, 10],
  // Socio
  ['actualizarDatos', 0, 26, 502, B, B], ['actualizarDisciplina', 0, 26, 486, B, B], ['socioNuevo', 0, 417, 501, B, B],
  ['hermanosSi', 0, 470, 439, B, B], ['hermanosNo', 0, 525, 440, B, B],
  ['observaciones', 0, 19, 438, 414, 28], ['noDifusion', 0, 400, 404, B, B],
  ['abonadoSi', 0, 238, 386, B, B], ['abonadoNo', 0, 292, 386, B, B], ['numAbonado', 0, 437, 386, 85, 13],
  ['imagenTutor1', 0, 282, 172, B, B], ['imagenTutor2', 0, 548, 170, B, B],
  ['firmaTutor1', 0, 51, 126, 178, 13], ['firmaTutor2', 0, 334, 126, 178, 13],
  ['fechaDia', 0, 81, 70, 33, 8], ['fechaMes', 0, 130, 70, 87, 8], ['fechaAnio', 0, 253, 70, 33, 8],
  // Página 2 — Anexo deportivo
  ['anexoNombre', 1, 119, 699, 291, 13], ['anexoDni', 1, 446, 699, 120, 13],
  ['ninos.lun-1815', 1, 45, 635, B, B], ['ninos.mie-1700', 1, 45, 621, B, B], ['ninos.sab-1140', 1, 45, 606, B, B],
  ['escuelaArtistico', 1, 45, 557, B, B], ['escuelaHockey', 1, 44, 503, B, B],
  ['balletMas15', 1, 45, 433, B, B], ['balletMenos15', 1, 151, 433, B, B],
  ['adultos', 1, 295, 634, B, B],
  ['hockeyCategorias', 1, 294, 571, B, B], ['hockeyHobby', 1, 294, 557, B, B], ['hockeyHobbyIni', 1, 295, 543, B, B],
  ['tec.lun-2105', 1, 293, 488, B, B], ['tec.mar-1500', 1, 294, 474, B, B], ['tec.mie-1500', 1, 294, 460, B, B],
  ['tec.mie-1600', 1, 294, 446, B, B], ['tec.jue-1500', 1, 294, 432, B, B], ['tec.jue-1600', 1, 294, 417, B, B],
  ['tec.sab-1250', 1, 295, 402, B, B], ['tec.dom-0800', 1, 294, 389, B, B], ['tec.dom-0900', 1, 294, 374, B, B],
  ['tec.dom-2015', 1, 294, 360, B, B],
];

export const isCheckbox = (f) => f[4] === B && f[5] === B;

// Textos impresos de la ficha (primera palabra, página, x, y de la línea base) para
// alinear una foto o escaneo con la plantilla.
export const ANCHORS = [
  ['fecha', 0, 21, 696], ['pais', 0, 222, 696], ['nacionalidad', 0, 400, 696],
  ['domicilio', 0, 21, 681], ['localidad', 0, 293, 681], ['provincia', 0, 435, 681],
  ['codigo', 0, 21, 667], ['cuenta', 0, 21, 553], ['titular', 0, 21, 539],
  ['responsable', 0, 20, 358], ['finalidad', 0, 20, 345], ['legitimacion', 0, 20, 321],
  ['destinatarios', 0, 20, 297], ['derechos', 0, 20, 273], ['obligaciones', 0, 20, 261],
  ['categorias', 1, 311, 574], ['horarios', 1, 293, 532], ['opcion', 1, 293, 623],
  ['martes', 1, 311, 476], ['domingo', 1, 311, 389],
];

// Palabras impresas que no deben tomarse como dato escrito.
export const PRINTED = new Set(['dni', 'd.n.i.', 'mail', 'mail:', 'telefono', 'telefono:', 'es', '__', 'si', 'no', 'de', 'fdo', 'fdo.:', 'nacionalidad', 'localidad:', 'provincia:']);
