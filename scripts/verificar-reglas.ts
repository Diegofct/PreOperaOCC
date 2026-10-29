/**
 * Verificación de las reglas del preoperacional contra los formatos reales.
 *
 *   npx tsx scripts/verificar-reglas.ts
 *
 * No sustituye a una prueba en el teléfono, pero cubre lo que más caro sale
 * equivocarse: que un hallazgo en un ítem `AI` deje el vehículo NO APTO, que
 * no se pueda enviar un formato incompleto, y que los medidores no retrocedan.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  generarClaveTemporal,
  hashDeClave,
  medirCostoDeClave,
  verificarClave,
} from '../src/features/auth/servidor/cripto';
import { firmarPeticion } from '../src/features/media/servidor/firma-s3';
import { respuestaEnviada } from '../src/features/servidor/envios';
import {
  conReintentoSiChoca,
  cuerpoJson,
  duplicadoDe,
  MENSAJE_DE_CHOQUE,
  responder,
} from '../src/features/servidor/respuestas';

import {
  debeOlvidarEquipo,
  esperaPorFallos,
  intentosRestantes,
  mensajeDeEspera,
} from '../src/features/auth/escalera';
import type {
  PlantillaChecklist,
  RespuestaItem,
  ResultadoPreoperacional,
} from '../src/features/checklists/types';
import {
  borradorCaduco,
  borradorTieneContenido,
  estadoDelDia,
  evaluarPreoperacional,
  itemsAplicables,
  itemsMarcablesEnBloque,
  periodicidadesAplicables,
  respuestasDeMedidores,
  validarMedidor,
  type FirmaDelDia,
} from '../src/shared/rules/inspeccion';
import { fusionarVehiculo, mayorMedidor, type VehiculoLocal } from '../src/shared/rules/fusion';
import {
  alcanza,
  avisoDeModuloAjeno,
  avisoDeModuloApagado,
  ETIQUETA_ROL,
  moduloApagado,
  motivoParaNoDarRolEnObra,
  ROLES,
  moduloDeEntrada,
  MODULOS,
  motivoDeRechazo,
  motivoParaNoDarRol,
  sinObraAsignada,
  modulosVisibles,
  puedeCambiarRol,
  rolesQuePuedeDar,
  type Modulo,
  type Rol,
  TODOS_LOS_MODULOS,
} from '../src/shared/rules/permisos';
import {
  CARGOS,
  cargoPorId,
  nombreDeCargo,
  operaVehiculos,
  rolSugerido,
} from '../src/shared/catalogos/cargos';
import {
  abreviaturaDeUnidad,
  IDS_UNIDAD,
  nombreDeUnidad,
  UNIDADES_ALMACEN,
} from '../src/shared/catalogos/almacen';
import { CLAVE_OTRO_MATERIAL, MATERIALES_DE_OCC } from '../src/shared/catalogos/materiales';
import { PLANTILLAS, PLANTILLAS_POR_TIPO } from '../src/features/checklists/plantillas';
import {
  DESGASTE_PARA_CAMBIO,
  hayQueCambiar,
  nombreDePosicion,
  posicionesDe,
  vidaUtilRestante,
} from '../src/shared/catalogos/llantas';
import {
  diaDeLaSemana,
  domingoDePascua,
  esDominicalOFestivo,
  esFestivo,
  festivosDe,
} from '../src/shared/rules/festivos';
import {
  cubrenLaJornada,
  describirHorarioDelDia,
  desglosarJornada,
  HORARIO_ANTERIOR,
  HORARIO_PROPUESTO,
  horarioEfectivo,
  HORAS_DEL_DIA,
  MAXIMO_MINUTOS_SEMANALES,
  mensajeDeHorarioDeObra,
  minutosCubiertos,
  minutosDeHora,
  minutosOfrecidos,
  minutosSemanales,
  partirHora,
  unirHora,
  tramosDelDia,
  validarFranjas,
  validarHorario,
  validarHorarioDeObra,
  type HorarioDeObra,
} from '../src/shared/rules/horas';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '../src/shared/rules/rango';
import { POR_PAGINA, recortarPagina } from '../src/features/panel/paginas';
import {
  horasDeLaPersona,
  horasNoCuadran,
  mensajeDePersona,
  validarPersonaDelParte,
} from '../src/shared/rules/horas';
import {
  ENSAYOS_DE_CALIDAD,
  nombreDeClima,
  nombreDeEnsayo,
} from '../src/shared/catalogos/bitacora';
import {
  ACTIVIDADES_DEL_PRESUPUESTO,
  actividadPorItem,
  CLAVE_OTRA_ACTIVIDAD,
  etiquetaDeActividad,
  etiquetaDeUnidad,
  IDS_UNIDAD_DE_ACTIVIDAD,
} from '../src/shared/catalogos/presupuesto';
import { Colors, Estado, Panel } from '../src/constants/paleta';
import {
  AnchoIndiceDeSecciones,
  AnchoMenuAbierto,
  AnchoMenuPlegado,
  AnchoMinimoDosColumnas,
  AnchoMinimoMenuFijo,
  AnchoMinimoPanel,
  MaxContentWidthPanel,
  Spacing,
} from '../src/constants/medidas';
import { anchoMinimoDeColumna } from '../src/features/panel/columnas';
import { filtrarOpciones, normalizar, ofreceBusqueda } from '../src/shared/rules/texto';
import { actividadesDelParte, conservarOrigen } from '../src/features/bitacoras/servidor/secciones';
import {
  hashDeTokenDeIntegracion,
  requerirIntegracion,
  tokenDeIntegracionValido,
} from '../src/features/servidor/guardia-integracion';
import {
  CATEGORIAS_DE_WHATSAPP,
  abscisaDeTexto,
  reconocerEnsayo,
  equiposTomados,
  reconocerMaquina,
  tipoDeEquipo,
  ubicacionDeTexto,
  unidadDeMedidor,
  cargoDeHoja,
  condicionDeClima,
  avisoDeReemplazo,
  conductorDelViaje,
  conductorPropuesto,
  claseDeMantenimiento,
  textoDelConductor,
  type CaminoDelConductor,
  posiblesCoincidencias,
  rechazoDeRegistro,
  usuarioDeLaBandeja,
  destinoDeCategoria,
  etiquetaDeCategoria,
  estadoInicialDeCategoria,
  faltasDelReporte,
  fusionarReporteEnParte,
  horaDeTexto,
  reconocerPersona,
  candidatosDeVehiculo,
  candidatosEnCantera,
  reconocerEnCantera,
  reconocerPorNombre,
  reconocerVehiculo,
  rechazoDeArchivo,
  resolverPropuesta,
  type CatalogosDeLaObra,
  TAMANO_MAXIMO_DE_ARCHIVO,
  tipoDeArchivo,
  type ContextoDelReporte,
  type PersonaConocida,
  type ReporteDelDia,
  type VehiculoConocido,
} from '../src/shared/rules/whatsapp';
import {
  completarIniciales,
  completarViaje,
  decisionDePersona,
  diaCompleto,
  diaPorVenir,
  diaVencido,
  esperaArchivo,
  placaDeLaMaquina,
  placaRegistrable,
  renglonesGuardados,
  separarRenglones,
  tipoDeReporte,
  viajeRepetido,
  viajesQueFaltan,
} from '../src/shared/rules/whatsapp-automatico';
import { colocarLista } from '../src/shared/rules/flotante';
import { diasDe, esTipoDePeriodo, periodoDe, periodoVecino } from '../src/shared/rules/periodos';
import {
  hojasDelReporte,
  nombreDelArchivo as nombreDelArchivoDeReporte,
  paginaParaImprimir,
  textoDelPeriodo,
} from '../src/features/reportes/exportar';
import type { ReporteDe } from '../src/features/reportes/servidor/reportes';
import {
  calidadPorEnsayo,
  cantidadesPorItem,
  climaDelPeriodo,
  horasDelPersonal,
  usoDeMaquinas,
  viajesAgrupados,
  type ParteConPersonal,
  type ParteDelPeriodo,
  claveDeCantidad,
  conContratado,
} from '../src/shared/rules/reportes';
import {
  avisoDeLecturaDeServicio,
  estadoDeMantenimiento,
  intervaloEfectivo,
  rangoDeMantenimiento,
} from '../src/shared/rules/mantenimiento';
import {
  diferenciaConPresupuesto,
  faltasParaAprobarContrato,
  faltasParaGuardarContrato,
  IMPUESTOS_SUGERIDOS,
  plazoEnDias,
  porcentajeValido,
  rechazoDeArchivo as rechazoDeArchivoDelContrato,
  TIPOS_DE_CONTRATO,
  type ContratoParaRevisar,
} from '../src/shared/rules/contrato';
import { enPesos } from '../src/shared/rules/pesos';
import { AVISO_FALTA_PLACA, identificacionDelVehiculo, normalizarPlaca } from '../src/shared/rules/vehiculos';
import {
  alcanzaLaEmpresa,
  alcanzaLaObraDeLaRuta,
  categoriasDeWhatsappDe,
  destinoAlEntrar,
  DIRECCION_DE_LICITAPP,
  EMPRESAS,
  EMPRESAS_CON_CORTE,
  empresaDeLaPersona,
  empresaDelAccesoSinObra,
  reparoDelAccesoSinObra,
  empresaDelLugar,
  lugarDeLaRuta,
  menuDeEmpresa,
  menuDelLugar,
  pestanasDeReportes,
  tituloDelLugar,
  menuDeObra,
  rutaNueva,
  rutaRenombrada,
  rutaRenombradaPara,
} from '../src/shared/rules/empresas';
import {
  consolidado,
  diferenciaConElAnterior,
  estaDesactualizado,
  fechaDelCorte,
  pesosDeTexto,
  resumenDeProyectos,
  textoDeDiferencia,
  ultimoCorte,
  validarCorte,
  type CorteParaRegla,
} from '../src/shared/rules/cortes';
import { polizasConAviso, vigenciaDePoliza, type PolizaParaAviso } from '../src/shared/rules/polizas';
import {
  alcanzaLaPersona,
  avisosDeLaPersona,
  camposCambiados,
  faltasDeFichaCompleta,
  faltasDeLaFicha,
  faltasDelRetiro,
  faltasDeLaRetirada,
  faltasParaRetirar,
  nombreDeEstadoLaboral,
  nombreDeTipoDeContrato,
  resumenDelPersonal,
  seOfreceEnSelectores,
  veElSalario,
  type DatosDeLaFicha,
  type FichaGuardable,
  type PersonaParaAvisos,
} from '../src/shared/rules/ficha';
import {
  aprobacionDeLaSolicitud,
  camposCorregidos,
  coincideLaSolicitud,
  ESTADOS_DE_SOLICITUD,
  estadoTrasComprasYRecibos,
  estaVencida,
  faltaDelMotivo,
  faltasDeLaCompra,
  faltasDelRecibo,
  faltasDeLaSolicitud,
  faltasPorCampo,
  marcasDeLaSolicitud,
  nombreDeEstadoDeSolicitud,
  numeroDeSolicitud,
  ordenDeLaBandeja,
  ordenDelLugar,
  PASOS_DE_SOLICITUD,
  pasaLosFiltros,
  porQueNoPuedeDar,
  puedeDar,
  resumenDeLaBandeja,
  solicitudAbierta,
  veElGasto,
  veLosValores,
  type DatosDeLaCompra,
  type DatosDeLaSolicitud,
  type EstadoDeSolicitud,
  type FiltrosDeLaBandeja,
  type RenglonParaCompra,
  type RenglonParaRecibir,
  type SolicitudEnLista,
  type SolicitudParaPaso,
} from '../src/shared/rules/compras';
import {
  clasesDe,
  coincideBusqueda,
  esClaseDe,
  estadoDelVencimiento,
  extensionDe,
  faltasDelDocumento,
  llevaPrecio,
  nombreDeClase,
  resumenDeVencimientos,
  revisarDocumento,
  tipoPorFirma,
  TAMANO_MAXIMO_DE_DOCUMENTO,
  type LugarDeDocumentos,
} from '../src/shared/rules/documentos';
import {
  claveDeItem,
  copiarParaNuevaVersion,
  faltasParaAprobarPresupuesto,
  faltasParaGuardarPresupuesto,
  itemsQueDesaparecen,
  normalizarEstructura,
  resumenDelPresupuesto,
  totalDelItem,
  unidadDelPresupuesto,
  type EstructuraDePresupuesto,
  type ItemDelPresupuesto,
} from '../src/shared/rules/presupuesto';
import { hojasDelPresupuesto, leerFormulario, type Celda } from '../src/shared/rules/formulario-presupuesto';
import {
  alcanceDelAsistente,
  claseDeAdjunto,
  conversacionVisible,
  costoEstimado,
  diaDelConteo,
  faltaDelPeriodo,
  faltasDeLosAdjuntos,
  limiteDelDia,
  agruparPorFecha,
  conversacionesQueCoinciden,
  ejemplosDePregunta,
  grupoDeFecha,
  MODULOS_CONSULTABLES,
  modulosDeAnulados,
  indicacionDeObraPorDefecto,
  obraAlAlcance,
  preguntasQueQuedan,
  resumenDeRegistrados,
  ROLES_DEL_ASISTENTE,
  tituloDeConversacion,
} from '../src/shared/rules/asistente';
import {
  estructuraDeLaIa,
  FILAS_MAXIMAS_PARA_LA_IA,
  textoParaLaIa,
  type ItemLeidoPorIa,
} from '../src/shared/rules/formulario-presupuesto-ia';
import { hojasDelLibro } from '../src/features/presupuestos/servidor/leer-excel';
import {
  actividadDelCatalogo,
  buscarActividad,
  capitulosDelItem,
  catalogoDelPresupuesto,
  catalogoFijo,
  opcionDeActividad,
  reconocerCapitulo,
} from '../src/shared/rules/actividades-de-obra';
import {
  ensayosDeLosPartes,
  filtrarEnsayosDeObra,
  textoDeUbicacion,
  type ParteConEnsayos,
} from '../src/shared/rules/ensayos-de-obra';
import {
  anchoDelContenido,
  regimenDelMenu,
} from '../src/shared/rules/menu';
import { moduloDeLaRuta, tituloDeLaPestana } from '../src/features/panel/modulos';
import {
  CLAVE_PREFERENCIA_MENU,
  guardarPreferencia,
  leerPreferencia,
  type Almacen,
} from '../src/features/panel/preferencia-menu';
import { cumplimientoDelDia } from '../src/shared/rules/cumplimiento';
import {
  formatoPendiente,
  formatoPrestadoDe,
  TIPOS_VEHICULO,
} from '../src/shared/catalogos/tipos-vehiculo';
import { cadenaCanonicaDePlantilla, idDePlantilla } from '../src/shared/catalogos/plantillas';
import {
  franjaPorId,
  FRANJAS_GRANULOMETRICAS,
  type FranjaGranulometrica,
} from '../src/shared/catalogos/franjas-granulometricas';
import { SERIE_DE_TAMICES, TAMICES_CON_ABERTURA } from '../src/shared/catalogos/tamices';
import {
  calcularGranulometria,
  claveDeInforme,
  ETIQUETA_ESTADO_ENSAYO,
  estadoVisible,
  filtrarEnsayos,
  formatearNumero,
  granulometriasDelParte,
  leerMasa,
  redondear,
  transicionPermitida,
  validarEnsayo,
  veredictoDe,
  type AccionSobreEnsayo,
  type EnsayoAValidar,
  type EntradaGranulometria,
  type EstadoVisibleEnsayo,
  type RetenidosDelEnsayo,
} from '../src/shared/rules/granulometria';
import { vehiculos } from '../src/db/servidor/esquema';
import { alcanzaLaImagen, alcanzaLaObra, filtroDeObra } from '../src/features/servidor/alcance';
import type { PersonaEnSesion } from '../src/features/auth/servidor/sesion';
import {
  debeRendirse,
  esperaDeReintento,
  ESPERA_MAXIMA_MS,
  fallaDefinitiva,
  INTENTOS_MAXIMOS,
  siguienteIntento,
} from '../src/shared/rules/reintentos';
import {
  avanceDeMedidor,
  esBitacoraCompleta,
  medidorDeClase,
  mensajeDeAvance,
  validarAvance,
  fechaDeJornada,
  fechaLocalISO,
  horaLocal,
  horasDeMaquina,
  maquinasSinBitacora,
  PERIODOS,
  restarDias,
  sumarDias,
  validarHorometros,
  faltaContraElVehiculo,
  lecturaSugerida,
  lecturaAnterior,
  avisoDeLecturaInicial,
  diaCorto,
} from '../src/shared/rules/jornada';
import {
  bloqueosDelCierre,
  faltaElMotivoSinRegistro,
  faltaObservacionDelEnsayo,
  faltasDeActividad,
  faltasDelEnsayo,
  MENSAJES_DE_ACTIVIDAD,
  MENSAJES_DE_ENSAYO,
  mensajeDeDiaSinTrabajo,
  mensajeDelRechazoDeCierre,
  resolverDiaSinTrabajo,
  resolverSeccionSinRegistro,
  seccionesDelParte,
  validarDiaSinTrabajo,
  type ConteosDelParte,
  type FotosDelParte,
  type ParteEvaluable,
} from '../src/shared/rules/parte';
import { calcularDimensiones, resolverCantidad } from '../src/shared/rules/dimensiones';
import {
  aCentesimas,
  aDecimal,
  filtrarMovimientos,
  formatearCantidad,
  historialConSaldo,
  MENSAJES_DE_MOVIMIENTO,
  rechazoDeAnulacion,
  rechazoDeBaja,
  rechazoDeCambioDeUnidad,
  rechazoDeSalida,
  saldoDelReporte,
  totalesDelMaterial,
  unidadDeTexto,
  validarMovimiento,
  type MovimientoRegistrado,
} from '../src/shared/rules/almacen';
import {
  avisoDeValeRepetido,
  canteraDelParte,
  conductorElegible,
  DESTINO_OBRA,
  faltaDeVale,
  filtrarViajes,
  formatearAbscisa,
  mismoVale,
  METROS_MAXIMOS,
  OPCIONES_DE_PR,
  validarAbscisa,
  validarViaje,
  valeLimpio,
  volquetaElegible,
} from '../src/shared/rules/cantera';
import {
  conservarHeredadas,
  construirActividadDelParte,
  construirEnsayo,
  rechazoDelEnsayo,
  construirMaquina,
  construirPersona,
  esActividadHeredada,
  esMaterialHeredado,
} from '../src/features/bitacoras/parte';
import {
  esEnsayo,
  esEnsayoAnterior,
  type ActividadDelParte,
  type FilaDeControlDeCalidad,
  type MaquinaDelParte,
} from '../src/features/bitacoras/tipos';
import {
  actividadDelParte,
  anulacion,
  asignacionEditada,
  devolucion,
  ensayoDelParte,
  ensayoEditado,
  ensayoNuevo,
  materialDeCanteraEditado,
  materialDeCanteraNuevo,
  materialEditado,
  materialNuevo,
  movimientoNuevo,
  obraEditada,
  obraNueva,
  parteEditado,
  aprobacion,
  descarte,
  devolucionAPendiente,
  entregaDeWhatsapp,
  grupoAsociado,
  propuestaCorregida,
  personasDesdeLaBandeja,
  propuestaDeIa,
  reporteCorregido,
  personaDelParte,
  personaEditada,
  sitioEditado,
  sitioNuevo,
  viajeNuevo,
} from '../src/features/panel/contratos';
import {
  fotoEntraALaBitacora,
  fotosParaAgregar,
  unificarFotosDelDia,
  type FotoCandidata,
  type FotoDeLaSeccion,
} from '../src/shared/rules/fotos-del-dia';
import {
  leerOrdenGuardado,
  ordenarFilas,
  ordenTrasPulsar,
  type Orden,
} from '../src/features/panel/ordenar';

import camioneta from '../src/features/checklists/plantillas/camioneta.v3.json';
import retroexcavadora from '../src/features/checklists/plantillas/retroexcavadora.v2.json';
import volqueta from '../src/features/checklists/plantillas/volqueta.v3.json';
import camionetaAnterior from '../src/features/checklists/plantillas/camioneta.v2.json';
import motoniveladoraAnterior from '../src/features/checklists/plantillas/motoniveladora.v1.json';
import retrocargadorAnterior from '../src/features/checklists/plantillas/retrocargador.v1.json';
import retroexcavadoraAnterior from '../src/features/checklists/plantillas/retroexcavadora.v1.json';
import volquetaAnterior from '../src/features/checklists/plantillas/volqueta.v2.json';
import { ITEMS_NUEVOS, ITEMS_RETIRADOS } from '../src/features/checklists/plantillas/ajustes';
import {
  ENCABEZADOS_EXISTENCIAS,
  ENCABEZADOS_MOVIMIENTOS,
  hojasDelAlmacen,
  nombreDelArchivo,
  type MaterialParaExportar,
  type MovimientoParaExportar,
} from '../src/features/almacen-obra/exportar';

const VOLQUETA = volqueta as PlantillaChecklist;
const CAMIONETA = camioneta as PlantillaChecklist;
const RETROEXCAVADORA = retroexcavadora as PlantillaChecklist;

/**
 * Los formatos **anteriores** a la spec 011, tal como se firmaron hasta hoy. La
 * poda se comprueba contra ellos: una clave que no existiera aquí sería una clave
 * mal escrita, y el ítem seguiría saliéndole al operador sin que nada fallara.
 */
const FORMATOS_ANTERIORES: Record<string, PlantillaChecklist> = {
  volqueta: volquetaAnterior as PlantillaChecklist,
  camioneta: camionetaAnterior as PlantillaChecklist,
  motoniveladora: motoniveladoraAnterior as PlantillaChecklist,
  retrocargador: retrocargadorAnterior as PlantillaChecklist,
  retroexcavadora: retroexcavadoraAnterior as PlantillaChecklist,
};

/** Los formatos **vigentes**, los que hoy le salen al operador. */
const FORMATOS_VIGENTES: Record<string, PlantillaChecklist> = {
  volqueta: VOLQUETA,
  camioneta: CAMIONETA,
  motoniveladora: PLANTILLAS_POR_TIPO.get('motoniveladora')!,
  retrocargador: PLANTILLAS_POR_TIPO.get('retrocargador')!,
  retroexcavadora: RETROEXCAVADORA,
};

function clavesDe(plantilla: PlantillaChecklist): Set<string> {
  return new Set(plantilla.secciones.flatMap((s) => s.items).map((i) => i.key));
}

const MS_DIA = 86_400_000;
let pruebas = 0;

function prueba(nombre: string, fn: () => void) {
  fn();
  pruebas++;
  console.log(`  ✓ ${nombre}`);
}

/** Igual, para lo que hay que esperar: derivar una contraseña tarda ~300 ms. */
async function pruebaAsync(nombre: string, fn: () => Promise<void>) {
  await fn();
  pruebas++;
  console.log(`  ✓ ${nombre}`);
}

/** Responde todo "conforme" salvo las excepciones indicadas. */
function responderTodo(
  plantilla: PlantillaChecklist,
  periodicidades: ReturnType<typeof periodicidadesAplicables>,
  excepciones: Record<string, 'no_conforme' | 'na'> = {},
  omitir: string[] = [],
): RespuestaItem[] {
  const omitidos = new Set(omitir);
  return plantilla.secciones.flatMap((seccion) =>
    seccion.items
      .filter((item) => periodicidades.includes(item.periodicidad) && !omitidos.has(item.key))
      .map((item) => ({
        itemKey: item.key,
        seccionKey: seccion.key,
        label: item.label,
        sistema: item.sistema,
        tipo: item.tipo,
        inmoviliza: item.inmoviliza,
        valor: excepciones[item.key] ?? ('conforme' as const),
        respondidoEn: Date.now(),
      })),
  );
}

console.log('\nReglas del preoperacional\n');

prueba('los cinco formatos quedan con los ítems que acordó la spec 011', () => {
  // Spec 011 / RF-1 a RF-5. Eran 86, 58, 53, 48 y 52 antes de la poda.
  const esperados: Record<string, number> = {
    volqueta: 55,
    camioneta: 39,
    motoniveladora: 42,
    retrocargador: 40,
    retroexcavadora: 43,
  };

  for (const [tipo, cuantos] of Object.entries(esperados)) {
    const items = FORMATOS_VIGENTES[tipo].secciones.flatMap((s) => s.items);
    assert.equal(items.length, cuantos, tipo);
  }
  assert.equal(VOLQUETA.secciones.flatMap((s) => s.items).filter((i) => i.inmoviliza).length, 15);
});

prueba('cada formato tiene los ítems que inmovilizan que acordó la spec 011', () => {
  // Spec 011 / RF-12 a RF-16, anexo C. Las tres amarillas venían con **cero**:
  // una motoniveladora con la cabina rota salía APTA.
  const esperados: Record<string, number> = {
    volqueta: 15,
    camioneta: 12,
    motoniveladora: 12,
    retrocargador: 8,
    retroexcavadora: 7,
  };
  for (const [tipo, cuantos] of Object.entries(esperados)) {
    const items = FORMATOS_VIGENTES[tipo].secciones.flatMap((s) => s.items);
    assert.equal(items.filter((i) => i.inmoviliza).length, cuantos, tipo);
  }

  // Y las claves concretas, no solo la cuenta: un número cuadra por casualidad.
  const inmoviliza = (tipo: string, clave: string) =>
    FORMATOS_VIGENTES[tipo].secciones
      .flatMap((s) => s.items)
      .find((i) => i.key === clave)?.inmoviliza === true;

  for (const tipo of ['motoniveladora', 'retrocargador', 'retroexcavadora']) {
    assert.ok(inmoviliza(tipo, 'cabina__cinturon_de_seguridad'), `${tipo}: cinturón`);
    assert.ok(inmoviliza(tipo, 'cabina__estructura_cabina'), `${tipo}: estructura de cabina`);
    assert.ok(inmoviliza(tipo, 'luces_y_senales__farolas_delanteras'), `${tipo}: farolas`);
    assert.ok(inmoviliza(tipo, 'adicionales__kit_de_seguridad'), `${tipo}: kit`);
  }
  // La palanca que impide que el brazo se mueva solo, donde existe.
  assert.ok(inmoviliza('retrocargador', 'cabina__palanca_de_bloqueo_de_seguridad'));
  assert.ok(inmoviliza('retroexcavadora', 'cabina__palanca_de_bloqueo_de_seguridad'));
  // Los tres frenos de la motoniveladora, que son todo lo que tiene.
  assert.ok(inmoviliza('motoniveladora', 'cabina__freno_de_servicio'));
  assert.ok(inmoviliza('motoniveladora', 'cabina__freno_de_estacionamiento'));
  assert.ok(inmoviliza('motoniveladora', 'cabina__parada_de_emergencia'));
  // Tren de rodaje: llantas en las de ruedas, orugas en la de cadenas.
  assert.ok(inmoviliza('motoniveladora', 'ruedas__llantas_eje_3'));
  assert.ok(inmoviliza('retrocargador', 'ruedas__llantas_eje_2'));
  assert.ok(inmoviliza('retroexcavadora', 'tren_de_rodaje__orugas_eslabones_zapatas_y_pernos'));
  // Los resumidos del anexo B y la marca que hereda la camioneta.
  assert.ok(inmoviliza('volqueta', 'frenos__los_frenos_responden_bien'));
  assert.ok(inmoviliza('volqueta', 'dirreccion__direccion_sin_juego_ni_ruidos'));
  assert.ok(inmoviliza('volqueta', 'adicionales__documentos_al_dia'));
  assert.ok(inmoviliza('camioneta', 'chasis__direccion_sin_juego_ni_ruidos'));
  assert.ok(inmoviliza('camioneta', 'capot_o_careta__ventilador_correas_y_bomba_de_agua'));
});

prueba('un borrador de otra versión del formato no se puede seguir llenando', () => {
  // Spec 011 / RF-27 y RF-28. Lo que se evita es un acta que mezcle dos formatos:
  // respuestas de ítems que ya no existen y ninguna de los que entraron.
  assert.equal(borradorCaduco(2, 3), true);
  assert.equal(borradorCaduco(3, 3), false);
  // Una versión más alta que la vigente no debería existir, pero si el equipo
  // quedó con una plantilla que el catálogo ya no trae, tampoco se sigue: el
  // formulario que se pintaría no sería el del borrador.
  assert.equal(borradorCaduco(4, 3), true);
});

/* ------------------------------------------------------------------------ */
/* Un preoperacional al día (spec 013)                                       */
/* ------------------------------------------------------------------------ */

const OPERADOR = 'operador-1';
const OTRO_OPERADOR = 'operador-2';
const MAQUINA = 'vehiculo-1';
const OTRA_MAQUINA = 'vehiculo-2';

/** A quién y a qué máquina se le pregunta, en la jornada de hoy. */
const HOY = { usuarioId: OPERADOR, vehiculoId: MAQUINA, hoy: fechaDeJornada() };

/**
 * Un instante a esa hora de Colombia dentro de la jornada indicada.
 *
 * Se construye desde `fechaDeJornada` y con el desfase escrito (`-05:00`), no
 * desde el reloj de quien corre la prueba: si no, esto pasaría o fallaría según
 * el huso de la máquina donde se ejecuta.
 */
function enJornada(dia: string, hora: number): number {
  return Date.parse(`${dia}T${String(hora).padStart(2, '0')}:00:00-05:00`);
}

function firmado(
  hora: number,
  resultado: ResultadoPreoperacional = 'apto',
  quien: { usuarioId?: string; vehiculoId?: string; dia?: string } = {},
): FirmaDelDia {
  return {
    usuarioId: quien.usuarioId ?? OPERADOR,
    vehiculoId: quien.vehiculoId ?? MAQUINA,
    enviadoEn: enJornada(quien.dia ?? fechaDeJornada(), hora),
    resultado,
  };
}

prueba('una máquina ya revisada hoy no vuelve a pedir preoperacional', () => {
  // Spec 013 / RF-1 y RF-3. «Con novedades» cuenta como hecha igual que APTO:
  // solo el NO APTO —que sí para la máquina— abre la puerta a repetir.
  assert.equal(estadoDelDia(HOY, []).toca, true);
  assert.equal(estadoDelDia(HOY, [firmado(7)]).toca, false);
  assert.equal(estadoDelDia(HOY, [firmado(7, 'apto_con_observaciones')]).toca, false);
});

prueba('una máquina que quedó NO APTO se puede volver a revisar el mismo día', () => {
  // Spec 013 / RF-2 y RF-6. Ese segundo preoperacional es la constancia de que
  // la máquina se reparó y volvió a servir.
  assert.equal(estadoDelDia(HOY, [firmado(7, 'no_apto')]).toca, true);
  // Y no hay tope: mientras siga saliendo NO APTO, se sigue pudiendo repetir.
  assert.equal(
    estadoDelDia(HOY, [firmado(7, 'no_apto'), firmado(9, 'no_apto'), firmado(11, 'no_apto')]).toca,
    true,
  );
});

prueba('manda el último preoperacional del día, no el peor', () => {
  // Spec 013 / RF-2. NO APTO a las 7 y APTO a las 9: la máquina se reparó y ya
  // está revisada, así que no toca otro.
  assert.equal(estadoDelDia(HOY, [firmado(7, 'no_apto'), firmado(9, 'apto')]).toca, false);
  // Al revés sí toca: volvió a quedar parada después de estar buena.
  assert.equal(estadoDelDia(HOY, [firmado(7, 'apto'), firmado(9, 'no_apto')]).toca, true);
  // El orden en que llegan las filas no importa: manda `enviadoEn`.
  assert.equal(estadoDelDia(HOY, [firmado(9, 'apto'), firmado(7, 'no_apto')]).toca, false);
});

prueba('la cuenta es por operador y por máquina, no solo por máquina', () => {
  // Spec 013 / RF-4 y RF-5. Cada quien responde por la máquina que va a manejar,
  // y es además lo único que funciona sin señal: un teléfono no puede saber lo
  // que hizo otro.
  assert.equal(estadoDelDia(HOY, [firmado(7, 'apto', { usuarioId: OTRO_OPERADOR })]).toca, true);
  assert.equal(estadoDelDia(HOY, [firmado(7, 'apto', { vehiculoId: OTRA_MAQUINA })]).toca, true);
  // Con las dos cosas mezcladas, solo cuenta la fila que es de este par.
  assert.equal(
    estadoDelDia(HOY, [
      firmado(7, 'apto', { usuarioId: OTRO_OPERADOR }),
      firmado(8, 'apto', { vehiculoId: OTRA_MAQUINA }),
      firmado(9, 'apto'),
    ]).toca,
    false,
  );
});

prueba('el día de trabajo se parte a medianoche, con la fecha del parte diario', () => {
  // Spec 013 / RF-7. Lo firmado ayer a las 23:00 no revisa la máquina de hoy.
  const ayer = restarDias(fechaDeJornada(), 1);
  assert.equal(estadoDelDia(HOY, [firmado(23, 'apto', { dia: ayer })]).toca, true);
  // Y a las 00:30 de hoy sí cuenta como hoy: el corte es el mismo que el del
  // parte de obra, no una ventana de 24 horas hacia atrás.
  assert.equal(estadoDelDia(HOY, [firmado(0, 'apto')]).toca, false);
});

prueba('cuando ya está hecho, la regla dice a qué hora y cómo salió', () => {
  // Spec 013 / RF-10. Es lo que la tarjeta del operador tiene que mostrar.
  const estado = estadoDelDia(HOY, [firmado(7, 'apto_con_observaciones')]);
  assert.equal(estado.toca, false);
  if (estado.toca) throw new Error('debería estar hecho');
  assert.equal(estado.resultado, 'apto_con_observaciones');
  assert.equal(estado.hechoEn, enJornada(fechaDeJornada(), 7));
});

prueba('la regla del día no adelanta ni atrasa las revisiones periódicas', () => {
  // Spec 013 / RF-21. La quincenal se cuenta desde la última vez que se hizo en
  // esa máquina, y esta regla no entra en esa cuenta: `periodicidadesAplicables`
  // ni siquiera la recibe. Que el preoperacional de hoy ya esté hecho no acerca
  // ni aleja la quincenal vencida.
  // La camioneta, que es el formato vigente que conserva la quincenal: las
  // cinco máquinas amarillas y la volqueta se quedaron solo con la diaria.
  const CAMIONETA = FORMATOS_VIGENTES.camioneta;
  const ultimaQuincenal = Date.now() - 20 * MS_DIA;
  assert.equal(estadoDelDia(HOY, [firmado(7)]).toca, false);
  assert.ok(
    periodicidadesAplicables(Date.now(), CAMIONETA, { quincenal: ultimaQuincenal }).includes(
      'quincenal',
    ),
  );
  assert.ok(
    periodicidadesAplicables(Date.now() + MS_DIA, CAMIONETA, {
      quincenal: ultimaQuincenal,
    }).includes('quincenal'),
  );
});

/** Un formulario recién abierto: la pantalla no ha escrito nada todavía. */
const FORMULARIO_EN_BLANCO = {
  respuestas: [] as RespuestaItem[],
  odometroKm: null,
  horometroH: null,
  observaciones: '',
  fotos: 0,
};

const UNA_RESPUESTA: RespuestaItem = {
  itemKey: 'frenos__los_frenos_responden_bien',
  seccionKey: 'frenos',
  label: 'Los frenos responden bien',
  sistema: 'Frenos',
  tipo: 'conformidad',
  inmoviliza: true,
  valor: 'conforme',
  respondidoEn: Date.now(),
};

prueba('abrir el formulario y salir sin tocar nada no es trabajo que guardar', () => {
  // Spec 013 / RF-13 y RF-15. Hoy basta con abrir la pantalla para que quede un
  // «Sin terminar» en el historial, sobre una máquina que puede estar revisada.
  assert.equal(borradorTieneContenido(FORMULARIO_EN_BLANCO), false);
});

prueba('el primer dato que el operador escribe ya es trabajo que guardar', () => {
  // Spec 013 / RF-14. Cualquiera de los cuatro cuenta: no hay un campo
  // privilegiado que sea el que "empieza" el preoperacional.
  assert.equal(
    borradorTieneContenido({ ...FORMULARIO_EN_BLANCO, respuestas: [UNA_RESPUESTA] }),
    true,
  );
  assert.equal(borradorTieneContenido({ ...FORMULARIO_EN_BLANCO, horometroH: 1420 }), true);
  assert.equal(borradorTieneContenido({ ...FORMULARIO_EN_BLANCO, odometroKm: 98_300 }), true);
  assert.equal(
    borradorTieneContenido({ ...FORMULARIO_EN_BLANCO, observaciones: 'Falta el gato' }),
    true,
  );
  // La foto cuenta como dato: si registrara solo con la primera respuesta, una
  // foto tomada antes quedaría colgando de una fila que no existe.
  assert.equal(borradorTieneContenido({ ...FORMULARIO_EN_BLANCO, fotos: 1 }), true);
});

prueba('unos espacios en las observaciones no son trabajo que guardar', () => {
  // Spec 013 / RF-14, con el mismo criterio que el parte de obra usa para sus
  // notas (006/RF-9): lo que se ve en blanco está en blanco.
  assert.equal(borradorTieneContenido({ ...FORMULARIO_EN_BLANCO, observaciones: '   ' }), false);
  assert.equal(borradorTieneContenido({ ...FORMULARIO_EN_BLANCO, observaciones: '\n ' }), false);
});

prueba('un cero en el medidor sí es una lectura, y se guarda', () => {
  // Spec 013 / RF-14. Un horómetro en 0 es una máquina nueva, no un campo
  // vacío: la diferencia la marca `null`, no la falsedad del número.
  assert.equal(borradorTieneContenido({ ...FORMULARIO_EN_BLANCO, horometroH: 0 }), true);
  assert.equal(borradorTieneContenido({ ...FORMULARIO_EN_BLANCO, odometroKm: 0 }), true);
});

prueba('una máquina amarilla con el cinturón malo queda NO APTO', () => {
  // Spec 011 / RF-17. Antes de esta spec este mismo caso daba «apto con
  // observaciones»: ninguna de las tres amarillas tenía un solo ítem que
  // inmovilizara, así que el preoperacional no podía parar nada.
  const MOTONIVELADORA = FORMATOS_VIGENTES.motoniveladora;
  const p = periodicidadesAplicables(Date.now(), MOTONIVELADORA);
  const evaluacion = evaluarPreoperacional(
    MOTONIVELADORA,
    p,
    responderTodo(MOTONIVELADORA, p, { 'cabina__cinturon_de_seguridad': 'no_conforme' }),
  );

  assert.equal(evaluacion.resultado, 'no_apto');
  assert.equal(evaluacion.inmovilizantes.length, 1);
  assert.equal(evaluacion.inmovilizantes[0].itemKey, 'cabina__cinturon_de_seguridad');
});

prueba('ningún ítem retirado por la spec 011 sigue en su formato', () => {
  // Spec 011 / RF-6. El de T1 comprueba que existían; este, que ya no están.
  for (const [tipo, retiradas] of Object.entries(ITEMS_RETIRADOS)) {
    const vigentes = clavesDe(FORMATOS_VIGENTES[tipo]);
    for (const clave of retiradas) {
      assert.ok(!vigentes.has(clave), `${tipo}: sigue ${clave}`);
    }
  }
  // La sección entera que desaparece: RODAJE repetía lo que ya pregunta RUEDAS.
  assert.ok(!CAMIONETA.secciones.some((s) => s.key === 'rodaje'));
  // FRENOS y DIRRECCIÓN se quedan sin ninguno de sus ítems de taller, pero la
  // sección sobrevive con el ítem resumido que el operador sí puede responder.
  const frenos = VOLQUETA.secciones.find((s) => s.key === 'frenos');
  const direccion = VOLQUETA.secciones.find((s) => s.key === 'dirreccion');
  assert.equal(frenos?.items.length, 1);
  assert.equal(direccion?.items.length, 1);
});

prueba('los ítems resumidos de la spec 011 están donde deben', () => {
  // Spec 011 / RF-9 a RF-11: donde se fue un sistema entero entra un ítem que el
  // operador sí puede responder antes de arrancar.
  for (const [tipo, nuevos] of Object.entries(ITEMS_NUEVOS)) {
    const vigente = FORMATOS_VIGENTES[tipo];
    for (const esperado of nuevos) {
      const seccion = vigente.secciones.find((s) => s.key === esperado.seccion);
      assert.ok(seccion, `${tipo}: falta la sección ${esperado.seccion}`);
      const item = seccion.items.find((i) => i.key === esperado.clave);
      assert.ok(item, `${tipo}: falta ${esperado.clave}`);
      assert.equal(item.label, esperado.label);
      assert.equal(item.tipo, 'conformidad');
      assert.equal(item.periodicidad, 'diaria');
      // Se responde marcando, y una falla se documenta con foto como las demás.
      assert.equal(item.exigirFoto, 'no_conforme');
      assert.ok((item.ayuda ?? '').length > 0, `${tipo}: ${esperado.clave} sin instructivo`);
    }
  }

  // Los tres de la volqueta y el de la camioneta, cada uno en su sección.
  assert.equal(VOLQUETA.secciones.find((s) => s.key === 'frenos')?.items[0].label,
    'Los frenos responden bien');
  assert.equal(CAMIONETA.secciones.find((s) => s.key === 'chasis')?.items.at(-1)?.key,
    'chasis__direccion_sin_juego_ni_ruidos');
});

prueba('los formatos de la spec 011 suben de versión', () => {
  // Spec 011 / RF-24: quitar un ítem cambia la huella, así que cambia la versión.
  // Las anteriores se quedan en la carpeta y en la base: hay actas firmadas.
  const esperada: Record<string, number> = {
    volqueta: 3,
    camioneta: 3,
    motoniveladora: 2,
    retrocargador: 2,
    retroexcavadora: 2,
  };
  for (const [tipo, version] of Object.entries(esperada)) {
    assert.equal(FORMATOS_VIGENTES[tipo].version, version, tipo);
    assert.equal(FORMATOS_ANTERIORES[tipo].version, version - 1, `${tipo} anterior`);
  }
});

prueba('la poda no cambia la periodicidad de lo que se queda', () => {
  // Spec 011 / RF-7 y RF-8. La camioneta pierde su ciclo mensual entero porque
  // sus seis ítems mensuales eran todos de taller; el resto no se mueve.
  for (const [tipo, vigente] of Object.entries(FORMATOS_VIGENTES)) {
    const antes = new Map(
      FORMATOS_ANTERIORES[tipo].secciones
        .flatMap((s) => s.items)
        .map((i) => [i.key, i.periodicidad]),
    );
    const nuevos = new Set((ITEMS_NUEVOS[tipo] ?? []).map((n) => n.clave));
    for (const item of vigente.secciones.flatMap((s) => s.items)) {
      // Los del anexo B no estaban antes; su periodicidad la comprueba su caso.
      if (nuevos.has(item.key)) continue;
      assert.equal(item.periodicidad, antes.get(item.key), `${tipo}: ${item.key}`);
    }
    // Lo que se anuncia es lo que de verdad hay.
    const presentes = new Set(vigente.secciones.flatMap((s) => s.items).map((i) => i.periodicidad));
    assert.deepEqual(vigente.periodicidades, [...presentes]);
  }
  assert.ok(!CAMIONETA.periodicidades.includes('mensual'));
  assert.ok(VOLQUETA.periodicidades.includes('diaria'));
});

prueba('sin hallazgos, el vehículo queda apto', () => {
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const evaluacion = evaluarPreoperacional(VOLQUETA, p, responderTodo(VOLQUETA, p));
  assert.equal(evaluacion.resultado, 'apto');
  assert.equal(evaluacion.completo, true);
  assert.equal(evaluacion.inmovilizantes.length, 0);
});

prueba('un hallazgo en un ítem AI deja el vehículo NO APTO', () => {
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const items = VOLQUETA.secciones.flatMap((s) => s.items);
  const critico = items.find((i) => i.inmoviliza);
  assert.ok(critico, 'la volqueta debe tener al menos un ítem que inmovilice');

  const evaluacion = evaluarPreoperacional(
    VOLQUETA,
    p,
    responderTodo(VOLQUETA, p, { [critico.key]: 'no_conforme' }),
  );
  assert.equal(evaluacion.resultado, 'no_apto');
  assert.equal(evaluacion.inmovilizantes.length, 1);
  assert.equal(evaluacion.inmovilizantes[0].label, critico.label);
});

prueba('un hallazgo que no inmoviliza deja el vehículo apto con observaciones', () => {
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const items = VOLQUETA.secciones.flatMap((s) => s.items);
  const normal = items.find((i) => !i.inmoviliza && i.tipo === 'conformidad');
  assert.ok(normal);

  const evaluacion = evaluarPreoperacional(
    VOLQUETA,
    p,
    responderTodo(VOLQUETA, p, { [normal.key]: 'no_conforme' }),
  );
  assert.equal(evaluacion.resultado, 'apto_con_observaciones');
  assert.equal(evaluacion.observaciones.length, 1);
});

prueba('un formato incompleto no se puede dar por terminado', () => {
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const items = VOLQUETA.secciones.flatMap((s) => s.items);
  const evaluacion = evaluarPreoperacional(
    VOLQUETA,
    p,
    responderTodo(VOLQUETA, p, {}, [items[5].key, items[20].key]),
  );
  assert.equal(evaluacion.completo, false);
  assert.equal(evaluacion.faltantes.length, 2);
});

/**
 * Estas tres reproducen lo que arma la pantalla, no lo que arma `responderTodo`.
 * La pantalla solo responde los ítems de conformidad —los medidores se capturan
 * con otro teclado—, y por eso el fallo pasó desapercibido: el ayudante de
 * pruebas respondía también los de tipo `numero`, que es justo lo que la app no
 * hacía. Con la volqueta el operador llenaba sus 85 ítems y el formato seguía
 * diciendo que le faltaban dos.
 */
function responderSoloLaLista(
  plantilla: PlantillaChecklist,
  periodicidades: ReturnType<typeof periodicidadesAplicables>,
): RespuestaItem[] {
  return responderTodo(plantilla, periodicidades).filter((r) => r.tipo === 'conformidad');
}

prueba('las lecturas de los medidores completan el formato', () => {
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const deLaLista = responderSoloLaLista(VOLQUETA, p);

  const sinMedidores = evaluarPreoperacional(VOLQUETA, p, deLaLista);
  assert.equal(sinMedidores.completo, false);
  // Desde la spec 003 la volqueta solo lleva kilometraje: el horómetro salió de
  // su formato porque no se controla por horas de motor.
  assert.deepEqual(sinMedidores.faltantes.map((i) => i.label).sort(), ['Odómetro']);

  const conMedidores = evaluarPreoperacional(VOLQUETA, p, [
    ...deLaLista,
    ...respuestasDeMedidores(VOLQUETA, p, { horometro: null, odometro: 88_310 }, Date.now()),
  ]);
  assert.equal(conMedidores.completo, true);
  assert.equal(conMedidores.resultado, 'apto');
});

prueba('cada lectura va al ítem de su unidad', () => {
  // El vínculo lectura-ítem es la unidad, no la clave. La volqueta solo tiene
  // ítem en kilómetros, así que la lectura de horas sobrante se descarta en vez
  // de colarse en el ítem equivocado.
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const medidores = respuestasDeMedidores(
    VOLQUETA,
    p,
    { horometro: 1204.5, odometro: 88_310 },
    Date.now(),
  );

  assert.equal(medidores.length, 1);
  assert.equal(medidores[0].itemKey, 'tablero_de_control__odometro');
  assert.equal(medidores[0].valor, 88_310);
  // Se auto-describen igual que el resto: la sección tiene que venir de verdad.
  assert.equal(medidores.every((r) => r.seccionKey !== ''), true);
});

prueba('camioneta y volqueta ya no piden horómetro', () => {
  // Spec 003 / RF-4. Si alguien vuelve a importar los formatos sin aplicar los
  // ajustes, esto es lo que lo va a decir.
  for (const plantilla of [CAMIONETA, VOLQUETA]) {
    assert.equal(plantilla.version, 3, plantilla.tipoVehiculo);
    assert.equal(plantilla.medidores.horometro, 'oculto', plantilla.tipoVehiculo);
    assert.equal(plantilla.medidores.odometro, 'requerido', plantilla.tipoVehiculo);
    const enHoras = plantilla.secciones
      .flatMap((s) => s.items)
      .filter((i) => i.tipo === 'numero' && i.unidad === 'h');
    assert.equal(enHoras.length, 0, plantilla.tipoVehiculo);
  }
});

prueba('las claves que la spec 011 retira existen en el formato anterior', () => {
  // Spec 011 / RF-6. Se comprueba contra el formato ANTERIOR a propósito: si una
  // clave estuviera mal escrita, la poda no retiraría nada y el ítem le seguiría
  // saliendo al operador sin que ningún caso se pusiera rojo.
  const cuantas: Record<string, number> = {
    volqueta: 34,
    camioneta: 20,
    motoniveladora: 11,
    retrocargador: 8,
    retroexcavadora: 9,
  };

  for (const [tipo, esperadas] of Object.entries(cuantas)) {
    const retiradas = ITEMS_RETIRADOS[tipo];
    assert.ok(retiradas, `${tipo}: sin tabla de retirados`);
    assert.equal(retiradas.length, esperadas, tipo);
    // Una clave repetida contaría dos veces y taparía una que falta.
    assert.equal(new Set(retiradas).size, esperadas, `${tipo}: clave repetida`);

    const existentes = clavesDe(FORMATOS_ANTERIORES[tipo]);
    for (const clave of retiradas) {
      assert.ok(existentes.has(clave), `${tipo}: no existe ${clave}`);
    }
  }
});

prueba('los ítems nuevos de la spec 011 no chocan con ninguno existente', () => {
  // Spec 011 / RF-25: una clave no se reutiliza jamás. Hay actas firmadas
  // apuntando a las viejas.
  for (const [tipo, nuevos] of Object.entries(ITEMS_NUEVOS)) {
    const anterior = clavesDe(FORMATOS_ANTERIORES[tipo]);
    const secciones = new Set(FORMATOS_ANTERIORES[tipo].secciones.map((s) => s.key));
    for (const item of nuevos) {
      assert.ok(!anterior.has(item.clave), `${tipo}: ${item.clave} ya existe`);
      // Va a una sección que existe: si no, el ítem nuevo se perdería en silencio.
      assert.ok(secciones.has(item.seccion), `${tipo}: sección ${item.seccion} no existe`);
      assert.ok(item.label.trim().length > 0, `${tipo}: ${item.clave} sin texto`);
      // Ninguna de las nuevas puede ser una que estemos retirando.
      assert.ok(!ITEMS_RETIRADOS[tipo].includes(item.clave), `${tipo}: ${item.clave} retirada`);
    }
  }

  assert.equal(ITEMS_NUEVOS.volqueta.length, 3);
  assert.equal(ITEMS_NUEVOS.camioneta.length, 1);
});

prueba('un formato sin odómetro no pide uno', () => {
  const p = periodicidadesAplicables(Date.now(), RETROEXCAVADORA);
  const medidores = respuestasDeMedidores(
    RETROEXCAVADORA,
    p,
    { horometro: 3410, odometro: null },
    Date.now(),
  );

  assert.equal(medidores.length, 1);
  assert.equal(medidores[0].valor, 3410);

  const evaluacion = evaluarPreoperacional(RETROEXCAVADORA, p, [
    ...responderSoloLaLista(RETROEXCAVADORA, p),
    ...medidores,
  ]);
  assert.equal(evaluacion.completo, true);
});

prueba('el servidor acepta tal cual lo que arma el móvil', () => {
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const items = VOLQUETA.secciones.flatMap((s) => s.items);

  const envio = [
    // Un hallazgo con su comentario y su foto: lo que más caro sale perder.
    {
      ...responderSoloLaLista(VOLQUETA, p)[0],
      valor: 'no_conforme' as const,
      comentario: 'Fuga por el retén del cilindro derecho.',
      mediaIds: ['01a06446-7fc7-7c5e-9f4f-29f9c5fa0016'],
      marcadoEnBloque: false,
    },
    ...responderSoloLaLista(VOLQUETA, p).slice(1),
    ...respuestasDeMedidores(VOLQUETA, p, { horometro: 1204, odometro: 88_310 }, Date.now()),
  ];

  for (const respuesta of envio) {
    // `parse` y no `safeParse`: si esto lanza, el móvil está mandando algo que
    // el servidor contesta con un 400, y un 400 es definitivo — el
    // preoperacional se marca rechazado y no vuelve a intentarse jamás.
    respuestaEnviada.parse(JSON.parse(JSON.stringify(respuesta)));
  }

  assert.equal(envio.length, items.length);
});

prueba('la ingesta no se traga el comentario ni las fotos de un hallazgo', () => {
  const validada = respuestaEnviada.parse({
    itemKey: 'frenos__freno_de_servicio',
    seccionKey: 'frenos',
    label: 'Freno de servicio',
    sistema: 'FRENOS - AI',
    tipo: 'conformidad',
    inmoviliza: true,
    valor: 'no_conforme',
    comentario: 'Pedal se va al fondo.',
    mediaIds: ['una-foto'],
    respondidoEn: Date.now(),
  });

  // Zod descarta callado lo que no declara: el día que el nombre de un campo se
  // desalinee, esto falla aquí y no en la obra, seis meses después.
  assert.equal(validada.comentario, 'Pedal se va al fondo.');
  assert.deepEqual(validada.mediaIds, ['una-foto']);
});

prueba('"marcar todo bien" nunca alcanza a los ítems que inmovilizan', () => {
  for (const seccion of VOLQUETA.secciones) {
    const marcables = itemsMarcablesEnBloque(seccion.items);
    assert.equal(
      marcables.some((i) => i.inmoviliza),
      false,
      `la sección ${seccion.titulo} dejó pasar un ítem que inmoviliza`,
    );
  }
});

prueba('la camioneta suma los ítems quincenales cuando toca', () => {
  // Desde la poda de la spec 011 (RF-8) la camioneta ya no tiene ciclo mensual:
  // sus seis ítems mensuales eran todos de taller y se retiraron.
  const hoy = Date.now();

  const soloDiaria = periodicidadesAplicables(hoy, CAMIONETA, {
    quincenal: hoy - 2 * MS_DIA,
    mensual: hoy - 2 * MS_DIA,
  });
  assert.deepEqual(soloDiaria, ['diaria']);
  assert.equal(itemsAplicables(CAMIONETA, soloDiaria).length, 31);

  const conQuincenal = periodicidadesAplicables(hoy, CAMIONETA, {
    quincenal: hoy - 16 * MS_DIA,
    mensual: hoy - 2 * MS_DIA,
  });
  assert.deepEqual(conQuincenal, ['diaria', 'quincenal']);
  assert.equal(itemsAplicables(CAMIONETA, conQuincenal).length, 31 + 8);

  // Un equipo que nunca ha tenido revisión periódica las debe todas, y «todas»
  // ya no incluye la mensual: por mucho tiempo que pase no aparece.
  const primeraVez = periodicidadesAplicables(hoy, CAMIONETA);
  assert.deepEqual(primeraVez, ['diaria', 'quincenal']);
  assert.equal(itemsAplicables(CAMIONETA, primeraVez).length, 39);
});

prueba('un formato sin revisión periódica no inventa una', () => {
  // La retroexcavadora solo trae hoja diaria; nunca debe pedir ítems de otra
  // periodicidad por más tiempo que lleve sin revisarse.
  const hace90Dias = Date.now() - 90 * MS_DIA;
  const p = periodicidadesAplicables(Date.now(), RETROEXCAVADORA, {
    quincenal: hace90Dias,
    mensual: hace90Dias,
  });
  assert.deepEqual(p, ['diaria']);
  assert.equal(itemsAplicables(RETROEXCAVADORA, p).length, 43);
});

prueba('un medidor no puede retroceder', () => {
  const v = validarMedidor('horometro', 1180, 1240);
  assert.equal(v.estado, 'retrocede');
  assert.match(v.mensaje, /1.240/);
});

prueba('un salto anormal pide confirmación en vez de rechazar', () => {
  const v = validarMedidor('horometro', 12_400, 1_240);
  assert.equal(v.estado, 'salto_sospechoso');
  assert.match(v.mensaje, /¿Está seguro\?/);
});

prueba('una jornada normal pasa sin molestar al operador', () => {
  assert.equal(validarMedidor('horometro', 1248, 1240).estado, 'ok');
  assert.equal(validarMedidor('odometro', 210_700, 210_450).estado, 'ok');
  assert.equal(validarMedidor('horometro', 500, null).estado, 'ok');
});

/* ------------------------------------------------------------------------ */
/* Bloqueo por PIN fallido                                                   */
/* ------------------------------------------------------------------------ */

prueba('los dos primeros errores de PIN no cuestan espera', () => {
  assert.equal(esperaPorFallos(0), 0);
  assert.equal(esperaPorFallos(1), 0);
  assert.equal(esperaPorFallos(2), 0);
});

prueba('la escalera de bloqueo sube en 3, 5 y 7 fallos', () => {
  assert.equal(esperaPorFallos(3), 30_000);
  assert.equal(esperaPorFallos(4), 30_000);
  assert.equal(esperaPorFallos(5), 5 * 60_000);
  assert.equal(esperaPorFallos(6), 5 * 60_000);
  assert.equal(esperaPorFallos(7), 30 * 60_000);
  assert.equal(esperaPorFallos(9), 30 * 60_000);
});

prueba('el equipo solo se desactiva al décimo fallo', () => {
  assert.equal(debeOlvidarEquipo(9), false);
  assert.equal(debeOlvidarEquipo(10), true);
  assert.equal(intentosRestantes(3), 7);
  assert.equal(intentosRestantes(10), 0);
});

prueba('la espera se le explica al operador sin decimales', () => {
  assert.equal(mensajeDeEspera(30_000), 'Espere 30 segundos e intente de nuevo.');
  assert.equal(mensajeDeEspera(5 * 60_000), 'Espere 5 minutos e intente de nuevo.');
  assert.equal(mensajeDeEspera(61_000), 'Espere 2 minutos e intente de nuevo.');
});

/* ------------------------------------------------------------------------ */
/* Bitácora diaria                                                           */
/* ------------------------------------------------------------------------ */

/** Un instante de hoy en hora local, para no depender del día en que se corra. */
function hoyALas(hora: number, minuto = 0): number {
  const fecha = new Date();
  fecha.setHours(hora, minuto, 0, 0);
  return fecha.getTime();
}

prueba('la hora y la fecha se escriben en hora local, no en UTC', () => {
  assert.equal(horaLocal(hoyALas(7, 5)), '07:05');
  assert.equal(horaLocal(hoyALas(16, 30)), '16:30');
  assert.match(fechaLocalISO(hoyALas(23, 30)), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(fechaLocalISO(hoyALas(23, 30)), fechaLocalISO(hoyALas(0, 30)));
});

prueba('las horas de máquina salen de la diferencia de horómetros', () => {
  assert.equal(horasDeMaquina(9840, 9848), 8);
  assert.equal(horasDeMaquina(9840, 9840), 0);
});

prueba('sin las dos lecturas no hay horas de máquina', () => {
  assert.equal(horasDeMaquina(9840, null), null);
  assert.equal(horasDeMaquina(null, 9848), null);
  assert.equal(horasDeMaquina(null, null), null);
});

prueba('un horómetro final menor que el inicial se rechaza', () => {
  assert.equal(validarHorometros(9840, 9835), 'final_menor');
  // Y no se cuela como jornada negativa.
  assert.equal(horasDeMaquina(9840, 9835), null);
});

prueba('un salto imposible en un solo día se rechaza', () => {
  // 9840 → 98450 metería 88.610 horas de golpe y dispararía todos los
  // mantenimientos preventivos del vehículo.
  assert.equal(validarHorometros(9840, 98_450), 'salto_enorme');
  assert.equal(validarHorometros(9840, 9864), null);
});

prueba('faltar una lectura se distingue de tenerla mal', () => {
  assert.equal(validarHorometros(null, 9848), 'falta_inicial');
  assert.equal(validarHorometros(9840, null), 'falta_final');
});

prueba('una bitácora sin operador o sin actividad no está completa', () => {
  const buena = {
    operadorId: 'demo-usuario-01',
    horometroInicial: 9840,
    horometroFinal: 9848,
    actividades: [{ clave: 'excavacion', nombre: 'Excavación' }],
  };
  assert.equal(esBitacoraCompleta(buena), true);
  assert.equal(esBitacoraCompleta({ ...buena, operadorId: null }), false);
  assert.equal(esBitacoraCompleta({ ...buena, actividades: [] }), false);
  assert.equal(esBitacoraCompleta({ ...buena, horometroFinal: null }), false);
  assert.equal(esBitacoraCompleta({ ...buena, horometroFinal: 9835 }), false);
});

prueba('la jornada en obra no cambia de día por la zona del navegador', () => {
  // El residente puede mirar el panel desde cualquier parte; el día de trabajo
  // siempre es el de la obra. A las 02:00 UTC del 4 de marzo, en Colombia
  // todavía son las 21:00 del 3: la jornada es la del 3.
  assert.equal(fechaDeJornada(Date.parse('2026-03-04T02:00:00Z')), '2026-03-03');
  // Y a las 06:00 UTC ya son las 01:00 del 4 en obra.
  assert.equal(fechaDeJornada(Date.parse('2026-03-04T06:00:00Z')), '2026-03-04');
  // La frontera exacta: 05:00 UTC es medianoche en Colombia.
  assert.equal(fechaDeJornada(Date.parse('2026-03-04T05:00:00Z')), '2026-03-04');
  assert.equal(fechaDeJornada(Date.parse('2026-03-04T04:59:59Z')), '2026-03-03');
});

prueba('sumar y restar días no se tropieza con los meses ni con los bisiestos', () => {
  // Spec 006 / T2. La misma aritmética estaba copiada en cuatro sitios —festivos,
  // dos pantallas del panel y el resumen—, así que es la primera vez que se
  // comprueba. Se calcula por mediodía UTC justamente para que ninguno de estos
  // saltos cruce de día por un huso horario.
  assert.equal(sumarDias('2026-01-31', 1), '2026-02-01');
  assert.equal(restarDias('2026-03-01', 1), '2026-02-28');

  // Cambio de año.
  assert.equal(sumarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(restarDias('2027-01-01', 1), '2026-12-31');

  // 2028 es bisiesto y tiene 29 de febrero; 2026 no.
  assert.equal(sumarDias('2028-02-28', 1), '2028-02-29');
  assert.equal(sumarDias('2028-02-29', 1), '2028-03-01');
  assert.equal(restarDias('2028-03-01', 1), '2028-02-29');
  assert.equal(sumarDias('2026-02-28', 1), '2026-03-01');

  // Sumar cero no mueve nada, y restar es sumar con el signo cambiado.
  assert.equal(sumarDias('2026-09-11', 0), '2026-09-11');
  assert.equal(restarDias('2026-09-11', 6), sumarDias('2026-09-11', -6));
});

prueba('los periodos del panel abarcan los días que dicen', () => {
  // Spec 006 / RF-19. «hoy» es un solo día, así que el desde es el mismo día.
  assert.equal(restarDias('2026-09-11', PERIODOS.hoy), '2026-09-11');
  // La última semana son siete días contando hoy, no ocho.
  assert.equal(restarDias('2026-09-11', PERIODOS.semana), '2026-09-05');
  // El último mes, treinta.
  assert.equal(restarDias('2026-09-11', PERIODOS.mes), '2026-08-13');
});

prueba('el acta que llegó tarde queda fuera por su inicio y dentro por su llegada', () => {
  // Spec 006 / RF-20, con las fechas reales del caso que originó la spec: el
  // preoperacional de VOL-01 se inició el 3 de septiembre y el servidor lo
  // recibió el 7, porque el celular tardó cuatro días en agarrar señal.
  //
  // Mirando hoy —11 de septiembre— la última semana empieza el día 5. Filtrar
  // solo por la fecha de inicio deja el acta fuera y la vuelve invisible en el
  // panel, que es exactamente el fallo. Por eso la ventana mira las dos fechas.
  const desde = restarDias('2026-09-11', PERIODOS.semana);
  assert.ok('2026-09-03' < desde, 'el inicio del acta cae fuera de la última semana');
  assert.ok('2026-09-07' >= desde, 'pero su llegada sí cae dentro');
});

/* ------------------------------------------------------------------------ */
/* El índice del parte diario (spec 006)                                     */
/* ------------------------------------------------------------------------ */

/** Un parte recién abierto: todo vacío y nada cerrado. */
const PARTE_VACIO: ConteosDelParte = {
  maquinaria: 0,
  personal: 0,
  actividades: 0,
  clima: 0,
  laboratorio: 0,
  notas: '',
  fotos: 0,
  historicoCerradas: 0,
  cerrado: false,
  anulado: false,
};

/** El estado de una sección por su id, para no depender del orden al afirmar. */
function estadoDe(conteos: ConteosDelParte, id: string) {
  return seccionesDelParte(conteos).find((s) => s.id === id);
}

prueba('un parte recién abierto tiene todas sus secciones sin registrar', () => {
  const secciones = seccionesDelParte(PARTE_VACIO);
  // Ocho: las siete del parte más el cierre. El histórico no está porque no hay
  // ninguna bitácora vieja cerrada ese día.
  assert.equal(secciones.length, 8);
  assert.ok(secciones.every((s) => s.estado === 'vacio'));
  // El orden es dato de la regla y no del JSX: si se desalinean, el índice
  // llevaría a la sección equivocada.
  assert.deepEqual(
    secciones.map((s) => s.id),
    [
      'maquinaria',
      'personal',
      'actividades',
      'clima',
      'laboratorio',
      'notas',
      'fotografia',
      'cierre',
    ],
  );
});

prueba('solo se encienden las secciones que tienen algo guardado', () => {
  const conteos = { ...PARTE_VACIO, maquinaria: 1, personal: 2 };
  assert.equal(estadoDe(conteos, 'maquinaria')?.estado, 'lleno');
  assert.equal(estadoDe(conteos, 'maquinaria')?.cuantos, 1);
  assert.equal(estadoDe(conteos, 'personal')?.estado, 'lleno');
  assert.equal(estadoDe(conteos, 'personal')?.cuantos, 2);
  // Las demás siguen apagadas.
  assert.equal(estadoDe(conteos, 'actividades')?.estado, 'vacio');
  assert.equal(estadoDe(conteos, 'clima')?.estado, 'vacio');
});

prueba('unas notas en blanco no cuentan como notas', () => {
  // Spec 006 / RF-9. Tres espacios es lo que queda cuando alguien escribió algo
  // y lo borró; el índice no puede darlo por escrito.
  assert.equal(estadoDe({ ...PARTE_VACIO, notas: '   ' }, 'notas')?.estado, 'vacio');
  assert.equal(estadoDe({ ...PARTE_VACIO, notas: '\n' }, 'notas')?.estado, 'vacio');
  assert.equal(estadoDe({ ...PARTE_VACIO, notas: 'Se varó la 02.' }, 'notas')?.estado, 'lleno');
});

prueba('mientras las fotos no hayan cargado, el índice no dice que no hay', () => {
  // Spec 006 / RF-8. El conteo de fotos llega por su cuenta, y `null` significa
  // «todavía no se sabe». Pintarlo como vacío sería mentir durante un segundo, y
  // es el segundo en que alguien decide que le falta subir la foto del día.
  assert.equal(estadoDe({ ...PARTE_VACIO, fotos: null }, 'fotografia')?.estado, 'desconocido');
  assert.equal(estadoDe({ ...PARTE_VACIO, fotos: null }, 'fotografia')?.cuantos, null);
  assert.equal(estadoDe({ ...PARTE_VACIO, fotos: 0 }, 'fotografia')?.estado, 'vacio');
  assert.equal(estadoDe({ ...PARTE_VACIO, fotos: 2 }, 'fotografia')?.estado, 'lleno');
});

prueba('las bitácoras por máquina solo entran si están cerradas', () => {
  // Spec 006 / RF-28. Las seis que hay en la base están abiertas: son restos de
  // cuando se probaba el formato viejo, no trabajo registrado.
  assert.equal(estadoDe(PARTE_VACIO, 'historico'), undefined);
  const conHistorico = { ...PARTE_VACIO, historicoCerradas: 3 };
  assert.equal(estadoDe(conHistorico, 'historico')?.estado, 'lleno');
  assert.equal(estadoDe(conHistorico, 'historico')?.cuantos, 3);
  // Y va al final, después del cierre: es de otro formato.
  assert.equal(seccionesDelParte(conHistorico).at(-1)?.id, 'historico');
});

prueba('el cierre se da por resuelto tanto si se cerró como si se anuló', () => {
  assert.equal(estadoDe(PARTE_VACIO, 'cierre')?.estado, 'vacio');
  assert.equal(estadoDe({ ...PARTE_VACIO, cerrado: true }, 'cierre')?.estado, 'lleno');
  // Un parte anulado ya no se llena: informar de que falta cerrarlo sería pedir
  // algo que no se puede hacer.
  assert.equal(estadoDe({ ...PARTE_VACIO, anulado: true }, 'cierre')?.estado, 'lleno');
});

/** Un parte con las siete secciones llenas y todo en regla. */
const PARTE_COMPLETO: ParteEvaluable = {
  maquinaria: [
    {
      codigo: 'VOL-01',
      claseMedidor: 'odometro',
      medidorInicial: 45210,
      medidorFinal: 45388,
      observaciones: 'Tres viajes a la cantera.',
    },
  ],
  personal: [{ nombre: 'Pedro Cartagena', entrada: '07:30', salida: '17:00' }],
  actividades: [{ id: 'act-1' }, { id: 'act-2' }],
  clima: [{}],
  laboratorio: [{}],
  notas: 'Sin novedad.',
};

/** Foto del día subida y una de las dos actividades con la suya. */
const FOTOS_COMPLETAS: FotosDelParte = { delDia: 1, itemsConFoto: ['act-2'] };

const SIN_FOTOS: FotosDelParte = { delDia: 0, itemsConFoto: [] };

prueba('un parte completo no tiene ningún bloqueo', () => {
  assert.deepEqual(bloqueosDelCierre(PARTE_COMPLETO, FOTOS_COMPLETAS), []);
});

prueba('un parte vacío nombra las siete secciones que faltan', () => {
  // Spec 004 / RF-50. Antes bastaba una máquina, una persona o una actividad;
  // OCC pidió que no se cierre sin haber diligenciado todo el parte.
  const vacio: ParteEvaluable = {
    maquinaria: [],
    personal: [],
    actividades: [],
    clima: [],
    laboratorio: [],
    notas: null,
  };
  assert.deepEqual(bloqueosDelCierre(vacio, SIN_FOTOS), [
    'Falta llenar: Maquinaria, Personal, Actividades, Clima, Control Calidad de Obra, Notas ' +
      'y Fotografía del día.',
  ]);
});

prueba('una sola sección vacía se nombra sola', () => {
  // Unas notas en blanco son notas sin escribir (006/RF-9).
  const bloqueos = bloqueosDelCierre({ ...PARTE_COMPLETO, notas: '   ' }, FOTOS_COMPLETAS);
  assert.deepEqual(bloqueos, ['Falta llenar: Notas.']);
});

prueba('029/RF-15: una máquina sin observaciones ya deja cerrar', () => {
  // La spec 004 (RF-51) las exigía; la 029 las volvió opcionales: «Sin observación»
  // es una respuesta. Vale igual para las vacías y para las que nunca existieron.
  const [maquina] = PARTE_COMPLETO.maquinaria;
  const sinObservaciones = { ...PARTE_COMPLETO, maquinaria: [{ ...maquina, observaciones: ' ' }] };
  assert.deepEqual(bloqueosDelCierre(sinObservaciones, FOTOS_COMPLETAS), []);
  const { observaciones: _, ...anterior } = maquina;
  assert.deepEqual(bloqueosDelCierre({ ...PARTE_COMPLETO, maquinaria: [anterior] }, FOTOS_COMPLETAS), []);
});

prueba('una máquina sin lectura final no deja cerrar, y se nombra', () => {
  const [maquina] = PARTE_COMPLETO.maquinaria;
  const bloqueos = bloqueosDelCierre(
    { ...PARTE_COMPLETO, maquinaria: [{ ...maquina, medidorFinal: null }] },
    FOTOS_COMPLETAS,
  );
  assert.deepEqual(bloqueos, ['VOL-01: Falta la lectura final (km).']);
});

prueba('una persona sin hora de salida no deja cerrar, y se nombra', () => {
  const bloqueos = bloqueosDelCierre(
    {
      ...PARTE_COMPLETO,
      personal: [{ nombre: 'Pedro Cartagena', entrada: '07:30', salida: null }],
    },
    FOTOS_COMPLETAS,
  );
  assert.deepEqual(bloqueos, ['A Pedro Cartagena le falta la hora de entrada o de salida.']);
});

prueba('basta con que una actividad tenga foto', () => {
  // Spec 004 / RF-52, corregido el 2026-09-15: una, no todas.
  assert.deepEqual(
    bloqueosDelCierre(PARTE_COMPLETO, { delDia: 1, itemsConFoto: [] }),
    ['Falta la fotografía de al menos una actividad.'],
  );
  assert.deepEqual(
    bloqueosDelCierre(PARTE_COMPLETO, { delDia: 1, itemsConFoto: ['act-1'] }),
    [],
  );
});

prueba('la foto de una actividad que no se guardó no cuenta', () => {
  // Spec 004 / RF-48. La foto se sube mientras se llena la actividad; si esa
  // actividad se quita sin guardar, su foto queda en el almacén pero no es de
  // ninguna actividad del parte.
  assert.deepEqual(
    bloqueosDelCierre(PARTE_COMPLETO, { delDia: 1, itemsConFoto: ['act-descartada'] }),
    ['Falta la fotografía de al menos una actividad.'],
  );
});

prueba('los bloqueos salen agrupados: secciones, máquinas, personas y fotos', () => {
  const bloqueos = bloqueosDelCierre(
    {
      ...PARTE_COMPLETO,
      maquinaria: [
        {
          codigo: 'RET-02',
          claseMedidor: 'horometro',
          medidorInicial: null,
          medidorFinal: null,
          observaciones: '',
        },
      ],
      personal: [{ nombre: 'Ana Ruiz', entrada: null, salida: '17:00' }],
      clima: [],
    },
    { delDia: 1, itemsConFoto: [] },
  );
  assert.deepEqual(bloqueos, [
    'Falta llenar: Clima.',
    'RET-02: Falta la lectura inicial (h).',
    'A Ana Ruiz le falta la hora de entrada o de salida.',
    'Falta la fotografía de al menos una actividad.',
  ]);
});

/** Un domingo sin trabajo, con lo único que se le exige. */
const DIA_SIN_TRABAJO: ParteEvaluable = {
  maquinaria: [],
  personal: [],
  actividades: [],
  clima: [{}],
  laboratorio: [],
  notas: 'Domingo, obra cerrada.',
  sinTrabajo: true,
  motivoSinTrabajo: 'Domingo.',
};

prueba('un día sin trabajo se cierra con clima, notas y foto del día', () => {
  // Spec 004 / RF-54.
  assert.deepEqual(bloqueosDelCierre(DIA_SIN_TRABAJO, { delDia: 1, itemsConFoto: [] }), []);
  assert.deepEqual(bloqueosDelCierre(DIA_SIN_TRABAJO, SIN_FOTOS), [
    'Falta llenar: Fotografía del día.',
  ]);
  assert.deepEqual(
    bloqueosDelCierre({ ...DIA_SIN_TRABAJO, clima: [], notas: '' }, { delDia: 1, itemsConFoto: [] }),
    ['Falta llenar: Clima y Notas.'],
  );
});

prueba('un día sin trabajo exige el motivo', () => {
  // Spec 004 / RF-53.
  const sinMotivo = { ...DIA_SIN_TRABAJO, motivoSinTrabajo: '  ' };
  assert.equal(validarDiaSinTrabajo(sinMotivo), 'sin_motivo');
  assert.equal(validarDiaSinTrabajo({ ...DIA_SIN_TRABAJO, motivoSinTrabajo: null }), 'sin_motivo');
  assert.deepEqual(bloqueosDelCierre(sinMotivo, { delDia: 1, itemsConFoto: [] }), [
    mensajeDeDiaSinTrabajo('sin_motivo'),
  ]);
});

prueba('un día con trabajo registrado no se marca como día sin trabajo', () => {
  // Spec 004 / RF-55. Trabajar la mañana y llover la tarde no es día sin
  // trabajo: se cierra completo y la lluvia va en el clima.
  const conMaquina = { ...DIA_SIN_TRABAJO, maquinaria: PARTE_COMPLETO.maquinaria };
  assert.equal(validarDiaSinTrabajo(conMaquina), 'con_trabajo');
  assert.equal(
    validarDiaSinTrabajo({ ...DIA_SIN_TRABAJO, personal: PARTE_COMPLETO.personal }),
    'con_trabajo',
  );
  assert.equal(
    validarDiaSinTrabajo({ ...DIA_SIN_TRABAJO, actividades: PARTE_COMPLETO.actividades }),
    'con_trabajo',
  );
  assert.deepEqual(bloqueosDelCierre(conMaquina, { delDia: 1, itemsConFoto: [] })[0],
    mensajeDeDiaSinTrabajo('con_trabajo'));
  // Sin la marca, no hay nada que validar.
  assert.equal(validarDiaSinTrabajo(PARTE_COMPLETO), null);
  assert.equal(validarDiaSinTrabajo(DIA_SIN_TRABAJO), null);
});

prueba('en un día sin trabajo, el índice dice qué secciones no aplican', () => {
  // Spec 004 / RF-54. Maquinaria, personal, actividades y control de calidad
  // no se exigen; decir «sin registrar» invitaría a llenarlas.
  const conteos = { ...PARTE_VACIO, sinTrabajo: true };
  for (const id of ['maquinaria', 'personal', 'actividades', 'laboratorio']) {
    assert.equal(estadoDe(conteos, id)?.estado, 'no_aplica', id);
  }
  for (const id of ['clima', 'notas', 'fotografia']) {
    assert.equal(estadoDe(conteos, id)?.estado, 'vacio', id);
  }
});

prueba('la sección de laboratorio se llama Control Calidad de Obra', () => {
  // Spec 004 / RF-49. El id no cambia: es la llave con la que el índice salta.
  assert.equal(estadoDe(PARTE_VACIO, 'laboratorio')?.titulo, 'Control Calidad de Obra');
});

prueba('el rechazo del cierre nombra todo lo que falta, no solo lo primero', () => {
  // Spec 004 / RF-50. La ruta mandaba el primer bloqueo y paraba; el residente
  // descubría lo que faltaba de uno en uno a base de pulsar Cerrar.
  const bloqueos = [
    'Falta llenar: Clima y Notas.',
    'VOL-01: Falta la lectura final (km).',
    'Falta la fotografía de al menos una actividad.',
  ];
  assert.equal(
    mensajeDelRechazoDeCierre(bloqueos),
    'No se puede cerrar la bitácora todavía:\n' +
      '• Falta llenar: Clima y Notas.\n' +
      '• VOL-01: Falta la lectura final (km).\n' +
      '• Falta la fotografía de al menos una actividad.',
  );
  // Todos, sin recortar: con veinte máquinas sin lectura final son veinte renglones.
  const muchos = Array.from({ length: 20 }, (_, i) => `M-${i}: Falta la lectura final (km).`);
  assert.equal(mensajeDelRechazoDeCierre(muchos).split('\n').length, 21);
});

/** Cuándo, quién y dónde de un ensayo completo (cambio 2026-09-22). */
const DATOS_DEL_ENSAYO = {
  horaInicio: '08:00',
  horaFin: '09:30',
  responsable: 'Laboratorio Geotecnia S.A.S.',
  ubicacion: { pr: 5, metros: 50 } as { pr: number; metros: number } | { lugar: string } | null,
};

/* ── Guardar el parte (spec 004, T16) ── */

prueba('guardar una sección no borra las notas del día', () => {
  // Fallo encontrado en T15: `notas` convertía lo ausente en `null`, y guardar
  // la maquinaria vaciaba las notas. Ausente no toca; vacío sí borra.
  const soloMaquinaria = parteEditado.parse({ maquinaria: [] });
  assert.equal(soloMaquinaria.notas, undefined);
  assert.equal(parteEditado.parse({ notas: '' }).notas, null);
  assert.equal(parteEditado.parse({ notas: '   ' }).notas, null);
  assert.equal(parteEditado.parse({ notas: null }).notas, null);
  assert.equal(parteEditado.parse({ notas: ' Llovió. ' }).notas, 'Llovió.');
  // Lo mismo con el motivo del día sin trabajo.
  assert.equal(soloMaquinaria.motivoSinTrabajo, undefined);
  assert.equal(soloMaquinaria.sinTrabajo, undefined);
});

prueba('el contrato del parte pide unidad a «otra» y observación a cada ensayo', () => {
  // Spec 004, RF-67, RF-70, RF-72 y RF-73.
  const camposCon = (resultado: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
    (resultado.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]);
  const actividad = {
    id: 'act-1',
    descripcion: '',
    observaciones: '',
    longitud: null,
    ancho: null,
    alto: null,
    area: null,
    volumen: null,
  };

  // Otra sin unidad: el error va bajo `unidad`, con el texto de la regla.
  assert.deepEqual(
    camposCon(actividadDelParte.safeParse({ ...actividad, clave: 'otra', texto: 'Limpieza' })),
    [['unidad', MENSAJES_DE_ACTIVIDAD.sinUnidad]],
  );
  assert.deepEqual(
    camposCon(actividadDelParte.safeParse({ ...actividad, clave: 'otra', unidad: 'm3' })),
    [['texto', MENSAJES_DE_ACTIVIDAD.sinCual]],
  );
  // Una unidad que no es de las seis.
  const inventada = actividadDelParte.safeParse({ ...actividad, clave: 'otra', texto: 'Limpieza', unidad: 'mts' });
  assert.equal(inventada.success, false);
  assert.deepEqual(camposCon(inventada).map(([campo]) => campo), ['unidad']);
  // Completa, con cantidad; y una del presupuesto sin unidad ni cantidad.
  const otra = actividadDelParte.parse({ ...actividad, clave: 'otra', texto: 'Limpieza', unidad: 'm3', cantidad: 12.5 });
  assert.equal(otra.unidad, 'm3');
  assert.equal(otra.cantidad, 12.5);
  const delPresupuesto = actividadDelParte.parse({ ...actividad, clave: '4.1.8' });
  assert.equal(delPresupuesto.cantidad, null);
  assert.equal(actividadDelParte.safeParse({ ...actividad, clave: '10.1', cantidad: -3 }).success, false);
  // Sin elegir (RF-83): el rechazo lo da la regla, con su texto y bajo `clave`, y es
  // el mismo que responde el servidor a través de la unión con la conservada.
  assert.deepEqual(
    camposCon(actividadDelParte.safeParse({ ...actividad, clave: '' })),
    [['clave', MENSAJES_DE_ACTIVIDAD.sinElegir]],
  );
  const sinElegir = parteEditado.safeParse({ actividades: [{ ...actividad, clave: '  ' }] });
  assert.equal(sinElegir.success, false);
  assert.ok(
    JSON.stringify(sinElegir.error?.issues).includes(MENSAJES_DE_ACTIVIDAD.sinElegir),
    'el guardado del parte dice «Elija la actividad.»',
  );

  // Un ensayo sin observación: bajo `observacion`, con el texto de la regla.
  assert.deepEqual(
    camposCon(ensayoDelParte.safeParse({ ensayo: 'espesor', observacion: '  ' })),
    [['observacion', faltaObservacionDelEnsayo('')]],
  );
  // Sin ensayo ni id no es nada.
  assert.deepEqual(camposCon(ensayoDelParte.safeParse({ observacion: 'x' })).map(([c]) => c), ['ensayo']);
  // Solo el id: una fila heredada que se conserva.
  assert.equal(ensayoDelParte.safeParse({ id: 'mat-1' }).success, true);
  // La forma de los datos nuevos (cambio 2026-09-22): hora HH:MM, PR y metros de
  // las listas de cantera, responsable y lugar con tope. Que falten lo decide el
  // servidor con lo guardado, no el contrato (RF-89).
  const completo = { ensayo: 'espesor', observacion: 'x', ...DATOS_DEL_ENSAYO };
  assert.equal(ensayoDelParte.safeParse(completo).success, true);
  assert.equal(ensayoDelParte.safeParse({ ensayo: 'espesor', observacion: 'x' }).success, true);
  assert.deepEqual(
    camposCon(ensayoDelParte.safeParse({ ...completo, horaInicio: '7.30' })).map(([c]) => c),
    ['horaInicio'],
  );
  // Metros libres de 0 a 999 (spec 025, RF-32): 30 vale, 1000 y 12.5 no.
  assert.equal(ensayoDelParte.safeParse({ ...completo, ubicacion: { pr: 5, metros: 30 } }).success, true);
  assert.equal(ensayoDelParte.safeParse({ ...completo, ubicacion: { pr: 5, metros: 1000 } }).success, false);
  assert.equal(ensayoDelParte.safeParse({ ...completo, ubicacion: { pr: 5, metros: 12.5 } }).success, false);
  // Un tramo (RF-31) y la observación que no hace falta con resultado (RF-38).
  assert.equal(
    ensayoDelParte.safeParse({
      ...completo,
      ubicacion: { desde: { pr: 1, metros: 300 }, hasta: { pr: 1, metros: 170 } },
    }).success,
    true,
  );
  assert.equal(ensayoDelParte.safeParse({ ...completo, observacion: '', resultado: 2.98 }).success, true);
  assert.equal(ensayoDelParte.safeParse({ ...completo, ubicacion: { pr: 26, metros: 0 } }).success, false);
  assert.equal(ensayoDelParte.safeParse({ ...completo, ubicacion: { lugar: 'Planta' } }).success, true);
  assert.equal(
    ensayoDelParte.safeParse({ ...completo, ubicacion: { pr: 5, metros: 0, lugar: 'Planta' } }).success,
    false,
  );
  assert.equal(ensayoDelParte.safeParse({ ...completo, responsable: 'x'.repeat(121) }).success, false);
  assert.equal(ensayoDelParte.safeParse({ ...completo, ubicacion: { lugar: 'x'.repeat(161) } }).success, false);

  // En el parte: el mismo ensayo dos veces y un material heredado por su id.
  const parte = parteEditado.parse({
    laboratorio: [
      { ensayo: 'densidad_en_campo', observacion: 'Lote 1' },
      { ensayo: 'densidad_en_campo', observacion: 'Sin observaciones' },
      { id: 'mat-1' },
    ],
  });
  assert.equal(parte.laboratorio?.length, 3);
  // Sin la unión transitoria (004/T29): el error del ensayo sale bajo su campo en el
  // parte, y un material nuevo con cantidad ya no entra.
  const sinObservacion = parteEditado.safeParse({ laboratorio: [{ ensayo: 'espesor', observacion: '' }] });
  assert.equal(sinObservacion.success, false);
  assert.deepEqual(camposCon(sinObservacion).map(([campo]) => campo), ['laboratorio.0.observacion']);
  assert.equal(parteEditado.safeParse({ laboratorio: [{ material: 'cemento', cantidad: 4 }] }).success, false);

  // Una actividad heredada viaja solo con su id: una «otra» vieja no tiene unidad y
  // no pasaría las exigencias de hoy, pero el servidor la conserva sin mirarla (T28).
  const conHeredada = parteEditado.parse({ actividades: [{ id: 'act-vieja' }, { ...actividad, clave: '4.1.8' }] });
  assert.equal(conHeredada.actividades?.length, 2);
  // Pero un id con más campos no es una heredada: sigue pidiendo lo de siempre, y el
  // error de «otra» sin unidad sigue saliendo bajo su campo.
  const otraIncompleta = parteEditado.safeParse({ actividades: [{ ...actividad, clave: 'otra', texto: 'Limpieza' }] });
  assert.equal(otraIncompleta.success, false);
  assert.ok(
    camposCon(otraIncompleta).some(([campo, mensaje]) => campo === 'actividades.0.unidad' && mensaje === MENSAJES_DE_ACTIVIDAD.sinUnidad),
    JSON.stringify(camposCon(otraIncompleta)),
  );
});

prueba('el servidor recalcula el área aunque llegue otra', () => {
  // Spec 004 / RF-58. Una petición hecha por fuera con área 99 no la guarda.
  const actividad = construirActividadDelParte({
    id: 'act-1',
    clave: 'otra',
    texto: 'Excavación',
    descripcion: '',
    observaciones: '',
    longitud: 3,
    ancho: 4,
    alto: null,
    area: 99,
    volumen: 7,
    unidad: 'm3',
  })!;
  assert.equal(actividad.area, 12);
  // Sin alto, el volumen es el que se escribió (RF-60).
  assert.equal(actividad.volumen, 7);
  // Y el id que trae se conserva: es a lo que apuntan sus fotos (RF-47).
  assert.equal(actividad.id, 'act-1');
});

prueba('una actividad del presupuesto se guarda con lo que dice el catálogo', () => {
  // Spec 004, RF-64, RF-66 a RF-70 y RF-74.
  const base = {
    id: 'act-2',
    texto: null,
    descripcion: 'Box coulvert PR 5',
    observaciones: '',
    longitud: 3,
    ancho: 4,
    alto: 0.5,
    area: null,
    volumen: null,
  };

  // La 4.1.8: nombre = descripción completa, ítem y unidad del catálogo aunque el
  // cliente mande otra unidad y otro texto. Desde 021/RF-99 la cantidad escrita
  // manda sobre el volumen; sin escribir, sale del volumen (RF-100).
  const excavacion = construirActividadDelParte({
    ...base,
    clave: '4.1.8',
    texto: 'Otra cosa',
    unidad: 'kg',
    cantidad: 99,
  })!;
  assert.equal(excavacion.clave, '4.1.8');
  assert.equal(excavacion.item, '4.1.8');
  assert.equal(excavacion.nombre, actividadPorItem('4.1.8')!.descripcion);
  assert.equal(excavacion.unidad, 'm³');
  assert.equal(excavacion.cantidad, 99);
  assert.equal(excavacion.volumen, 6);
  assert.equal(excavacion.descripcion, 'Box coulvert PR 5');
  assert.equal(construirActividadDelParte({ ...base, clave: '4.1.8' })!.cantidad, 6);

  // La 10.1 (kg): con medidas, la cantidad es la escrita.
  const acero = construirActividadDelParte({ ...base, clave: '10.1', cantidad: 500 })!;
  assert.equal(acero.unidad, 'kg');
  assert.equal(acero.cantidad, 500);
  // Sin cantidad escrita, queda en blanco (RF-74).
  assert.equal(construirActividadDelParte({ ...base, clave: '10.1' })!.cantidad, null);

  // Otra actividad: su texto es el nombre, su unidad la elegida, sin ítem.
  const otra = construirActividadDelParte({
    ...base,
    clave: CLAVE_OTRA_ACTIVIDAD,
    texto: '  Limpieza de derrumbe ',
    unidad: 'm3',
    cantidad: null,
  })!;
  assert.equal(otra.nombre, 'Limpieza de derrumbe');
  assert.equal(otra.item, null);
  assert.equal(otra.unidad, 'm³');
  // En m³ con sus tres medidas, la cantidad sale del volumen como en una de la lista.
  assert.equal(otra.cantidad, 6);

  // Una clave que no es del presupuesto ni «otra» no se construye: ni las de la lista
  // de prueba, ni una otra sin unidad válida.
  assert.equal(construirActividadDelParte({ ...base, clave: 'excavacion' }), null);
  assert.equal(
    construirActividadDelParte({ ...base, clave: CLAVE_OTRA_ACTIVIDAD, texto: 'Algo', unidad: 'mts' }),
    null,
  );
});

prueba('un ensayo se guarda con su nombre y su observación, y puede repetirse', () => {
  // Spec 004, RF-61, RF-72 y RF-73. Desde el 2026-09-22 todo ensayo nuevo lleva
  // además sus horas, su responsable y su ubicación (RF-84 a RF-87).
  const densidad = construirEnsayo({ ...DATOS_DEL_ENSAYO, ensayo: 'densidad_en_campo', observacion: '  98 %, PR 5 + 300 ' })!;
  assert.equal(densidad.ensayo, 'densidad_en_campo');
  assert.equal(densidad.nombre, 'Densidad en campo');
  assert.equal(densidad.observacion, '98 %, PR 5 + 300');
  assert.ok(esEnsayo(densidad));
  assert.ok(densidad.id.length > 0);
  // Dos del mismo ensayo: dos filas distintas.
  const otraDensidad = construirEnsayo({ ...DATOS_DEL_ENSAYO, ensayo: 'densidad_en_campo', observacion: 'Sin observaciones' })!;
  assert.notEqual(otraDensidad.id, densidad.id);
  // Un ensayo que no es de la lista, o sin observación, no se construye.
  assert.equal(construirEnsayo({ ...DATOS_DEL_ENSAYO, ensayo: 'cemento', observacion: 'x' }), null);
  assert.equal(construirEnsayo({ ...DATOS_DEL_ENSAYO, ensayo: 'espesor', observacion: '  ' }), null);
  assert.equal(construirEnsayo({ id: 'mat-1' }), null);
});

prueba('un ensayo nuevo guarda cuándo, quién y dónde; uno anterior se conserva sin ellos', () => {
  // Spec 004, RF-84 a RF-89 (cambio 2026-09-22).
  const conPr = construirEnsayo({
    ensayo: 'densidad_en_campo',
    observacion: '98 %',
    horaInicio: '08:00',
    horaFin: '09:30',
    responsable: '  Laboratorio Geotecnia S.A.S. ',
    ubicacion: { pr: 5, metros: 50 },
  })!;
  assert.deepEqual(
    [conPr.horaInicio, conPr.horaFin, conPr.responsable, conPr.ubicacion],
    ['08:00', '09:30', 'Laboratorio Geotecnia S.A.S.', { pr: 5, metros: 50 }],
  );
  assert.equal(esEnsayoAnterior(conPr), false);

  const enPlanta = construirEnsayo({
    ...DATOS_DEL_ENSAYO,
    ensayo: 'granulometria',
    observacion: 'x',
    ubicacion: { lugar: '  Planta de trituración ' },
  })!;
  assert.deepEqual(enPlanta.ubicacion, { lugar: 'Planta de trituración' });

  // Nunca las dos formas a la vez.
  for (const ensayo of [conPr, enPlanta]) {
    const u = ensayo.ubicacion!;
    assert.ok(!('lugar' in u && 'pr' in u), JSON.stringify(u));
  }

  // Uno nuevo sin responsable, con el fin antes del inicio o sin ubicación no se
  // construye (RF-85, RF-88).
  assert.equal(construirEnsayo({ ...DATOS_DEL_ENSAYO, ensayo: 'espesor', observacion: 'x', responsable: '' }), null);
  assert.equal(construirEnsayo({ ...DATOS_DEL_ENSAYO, ensayo: 'espesor', observacion: 'x', horaFin: '07:00' }), null);
  assert.equal(construirEnsayo({ ...DATOS_DEL_ENSAYO, ensayo: 'espesor', observacion: 'x', ubicacion: null }), null);
  // Ni aunque reclame el id de un ensayo guardado que ya tenía sus datos.
  assert.equal(construirEnsayo({ id: conPr.id, ensayo: 'espesor', observacion: 'x' }, conPr), null);

  // Uno guardado antes del cambio que vuelve sin los datos nuevos: se guarda como
  // antes, con su observación corregida si la cambiaron (RF-89).
  const anterior = { id: 'ens-viejo', ensayo: 'espesor', nombre: 'Espesor', observacion: 'Sin observaciones' };
  const reGuardado = construirEnsayo({ id: 'ens-viejo', ensayo: 'espesor', observacion: ' 12 cm ' }, anterior)!;
  assert.deepEqual(reGuardado, { id: 'ens-viejo', ensayo: 'espesor', nombre: 'Espesor', observacion: '12 cm' });
  assert.equal(esEnsayoAnterior(reGuardado), true);
  // Sin lo guardado, el mismo pedido es un ensayo nuevo incompleto.
  assert.equal(construirEnsayo({ id: 'ens-viejo', ensayo: 'espesor', observacion: '12 cm' }), null);
  // La observación se le sigue exigiendo al anterior (RF-72).
  assert.equal(construirEnsayo({ id: 'ens-viejo', ensayo: 'espesor', observacion: ' ' }, anterior), null);
});

prueba('el rechazo de un ensayo dice todo lo que le falta, y solo eso', () => {
  // Spec 004, RF-88 y RF-89 (cambio 2026-09-22): lo que responde el guardado.
  const anterior = { id: 'ens-viejo', ensayo: 'espesor', nombre: 'Espesor', observacion: 'Sin observaciones' };

  assert.deepEqual(rechazoDelEnsayo({ ...DATOS_DEL_ENSAYO, ensayo: 'espesor', observacion: 'x' }), []);
  assert.deepEqual(rechazoDelEnsayo({ ...DATOS_DEL_ENSAYO, ensayo: 'cemento', observacion: 'x' }), [
    'Ese ensayo no está en la lista.',
  ]);
  // Uno nuevo sin responsable ni ubicación: las dos faltas, en el orden del formulario.
  assert.deepEqual(
    rechazoDelEnsayo({ ...DATOS_DEL_ENSAYO, ensayo: 'espesor', observacion: 'x', responsable: '', ubicacion: null }),
    [MENSAJES_DE_ENSAYO.sinResponsable, MENSAJES_DE_ENSAYO.sinUbicacion],
  );
  // Un anterior que vuelve sin datos nuevos: nada que decir, o solo su observación.
  assert.deepEqual(rechazoDelEnsayo({ id: 'ens-viejo', ensayo: 'espesor', observacion: 'x' }, anterior), []);
  assert.deepEqual(rechazoDelEnsayo({ id: 'ens-viejo', ensayo: 'espesor', observacion: '' }, anterior), [
    faltaObservacionDelEnsayo('')!,
  ]);
  // Y cuando la regla no rechaza, se construye: las dos dicen lo mismo.
  for (const [pedido, guardado] of [
    [{ ...DATOS_DEL_ENSAYO, ensayo: 'espesor', observacion: 'x' }, undefined],
    [{ id: 'ens-viejo', ensayo: 'espesor', observacion: 'x' }, anterior],
    [{ ...DATOS_DEL_ENSAYO, ensayo: 'espesor', observacion: 'x', responsable: '' }, undefined],
  ] as const) {
    assert.equal(rechazoDelEnsayo(pedido, guardado).length === 0, construirEnsayo(pedido, guardado) !== null);
  }
});

prueba('las filas guardadas antes de los catálogos de OCC se conservan tal cual', () => {
  // Spec 004, RF-63 y RF-71. Lo que llega del navegador no las toca.
  const actividadVieja: ActividadDelParte = {
    id: 'act-vieja',
    clave: 'excavacion',
    nombre: 'Excavación',
    descripcion: 'Zanja',
    longitud: 2,
    ancho: 1,
    alto: null,
    area: 2,
    volumen: null,
    observaciones: '',
  };
  const actividadNueva = construirActividadDelParte({
    id: 'act-nueva',
    clave: '10.1',
    descripcion: '',
    observaciones: '',
    longitud: null,
    ancho: null,
    alto: null,
    area: null,
    volumen: null,
    cantidad: 300,
  })!;
  assert.equal(esActividadHeredada(actividadVieja), true);
  assert.equal(esActividadHeredada(actividadNueva), false);

  const pedidas = [
    // La heredada, con un nombre y unas medidas que no son las suyas.
    { id: 'act-vieja', clave: 'excavacion', texto: 'Otro nombre', descripcion: 'Cambiada', observaciones: '', longitud: 9, ancho: 9, alto: 9, area: null, volumen: null },
    // Una nueva que reclama el id de una fila **no** heredada: se construye, no se copia.
    { id: 'act-nueva', clave: '10.1', descripcion: '', observaciones: '', longitud: null, ancho: null, alto: null, area: null, volumen: null, cantidad: 450 },
    // Un id que no está guardado, con clave de prueba: no se construye.
    { id: 'act-ajena', clave: 'excavacion', descripcion: '', observaciones: '', longitud: null, ancho: null, alto: null, area: null, volumen: null },
  ];
  const actividades = conservarHeredadas(
    pedidas,
    [actividadVieja, actividadNueva],
    esActividadHeredada,
    construirActividadDelParte,
  );
  assert.deepEqual(actividades[0], actividadVieja);
  assert.equal(actividades[1]!.cantidad, 450);
  assert.equal(actividades[2], null);

  // Control de calidad: el material viejo llega solo con su id y se queda como estaba.
  const materialViejo: FilaDeControlDeCalidad = {
    id: 'mat-1',
    material: 'cemento',
    nombre: 'Cemento',
    cantidad: 4,
    unidad: 'bultos',
  };
  assert.equal(esMaterialHeredado(materialViejo), true);
  assert.equal(esEnsayo(materialViejo), false);
  const control = conservarHeredadas(
    [{ id: 'mat-1', ensayo: 'espesor', observacion: 'Intento de cambiarlo' }, { ...DATOS_DEL_ENSAYO, ensayo: 'espesor', observacion: 'Sin observaciones' }, { id: 'mat-ajeno' }],
    [materialViejo],
    esMaterialHeredado,
    (pedida) => construirEnsayo(pedida),
  );
  assert.deepEqual(control[0], materialViejo);
  assert.ok(control[1] && esEnsayo(control[1]));
  assert.equal(control[2], null);
});

prueba('un material heredado cuenta como Control Calidad de Obra lleno al cerrar', () => {
  // Spec 004, RF-50 con RF-63: la sección no se vacía por venir de la lista vieja.
  const bloqueos = bloqueosDelCierre(
    { ...PARTE_COMPLETO, laboratorio: [{ id: 'mat-1', material: 'cemento', nombre: 'Cemento', cantidad: 4, unidad: 'bultos' }] },
    FOTOS_COMPLETAS,
  );
  assert.ok(!bloqueos.some((b) => b.includes('Control Calidad de Obra')), bloqueos.join(' | '));
});

prueba('las observaciones de la máquina se guardan con ella', () => {
  // Spec 004 / RF-45.
  const maquina = construirMaquina(
    { vehiculoId: 'v-1', medidorInicial: 10, medidorFinal: 12, observaciones: 'Se varó a las 10.' },
    'RET-01',
    'horometro',
  );
  assert.equal(maquina.observaciones, 'Se varó a las 10.');
  assert.equal(
    construirMaquina({ vehiculoId: 'v-1' }, 'RET-01', 'horometro').observaciones,
    '',
  );
});

prueba('el operador de la máquina se guarda con su nombre congelado (021/RF-73, RF-74)', () => {
  const maquina = construirMaquina(
    { vehiculoId: 'v-1', medidorInicial: 32524, medidorFinal: 32615, operadorId: 'u-silfrido' },
    'VOL-01',
    'odometro',
    'Silfrido Medina',
  );
  assert.equal(maquina.operadorId, 'u-silfrido');
  assert.equal(maquina.operadorNombre, 'Silfrido Medina');

  // Sin operador elegido, los dos quedan en `null` —presentes— y un nombre suelto
  // no se guarda: el nombre solo acompaña a un operador elegido.
  const sinOperador = construirMaquina({ vehiculoId: 'v-1' }, 'VOL-01', 'odometro', 'Alguien');
  assert.equal(sinOperador.operadorId, null);
  assert.equal(sinOperador.operadorNombre, null);
  assert.ok('operadorId' in sinOperador);
  // Ni el operador ni el origen los pone el formulario: lo escrito a mano no viene de WhatsApp.
  assert.equal(sinOperador.origen, undefined);
});

prueba('una máquina guardada antes del operador se lee igual que hoy (021/RF-77)', () => {
  // Así está en un parte del 2026-09: sin operador ni origen.
  const anterior: MaquinaDelParte = {
    id: 'm-vieja',
    vehiculoId: 'v-1',
    codigo: 'RET-01',
    claseMedidor: 'horometro',
    medidorInicial: 100,
    medidorFinal: 108,
    observaciones: 'Sin novedad',
  };
  assert.equal(anterior.operadorId, undefined);
  assert.equal(anterior.origen, undefined);
  // Y la bitácora la sigue contando como una máquina con sus horas.
  assert.equal(avanceDeMedidor(anterior.medidorInicial, anterior.medidorFinal), 8);
});

prueba('guardar a mano conserva la marca «desde WhatsApp» de la fila que es la misma (021/RF-47, RF-48)', () => {
  const origen = { mensajeId: 'm-1', aprobadoPor: 'u-1', aprobadoEn: '2026-10-05T00:00:00.000Z' };
  // Máquinas: la misma es la del mismo equipo, aunque su id cambie al reconstruirla.
  const maquinas = conservarOrigen(
    [{ id: 'nueva-1', vehiculoId: 'v-1' }, { id: 'nueva-2', vehiculoId: 'v-2' }],
    [{ id: 'vieja-1', vehiculoId: 'v-1', origen }, { id: 'vieja-2', vehiculoId: 'v-3' }],
    (nueva, vieja) => 'vehiculoId' in vieja && vieja.vehiculoId === nueva.vehiculoId,
  );
  assert.deepEqual(maquinas[0], { id: 'nueva-1', vehiculoId: 'v-1', origen });
  assert.equal('origen' in maquinas[1], false);
  // Clima: la misma es la del mismo renglón.
  const clima = conservarOrigen(
    [{ id: 'a' }, { id: 'b' }],
    [{ id: 'x', origen }],
    (_, __, indice) => indice >= 0,
  );
  assert.deepEqual(clima.map((f) => 'origen' in f), [true, false]);
  // Una fila sin origen (escrita a mano, o un material anterior) no le da nada a nadie.
  assert.deepEqual(conservarOrigen([{ id: 'e-1' }], [{ id: 'e-1', material: 'cemento' }], () => true), [
    { id: 'e-1' },
  ]);
});

prueba('el guardado de la bitácora acepta el operador de cada máquina, y sin él es nulo (021/RF-73, RF-91)', () => {
  const conOperador = parteEditado.parse({
    maquinaria: [{ vehiculoId: 'v-1', medidorInicial: 1, medidorFinal: 2, operadorId: 'u-1' }],
  });
  assert.equal(conOperador.maquinaria?.[0].operadorId, 'u-1');

  // Un formulario que no lo manda —el de antes de la 021— deja la máquina sin
  // operador, no rechaza el guardado.
  const sinOperador = parteEditado.parse({ maquinaria: [{ vehiculoId: 'v-1' }] });
  assert.equal(sinOperador.maquinaria?.[0].operadorId, null);
  assert.equal(
    parteEditado.parse({ maquinaria: [{ vehiculoId: 'v-1', operadorId: '' }] }).maquinaria?.[0]
      .operadorId,
    null,
  );
});

/** Un parte guardado normal, sin marca de día sin trabajo. */
const GUARDADO = {
  sinTrabajo: false,
  motivoSinTrabajo: null,
  maquinaria: [],
  personal: [],
  actividades: [],
};

prueba('marcar día sin trabajo guarda la marca y su motivo', () => {
  // Spec 004 / RF-53.
  assert.deepEqual(
    resolverDiaSinTrabajo(GUARDADO, { sinTrabajo: true, motivoSinTrabajo: 'Domingo.' }),
    { sinTrabajo: true, motivoSinTrabajo: 'Domingo.', error: null },
  );
  assert.equal(
    resolverDiaSinTrabajo(GUARDADO, { sinTrabajo: true, motivoSinTrabajo: null }).error,
    'sin_motivo',
  );
  // Sin motivo en la petición, vale el que ya estaba guardado.
  assert.equal(
    resolverDiaSinTrabajo(
      { ...GUARDADO, sinTrabajo: true, motivoSinTrabajo: 'Paro por lluvia.' },
      { sinTrabajo: true },
    ).error,
    null,
  );
});

prueba('no se marca día sin trabajo si ya hay trabajo guardado', () => {
  // Spec 004 / RF-55. Se mira lo guardado cuando la petición no trae la sección.
  const conMaquina = { ...GUARDADO, maquinaria: [{}] };
  assert.equal(
    resolverDiaSinTrabajo(conMaquina, { sinTrabajo: true, motivoSinTrabajo: 'Lluvia.' }).error,
    'con_trabajo',
  );
  // Y si la misma petición quita las máquinas, ya no hay contradicción.
  assert.equal(
    resolverDiaSinTrabajo(conMaquina, {
      sinTrabajo: true,
      motivoSinTrabajo: 'Lluvia.',
      maquinaria: [],
    }).error,
    null,
  );
});

prueba('en un día marcado sin trabajo no se registran máquinas', () => {
  // La misma contradicción, entrando por el otro lado.
  const marcado = { ...GUARDADO, sinTrabajo: true, motivoSinTrabajo: 'Domingo.' };
  assert.equal(resolverDiaSinTrabajo(marcado, { personal: [{}] }).error, 'con_trabajo');
});

prueba('quitar la marca de día sin trabajo borra su motivo', () => {
  // Un motivo sin marca no dice nada, y dejarlo haría creer que ese día no se trabajó.
  assert.deepEqual(
    resolverDiaSinTrabajo(
      { ...GUARDADO, sinTrabajo: true, motivoSinTrabajo: 'Domingo.' },
      { sinTrabajo: false },
    ),
    { sinTrabajo: false, motivoSinTrabajo: null, error: null },
  );
});


prueba('el jefe ve exactamente las máquinas que le faltan', () => {
  const flota = ['vol-01', 'vol-02', 'ret-01'];
  const completas = new Map([
    ['vol-01', true],
    ['ret-01', false],
  ]);
  assert.deepEqual(maquinasSinBitacora(flota, completas), ['vol-02', 'ret-01']);
  assert.deepEqual(maquinasSinBitacora(flota, new Map()), flota);
});


/* ------------------------------------------------------------------------ */
/* Fusión del pull con lo que ya hay en el teléfono                          */
/* ------------------------------------------------------------------------ */

const BASE: VehiculoLocal = {
  codigoInterno: 'RET-01',
  placa: null,
  tipoVehiculoId: 'retroexcavadora',
  marca: 'Case',
  modelo: 'CX210',
  obraId: 'obra-1',
  odometroKm: null,
  horometroH: 6430,
  medidorActualizadoEn: 1_000,
  estado: 'operativo',
  eliminadoEn: null,
};

console.log('\nFusión del pull\n');

prueba('el catálogo siempre lo manda el servidor', () => {
  const local: VehiculoLocal = { ...BASE, placa: 'VIEJA', marca: 'Mal escrito', obraId: 'obra-0' };
  const servidor: VehiculoLocal = { ...BASE, placa: 'ABC123', marca: 'Case', obraId: 'obra-2' };
  const fusionado = fusionarVehiculo(servidor, local);
  assert.equal(fusionado.placa, 'ABC123');
  assert.equal(fusionado.marca, 'Case');
  assert.equal(fusionado.obraId, 'obra-2');
});

prueba('el medidor se queda con el mayor valor, venga de donde venga', () => {
  // El caso normal: el teléfono va por delante porque acaba de capturar una
  // lectura que todavía no ha subido.
  const local: VehiculoLocal = { ...BASE, horometroH: 6439, medidorActualizadoEn: 9_000 };
  const servidor: VehiculoLocal = { ...BASE, horometroH: 6430, medidorActualizadoEn: 5_000 };
  const fusionado = fusionarVehiculo(servidor, local);
  assert.equal(fusionado.horometroH, 6439);
  assert.equal(fusionado.medidorActualizadoEn, 9_000);

  // Y al revés: si el servidor sabe más, gana el servidor.
  const alReves = fusionarVehiculo({ ...BASE, horometroH: 6500, medidorActualizadoEn: 9_000 }, BASE);
  assert.equal(alReves.horometroH, 6500);

  assert.equal(mayorMedidor(null, 10), 10);
  assert.equal(mayorMedidor(10, null), 10);
  assert.equal(mayorMedidor(null, null), null);
});

prueba('un NO APTO local sobrevive mientras quede una captura sin subir', () => {
  // El peor error posible del sistema sería poner en verde una máquina que el
  // operador inmovilizó. El servidor todavía no sabe por qué está roja.
  const local: VehiculoLocal = { ...BASE, estado: 'no_apto' };
  const servidor: VehiculoLocal = { ...BASE, estado: 'operativo' };
  const fusionado = fusionarVehiculo(servidor, local, { hayCapturaSinSubir: true });
  assert.equal(fusionado.estado, 'no_apto');
});

prueba('y deja de sobrevivir cuando ya no queda ninguna', () => {
  // Sin esto, una máquina reparada se quedaría roja para siempre: el servidor
  // no tendría forma de volver a ponerla operativa.
  const local: VehiculoLocal = { ...BASE, estado: 'no_apto' };
  const servidor: VehiculoLocal = { ...BASE, estado: 'operativo' };
  const fusionado = fusionarVehiculo(servidor, local, { hayCapturaSinSubir: false });
  assert.equal(fusionado.estado, 'operativo');
});

prueba('la baja del servidor se aplica aunque queden capturas pendientes', () => {
  // La fila se conserva —los preoperacionales guardados la referencian— pero
  // queda apagada.
  const fusionado = fusionarVehiculo(
    { ...BASE, eliminadoEn: 7_000 },
    { ...BASE, estado: 'no_apto' },
    { hayCapturaSinSubir: true },
  );
  assert.equal(fusionado.eliminadoEn, 7_000);
  assert.equal(fusionado.estado, 'no_apto');
});

prueba('un vehículo que este equipo no conocía entra tal cual', () => {
  const fusionado = fusionarVehiculo({ ...BASE, horometroH: 99 }, null);
  assert.equal(fusionado.horometroH, 99);
  assert.equal(fusionado.estado, 'operativo');
});


/* ------------------------------------------------------------------------ */
/* Reintentos de la cola de salida                                           */
/* ------------------------------------------------------------------------ */

console.log('\nReintentos de la subida\n');

prueba('la espera crece con cada fallo y no pasa del tope', () => {
  // En obra la señal va y viene: reintentar cada segundo no adelanta el envío y
  // sí vacía la batería de un equipo que tiene que aguantar la jornada.
  const esperas = [1, 2, 3, 4].map(esperaDeReintento);
  assert.deepEqual(esperas, [5_000, 10_000, 20_000, 40_000]);

  for (let intentos = 1; intentos < 40; intentos++) {
    assert.ok(esperaDeReintento(intentos) <= ESPERA_MAXIMA_MS);
  }
  assert.equal(esperaDeReintento(30), ESPERA_MAXIMA_MS);

  // Sin fallos no hay espera: el primer envío sale de inmediato.
  assert.equal(esperaDeReintento(0), 0);
});

prueba('los reintentos se acaban y la fila deja de volver sola a la cola', () => {
  const ahora = 1_000_000;

  const primero = siguienteIntento(0, ahora);
  assert.equal(primero.estado, 'pendiente');
  assert.equal(primero.intentos, 1);
  assert.equal(primero.proximoIntentoEn, ahora + 5_000);

  // Justo antes del tope todavía se reintenta.
  const penultimo = siguienteIntento(INTENTOS_MAXIMOS - 2, ahora);
  assert.equal(penultimo.estado, 'pendiente');
  assert.ok(penultimo.proximoIntentoEn > ahora);

  // Y al llegar, se rinde. `proximoIntentoEn` queda en 0: una fecha futura
  // sugeriría que va a volver sola, y no va.
  const ultimo = siguienteIntento(INTENTOS_MAXIMOS - 1, ahora);
  assert.equal(ultimo.estado, 'fallida');
  assert.equal(ultimo.intentos, INTENTOS_MAXIMOS);
  assert.equal(ultimo.proximoIntentoEn, 0);

  assert.equal(debeRendirse(INTENTOS_MAXIMOS - 1), false);
  assert.equal(debeRendirse(INTENTOS_MAXIMOS), true);
});

prueba('el rechazo de una asignación del celular no atasca la cola', () => {
  // Spec 012 / RF-4 y RF-5. El servidor responde 422 a las autoasignaciones de un
  // teléfono sin actualizar, y **eso tiene que ser definitivo**: si se tratara
  // como un fallo pasajero, esa fila se reintentaría ocho veces cortando la tanda
  // cada vez, y los preoperacionales firmados que van detrás no subirían.
  assert.equal(fallaDefinitiva(422), true);
  assert.equal(fallaDefinitiva(400), true);
  // Lo que sí puede arreglarse esperando no se da por perdido.
  assert.equal(fallaDefinitiva(409), false);
  assert.equal(fallaDefinitiva(500), false);
  assert.equal(fallaDefinitiva(404), false);

  // Y una vez marcada definitiva, no vuelve sola a la cola.
  const resultado = siguienteIntento(0, 1_000_000, { definitivo: fallaDefinitiva(422) });
  assert.equal(resultado.estado, 'fallida');
  assert.equal(resultado.proximoIntentoEn, 0);
});

prueba('confirmar una asignación ya no es una acción que el panel pueda pedir', () => {
  // Spec 012 / RF-15 y RF-18. Confirmar existía para aceptar lo que un operador se
  // había tomado en obra; sin autoasignación no hay nada que aceptar. Cerrar se
  // queda, que es la otra mitad del trabajo de la administración.
  //
  // El caso vive aquí y no en la pantalla porque la pantalla se puede quedar
  // vieja en una pestaña abierta: lo que de verdad cierra la puerta es que el
  // contrato del servidor no admita la palabra.
  assert.equal(asignacionEditada.safeParse({ accion: 'cerrar' }).success, true);
  assert.equal(asignacionEditada.safeParse({ accion: 'confirmar' }).success, false);
});

prueba('un error que reintentar no arregla se rinde de una vez', () => {
  // El vehículo ya no existe en el servidor, o el envío no valida. Gastar ocho
  // reintentos en eso solo retrasa que el operador se entere.
  const resultado = siguienteIntento(0, 1_000_000, { definitivo: true });
  assert.equal(resultado.estado, 'fallida');
  assert.equal(resultado.intentos, INTENTOS_MAXIMOS);
});


console.log('\nPermisos del panel\n');

prueba('la gerencia alcanza todos los módulos', () => {
  for (const modulo of MODULOS) {
    assert.ok(alcanza('admin', modulo, 'ver'), `gerencia debería entrar a ${modulo}`);
  }
  assert.deepEqual(modulosVisibles('admin'), [...MODULOS]);
});

prueba('el residente entra a inicio, asignaciones, bitácoras, preoperacionales, almacén, cantera, laboratorio, WhatsApp, Reportes, Contrato y Asistente', () => {
  // Spec 001 / RF-1, ampliado por 008 / RF-12 (almacén y cantera, en consulta), por
  // 018 / RF-7 (laboratorio, donde además aprueba), por 021 / RF-14 (la bandeja), por
  // 030 / RF-1 (Reportes), por 031 / RF-2 (Contrato y Presupuesto) y por 028 / RF-1
  // (el asistente).
  assert.deepEqual(modulosVisibles('supervisor'), [
    'inicio',
    'asignaciones',
    'bitacoras',
    'preoperacionales',
    'almacen',
    'cantera',
    'laboratorio',
    'whatsapp',
    'reportes',
    'contrato',
    'asistente',
  ]);
});

prueba('la bandeja de WhatsApp es de la gerencia y del residente, y nada más (021/RF-14, RF-15)', () => {
  for (const rol of ['admin', 'supervisor'] as const) {
    for (const accion of ['ver', 'listar', 'escribir', 'aprobar'] as const) {
      assert.ok(alcanza(rol, 'whatsapp', accion), `${rol} whatsapp/${accion}`);
    }
    assert.equal(alcanza(rol, 'whatsapp', 'anular'), false, `${rol} whatsapp/anular`);
  }
  for (const rol of ['operador', 'almacenista', 'encargado_planta', 'laboratorista'] as const) {
    for (const accion of ['ver', 'listar', 'escribir', 'aprobar', 'anular'] as const) {
      assert.equal(alcanza(rol, 'whatsapp', accion), false, `${rol} whatsapp/${accion}`);
    }
    assert.ok(!modulosVisibles(rol).includes('whatsapp'), rol);
  }
  // Su obra no la apaga: no es de los módulos que se encienden por obra.
  assert.equal(
    moduloApagado('whatsapp', { almacen: false, cantera: false, laboratorio: false }),
    false,
  );
  // El rechazo dice qué se intentaba en la bandeja, no lo del laboratorio.
  assert.equal(
    motivoDeRechazo('whatsapp', 'aprobar'),
    'No puede aprobar ni descartar este reporte: lo hacen la gerencia y el residente o el director.',
  );
  assert.equal(
    motivoDeRechazo('laboratorio', 'aprobar'),
    'No puede aprobar ni devolver este ensayo: lo hacen la gerencia y el residente o el director.',
  );
});

prueba('aprobar viajes desde la bandeja no le da Control Cantera al residente (021/RF-84, RF-85)', () => {
  assert.equal(alcanza('supervisor', 'cantera', 'escribir'), false);
  assert.equal(alcanza('supervisor', 'cantera', 'anular'), false);
  assert.ok(alcanza('supervisor', 'cantera', 'listar'));
});

prueba('el residente no escribe en el maestro de la empresa', () => {
  // Esto es lo que hoy sí puede hacer, y es el motivo de la spec 001.
  for (const modulo of ['obras', 'personas', 'vehiculos'] as const) {
    assert.equal(alcanza('supervisor', modulo, 'escribir'), false, modulo);
    assert.equal(alcanza('supervisor', modulo, 'ver'), false, modulo);
  }
});

prueba('pero sí puede listar personas y vehículos', () => {
  // El caso que evita que alguien "arregle" el permiso de más y deje sin datos
  // a los selectores de Asignaciones y Bitácoras.
  assert.ok(alcanza('supervisor', 'personas', 'listar'));
  assert.ok(alcanza('supervisor', 'vehiculos', 'listar'));
});

prueba('el residente trabaja en asignaciones y bitácoras, y anula bitácoras', () => {
  assert.ok(alcanza('supervisor', 'asignaciones', 'escribir'));
  assert.ok(alcanza('supervisor', 'bitacoras', 'escribir'));
  assert.ok(alcanza('supervisor', 'bitacoras', 'anular'));
});

prueba('anular un preoperacional es solo de la gerencia', () => {
  assert.ok(alcanza('supervisor', 'preoperacionales', 'ver'));
  assert.equal(alcanza('supervisor', 'preoperacionales', 'anular'), false);
  assert.ok(alcanza('admin', 'preoperacionales', 'anular'));
});

prueba('emitir códigos de activación es solo de la gerencia', () => {
  assert.ok(alcanza('admin', 'personas', 'activar'));
  assert.equal(alcanza('supervisor', 'personas', 'activar'), false);
});

prueba('el operador no alcanza nada del panel', () => {
  assert.deepEqual(modulosVisibles('operador'), []);
  for (const modulo of MODULOS) {
    for (const accion of ['ver', 'listar', 'escribir', 'anular', 'activar', 'aprobar'] as const) {
      assert.equal(alcanza('operador', modulo, accion), false, `${modulo}/${accion}`);
    }
  }
});

prueba('nadie reparte más permisos de los que tiene', () => {
  assert.equal(puedeCambiarRol('supervisor', 'admin'), false);
  assert.ok(puedeCambiarRol('supervisor', 'supervisor'));
  assert.ok(puedeCambiarRol('supervisor', 'operador'));
  assert.ok(puedeCambiarRol('admin', 'admin'));
});

/* ── Almacenista y Encargado de Planta (spec 008) ── */

prueba('el almacenista solo entra al almacén', () => {
  // Spec 008 / RF-2.
  assert.deepEqual(modulosVisibles('almacenista'), ['almacen', 'asistente']); // y el asistente (028/RF-1)
});

prueba('el encargado de planta solo entra a control cantera', () => {
  // Spec 008 / RF-3.
  assert.deepEqual(modulosVisibles('encargado_planta'), ['cantera', 'asistente']); // y el asistente (028/RF-1)
});

prueba('los roles nuevos no tocan nada de los módulos que ya había', () => {
  // Spec 008 / RF-8 y H3: ni ver, ni listar, ni escribir. Tampoco el inicio.
  const existentes = ['inicio', 'obras', 'personas', 'vehiculos', 'asignaciones', 'bitacoras', 'preoperacionales'] as const;
  for (const rol of ['almacenista', 'encargado_planta'] as const) {
    for (const modulo of existentes) {
      for (const accion of ['ver', 'listar', 'escribir', 'anular', 'activar'] as const) {
        assert.equal(alcanza(rol, modulo, accion), false, `${rol} ${modulo}/${accion}`);
      }
    }
  }
  // Y cada uno está fuera del módulo del otro.
  assert.equal(alcanza('almacenista', 'cantera', 'ver'), false);
  assert.equal(alcanza('encargado_planta', 'almacen', 'ver'), false);
});

prueba('almacenista y encargado de planta llevan su módulo entero', () => {
  for (const [rol, modulo] of [['almacenista', 'almacen'], ['encargado_planta', 'cantera']] as const) {
    for (const accion of ['ver', 'listar', 'escribir'] as const) {
      assert.ok(alcanza(rol, modulo, accion), `${rol} ${modulo}/${accion}`);
    }
  }
  // El encargado de planta sigue anulando sus viajes (spec 010); el almacenista
  // ya no anula sus movimientos (spec 009, RF-38).
  assert.ok(alcanza('encargado_planta', 'cantera', 'anular'));
  assert.equal(alcanza('almacenista', 'almacen', 'anular'), false);
});

prueba('en el almacén solo anula la gerencia', () => {
  // Spec 009 / RF-38 y RF-39: lo pidió gerencia el 2026-09-17. Escribir no cambia.
  assert.ok(alcanza('almacenista', 'almacen', 'escribir'));
  assert.equal(alcanza('almacenista', 'almacen', 'anular'), false);
  assert.ok(alcanza('admin', 'almacen', 'anular'));
  assert.equal(alcanza('supervisor', 'almacen', 'anular'), false);
  // Y el 403 de la guardia nombra a quien sí puede (spec 008, RF-13).
  assert.equal(
    motivoDeRechazo('almacen', 'anular'),
    'No puede anular este registro: lo hace la gerencia.',
  );
});

prueba('la gerencia registra en almacén y cantera; el residente solo consulta', () => {
  // Spec 008 / RF-11, RF-12, RF-13.
  for (const modulo of ['almacen', 'cantera'] as const) {
    for (const accion of ['ver', 'listar', 'escribir', 'anular'] as const) {
      assert.ok(alcanza('admin', modulo, accion), `admin ${modulo}/${accion}`);
    }
    assert.ok(alcanza('supervisor', modulo, 'ver'), `supervisor ${modulo}/ver`);
    assert.ok(alcanza('supervisor', modulo, 'listar'), `supervisor ${modulo}/listar`);
    assert.equal(alcanza('supervisor', modulo, 'escribir'), false, `supervisor ${modulo}/escribir`);
    assert.equal(alcanza('supervisor', modulo, 'anular'), false, `supervisor ${modulo}/anular`);
  }
  assert.deepEqual(modulosVisibles('supervisor'), [
    'inicio',
    'asignaciones',
    'bitacoras',
    'preoperacionales',
    'almacen',
    'cantera',
    'laboratorio',
    'whatsapp',
    'reportes',
    'contrato',
    'asistente',
  ]);
});

prueba('solo la gerencia da los accesos de almacén y de planta', () => {
  // Spec 008 / RF-17. No están «por encima» del residente: son otros.
  for (const destino of ['almacenista', 'encargado_planta'] as const) {
    assert.ok(puedeCambiarRol('admin', destino), destino);
    assert.equal(puedeCambiarRol('supervisor', destino), false, destino);
    assert.equal(puedeCambiarRol('almacenista', destino), false, destino);
    assert.equal(puedeCambiarRol('encargado_planta', destino), false, destino);
  }
  // Y ellos no reparten acceso a nadie.
  assert.equal(puedeCambiarRol('almacenista', 'operador'), false);
  assert.equal(puedeCambiarRol('encargado_planta', 'supervisor'), false);
});

prueba('el rechazo de dar un acceso dice quién puede darlo', () => {
  // Spec 008 / RF-17 y el requisito no funcional de 001: qué no se puede y quién sí.
  assert.equal(
    motivoParaNoDarRol('supervisor', 'almacenista'),
    'Solo la gerencia puede dar el acceso de Almacenista.',
  );
  assert.equal(
    motivoParaNoDarRol('supervisor', 'encargado_planta'),
    'Solo la gerencia puede dar el acceso de Encargado de Planta.',
  );
  assert.equal(
    motivoParaNoDarRol('supervisor', 'admin'),
    'Solo la gerencia puede dar el acceso de Gerencia.',
  );
  // Si se puede, no hay motivo.
  assert.equal(motivoParaNoDarRol('admin', 'almacenista'), null);
  assert.equal(motivoParaNoDarRol('supervisor', 'operador'), null);
});

prueba('el rechazo del servidor dice quién sí puede hacerlo', () => {
  // Spec 008 / RF-13: al residente no se le dice que registrar en el almacén «es
  // de la gerencia», porque también lo hace el almacenista.
  assert.equal(
    motivoDeRechazo('almacen', 'escribir'),
    'No puede crear o modificar este registro: lo hacen la gerencia y el almacenista.',
  );
  assert.equal(
    motivoDeRechazo('cantera', 'anular'),
    'No puede anular este registro: lo hacen la gerencia y el encargado de planta.',
  );
  // Donde solo escribe la gerencia, el texto dice lo mismo que antes, con otras palabras.
  assert.equal(
    motivoDeRechazo('obras', 'escribir'),
    'No puede crear o modificar este registro: lo hace la gerencia.',
  );
  // Al almacenista que abre Bitácoras se le dice quién la lleva. Desde la spec 034 el
  // Encargado de OCC también la consulta (la de maquinaria de OCC).
  assert.equal(
    motivoDeRechazo('bitacoras', 'listar'),
    'No puede consultar este listado: lo hacen la gerencia, el residente o el director y el encargado de OCC.',
  );
});

prueba('una cuenta sin obra se detecta para todo el que no es gerencia', () => {
  // Spec 008 / RF-6: el almacenista sin obra no ve nada y se le dice por qué.
  assert.equal(sinObraAsignada('almacenista', null), true);
  assert.equal(sinObraAsignada('encargado_planta', null), true);
  assert.equal(sinObraAsignada('supervisor', null), true);
  assert.equal(sinObraAsignada('almacenista', 'obra-1'), false);
  // La gerencia no está adscrita a ninguna obra, y eso no es un fallo de su cuenta.
  assert.equal(sinObraAsignada('admin', null), false);
});

prueba('el menú arranca abierto y se pliega solo en ventana angosta (022/RF-8, RF-11, RF-12)', () => {
  assert.equal(regimenDelMenu({ ventana: AnchoMinimoMenuFijo, preferencia: null }), 'fijoAbierto');
  assert.equal(regimenDelMenu({ ventana: 1920, preferencia: 'abierto' }), 'fijoAbierto');
  assert.equal(regimenDelMenu({ ventana: AnchoMinimoMenuFijo, preferencia: 'plegado' }), 'fijoPlegado');
  for (const preferencia of [null, 'abierto', 'plegado'] as const) {
    assert.equal(regimenDelMenu({ ventana: AnchoMinimoMenuFijo - 1, preferencia }), 'riel', String(preferencia));
  }
});

prueba('el ancho del contenido descuenta el menú, los márgenes y la barra (022/RNF)', () => {
  // Los dos peores casos del plan: menú abierto a 1280 y en riel a 1024. Con la
  // barra de desplazamiento de Windows (15 px, medida en Chrome) y no sin ella.
  assert.equal(anchoDelContenido(1280, AnchoMenuAbierto), 968);
  assert.equal(anchoDelContenido(1024, AnchoMenuPlegado), 888);
  // En un monitor grande manda el tope de página.
  assert.equal(anchoDelContenido(1920, AnchoMenuAbierto), MaxContentWidthPanel);
});

prueba('el módulo activo sale de la dirección, también en sus subpáginas (022/RF-6)', () => {
  assert.equal(moduloDeLaRuta('/panel'), 'inicio');
  assert.equal(moduloDeLaRuta('/panel/'), 'inicio');
  assert.equal(moduloDeLaRuta('/panel/obras'), 'obras');
  assert.equal(moduloDeLaRuta('/panel/whatsapp'), 'whatsapp');
  // Antes se comparaba con igualdad y el informe de un ensayo no marcaba Laboratorio.
  assert.equal(moduloDeLaRuta('/panel/laboratorio/abc'), 'laboratorio');
  assert.equal(moduloDeLaRuta('/panel/laboratorio/abc/informe'), 'laboratorio');
  // Un prefijo de texto no es una subpágina: «obrasx» no es Obras.
  assert.equal(moduloDeLaRuta('/panel/obrasx'), null);
  assert.equal(moduloDeLaRuta('/panel/desconocido'), null);
  assert.equal(moduloDeLaRuta('/'), null);
});

prueba('la preferencia del menú se recuerda en el navegador (022/RF-11)', () => {
  const datos = new Map<string, string>();
  const almacen: Almacen = {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => void datos.set(clave, valor),
  };
  // Sin nada guardado: «sin preferencia», que el régimen lee como abierto (RF-8).
  assert.equal(leerPreferencia(almacen), null);
  assert.equal(guardarPreferencia(almacen, 'plegado'), true);
  assert.equal(datos.get(CLAVE_PREFERENCIA_MENU), 'plegado');
  assert.equal(leerPreferencia(almacen), 'plegado');
  assert.equal(guardarPreferencia(almacen, 'abierto'), true);
  assert.equal(leerPreferencia(almacen), 'abierto');
  // Un valor que no es nuestro (otra versión, alguien que lo editó) no se cree.
  datos.set(CLAVE_PREFERENCIA_MENU, 'medio');
  assert.equal(leerPreferencia(almacen), null);
});

prueba('un navegador que no deja guardar no rompe el menú (022/RF-8, RF-11)', () => {
  // Incógnito estricto o almacenamiento bloqueado: el acceso mismo lanza.
  const bloqueado: Almacen = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  assert.equal(leerPreferencia(bloqueado), null);
  assert.equal(guardarPreferencia(bloqueado, 'plegado'), false);
  // Y sin navegador (el servidor pinta la página sin `window`): igual que la primera vez.
  assert.equal(leerPreferencia(null), null);
  assert.equal(guardarPreferencia(null, 'plegado'), false);
});

prueba('una foto solo la ve quien alcanza la obra de su registro (defecto de media, 2026-10-06)', () => {
  // Las fotos del parte diario cuelgan de `partes_de_obra`, y la ruta de imágenes las
  // buscaba en la tabla vieja `bitacoras`: no las encontraba, quedaban «sin obra» y
  // `alcanzaLaObra` deja pasar lo que no tiene obra. Un residente podía ver la foto
  // del día de otra obra con solo tener su id.
  const residenteA = sesionDe('supervisor', 'obra-a');
  assert.equal(alcanzaLaImagen(residenteA, { existe: true, obraId: 'obra-a' }), true);
  assert.equal(alcanzaLaImagen(residenteA, { existe: true, obraId: 'obra-b' }), false);
  // El hueco: un dueño que no se encuentra **no** es «de todos».
  assert.equal(alcanzaLaImagen(residenteA, { existe: false, obraId: null }), false);
  // Un registro que sí existe y no lleva obra conserva la regla de siempre.
  assert.equal(alcanzaLaImagen(residenteA, { existe: true, obraId: null }), true);
  // La gerencia ve todo, también lo huérfano: es quien tiene que poder revisarlo.
  const gerencia = sesionDe('admin', null);
  assert.equal(alcanzaLaImagen(gerencia, { existe: false, obraId: null }), true);
  assert.equal(alcanzaLaImagen(gerencia, { existe: true, obraId: 'obra-b' }), true);
});

prueba('la pestaña dice en qué pantalla se está (defecto de títulos, 2026-10-06)', () => {
  // Expo Router 57 no copia el título del `Stack` a la pestaña (`documentTitle` va
  // apagado), así que los títulos declarados nunca se veían. Ahora salen de la ruta.
  assert.equal(tituloDeLaPestana('/panel'), 'Control de Obra OCC');
  assert.equal(tituloDeLaPestana('/panel/obras'), 'Obras · Control de Obra OCC');
  assert.equal(tituloDeLaPestana('/panel/whatsapp'), 'Reportes de WhatsApp · Control de Obra OCC');
  assert.equal(tituloDeLaPestana('/panel/cantera'), 'Control Cantera · Control de Obra OCC');
  assert.equal(
    tituloDeLaPestana('/panel/laboratorio/abc'),
    'Ensayo de granulometría · Control de Obra OCC',
  );
  assert.equal(
    tituloDeLaPestana('/panel/laboratorio/abc/informe'),
    'Informe de granulometría · Control de Obra OCC',
  );
  // Una ruta que no es de ningún módulo queda con el nombre del sistema.
  assert.equal(tituloDeLaPestana('/panel/desconocido'), 'Control de Obra OCC');
});

prueba('cada rol entra por su módulo', () => {
  // Spec 008 / RF-4.
  assert.equal(moduloDeEntrada('admin'), 'inicio');
  assert.equal(moduloDeEntrada('supervisor'), 'inicio');
  assert.equal(moduloDeEntrada('almacenista'), 'almacen');
  assert.equal(moduloDeEntrada('encargado_planta'), 'cantera');
  assert.equal(moduloDeEntrada('operador'), null);
});

/* ── Laboratorista (spec 018) ── */

prueba('el laboratorista solo entra a laboratorio, y por ahí entra', () => {
  // Spec 018 / RF-4 y RF-5.
  assert.deepEqual(modulosVisibles('laboratorista'), ['laboratorio', 'asistente']); // y el asistente (028/RF-1)
  assert.equal(moduloDeEntrada('laboratorista'), 'laboratorio');
  assert.equal(ETIQUETA_ROL.laboratorista, 'Laboratorista');
});

prueba('el laboratorista no toca nada fuera de su módulo', () => {
  // Spec 018 / RF-4: ni ver, ni listar, ni el inicio. El asistente sí (028/RF-1), y
  // con él solo alcanza el laboratorio (028/T1).
  for (const modulo of MODULOS.filter((m) => m !== 'laboratorio' && m !== 'asistente')) {
    for (const accion of ['ver', 'listar', 'escribir', 'anular', 'activar', 'aprobar'] as const) {
      assert.equal(alcanza('laboratorista', modulo, accion), false, `${modulo}/${accion}`);
    }
  }
  // Y nadie de los otros módulos de oficio entra al suyo.
  assert.equal(alcanza('almacenista', 'laboratorio', 'ver'), false);
  assert.equal(alcanza('encargado_planta', 'laboratorio', 'ver'), false);
  assert.equal(alcanza('operador', 'laboratorio', 'ver'), false);
});

prueba('el laboratorista registra, pero no aprueba ni anula', () => {
  // Spec 018 / RF-23, RF-72, RF-90 y RF-92. Enviar y descartar son escribir.
  for (const accion of ['ver', 'listar', 'escribir'] as const) {
    assert.ok(alcanza('laboratorista', 'laboratorio', accion), accion);
  }
  assert.equal(alcanza('laboratorista', 'laboratorio', 'aprobar'), false);
  assert.equal(alcanza('laboratorista', 'laboratorio', 'anular'), false);
});

prueba('el residente aprueba y anula ensayos, pero no los registra', () => {
  // Spec 018 / RF-7, RF-77, RF-78 y RF-86: hace de coordinador de laboratorio.
  for (const accion of ['ver', 'listar', 'aprobar', 'anular'] as const) {
    assert.ok(alcanza('supervisor', 'laboratorio', accion), accion);
  }
  assert.equal(alcanza('supervisor', 'laboratorio', 'escribir'), false);
  // La gerencia, todo (RF-9).
  for (const accion of ['ver', 'listar', 'escribir', 'aprobar', 'anular'] as const) {
    assert.ok(alcanza('admin', 'laboratorio', accion), accion);
  }
  // Aprobar no existe fuera del laboratorio; desde la spec 021, de la bandeja de
  // WhatsApp, donde aprobar un reporte es lo que lo pasa a la bitácora; y desde la 031,
  // de Contrato y Presupuesto, donde aprobar fija el valor contra el que se cobra.
  for (const modulo of MODULOS.filter((m) => m !== 'laboratorio' && m !== 'whatsapp' && m !== 'contrato')) {
    for (const rol of ROLES) {
      assert.equal(alcanza(rol, modulo, 'aprobar'), false, `${rol} ${modulo}/aprobar`);
    }
  }
});

prueba('solo la gerencia da el acceso de laboratorista', () => {
  // Spec 018 / RF-2.
  assert.ok(puedeCambiarRol('admin', 'laboratorista'));
  for (const rol of ['supervisor', 'almacenista', 'encargado_planta', 'laboratorista', 'operador'] as const) {
    assert.equal(puedeCambiarRol(rol, 'laboratorista'), false, rol);
  }
  assert.equal(puedeCambiarRol('laboratorista', 'operador'), false);
  assert.equal(
    motivoParaNoDarRol('supervisor', 'laboratorista'),
    'Solo la gerencia puede dar el acceso de Laboratorista.',
  );
});

prueba('el rechazo en el laboratorio dice quién sí puede', () => {
  // Spec 018 / RF-10.
  assert.equal(
    motivoDeRechazo('laboratorio', 'aprobar'),
    'No puede aprobar ni devolver este ensayo: lo hacen la gerencia y el residente o el director.',
  );
  assert.equal(
    motivoDeRechazo('laboratorio', 'escribir'),
    'No puede crear o modificar este registro: lo hacen la gerencia y el laboratorista.',
  );
  assert.equal(
    motivoDeRechazo('laboratorio', 'anular'),
    'No puede anular este registro: lo hacen la gerencia y el residente o el director.',
  );
});

prueba('el cargo Laboratorista sugiere su acceso y no lleva máquina', () => {
  // Spec 018 / RF-3.
  assert.equal(nombreDeCargo('laboratorista'), 'Laboratorista');
  assert.equal(rolSugerido('laboratorista'), 'laboratorista');
  assert.equal(operaVehiculos('laboratorista'), false);
});

prueba('un módulo apagado en la obra lo está solo para Almacén, Control Cantera y Laboratorio', () => {
  // Spec 017 / RF-7 a RF-9 (cambio 2026-09-22), más Laboratorio (018/RF-11). Solo
  // esos tres se apagan por obra; los demás no dependen de la obra.
  const conTodo = TODOS_LOS_MODULOS;
  const sinAlmacen = { ...TODOS_LOS_MODULOS, almacen: false };
  const sinCantera = { ...TODOS_LOS_MODULOS, cantera: false };

  assert.equal(moduloApagado('almacen', sinAlmacen), true);
  assert.equal(moduloApagado('almacen', conTodo), false);
  assert.equal(moduloApagado('cantera', sinCantera), true);
  assert.equal(moduloApagado('cantera', conTodo), false);
  assert.equal(moduloApagado('almacen', sinCantera), false);
  for (const modulo of MODULOS.filter((m) => !['almacen', 'cantera', 'laboratorio'].includes(m))) {
    assert.equal(
      moduloApagado(modulo, { almacen: false, cantera: false, laboratorio: false }),
      false,
      `${modulo} no se apaga por obra`,
    );
  }

  // El aviso nombra el módulo y dice a quién pedírselo (RF-8).
  assert.equal(
    avisoDeModuloApagado('almacen'),
    'Su obra no lleva el módulo Almacén. Si debería llevarlo, pídaselo a quien lleve la administración.',
  );
  assert.match(avisoDeModuloApagado('cantera'), /Control Cantera/);
});

prueba('el menú de cada quien depende de su cargo y de los módulos de su obra', () => {
  // Spec 017 / RF-7. El cargo abre el módulo; la obra tiene que llevarlo.
  const sinAlmacen = { ...TODOS_LOS_MODULOS, almacen: false };
  const sinCantera = { ...TODOS_LOS_MODULOS, cantera: false };
  const sinNada = { almacen: false, cantera: false, laboratorio: false };

  // El asistente no depende de la obra (028/RF-1); sin su módulo, no alcanza nada (028/T1).
  assert.deepEqual(modulosVisibles('almacenista', TODOS_LOS_MODULOS), ['almacen', 'asistente']);
  assert.deepEqual(modulosVisibles('almacenista', sinAlmacen), ['asistente']);
  assert.deepEqual(modulosVisibles('encargado_planta', TODOS_LOS_MODULOS), ['cantera', 'asistente']);
  assert.deepEqual(modulosVisibles('encargado_planta', sinCantera), ['asistente']);

  // El residente pierde lo que su obra no lleva y conserva lo suyo.
  const residente = modulosVisibles('supervisor', sinNada);
  assert.ok(residente.includes('bitacoras'), residente.join(','));
  assert.ok(!residente.includes('almacen') && !residente.includes('cantera'));
  assert.ok(!residente.includes('laboratorio'));

  // La gerencia lleva todas las obras: ve los nueve módulos siempre (RF-10 es lo
  // que a ella le esconde las obras apagadas, no el módulo).
  assert.equal(modulosVisibles('admin', sinNada).length, MODULOS.length);
  // Sin decir nada de la obra, como antes de la spec 017.
  assert.deepEqual(modulosVisibles('almacenista'), ['almacen', 'asistente']); // y el asistente (028/RF-1)
});

prueba('no se da el acceso de un módulo que la obra no lleva', () => {
  // Spec 017 / RF-11. El cargo existe, pero esa obra no lleva ese módulo.
  const sinAlmacen = { ...TODOS_LOS_MODULOS, almacen: false };
  const sinCantera = { ...TODOS_LOS_MODULOS, cantera: false };

  assert.equal(
    motivoParaNoDarRolEnObra('almacenista', sinAlmacen),
    'Esa obra no lleva el módulo Almacén.',
  );
  assert.equal(
    motivoParaNoDarRolEnObra('encargado_planta', sinCantera),
    'Esa obra no lleva el módulo Control Cantera.',
  );
  // Con el módulo encendido, ninguno estorba.
  assert.equal(motivoParaNoDarRolEnObra('almacenista', TODOS_LOS_MODULOS), null);
  assert.equal(motivoParaNoDarRolEnObra('encargado_planta', TODOS_LOS_MODULOS), null);
  assert.equal(motivoParaNoDarRolEnObra('almacenista', sinCantera), null);
  // Los demás roles no dependen de estos módulos.
  for (const rol of ROLES.filter((r) => !['almacenista', 'encargado_planta', 'laboratorista'].includes(r))) {
    assert.equal(
      motivoParaNoDarRolEnObra(rol, { almacen: false, cantera: false, laboratorio: false }),
      null,
      `${rol} no depende de los módulos de la obra`,
    );
  }
});

prueba('una obra nueva propone el laboratorio encendido; corregirla sin el campo no lo toca', () => {
  // Spec 018 / RF-13: el alta lo propone encendido. Las obras que ya existían
  // quedaron apagadas por el default de la base (RF-12), no por este contrato.
  const nueva = obraNueva.parse({ codigo: 'OBR-9', nombre: 'Prueba' });
  assert.equal(nueva.laboratorioActivo, true);
  assert.equal(obraNueva.parse({ codigo: 'OBR-9', nombre: 'Prueba', laboratorioActivo: false }).laboratorioActivo, false);
  // En un PATCH, ausente es «no se toca»: corregir el nombre no enciende ni apaga nada.
  assert.equal('laboratorioActivo' in obraEditada.parse({ nombre: 'Otro nombre' }), false);
  assert.equal(obraEditada.parse({ laboratorioActivo: true }).laboratorioActivo, true);
});

prueba('el laboratorio se enciende por obra, y apagado nadie de la obra lo ve', () => {
  // Spec 018 / RF-11 y RF-14.
  const sinLaboratorio = { ...TODOS_LOS_MODULOS, laboratorio: false };
  assert.equal(moduloApagado('laboratorio', sinLaboratorio), true);
  assert.equal(moduloApagado('laboratorio', TODOS_LOS_MODULOS), false);
  // Los otros dos no dependen de este interruptor.
  assert.equal(moduloApagado('almacen', sinLaboratorio), false);
  assert.equal(moduloApagado('laboratorio', { ...TODOS_LOS_MODULOS, almacen: false }), false);

  // Y el asistente, que no depende de la obra (028/RF-1).
  assert.deepEqual(modulosVisibles('laboratorista', TODOS_LOS_MODULOS), ['laboratorio', 'asistente']);
  assert.deepEqual(modulosVisibles('laboratorista', sinLaboratorio), ['asistente']);
  assert.ok(modulosVisibles('supervisor', TODOS_LOS_MODULOS).includes('laboratorio'));
  assert.ok(!modulosVisibles('supervisor', sinLaboratorio).includes('laboratorio'));
  // La gerencia lo ve siempre: a ella se le esconden las obras apagadas (RF-8).
  assert.ok(modulosVisibles('admin', sinLaboratorio).includes('laboratorio'));

  assert.match(avisoDeModuloApagado('laboratorio'), /módulo Laboratorio/);
});

prueba('no se da el acceso de laboratorista en una obra sin laboratorio', () => {
  // Spec 018 / RF-14, que aplica 017/RF-11.
  assert.equal(
    motivoParaNoDarRolEnObra('laboratorista', { ...TODOS_LOS_MODULOS, laboratorio: false }),
    'Esa obra no lleva el módulo Laboratorio.',
  );
  assert.equal(motivoParaNoDarRolEnObra('laboratorista', TODOS_LOS_MODULOS), null);
  assert.equal(motivoParaNoDarRolEnObra('almacenista', { ...TODOS_LOS_MODULOS, laboratorio: false }), null);
});

prueba('el aviso de módulo ajeno dice dónde está el trabajo de cada quien', () => {
  // Spec 008 / RF-7: a un almacenista no se le dice que Bitácoras «es de la gerencia».
  assert.equal(
    avisoDeModuloAjeno('almacenista', 'bitacoras'),
    'Este módulo no es de su cargo. Su trabajo está en Almacén.',
  );
  assert.equal(
    avisoDeModuloAjeno('encargado_planta', 'almacen'),
    'Este módulo no es de su cargo. Su trabajo está en Control Cantera.',
  );
  // Para el residente se conserva el texto de 001/RF-3.
  assert.equal(
    avisoDeModuloAjeno('supervisor', 'obras'),
    'Este módulo es de la gerencia. Si necesita registrar o corregir algo aquí, pídaselo a quien lleve la administración.',
  );
  // Si sí lo alcanza, no hay aviso.
  assert.equal(avisoDeModuloAjeno('almacenista', 'almacen'), null);
});

/** Una sesión de mentira, con lo justo para preguntarle al alcance. */
function sesionDe(rol: Rol, obraId: string | null): PersonaEnSesion {
  return {
    id: 'u1',
    usuario: 'prueba',
    nombreCompleto: 'Persona de prueba',
    rol,
    obraId,
    obraNombre: obraId ? 'Obra de prueba' : null,
    // Los dos módulos encendidos salvo que la prueba diga otra cosa (spec 017).
    modulosDeObra: TODOS_LOS_MODULOS,
    debeCambiarClave: false,
  };
}

prueba('la gerencia alcanza cualquier obra y no filtra por ninguna', () => {
  const gerencia = sesionDe('admin', null);
  assert.equal(filtroDeObra(gerencia, vehiculos.obraId), undefined);
  assert.ok(alcanzaLaObra(gerencia, 'obra-a'));
  assert.ok(alcanzaLaObra(gerencia, null));
});

prueba('el residente alcanza su obra y las filas sin obra', () => {
  const residente = sesionDe('supervisor', 'obra-a');
  assert.notEqual(filtroDeObra(residente, vehiculos.obraId), undefined);
  assert.ok(alcanzaLaObra(residente, 'obra-a'));
  assert.ok(alcanzaLaObra(residente, null));
  assert.equal(alcanzaLaObra(residente, 'obra-b'), false);
});

prueba('un residente sin obra asignada no alcanza nada', () => {
  // Antes de la spec 001 esto devolvía «sin filtro» y `true`: una cuenta a
  // medio configurar veía más que una bien puesta. Si alguien vuelve a
  // ponerlo así, esta comprobación es lo único que lo va a decir.
  const suelto = sesionDe('supervisor', null);
  assert.notEqual(filtroDeObra(suelto, vehiculos.obraId), undefined);
  assert.equal(alcanzaLaObra(suelto, 'obra-a'), false);
  assert.equal(alcanzaLaObra(suelto, null), false);
});

console.log('\nCargos de la obra\n');

prueba('la marca de «sin formato» cuadra con las plantillas que existen', () => {
  // Spec 003 / RF-3. Es la comprobación que impide que la marca y la realidad
  // se separen: el día que llegue el Excel de la recicladora, quitar la marca
  // sin añadir la plantilla —o al revés— falla aquí y no en obra.
  for (const tipo of TIPOS_VEHICULO) {
    const tiene = PLANTILLAS_POR_TIPO.has(tipo.id);
    assert.equal(tiene, !tipo.sinFormato, `${tipo.id}: marca y plantilla no cuadran`);
  }
  assert.deepEqual(
    TIPOS_VEHICULO.filter((x) => x.sinFormato).map((x) => x.id),
    // Spec 019 / RF-11 los dejó entrar sin formato; la spec 020 les dio uno
    // prestado a los ocho (RF-1 a RF-8), así que hoy ninguno queda pendiente.
    [],
  );
});

prueba('los tipos de la spec 019 se miden con el medidor de su tablero', () => {
  // RF-8 y RF-9: los de carretera por kilómetros, la maquinaria por horas.
  const esperado: Record<string, string> = {
    camion: 'odometro',
    carrotanque: 'odometro',
    carro_taller: 'odometro',
    excavadora: 'horometro',
    excavadora_oruga: 'horometro',
    montacargas: 'horometro',
  };
  for (const [id, clase] of Object.entries(esperado)) {
    const tipo = TIPOS_VEHICULO.find((t) => t.id === id);
    assert.ok(tipo, `${id}: no está en el catálogo`);
    assert.equal(tipo.claseMedidor, clase, `${id}: medidor equivocado`);
  }
});

prueba('los tipos de equipo anteriores a la spec 019 no cambian', () => {
  // RF-19: los slugs son llave de vehículos y plantillas ya firmadas.
  const anteriores = TIPOS_VEHICULO.slice(0, 7).map((t) => [t.id, t.nombre, t.claseMedidor]);
  assert.deepEqual(anteriores, [
    ['camioneta', 'Camioneta', 'odometro'],
    ['volqueta', 'Volqueta', 'odometro'],
    ['retroexcavadora', 'Retroexcavadora', 'horometro'],
    ['retrocargador', 'Retrocargador', 'horometro'],
    ['motoniveladora', 'Motoniveladora', 'horometro'],
    ['vibrocompactadora', 'Vibro Compactadora', 'horometro'],
    ['recicladora', 'Recicladora', 'horometro'],
  ]);
});

prueba('ningún tipo de equipo repite slug ni nombre', () => {
  // Un slug repetido haría que dos tipos compartieran fila en las dos bases.
  const ids = TIPOS_VEHICULO.map((t) => t.id);
  const nombres = TIPOS_VEHICULO.map((t) => t.nombre);
  assert.equal(new Set(ids).size, ids.length, 'slug repetido');
  assert.equal(new Set(nombres).size, nombres.length, 'nombre repetido');
  for (const id of ids) assert.match(id, /^[a-z_]+$/, `${id}: el slug solo lleva minúsculas y _`);
});

prueba('cada tipo de equipo con formato tiene posiciones de llanta', () => {
  // Spec 003 / RF-9. La lista es fija a propósito: si la posición se escribiera
  // a mano, la misma rueda acabaría registrada de tres maneras y no habría
  // seguimiento posible.
  for (const tipo of TIPOS_VEHICULO) {
    const posiciones = posicionesDe(tipo.id);
    const ids = posiciones.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, `${tipo.id}: posiciones repetidas`);
  }
  assert.equal(posicionesDe('camioneta').length, 5);
  // Doble troque: dirección sencilla, dos ejes de rueda doble y el repuesto.
  assert.equal(posicionesDe('volqueta').length, 11);
  assert.equal(posicionesDe('motoniveladora').length, 6);
});

prueba('los tipos de la spec 019 tienen su lista de llantas', () => {
  // RF-15: dos delanteras, un eje trasero de rueda doble y el repuesto.
  for (const id of ['camion', 'carrotanque', 'carro_taller']) {
    assert.equal(posicionesDe(id).length, 7, `${id}: 2 + 4 + repuesto`);
    assert.ok(posicionesDe(id).some((p) => p.id === 'repuesto'), `${id}: sin repuesto`);
  }
  // RF-16: dos delanteras y dos traseras.
  for (const id of ['excavadora', 'montacargas']) {
    assert.equal(posicionesDe(id).length, 4, `${id}: 2 + 2`);
  }
  // RF-17: va sobre orugas; no hay llanta que seguir.
  assert.deepEqual(posicionesDe('excavadora_oruga'), []);
});

prueba('cada tipo sin formato propio toma prestado el acordado', () => {
  // Spec 020 / RF-1 a RF-8: el formato de OCC más parecido a cada máquina.
  const esperado: Record<string, string> = {
    excavadora_oruga: 'retroexcavadora',
    excavadora: 'retrocargador',
    montacargas: 'motoniveladora',
    vibrocompactadora: 'motoniveladora',
    recicladora: 'motoniveladora',
    camion: 'camioneta',
    carrotanque: 'camioneta',
    carro_taller: 'camioneta',
  };
  const prestados = Object.fromEntries(
    TIPOS_VEHICULO.filter((t) => t.formatoDe).map((t) => [t.id, t.formatoDe]),
  );
  assert.deepEqual(prestados, esperado);
  assert.equal(formatoPrestadoDe('camion'), 'Camioneta');
  assert.equal(formatoPrestadoDe('excavadora_oruga'), 'Retroexcavadora');
  assert.equal(formatoPrestadoDe('camioneta'), null, 'un formato propio no es prestado');
  assert.equal(formatoPrestadoDe(null), null);
});

prueba('el formato de origen es propio y mide lo mismo', () => {
  // Spec 020 / RF-9 y RF-24: un origen prestado a su vez, o con otro medidor,
  // le pediría al operador una lectura que su tablero no da.
  for (const tipo of TIPOS_VEHICULO.filter((t) => t.formatoDe)) {
    const origen = TIPOS_VEHICULO.find((t) => t.id === tipo.formatoDe);
    assert.ok(origen, `${tipo.id}: el origen ${tipo.formatoDe} no existe`);
    assert.equal(origen.formatoDe, undefined, `${tipo.id}: su origen también es prestado`);
    assert.ok(PLANTILLAS_POR_TIPO.has(origen.id), `${tipo.id}: ${origen.id} no tiene formato propio`);
    assert.equal(tipo.claseMedidor, origen.claseMedidor, `${tipo.id}: otro medidor que su origen`);
  }
});

prueba('el formato prestado es el mismo documento que su origen', () => {
  // Spec 020 / RF-9, RF-10 y RF-16: mismas preguntas, versión y medidores que
  // la versión vigente del origen. Si cambia el origen, cambia el prestado.
  for (const tipo of TIPOS_VEHICULO.filter((t) => t.formatoDe)) {
    const prestada = PLANTILLAS_POR_TIPO.get(tipo.id);
    const origen = PLANTILLAS_POR_TIPO.get(tipo.formatoDe!)!;
    assert.ok(prestada, `${tipo.id}: no tiene plantilla`);
    assert.deepEqual(prestada.secciones, origen.secciones, `${tipo.id}: otras secciones`);
    assert.equal(cadenaCanonicaDePlantilla(prestada), cadenaCanonicaDePlantilla(origen));
    assert.equal(prestada.version, origen.version, `${tipo.id}: otra versión`);
    assert.deepEqual(prestada.medidores, origen.medidores, `${tipo.id}: otros medidores`);
    assert.deepEqual(prestada.periodicidades, origen.periodicidades);
    assert.equal(prestada.prestadoDe, origen.tipoVehiculo);
    assert.equal(prestada.tipoVehiculo, tipo.id);
  }
});

prueba('el formato prestado lleva el título de su tipo y de su origen', () => {
  // Spec 020 / RF-12 y RF-14.
  const camion = PLANTILLAS_POR_TIPO.get('camion')!;
  assert.equal(camion.tituloFormato, 'Preoperacional Camión (formato Camioneta)');
  assert.equal(camion.prestadoDe, 'camioneta');
  assert.equal(
    PLANTILLAS_POR_TIPO.get('excavadora_oruga')!.tituloFormato,
    'Preoperacional Excavadora de oruga (formato Retroexcavadora)',
  );
  assert.equal(idDePlantilla(camion), `camion-v${PLANTILLAS_POR_TIPO.get('camioneta')!.version}`);
  const ids = PLANTILLAS.map(idDePlantilla);
  assert.equal(new Set(ids).size, ids.length, 'dos plantillas con el mismo id');
  assert.equal(PLANTILLAS.length, 13, 'cinco propias y ocho prestadas');
});

prueba('un formato prestado decide APTO o NO APTO igual que su origen', () => {
  // Spec 020 / RF-11. «No aplica» en un ítem que inmoviliza no deja la máquina
  // parada: es la salida para lo que la máquina no tiene (la cuchilla en un
  // montacargas).
  const origen = PLANTILLAS_POR_TIPO.get('motoniveladora')!;
  const prestada = PLANTILLAS_POR_TIPO.get('montacargas')!;
  const inmovilizante = origen.secciones.flatMap((s) => s.items).find((i) => i.inmoviliza)!;
  for (const valor of ['no_conforme', 'na'] as const) {
    const resultados = [origen, prestada].map(
      (p) =>
        evaluarPreoperacional(
          p,
          p.periodicidades,
          responderTodo(p, p.periodicidades, { [inmovilizante.key]: valor }),
        ).resultado,
    );
    assert.equal(resultados[0], resultados[1], `${valor}: decisiones distintas`);
    assert.equal(resultados[0], valor === 'no_conforme' ? 'no_apto' : 'apto');
  }
});

prueba('los formatos propios no cambian con los prestados', () => {
  // Spec 020 / RF-23: sin marca de préstamo, con su tipo y su título de OCC.
  for (const id of ['camioneta', 'volqueta', 'retroexcavadora', 'retrocargador', 'motoniveladora']) {
    const propia = PLANTILLAS_POR_TIPO.get(id)!;
    assert.equal(propia.prestadoDe, undefined, `${id}: marcado como prestado`);
    assert.equal(propia.tipoVehiculo, id);
    assert.ok(!propia.tituloFormato.includes('(formato'), `${id}: título cambiado`);
  }
});

prueba('ningún tipo queda sin formato hoy', () => {
  // Spec 020 / RF-20: los ocho prestados cuentan en el cumplimiento del día.
  // RF-25 —que un tipo futuro sin formato siga avisándose— lo sostiene la prueba
  // «la marca de sin formato cuadra con las plantillas»: un tipo sin plantilla
  // que no lleve `sinFormato` la hace fallar.
  for (const tipo of TIPOS_VEHICULO) {
    assert.equal(formatoPendiente(tipo.id), false, `${tipo.id}: sigue sin formato`);
  }
});

prueba('el cumplimiento del día no cuenta los equipos sin formato', () => {
  // Spec 019 / RF-21 y RF-22. Una máquina sin formato no puede tener
  // preoperacional: contarla como pendiente es una alarma que no se apaga nunca.
  const flota = [
    { id: 'v1', conFormato: true },
    { id: 'v2', conFormato: true },
    { id: 'v3', conFormato: false },
    { id: 'v4', conFormato: false },
  ];
  assert.deepEqual(cumplimientoDelDia(flota, new Set(['v1'])), {
    inspeccionables: 2,
    inspeccionados: 1,
    sinInspeccionar: 1,
    cumplimiento: 50,
  });
});

prueba('una flota solo sin formato no tiene cumplimiento', () => {
  // RF-23: ni 0% (nadie incumplió) ni 100% (nadie cumplió): sin dato.
  const r = cumplimientoDelDia([{ id: 'v1', conFormato: false }], new Set());
  assert.equal(r.cumplimiento, null);
  assert.equal(r.sinInspeccionar, 0);
});

prueba('una flota vacía no tiene cumplimiento', () => {
  const r = cumplimientoDelDia([], new Set());
  assert.equal(r.cumplimiento, null);
  assert.equal(r.inspeccionables, 0);
});

prueba('un preoperacional de un equipo fuera de la flota no pasa el cumplimiento de 100', () => {
  // Un equipo inspeccionado hoy y dado de baja después: antes contaba en el
  // numerador y no en el denominador.
  const r = cumplimientoDelDia([{ id: 'v1', conFormato: true }], new Set(['v1', 'dado-de-baja']));
  assert.equal(r.inspeccionados, 1);
  assert.equal(r.cumplimiento, 100);
});

prueba('una posición inventada no pertenece a ningún equipo', () => {
  assert.equal(posicionesDe('volqueta').some((p) => p.id === 'tandem_izquierda_trasera'), false);
  assert.deepEqual(posicionesDe('inventado'), []);
  assert.equal(nombreDePosicion('camioneta', 'delantera_izquierda'), 'Delantera izquierda');
});

prueba('se avisa cuando a la llanta le queda 30% de vida o menos', () => {
  // Spec 003 / RF-14. El acuerdo fue «cuando llegue al 30%», que en obra
  // significa 30% de vida restante: gastada al 70%. Leerlo al revés marcaría la
  // flota entera, así que esta comprobación es la que fija el sentido.
  assert.equal(hayQueCambiar(69), false);
  assert.equal(hayQueCambiar(70), true);
  assert.equal(hayQueCambiar(100), true);
  assert.equal(vidaUtilRestante(DESGASTE_PARA_CAMBIO), 30);
});

prueba('una llanta sin medir no se marca como gastada', () => {
  // Marcar en rojo lo que no se sabe hace que se deje de mirar el rojo.
  assert.equal(hayQueCambiar(null), false);
  assert.equal(hayQueCambiar(undefined), false);
  assert.equal(hayQueCambiar(0), false);
});

console.log('\nFestivos y horas de la obra\n');

prueba('los festivos de un año no se repiten', () => {
  for (const anio of [2025, 2026, 2027]) {
    const dias = festivosDe(anio);
    assert.equal(new Set(dias).size, dias.length, `${anio}: hay festivos repetidos`);
  }
  // Normalmente son dieciocho, pero dos celebraciones pueden caer en el mismo
  // lunes: en 2025 el Sagrado Corazón y San Pedro coincidieron el 30 de junio,
  // y ese año tuvo diecisiete días festivos.
  assert.equal(festivosDe(2026).length, 18);
  assert.equal(festivosDe(2025).length, 17);
  assert.ok(esFestivo('2025-06-30'));
});

prueba('los de la ley Emiliani caen siempre en lunes', () => {
  // Reyes, San José, San Pedro, Asunción, Raza, Todos los Santos y Cartagena se
  // corren al lunes siguiente; los de Semana Santa que se corren, también.
  const anio = 2026;
  const dias = festivosDe(anio);
  const fijos = new Set([
    `${anio}-01-01`,
    `${anio}-05-01`,
    `${anio}-07-20`,
    `${anio}-08-07`,
    `${anio}-12-08`,
    `${anio}-12-25`,
  ]);
  const santos = new Set([`${anio}-04-02`, `${anio}-04-03`]);
  for (const dia of dias) {
    if (fijos.has(dia) || santos.has(dia)) continue;
    assert.equal(diaDeLaSemana(dia), 1, `${dia} debería ser lunes`);
  }
});

prueba('la Semana Santa de 2026 cae donde dice el calendario', () => {
  // Anclado a una fecha comprobada: Domingo de Resurrección el 5 de abril de
  // 2026, con Jueves y Viernes Santo el 2 y el 3. Si el cálculo de la Pascua se
  // desviara una semana, todo lo demás seguiría cuadrando menos esto.
  assert.equal(domingoDePascua(2026), '2026-04-05');
  assert.ok(esFestivo('2026-04-02'));
  assert.ok(esFestivo('2026-04-03'));
  assert.equal(esFestivo('2026-04-05'), false, 'el domingo de Pascua no es festivo de ley');
});

prueba('domingos y festivos se tratan igual', () => {
  assert.ok(esDominicalOFestivo('2026-04-05')); // domingo
  assert.ok(esDominicalOFestivo('2026-01-01')); // festivo fijo
  assert.equal(esDominicalOFestivo('2026-09-09'), false); // miércoles cualquiera
});

prueba('la jornada completa son ocho horas y ninguna extra', () => {
  const d = desglosarJornada('2026-09-09', '07:30', '17:00', HORARIO_ANTERIOR);
  assert.ok(d);
  assert.equal(d.trabajados, 480);
  assert.equal(d.ordinarios, 480);
  assert.equal(d.extra, 0);
  assert.equal(d.nocturnos, 0);
  assert.equal(d.dominicalOFestivo, false);
});

prueba('el almuerzo no se cuenta como trabajado', () => {
  // Quien entra a las 13:30 no almorzó dentro de su jornada: sus tres horas y
  // media son tres horas y media, no cinco.
  const d = desglosarJornada('2026-09-09', '13:30', '17:00', HORARIO_ANTERIOR);
  assert.ok(d);
  assert.equal(d.trabajados, 210);
  assert.equal(d.extra, 0);
});

prueba('lo que pasa de la jornada es hora extra', () => {
  const d = desglosarJornada('2026-09-09', '07:30', '19:00', HORARIO_ANTERIOR);
  assert.ok(d);
  assert.equal(d.trabajados, 600); // 11 h y media menos hora y media de almuerzo
  assert.equal(d.ordinarios, 480);
  assert.equal(d.extra, 120);
  assert.equal(d.nocturnos, 0, 'a las 19:00 en punto todavía no hay recargo');
});

prueba('el recargo nocturno empieza a las siete de la noche', () => {
  // Ley 2466 de 2025: antes empezaba a las nueve. Si alguien vuelve a poner las
  // 21:00, esto es lo que lo va a decir.
  const d = desglosarJornada('2026-09-09', '13:30', '21:00', HORARIO_ANTERIOR);
  assert.ok(d);
  assert.equal(d.nocturnos, 120);
});

prueba('una jornada que cruza la medianoche se cuenta entera', () => {
  const d = desglosarJornada('2026-09-09', '20:00', '02:00', HORARIO_ANTERIOR);
  assert.ok(d);
  assert.equal(d.trabajados, 360);
  assert.equal(d.nocturnos, 360, 'de 20:00 a 02:00 todo es nocturno');
  assert.equal(d.extra, 0, 'seis horas seguidas no llegan a la jornada ordinaria');
});

prueba('trabajar en domingo queda marcado', () => {
  const d = desglosarJornada('2026-04-05', '07:30', '17:00', HORARIO_ANTERIOR);
  assert.ok(d);
  assert.equal(d.dominicalOFestivo, true);
});

prueba('un horario imposible se rechaza y no se desglosa', () => {
  assert.equal(validarHorario(null, '17:00'), 'falta_entrada');
  assert.equal(validarHorario('07:30', null), 'falta_salida');
  assert.equal(validarHorario('07:30', '07:30'), 'salida_antes');
  assert.equal(validarHorario('07:30', '01:00'), 'jornada_imposible');
  assert.equal(desglosarJornada('2026-09-09', '07:30', '07:30', HORARIO_ANTERIOR), null);
  assert.equal(minutosDeHora('25:00'), null);
});

prueba('los tramos de clima no pueden pisarse', () => {
  const bien = [
    { desde: '07:30', hasta: '10:00' },
    { desde: '10:00', hasta: '15:00' },
    { desde: '15:30', hasta: '17:30' },
  ];
  assert.equal(validarFranjas(bien), null, 'tocarse en el borde no es pisarse');

  const pisados = [
    { desde: '07:00', hasta: '11:00' },
    { desde: '10:00', hasta: '12:00' },
  ];
  assert.deepEqual(validarFranjas(pisados), { tipo: 'solape', primera: 0, segunda: 1 });
});

prueba('un tramo de clima que termina antes de empezar se rechaza', () => {
  // Al contrario que la jornada de una persona, aquí no hay medianoche que
  // cruzar: el clima se registra dentro del día de la obra.
  assert.deepEqual(validarFranjas([{ desde: '15:00', hasta: '09:00' }]), {
    tipo: 'invertida',
    indice: 0,
  });
});

prueba('los tramos de clima pueden cubrir la jornada completa', () => {
  // El ejemplo que se pidió: llovió de 7 a 10, salió el sol hasta las 3 y
  // quedó nublado hasta las 5:30.
  const dia = [
    { desde: '07:00', hasta: '10:00' },
    { desde: '10:00', hasta: '15:00' },
    { desde: '15:00', hasta: '17:30' },
  ];
  assert.equal(validarFranjas(dia), null);
  assert.equal(cubrenLaJornada(dia), true);
  assert.equal(minutosCubiertos(dia), 630);

  // Con un hueco entre las 12 y las 13:30 no se cubre.
  assert.equal(
    cubrenLaJornada([
      { desde: '07:30', hasta: '12:00' },
      { desde: '13:30', hasta: '17:00' },
    ]),
    false,
  );
});

/* ── El horario de la obra (spec 016) ── */

/** La obra del ejemplo de OCC: 8 a 12 y 2 a 6 entre semana, y el sábado por la mañana. */
const OBRA_DE_EJEMPLO: HorarioDeObra = {
  semana: [
    { desde: '08:00', hasta: '12:00' },
    { desde: '14:00', hasta: '18:00' },
  ],
  sabado: [{ desde: '08:00', hasta: '12:00' }],
};

prueba('el horario propuesto suma 44,5 horas a la semana y el del ejemplo 44', () => {
  // Spec 016 / RF-3 y RF-35. Las dos pasan del máximo legal de 42 h, y por eso las
  // obras recién migradas salen con el aviso hasta que gerencia las corrija.
  // Propuesto: 8 h × 5 entre semana más 4,5 h el sábado (7:30 a 12:00).
  assert.equal(minutosSemanales(HORARIO_PROPUESTO), 44 * 60 + 30);
  assert.equal(minutosSemanales(OBRA_DE_EJEMPLO), 44 * 60);
  assert.ok(minutosSemanales(HORARIO_PROPUESTO) > MAXIMO_MINUTOS_SEMANALES);
  // Sin sábado son 40 h, dentro de la ley.
  const sinSabado = { ...OBRA_DE_EJEMPLO, sabado: [] };
  assert.equal(minutosSemanales(sinSabado), 40 * 60);
  assert.ok(minutosSemanales(sinSabado) <= MAXIMO_MINUTOS_SEMANALES);
  // El anterior es el de siempre: 8 h también el sábado.
  assert.equal(minutosSemanales(HORARIO_ANTERIOR), 48 * 60);
});

prueba('un horario de obra mal escrito se rechaza diciendo qué día y qué tramo', () => {
  // Spec 016 / RF-1, RF-2, RF-6 y RF-7.
  assert.equal(validarHorarioDeObra(OBRA_DE_EJEMPLO), null);
  assert.equal(validarHorarioDeObra({ ...OBRA_DE_EJEMPLO, sabado: [] }), null, 'sin sábado vale');

  const invertido = validarHorarioDeObra({
    ...OBRA_DE_EJEMPLO,
    semana: [{ desde: '12:00', hasta: '08:00' }],
  });
  assert.deepEqual(invertido, { dia: 'semana', tramo: 0, tipo: 'invertido' });
  assert.equal(
    mensajeDeHorarioDeObra(invertido!),
    'El tramo 1 de lunes a viernes termina antes de empezar.',
  );

  // Durar cero es tan imposible como terminar antes (RF-6).
  assert.deepEqual(
    validarHorarioDeObra({ ...OBRA_DE_EJEMPLO, sabado: [{ desde: '08:00', hasta: '08:00' }] }),
    { dia: 'sabado', tramo: 0, tipo: 'invertido' },
  );

  const pisados = validarHorarioDeObra({
    ...OBRA_DE_EJEMPLO,
    semana: [
      { desde: '08:00', hasta: '13:00' },
      { desde: '12:00', hasta: '17:00' },
    ],
  });
  assert.deepEqual(pisados, { dia: 'semana', tramo: 1, tipo: 'se_pisan' });
  assert.equal(
    mensajeDeHorarioDeObra(pisados!),
    'Los dos tramos de lunes a viernes se pisan: el segundo empieza antes de que termine el primero.',
  );

  // Lunes a viernes siempre tiene al menos un tramo; el sábado puede no tener.
  assert.deepEqual(validarHorarioDeObra({ semana: [], sabado: [] }), {
    dia: 'semana',
    tramo: null,
    tipo: 'sin_tramos',
  });
  assert.deepEqual(
    validarHorarioDeObra({
      ...OBRA_DE_EJEMPLO,
      sabado: [
        { desde: '06:00', hasta: '08:00' },
        { desde: '08:00', hasta: '10:00' },
        { desde: '10:00', hasta: '12:00' },
      ],
    }),
    { dia: 'sabado', tramo: null, tipo: 'demasiados' },
  );
  assert.deepEqual(
    validarHorarioDeObra({ ...OBRA_DE_EJEMPLO, semana: [{ desde: '8', hasta: '12:00' }] }),
    { dia: 'semana', tramo: 0, tipo: 'hora' },
  );
  // En el panel, una hora sin elegir llega en blanco: el mensaje dice que falta.
  const sinElegir = validarHorarioDeObra({ ...OBRA_DE_EJEMPLO, sabado: [{ desde: '08:00', hasta: '' }] });
  assert.equal(mensajeDeHorarioDeObra(sinElegir!), 'Al tramo 1 de sábado le falta elegir una hora.');
});

prueba('cada día toma sus tramos: sábado el suyo, domingo y festivo los de semana', () => {
  // Spec 016 / RF-11, RF-12 y RF-13.
  assert.deepEqual(tramosDelDia(OBRA_DE_EJEMPLO, '2026-09-22'), OBRA_DE_EJEMPLO.semana); // martes
  assert.deepEqual(tramosDelDia(OBRA_DE_EJEMPLO, '2026-09-26'), OBRA_DE_EJEMPLO.sabado); // sábado
  assert.deepEqual(tramosDelDia({ ...OBRA_DE_EJEMPLO, sabado: [] }, '2026-09-26'), []);
  assert.deepEqual(tramosDelDia(OBRA_DE_EJEMPLO, '2026-09-27'), OBRA_DE_EJEMPLO.semana); // domingo
  // El 1 de mayo de 2027 es sábado y festivo: manda el festivo.
  assert.equal(diaDeLaSemana('2027-05-01'), 6);
  assert.deepEqual(tramosDelDia({ ...OBRA_DE_EJEMPLO, sabado: [] }, '2027-05-01'), OBRA_DE_EJEMPLO.semana);
});

prueba('con la jornada anterior las cifras de siempre no cambian', () => {
  // Spec 016 / RF-25. Los casos de arriba ya pasan por `HORARIO_ANTERIOR`: esto
  // añade lo que antes no se separaba. De 7:30 a 19:00 las dos horas extra son
  // las últimas (17:00 a 19:00), y las dos son diurnas.
  const d = desglosarJornada('2026-09-09', '07:30', '19:00', HORARIO_ANTERIOR);
  assert.ok(d);
  assert.deepEqual([d.extraDiurna, d.extraNocturna, d.masDeDosExtra], [120, 0, false]);
  // El sábado seguía siendo de ocho horas: un parte cerrado de un sábado no cambia.
  const sabado = desglosarJornada('2026-09-12', '07:30', '17:00', HORARIO_ANTERIOR);
  assert.deepEqual([sabado?.ordinarios, sabado?.extra], [480, 0]);
});

prueba('las extra son lo que pasa de lo programado, y se separan en diurnas y nocturnas', () => {
  // Spec 016 / RF-14 a RF-17 y RF-36. Martes, obra de 8 a 12 y de 2 a 6: de 7:00
  // a 20:00 son 13 h de presencia menos las 2 de descanso. Las 3 extra son las
  // últimas: de 5 a 7 de la tarde, diurnas; de 7 a 8, nocturna.
  const d = desglosarJornada('2026-09-22', '07:00', '20:00', OBRA_DE_EJEMPLO);
  assert.ok(d);
  assert.equal(d.trabajados, 11 * 60);
  assert.equal(d.ordinarios, 8 * 60);
  assert.equal(d.extra, 3 * 60);
  assert.equal(d.extraDiurna, 2 * 60);
  assert.equal(d.extraNocturna, 60);
  assert.equal(d.nocturnos, 60);
  assert.equal(d.nocturnosOrdinarios, 0);
  assert.equal(d.masDeDosExtra, true);
  // Justo dos horas extra no avisan: el aviso es por pasar de dos.
  assert.equal(desglosarJornada('2026-09-22', '07:00', '19:00', OBRA_DE_EJEMPLO)?.masDeDosExtra, false);
});

prueba('las extra son las últimas horas del día, aunque se haya llegado de noche', () => {
  // Spec 016 / RF-18 y RF-41. De 4:00 a 15:00 la extra es la de 2 a 3 de la tarde,
  // diurna; las dos de la madrugada son nocturnas pero ordinarias.
  const d = desglosarJornada('2026-09-22', '04:00', '15:00', OBRA_DE_EJEMPLO);
  assert.ok(d);
  assert.equal(d.trabajados, 9 * 60);
  assert.equal(d.extra, 60);
  assert.equal(d.extraDiurna, 60);
  assert.equal(d.extraNocturna, 0);
  assert.equal(d.nocturnosOrdinarios, 2 * 60);
});

prueba('un sábado en que la obra no trabaja, todo lo trabajado es extra', () => {
  // Spec 016 / RF-12.
  const d = desglosarJornada('2026-09-26', '08:00', '12:00', { ...OBRA_DE_EJEMPLO, sabado: [] });
  assert.ok(d);
  assert.deepEqual([d.trabajados, d.ordinarios, d.extraDiurna], [240, 0, 240]);
  // Con sábado de 8 a 12, esas mismas cuatro horas son ordinarias.
  assert.equal(desglosarJornada('2026-09-26', '08:00', '12:00', OBRA_DE_EJEMPLO)?.extra, 0);
});

prueba('el domingo se mide contra la jornada de lunes a viernes, con su marca', () => {
  // Spec 016 / RF-13 y RF-19.
  const d = desglosarJornada('2026-09-27', '07:00', '17:00', OBRA_DE_EJEMPLO);
  assert.ok(d);
  assert.deepEqual([d.trabajados, d.ordinarios, d.extra], [480, 480, 0]);
  assert.equal(d.dominicalOFestivo, true);
});

prueba('el descanso solo se descuenta a quien estuvo presente en él', () => {
  // Spec 016 / RF-8 y RF-14. Quien entra a las 2 no almorzó dentro de su jornada.
  assert.equal(desglosarJornada('2026-09-22', '14:00', '18:00', OBRA_DE_EJEMPLO)?.trabajados, 240);
  // Con un solo tramo no hay descanso que descontar; y las 6:00 ya no son de noche.
  const unTramo: HorarioDeObra = { semana: [{ desde: '06:00', hasta: '14:00' }], sabado: [] };
  const d = desglosarJornada('2026-09-22', '06:00', '14:00', unTramo);
  assert.deepEqual([d?.trabajados, d?.extra, d?.nocturnos], [480, 0, 0]);
});

prueba('una noche que no pasa de lo programado es ordinaria y nocturna', () => {
  // Spec 016 / RF-16, RF-18 y RF-40: la regla es por cantidad. De 8 de la noche a
  // 2 de la madrugada son 6 h, menos que las 8 programadas del martes.
  const d = desglosarJornada('2026-09-22', '20:00', '02:00', OBRA_DE_EJEMPLO);
  assert.ok(d);
  assert.deepEqual([d.trabajados, d.ordinarios, d.extra], [360, 360, 0]);
  assert.deepEqual([d.nocturnos, d.nocturnosOrdinarios], [360, 360]);
});

prueba('cada parte usa su horario: el guardado, el de siempre o el de la obra', () => {
  // Spec 016 / RF-22, RF-24 y RF-25.
  const cerrado = new Date('2026-09-20T22:00:00Z');
  const sinSabado = { ...OBRA_DE_EJEMPLO, sabado: [] };
  // Cerrado con el horario guardado: manda ese, aunque la obra haya cambiado.
  assert.deepEqual(
    horarioEfectivo({ horario: OBRA_DE_EJEMPLO, cerradoEn: cerrado, anuladoEn: null }, sinSabado),
    OBRA_DE_EJEMPLO,
  );
  // Cerrado antes de la spec 016, sin horario guardado: la jornada de siempre.
  assert.deepEqual(
    horarioEfectivo({ horario: null, cerradoEn: cerrado, anuladoEn: null }, OBRA_DE_EJEMPLO),
    HORARIO_ANTERIOR,
  );
  // Anulado sin cerrar y sin horario: solo pasa con los anulados antes de la spec,
  // porque desde ella anular también congela. La jornada de siempre.
  assert.deepEqual(
    horarioEfectivo({ horario: null, cerradoEn: null, anuladoEn: cerrado }, OBRA_DE_EJEMPLO),
    HORARIO_ANTERIOR,
  );
  // Abierto: el horario vigente de la obra.
  assert.deepEqual(
    horarioEfectivo({ horario: null, cerradoEn: null, anuladoEn: null }, OBRA_DE_EJEMPLO),
    OBRA_DE_EJEMPLO,
  );
});

prueba('una hora se elige en dos partes y solo vale con las dos', () => {
  // Spec 016 / RF-30, RF-33 y RF-34.
  assert.equal(HORAS_DEL_DIA.length, 24);
  assert.deepEqual([HORAS_DEL_DIA[0], HORAS_DEL_DIA[23]], ['00', '23']);
  assert.deepEqual(partirHora('07:30'), { hora: '07', minuto: '30' });
  assert.deepEqual(partirHora('7:30'), { hora: '07', minuto: '30' }, 'una hora vieja sin cero delante');
  assert.deepEqual(partirHora(''), { hora: null, minuto: null }, 'en blanco, como una fila nueva');
  assert.deepEqual(partirHora('lo que sea'), { hora: null, minuto: null });
  assert.equal(unirHora('07', '30'), '07:30');
  // A medio elegir no hay hora: poner «:00» solo sería un valor de antemano.
  assert.equal(unirHora('07', null), '');
  assert.equal(unirHora(null, '30'), '');
  assert.deepEqual(minutosOfrecidos(''), ['00', '15', '30', '45']);
  assert.deepEqual(minutosOfrecidos('07:30'), ['00', '15', '30', '45']);
  // Una hora guardada fuera de la rejilla se sigue ofreciendo, en su sitio.
  assert.deepEqual(minutosOfrecidos('07:10'), ['00', '10', '15', '30', '45']);
});

prueba('registrar una obra sin horario le pone el propuesto; corregirla sin horario no lo toca', () => {
  // Spec 016 / RF-3 y RF-4. La segunda mitad es la trampa de «ausente y vacío no son
  // lo mismo»: con `obraNueva.partial()` el default del horario se colaba en cada
  // corrección y corregir solo el nombre reponía el horario propuesto.
  const nueva = obraNueva.parse({ codigo: 'OBR-9', nombre: 'Prueba' });
  assert.deepEqual(nueva.horario, HORARIO_PROPUESTO);
  assert.deepEqual(obraEditada.parse({ nombre: 'Otro nombre' }), { nombre: 'Otro nombre' });
  assert.equal('horario' in obraEditada.parse({ nombre: 'Otro nombre' }), false);
  assert.deepEqual(obraEditada.parse({ horario: OBRA_DE_EJEMPLO }).horario, OBRA_DE_EJEMPLO);
});

prueba('un horario de obra inválido se rechaza con el mensaje de la regla', () => {
  // Spec 016 / RF-6 y RF-7: el contrato no inventa su propio texto.
  const pisados = {
    semana: [
      { desde: '08:00', hasta: '13:00' },
      { desde: '12:00', hasta: '17:00' },
    ],
    sabado: [],
  };
  assert.equal(
    obraEditada.safeParse({ horario: pisados }).error?.issues[0]?.message,
    'Los dos tramos de lunes a viernes se pisan: el segundo empieza antes de que termine el primero.',
  );
  assert.equal(
    obraNueva.safeParse({ codigo: 'X', nombre: 'Y', horario: { semana: [], sabado: [] } }).error
      ?.issues[0]?.message,
    'El horario de lunes a viernes necesita al menos un tramo.',
  );
});

prueba('las observaciones de una persona del parte son opcionales', () => {
  // Spec 016 / RF-26, RF-27 y RF-29.
  const base = { usuarioId: 'u1', entrada: '07:00', salida: '17:00' };
  assert.equal(personaDelParte.parse(base).observaciones, '');
  assert.equal(
    personaDelParte.parse({ ...base, observaciones: '  Llegó tarde por el bus.  ' }).observaciones,
    'Llegó tarde por el bus.',
  );
  assert.equal(personaDelParte.safeParse({ ...base, observaciones: 'x'.repeat(1001) }).success, false);
});

prueba('el parte guarda las observaciones de cada persona', () => {
  // Spec 016 / RF-26. `construirPersona` es lo que escribe el servidor.
  const persona = construirPersona(
    { usuarioId: 'u1', entrada: '07:00', salida: '17:00', observaciones: 'Salió a cita médica.' },
    'Pedro Cartagena',
    'operador',
  );
  assert.equal(persona.observaciones, 'Salió a cita médica.');
  assert.equal(
    construirPersona({ usuarioId: 'u1', entrada: '07:00', salida: '17:00' }, 'Pedro', null)
      .observaciones,
    '',
  );
});

prueba('el parte dice el horario de la obra para ese día', () => {
  // Spec 016 / RF-10.
  assert.equal(
    describirHorarioDelDia(OBRA_DE_EJEMPLO, '2026-09-22'),
    'De 08:00 a 12:00 y de 14:00 a 18:00.',
  );
  assert.equal(describirHorarioDelDia(OBRA_DE_EJEMPLO, '2026-09-26'), 'De 08:00 a 12:00.');
  assert.equal(
    describirHorarioDelDia({ ...OBRA_DE_EJEMPLO, sabado: [] }, '2026-09-26'),
    'Los sábados no se trabaja en esta obra.',
  );
  assert.equal(
    describirHorarioDelDia(OBRA_DE_EJEMPLO, '2026-09-27'),
    'Domingo o festivo: se toma la jornada de lunes a viernes, de 08:00 a 12:00 y de 14:00 a 18:00.',
  );
});

prueba('el área de una actividad es largo por ancho', () => {
  // Spec 004 / RF-58. Lo escrito a mano en el área no cuenta cuando se puede
  // calcular: si no, un 99 tecleado por error se quedaría como dato.
  const medidas = calcularDimensiones({ longitud: 3, ancho: 4, alto: null, area: 99, volumen: null });
  assert.equal(medidas.area, 12);
  assert.equal(medidas.areaCalculada, true);
});

prueba('sin cantidad escrita, la cantidad sale de la medida que corresponde a su unidad', () => {
  // Spec 004, RF-67, RF-69 y RF-74, y 021/RF-100 (antes 004/RF-68). Se resuelve sobre las
  // medidas ya resueltas: el volumen y el área son los que se ven, calculados o escritos.
  const medidas = (longitud: number | null, ancho: number | null, alto: number | null, area: number | null = null, volumen: number | null = null) =>
    calcularDimensiones({ longitud, ancho, alto, area, volumen });

  // m³ con sus tres medidas y nada escrito: el volumen.
  assert.deepEqual(resolverCantidad('m3', medidas(3, 4, 0.5), null), {
    cantidad: 6,
    cantidadCalculada: true,
    origen: 'volumen',
    calculada: 6,
  });
  // m³ sin alto: no hay volumen, se escribe a mano.
  assert.deepEqual(resolverCantidad('m3', medidas(3, 4, null), 9), {
    cantidad: 9,
    cantidadCalculada: false,
    origen: null,
    calculada: null,
  });
  // m³ con el volumen escrito a mano y sin medidas: también es «tener volumen».
  assert.deepEqual(resolverCantidad('m3', medidas(null, null, null, null, 7), null), {
    cantidad: 7,
    cantidadCalculada: true,
    origen: 'volumen',
    calculada: 7,
  });
  // m²: el área. m: la longitud.
  assert.equal(resolverCantidad('m2', medidas(3, 4, null), null).cantidad, 12);
  assert.equal(resolverCantidad('m2', medidas(3, 4, null), null).origen, 'area');
  assert.deepEqual(resolverCantidad('m', medidas(25, null, null), null), {
    cantidad: 25,
    cantidadCalculada: true,
    origen: 'longitud',
    calculada: 25,
  });
  // kg, Und y m³-km: las medidas no dan cuánto se hizo, aunque las haya.
  assert.deepEqual(resolverCantidad('kg', medidas(3, 4, 0.5), 500), {
    cantidad: 500,
    cantidadCalculada: false,
    origen: null,
    calculada: null,
  });
  assert.equal(resolverCantidad('m3_km', medidas(3, 4, 0.5), 1200).cantidad, 1200);
  // Und sin nada escrito: queda en blanco, no es obligatoria (RF-74).
  assert.deepEqual(resolverCantidad('und', medidas(null, null, null), null), {
    cantidad: null,
    cantidadCalculada: false,
    origen: null,
    calculada: null,
  });
  // Sin unidad (una actividad heredada): nada se calcula.
  assert.equal(resolverCantidad(null, medidas(3, 4, 0.5), null).cantidad, null);
  // La regla escribe las claves m3, m2 y m sin importar el catálogo: tienen que
  // seguir siendo claves del catálogo, o la cantidad dejaría de calcularse sin avisar.
  for (const clave of ['m3', 'm2', 'm']) assert.ok(IDS_UNIDAD_DE_ACTIVIDAD.includes(clave), clave);
});

prueba('la cantidad escrita gana al cálculo, y la calculada se informa al lado (021/RF-99, RF-101)', () => {
  const medidas = calcularDimensiones({ longitud: 150, ancho: 6.4, alto: 0.25, area: null, volumen: null });
  // «Suministro de sub-base, medido suelto: 312 m³» con una capa que da 240.
  assert.deepEqual(resolverCantidad('m3', medidas, 312), {
    cantidad: 312,
    cantidadCalculada: false,
    origen: 'volumen',
    calculada: 240,
  });
  // Escrita igual a la calculada: también es la escrita.
  assert.equal(resolverCantidad('m3', medidas, 240).cantidadCalculada, false);
  // Un cero escrito es una cantidad, no un «sin escribir».
  assert.equal(resolverCantidad('m3', medidas, 0).cantidad, 0);
  // m²: escrita gana al área.
  assert.equal(resolverCantidad('m2', medidas, 1000).cantidad, 1000);
  assert.equal(resolverCantidad('m2', medidas, 1000).calculada, 960);
});

prueba('a «Otra actividad» se le exige cuál fue y su unidad', () => {
  // Spec 004, RF-24 y RF-70. Cada falta bajo su campo.
  assert.deepEqual(faltasDeActividad({ otra: true, texto: '', unidad: null }), [
    { campo: 'texto', mensaje: MENSAJES_DE_ACTIVIDAD.sinCual },
    { campo: 'unidad', mensaje: MENSAJES_DE_ACTIVIDAD.sinUnidad },
  ]);
  assert.deepEqual(faltasDeActividad({ otra: true, texto: '   ', unidad: 'm3' }), [
    { campo: 'texto', mensaje: MENSAJES_DE_ACTIVIDAD.sinCual },
  ]);
  assert.deepEqual(faltasDeActividad({ otra: true, texto: 'Limpieza de derrumbe', unidad: null }), [
    { campo: 'unidad', mensaje: MENSAJES_DE_ACTIVIDAD.sinUnidad },
  ]);
  assert.deepEqual(faltasDeActividad({ otra: true, texto: 'Limpieza de derrumbe', unidad: 'm3' }), []);
  // Una actividad del presupuesto trae nombre y unidad del catálogo: no le falta nada.
  assert.deepEqual(faltasDeActividad({ otra: false, texto: null, unidad: null }), []);
  // Sin elegir cuál es (RF-83, cambio 2026-09-22): solo eso, bajo el selector; lo
  // demás no se puede saber hasta elegir.
  assert.deepEqual(faltasDeActividad({ elegida: false, otra: false, texto: null, unidad: null }), [
    { campo: 'clave', mensaje: MENSAJES_DE_ACTIVIDAD.sinElegir },
  ]);
  assert.equal(MENSAJES_DE_ACTIVIDAD.sinElegir, 'Elija la actividad.');
});

prueba('un ensayo sin observación se rechaza y «Sin observaciones» vale', () => {
  // Spec 004, RF-72.
  const falta = faltaObservacionDelEnsayo('');
  assert.ok(falta);
  assert.match(falta, /Sin observaciones/);
  assert.equal(faltaObservacionDelEnsayo('   \n  '), falta);
  assert.equal(faltaObservacionDelEnsayo(null), falta);
  assert.equal(faltaObservacionDelEnsayo('Sin observaciones'), null);
  assert.equal(faltaObservacionDelEnsayo('Densidad 98 %, lote PR 5'), null);
});

prueba('a un ensayo se le exigen sus horas, su responsable y dónde se hizo', () => {
  // Spec 004, RF-84 a RF-88 (cambio 2026-09-22). Cada falta bajo su campo.
  const completo = {
    observacion: 'Sin observaciones',
    horaInicio: '08:00',
    horaFin: '09:30',
    responsable: 'Laboratorio Geotecnia S.A.S.',
    ubicacion: { pr: 5, metros: 50 },
  };
  const campos = (ensayo: Parameters<typeof faltasDelEnsayo>[0]) =>
    faltasDelEnsayo(ensayo).map((f) => f.campo);

  assert.deepEqual(faltasDelEnsayo(completo), []);
  assert.deepEqual(faltasDelEnsayo({ ...completo, ubicacion: { lugar: 'Planta de trituración' } }), []);

  // Cada dato que falta, con su texto.
  assert.deepEqual(faltasDelEnsayo({ ...completo, horaInicio: '' }), [
    { campo: 'horaInicio', mensaje: MENSAJES_DE_ENSAYO.sinInicio },
  ]);
  // Sin fin ya no es una falta (spec 025, RF-29).
  assert.deepEqual(faltasDelEnsayo({ ...completo, horaFin: null }), []);
  assert.deepEqual(faltasDelEnsayo({ ...completo, responsable: '' }), [
    { campo: 'responsable', mensaje: MENSAJES_DE_ENSAYO.sinResponsable },
  ]);
  assert.deepEqual(campos({ ...completo, responsable: '   ' }), ['responsable']);
  assert.deepEqual(faltasDelEnsayo({ ...completo, ubicacion: null }), [
    { campo: 'ubicacion', mensaje: MENSAJES_DE_ENSAYO.sinUbicacion },
  ]);
  assert.deepEqual(faltasDelEnsayo({ ...completo, ubicacion: { pr: 5, metros: null } }), [
    { campo: 'metros', mensaje: MENSAJES_DE_ENSAYO.sinMetros },
  ]);
  assert.deepEqual(faltasDelEnsayo({ ...completo, ubicacion: { pr: null, metros: null } }), [
    { campo: 'pr', mensaje: MENSAJES_DE_ENSAYO.sinPr },
    { campo: 'metros', mensaje: MENSAJES_DE_ENSAYO.sinMetros },
  ]);
  assert.deepEqual(faltasDelEnsayo({ ...completo, ubicacion: { lugar: '  ' } }), [
    { campo: 'lugar', mensaje: MENSAJES_DE_ENSAYO.sinLugar },
  ]);
  // El PR fuera de la vía, con el texto del viaje (RF-87); los metros, cualquiera de 0 a
  // 999 (spec 025, RF-32): 30 vale, 1000 no.
  assert.deepEqual(campos({ ...completo, ubicacion: { pr: 30, metros: 30 } }), ['pr']);
  assert.deepEqual(faltasDelEnsayo({ ...completo, ubicacion: { pr: 1, metros: 1000 } }), [
    { campo: 'metros', mensaje: MENSAJES_DE_ENSAYO.metrosDelEnsayo },
  ]);
  // Sin la observación, la de siempre (RF-72).
  assert.deepEqual(faltasDelEnsayo({ ...completo, observacion: '' }), [
    { campo: 'observacion', mensaje: faltaObservacionDelEnsayo('')! },
  ]);

  // El fin tiene que ser posterior al inicio (RF-85): ni igual ni antes.
  assert.deepEqual(faltasDelEnsayo({ ...completo, horaFin: '08:00' }), [
    { campo: 'horaFin', mensaje: MENSAJES_DE_ENSAYO.finNoPosterior },
  ]);
  assert.deepEqual(campos({ ...completo, horaInicio: '10:00', horaFin: '09:30' }), ['horaFin']);
  // Una hora mal escrita no es una hora.
  assert.deepEqual(campos({ ...completo, horaInicio: '7.30' }), ['horaInicio']);

  // Todo vacío: todas a la vez, en el orden del formulario (sin el fin, spec 025).
  assert.deepEqual(campos({ observacion: '', horaInicio: '', horaFin: '', responsable: '', ubicacion: null }), [
    'horaInicio',
    'responsable',
    'ubicacion',
    'observacion',
  ]);

  // Un ensayo guardado antes del cambio se reconoce por no tener horas (RF-89).
  assert.equal(
    esEnsayoAnterior({ id: 'e-1', ensayo: 'espesor', nombre: 'Espesor', observacion: 'Sin observaciones' }),
    true,
  );
  assert.equal(
    esEnsayoAnterior({ id: 'e-2', ensayo: 'espesor', nombre: 'Espesor', ...completo }),
    false,
  );
});

prueba('sin ancho, el área es la que se escribió', () => {
  // Spec 004 / RF-60. No todas las actividades se miden en largo y ancho: una
  // limpieza de zona puede traer solo el área.
  const medidas = calcularDimensiones({ longitud: 3, ancho: null, alto: null, area: 25, volumen: null });
  assert.equal(medidas.area, 25);
  assert.equal(medidas.areaCalculada, false);
  // Y sin nada escrito, queda en blanco: cero sería inventarse una medida.
  assert.equal(
    calcularDimensiones({ longitud: 3, ancho: null, alto: null, area: null, volumen: null }).area,
    null,
  );
});

prueba('el volumen de una actividad es largo por ancho por alto', () => {
  // Spec 004 / RF-59.
  const medidas = calcularDimensiones({ longitud: 2, ancho: 3, alto: 0.5, area: null, volumen: 7 });
  assert.equal(medidas.volumen, 3);
  assert.equal(medidas.volumenCalculado, true);
  assert.equal(medidas.area, 6);
});

prueba('sin alto, el volumen es el que se escribió', () => {
  // Spec 004 / RF-60. El área sí se calcula, porque tiene sus dos factores.
  const medidas = calcularDimensiones({ longitud: 2, ancho: 3, alto: null, area: null, volumen: 40 });
  assert.equal(medidas.volumen, 40);
  assert.equal(medidas.volumenCalculado, false);
  assert.equal(medidas.area, 6);
  assert.equal(medidas.areaCalculada, true);
});

prueba('área y volumen calculados se redondean a dos decimales', () => {
  // 1,15 × 1,15 = 1,3225 y 0,1 × 0,2 da 0,020000000000000004 en coma flotante:
  // ninguno de los dos debe llegar así a la pantalla ni a la base.
  assert.equal(
    calcularDimensiones({ longitud: 1.15, ancho: 1.15, alto: null, area: null, volumen: null }).area,
    1.32,
  );
  assert.equal(
    calcularDimensiones({ longitud: 0.1, ancho: 0.2, alto: 1, area: null, volumen: null }).volumen,
    0.02,
  );
  // Un valor escrito a mano no se toca: es lo que el residente midió.
  assert.equal(
    calcularDimensiones({ longitud: null, ancho: null, alto: null, area: 10.456, volumen: null }).area,
    10.456,
  );
});

prueba('las condiciones de clima se nombran como se leen', () => {
  // Spec 004, RF-26. Hasta el 2026-09-16 este caso probaba también los materiales de
  // laboratorio, que salieron con la tarea 004/T29.
  assert.equal(nombreDeClima('lloviendo'), 'Lloviendo');
  assert.equal(nombreDeClima('inventado'), 'inventado');
});

prueba('las actividades del parte son las del presupuesto de OCC, cada una con su unidad', () => {
  // Spec 004, RF-64 a RF-66 y anexo B.
  const items = ACTIVIDADES_DEL_PRESUPUESTO.map((a) => a.item);
  assert.equal(ACTIVIDADES_DEL_PRESUPUESTO.length, 31);
  assert.equal(new Set(items).size, 31, 'un ítem repetido');
  // «otra» es la salida para lo que no está en la lista, no una actividad de ella.
  assert.ok(!items.includes(CLAVE_OTRA_ACTIVIDAD));
  // El JSON generado solo puede usar las seis claves del catálogo.
  for (const actividad of ACTIVIDADES_DEL_PRESUPUESTO) {
    assert.ok(IDS_UNIDAD_DE_ACTIVIDAD.includes(actividad.unidad), `${actividad.item}: ${actividad.unidad}`);
    assert.ok(actividad.descripcion.length > 0, actividad.item);
  }

  const unidadDe = (item: string) => etiquetaDeUnidad(actividadPorItem(item)!.unidad);
  assert.equal(unidadDe('4.1.8'), 'm³');
  assert.equal(unidadDe('10.1'), 'kg');
  assert.equal(unidadDe('12.9'), 'Und');
  assert.equal(unidadDe('13.1'), 'm³-km');
  assert.equal(unidadDe('13.9'), 'm³-km');
  assert.equal(unidadDe('6.1.18.1'), 'm²');
  assert.equal(unidadDe('14.3'), 'm');
  assert.equal(actividadPorItem('excavacion'), undefined);
  assert.equal(etiquetaDeUnidad('inventada'), 'inventada');

  // El número de ítem delante de la descripción completa (RF-78, cambio 2026-09-22;
  // revierte RF-75).
  assert.equal(
    etiquetaDeActividad(actividadPorItem('4.1.8')!),
    `4.1.8 · ${actividadPorItem('4.1.8')!.descripcion}`,
  );
  assert.ok(
    etiquetaDeActividad(actividadPorItem('4.1.8')!).startsWith(
      '4.1.8 · Excavación para estructuras varias en material común en seco. Incluye entibado.',
    ),
  );
  assert.ok(actividadPorItem('8.27')!.descripcion.endsWith('900 mm (36")'));

  // Las 31 descripciones son distintas: dos excavaciones que solo difieren al final
  // de la frase se distinguen también sin mirar el número.
  assert.equal(new Set(ACTIVIDADES_DEL_PRESUPUESTO.map((a) => a.descripcion)).size, 31);

  // Se encuentra por número o por palabras, sin tildes (RF-79, cambio 2026-09-22).
  const opciones = ACTIVIDADES_DEL_PRESUPUESTO.map((a) => ({
    valor: a.item,
    etiqueta: etiquetaDeActividad(a),
  }));
  assert.deepEqual(filtrarOpciones(opciones, '4.1.8').map((o) => o.valor), ['4.1.8']);
  assert.deepEqual(filtrarOpciones(opciones, '10.1').map((o) => o.valor), ['10.1']);
  // «4.1.9» también trae la 4.1.96, que empieza igual (caso límite del cambio).
  assert.deepEqual(filtrarOpciones(opciones, '4.1.9').map((o) => o.valor), ['4.1.9', '4.1.96']);
  assert.ok(filtrarOpciones(opciones, 'excavacion').some((o) => o.valor === '4.1.8'));
  assert.deepEqual(filtrarOpciones(opciones, 'acero').map((o) => o.valor), ['10.1']);

  // El ítem sigue siendo la clave de la opción, que es lo que viaja al servidor:
  // lo que se va es el número de la pantalla, no del registro (decisión del
  // 2026-09-17).
  assert.ok(opciones.every((o) => actividadPorItem(o.valor) !== undefined));
});

prueba('los ensayos de Control Calidad de Obra son los 17 de la guía de OCC y la humedad', () => {
  // Spec 004, RF-61 y anexo A, en su orden; la humedad, al final (026/RF-53).
  assert.deepEqual(
    ENSAYOS_DE_CALIDAD.map((e) => e.nombre),
    [
      'Granulometría',
      'Límite líquido',
      'Índice de plasticidad',
      'Equivalente de arena',
      'Azul de metileno',
      'Materia orgánica',
      'Proctor / compactación',
      'CBR sin cemento',
      'Sulfatos solubles',
      'Contenido de cemento',
      'Muestreo para resistencia',
      'Moldeo de probetas',
      'Compresión simple',
      'Densidad en campo',
      'Compactación',
      'Espesor',
      'Planicidad',
      'Humedad',
    ],
  );
  assert.equal(new Set(ENSAYOS_DE_CALIDAD.map((e) => e.id)).size, 18);
  assert.equal(nombreDeEnsayo('densidad_en_campo'), 'Densidad en campo');
  assert.equal(nombreDeEnsayo('inventado'), 'inventado');
});

prueba('cada equipo se mide con lo que le corresponde', () => {
  // Spec 004 / RF-43. La camioneta y la volqueta van por kilómetros desde la
  // spec 003; pedirles horas de motor es pedir un dato que su tablero no da.
  assert.equal(medidorDeClase('odometro'), 'odometro');
  assert.equal(medidorDeClase('horometro'), 'horometro');
  // `ambos` ya no lo usa ningún tipo, pero el enum lo admite y hay que decidir.
  assert.equal(medidorDeClase('ambos'), 'horometro');
  assert.equal(medidorDeClase(null), 'horometro');
});

prueba('el tope del avance depende del medidor', () => {
  // Spec 004 / RF-12. Veinte horas de motor son mucho pero posibles; veinte
  // horas de más en un odómetro son veinte kilómetros, que no son nada.
  assert.equal(validarAvance('horometro', 100, 120), null);
  assert.equal(validarAvance('horometro', 100, 130), 'salto_enorme');
  assert.equal(validarAvance('odometro', 1000, 1600), null);
  assert.equal(validarAvance('odometro', 1000, 2000), 'salto_enorme');
  assert.equal(validarAvance('odometro', 1000, 900), 'final_menor');
  assert.equal(validarAvance('horometro', null, 120), 'falta_inicial');
});

prueba('el mensaje del avance habla en la unidad del equipo', () => {
  assert.match(mensajeDeAvance('odometro', 'salto_enorme', 1000), /km/);
  assert.match(mensajeDeAvance('horometro', 'salto_enorme', 100), / h/);
  assert.match(mensajeDeAvance('odometro', 'final_menor', 1000), /1000 km/);
});

prueba('buscar encuentra aunque no se escriban las tildes', () => {
  // Spec 005 / RF-12. En una obra nadie escribe con tildes en un buscador, y un
  // buscador que las exige es un buscador que no se usa.
  assert.equal(normalizar('Topógrafo'), 'topografo');
  assert.equal(normalizar('  MOTONIVELADORA  '), 'motoniveladora');
  assert.equal(normalizar('Bitácoras'), 'bitacoras');
  assert.equal(normalizar('Peña'), 'pena', 'la eñe no es una ene con tilde, pero se busca igual');
});

/* ── Errores del servidor debajo de su campo (spec 007, RF-18) ── */

prueba('un duplicado dice qué campo del formulario lo causó', () => {
  // Las claves son las del contrato del formulario: así la pantalla pinta el
  // mensaje debajo del campo sin traducir nombres de índices de la base.
  assert.deepEqual(duplicadoDe('ux_obras_codigo'), {
    mensaje: 'Ya existe una obra con ese código.',
    campo: 'codigo',
  });
  assert.deepEqual(duplicadoDe('ux_usuarios_usuario'), {
    mensaje: 'Ese nombre de usuario ya está en uso.',
    campo: 'usuario',
  });
  // Spec 032, RF-10: el código interno es la placa, y el choque se pinta bajo ella.
  assert.deepEqual(duplicadoDe('ux_vehiculos_codigo'), {
    mensaje: 'Ya hay un vehículo con esa placa.',
    campo: 'placa',
  });
  // Spec 009 / RF-3: el material repetido se pinta bajo su nombre.
  assert.deepEqual(duplicadoDe('ux_almacen_material_nombre'), {
    mensaje: 'Ya hay un material con ese nombre en el almacén de esta obra.',
    campo: 'nombre',
  });
  // Spec 010 / RF-3: sitios y materiales de cantera, también bajo su nombre.
  assert.deepEqual(duplicadoDe('ux_cantera_sitio_nombre'), {
    mensaje: 'Ya hay un sitio con ese nombre en esta obra.',
    campo: 'nombre',
  });
  assert.deepEqual(duplicadoDe('ux_cantera_material_nombre'), {
    mensaje: 'Ya hay un material de cantera con ese nombre en esta obra.',
    campo: 'nombre',
  });
  // Un índice que no se conoce no inventa campo: el mensaje va arriba, como antes.
  assert.deepEqual(duplicadoDe('ux_inventado'), { mensaje: 'Ya existe un registro con esos datos.' });
  assert.deepEqual(duplicadoDe(undefined), { mensaje: 'Ya existe un registro con esos datos.' });
});

/* ── Los selectores del panel (spec 007) ── */

const TIPOS_DE_PRUEBA = [
  { valor: 'camioneta', etiqueta: 'Camioneta' },
  { valor: 'retro', etiqueta: 'Retroexcavadora', detalle: 'Maquinaria amarilla' },
  { valor: 'vol', etiqueta: 'Volqueta', detalle: 'Camión de carga' },
];

prueba('el filtro de un selector no distingue tildes ni mayúsculas', () => {
  // Spec 007 / RF-13. Escribir «camion» tiene que encontrar «Camión».
  // «Camioneta» por su rótulo, y la volqueta por su detalle: «Camión de carga».
  assert.deepEqual(filtrarOpciones(TIPOS_DE_PRUEBA, 'camion').map((o) => o.valor), [
    'camioneta',
    'vol',
  ]);
  assert.deepEqual(filtrarOpciones(TIPOS_DE_PRUEBA, 'RETRO').map((o) => o.valor), ['retro']);
  assert.deepEqual(filtrarOpciones(TIPOS_DE_PRUEBA, 'amarilla').map((o) => o.valor), ['retro']);
  // Sin texto, están todas, en su orden.
  assert.deepEqual(filtrarOpciones(TIPOS_DE_PRUEBA, '  ').map((o) => o.valor), [
    'camioneta',
    'retro',
    'vol',
  ]);
});

prueba('un filtro sin coincidencias deja la lista vacía', () => {
  // Spec 007 / RF-14. La pantalla lo dice; la regla solo no inventa opciones.
  assert.deepEqual(filtrarOpciones(TIPOS_DE_PRUEBA, 'grúa'), []);
});

prueba('el selector ofrece buscar a partir de nueve opciones', () => {
  // Spec 007 / RF-12: «más de ocho».
  assert.equal(ofreceBusqueda(8), false);
  assert.equal(ofreceBusqueda(9), true);
});

/** Una pantalla de portátil y una lista de 240 de alto, con 4 de separación y 8 de margen. */
const PANTALLA = { altoPantalla: 640, separacion: 4, margen: 8, altoMinimo: 120 };

prueba('la lista abre hacia abajo cuando cabe', () => {
  // Spec 007 / RF-3.
  assert.deepEqual(colocarLista({ ...PANTALLA, botonY: 100, botonAlto: 38, altoLista: 240 }), {
    hacia: 'abajo',
    top: 142,
    alto: 240,
  });
});

prueba('la lista abre hacia arriba si abajo no cabe y arriba sí', () => {
  // El filtro de estado al fondo de la pantalla de Vehículos: se abría fuera de la vista.
  assert.deepEqual(colocarLista({ ...PANTALLA, botonY: 560, botonAlto: 38, altoLista: 240 }), {
    hacia: 'arriba',
    top: 316,
    alto: 240,
  });
});

prueba('la lista se recorta al espacio que tiene', () => {
  // Abajo caben 200: más que el mínimo, así que se queda abajo pero más corta.
  assert.deepEqual(colocarLista({ ...PANTALLA, botonY: 390, botonAlto: 38, altoLista: 240 }), {
    hacia: 'abajo',
    top: 432,
    alto: 200,
  });
  // Arriba caben 88 y abajo 50: ninguno llega al mínimo, y va donde cabe más.
  assert.deepEqual(colocarLista({ ...PANTALLA, botonY: 100, botonAlto: 478, altoLista: 240 }), {
    hacia: 'arriba',
    top: 8,
    alto: 88,
  });
  // Nunca un alto negativo, aunque el botón esté fuera de la pantalla.
  assert.equal(colocarLista({ ...PANTALLA, botonY: 700, botonAlto: 38, altoLista: 240 }).alto >= 0, true);
});

prueba('ninguna tabla del panel se sale del ancho de la pantalla (005/RF-20, 022/RF-27)', () => {
  // Cuando una tabla se pasa, la columna que queda fuera de la vista es siempre la
  // última —la de los botones—, que es justo la que hay que pulsar. Y no se nota en
  // un monitor grande: se nota en el portátil de la obra. Por eso se cuenta aquí.
  //
  // Desde la spec 022 las columnas se encogen hasta su mínimo, y lo que se cuenta es
  // **la suma de los mínimos** contra el contenido más angosto que la spec promete:
  // ventana de 1024 con el menú plegado y la barra de desplazamiento. A más ancho,
  // las columnas vuelven a su ancho.
  const SEPARACION = Spacing.three;
  const MARGEN = Spacing.three * 2;
  const suelo = anchoDelContenido(AnchoMinimoPanel, AnchoMenuPlegado);
  assert.equal(suelo, 888);

  /**
   * El parte diario tiene **menos**: lleva el índice a la izquierda mientras el
   * contenido pase de `AnchoMinimoDosColumnas`, y sus tablas viven dentro de una
   * banda con relleno (`Spacing.four` a cada lado). En el peor caso a dos columnas
   * quedan 1000 − 220 − 24 − 48 = 708. Por debajo, el índice sube y le deja más.
   */
  const LIMITE_POR_ARCHIVO: Record<string, number> = {
    'pantalla-partes.tsx':
      AnchoMinimoDosColumnas - AnchoIndiceDeSecciones - Spacing.four - Spacing.four * 2,
  };
  assert.equal(LIMITE_POR_ARCHIVO['pantalla-partes.tsx'], 708);

  // Con las subcarpetas (spec 021: `panel/whatsapp/`): una pantalla en una carpeta
  // propia no puede quedar fuera de la cuenta.
  const carpeta = path.join(__dirname, '..', 'src', 'features', 'panel');
  const pantallas = (readdirSync(carpeta, { recursive: true }) as string[]).filter((f) =>
    f.endsWith('.tsx'),
  );

  let tablas = 0;
  for (const ruta of pantallas) {
    const archivo = path.basename(ruta);
    const fuente = readFileSync(path.join(carpeta, ruta), 'utf8');
    for (const bloque of fuente.matchAll(/const columnas[^=]*=\s*\[(.*?)\n {2}\];/gs)) {
      // Una columna por `clave:`; en cada una, su ancho y, si lo declara, su mínimo.
      const minimos = bloque[1]
        .split(/\bclave:/)
        .slice(1)
        .map((columna) => {
          const ancho = /\bancho:\s*(\d+)/.exec(columna);
          const minimo = /\banchoMinimo:\s*(\d+)/.exec(columna);
          return ancho ? anchoMinimoDeColumna(Number(ancho[1]), minimo ? Number(minimo[1]) : undefined) : null;
        })
        .filter((m): m is number => m !== null);
      if (minimos.length === 0) continue;
      tablas++;
      const gasto =
        minimos.reduce((suma, a) => suma + a, 0) + SEPARACION * (minimos.length - 1) + MARGEN;
      const limite: number = LIMITE_POR_ARCHIVO[archivo] ?? suelo;
      assert.ok(gasto <= limite, `${archivo}: la tabla gasta ${gasto} de ${limite} ya encogida`);
    }
  }

  assert.ok(tablas >= 10, `se esperaban al menos 10 tablas y se encontraron ${tablas}`);
});

prueba('una columna se encoge hasta su mínimo y no más (022/RF-27)', () => {
  // Sin mínimo propio, el 65 % de su ancho, redondeado.
  assert.equal(anchoMinimoDeColumna(200), 130);
  assert.equal(anchoMinimoDeColumna(101), 66);
  // Una columna de botones que no debe encogerse lo declara igual a su ancho.
  assert.equal(anchoMinimoDeColumna(180, 180), 180);
  // Un mínimo mayor que el ancho no tiene sentido: manda el ancho.
  assert.equal(anchoMinimoDeColumna(120, 300), 120);
});

/**
 * Relación de contraste de la WCAG entre dos colores.
 *
 * Se calcula y no se mira a ojo: el contraste es el ajuste que más fácil se
 * rompe sin que nadie lo note —basta con aclarar un gris «para que se vea más
 * suave»— y el que más caro sale en una pantalla de obra con sol de frente.
 */
function luminancia(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const canales = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

function contraste(texto: string, fondo: string): number {
  const a = luminancia(texto);
  const b = luminancia(fondo);
  const [claro, oscuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (oscuro + 0.05);
}

prueba('el texto del panel contrasta lo suficiente con su fondo', () => {
  // Spec 005 / RF-22: mínimo 4.5:1.
  const pares: [string, string, string][] = [
    ['texto principal sobre blanco', Colors.light.text, Colors.light.background],
    ['texto secundario sobre blanco', Colors.light.textSecondary, Colors.light.background],
    ['texto secundario sobre el lienzo', Colors.light.textSecondary, Panel.fondo],
    ['texto secundario sobre cabecera', Colors.light.textSecondary, Panel.fondoCabecera],
    ['texto secundario sobre fila alterna', Colors.light.textSecondary, Panel.fondoAlterno],
    ['botón principal', Panel.sobreAccion, Panel.accion],
    ['conforme', Estado.conforme, Estado.conformeFondo],
    ['no conforme', Estado.noConforme, Estado.noConformeFondo],
    ['atención', Estado.atencion, Estado.atencionFondo],
    ['información', Estado.info, Estado.infoFondo],
    ['no aplica', Estado.na, Estado.naFondo],
  ];

  for (const [que, texto, fondo] of pares) {
    const razon = contraste(texto, fondo);
    assert.ok(razon >= 4.5, `${que}: ${razon.toFixed(2)}:1, por debajo de 4.5:1`);
  }
});

prueba('las fuentes del panel viajan dentro de la aplicación (022/RF-22, RF-23, RF-33)', () => {
  // Sin internet el panel tiene que seguir viéndose igual: los archivos están en el
  // proyecto, con su licencia, y el CSS solo apunta a ellos.
  const raiz = path.join(__dirname, '..');
  const carpeta = path.join(raiz, 'public', 'fuentes');
  const archivos = readdirSync(carpeta);
  const pesos: [string, number][] = [
    ['PlusJakartaSans-Regular.ttf', 400],
    ['PlusJakartaSans-Medium.ttf', 500],
    ['PlusJakartaSans-SemiBold.ttf', 600],
    ['PlusJakartaSans-Bold.ttf', 700],
    ['PlusJakartaSans-ExtraBold.ttf', 800],
    ['SpaceGrotesk-Medium.ttf', 500],
    ['SpaceGrotesk-Bold.ttf', 700],
  ];
  for (const [archivo] of pesos) assert.ok(archivos.includes(archivo), `falta ${archivo}`);
  for (const licencia of ['OFL-PlusJakartaSans.txt', 'OFL-SpaceGrotesk.txt']) {
    assert.ok(archivos.includes(licencia), `falta ${licencia}`);
  }

  const css = readFileSync(path.join(raiz, 'src', 'features', 'panel', 'fuentes.css'), 'utf8');
  const caras = [...css.matchAll(/@font-face\s*\{(.*?)\}/gs)].map((m) => m[1]);
  assert.equal(caras.length, pesos.length, 'un @font-face por archivo');
  for (const [archivo, peso] of pesos) {
    const cara = caras.find((c) => c.includes(`/fuentes/${archivo}`));
    assert.ok(cara, `ningún @font-face carga ${archivo}`);
    assert.match(cara, new RegExp(`font-weight:\\s*${peso};`), `${archivo} sin su peso ${peso}`);
  }
  // Ni una URL de afuera: Google Fonts por enlace rompería RF-33.
  const urls = [...css.matchAll(/url\(\s*['"]?([^'")]+)/g)].map((m) => m[1]);
  assert.ok(urls.length > 0);
  for (const url of urls) assert.ok(url.startsWith('/fuentes/'), `URL ajena en fuentes.css: ${url}`);
});

/**
 * Los archivos de pantalla del panel: lo que ve el navegador de la administración.
 * El laboratorio (spec 018) solo lo usan el panel y su API; su carpeta `servidor/`
 * no pinta nada y queda fuera.
 */
function archivosDelPanel(): string[] {
  const raiz = path.join(__dirname, '..');
  const recursivo = (carpeta: string) =>
    (readdirSync(path.join(raiz, carpeta), { recursive: true }) as string[])
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => path.posix.join(carpeta, f.split(path.sep).join('/')));
  const laboratorio = readdirSync(path.join(raiz, 'src/features/laboratorio'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => `src/features/laboratorio/${f}`);
  // Spec 033: el grupo empresarial (tarjetas, menús por empresa) es solo del panel.
  return [...recursivo('src/features/panel'), ...recursivo('src/app/panel'), ...recursivo('src/features/empresas'), ...laboratorio];
}

/** Lo que le falta a un archivo del panel para estar del todo en el diseño nuevo. */
function faltasDeDiseno(fuente: string): string[] {
  const faltas: string[] = [];
  // Los colores del celular: el panel tiene los suyos en `Panel` (022/RF-34).
  if (/\bColors\.light\b/.test(fuente)) faltas.push('usa Colors.light');
  if (/\bMarca\.\w/.test(fuente)) faltas.push('usa Marca');
  // Todo objeto de estilo con tamaño de letra dice qué letra (022/RF-22, RF-23):
  // sin `fontFamily`, React Native Web pinta la del sistema.
  for (const objeto of fuente.matchAll(/\{[^{}]*\bfontSize\b[^{}]*\}/g)) {
    if (!/\bfontFamily\b/.test(objeto[0])) {
      const linea = fuente.slice(0, objeto.index).split('\n').length;
      faltas.push(`fontSize sin fontFamily (línea ${linea})`);
    }
  }
  return faltas;
}

prueba('el panel usa sus propios colores y sus propias letras (022/RF-20, RF-22, RF-34)', () => {
  const raiz = path.join(__dirname, '..');
  const archivos = archivosDelPanel();
  assert.ok(archivos.length > 40, `se esperaban más de 40 archivos y hay ${archivos.length}`);
  // Sin excepciones: el barrido de la spec 022 terminó en su tarea T15.
  for (const archivo of archivos) {
    assert.deepEqual(faltasDeDiseno(readFileSync(path.join(raiz, archivo), 'utf8')), [], archivo);
  }
});

prueba('lo del panel no se cuela en el celular (022/RF-34)', () => {
  // Las letras, el menú y la barra son del panel. Si algo fuera de él los importa,
  // el celular cambia de aspecto sin que nadie lo haya pedido.
  const raiz = path.join(__dirname, '..');
  const propios = new Set(archivosDelPanel());
  const todos = (readdirSync(path.join(raiz, 'src'), { recursive: true }) as string[])
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => path.posix.join('src', f.split(path.sep).join('/')))
    .filter((f) => !propios.has(f) && !f.startsWith('src/features/panel/'));
  assert.ok(todos.length > 50);
  const soloDelPanel =
    /from '[^']*(fuentes\.css|menu-lateral|barra-superior|estado-menu|tarjeta-de-acceso)'|import '[^']*fuentes\.css'/;
  for (const archivo of todos) {
    const fuente = readFileSync(path.join(raiz, archivo), 'utf8');
    assert.ok(!soloDelPanel.test(fuente), `${archivo} importa algo que es solo del panel`);
  }
});

prueba('la paleta nueva del panel contrasta lo suficiente (022/RNF)', () => {
  // Crema, grafito y amarillo de maquinaria. El texto pide 4,5:1 sobre cada fondo
  // donde puede caer; el amarillo solo va de fondo, con grafito encima.
  const fondos: [string, string][] = [
    ['el lienzo crema', Panel.fondo],
    ['la superficie', Panel.superficie],
    ['la cabecera', Panel.fondoCabecera],
    ['la fila alterna', Panel.fondoAlterno],
    ['la fila bajo el cursor', Panel.fondoHover],
  ];
  const pares: [string, string, string][] = [
    ...fondos.flatMap(([donde, fondo]): [string, string, string][] => [
      [`texto sobre ${donde}`, Panel.texto, fondo],
      [`texto de apoyo sobre ${donde}`, Panel.textoApoyo, fondo],
    ]),
    ['botón principal', Panel.sobreAccion, Panel.accion],
    ['botón principal presionado', Panel.sobreAccion, Panel.accionPresionada],
    ['grafito sobre el amarillo', Panel.sobreAcento, Panel.acento],
    ['grafito sobre el amarillo suave', Panel.sobreAcento, Panel.acentoSuave],
    ['texto de la barra', Panel.textoBarra, Panel.barra],
    ['texto de apoyo de la barra', Panel.textoBarraApoyo, Panel.barra],
    ['botón de la barra bajo el cursor', Panel.textoBarra, Panel.fondoBarraHover],
  ];
  for (const [que, texto, fondo] of pares) {
    const razon = contraste(texto, fondo);
    assert.ok(razon >= 4.5, `${que}: ${razon.toFixed(2)}:1, por debajo de 4.5:1`);
  }

  // El anillo de foco no es texto: le basta 3:1 (WCAG 1.4.11), pero tiene que
  // verse sobre los dos fondos donde caen los campos y los botones.
  for (const [donde, fondo] of [['el lienzo', Panel.fondo], ['la superficie', Panel.superficie]]) {
    const razon = contraste(Panel.foco, fondo);
    assert.ok(razon >= 3, `foco sobre ${donde}: ${razon.toFixed(2)}:1, por debajo de 3:1`);
  }

  // Y la regla que no se ve en una tabla de pares: el amarillo **no** sirve de
  // texto. Si alguien lo prueba sobre crema, esto le dice por qué no.
  assert.ok(contraste(Panel.acento, Panel.fondo) < 4.5);
});

prueba('están los veintitrés cargos, con slug y rótulo únicos', () => {
  // Quince de la spec 002, más Almacenista y Encargado de Planta (008/RF-14),
  // más Gerente (002/RF-13, añadido el 2026-09-19), más Controlador(a) Vial y
  // Control de Calidad (pedidos por OCC el 2026-09-23), más Laboratorista
  // (018/RF-3), más Encargado de OCC (034/RF-12), más Auxiliar de Recursos
  // Humanos (035/RF-8).
  assert.equal(CARGOS.length, 23);
  assert.equal(new Set(CARGOS.map((c) => c.id)).size, 23);
  assert.equal(new Set(CARGOS.map((c) => c.nombre)).size, 23);
});

prueba('los cargos nuevos de obra no reciben celular', () => {
  // Pedidos por OCC el 2026-09-23. Ninguno lleva máquina, así que el panel no
  // les ofrece código de activación: que esto falle significa que alguien puso
  // `operaVehiculos: true` y un controlador vial acabaría con un teléfono.
  assert.equal(nombreDeCargo('controlador_vial'), 'Controlador(a) Vial');
  assert.equal(nombreDeCargo('control_calidad'), 'Control de Calidad');
  assert.equal(operaVehiculos('controlador_vial'), false);
  assert.equal(operaVehiculos('control_calidad'), false);
  assert.equal(rolSugerido('controlador_vial'), 'operador');
  assert.equal(rolSugerido('control_calidad'), 'operador');
});

prueba('«Tecnólogo en obra» no es un cargo aparte: es el auxiliar de obra', () => {
  // OCC lo pidió como cargo nuevo el 2026-09-23 y resultó ser el mismo oficio.
  // Dos rótulos para el mismo trabajo partirían en dos el listado de personal
  // de la bitácora. El slug se quedó en `auxiliar`: ya hay personas apuntándole.
  assert.equal(nombreDeCargo('auxiliar'), 'Auxiliar de obra');
  assert.equal(cargoPorId('tecnologo_obra'), undefined);
});

prueba('el gerente propone acceso de administrador y no lleva celular', () => {
  // Spec 002 / RF-13, RF-14 y RF-15. Hasta este cambio, la gerencia era el
  // único nivel de acceso real sin un cargo que lo nombrara: había que dejarla
  // sin cargo o ponerle «Director», que dirige UNA obra y es otra cosa.
  assert.equal(nombreDeCargo('gerente'), 'Gerente');
  assert.equal(rolSugerido('gerente'), 'admin');
  // Sin máquina, sin código de activación (RF-15, que es RF-8 aplicado aquí).
  assert.equal(operaVehiculos('gerente'), false);
});

prueba('el gerente es el único cargo que propone administrador', () => {
  // Si mañana otro cargo propusiera `admin`, sería un acceso a toda la empresa
  // repartido sin querer. Que este caso falle es la señal de que alguien lo
  // hizo sin pensarlo.
  const alaGerencia = CARGOS.filter((c) => c.rolSugerido === 'admin').map((c) => c.id);
  assert.deepEqual(alaGerencia, ['gerente']);
});

prueba('almacenista y encargado de planta proponen su propio acceso', () => {
  // Spec 008 / RF-15 y RF-16.
  assert.equal(nombreDeCargo('almacenista'), 'Almacenista');
  assert.equal(rolSugerido('almacenista'), 'almacenista');
  assert.equal(nombreDeCargo('encargado_planta'), 'Encargado de Planta');
  assert.equal(rolSugerido('encargado_planta'), 'encargado_planta');
});

prueba('almacenista y encargado de planta no reciben celular', () => {
  // Spec 008 / RF-10: sin máquina, sin código de activación.
  assert.equal(operaVehiculos('almacenista'), false);
  assert.equal(operaVehiculos('encargado_planta'), false);
});

prueba('solo la dirección y las residencias entran al panel como residente', () => {
  const alPanel = CARGOS.filter((c) => c.rolSugerido === 'supervisor').map((c) => c.id);
  assert.deepEqual(alPanel, ['director', 'residente_1', 'residente_2']);
});

prueba('solo el conductor y el operador llevan máquina', () => {
  // Esta lista gobierna **tres** puertas, y por eso cambiarla se nota tanto:
  // el código de activación del celular (`personas/[id]/activacion`), quién
  // puede ser asignado a un vehículo (`asignaciones`, cerrado el 2026-09-23) y
  // quién puede conducir un viaje de cantera (`rules/cantera`).
  const conMaquina = CARGOS.filter((c) => c.operaVehiculos).map((c) => c.id);
  assert.deepEqual(conMaquina, ['conductor', 'operador']);
  // El caso que da sentido a todo esto: un cadenero no recibe celular.
  assert.equal(operaVehiculos('cadenero_1'), false);
  assert.equal(operaVehiculos('topografo'), false);
  // Y desde el 2026-09-23, tampoco se le asigna una máquina: la pantalla de
  // asignaciones filtraba por rol —que en todos estos es `operador`— en vez de
  // por cargo, así que los doce cargos de a pie aparecían en la lista.
  assert.equal(operaVehiculos('maestro'), false);
  assert.equal(operaVehiculos('siso'), false);
});

prueba('un cargo que no existe no sugiere acceso ni máquina', () => {
  assert.equal(cargoPorId('jefe_de_todo'), undefined);
  assert.equal(rolSugerido('jefe_de_todo'), 'operador');
  assert.equal(operaVehiculos('jefe_de_todo'), false);
  assert.equal(nombreDeCargo(null), 'Sin definir');
});

/* ── Almacén de obra (spec 009) ── */

prueba('están las once unidades del almacén, con id, nombre y abreviatura únicos', () => {
  // Spec 009 / RF-31: lista cerrada. Una unidad repetida con otro nombre es
  // justo el «bulto» y «bultos» que la lista existe para evitar.
  assert.equal(UNIDADES_ALMACEN.length, 11);
  assert.equal(new Set(IDS_UNIDAD).size, 11);
  assert.equal(new Set(UNIDADES_ALMACEN.map((u) => u.nombre)).size, 11);
  assert.equal(new Set(UNIDADES_ALMACEN.map((u) => u.abreviatura)).size, 11);
  assert.deepEqual(
    [...IDS_UNIDAD],
    ['bulto', 'kilogramo', 'tonelada', 'metro', 'metro_cuadrado', 'metro_cubico', 'litro', 'galon', 'unidad', 'rollo', 'caja'],
  );
});

prueba('la lista de materiales de OCC llega entera y sin repetidos', () => {
  // Spec 009 / RF-32 y RF-35, anexo A: 367 filas del documento, 351 nombres. La
  // cuenta se comprueba aquí y no en el script porque es lo que ve el almacenista.
  assert.equal(MATERIALES_DE_OCC.length, 351);
  assert.equal(new Set(MATERIALES_DE_OCC.map((m) => normalizar(m))).size, 351);
  for (const nombre of MATERIALES_DE_OCC) {
    assert.ok(nombre.trim().length > 0, 'un nombre vacío');
    assert.equal(nombre, nombre.trim());
  }

  // Tal como los escribe OCC, con sus tildes: si se perdieran, nadie los encuentra.
  for (const nombre of ['Agua', 'Cemento gris', 'Adoquín e=8cm', 'Acero PDR-60']) {
    assert.ok(MATERIALES_DE_OCC.includes(nombre), nombre);
  }

  // «Otro» es la salida para lo que no está en la lista (RF-33), no un material
  // de ella: ninguno se llama así.
  assert.ok(!MATERIALES_DE_OCC.some((m) => normalizar(m) === CLAVE_OTRO_MATERIAL));
});

prueba('un material se encuentra escribiendo parte de su nombre', () => {
  // Spec 009 / RF-36, con el mismo buscador del selector (007/RF-13).
  const opciones = MATERIALES_DE_OCC.map((m) => ({ valor: m, etiqueta: m }));
  const nombres = (texto: string) => filtrarOpciones(opciones, texto).map((o) => o.valor);

  assert.ok(nombres('cemento').includes('Cemento gris'));
  assert.ok(nombres('acero').includes('Acero PDR-60'));
  // Sin tildes y en minúsculas, que es como se escribe en una obra.
  assert.ok(nombres('adoquin').includes('Adoquín e=8cm'));
  assert.deepEqual(nombres('material que no existe'), []);
});

prueba('una unidad se nombra y se abrevia, y una desconocida no se esconde', () => {
  // Spec 009 / RF-2 y RF-31.
  assert.equal(nombreDeUnidad('metro_cubico'), 'Metro cúbico');
  assert.equal(abreviaturaDeUnidad('metro_cubico'), 'm³');
  assert.equal(abreviaturaDeUnidad('bulto'), 'bultos');
  assert.equal(nombreDeUnidad('barril'), 'barril');
});

prueba('una cantidad se lee con coma o punto y hasta dos decimales', () => {
  // Spec 009, requisito no funcional: medio bulto, 2,5 m de tubería.
  assert.equal(aCentesimas('2,5'), 250);
  assert.equal(aCentesimas('2.5'), 250);
  assert.equal(aCentesimas(' 70 '), 7000);
  assert.equal(aCentesimas('0,25'), 25);
  assert.equal(aCentesimas(2.5), 250);
  assert.equal(aCentesimas('-3'), -300);
  // Tres decimales no son una cantidad: «1.000» no se lee como un bulto.
  assert.equal(aCentesimas('0,001'), null);
  assert.equal(aCentesimas('1.000'), null);
  assert.equal(aCentesimas('abc'), null);
  assert.equal(aCentesimas(''), null);
  // La suma en centésimas no arrastra el error de la coma flotante.
  assert.equal((aCentesimas('0,1') ?? 0) + (aCentesimas('0,2') ?? 0), aCentesimas('0,3'));
});

prueba('una cantidad va y vuelve de la base sin perder nada', () => {
  // `numeric(14,2)` se escribe «2.50» y se lee igual.
  assert.equal(aDecimal(250), '2.50');
  assert.equal(aDecimal(7000), '70.00');
  assert.equal(aDecimal(5), '0.05');
  assert.equal(aDecimal(-3000), '-30.00');
  for (const centesimas of [0, 5, 250, 7000, 125075, 99999999999999]) {
    assert.equal(aCentesimas(aDecimal(centesimas)), centesimas);
  }
});

prueba('una cantidad se muestra en su unidad, igual en cualquier entorno', () => {
  assert.equal(formatearCantidad(7000, 'bulto'), '70 bultos');
  assert.equal(formatearCantidad(250, 'metro_cubico'), '2,5 m³');
  assert.equal(formatearCantidad(125075, 'kilogramo'), '1.250,75 kg');
  assert.equal(formatearCantidad(5, 'litro'), '0,05 L');
  assert.equal(formatearCantidad(-3000, 'bulto'), '−30 bultos');
});

prueba('un movimiento sin cantidad válida, con fecha futura o salida sin destino se rechaza', () => {
  // Spec 009 / RF-9, RF-10 y RF-13: cada falta en su campo, todas a la vez. Desde el
  // 2026-09-22 todo movimiento lleva además quién entregó o recibió (RF-40, RF-41).
  const hoy = '2026-09-15';
  const r = 'Juan Pérez';
  const campos = (m: Parameters<typeof validarMovimiento>[0]) =>
    validarMovimiento(m, hoy).map((f) => f.campo);

  assert.deepEqual(campos({ tipo: 'ingreso', fecha: hoy, cantidad: 0, responsable: r }), ['cantidad']);
  assert.deepEqual(campos({ tipo: 'ingreso', fecha: hoy, cantidad: -500, responsable: r }), ['cantidad']);
  assert.deepEqual(campos({ tipo: 'ingreso', fecha: hoy, cantidad: null, responsable: r }), ['cantidad']);
  assert.deepEqual(campos({ tipo: 'ingreso', fecha: '2026-09-16', cantidad: 100, responsable: r }), ['fecha']);
  assert.deepEqual(campos({ tipo: 'salida', fecha: hoy, cantidad: 3000, paraQue: '   ', responsable: r }), ['paraQue']);
  assert.deepEqual(campos({ tipo: 'salida', fecha: '2026-09-16', cantidad: 0 }), [
    'cantidad',
    'fecha',
    'paraQue',
    'responsable',
  ]);
  assert.equal(
    validarMovimiento({ tipo: 'ingreso', fecha: hoy, cantidad: 0, responsable: r }, hoy)[0]?.mensaje,
    'La cantidad tiene que ser mayor que cero.',
  );
});

prueba('un ingreso dice quién lo entregó y una salida quién la recibió', () => {
  // Spec 009 / RF-40 a RF-42 (cambio 2026-09-22). El texto cambia con el tipo, bajo el
  // mismo campo; unos espacios no son un nombre.
  const hoy = '2026-09-15';
  const ingreso = { tipo: 'ingreso' as const, fecha: hoy, cantidad: 100 };
  const salida = { tipo: 'salida' as const, fecha: hoy, cantidad: 100, paraQue: 'Cuneta PR 3' };

  for (const responsable of [undefined, null, '', '   ']) {
    assert.deepEqual(validarMovimiento({ ...ingreso, responsable }, hoy), [
      { campo: 'responsable', mensaje: MENSAJES_DE_MOVIMIENTO.sinEntregadoPor },
    ]);
    assert.deepEqual(validarMovimiento({ ...salida, responsable }, hoy), [
      { campo: 'responsable', mensaje: MENSAJES_DE_MOVIMIENTO.sinRecibidoPor },
    ]);
  }
  assert.equal(MENSAJES_DE_MOVIMIENTO.sinEntregadoPor, 'Escriba quién entregó el material.');
  assert.equal(MENSAJES_DE_MOVIMIENTO.sinRecibidoPor, 'Escriba quién recibió el material.');
  assert.deepEqual(validarMovimiento({ ...ingreso, responsable: 'Ferretería El Tornillo' }, hoy), []);
  assert.deepEqual(validarMovimiento({ ...salida, responsable: 'Juan Pérez' }, hoy), []);
});

prueba('un ingreso de hoy sin observación y una salida con destino se aceptan', () => {
  // La observación del ingreso es opcional (RF-8); un día pasado vale (RF-10).
  const hoy = '2026-09-15';
  assert.deepEqual(
    validarMovimiento({ tipo: 'ingreso', fecha: hoy, cantidad: 10000, responsable: 'Proveedor' }, hoy),
    [],
  );
  assert.deepEqual(
    validarMovimiento(
      { tipo: 'salida', fecha: '2026-09-01', cantidad: 3000, paraQue: 'Cuneta PR 3', responsable: 'Juan Pérez' },
      hoy,
    ),
    [],
  );
});

/** El recorrido de la demo de la spec 009: 100 bultos de cemento entran y salen 30. */
function movimientosDeCemento(salidaAnulada = false): MovimientoRegistrado[] {
  return [
    { id: 'm1', tipo: 'ingreso', fecha: '2026-09-10', cantidad: 10000, registradoEn: '2026-09-10T13:00:00.000Z', anulado: false },
    { id: 'm2', tipo: 'salida', fecha: '2026-09-12', cantidad: 3000, registradoEn: '2026-09-12T15:00:00.000Z', anulado: salidaAnulada },
  ];
}

prueba('el stock sale de los movimientos vigentes: 100 entran, 30 salen, quedan 70', () => {
  // Spec 009 / RF-17, RF-18 y RF-25.
  assert.deepEqual(totalesDelMaterial(movimientosDeCemento()), {
    ingresado: 10000,
    salido: 3000,
    stock: 7000,
  });
  // Anular la salida la deja de contar: el stock vuelve a 100.
  assert.deepEqual(totalesDelMaterial(movimientosDeCemento(true)), {
    ingresado: 10000,
    salido: 0,
    stock: 10000,
  });
  assert.deepEqual(totalesDelMaterial([]), { ingresado: 0, salido: 0, stock: 0 });
});

prueba('una salida mayor que el stock se rechaza diciendo cuánto queda', () => {
  // Spec 009 / RF-15. Por exactamente el stock, se acepta y queda en cero.
  assert.equal(
    rechazoDeSalida(7000, 8000, 'bulto'),
    'No alcanza: quedan 70 bultos y la salida es de 80 bultos.',
  );
  assert.equal(rechazoDeSalida(7000, 7000, 'bulto'), null);
  assert.equal(rechazoDeSalida(7000, 2550, 'bulto'), null);
});

prueba('la unidad escrita en un reporte se reconoce en la lista cerrada', () => {
  // Spec 023 / RF-30. Lo escrito de varias formas cae en el mismo slug; lo que no es
  // de la lista no se adivina.
  const casos: [string, string | null][] = [
    ['bulto', 'bulto'],
    ['Bultos', 'bulto'],
    ['Bto', 'bulto'],
    ['btos.', 'bulto'],
    ['kg', 'kilogramo'],
    ['Kilos', 'kilogramo'],
    ['toneladas', 'tonelada'],
    ['ton', 'tonelada'],
    ['mts', 'metro'],
    ['metro lineal', 'metro'],
    ['m2', 'metro_cuadrado'],
    ['m²', 'metro_cuadrado'],
    ['m3', 'metro_cubico'],
    ['M³', 'metro_cubico'],
    ['metros cúbicos', 'metro_cubico'],
    ['litros', 'litro'],
    ['galones', 'galon'],
    ['gal', 'galon'],
    ['und', 'unidad'],
    ['Unidades', 'unidad'],
    ['rollos', 'rollo'],
    ['caja', 'caja'],
    ['metro_cubico', 'metro_cubico'],
    ['varillas', null],
    ['', null],
  ];
  for (const [escrito, slug] of casos) assert.equal(unidadDeTexto(escrito), slug, escrito);
  assert.equal(unidadDeTexto(null), null);
});

prueba('el saldo de un reporte de almacén cuenta sus ingresos del mismo día o de antes', () => {
  // Spec 023 / RF-33 y RF-34. Cemento con 10 bultos en el almacén; la arena es nueva.
  const stock = (clave: string) => (clave === 'cemento' ? 1000 : 0);
  const unidad = (clave: string) => (clave === 'cemento' ? 'bulto' : 'metro_cubico');
  const faltas = (
    movimientos: { tipo: 'ingreso' | 'salida'; fecha: string; cantidad: number | null; material: string }[],
  ) => saldoDelReporte(movimientos, stock, unidad).map((f) => `${f.renglon}: ${f.mensaje}`);

  // Una salida que alcanza con el stock: nada que decir.
  assert.deepEqual(faltas([{ tipo: 'salida', fecha: '2026-10-07', cantidad: 800, material: 'cemento' }]), []);
  // La salida va antes que el ingreso en el reporte, pero el mismo día el ingreso cuenta.
  assert.deepEqual(
    faltas([
      { tipo: 'salida', fecha: '2026-10-07', cantidad: 3000, material: 'cemento' },
      { tipo: 'ingreso', fecha: '2026-10-07', cantidad: 2500, material: 'cemento' },
    ]),
    [],
  );
  // Un ingreso de un día posterior no alcanza para una salida anterior.
  assert.deepEqual(
    faltas([
      { tipo: 'salida', fecha: '2026-10-06', cantidad: 3000, material: 'cemento' },
      { tipo: 'ingreso', fecha: '2026-10-07', cantidad: 2500, material: 'cemento' },
    ]),
    ['0: No alcanza: quedan 10 bultos y la salida es de 30 bultos.'],
  );
  // Un material nuevo empieza en cero: sale solo lo que entra en el reporte.
  assert.deepEqual(
    faltas([
      { tipo: 'ingreso', fecha: '2026-10-07', cantidad: 600, material: 'arena' },
      { tipo: 'salida', fecha: '2026-10-07', cantidad: 400, material: 'arena' },
      { tipo: 'salida', fecha: '2026-10-07', cantidad: 300, material: 'arena' },
    ]),
    ['2: No alcanza: quedan 2 m³ y la salida es de 3 m³.'],
  );
  // Dos salidas que juntas superan: la que se pasa es la segunda, y la primera no se toca.
  assert.deepEqual(
    faltas([
      { tipo: 'salida', fecha: '2026-10-07', cantidad: 700, material: 'cemento' },
      { tipo: 'salida', fecha: '2026-10-07', cantidad: 700, material: 'cemento' },
    ]),
    ['1: No alcanza: quedan 3 bultos y la salida es de 7 bultos.'],
  );
  // Lo que no se puede leer (cantidad o fecha) no entra en la cuenta: su falta la dice otra regla.
  assert.deepEqual(
    faltas([
      { tipo: 'ingreso', fecha: '2026-10-07', cantidad: null, material: 'cemento' },
      { tipo: 'salida', fecha: 'ayer', cantidad: 5000, material: 'cemento' },
      { tipo: 'salida', fecha: '2026-10-07', cantidad: 1000, material: 'cemento' },
    ]),
    [],
  );
});

prueba('anular un ingreso que ya salió se rechaza; anular una salida, no', () => {
  // Spec 009 / RF-26: con 70 en stock, anular el ingreso de 100 dejaría −30.
  const [ingreso, salida] = movimientosDeCemento();
  assert.equal(
    rechazoDeAnulacion(ingreso, 7000, 'bulto'),
    'No se puede anular este ingreso: el stock quedaría en −30 bultos, porque parte de lo que ' +
      'entró ya salió. Anule antes las salidas que correspondan.',
  );
  assert.equal(rechazoDeAnulacion(salida, 7000, 'bulto'), null);
  // Con la salida ya anulada, el stock es 100 y el ingreso sí se puede anular.
  assert.equal(rechazoDeAnulacion(ingreso, 10000, 'bulto'), null);
  assert.equal(
    rechazoDeAnulacion({ ...salida, anulado: true }, 10000, 'bulto'),
    'Este movimiento ya estaba anulado.',
  );
});

prueba('un material con stock no se da de baja; sin stock, sí', () => {
  // Spec 009 / RF-6 y RF-7.
  assert.equal(
    rechazoDeBaja(1200, 'bulto'),
    'No se puede dar de baja: todavía quedan 12 bultos. Registre la salida de lo que queda antes.',
  );
  assert.equal(rechazoDeBaja(0, 'bulto'), null);
});

prueba('la unidad no cambia si hay movimientos, aunque estén anulados', () => {
  // Spec 009 / RF-5: un movimiento anulado sigue a la vista con su cantidad.
  assert.match(rechazoDeCambioDeUnidad(1, 'bulto', 'kilogramo') ?? '', /registrados en bultos/);
  assert.equal(rechazoDeCambioDeUnidad(0, 'bulto', 'kilogramo'), null);
  assert.equal(rechazoDeCambioDeUnidad(5, 'bulto', 'bulto'), null);
});

prueba('el historial va en orden de registro, con el stock que dejó cada movimiento', () => {
  // Spec 009 / RF-20 y RF-25: los anulados siguen en la lista, sin saldo.
  const otroIngreso: MovimientoRegistrado = {
    id: 'm3', tipo: 'ingreso', fecha: '2026-09-11', cantidad: 2050, registradoEn: '2026-09-13T08:00:00.000Z', anulado: false,
  };
  // Llegan desordenados; la fecha del 11 se registró después que la salida del 12.
  const historial = historialConSaldo([otroIngreso, ...movimientosDeCemento(true)]);
  assert.deepEqual(
    historial.map((m) => [m.id, m.saldo]),
    [
      ['m1', 10000],
      ['m2', null],
      ['m3', 12050],
    ],
  );
  assert.deepEqual(
    historialConSaldo(movimientosDeCemento()).map((m) => m.saldo),
    [10000, 7000],
  );
});

/** El primer mensaje que el contrato le pone a un campo, o `undefined` si pasa. */
function faltaDelContrato(
  esquema: { safeParse: (dato: unknown) => { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } },
  dato: unknown,
  campo: string,
): string | undefined {
  const resultado = esquema.safeParse(dato);
  return resultado.error?.issues.find((i) => i.path.join('.') === campo)?.message;
}

prueba('el contrato de una salida exige para qué, con el mismo texto que la regla', () => {
  // Spec 009 / RF-11 y RF-13. Una petición hecha por fuera no se salta la falta.
  const salida = { tipo: 'salida', materialId: 'mat-1', fecha: '2026-09-15', cantidad: '30', responsable: 'Juan Pérez' };
  assert.equal(
    faltaDelContrato(movimientoNuevo, salida, 'paraQue'),
    'Escriba para qué se usará lo que sale.',
  );
  assert.equal(
    faltaDelContrato(movimientoNuevo, { ...salida, paraQue: '  ' }, 'paraQue'),
    'Escriba para qué se usará lo que sale.',
  );
  const valida = movimientoNuevo.parse({ ...salida, paraQue: 'Cuneta PR 3' });
  assert.equal(valida.cantidad, 3000);
  // La salida no acepta quién la recibe ni quién la registra (RF-30): se descartan.
  assert.equal('registradoPor' in movimientoNuevo.parse({ ...salida, paraQue: 'x', registradoPor: 'otro' }), false);
});

prueba('el contrato convierte la cantidad escrita y rechaza la que no sirve', () => {
  // Spec 009 / RF-8 y RF-9, con la misma lectura que `aCentesimas`.
  const ingreso = { tipo: 'ingreso', materialId: 'mat-1', fecha: '2026-09-15', responsable: 'Proveedor' };
  const parsed = movimientoNuevo.parse({ ...ingreso, cantidad: '2,5' });
  assert.equal(parsed.cantidad, 250);
  assert.equal(parsed.tipo === 'ingreso' ? parsed.observacion : 'no', null);
  assert.equal(faltaDelContrato(movimientoNuevo, { ...ingreso, cantidad: '0' }, 'cantidad'), 'La cantidad tiene que ser mayor que cero.');
  assert.equal(faltaDelContrato(movimientoNuevo, { ...ingreso, cantidad: '1.000' }, 'cantidad'), 'Escriba la cantidad, con hasta dos decimales.');
  assert.equal(faltaDelContrato(movimientoNuevo, { ...ingreso, cantidad: 10 }, 'cantidad'), undefined);
  assert.equal(faltaDelContrato(movimientoNuevo, { ...ingreso, cantidad: '5', fecha: '15/09/2026' }, 'fecha'), 'La fecha va en formato AAAA-MM-DD.');
  assert.equal(movimientoNuevo.safeParse({ ...ingreso, tipo: 'traslado', cantidad: '5' }).success, false);
});

prueba('el contrato exige quién entregó o recibió, con el texto de la regla', () => {
  // Spec 009 / RF-40 a RF-42 (cambio 2026-09-22). Una petición hecha por fuera no se
  // salta la falta.
  const ingreso = { tipo: 'ingreso', materialId: 'mat-1', fecha: '2026-09-15', cantidad: '5' };
  const salida = { tipo: 'salida', materialId: 'mat-1', fecha: '2026-09-15', cantidad: '5', paraQue: 'Cuneta' };
  assert.equal(faltaDelContrato(movimientoNuevo, ingreso, 'responsable'), MENSAJES_DE_MOVIMIENTO.sinEntregadoPor);
  assert.equal(
    faltaDelContrato(movimientoNuevo, { ...ingreso, responsable: '  ' }, 'responsable'),
    MENSAJES_DE_MOVIMIENTO.sinEntregadoPor,
  );
  assert.equal(faltaDelContrato(movimientoNuevo, salida, 'responsable'), MENSAJES_DE_MOVIMIENTO.sinRecibidoPor);
  // Se guarda recortado; 120 caracteres caben y 121 no.
  const con = movimientoNuevo.parse({ ...salida, responsable: '  Juan Pérez ' });
  assert.equal(con.responsable, 'Juan Pérez');
  assert.equal(movimientoNuevo.safeParse({ ...ingreso, responsable: 'x'.repeat(120) }).success, true);
  assert.equal(movimientoNuevo.safeParse({ ...ingreso, responsable: 'x'.repeat(121) }).success, false);
});

prueba('el Excel del almacén trae los movimientos y las existencias como se ven en pantalla', () => {
  // Spec 009 / RF-46 a RF-50 (cambio 2026-09-22).
  const materiales: MaterialParaExportar[] = [
    { id: 'cem', obraNombre: 'Consorcio Antioquia', nombre: 'Cemento', unidad: 'bulto' },
  ];
  const base = {
    obraNombre: 'Consorcio Antioquia',
    paraQue: null,
    observacion: null,
    registradoPorNombre: 'Almacenista Uno',
    anuladoEn: null,
    anuladoPorNombre: null,
    motivoAnulacion: null,
  };
  const movimientos: MovimientoParaExportar[] = [
    // Un ingreso de antes del cambio: sin nombre.
    { ...base, id: 'm1', materialId: 'cem', materialNombre: 'Cemento', unidad: 'bulto', tipo: 'ingreso', fecha: '2026-09-10', cantidad: 10000, responsable: null, registradoEn: new Date('2026-09-10T13:00:00Z') },
    // Una salida de 2,5 con quién la recibió.
    { ...base, id: 'm2', materialId: 'cem', materialNombre: 'Cemento', unidad: 'bulto', tipo: 'salida', fecha: '2026-09-11', cantidad: 250, paraQue: 'Cuneta PR 3', responsable: 'Juan Pérez', registradoEn: new Date('2026-09-11T01:30:00Z') },
    // Un ingreso anulado: se marca y no cuenta.
    { ...base, id: 'm3', materialId: 'cem', materialNombre: 'Cemento', unidad: 'bulto', tipo: 'ingreso', fecha: '2026-09-12', cantidad: 5000, responsable: 'Proveedor', registradoEn: new Date('2026-09-12T14:00:00Z'), anuladoEn: new Date('2026-09-12T15:00:00Z'), anuladoPorNombre: 'Gerencia', motivoAnulacion: 'Se registró dos veces' },
    // De un material ya dado de baja: sale en Movimientos, no en Existencias.
    { ...base, id: 'm4', materialId: 'viejo', materialNombre: 'Arena vieja', unidad: 'metro_cubico', tipo: 'ingreso', fecha: '2026-09-01', cantidad: 300, responsable: null, registradoEn: new Date('2026-09-01T13:00:00Z') },
  ];

  const hojas = hojasDelAlmacen(movimientos, materiales);

  // Movimientos: los cuatro, con los encabezados de siempre, en orden de registro.
  assert.deepEqual(hojas.movimientos.encabezados, ENCABEZADOS_MOVIMIENTOS);
  assert.equal(hojas.movimientos.filas.length, 4);
  const columna = (nombre: string) => ENCABEZADOS_MOVIMIENTOS.indexOf(nombre);
  const [f4, f1, f2, f3] = hojas.movimientos.filas;
  assert.equal(f4[columna('Material')], 'Arena vieja');

  // La fecha es un día (un Date), la cantidad un número (2,5 y no «2,5»), RF-49.
  assert.ok(f2[columna('Fecha')] instanceof Date);
  assert.equal((f2[columna('Fecha')] as Date).toISOString(), '2026-09-11T00:00:00.000Z');
  assert.equal(f2[columna('Cantidad')], 2.5);
  assert.equal(typeof f1[columna('Cantidad')], 'number');
  assert.equal(f1[columna('Cantidad')], 100);

  // Tipo, unidad, nombre y para qué, como se leen.
  assert.equal(f2[columna('Tipo')], 'Salida');
  assert.equal(f1[columna('Tipo')], 'Ingreso');
  assert.equal(f2[columna('Unidad')], 'Bulto');
  assert.equal(f2[columna('Entregó / recibió')], 'Juan Pérez');
  assert.equal(f1[columna('Entregó / recibió')], '—', 'un movimiento anterior sale sin nombre (RF-44)');
  assert.equal(f2[columna('Para qué / observación')], 'Cuneta PR 3');
  assert.equal(f2[columna('Registró')], 'Almacenista Uno');
  // La hora de registro, en la de la obra: 01:30 UTC del 11 son las 8:30 p. m. del 10.
  assert.equal((f2[columna('Registrado el')] as Date).toISOString(), '2026-09-10T20:30:00.000Z');

  // El anulado, marcado con quién, cuándo y por qué (RF-47); los vigentes, sin eso.
  assert.equal(f3[columna('Estado')], 'Anulado');
  assert.equal(f3[columna('Anuló')], 'Gerencia');
  assert.ok(f3[columna('Anulado el')] instanceof Date);
  assert.equal(f3[columna('Motivo de la anulación')], 'Se registró dos veces');
  assert.equal(f2[columna('Estado')], 'Vigente');
  assert.equal(f2[columna('Anuló')], null);

  // Existencias: solo el material vigente, con la regla de la pantalla (RF-48): 100
  // ingresados, 2,5 salidos, el anulado no cuenta.
  assert.deepEqual(hojas.existencias.encabezados, ENCABEZADOS_EXISTENCIAS);
  assert.deepEqual(hojas.existencias.filas, [['Consorcio Antioquia', 'Cemento', 'Bulto', 100, 2.5, 97.5]]);

  // Sin movimientos ni materiales: las hojas salen, vacías (caso límite).
  const vacias = hojasDelAlmacen([], []);
  assert.deepEqual([vacias.movimientos.filas.length, vacias.existencias.filas.length], [0, 0]);

  // El nombre del archivo (RF-50).
  assert.equal(nombreDelArchivo('OBR-001', '2026-09-22'), 'almacen-OBR-001-2026-09-22.xlsx');
  assert.equal(nombreDelArchivo(null, '2026-09-22'), 'almacen-todas-las-obras-2026-09-22.xlsx');
  // Un código con espacios o signos no rompe el nombre.
  assert.equal(nombreDelArchivo('OBR 1/2', '2026-09-22'), 'almacen-OBR-1-2-2026-09-22.xlsx');
});

prueba('corregir una persona no le cambia lo que no se mandó', () => {
  // Defecto encontrado el 2026-09-22 (spec 017, T7): `personaEditada` se armaba con
  // `personaNueva.partial()`, y los defaults de `rol` («operador») y `activo` (true)
  // se aplican igual cuando el campo no viene. Corregirle el nombre a un residente lo
  // dejaba como operador y lo reactivaba. Es el mismo caso que `obraEditada` (016/T5),
  // y la regla de siempre: en un PATCH, ausente y vacío no son lo mismo.
  const soloNombre = personaEditada.parse({ nombreCompleto: 'Nombre corregido' });
  assert.deepEqual(soloNombre, { nombreCompleto: 'Nombre corregido' });
  assert.equal('rol' in soloNombre, false, 'no inventa el rol');
  assert.equal('activo' in soloNombre, false, 'no reactiva a nadie');
  assert.equal('obraId' in soloNombre, false, 'no la saca de su obra');

  // Lo que sí se manda, se respeta, con las mismas validaciones del alta.
  const cambiado = personaEditada.parse({ rol: 'almacenista', activo: false, usuario: 'Prueba.017' });
  assert.deepEqual(cambiado, { rol: 'almacenista', activo: false, usuario: 'prueba.017' });
  assert.equal(personaEditada.safeParse({ rol: 'jefe' }).success, false);
  assert.equal(personaEditada.safeParse({ usuario: 'con espacio' }).success, false);
  assert.equal(personaEditada.safeParse({ nombreCompleto: '' }).success, false);

  // Vaciar sí se puede, diciéndolo: `null` borra el documento y saca de la obra.
  assert.deepEqual(personaEditada.parse({ documento: null, obraId: null }), {
    documento: null,
    obraId: null,
  });
});

prueba('un material se registra con una unidad de la lista y nada más', () => {
  // Spec 009 / RF-2 y RF-31.
  assert.equal(
    faltaDelContrato(materialNuevo, { nombre: 'Cemento', unidad: 'bultos' }, 'unidad'),
    'Elija una unidad de la lista.',
  );
  assert.equal(faltaDelContrato(materialNuevo, { nombre: '  ', unidad: 'bulto' }, 'nombre'), 'Falta el nombre del material.');
  assert.deepEqual(materialNuevo.parse({ nombre: ' Cemento ', unidad: 'bulto' }), {
    nombre: 'Cemento',
    unidad: 'bulto',
    obraId: null,
  });
  // Corregir solo el nombre no manda la unidad: ausente es «no se toca» (RF-4).
  assert.deepEqual(materialEditado.parse({ nombre: 'Cemento gris' }), { nombre: 'Cemento gris' });
  assert.equal(materialEditado.safeParse({ unidad: 'barril' }).success, false);
});

prueba('los movimientos se filtran por periodo y por tipo, sin esconder los anulados', () => {
  // Spec 009 / RF-21. El periodo es de la fecha del movimiento, con los dos extremos.
  const todos = movimientosDeCemento(true);
  assert.deepEqual(filtrarMovimientos(todos, { tipo: 'salida' }).map((m) => m.id), ['m2']);
  assert.deepEqual(
    filtrarMovimientos(todos, { desde: '2026-09-11', hasta: '2026-09-12' }).map((m) => m.id),
    ['m2'],
  );
  assert.deepEqual(filtrarMovimientos(todos, { hasta: '2026-09-10' }).map((m) => m.id), ['m1']);
  assert.deepEqual(filtrarMovimientos(todos, {}).map((m) => m.id), ['m1', 'm2']);
  assert.deepEqual(
    filtrarMovimientos(todos, { desde: '2026-09-11', tipo: 'ingreso' }).map((m) => m.id),
    [],
  );
});

/* ── Control Cantera (spec 010) ── */

prueba('el PR se elige de 0 a 25 y los metros se escriben de 0 a 999', () => {
  // Spec 010 / RF-12; los metros, spec 026 / RF-52 (reemplaza 010/RF-13).
  assert.equal(OPCIONES_DE_PR.length, 26);
  assert.equal(OPCIONES_DE_PR[0], 0);
  assert.equal(OPCIONES_DE_PR.at(-1), 25);
  assert.equal(METROS_MAXIMOS, 999);
});

prueba('la llegada a la obra se escribe como abscisa, con los metros en tres cifras', () => {
  // Spec 010 / RF-17, precisado el 2026-09-16.
  assert.equal(formatearAbscisa(5, 300), 'PR 5 + 300');
  assert.equal(formatearAbscisa(25, 975), 'PR 25 + 975');
  assert.equal(formatearAbscisa(0, 50), 'PR 0 + 050');
  assert.equal(formatearAbscisa(0, 0), 'PR 0 + 000');
});

prueba('una abscisa incompleta nombra lo que falta y una fuera de rango se rechaza', () => {
  // Spec 010 / RF-14 y RF-16.
  const faltas = (pr: number | null, metros: number | null) =>
    validarAbscisa(pr, metros).map((f) => `${f.campo}: ${f.mensaje}`);
  assert.deepEqual(faltas(null, 300), ['pr: Falta el PR de llegada.']);
  assert.deepEqual(faltas(5, null), ['metros: Faltan los metros de llegada.']);
  assert.deepEqual(faltas(null, null), ['pr: Falta el PR de llegada.', 'metros: Faltan los metros de llegada.']);
  assert.deepEqual(faltas(26, 300), ['pr: El PR va de 0 a 25.']);
  assert.deepEqual(faltas(-1, 300), ['pr: El PR va de 0 a 25.']);
  assert.deepEqual(faltas(2.5, 300), ['pr: El PR va de 0 a 25.']);
  assert.deepEqual(faltas(5, 1000), ['metros: Los metros van de 0 a 999.']);
  assert.deepEqual(faltas(5, -1), ['metros: Los metros van de 0 a 999.']);
  assert.deepEqual(faltas(5, 2.5), ['metros: Los metros van de 0 a 999.']);
  // Los vales del 8 y 9-oct: K1+460, K1+510, K1+396 (026/RF-52).
  assert.deepEqual(faltas(1, 460), []);
  assert.deepEqual(faltas(1, 396), []);
  assert.deepEqual(faltas(25, 999), []);
  assert.deepEqual(faltas(0, 0), []);
});

/** Un viaje completo de la demo: VOL-01 de La Esperanza a la obra en PR 5 + 300. */
function viajeALaObra(): Parameters<typeof validarViaje>[0] {
  return {
    fecha: '2026-09-16',
    hora: '07:30',
    materialId: 'afirmado',
    vehiculoId: 'vol-01',
    conductorId: 'pedro',
    origenId: 'la-esperanza',
    destino: DESTINO_OBRA,
    pr: 5,
    metros: 300,
  };
}

prueba('un viaje completo a la obra o entre sitios se acepta', () => {
  // Spec 010 / RF-7, RF-11 y RF-15: de una planta a otra, sin abscisa.
  const hoy = '2026-09-16';
  assert.deepEqual(validarViaje(viajeALaObra(), hoy), []);
  assert.deepEqual(
    validarViaje({ ...viajeALaObra(), destino: 'planta-norte', pr: null, metros: null }, hoy),
    [],
  );
  // Un día pasado, y una hora de hoy todavía por llegar, valen: solo se mira el día.
  assert.deepEqual(validarViaje({ ...viajeALaObra(), fecha: '2026-09-01', hora: '23:59' }, hoy), []);
});

prueba('un viaje con fecha futura, sin conductor o entre el mismo sitio se rechaza en su campo', () => {
  // Spec 010 / RF-15, RF-18, RF-19 y RF-34.
  const hoy = '2026-09-16';
  const campos = (cambios: Partial<Parameters<typeof validarViaje>[0]>) =>
    validarViaje({ ...viajeALaObra(), ...cambios }, hoy).map((f) => `${f.campo}: ${f.mensaje}`);

  assert.deepEqual(campos({ fecha: '2026-09-17' }), ['fecha: La fecha no puede ser posterior a hoy.']);
  assert.deepEqual(campos({ conductorId: null }), ['conductorId: Elija el conductor.']);
  assert.deepEqual(campos({ hora: '7:30' }), ['hora: La hora va como HH:MM, de 00:00 a 23:59.']);
  assert.deepEqual(campos({ hora: '24:00' }), ['hora: La hora va como HH:MM, de 00:00 a 23:59.']);
  assert.deepEqual(campos({ destino: 'la-esperanza', pr: null, metros: null }), [
    'destino: El origen y el destino no pueden ser el mismo sitio.',
  ]);
  // Con otro destino, una abscisa que se quedó en el formulario no se guarda: se rechaza.
  assert.deepEqual(campos({ destino: 'planta-norte' }), [
    'pr: El PR y los metros solo se anotan cuando el destino es la obra.',
    'metros: El PR y los metros solo se anotan cuando el destino es la obra.',
  ]);
  assert.deepEqual(campos({ metros: null }), ['metros: Faltan los metros de llegada.']);
  // Todo vacío: se nombra cada campo, de una vez.
  assert.deepEqual(
    validarViaje(
      { fecha: '', hora: '', materialId: null, vehiculoId: null, conductorId: null, origenId: null, destino: null, pr: null, metros: null },
      hoy,
    ).map((f) => f.campo),
    ['fecha', 'hora', 'materialId', 'vehiculoId', 'conductorId', 'origenId', 'destino'],
  );
});

prueba('el número de vale se guarda como se escribe, sin los espacios de los extremos', () => {
  // Spec 023 / RF-42, RF-43 y RF-44.
  assert.equal(valeLimpio('F-0458'), 'F-0458');
  assert.equal(valeLimpio(' 0458 A '), '0458 A');
  assert.equal(valeLimpio('12.345'), '12.345');
  assert.equal(valeLimpio('V/0458#2'), 'V/0458#2');
  assert.equal(valeLimpio('   '), null, 'solo espacios es no tener vale');
  assert.equal(valeLimpio(''), null);
  assert.equal(valeLimpio(null), null);
  assert.equal(valeLimpio(undefined), null);
});

prueba('un vale de más de 30 caracteres se rechaza en su campo', () => {
  // Spec 023 / RF-55. El largo se mide ya limpio: los espacios de los extremos no cuentan.
  assert.equal(faltaDeVale('x'.repeat(30)), null);
  assert.equal(faltaDeVale(` ${'x'.repeat(30)} `), null);
  assert.equal(faltaDeVale('x'.repeat(31)), 'El número de vale va hasta 30 caracteres.');
  assert.equal(faltaDeVale(null), null, 'sin vale no falta nada: es opcional (RF-42)');

  const hoy = '2026-09-16';
  assert.deepEqual(validarViaje({ ...viajeALaObra(), vale: 'F-0458' }, hoy), []);
  assert.deepEqual(validarViaje({ ...viajeALaObra(), vale: null }, hoy), []);
  assert.deepEqual(
    validarViaje({ ...viajeALaObra(), vale: 'x'.repeat(31) }, hoy).map((f) => `${f.campo}: ${f.mensaje}`),
    ['vale: El número de vale va hasta 30 caracteres.'],
  );
});

prueba('un vale repetido en la obra se avisa sin distinguir mayúsculas', () => {
  // Spec 023 / RF-45 y RF-56. Solo las mayúsculas no cuentan: el guion sí.
  assert.equal(mismoVale('f-0458', 'F-0458'), true);
  assert.equal(mismoVale(' F-0458', 'F-0458 '), true);
  assert.equal(mismoVale('F-0458', 'F0458'), false);
  assert.equal(mismoVale('0458 A', '0458A'), false);
  assert.equal(mismoVale(null, null), false, 'dos viajes sin vale no son el mismo vale');

  const viajes = [
    { id: 'v1', vale: 'F-0458', anulado: true },
    { id: 'v2', vale: null, anulado: false },
    { id: 'v3', vale: 'f-0458', anulado: false },
    { id: 'v4', vale: 'F0458', anulado: false },
  ];
  assert.equal(avisoDeValeRepetido('F-0458', viajes)?.id, 'v3', 'el anulado no cuenta');
  assert.equal(avisoDeValeRepetido('F-0458', viajes, 'v3'), null, 'el propio viaje no se avisa a sí mismo');
  assert.equal(avisoDeValeRepetido('F-9999', viajes), null);
  assert.equal(avisoDeValeRepetido(null, viajes), null);
  assert.equal(avisoDeValeRepetido('   ', viajes), null);
});

prueba('solo la volqueta operativa de la obra se ofrece para un viaje', () => {
  // Spec 010 / RF-8, precisado el 2026-09-16, y sus casos límite.
  const vol01 = { obraId: 'antioquia', tipoVehiculoId: 'volqueta', estado: 'operativo', dadoDeBaja: false };
  assert.equal(volquetaElegible(vol01, 'antioquia'), true);
  assert.equal(volquetaElegible({ ...vol01, obraId: 'otra' }, 'antioquia'), false, 'trasladada');
  assert.equal(volquetaElegible({ ...vol01, obraId: null }, 'antioquia'), false, 'sin obra');
  assert.equal(volquetaElegible({ ...vol01, estado: 'en_mantenimiento' }, 'antioquia'), false);
  assert.equal(volquetaElegible({ ...vol01, estado: 'no_apto' }, 'antioquia'), false);
  assert.equal(volquetaElegible({ ...vol01, estado: 'fuera_servicio' }, 'antioquia'), false);
  assert.equal(volquetaElegible({ ...vol01, dadoDeBaja: true }, 'antioquia'), false);
  assert.equal(volquetaElegible({ ...vol01, tipoVehiculoId: 'camioneta' }, 'antioquia'), false);
});

prueba('como conductor solo sale quien conduce u opera, activo y de la obra', () => {
  // Spec 010 / RF-35. El cargo lo decide el mismo catálogo que da celular.
  const pedro = { obraId: 'antioquia', cargo: 'conductor', activo: true, dadoDeBaja: false };
  assert.equal(conductorElegible(pedro, 'antioquia'), true);
  assert.equal(conductorElegible({ ...pedro, cargo: 'operador' }, 'antioquia'), true);
  assert.equal(conductorElegible({ ...pedro, cargo: 'cadenero_1' }, 'antioquia'), false);
  assert.equal(conductorElegible({ ...pedro, cargo: 'encargado_planta' }, 'antioquia'), false);
  assert.equal(conductorElegible({ ...pedro, cargo: null }, 'antioquia'), false);
  assert.equal(conductorElegible({ ...pedro, activo: false }, 'antioquia'), false);
  assert.equal(conductorElegible({ ...pedro, dadoDeBaja: true }, 'antioquia'), false);
  assert.equal(conductorElegible({ ...pedro, obraId: 'otra' }, 'antioquia'), false);
});

prueba('los viajes se filtran por volqueta, material, origen y destino, sin esconder anulados', () => {
  // Spec 010 / RF-21 y RF-25.
  const viajes = [
    { id: 'v1', vehiculoId: 'vol-01', materialId: 'afirmado', origenId: 'esperanza', destinoId: null, destinoObra: true, anulado: false },
    { id: 'v2', vehiculoId: 'vol-02', materialId: 'afirmado', origenId: 'esperanza', destinoId: 'planta', destinoObra: false, anulado: true },
    { id: 'v3', vehiculoId: 'vol-01', materialId: 'arena', origenId: 'planta', destinoId: null, destinoObra: true, anulado: false },
  ];
  const ids = (filtro: Parameters<typeof filtrarViajes>[1]) => filtrarViajes(viajes, filtro).map((v) => v.id);
  assert.deepEqual(ids({}), ['v1', 'v2', 'v3']);
  assert.deepEqual(ids({ vehiculoId: 'vol-01' }), ['v1', 'v3']);
  assert.deepEqual(ids({ materialId: 'afirmado' }), ['v1', 'v2']);
  assert.deepEqual(ids({ origenId: 'planta' }), ['v3']);
  assert.deepEqual(ids({ destino: DESTINO_OBRA }), ['v1', 'v3']);
  assert.deepEqual(ids({ destino: 'planta' }), ['v2']);
  assert.deepEqual(ids({ vehiculoId: 'vol-01', materialId: 'arena', destino: DESTINO_OBRA }), ['v3']);
});

prueba('la bitácora dice qué pasó con la cantera, también cuando no hubo viajes', () => {
  // Spec 010 / RF-26, RF-29, RF-31 y RF-37.
  const viaje = { id: 'v1' };
  const abierta = canteraDelParte({ cerrado: false, fijados: null, vigentes: [viaje] });
  assert.deepEqual([abierta.estado, abierta.viajes.length, abierta.aviso], ['vigentes', 1, null]);

  const abiertaSinViajes = canteraDelParte({ cerrado: false, fijados: null, vigentes: [] });
  assert.equal(abiertaSinViajes.aviso, 'Todavía no hay viajes de cantera registrados para este día.');

  // Cerrada: manda lo fijado, aunque hoy haya otros vigentes (RF-30).
  const cerrada = canteraDelParte({ cerrado: true, fijados: [viaje], vigentes: [] });
  assert.deepEqual([cerrada.estado, cerrada.viajes.length, cerrada.aviso], ['fijados', 1, null]);

  const cerradaSinViajes = canteraDelParte({ cerrado: true, fijados: [], vigentes: [viaje] });
  assert.deepEqual(
    [cerradaSinViajes.estado, cerradaSinViajes.viajes.length, cerradaSinViajes.aviso],
    ['fijados', 0, 'Ese día no se registraron viajes de cantera.'],
  );

  // Cerrada antes del módulo: no se afirma que no hubo viajes.
  const antigua = canteraDelParte({ cerrado: true, fijados: null, vigentes: [viaje] });
  assert.deepEqual(
    [antigua.estado, antigua.viajes.length, antigua.aviso],
    ['antes_del_control', 0, 'Esta bitácora se cerró antes de que existiera el control de cantera.'],
  );
});

prueba('Control Cantera sale en el índice con su conteo y nunca como pendiente', () => {
  // Spec 010 / RF-28 y RF-36.
  // Sin conteo, la pantalla todavía no la pide y no sale.
  assert.equal(estadoDe(PARTE_VACIO, 'cantera'), undefined);
  // Va justo después de Control Calidad de Obra.
  const ids = seccionesDelParte({ ...PARTE_VACIO, cantera: 3 }).map((s) => s.id);
  assert.equal(ids[ids.indexOf('laboratorio') + 1], 'cantera');
  assert.deepEqual(
    { ...estadoDe({ ...PARTE_VACIO, cantera: 3 }, 'cantera') },
    { id: 'cantera', titulo: 'Control Cantera', estado: 'lleno', cuantos: 3 },
  );
  assert.equal(estadoDe({ ...PARTE_VACIO, cantera: null }, 'cantera')?.estado, 'desconocido');
  // Cero viajes: «–» y «sin viajes», no «○ sin registrar».
  const sinViajes = estadoDe({ ...PARTE_VACIO, cantera: 0 }, 'cantera');
  assert.equal(sinViajes?.estado, 'no_aplica');
  assert.equal(sinViajes?.detalle, 'sin viajes');
  // Las demás secciones no cambian por tenerla.
  assert.equal(seccionesDelParte({ ...PARTE_VACIO, cantera: 0 }).length, seccionesDelParte(PARTE_VACIO).length + 1);
});

prueba('el contrato del viaje exige la abscisa con la obra y la rechaza con un sitio', () => {
  // Spec 010 / RF-11, RF-14, RF-15, RF-16, RF-18 y RF-34. Mismos textos que la regla.
  const base = {
    fecha: '2026-09-16',
    hora: '07:30',
    materialId: 'afirmado',
    vehiculoId: 'vol-01',
    conductorId: 'pedro',
    origenId: 'la-esperanza',
  };
  const aLaObra = viajeNuevo.parse({ ...base, destino: DESTINO_OBRA, pr: 5, metros: 300 });
  assert.deepEqual([aLaObra.pr, aLaObra.metros, aLaObra.obraId], [5, 300, null]);

  const faltas = (dato: unknown) =>
    viajeNuevo.safeParse(dato).error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? [];

  assert.deepEqual(faltas({ ...base, destino: DESTINO_OBRA, pr: 5 }), [
    'metros: Faltan los metros de llegada.',
  ]);
  assert.deepEqual(faltas({ ...base, destino: DESTINO_OBRA, pr: 5, metros: 1200 }), [
    'metros: Los metros van de 0 a 999.',
  ]);
  assert.deepEqual(faltas({ ...base, destino: DESTINO_OBRA, pr: 5, metros: 310 }), []);
  assert.deepEqual(faltas({ ...base, destino: 'planta', pr: 5, metros: null }), [
    'pr: El PR y los metros solo se anotan cuando el destino es la obra.',
  ]);
  assert.deepEqual(faltas({ ...base, destino: 'la-esperanza' }), [
    'destino: El origen y el destino no pueden ser el mismo sitio.',
  ]);
  assert.deepEqual(faltas({ ...base, conductorId: '', destino: 'planta' }), [
    'conductorId: Elija el conductor.',
  ]);
  // Un viaje entre sitios sin abscisa pasa, con pr y metros en null.
  const entreSitios = viajeNuevo.parse({ ...base, destino: 'planta' });
  assert.deepEqual([entreSitios.pr, entreSitios.metros], [null, null]);
});

prueba('sitios y materiales de cantera se registran con nombre, y el sitio con su tipo', () => {
  // Spec 010 / RF-1, RF-2 y RF-4.
  assert.deepEqual(sitioNuevo.parse({ nombre: ' La Esperanza ', tipo: 'cantera' }), {
    nombre: 'La Esperanza',
    tipo: 'cantera',
    obraId: null,
  });
  assert.equal(
    sitioNuevo.safeParse({ nombre: 'La Esperanza', tipo: 'botadero' }).error?.issues[0]?.message,
    'Elija si es cantera, planta u otro.',
  );
  assert.equal(
    materialDeCanteraNuevo.safeParse({ nombre: '  ' }).error?.issues[0]?.message,
    'Falta el nombre del material.',
  );
  // Corregir solo el nombre no manda el tipo: ausente es «no se toca».
  assert.deepEqual(sitioEditado.parse({ nombre: 'La Esperanza 2' }), { nombre: 'La Esperanza 2' });
  assert.deepEqual(materialDeCanteraEditado.parse({}), {});
});

/* ── Ordenar la tabla de Personas (spec 015) ── */

console.log('\nOrdenar tablas del panel\n');

interface FilaDeOrden {
  nombre: string;
  cargo: string | null;
  documento: string | null;
}

const FILAS_DE_ORDEN: FilaDeOrden[] = [
  { nombre: 'Carlos Peña', cargo: 'Operador', documento: '10' },
  { nombre: 'Ana Ruiz', cargo: null, documento: '9' },
  { nombre: 'álvaro Díaz', cargo: 'Topógrafo', documento: null },
  { nombre: 'Beatriz Gómez', cargo: 'operador', documento: '100' },
  { nombre: 'Álvarez Soto', cargo: 'Almacenista', documento: '' },
];

const nombresDe = (filas: FilaDeOrden[]) => filas.map((f) => f.nombre);
const porNombre = (f: FilaDeOrden) => f.nombre;

prueba('ordenar no distingue tildes ni mayúsculas', () => {
  // Spec 015 / RF-12. «álvaro» en minúscula y con tilde va junto a «Álvarez», no al final.
  assert.deepEqual(nombresDe(ordenarFilas(FILAS_DE_ORDEN, porNombre, 'asc', porNombre)), [
    'Álvarez Soto',
    'álvaro Díaz',
    'Ana Ruiz',
    'Beatriz Gómez',
    'Carlos Peña',
  ]);
});

prueba('las filas sin dato quedan al final en los dos sentidos', () => {
  // Spec 015 / RF-13. Sin cargo (null) y sin documento ('') son lo mismo: vacío.
  const porCargo = (f: FilaDeOrden) => f.cargo;
  assert.deepEqual(nombresDe(ordenarFilas(FILAS_DE_ORDEN, porCargo, 'asc', porNombre)).at(-1), 'Ana Ruiz');
  assert.deepEqual(nombresDe(ordenarFilas(FILAS_DE_ORDEN, porCargo, 'desc', porNombre)).at(-1), 'Ana Ruiz');
  // Los dos sin documento van detrás de todos los que lo tienen, en cualquier sentido,
  // y entre ellos por nombre.
  const porDocumento = (f: FilaDeOrden) => f.documento;
  for (const sentido of ['asc', 'desc'] as const) {
    const ultimos = nombresDe(ordenarFilas(FILAS_DE_ORDEN, porDocumento, sentido, porNombre));
    assert.deepEqual(ultimos.slice(-2), ['Álvarez Soto', 'álvaro Díaz']);
  }
});

prueba('un empate se resuelve por nombre, de la A a la Z, en los dos sentidos', () => {
  // Spec 015, casos límite: dos «operador» (uno en mayúscula) quedan juntos y por nombre.
  const porCargo = (f: FilaDeOrden) => f.cargo;
  const asc = nombresDe(ordenarFilas(FILAS_DE_ORDEN, porCargo, 'asc', porNombre));
  assert.deepEqual(asc, ['Álvarez Soto', 'Beatriz Gómez', 'Carlos Peña', 'álvaro Díaz', 'Ana Ruiz']);
  const desc = nombresDe(ordenarFilas(FILAS_DE_ORDEN, porCargo, 'desc', porNombre));
  assert.deepEqual(desc, ['álvaro Díaz', 'Beatriz Gómez', 'Carlos Peña', 'Álvarez Soto', 'Ana Ruiz']);
});

prueba('los documentos se ordenan como números, no como texto', () => {
  // «9» antes de «10» y «10» antes de «100»: ordenar texto pondría «10», «100», «9».
  const porDocumento = (f: FilaDeOrden) => f.documento;
  assert.deepEqual(
    ordenarFilas(FILAS_DE_ORDEN, porDocumento, 'asc', porNombre)
      .map((f) => f.documento)
      .slice(0, 3),
    ['9', '10', '100'],
  );
});

prueba('pulsar una columna ordena A→Z, y pulsarla otra vez invierte', () => {
  // Spec 015 / RF-9 y RF-10.
  const inicial: Orden = { clave: 'nombre', sentido: 'asc' };
  assert.deepEqual(ordenTrasPulsar(inicial, 'cargo'), { clave: 'cargo', sentido: 'asc' });
  assert.deepEqual(ordenTrasPulsar(inicial, 'nombre'), { clave: 'nombre', sentido: 'desc' });
  assert.deepEqual(ordenTrasPulsar({ clave: 'cargo', sentido: 'desc' }, 'cargo'), {
    clave: 'cargo',
    sentido: 'asc',
  });
  // Cambiar de columna estando en Z→A vuelve a empezar por A→Z.
  assert.deepEqual(ordenTrasPulsar({ clave: 'cargo', sentido: 'desc' }, 'obra'), {
    clave: 'obra',
    sentido: 'asc',
  });
});

prueba('un orden guardado ilegible o de una columna que ya no existe vuelve al de siempre', () => {
  // Spec 015 / RF-16 y RF-17. Lo guardado en el navegador puede venir de otra
  // versión del panel o estar roto; nunca debe dejar la tabla sin orden.
  const porDefecto: Orden = { clave: 'nombre', sentido: 'asc' };
  const claves = ['nombre', 'cargo', 'obra'];
  assert.deepEqual(leerOrdenGuardado('{"clave":"cargo","sentido":"desc"}', claves, porDefecto), {
    clave: 'cargo',
    sentido: 'desc',
  });
  assert.deepEqual(leerOrdenGuardado(null, claves, porDefecto), porDefecto);
  assert.deepEqual(leerOrdenGuardado('no es json', claves, porDefecto), porDefecto);
  assert.deepEqual(leerOrdenGuardado('{"clave":"sueldo","sentido":"asc"}', claves, porDefecto), porDefecto);
  assert.deepEqual(leerOrdenGuardado('{"clave":"cargo","sentido":"al revés"}', claves, porDefecto), porDefecto);
  assert.deepEqual(leerOrdenGuardado('["cargo","asc"]', claves, porDefecto), porDefecto);
  assert.deepEqual(leerOrdenGuardado('null', claves, porDefecto), porDefecto);
});

prueba('ordenar no cambia la lista que recibe', () => {
  // La lista viene del estado de la pantalla; ordenarla en su sitio la corrompería.
  const copia = FILAS_DE_ORDEN.map((f) => f.nombre);
  ordenarFilas(FILAS_DE_ORDEN, porNombre, 'desc', porNombre);
  assert.deepEqual(nombresDe(FILAS_DE_ORDEN), copia);
});

/* ── Laboratorio: granulometría (spec 018) ── */

console.log('\nLaboratorio: granulometría\n');

prueba('la serie de tamices es la del formato, de mayor a menor y con el fondo al final', () => {
  // Anexo B de la spec: los quince tamices del LAB-FR-01-2025 y el fondo.
  assert.equal(SERIE_DE_TAMICES.length, 16);
  assert.deepEqual(
    SERIE_DE_TAMICES.map((t) => t.nombre),
    ['2"', '1½"', '1"', '¾"', '½"', '⅜"', 'N.º 4', 'N.º 8', 'N.º 10', 'N.º 16', 'N.º 30', 'N.º 40', 'N.º 50', 'N.º 100', 'N.º 200', 'Fondo'],
  );

  const fondo = SERIE_DE_TAMICES[SERIE_DE_TAMICES.length - 1];
  assert.equal(fondo.id, 'fondo');
  assert.equal(fondo.mm, null);

  const aberturas = TAMICES_CON_ABERTURA.map((t) => t.mm);
  assert.equal(aberturas.length, 15);
  for (let i = 1; i < aberturas.length; i++) {
    assert.ok(aberturas[i] < aberturas[i - 1], `${TAMICES_CON_ABERTURA[i].nombre} no es menor que el anterior`);
  }

  // Los id son la llave con que un ensayo guarda sus masas: no pueden repetirse.
  assert.equal(new Set(SERIE_DE_TAMICES.map((t) => t.id)).size, 16);
});

prueba('cada franja del catálogo apunta a tamices que existen y tiene límites posibles', () => {
  const conAbertura = new Set<string>(TAMICES_CON_ABERTURA.map((t) => t.id));
  assert.ok(FRANJAS_GRANULOMETRICAS.length > 0);
  assert.equal(new Set(FRANJAS_GRANULOMETRICAS.map((f) => f.id)).size, FRANJAS_GRANULOMETRICAS.length);

  for (const franja of FRANJAS_GRANULOMETRICAS) {
    const limites = Object.entries(franja.limites);
    assert.ok(limites.length > 0, `${franja.id} no controla ningún tamiz`);
    for (const [tamiz, limite] of limites) {
      // El fondo no tiene «% pasa»: ninguna franja puede controlarlo.
      assert.ok(conAbertura.has(tamiz), `${franja.id} apunta a un tamiz que no existe: ${tamiz}`);
      assert.ok(0 <= limite.min && limite.min <= limite.max && limite.max <= 100, `${franja.id}/${tamiz}`);
    }
  }
});

prueba('la franja SBG-50 tiene los límites del formato de laboratorio', () => {
  // Anexo A: las columnas «Límite inferior» y «Límite superior» del Excel (Q36:R45).
  const franja = franjaPorId('sbg_50');
  assert.ok(franja);
  assert.equal(franja.nombre, 'Subbase granular SBG-50');
  assert.deepEqual(
    TAMICES_CON_ABERTURA.flatMap((t) => {
      const limite = franja.limites[t.id];
      return limite ? [[t.nombre, limite.min, limite.max]] : [];
    }),
    [
      ['2"', 100, 100],
      ['1½"', 70, 95],
      ['1"', 60, 90],
      ['½"', 45, 75],
      ['⅜"', 40, 70],
      ['N.º 4', 25, 55],
      ['N.º 10', 15, 40],
      ['N.º 40', 6, 25],
      ['N.º 100', 3, 18],
      ['N.º 200', 2, 15],
    ],
  );
  assert.equal(franjaPorId('no_existe'), undefined);
});

/** El ensayo del Excel LAB-FR-01-2025 (anexo C de la spec 018). */
function ensayoDelExcel(): EntradaGranulometria {
  return {
    masas: { humeda: 6830, seca: 6621, tara: 0, lavada: null },
    retenidos: {
      t_2: 0,
      t_1_1_2: 895.1,
      t_1: 1094.9,
      t_3_4: 565.3,
      t_1_2: 767.5,
      t_3_8: 375.6,
      n_4: 792.9,
      n_8: 444.7,
      n_10: 110.1,
      n_16: 248.5,
      n_30: 409.8,
      n_40: 369.7,
      n_50: 181.2,
      n_100: 100.5,
      n_200: 40.8,
      fondo: 8.2,
    },
  };
}

const aDos = (valor: number) => Math.round(valor * 100) / 100;

prueba('con las masas del Excel, el cálculo da los mismos porcentajes que la hoja', () => {
  const resultado = calcularGranulometria(ensayoDelExcel());
  assert.ok(resultado.completo);

  // RF-45: masa inicial seca menos la tara.
  assert.equal(resultado.masaSinTara, 6621);
  // RF-44: (6830 − 6621) / 6621 × 100 = 3,1566…, que se muestra con un decimal.
  assert.equal(Math.round((resultado.humedad ?? 0) * 10) / 10, 3.2);

  // RF-46 a RF-48: los quince «% pasa» de la columna F del Excel, a dos decimales.
  assert.deepEqual(
    resultado.renglones.filter((r) => r.tamiz !== 'fondo').map((r) => aDos(r.pasa ?? -1)),
    [100, 86.48, 69.94, 61.41, 49.81, 44.14, 32.17, 25.45, 23.79, 20.03, 13.84, 8.26, 5.52, 4.01, 3.39],
  );
  // El % retenido y el acumulado del 1½", también como la hoja (D16 y E16).
  const unoYMedio = resultado.renglones[1];
  assert.equal(aDos(unoYMedio.porcentajeRetenido), 13.52);
  assert.equal(aDos(unoYMedio.retenidoAcumulado), 13.52);
  assert.equal(aDos(resultado.renglones[2].retenidoAcumulado), 30.06);

  // RF-52: el fondo lleva su retenido, pero no «% pasa». La hoja mostraba 3,27.
  const fondo = resultado.renglones[resultado.renglones.length - 1];
  assert.equal(fondo.tamiz, 'fondo');
  assert.equal(fondo.pasa, null);
  assert.equal(aDos(fondo.retenidoAcumulado), 96.73);

  assert.equal(aDos(resultado.sumaRetenida), 6404.8);

  // RF-49 y RF-50: los que la hoja traía escritos a mano, ahora calculados.
  assert.deepEqual(resultado.tamanoMaximo, { tamiz: 't_2' });
  assert.equal(resultado.tamanoMaximoNominal, 't_1_1_2');
});

prueba('la tara se descuenta antes de sacar los porcentajes', () => {
  const entrada = ensayoDelExcel();
  entrada.masas = { humeda: 7330, seca: 7121, tara: 500, lavada: null };
  const resultado = calcularGranulometria(entrada);
  assert.ok(resultado.completo);
  assert.equal(resultado.masaSinTara, 6621);
  assert.equal(aDos(resultado.renglones[1].pasa ?? -1), 86.48);
});

prueba('si el primer tamiz ya retiene, el tamaño máximo es mayor que la serie', () => {
  // RF-51: no hay tamiz de la serie por el que pase el 100 %.
  const entrada = ensayoDelExcel();
  entrada.retenidos = { ...entrada.retenidos, t_2: 120 };
  const resultado = calcularGranulometria(entrada);
  assert.ok(resultado.completo);
  assert.deepEqual(resultado.tamanoMaximo, { mayorQue: 't_2' });
  assert.equal(resultado.tamanoMaximoNominal, 't_2');
});

prueba('el tamaño máximo es el tamiz más pequeño por el que todavía pasa todo', () => {
  // Nada retenido hasta el ½": el máximo es el ½" y el nominal, el ⅜".
  const entrada = ensayoDelExcel();
  entrada.retenidos = { ...entrada.retenidos, t_2: 0, t_1_1_2: 0, t_1: 0, t_3_4: 0, t_1_2: 0 };
  const resultado = calcularGranulometria(entrada);
  assert.ok(resultado.completo);
  assert.deepEqual(resultado.tamanoMaximo, { tamiz: 't_1_2' });
  assert.equal(resultado.tamanoMaximoNominal, 't_3_8');
});

prueba('sin la masa húmeda no hay humedad, pero sí porcentajes', () => {
  // La humedad es informativa: no entra en ningún otro cálculo (RF-44).
  const entrada = ensayoDelExcel();
  entrada.masas = { ...entrada.masas, humeda: null };
  const resultado = calcularGranulometria(entrada);
  assert.ok(resultado.completo);
  assert.equal(resultado.humedad, null);
});

prueba('si falta una masa necesaria, el cálculo dice qué falta en vez de dar porcentajes', () => {
  // RF-56.
  const sinSeca = ensayoDelExcel();
  sinSeca.masas = { ...sinSeca.masas, seca: null, tara: null };
  const faltante = calcularGranulometria(sinSeca);
  assert.equal(faltante.completo, false);
  assert.ok(!faltante.completo);
  assert.deepEqual(faltante.faltan, ['la masa inicial seca', 'la tara']);

  const sinUnTamiz = ensayoDelExcel();
  sinUnTamiz.retenidos = { ...sinUnTamiz.retenidos, n_40: null, fondo: undefined };
  const incompleto = calcularGranulometria(sinUnTamiz);
  assert.ok(!incompleto.completo);
  assert.deepEqual(incompleto.faltan, ['la masa retenida en el tamiz N.º 40', 'la masa retenida en el fondo']);

  // Masa seca sin tara en cero: dividir no tiene sentido.
  const todoTara = ensayoDelExcel();
  todoTara.masas = { ...todoTara.masas, seca: 500, tara: 500 };
  const cero = calcularGranulometria(todoTara);
  assert.ok(!cero.completo);
  assert.deepEqual(cero.faltan, ['una masa inicial seca mayor que la tara']);
});

prueba('se redondea como Excel, no como la aritmética binaria', () => {
  // `Math.round(69.995 * 100) / 100` da 69,99 porque 69,995 no existe en binario.
  // Excel muestra 70,00, y el veredicto se juzga con lo que se muestra (RF-58).
  assert.equal(redondear(69.995, 2), 70);
  assert.equal(redondear(1.005, 2), 1.01);
  assert.equal(redondear(3.1566, 1), 3.2);
  assert.equal(redondear(86.48089412475457, 2), 86.48);
  assert.equal(redondear(-0.305, 2), -0.31);
});

/** Mil gramos secos, sin tara, con todo lo retenido donde se diga y el resto en cero. */
function ensayoDeMilGramos(retenidos: RetenidosDelEnsayo, lavada: number | null = null): EntradaGranulometria {
  const vacio = Object.fromEntries(SERIE_DE_TAMICES.map((t) => [t.id, 0])) as RetenidosDelEnsayo;
  return { masas: { humeda: null, seca: 1000, tara: 0, lavada }, retenidos: { ...vacio, ...retenidos } };
}

prueba('el lavado avisa solo cuando lo tamizado se aleja más de 0,3 % de M2', () => {
  // RF-53 y RF-54. 1000 g lavados y 997 g tamizados: 3 g, justo el 0,3 %.
  const justo = calcularGranulometria(ensayoDeMilGramos({ n_4: 500, n_200: 497 }, 1000));
  assert.ok(justo.completo && justo.lavado);
  assert.equal(redondear(justo.lavado.diferencia, 1), 3);
  assert.equal(redondear(justo.lavado.porcentaje, 2), 0.3);
  assert.equal(justo.lavado.aviso, false);

  const pasado = calcularGranulometria(ensayoDeMilGramos({ n_4: 500, n_200: 496.9 }, 1000));
  assert.ok(pasado.completo && pasado.lavado);
  assert.equal(redondear(pasado.lavado.porcentaje, 2), 0.31);
  assert.equal(pasado.lavado.aviso, true);

  // Tamizado de más también avisa: el signo dice hacia dónde, el porcentaje cuánto.
  const ganado = calcularGranulometria(ensayoDeMilGramos({ n_4: 500, n_200: 504 }, 1000));
  assert.ok(ganado.completo && ganado.lavado);
  assert.equal(redondear(ganado.lavado.diferencia, 1), -4);
  assert.equal(ganado.lavado.aviso, true);

  // Sin M2 —como el Excel, que la dejaba en blanco— no hay dato ni aviso.
  const sinLavada = calcularGranulometria(ensayoDelExcel());
  assert.ok(sinLavada.completo);
  assert.equal(sinLavada.lavado, null);
});

prueba('el ensayo del Excel cumple la franja SBG-50', () => {
  const sbg50 = franjaPorId('sbg_50');
  assert.ok(sbg50);
  const resultado = calcularGranulometria(ensayoDelExcel(), sbg50);
  assert.ok(resultado.completo && resultado.veredicto);
  assert.equal(resultado.veredicto.global, 'cumple');
  // Juzga los diez tamices que la franja controla, y solo esos (RF-57).
  assert.deepEqual(
    resultado.veredicto.tamices.map((t) => [t.tamiz, t.pasa, t.posicion]),
    [
      ['t_2', 100, 'dentro'],
      ['t_1_1_2', 86.48, 'dentro'],
      ['t_1', 69.94, 'dentro'],
      ['t_1_2', 49.81, 'dentro'],
      ['t_3_8', 44.14, 'dentro'],
      ['n_4', 32.17, 'dentro'],
      ['n_10', 23.79, 'dentro'],
      ['n_40', 8.26, 'dentro'],
      ['n_100', 4.01, 'dentro'],
      ['n_200', 3.39, 'dentro'],
    ],
  );
  // Sin franja escogida no hay veredicto, pero sí resultados.
  const sinFranja = calcularGranulometria(ensayoDelExcel());
  assert.ok(sinFranja.completo);
  assert.equal(sinFranja.veredicto, null);
});

prueba('el veredicto se juzga con el porcentaje que se muestra, límites incluidos', () => {
  // RF-57 y RF-58. En el 1½" la franja pide de 70 a 95.
  const franja: FranjaGranulometrica = {
    id: 'prueba',
    nombre: 'Prueba',
    norma: '—',
    limites: { t_1_1_2: { min: 70, max: 95 } },
  };
  const posicion = (retenido: number) => {
    const resultado = calcularGranulometria(ensayoDeMilGramos({ t_1_1_2: retenido }), franja);
    assert.ok(resultado.completo && resultado.veredicto);
    return [resultado.veredicto.global, resultado.veredicto.tamices[0].posicion, resultado.veredicto.tamices[0].pasa];
  };

  assert.deepEqual(posicion(300), ['cumple', 'dentro', 70]);
  // 69,995 se muestra como 70,00: cumple, aunque en binario quede por debajo.
  assert.deepEqual(posicion(300.05), ['cumple', 'dentro', 70]);
  // RF-59 y RF-61: fuera, y hacia qué lado.
  assert.deepEqual(posicion(310), ['no_cumple', 'debajo', 69]);
  assert.deepEqual(posicion(50), ['cumple', 'dentro', 95]);
  assert.deepEqual(posicion(40), ['no_cumple', 'encima', 96]);
});

prueba('un solo tamiz fuera basta para no cumplir', () => {
  // RF-59 y RF-60: el ensayo del Excel, con el N.º 200 lavado de más.
  const sbg50 = franjaPorId('sbg_50');
  assert.ok(sbg50);
  const entrada = ensayoDelExcel();
  entrada.retenidos = { ...entrada.retenidos, n_200: 0, fondo: 0 };
  entrada.masas = { ...entrada.masas, seca: 6621 + 1000 };
  const resultado = calcularGranulometria(entrada, sbg50);
  assert.ok(resultado.completo && resultado.veredicto);
  assert.equal(resultado.veredicto.global, 'no_cumple');
  const fuera = resultado.veredicto.tamices.filter((t) => t.posicion !== 'dentro');
  assert.ok(fuera.length > 0);
  assert.ok(fuera.some((t) => t.tamiz === 'n_200' && t.posicion === 'encima'));
});

prueba('con datos incompletos no hay veredicto', () => {
  // RF-63: ni CUMPLE ni NO CUMPLE sobre porcentajes que no se pudieron calcular.
  const entrada = ensayoDelExcel();
  entrada.retenidos = { ...entrada.retenidos, n_40: null };
  const resultado = calcularGranulometria(entrada, franjaPorId('sbg_50') ?? null);
  assert.equal(resultado.completo, false);
  assert.ok(!('veredicto' in resultado));
});

/** El ensayo del Excel, con su encabezado, listo para enviar. */
function ensayoCompleto(): EnsayoAValidar {
  return {
    material: 'Subbase granular',
    fuente: 'Cantera la Fortune',
    localizacion: 'CANTERA #2 (PUERTO NARE)',
    numeroInforme: 'No. 6',
    fechaRecepcion: '2026-09-20',
    fechaEjecucion: '2026-09-22',
    franjaId: 'sbg_50',
    ...ensayoDelExcel(),
    masas: { humeda: 6830, seca: 6621, tara: 0, lavada: 6410 },
  };
}

const HOY_EN_OBRA = '2026-09-24';

/** Los campos que rechaza, en orden. */
function camposRechazados(ensayo: EnsayoAValidar, modo: 'borrador' | 'envio' = 'borrador') {
  return validarEnsayo(ensayo, HOY_EN_OBRA, modo).map((e) => e.campo);
}

prueba('el ensayo del Excel, completo, se puede enviar', () => {
  assert.deepEqual(validarEnsayo(ensayoCompleto(), HOY_EN_OBRA, 'envio'), []);
});

prueba('ninguna masa puede ser negativa, y se dice cuál', () => {
  // RF-33.
  const ensayo = ensayoCompleto();
  ensayo.masas = { ...ensayo.masas, tara: -1 };
  ensayo.retenidos = { ...ensayo.retenidos, n_40: -0.5 };
  const errores = validarEnsayo(ensayo, HOY_EN_OBRA, 'borrador');
  assert.deepEqual(
    errores.filter((e) => e.mensaje.includes('negativa')),
    [
      { campo: 'masas.tara', mensaje: 'La tara no puede ser negativa.' },
      { campo: 'retenidos.n_40', mensaje: 'La masa retenida en el tamiz N.º 40 no puede ser negativa.' },
    ],
  );
});

prueba('las masas tienen que ser coherentes entre sí', () => {
  // RF-34: la muestra no puede pesar más seca que húmeda.
  const masSeca = ensayoCompleto();
  masSeca.masas = { ...masSeca.masas, seca: 6900 };
  assert.ok(camposRechazados(masSeca).includes('masas.seca'));

  // RF-35: la tara no puede igualar ni pasar la masa seca.
  const tara = ensayoCompleto();
  tara.masas = { ...tara.masas, tara: 6621 };
  assert.ok(camposRechazados(tara).includes('masas.tara'));

  // RF-36: lo lavado no puede pesar más que lo que se secó antes de lavar.
  const lavada = ensayoCompleto();
  lavada.masas = { ...lavada.masas, lavada: 6700 };
  assert.deepEqual(camposRechazados(lavada), ['masas.lavada']);
});

prueba('lo retenido no puede sumar más que la muestra, y se dan las dos cifras', () => {
  // RF-37.
  const ensayo = ensayoCompleto();
  ensayo.retenidos = { ...ensayo.retenidos, fondo: 300 };
  const errores = validarEnsayo(ensayo, HOY_EN_OBRA, 'borrador');
  assert.deepEqual(errores, [
    {
      campo: 'retenidos',
      mensaje: 'Lo retenido suma 6.696,6 g y la masa seca sin tara es 6.621 g: no puede ser mayor.',
    },
  ]);
});

prueba('las fechas del ensayo van en orden y ninguna es futura', () => {
  // RF-38.
  const alReves = ensayoCompleto();
  alReves.fechaEjecucion = '2026-09-19';
  assert.deepEqual(camposRechazados(alReves), ['fechaEjecucion']);

  // RF-39: el día en la obra es el límite, y hoy mismo vale.
  const hoy = ensayoCompleto();
  hoy.fechaRecepcion = HOY_EN_OBRA;
  hoy.fechaEjecucion = HOY_EN_OBRA;
  assert.deepEqual(camposRechazados(hoy), []);

  const futura = ensayoCompleto();
  futura.fechaRecepcion = '2026-09-25';
  futura.fechaEjecucion = '2026-09-26';
  assert.deepEqual(camposRechazados(futura), ['fechaRecepcion', 'fechaEjecucion']);
});

prueba('un borrador a medias se guarda, pero no se envía', () => {
  // RF-31 y RF-73: lo incompleto se admite mientras es borrador.
  const aMedias: EnsayoAValidar = {
    material: 'Subbase granular',
    fuente: '  ',
    localizacion: null,
    numeroInforme: null,
    fechaRecepcion: '2026-09-20',
    fechaEjecucion: null,
    franjaId: null,
    masas: { humeda: 6830, seca: null, tara: null, lavada: null },
    retenidos: { t_2: 0 },
  };
  assert.deepEqual(validarEnsayo(aMedias, HOY_EN_OBRA, 'borrador'), []);

  const alEnviar = validarEnsayo(aMedias, HOY_EN_OBRA, 'envio');
  assert.deepEqual(alEnviar.slice(0, 9), [
    { campo: 'fuente', mensaje: 'Falta la fuente.' },
    { campo: 'localizacion', mensaje: 'Falta la localización.' },
    { campo: 'numeroInforme', mensaje: 'Falta el número de informe.' },
    { campo: 'fechaEjecucion', mensaje: 'Falta la fecha de ejecución.' },
    { campo: 'franja', mensaje: 'Falta escoger la franja.' },
    { campo: 'masas.seca', mensaje: 'Falta la masa inicial seca.' },
    { campo: 'masas.tara', mensaje: 'Falta la tara.' },
    { campo: 'masas.lavada', mensaje: 'Falta la masa seca después del lavado.' },
    { campo: 'retenidos.t_1_1_2', mensaje: 'Falta la masa retenida en el tamiz 1½".' },
  ]);
  // Los catorce tamices sin digitar y el fondo, uno por uno.
  assert.equal(alEnviar.filter((e) => e.campo.startsWith('retenidos.')).length, 15);
});

prueba('una franja que no está en el catálogo no se acepta', () => {
  const ensayo = ensayoCompleto();
  ensayo.franjaId = 'bg_99';
  assert.deepEqual(validarEnsayo(ensayo, HOY_EN_OBRA, 'borrador'), [
    { campo: 'franja', mensaje: 'Esa franja no está en el catálogo.' },
  ]);
});

prueba('el número de informe se compara sin mayúsculas ni espacios', () => {
  // RF-40.
  assert.equal(claveDeInforme('No. 6 '), claveDeInforme('no.6'));
  assert.equal(claveDeInforme('  LAB – 012 '), 'lab–012');
  assert.notEqual(claveDeInforme('No. 6'), claveDeInforme('No. 7'));
});

prueba('cada estado admite solo sus pasos', () => {
  // RF-71 a RF-90. Filas: estado; columnas: editar, enviar, aprobar, devolver, anular, descartar.
  const acciones: AccionSobreEnsayo[] = ['editar', 'enviar', 'aprobar', 'devolver', 'anular', 'descartar'];
  const esperado: Record<EstadoVisibleEnsayo, boolean[]> = {
    borrador: [true, true, false, false, false, true],
    devuelto: [true, true, false, false, false, true],
    enviado: [false, false, true, true, false, false],
    aprobado: [false, false, false, false, true, false],
    anulado: [false, false, false, false, false, false],
    descartado: [false, false, false, false, false, false],
  };
  for (const [estado, fila] of Object.entries(esperado) as [EstadoVisibleEnsayo, boolean[]][]) {
    assert.deepEqual(
      acciones.map((accion) => transicionPermitida(estado, accion)),
      fila,
      estado,
    );
  }
});

prueba('un ensayo de granulometría del día llena Control Calidad de Obra para cerrar', () => {
  // Spec 018 / RF-110: el residente no tiene que volver a anotar a mano el ensayo.
  const sinFilasAMano = { ...PARTE_COMPLETO, laboratorio: [] };
  const nombra = (bloqueos: string[]) => bloqueos.some((b) => b.includes('Control Calidad de Obra'));

  assert.equal(nombra(bloqueosDelCierre({ ...sinFilasAMano, ensayosDelModulo: 1 }, FOTOS_COMPLETAS)), false);
  assert.equal(nombra(bloqueosDelCierre({ ...sinFilasAMano, ensayosDelModulo: 0 }, FOTOS_COMPLETAS)), true);
  // Ausente es como hoy: sin filas a mano, la sección falta.
  assert.equal(nombra(bloqueosDelCierre(sinFilasAMano, FOTOS_COMPLETAS)), true);
  assert.deepEqual(bloqueosDelCierre(PARTE_COMPLETO, FOTOS_COMPLETAS), []);
});

prueba('el índice del parte cuenta los ensayos del módulo en Control Calidad de Obra', () => {
  // Spec 018 / RF-110: con la sección a mano vacía no sale «sin registrar».
  const conEnsayo = estadoDe({ ...PARTE_VACIO, ensayosDelModulo: 2 }, 'laboratorio');
  assert.equal(conEnsayo?.estado, 'lleno');
  assert.equal(conEnsayo?.cuantos, 2);
  assert.equal(estadoDe({ ...PARTE_VACIO, laboratorio: 1, ensayosDelModulo: 2 }, 'laboratorio')?.cuantos, 3);
  assert.equal(estadoDe(PARTE_VACIO, 'laboratorio')?.estado, 'vacio');
});

prueba('un ensayo nuevo se registra vacío, y los resultados que lleguen hechos se ignoran', () => {
  // RF-31: un borrador puede nacer sin nada.
  const vacio = ensayoNuevo.parse({});
  assert.equal(vacio.material, null);
  assert.equal(vacio.fechaEjecucion, null);
  assert.equal(vacio.franjaId, null);
  assert.deepEqual(vacio.masas, { humeda: null, seca: null, tara: null, lavada: null });
  assert.deepEqual(vacio.retenidos, {});

  // RF-42: ni porcentajes ni veredicto se aceptan desde fuera; el servidor los calcula.
  const conTrampa = ensayoNuevo.parse({
    material: '  Subbase granular ',
    veredicto: 'cumple',
    resultado: { completo: true },
    masas: { seca: 6621 },
    retenidos: { t_2: 0, n_40: 369.7 },
  });
  assert.equal(conTrampa.material, 'Subbase granular');
  assert.equal('veredicto' in conTrampa, false);
  assert.equal('resultado' in conTrampa, false);
  assert.deepEqual(conTrampa.masas, { humeda: null, seca: 6621, tara: null, lavada: null });
  assert.deepEqual(conTrampa.retenidos, { t_2: 0, n_40: 369.7 });
});

prueba('el contrato del ensayo rechaza masas negativas y tamices que no existen', () => {
  // RF-33, antes de que la petición llegue a la regla.
  const negativa = ensayoNuevo.safeParse({ masas: { tara: -1 } });
  assert.equal(negativa.success, false);
  assert.deepEqual(negativa.error?.issues[0]?.path, ['masas', 'tara']);
  assert.equal(negativa.error?.issues[0]?.message, 'Una masa no puede ser negativa.');

  const retenidoNegativo = ensayoNuevo.safeParse({ retenidos: { n_200: -0.1 } });
  assert.deepEqual(retenidoNegativo.error?.issues[0]?.path, ['retenidos', 'n_200']);

  // Un tamiz que no es de la serie no se guarda en silencio.
  assert.equal(ensayoNuevo.safeParse({ retenidos: { n_325: 10 } }).success, false);
  assert.equal(ensayoNuevo.safeParse({ fechaEjecucion: '24/09/2026' }).success, false);
});

prueba('corregir un ensayo distingue lo ausente de lo que se borra', () => {
  // AGENTS.md: en un PATCH parcial, ausente y vacío no son lo mismo.
  assert.deepEqual(ensayoEditado.parse({ observaciones: 'Muestra húmeda' }), {
    observaciones: 'Muestra húmeda',
  });
  // Solo la masa que viene: las demás no se tocan.
  assert.deepEqual(ensayoEditado.parse({ masas: { tara: 0 } }), { masas: { tara: 0 } });
  assert.deepEqual(ensayoEditado.parse({ retenidos: { n_40: null } }), { retenidos: { n_40: null } });
  // `null` o vacío sí borra.
  assert.deepEqual(ensayoEditado.parse({ material: '', franjaId: null }), { material: null, franjaId: null });
  // La obra de un ensayo no se cambia corrigiéndolo.
  assert.equal('obraId' in ensayoEditado.parse({ obraId: 'otra' }), false);
  assert.equal(ensayoEditado.safeParse({ masas: { seca: -5 } }).success, false);
});

prueba('devolver pide comentario y anular pide motivo', () => {
  // RF-79 y RF-87.
  assert.equal(
    devolucion.safeParse({ comentario: '   ' }).error?.issues[0]?.message,
    'Falta el comentario de la devolución.',
  );
  assert.deepEqual(devolucion.parse({ comentario: ' Revisar el N.º 200 ' }), { comentario: 'Revisar el N.º 200' });
  assert.equal(anulacion.safeParse({ motivo: '' }).success, false);
});

prueba('el veredicto que se guarda sale del cálculo, y sin cálculo completo no hay', () => {
  // RF-42 y RF-63: la columna que filtra el listado dice lo mismo que el resultado.
  const sbg50 = franjaPorId('sbg_50') ?? null;
  assert.equal(veredictoDe(calcularGranulometria(ensayoDelExcel(), sbg50)), 'cumple');
  assert.equal(veredictoDe(calcularGranulometria(ensayoDelExcel(), null)), null);
  const incompleto = ensayoDelExcel();
  incompleto.retenidos = { ...incompleto.retenidos, fondo: null };
  assert.equal(veredictoDe(calcularGranulometria(incompleto, sbg50)), null);
});

prueba('un número de informe repetido se dice en su campo', () => {
  // RF-40: lo decide el índice único, y el 409 apunta a la casilla.
  assert.deepEqual(duplicadoDe('ux_ensayo_granulometria_informe'), {
    mensaje: 'Ya hay un ensayo vigente con ese número de informe en esta obra.',
    campo: 'numeroInforme',
  });
});

prueba('el parte muestra los ensayos vigentes mientras está abierto y los fijados al cerrar', () => {
  // Spec 018 / RF-106, RF-111 y RF-112.
  const ensayo = { id: 'e1' };
  assert.deepEqual(granulometriasDelParte({ cerrado: false, fijados: null, vigentes: [ensayo] }), {
    estado: 'vigentes',
    ensayos: [ensayo],
  });
  // Cerrado manda lo fijado, aunque hoy haya otros ensayos de ese día.
  assert.deepEqual(granulometriasDelParte({ cerrado: true, fijados: [], vigentes: [ensayo] }), {
    estado: 'fijados',
    ensayos: [],
  });
  // Cerrado antes de que existiera el módulo: no se afirma que no hubo ensayos.
  assert.deepEqual(granulometriasDelParte({ cerrado: true, fijados: null, vigentes: [ensayo] }), {
    estado: 'antes_del_modulo',
    ensayos: [],
  });
});

prueba('el listado de ensayos se filtra por material, franja, estado y veredicto', () => {
  // Spec 018 / RF-103. Sin filtro, todos; cada filtro se suma a los demás.
  const ensayos = [
    { id: 'a', material: 'Subbase granular', franjaId: 'sbg_50', estado: 'aprobado', veredicto: 'cumple' },
    { id: 'b', material: 'Subbase granular', franjaId: 'sbg_50', estado: 'enviado', veredicto: 'no_cumple' },
    { id: 'c', material: 'Afirmado', franjaId: null, estado: 'borrador', veredicto: null },
  ] as const;
  const ids = (filtros: Parameters<typeof filtrarEnsayos>[1]) => filtrarEnsayos(ensayos, filtros).map((e) => e.id);
  assert.deepEqual(ids({}), ['a', 'b', 'c']);
  assert.deepEqual(ids({ material: 'Subbase granular' }), ['a', 'b']);
  assert.deepEqual(ids({ material: 'Subbase granular', veredicto: 'no_cumple' }), ['b']);
  assert.deepEqual(ids({ estado: 'borrador' }), ['c']);
  assert.deepEqual(ids({ franjaId: 'sbg_50', estado: 'aprobado' }), ['a']);
  // «Sin veredicto» es un filtro de verdad: lo que todavía no se puede juzgar.
  assert.deepEqual(ids({ veredicto: 'sin_veredicto' }), ['c']);
});

prueba('una masa se lee con coma o con punto, y lo que no es número se dice', () => {
  // RF-25: en Colombia se escribe «895,1»; el teclado numérico da «895.1».
  assert.deepEqual(leerMasa('895,1'), { valor: 895.1 });
  assert.deepEqual(leerMasa(' 895.1 '), { valor: 895.1 });
  assert.deepEqual(leerMasa('0'), { valor: 0 });
  // Vacío es «sin digitar», no cero: el borrador puede esperar (RF-31).
  assert.deepEqual(leerMasa(''), { valor: null });
  assert.deepEqual(leerMasa('   '), { valor: null });
  assert.deepEqual(leerMasa('89a'), { error: 'Escriba solo el número, en gramos.' });
  assert.deepEqual(leerMasa('1.234,5'), { error: 'Escriba solo el número, en gramos.' });
  // El signo se deja pasar: el rechazo de las negativas lo da la regla, con su mensaje.
  assert.deepEqual(leerMasa('-3'), { valor: -3 });
});

prueba('las cifras del ensayo se muestran con coma y con el redondeo de Excel', () => {
  // RF-55: porcentajes a dos decimales, humedad a uno.
  assert.equal(formatearNumero(86.48089412475457, 2), '86,48');
  assert.equal(formatearNumero(100, 2), '100,00');
  assert.equal(formatearNumero(69.995, 2), '70,00');
  assert.equal(formatearNumero(3.1566, 1), '3,2');
  assert.equal(formatearNumero(6404.8, 1), '6404,8');
});

prueba('anulado y descartado mandan sobre el estado en que quedaron', () => {
  const ahora = new Date();
  assert.equal(estadoVisible('aprobado', null, null), 'aprobado');
  assert.equal(estadoVisible('aprobado', ahora, null), 'anulado');
  assert.equal(estadoVisible('borrador', null, ahora), 'descartado');
  // Cómo se nombra cada uno en pantalla y en los rechazos.
  assert.equal(ETIQUETA_ESTADO_ENSAYO.enviado, 'Enviado');
  assert.equal(Object.keys(ETIQUETA_ESTADO_ENSAYO).length, 6);
});

/* ------------------------------------------------------------------------ */
/* Reportes de WhatsApp: lectura de abscisas, horas y clima (spec 021)       */
/* ------------------------------------------------------------------------ */

console.log('\nReportes de WhatsApp: lectura\n');

prueba('la abscisa se lee igual escrita con K, ABS K o PR (RF-65)', () => {
  assert.deepEqual(abscisaDeTexto('K1+170'), { pr: 1, metros: 170 });
  assert.deepEqual(abscisaDeTexto('ABS K1+ 190'), { pr: 1, metros: 190 });
  assert.deepEqual(abscisaDeTexto('pr 1 + 140'), { pr: 1, metros: 140 });
  assert.deepEqual(abscisaDeTexto('desde ABS     K1+170'), { pr: 1, metros: 170 });
  assert.deepEqual(abscisaDeTexto('K0+800'), { pr: 0, metros: 800 });
  assert.deepEqual(abscisaDeTexto('PR 12 + 050'), { pr: 12, metros: 50 });
});

prueba('lo que no es una abscisa queda vacío, sin adivinar (RF-65)', () => {
  assert.equal(abscisaDeTexto('hola'), null);
  assert.equal(abscisaDeTexto(''), null);
  assert.equal(abscisaDeTexto(null), null);
  assert.equal(abscisaDeTexto('K1'), null);
  assert.equal(abscisaDeTexto('K1+1700'), null);
  // «LUK1+170» no es una abscisa pegada a una placa.
  assert.equal(abscisaDeTexto('LUK1+170'), null);
});

prueba('la abscisa fuera de la vía se lee igual: la rechaza la regla del destino', () => {
  // PR 30 y metros 170 no caben en Control Cantera, pero eso lo dice validarAbscisa,
  // para que el residente vea la falta (RF-86).
  assert.deepEqual(abscisaDeTexto('K30+170'), { pr: 30, metros: 170 });
});

prueba('las horas de un chat de obra quedan como HH:MM (RF-66, RF-81, RF-82)', () => {
  assert.equal(horaDeTexto('9am'), '09:00');
  assert.equal(horaDeTexto('9 am'), '09:00');
  assert.equal(horaDeTexto('9:00 am'), '09:00');
  assert.equal(horaDeTexto('9:30 a.m.'), '09:30');
  assert.equal(horaDeTexto('3:00 pm'), '15:00');
  assert.equal(horaDeTexto('6 PM'), '18:00');
  assert.equal(horaDeTexto('15:00'), '15:00');
  assert.equal(horaDeTexto('7:00'), '07:00');
  assert.equal(horaDeTexto('12 m'), '12:00');
  assert.equal(horaDeTexto('12 pm'), '12:00');
  assert.equal(horaDeTexto('12 am'), '00:00');
});

prueba('una hora imposible no se corrige: queda vacía', () => {
  assert.equal(horaDeTexto('25:00'), null);
  assert.equal(horaDeTexto('13 pm'), null);
  assert.equal(horaDeTexto('0 am'), null);
  assert.equal(horaDeTexto('9:75'), null);
  assert.equal(horaDeTexto('3 m'), null);
  assert.equal(horaDeTexto('por la tarde'), null);
  assert.equal(horaDeTexto(null), null);
});

prueba('el clima escrito se lleva a una de las cuatro condiciones (RF-66)', () => {
  assert.equal(condicionDeClima('fue un clima soleado'), 'soleado');
  assert.equal(condicionDeClima('sol'), 'soleado');
  assert.equal(condicionDeClima('Despejado'), 'soleado');
  assert.equal(condicionDeClima('se presentó lluvias'), 'lloviendo');
  assert.equal(condicionDeClima('llovizna'), 'lloviendo');
  assert.equal(condicionDeClima('Nublado'), 'nublado');
  assert.equal(condicionDeClima('parcialmente nublado'), 'parcialmente_nublado');
  assert.equal(condicionDeClima('parcialmente soleado'), 'parcialmente_nublado');
});

prueba('un clima que no se entiende queda para que el residente lo elija (RF-67)', () => {
  assert.equal(condicionDeClima('raro'), null);
  assert.equal(condicionDeClima('solo trabajamos medio día'), null);
  assert.equal(condicionDeClima(''), null);
});

console.log('\nReportes de WhatsApp: equipos y personas\n');

const EQUIPOS_DEL_REPORTE: VehiculoConocido[] = [
  { id: 'llq375', codigoInterno: 'VOL-01', placa: 'LLQ375', obraId: 'obra-a' },
  { id: 'llq376', codigoInterno: 'VOL-02', placa: 'LLQ-376', obraId: 'obra-a' },
  { id: 'zcw128', codigoInterno: 'CT-01', placa: 'ZCW 128', obraId: 'obra-a' },
  { id: 'motoniveladora', codigoInterno: 'MN-566', placa: null, obraId: null },
  { id: 'tay076-ajena', codigoInterno: 'VOL-09', placa: 'TAY076', obraId: 'obra-b' },
  // Dos equipos que un texto descuidado podría confundir.
  { id: 'gemela-1', codigoInterno: 'RC-762', placa: null, obraId: 'obra-a' },
  { id: 'gemela-2', codigoInterno: 'RC-762', placa: null, obraId: 'obra-a' },
];

prueba('el equipo se reconoce por su placa, escrita como venga (RF-70)', () => {
  assert.equal(reconocerVehiculo('LLQ 375', EQUIPOS_DEL_REPORTE, 'obra-a'), 'llq375');
  assert.equal(
    reconocerVehiculo('Volqueta Foton LLQ 375', EQUIPOS_DEL_REPORTE, 'obra-a'),
    'llq375',
  );
  assert.equal(
    reconocerVehiculo('Volqueta: Foton llq376', EQUIPOS_DEL_REPORTE, 'obra-a'),
    'llq376',
  );
  assert.equal(
    reconocerVehiculo('Carrotanque ford cargo 815 zcw 128', EQUIPOS_DEL_REPORTE, 'obra-a'),
    'zcw128',
  );
});

prueba('el equipo se reconoce también por su código interno, y los sin obra cuentan', () => {
  assert.equal(reconocerVehiculo('vol 01', EQUIPOS_DEL_REPORTE, 'obra-a'), 'llq375');
  assert.equal(
    reconocerVehiculo('Motoniveladora MN 566', EQUIPOS_DEL_REPORTE, 'obra-a'),
    'motoniveladora',
  );
});

prueba('un equipo de otra obra, uno ambiguo o uno desconocido no se reconocen (RF-71)', () => {
  assert.equal(
    reconocerVehiculo('Volqueta Kentworth TAY 076', EQUIPOS_DEL_REPORTE, 'obra-a'),
    null,
  );
  assert.equal(reconocerVehiculo('Retrocargador RC 762', EQUIPOS_DEL_REPORTE, 'obra-a'), null);
  assert.equal(reconocerVehiculo('Excavadora Liugong 922D', EQUIPOS_DEL_REPORTE, 'obra-a'), null);
  assert.equal(reconocerVehiculo('', EQUIPOS_DEL_REPORTE, 'obra-a'), null);
  // Con dos placas en el mismo renglón no se elige ninguna.
  assert.equal(reconocerVehiculo('LLQ 375 y LLQ 376', EQUIPOS_DEL_REPORTE, 'obra-a'), null);
});

// Spec 021, cambio 2026-10-08: placas leídas de la foto de un vale.
const VOLQUETAS_DE_LOS_VALES: VehiculoConocido[] = [
  { id: 'tfo420', codigoInterno: 'VOL-MAG-05', placa: 'TFO420', obraId: 'obra-a' },
  { id: 'llq377', codigoInterno: 'VOL-MAG-01', placa: 'LLQ377', obraId: 'obra-a' },
  // Dos placas que solo se distinguen por un carácter de los que se confunden.
  { id: 'abs123', codigoInterno: 'VOL-X1', placa: 'ABS123', obraId: 'obra-a' },
  { id: 'ab5123', codigoInterno: 'VOL-X2', placa: 'AB5123', obraId: 'obra-a' },
  { id: 'otra-obra', codigoInterno: 'VOL-Y1', placa: 'ZZB908', obraId: 'obra-b' },
];

prueba('una placa con un carácter mal leído se reconoce si queda una sola (021/RF-107)', () => {
  assert.equal(reconocerVehiculo('TFO42O', VOLQUETAS_DE_LOS_VALES, 'obra-a'), 'tfo420');
  assert.equal(reconocerVehiculo('TF0420', VOLQUETAS_DE_LOS_VALES, 'obra-a'), 'tfo420');
  assert.equal(reconocerVehiculo('Volqueta TF0 42O', VOLQUETAS_DE_LOS_VALES, 'obra-a'), 'tfo420');
  assert.equal(reconocerVehiculo('LLQ3TT', VOLQUETAS_DE_LOS_VALES, 'obra-a'), null);
  // Una letra que no es de los pares no se corrige.
  assert.equal(reconocerVehiculo('LLQ37T', VOLQUETAS_DE_LOS_VALES, 'obra-a'), null);
  // La de otra obra sigue sin contar, aunque coincida con los pares.
  assert.equal(reconocerVehiculo('2Z8908', VOLQUETAS_DE_LOS_VALES, 'obra-a'), null);
});

prueba('ninguno parecido y varios parecidos son distintos: solo con ninguno se crea (024/RF-30)', () => {
  assert.deepEqual(candidatosDeVehiculo('XYZ987', VOLQUETAS_DE_LOS_VALES, 'obra-a'), []);
  assert.deepEqual(candidatosDeVehiculo('A85I23', VOLQUETAS_DE_LOS_VALES, 'obra-a').sort(), ['ab5123', 'abs123']);
  assert.deepEqual(candidatosDeVehiculo('TFO42O', VOLQUETAS_DE_LOS_VALES, 'obra-a'), ['tfo420']);
  assert.deepEqual(candidatosEnCantera('Vía las Margaritas', [{ id: 'fortune', nombre: 'LA FORTUNE' }]), []);
  assert.deepEqual(
    candidatosEnCantera('subbase', [
      { id: 'a', nombre: 'SUBBASE DE RIO' },
      { id: 'b', nombre: 'SUBBASE MEZCLADA' },
    ]).sort(),
    ['a', 'b'],
  );
});

prueba('si con los pares coinciden dos equipos, no se elige ninguno (021/RF-108)', () => {
  assert.equal(reconocerVehiculo('A85I23', VOLQUETAS_DE_LOS_VALES, 'obra-a'), null);
  // Lo escrito igual a una placa gana antes de comparar con los pares.
  assert.equal(reconocerVehiculo('AB5123', VOLQUETAS_DE_LOS_VALES, 'obra-a'), 'ab5123');
  assert.equal(reconocerVehiculo('ABS123', VOLQUETAS_DE_LOS_VALES, 'obra-a'), 'abs123');
});

const PERSONAS_DEL_REPORTE: PersonaConocida[] = [
  { id: 'silfrido', nombreCompleto: 'Silfrido Medina Pérez' },
  { id: 'diego-c', nombreCompleto: 'Diego Cardona' },
  { id: 'diego-r', nombreCompleto: 'Diego Ramírez Ortiz' },
  { id: 'jesus', nombreCompleto: 'Jesús Arrieta' },
];

prueba('la persona se reconoce sin tildes, mayúsculas ni el segundo apellido (RF-75, RF-79)', () => {
  assert.equal(reconocerPersona('silfrido medina', PERSONAS_DEL_REPORTE), 'silfrido');
  assert.equal(reconocerPersona('Silfrido Medina Perez', PERSONAS_DEL_REPORTE), 'silfrido');
  assert.equal(reconocerPersona('Diego Cardona', PERSONAS_DEL_REPORTE), 'diego-c');
  assert.equal(reconocerPersona('jesus', PERSONAS_DEL_REPORTE), 'jesus');
});

prueba('un nombre que coincide con dos personas, o con ninguna, no se reconoce', () => {
  assert.equal(reconocerPersona('Diego', PERSONAS_DEL_REPORTE), null);
  assert.equal(reconocerPersona('Juan Pérez', PERSONAS_DEL_REPORTE), null);
  assert.equal(reconocerPersona('el mono', PERSONAS_DEL_REPORTE), null);
  assert.equal(reconocerPersona('', PERSONAS_DEL_REPORTE), null);
});

prueba('la hoja del archivo propone el cargo cuando es uno de la lista (023/RF-62)', () => {
  // Las hojas del «Formato Horas Extras» del 5 de octubre.
  const casos: [string | null, string | null][] = [
    ['CONDUCTORES', 'conductor'],
    ['OPERADORES', 'operador'],
    ['CONTROLADORAS', 'controlador_vial'],
    ['CONTROLADORAS y BOAL', 'controlador_vial'],
    ['TOPOGRAFIA', 'topografo'],
    ['Topógrafos', 'topografo'],
    ['INGENIEROS', null],
    ['OFICIO VARIOS', null],
    ['OFICIO VARIOS (2)', null],
    // El nombre de cualquier cargo de la lista, en singular o en plural.
    ['Ayudantes', 'ayudante'],
    ['Maestro de obra', 'maestro'],
    ['SISO (SST)', 'siso'],
    ['', null],
    [null, null],
  ];
  for (const [hoja, cargo] of casos) assert.equal(cargoDeHoja(hoja), cargo, String(hoja));
});

prueba('la persona registrada desde la bandeja recibe un usuario interno válido (023/RF-64)', () => {
  const id = '01a117b0-bafc-78e4-af4c-1746b7170113';
  assert.equal(usuarioDeLaBandeja('José Ñúñez Pérez', id), 'wa.jose.nunez.perez.01a117');
  // Cabe en el contrato de personas: 40 caracteres, minúsculas, cifras, punto, guion.
  const largo = usuarioDeLaBandeja('María de los Ángeles Restrepo Villegas de la Torre', id);
  assert.ok(largo.length <= 40, largo);
  assert.match(largo, /^[a-z0-9._-]+$/);
  assert.ok(largo.endsWith('.01a117'));
  // Un nombre sin letras ni cifras no deja el usuario vacío.
  assert.equal(usuarioDeLaBandeja('—', id), 'wa.persona.01a117');
});

prueba('solo se registra a la persona de un renglón que existe y está sin elegir (023/RF-57)', () => {
  const reporte = reporteCompleto();
  reporte.personal.push({ ...reporte.personal[0], usuarioId: null, escrito: 'Wilfer García' });
  reporte.maquinaria[0] = { ...reporte.maquinaria[0], operadorId: null, operadorEscrito: 'el mono' };
  assert.equal(rechazoDeRegistro(reporte, { seccion: 'personal', renglon: 1 }), null);
  assert.equal(rechazoDeRegistro(reporte, { seccion: 'maquinaria', renglon: 0 }), null);
  assert.equal(
    rechazoDeRegistro(reporte, { seccion: 'personal', renglon: 0 }),
    'Esa persona ya está elegida en el reporte.',
  );
  assert.equal(
    rechazoDeRegistro(reporte, { seccion: 'personal', renglon: 9 }),
    'Ese renglón no está en el reporte.',
  );
});

prueba('el pedido de registrar personas exige nombre y un cargo de la lista (023/RF-60, RF-61)', () => {
  const base = { version: 0, propuesta: reporteCompleto() };
  const persona = { seccion: 'personal', renglon: 0, nombre: 'Wilfer García', cargo: 'conductor' };
  assert.equal(personasDesdeLaBandeja.safeParse({ ...base, personas: [persona] }).success, true);
  assert.equal(
    personasDesdeLaBandeja.safeParse({ ...base, personas: [{ ...persona, cargo: null }] }).success,
    true,
    'sin definir',
  );
  assert.equal(personasDesdeLaBandeja.safeParse({ ...base, personas: [{ ...persona, nombre: '  ' }] }).success, false);
  assert.equal(personasDesdeLaBandeja.safeParse({ ...base, personas: [{ ...persona, cargo: 'ingeniero' }] }).success, false);
  assert.equal(personasDesdeLaBandeja.safeParse({ ...base, personas: [{ ...persona, seccion: 'ensayos' }] }).success, false);
  assert.equal(personasDesdeLaBandeja.safeParse({ ...base, personas: [] }).success, false);
});

prueba('una persona nueva muestra antes las registradas con dos palabras en común (023/RF-65)', () => {
  const personas = [
    { id: 'olivero', nombreCompleto: 'Oscar Olivero Pérez' },
    { id: 'velandia', nombreCompleto: 'Oscar Velandia' },
    { id: 'avila', nombreCompleto: 'José de Ávila' },
    { id: 'garcia', nombreCompleto: 'Wilfer García Ríos' },
  ];
  const ids = (nombre: string) => posiblesCoincidencias(nombre, personas).map((p) => p.id);
  assert.deepEqual(ids('OSCAR OLIVERO'), ['olivero'], 'una sola palabra en común (Oscar) no basta');
  assert.deepEqual(ids('JOSE DE LA CRUZ'), [], '«de» y «la» no cuentan como palabras');
  assert.deepEqual(ids('WILFER GARCIA'), ['garcia'], 'sin tildes ni mayúsculas');
  assert.deepEqual(ids('Pedro Pérez'), []);
  assert.deepEqual(ids(''), []);
  // Primero la que más se parece.
  assert.deepEqual(
    ids('Oscar Olivero Velandia'),
    ['olivero', 'velandia'],
  );
});

prueba('el conductor del viaje es el operador de esa volqueta en el reporte (RF-94)', () => {
  const maquinas = [
    { vehiculoId: 'llq375', operadorId: 'silfrido' },
    { vehiculoId: 'llq376', operadorId: null },
    { vehiculoId: null, operadorId: 'diego-c' },
  ];
  assert.equal(conductorDelViaje('llq375', maquinas), 'silfrido');
  // Sin operador en el reporte, o volqueta que no está: lo elige el residente (RF-95).
  assert.equal(conductorDelViaje('llq376', maquinas), null);
  assert.equal(conductorDelViaje('zcw128', maquinas), null);
  assert.equal(conductorDelViaje(null, maquinas), null);
});

// Spec 021, cambio 2026-10-08: el conductor de un vale suelto.
const CONDUCTORES_DE_LOS_VALES: PersonaConocida[] = [
  { id: 'yobani', nombreCompleto: 'Yobani Hernando Osorio Aguirre' },
  { id: 'zuleta', nombreCompleto: 'Luis Fernando Zuleta Isaza' },
  { id: 'wilfer', nombreCompleto: 'Wilfer Jose Cuello Garcia' },
  { id: 'eddier', nombreCompleto: 'Eddier Alberto Quiceno Jacome' },
];
const CONTEXTO_DEL_CONDUCTOR = {
  fecha: '2026-10-07',
  maquinas: [{ vehiculoId: 'llq377', operadorId: 'yobani' }],
  personas: CONDUCTORES_DE_LOS_VALES,
  preoperacionales: [
    { vehiculoId: 'tfo420', fecha: '2026-10-07', usuarioId: 'zuleta' },
    // El de otro día no cuenta.
    { vehiculoId: 'tfo420', fecha: '2026-10-06', usuarioId: 'eddier' },
    // Dos personas distintas el mismo día: ese camino no sirve (RF-106).
    { vehiculoId: 'llq379', fecha: '2026-10-07', usuarioId: 'wilfer' },
    { vehiculoId: 'llq379', fecha: '2026-10-07', usuarioId: 'eddier' },
  ],
  ultimosViajes: [
    { vehiculoId: 'llq379', conductorId: 'wilfer' },
    { vehiculoId: 'tfo427', conductorId: 'eddier' },
  ],
};

prueba('el conductor escrito en el viaje gana a los demás caminos (021/RF-104, RF-105)', () => {
  assert.deepEqual(
    conductorPropuesto({ vehiculoId: 'tfo420', conductorEscrito: 'Fernando Zuleta' }, CONTEXTO_DEL_CONDUCTOR),
    { conductorId: 'zuleta', por: 'escrito' },
  );
  assert.deepEqual(
    conductorPropuesto({ vehiculoId: 'llq377', conductorEscrito: 'Wilfer García' }, CONTEXTO_DEL_CONDUCTOR),
    { conductorId: 'wilfer', por: 'escrito' },
  );
});

prueba('sin nombre escrito, el conductor sale del reporte, el preoperacional o el último viaje (021/RF-105)', () => {
  // El operador de esa volqueta en el mismo reporte (RF-94).
  assert.deepEqual(
    conductorPropuesto({ vehiculoId: 'llq377', conductorEscrito: null }, CONTEXTO_DEL_CONDUCTOR),
    { conductorId: 'yobani', por: 'reporte' },
  );
  // Sin nombre escrito, el preoperacional de ese día.
  assert.deepEqual(
    conductorPropuesto({ vehiculoId: 'tfo420', conductorEscrito: null }, CONTEXTO_DEL_CONDUCTOR),
    { conductorId: 'zuleta', por: 'preoperacional' },
  );
  assert.deepEqual(
    conductorPropuesto({ vehiculoId: 'tfo427', conductorEscrito: '' }, CONTEXTO_DEL_CONDUCTOR),
    { conductorId: 'eddier', por: 'ultimo_viaje' },
  );
});

prueba('un nombre escrito que no se reconoce no se cambia por el de la volqueta (021/RF-112)', () => {
  // TFO420 tiene preoperacional y TFO427 último viaje, pero el vale dice otro nombre.
  assert.equal(
    conductorPropuesto({ vehiculoId: 'tfo420', conductorEscrito: 'Fernando Osorio' }, CONTEXTO_DEL_CONDUCTOR),
    null,
  );
  assert.equal(
    conductorPropuesto({ vehiculoId: 'tfo427', conductorEscrito: 'Anderson Daza' }, CONTEXTO_DEL_CONDUCTOR),
    null,
  );
  // El operador de esa volqueta en el mismo reporte sí cuenta: es lo que el reporte dice.
  assert.deepEqual(
    conductorPropuesto({ vehiculoId: 'llq377', conductorEscrito: 'Yobany Osorio A.' }, CONTEXTO_DEL_CONDUCTOR),
    { conductorId: 'yobani', por: 'reporte' },
  );
});

prueba('dos preoperacionales de personas distintas no deciden el conductor (021/RF-106)', () => {
  assert.deepEqual(
    conductorPropuesto({ vehiculoId: 'llq379', conductorEscrito: null }, CONTEXTO_DEL_CONDUCTOR),
    { conductorId: 'wilfer', por: 'ultimo_viaje' },
  );
  // Ningún camino: lo elige el residente (RF-95).
  assert.equal(
    conductorPropuesto({ vehiculoId: 'tay076', conductorEscrito: 'Anderson Daza' }, CONTEXTO_DEL_CONDUCTOR),
    null,
  );
  assert.equal(conductorPropuesto({ vehiculoId: null, conductorEscrito: null }, CONTEXTO_DEL_CONDUCTOR), null);
});

prueba('la propuesta dice de dónde salió el conductor cuando no fue escrito (021/RF-109)', () => {
  const viaje = (conductorPor: CaminoDelConductor | null, conductorEscrito: string | null, conductorId: string | null = 'x') =>
    textoDelConductor({ conductorId, conductorPor, conductorEscrito });
  assert.equal(viaje('escrito', 'Fernando Zuleta'), null);
  assert.equal(
    viaje('preoperacional', null),
    'Conductor propuesto: quien hizo el preoperacional de esta volqueta ese día. Confírmelo.',
  );
  assert.equal(
    viaje('reporte', null),
    'Conductor propuesto: el operador de esta volqueta en el mismo reporte. Confírmelo.',
  );
  assert.equal(
    viaje('ultimo_viaje', 'Anderson Daza'),
    'Conductor propuesto: quien manejó el último viaje de esta volqueta. Confírmelo. El reporte decía «Anderson Daza».',
  );
  // Elegido por una persona, o sin conductor: no hay nada que explicar aquí.
  assert.equal(viaje(null, 'Wilfer Osorio'), null);
  assert.equal(viaje(null, null, null), null);
});

prueba('una persona dada de baja no se propone como conductor (021/RF-105)', () => {
  // `personas` son las vigentes: quien hizo el preoperacional o el último viaje y ya no
  // está no cuenta, y se pasa al camino siguiente.
  const contexto = {
    ...CONTEXTO_DEL_CONDUCTOR,
    preoperacionales: [{ vehiculoId: 'tfo427', fecha: '2026-10-07', usuarioId: 'dado-de-baja' }],
    ultimosViajes: [
      { vehiculoId: 'tfo427', conductorId: 'eddier' },
      { vehiculoId: 'tay076', conductorId: 'dado-de-baja' },
    ],
  };
  assert.deepEqual(
    conductorPropuesto({ vehiculoId: 'tfo427', conductorEscrito: null }, contexto),
    { conductorId: 'eddier', por: 'ultimo_viaje' },
  );
  assert.equal(conductorPropuesto({ vehiculoId: 'tay076', conductorEscrito: null }, contexto), null);
});

prueba('la propuesta lleva el conductor escrito y de dónde salió (021/RF-104, RF-109)', () => {
  const { reporte } = resolverPropuesta(
    {
      fecha_evento: '2026-10-07',
      viajes: [
        { placa: 'TFO420', conductor: 'Fernando Zuleta', material: 'Sub-base', origen: 'LA FORTUNE', hora: '08:05' },
        { placa: 'LLQ379', material: 'Sub-base', origen: 'LA FORTUNE', hora: '09:00' },
        { placa: 'TFO420', material: 'Sub-base', origen: 'LA FORTUNE', hora: '10:00' },
      ],
    },
    {
      obraId: 'obra-a',
      vehiculos: [
        ...VOLQUETAS_DE_LOS_VALES,
        { id: 'llq379', codigoInterno: 'VOL-MAG-03', placa: 'LLQ379', obraId: 'obra-a' },
      ],
      personas: CONDUCTORES_DE_LOS_VALES,
      sitios: [{ id: 'fortune', nombre: 'LA FORTUNE' }],
      materiales: [{ id: 'subbase', nombre: 'SUBBASE' }],
      preoperacionales: CONTEXTO_DEL_CONDUCTOR.preoperacionales,
      ultimosViajes: CONTEXTO_DEL_CONDUCTOR.ultimosViajes,
    },
    { diaDelMensaje: '2026-10-07', destino: 'cantera' },
  );
  assert.deepEqual(
    reporte.viajes.map((v) => [v.conductorId, v.conductorPor, v.conductorEscrito]),
    [
      ['zuleta', 'escrito', 'Fernando Zuleta'],
      ['wilfer', 'ultimo_viaje', null],
      ['zuleta', 'preoperacional', null],
    ],
  );
});

prueba('una propuesta corregida antes de este cambio se sigue leyendo (021/RF-104)', () => {
  const corregida = reporteCorregido.parse({
    fecha: '2026-10-05',
    clima: [],
    actividades: [],
    maquinaria: [],
    personal: [],
    ensayos: [],
    viajes: [
      {
        vehiculoId: 'tfo420',
        materialId: 'subbase',
        origenId: 'fortune',
        destino: 'obra',
        pr: null,
        metros: null,
        hora: '08:05',
        conductorId: 'zuleta',
      },
    ],
    notas: '',
  });
  assert.equal(corregida.viajes[0].conductorId, 'zuleta');
  assert.equal(corregida.viajes[0].conductorEscrito, null);
  assert.equal(corregida.viajes[0].conductorPor, null);
});

console.log('\nReportes de WhatsApp: qué impide aprobar\n');

/** El reporte de la plantilla, ya reconocido y corregido: no le falta nada. */
function reporteCompleto(): ReporteDelDia {
  return {
    fecha: '2026-10-01',
    clima: [
      { condicion: 'soleado', desde: '07:00', hasta: '15:00' },
      { condicion: 'lloviendo', desde: '15:00', hasta: '18:00' },
    ],
    actividades: [
      { clave: '5.2.16', itemEscrito: '5.2.16' },
      { clave: '5.1.15', itemEscrito: '5.1.15' },
    ],
    maquinaria: [
      {
        vehiculoId: 'llq375',
        escrito: 'Volqueta: Foton LLQ 375',
        operadorId: 'silfrido',
        operadorEscrito: 'Silfrido Medina',
        medidorInicial: 32524,
        medidorFinal: 32615,
        observaciones: 'Sin novedad',
      },
    ],
    personal: [
      {
        usuarioId: 'silfrido',
        escrito: 'Silfrido Medina',
        entrada: '07:00',
        salida: '18:00',
        observaciones: '',
        hoja: null,
      },
    ],
    ensayos: [
      {
        ensayo: 'densidad_en_campo',
        escrito: 'densidad',
        horaInicio: '09:00',
        horaFin: '10:00',
        responsable: 'Jesús',
        ubicacion: { pr: 1, metros: 150 },
        observacion: '98 %, densidad de primera capa',
      },
    ],
    viajes: [
      {
        vehiculoId: 'llq375',
        materialId: 'sub-base',
        origenId: 'fortune',
        destino: 'obra',
        pr: 1,
        metros: 175,
        hora: '07:30',
        conductorId: 'silfrido',
        vale: 'F-0458',
        conductorEscrito: null,
        conductorPor: null,
        placaEscrita: null,
        materialEscrito: null,
        origenEscrito: null,
        destinoEscrito: null,
      },
      {
        vehiculoId: 'llq375',
        materialId: 'sub-base',
        origenId: 'fortune',
        destino: 'obra',
        pr: 1,
        metros: 200,
        hora: '09:10',
        conductorId: 'silfrido',
        vale: null,
        conductorEscrito: null,
        conductorPor: null,
        placaEscrita: null,
        materialEscrito: null,
        origenEscrito: null,
        destinoEscrito: null,
      },
    ],
    notas: '',
    almacen: [],
  };
}

const CONTEXTO_DEL_REPORTE: ContextoDelReporte = {
  hoy: '2026-10-05',
  claseDeMedidor: () => 'odometro',
};

/** Las faltas como «sección renglón», para comparar sin depender de los textos. */
function dondeFalta(reporte: ReporteDelDia): string[] {
  return faltasDelReporte(reporte, CONTEXTO_DEL_REPORTE).map(
    (f) => `${f.seccion} ${f.renglon ?? '-'}`,
  );
}

prueba('el reporte completo de la plantilla no tiene faltas', () => {
  assert.deepEqual(faltasDelReporte(reporteCompleto(), CONTEXTO_DEL_REPORTE), []);
});

prueba('cinco errores salen a la vez, cada uno en su sección y renglón (RF-64)', () => {
  const reporte = reporteCompleto();
  reporte.actividades[1] = { clave: null, itemEscrito: '9.9.9' };
  reporte.ensayos[0] = { ...reporte.ensayos[0], ensayo: null, escrito: 'densidad nuclear' };
  reporte.viajes[0] = { ...reporte.viajes[0], metros: 1200 };
  reporte.viajes[1] = { ...reporte.viajes[1], hora: null };
  reporte.personal[0] = { ...reporte.personal[0], usuarioId: null, escrito: 'el mono' };

  const faltas = faltasDelReporte(reporte, CONTEXTO_DEL_REPORTE);
  assert.deepEqual(
    faltas.map((f) => `${f.seccion} ${f.renglon}`),
    ['actividades 1', 'personal 0', 'ensayos 0', 'viajes 0', 'viajes 1'],
  );
  const mensajes = faltas.map((f) => f.mensaje);
  assert.ok(mensajes[0].includes('9.9.9'), 'el ítem que no está se nombra (RF-33)');
  assert.ok(mensajes[1].includes('el mono'), 'la persona no reconocida se nombra (RF-79)');
  assert.ok(mensajes[2].includes('densidad nuclear'), 'el ensayo que no está se nombra (RF-36)');
  assert.equal(mensajes[3], 'Los metros van de 0 a 999.'); // RF-86, 026/RF-52
  assert.equal(mensajes[4], 'Falta la hora del viaje.'); // RF-83

  // Y una vez corregido, ya no le falta nada.
  assert.deepEqual(faltasDelReporte(reporteCompleto(), CONTEXTO_DEL_REPORTE), []);
});

prueba('la maquinaria: equipo y operador no reconocidos, repetida y medidor imposible (RF-71, RF-75)', () => {
  const reporte = reporteCompleto();
  reporte.maquinaria.push(
    { ...reporte.maquinaria[0] },
    {
      ...reporte.maquinaria[0],
      vehiculoId: null,
      escrito: 'Excavadora Liugong 922D',
      operadorId: null,
      operadorEscrito: 'el mono',
    },
    { ...reporte.maquinaria[0], vehiculoId: 'llq376', medidorInicial: 500, medidorFinal: 400 },
  );
  assert.deepEqual(dondeFalta(reporte), [
    'maquinaria 1',
    'maquinaria 2',
    'maquinaria 2',
    'maquinaria 3',
  ]);
  // Sin operador escrito no es una falta: el operador es opcional (RF-91).
  const sinOperador = reporteCompleto();
  sinOperador.maquinaria[0] = { ...sinOperador.maquinaria[0], operadorId: null, operadorEscrito: null };
  assert.deepEqual(dondeFalta(sinOperador), []);
});

prueba('el viaje de una volqueta sin operador pide el conductor (RF-95)', () => {
  const reporte = reporteCompleto();
  reporte.viajes[0] = { ...reporte.viajes[0], conductorId: null };
  const faltas = faltasDelReporte(reporte, CONTEXTO_DEL_REPORTE);
  assert.deepEqual(faltas.map((f) => f.mensaje), ['Elija el conductor.']);
});

prueba('la fecha, el clima y el personal se validan como en la bitácora (RF-44, RF-59, RF-67)', () => {
  const futuro = reporteCompleto();
  futuro.fecha = '2026-10-06';
  assert.deepEqual(dondeFalta(futuro), ['fecha -']);

  const sinFecha = reporteCompleto();
  sinFecha.fecha = null;
  // Los viajes no repiten la falta de la fecha: se dice una vez.
  assert.deepEqual(dondeFalta(sinFecha), ['fecha -']);

  const clima = reporteCompleto();
  clima.clima[0] = { ...clima.clima[0], condicion: null };
  clima.clima[1] = { ...clima.clima[1], desde: '14:00' };
  assert.deepEqual(dondeFalta(clima), ['clima 0', 'clima -']);

  const horario = reporteCompleto();
  horario.personal[0] = { ...horario.personal[0], salida: null };
  assert.deepEqual(dondeFalta(horario), ['personal 0']);
});

/** Un reporte de almacén sin faltas: 100 bultos de cemento entran y 30 salen. */
function reporteDeAlmacen(): ReporteDelDia {
  const vacio = reporteCompleto();
  return {
    ...vacio,
    fecha: '2026-10-05',
    clima: [],
    actividades: [],
    maquinaria: [],
    personal: [],
    ensayos: [],
    viajes: [],
    almacen: [
      {
        tipo: 'ingreso',
        materialId: 'cemento',
        materialNuevo: null,
        escrito: 'Cemento gris',
        cantidad: 10000,
        unidadEscrita: 'bultos',
        unidad: 'bulto',
        responsable: 'Jairo Pérez',
        paraQue: '',
        observacion: 'Remisión 4587',
      },
      {
        tipo: 'salida',
        materialId: 'cemento',
        materialNuevo: null,
        escrito: 'Cemento gris',
        cantidad: 3000,
        unidadEscrita: 'bultos',
        unidad: 'bulto',
        responsable: 'Oscar Mejía',
        paraQue: 'Cuneta K1+170',
        observacion: '',
      },
    ],
  };
}

/** El almacén de la obra: cemento con 5 bultos y alambre en kilos sin stock. */
const CONTEXTO_CON_ALMACEN: ContextoDelReporte = {
  ...CONTEXTO_DEL_REPORTE,
  almacen: {
    materiales: [
      { id: 'cemento', nombre: 'Cemento gris', unidad: 'bulto', stock: 500 },
      { id: 'alambre', nombre: 'Alambre negro calibre 18', unidad: 'kilogramo', stock: 0 },
    ],
  },
};

const faltasDelAlmacen = (reporte: ReporteDelDia) =>
  faltasDelReporte(reporte, CONTEXTO_CON_ALMACEN).map((f) => `${f.seccion} ${f.renglon ?? '-'}: ${f.mensaje}`);

prueba('un reporte de almacén completo no tiene faltas (023/RF-26 a RF-34)', () => {
  assert.deepEqual(faltasDelAlmacen(reporteDeAlmacen()), []);
  // Con un material nuevo, bien registrado, tampoco.
  const conNuevo = reporteDeAlmacen();
  conNuevo.almacen.push(
    {
      ...conNuevo.almacen[0],
      materialId: null,
      materialNuevo: { nombre: 'Tubería PVC 4"', unidad: 'metro' },
      escrito: 'Tubería PVC 4"',
      cantidad: 1200,
      unidadEscrita: 'mts',
      unidad: 'metro',
    },
    {
      ...conNuevo.almacen[1],
      materialId: null,
      materialNuevo: { nombre: 'tubería pvc 4"', unidad: 'metro' },
      escrito: 'Tubería PVC 4"',
      cantidad: 1200,
      unidadEscrita: 'mts',
      unidad: 'metro',
    },
  );
  assert.deepEqual(faltasDelAlmacen(conNuevo), [], 'el mismo material nuevo en dos renglones es uno solo');
});

prueba('las faltas del almacén salen todas a la vez, cada una en su renglón (023/RF-26 a RF-36)', () => {
  const reporte = reporteDeAlmacen();
  const base = reporte.almacen[0];
  reporte.almacen = [
    // 0: no reconocido, sin elegir ni registrar (RF-27).
    { ...base, materialId: null, escrito: 'Varilla 1/2' },
    // 1: material nuevo con el nombre de uno que ya está (RF-29).
    { ...base, materialId: null, materialNuevo: { nombre: 'CEMENTO GRIS', unidad: 'bulto' } },
    // 2: material nuevo sin unidad (RF-28).
    { ...base, materialId: null, materialNuevo: { nombre: 'Arena de río', unidad: null } },
    // 3: la unidad del renglón no es la del material (RF-30).
    { ...base, unidad: 'kilogramo', unidadEscrita: 'kg' },
    // 4: la unidad escrita no se reconoció (RF-30).
    { ...base, unidad: null, unidadEscrita: 'varillas' },
    // 5: ingreso sin quién lo entregó (RF-31).
    { ...base, responsable: '  ' },
    // 6: salida sin quién la recibió ni para qué (RF-32).
    { ...reporte.almacen[1], responsable: '', paraQue: '' },
    // 7: cantidad ilegible.
    { ...base, cantidad: null },
    // 8: salida de alambre, que no tiene stock (RF-33).
    { ...reporte.almacen[1], materialId: 'alambre', unidad: 'kilogramo', cantidad: 500 },
  ];
  assert.deepEqual(faltasDelAlmacen(reporte), [
    'almacen 0: No se reconoció «Varilla 1/2» en el almacén de la obra: elíjalo de la lista, regístrelo como material nuevo o quite el renglón.',
    'almacen 1: Ya hay un material «Cemento gris» en el almacén: elíjalo de la lista en vez de registrarlo de nuevo.',
    'almacen 2: Elija la unidad del material nuevo.',
    'almacen 3: «Cemento gris» se lleva en bultos y el renglón dice kg: corrija la cantidad o la unidad.',
    'almacen 4: No se reconoció la unidad «varillas»: escriba la cantidad en bultos.',
    'almacen 5: Escriba quién entregó el material.',
    'almacen 6: Escriba para qué se usará lo que sale.',
    'almacen 6: Escriba quién recibió el material.',
    'almacen 7: Escriba la cantidad, con hasta dos decimales.',
    'almacen 8: No alcanza: quedan 0 kg y la salida es de 5 kg.',
  ]);
});

prueba('un reporte de almacén con fecha futura dice la fecha una sola vez (023/RF-36)', () => {
  const futuro = reporteDeAlmacen();
  futuro.fecha = '2026-10-06';
  assert.deepEqual(
    faltasDelReporte(futuro, CONTEXTO_CON_ALMACEN).map((f) => `${f.seccion} ${f.renglon ?? '-'}`),
    ['fecha -'],
  );
});

prueba('una salida que pasa del stock con el ingreso del mismo reporte sí alcanza (023/RF-33, RF-34)', () => {
  // Hay 5 bultos; entran 100 y salen 30: alcanza. Sin el ingreso, no.
  assert.deepEqual(faltasDelAlmacen(reporteDeAlmacen()), []);
  const sinIngreso = reporteDeAlmacen();
  sinIngreso.almacen = [sinIngreso.almacen[1]];
  assert.deepEqual(faltasDelAlmacen(sinIngreso), [
    'almacen 0: No alcanza: quedan 5 bultos y la salida es de 30 bultos.',
  ]);
});

console.log('\nReportes de WhatsApp: categorías y mezcla con la bitácora\n');

prueba('seguimiento e ignorar entran ignorados; lo demás, pendiente (RF-23, RF-90)', () => {
  assert.equal(estadoInicialDeCategoria('seguimiento'), 'ignorado');
  assert.equal(estadoInicialDeCategoria('ignorar'), 'ignorado');
  assert.equal(estadoInicialDeCategoria('reporte_diario'), 'pendiente');
  assert.equal(estadoInicialDeCategoria('incidente'), 'pendiente');
  // Una categoría que nadie decidió no se esconde: la ve una persona.
  assert.equal(estadoInicialDeCategoria('categoria_nueva'), 'pendiente');
  assert.equal(estadoInicialDeCategoria(null), 'pendiente');
});

prueba('cada categoría se nombra en español, y una desconocida se muestra como vino (RF-18)', () => {
  assert.equal(etiquetaDeCategoria('reporte_diario'), 'Reporte diario');
  assert.equal(etiquetaDeCategoria('vehiculo_maquinaria'), 'Vehículo o maquinaria');
  assert.equal(etiquetaDeCategoria('categoria_nueva'), 'categoria_nueva');
  assert.equal(etiquetaDeCategoria(null), 'Sin categoría');
});

prueba('cada categoría tiene su destino, y una desconocida no crea nada (RF-30, RF-35, RF-38, RF-39, RF-49)', () => {
  assert.equal(destinoDeCategoria('reporte_diario'), 'reporte');
  assert.equal(destinoDeCategoria('reporte_actividades'), 'reporte');
  assert.equal(destinoDeCategoria('laboratorio'), 'control_calidad');
  assert.equal(destinoDeCategoria('incidente'), 'notas');
  assert.equal(destinoDeCategoria('vehiculo_maquinaria'), 'notas');
  assert.equal(destinoDeCategoria('inicio_actividades'), 'notas');
  assert.equal(destinoDeCategoria('administrativo'), 'notas');
  assert.equal(destinoDeCategoria('suministro_cantera'), 'cantera');
  assert.equal(destinoDeCategoria('seguimiento'), 'ninguno');
  assert.equal(destinoDeCategoria('categoria_nueva'), 'ninguno');
  assert.equal(destinoDeCategoria(undefined), 'ninguno');
});

/** Una bitácora abierta con lo de un primer reporte, y un segundo reporte del día. */
function dosReportesDelDia() {
  const parte = {
    maquinaria: [
      { id: 'm-1', vehiculoId: 'llq375', medidorFinal: 32615 },
      { id: 'm-2', vehiculoId: 'llq376', medidorFinal: 1000 },
    ],
    personal: [
      { id: 'p-1', usuarioId: 'silfrido', salida: '17:00' },
      { id: 'p-2', usuarioId: 'diego-c', salida: '17:00' },
    ],
    actividades: [{ id: 'a-1' }],
    clima: [
      { id: 'c-1', desde: '07:00' },
      { id: 'c-2', desde: '12:00' },
    ],
    laboratorio: [{ id: 'e-1' }],
    notas: 'Cierre vial en el PR 2.',
  };
  const reporte = {
    maquinaria: [{ id: 'm-3', vehiculoId: 'llq375', medidorFinal: 32700 }],
    personal: [
      { id: 'p-3', usuarioId: 'silfrido', salida: '18:00' },
      { id: 'p-4', usuarioId: 'jesus', salida: '16:00' },
    ],
    actividades: [{ id: 'a-2' }],
    clima: [{ id: 'c-3', desde: '07:00' }],
    laboratorio: [{ id: 'e-2' }],
    notas: 'Se varó la LLQ 376 a las 2 pm.',
  };
  return { parte, reporte };
}

prueba('el segundo reporte reemplaza persona, máquina y clima, y suma lo demás (RF-88, RF-92, RF-93)', () => {
  const { parte, reporte } = dosReportesDelDia();
  const fusion = fusionarReporteEnParte(parte, reporte);

  // La máquina y la persona repetidas se reemplazan en su sitio; las nuevas, al final.
  assert.deepEqual(fusion.maquinaria.map((m) => m.id), ['m-3', 'm-2']);
  assert.equal(fusion.maquinaria[0].medidorFinal, 32700);
  assert.deepEqual(fusion.personal.map((p) => p.id), ['p-3', 'p-2', 'p-4']);
  assert.equal(fusion.personal[0].salida, '18:00');
  // Todo el clima se reemplaza.
  assert.deepEqual(fusion.clima.map((f) => f.id), ['c-3']);
  // Actividades, ensayos y notas se suman.
  assert.deepEqual(fusion.actividades.map((a) => a.id), ['a-1', 'a-2']);
  assert.deepEqual(fusion.laboratorio.map((e) => e.id), ['e-1', 'e-2']);
  assert.equal(fusion.notas, 'Cierre vial en el PR 2.\n\nSe varó la LLQ 376 a las 2 pm.');
});

prueba('un reporte sin clima deja el clima que había, y en una bitácora vacía todo se añade', () => {
  const { parte, reporte } = dosReportesDelDia();
  assert.deepEqual(
    fusionarReporteEnParte(parte, { ...reporte, clima: [] }).clima.map((f) => f.id),
    ['c-1', 'c-2'],
  );
  const vacia = { maquinaria: [], personal: [], actividades: [], clima: [], laboratorio: [], notas: null };
  const fusion = fusionarReporteEnParte(vacia, reporte);
  assert.deepEqual(fusion.personal.map((p) => p.id), ['p-3', 'p-4']);
  assert.equal(fusion.notas, 'Se varó la LLQ 376 a las 2 pm.');
});

prueba('fusionar dos veces el mismo reporte no duplica nada (reintento de la aprobación)', () => {
  const { parte, reporte } = dosReportesDelDia();
  const una = fusionarReporteEnParte(parte, reporte);
  const dos = fusionarReporteEnParte(una, reporte);
  assert.deepEqual(dos, una);
});

prueba('el aviso nombra lo que se va a reemplazar, y no lo de este mismo reporte (RF-89)', () => {
  const { parte, reporte } = dosReportesDelDia();
  const aviso = avisoDeReemplazo(parte, reporte);
  assert.deepEqual(aviso.maquinas.map((m) => m.id), ['m-1']);
  assert.deepEqual(aviso.personas.map((p) => p.id), ['p-1']);
  assert.deepEqual(aviso.franjas.map((f) => f.id), ['c-1', 'c-2']);

  // Ya aplicado (un reintento), no hay nada que avisar.
  const yaAplicado = avisoDeReemplazo(fusionarReporteEnParte(parte, reporte), reporte);
  assert.deepEqual(yaAplicado, { maquinas: [], personas: [], franjas: [] });

  // Sin clima en el reporte, las franjas no se tocan.
  assert.deepEqual(avisoDeReemplazo(parte, { ...reporte, clima: [] }).franjas, []);
});

console.log('\nReportes de WhatsApp: de la propuesta al reporte\n');

const CATALOGOS_DE_PRUEBA: CatalogosDeLaObra = {
  obraId: 'obra-a',
  vehiculos: EQUIPOS_DEL_REPORTE,
  personas: PERSONAS_DEL_REPORTE,
  sitios: [
    { id: 'fortune', nombre: 'Cantera Fortune' },
    { id: 'planta', nombre: 'Planta de trituración' },
  ],
  materiales: [
    { id: 'sub-base', nombre: 'Sub-base granular' },
    { id: 'base', nombre: 'Base granular' },
  ],
};

/** Lo que la IA devolvería por el reporte de la plantilla (esquema 2). */
const PROPUESTA_DE_LA_PLANTILLA = {
  fecha_evento: '2026-10-01',
  clima: [
    { condicion: 'fue un clima soleado', desde: '7:00 am', hasta: '3:00 pm' },
    { condicion: 'se presentó lluvias', desde: '3:00 pm', hasta: '6:00 pm' },
  ],
  actividades: [
    {
      descripcion: 'Capa a estabilizar',
      abscisa_inicio: 'K1+040',
      abscisa_fin: 'K1+190',
      longitud_m: 150,
      ancho_m: 6.4,
      espesor_m: 0.25,
      items_pago: [
        { codigo: '5.1.15', cantidad: 312 },
        { codigo: '13.1', cantidad: 20068.8 },
        { codigo: '9.9.9', cantidad: 1 },
      ],
    },
  ],
  maquinaria: [
    {
      equipo: 'Volqueta: Foton LLQ 375',
      operador: 'Silfrido Medina',
      medidor_inicial: 32524,
      medidor_final: 32615,
      observacion: 'Sin novedad',
    },
    { equipo: 'Volqueta Foton LLQ 376', operador: 'el mono', medidor_inicial: 100, medidor_final: 150 },
    // Listada sin lecturas: ese día no trabajó (RF-69).
    { equipo: 'Volqueta Kentworth TAY 153' },
  ],
  personal: [{ nombre: 'Silfrido Medina', entrada: '7:00 am', salida: '6:00 pm' }],
  ensayos: [
    {
      tipo: 'densidad',
      hora_inicio: '9am',
      hora_fin: '10:00 am',
      responsable: 'jesus',
      ubicacion: 'pr 1 + 150',
      resultado: 98,
      unidad: '%',
      cumple: 'si',
      observacion: 'densidad de primera capa',
    },
  ],
  viajes: [
    {
      placa: 'LLQ 375',
      cantidad: 2,
      material: 'sub-base',
      origen: 'Fortune',
      destino: 'obra',
      abscisa_llegada: 'PR 1+175',
      hora: '7:30 am',
    },
    { placa: 'LLQ 376', material: 'base granular', origen: 'planta', abscisa_llegada: 'K1+200', hora: '9:10' },
  ],
  novedades: [{ descripcion: 'Se varó la LLQ 376 a las 2 pm.' }],
};

prueba('un sitio, un material o un ensayo se reconocen por su nombre, y ambiguo es ninguno', () => {
  assert.equal(reconocerPorNombre('fortune', CATALOGOS_DE_PRUEBA.sitios), 'fortune');
  assert.equal(reconocerPorNombre('Sub-base', CATALOGOS_DE_PRUEBA.materiales), 'sub-base');
  // «granular» está en los dos materiales.
  assert.equal(reconocerPorNombre('granular', CATALOGOS_DE_PRUEBA.materiales), null);
  assert.equal(reconocerPorNombre('arena', CATALOGOS_DE_PRUEBA.materiales), null);
});

// Spec 021, cambio 2026-10-08: el catálogo de cantera de Consorcio Magdalena y lo que
// escribieron en los vales del 7-oct.
const SITIOS_DE_LOS_VALES = [
  { id: 'fortune', nombre: 'LA FORTUNE' },
  { id: 'porton', nombre: 'PORTON DE LA VEGA' },
  { id: 'nare', nombre: 'Puerto Nare' },
];
const MATERIALES_DE_LOS_VALES = [
  { id: 'subbase', nombre: 'SUBBASE' },
  { id: 'subbase-rio', nombre: 'SUBBASE DE RIO' },
  { id: 'filtro', nombre: 'PIEDRA FILTRO' },
];

prueba('el material de un viaje se reconoce sin espacios, guiones ni puntos (021/RF-110)', () => {
  assert.equal(reconocerEnCantera('Sub-base', MATERIALES_DE_LOS_VALES), 'subbase');
  assert.equal(reconocerEnCantera('Sub base', MATERIALES_DE_LOS_VALES), 'subbase');
  assert.equal(reconocerEnCantera('SUBBASE', MATERIALES_DE_LOS_VALES), 'subbase');
  assert.equal(reconocerEnCantera('Sub-base de río', MATERIALES_DE_LOS_VALES), 'subbase-rio');
  assert.equal(reconocerEnCantera('piedra filtro', MATERIALES_DE_LOS_VALES), 'filtro');
  assert.equal(reconocerEnCantera('Base granular', MATERIALES_DE_LOS_VALES), null);
  assert.equal(reconocerEnCantera('', MATERIALES_DE_LOS_VALES), null);
});

prueba('un sitio se reconoce sin «cantera», «el», «la» ni «c.» (021/RF-111)', () => {
  assert.equal(reconocerEnCantera('Cantera FORTUNE', SITIOS_DE_LOS_VALES), 'fortune');
  assert.equal(reconocerEnCantera('Cantera la fortune', SITIOS_DE_LOS_VALES), 'fortune');
  assert.equal(reconocerEnCantera('C. Fortune', SITIOS_DE_LOS_VALES), 'fortune');
  assert.equal(reconocerEnCantera('Cantera el portón de la Vega', SITIOS_DE_LOS_VALES), 'porton');
  assert.equal(reconocerEnCantera('Cantera Portón de la Vega', SITIOS_DE_LOS_VALES), 'porton');
  assert.equal(reconocerEnCantera('cantera porton', SITIOS_DE_LOS_VALES), 'porton');
  assert.equal(reconocerEnCantera('Vía las Margaritas', SITIOS_DE_LOS_VALES), null);
  // «Cantera» sola no dice cuál.
  assert.equal(reconocerEnCantera('Cantera', SITIOS_DE_LOS_VALES), null);
});

prueba('los viajes de un vale se leen con el catálogo de cantera (021/RF-110, RF-111)', () => {
  const { reporte } = resolverPropuesta(
    {
      viajes: [
        { placa: 'TFO42O', material: 'Sub-base', origen: 'Cantera FORTUNE', destino: 'Cantera el portón de la Vega', hora: '08:05' },
      ],
    },
    {
      obraId: 'obra-a',
      vehiculos: VOLQUETAS_DE_LOS_VALES,
      personas: [],
      sitios: SITIOS_DE_LOS_VALES,
      materiales: MATERIALES_DE_LOS_VALES,
    },
    { diaDelMensaje: '2026-10-07', destino: 'cantera' },
  );
  const [viaje] = reporte.viajes;
  assert.equal(viaje.vehiculoId, 'tfo420');
  assert.equal(viaje.materialId, 'subbase');
  assert.equal(viaje.origenId, 'fortune');
  assert.equal(viaje.destino, 'porton');
});

prueba('la propuesta de la plantilla se lee sección por sección (RF-60 a RF-95)', () => {
  const { reporte, fechaSupuesta } = resolverPropuesta(PROPUESTA_DE_LA_PLANTILLA, CATALOGOS_DE_PRUEBA, {
    diaDelMensaje: '2026-10-02',
    destino: 'reporte',
  });
  // La fecha del encabezado, no la del mensaje (RF-61).
  assert.equal(reporte.fecha, '2026-10-01');
  assert.equal(fechaSupuesta, false);
  // Clima en franjas con su condición y sus horas (RF-66).
  assert.deepEqual(reporte.clima, [
    { condicion: 'soleado', desde: '07:00', hasta: '15:00' },
    { condicion: 'lloviendo', desde: '15:00', hasta: '18:00' },
  ]);
  // Una actividad por ítem, con las abscisas en la descripción (RF-31, RF-34); el
  // ítem que no está en el presupuesto queda sin elegir y con lo escrito (RF-33).
  assert.deepEqual(
    reporte.actividades.map((a) => [a.clave, a.itemEscrito, a.cantidad]),
    [
      ['5.1.15', '5.1.15', 312],
      ['13.1', '13.1', 20068.8],
      [null, '9.9.9', 1],
    ],
  );
  assert.equal(reporte.actividades[0].descripcion, 'Capa a estabilizar, desde K1+040 hasta K1+190');
  assert.equal(reporte.actividades[0].alto, 0.25);
  // Maquinaria: la que no tiene lecturas no entra (RF-69); el operador no
  // reconocido queda con lo escrito (RF-75).
  assert.deepEqual(
    reporte.maquinaria.map((m) => [m.vehiculoId, m.operadorId, m.operadorEscrito]),
    [
      ['llq375', 'silfrido', 'Silfrido Medina'],
      ['llq376', null, 'el mono'],
    ],
  );
  assert.deepEqual(reporte.personal, [
    { usuarioId: 'silfrido', escrito: 'Silfrido Medina', entrada: '07:00', salida: '18:00', observaciones: '', hoja: null },
  ]);
  // El ensayo: reconocido por su nombre, con horas, ubicación y observación (RF-37, RF-81);
  // el resultado y si cumple, en sus casillas (spec 025, RF-42).
  assert.deepEqual(reporte.ensayos[0], {
    ensayo: 'densidad_en_campo',
    escrito: 'densidad',
    horaInicio: '09:00',
    horaFin: '10:00',
    responsable: 'jesus',
    ubicacion: { pr: 1, metros: 150 },
    observacion: 'densidad de primera capa',
    resultado: 98,
    unidad: '%',
    cumple: 'si',
  });
  // «2 viajes» son dos viajes; el conductor es el operador de esa volqueta (RF-87, RF-94).
  assert.equal(reporte.viajes.length, 3);
  assert.deepEqual(reporte.viajes[0], {
    vehiculoId: 'llq375',
    materialId: 'sub-base',
    origenId: 'fortune',
    destino: 'obra',
    pr: 1,
    metros: 175,
    hora: '07:30',
    conductorId: 'silfrido',
    vale: null,
    conductorEscrito: null,
    conductorPor: 'reporte',
    placaEscrita: 'LLQ 375',
    materialEscrito: 'sub-base',
    origenEscrito: 'Fortune',
    destinoEscrito: 'obra',
  });
  assert.deepEqual(reporte.viajes[1], reporte.viajes[0]);
  // Sin destino escrito pero con abscisa de llegada, va a la obra; la volqueta sin
  // operador reconocido deja el conductor para elegir (RF-95).
  assert.deepEqual(
    [reporte.viajes[2].destino, reporte.viajes[2].metros, reporte.viajes[2].conductorId],
    ['obra', 200, null],
  );
  assert.equal(reporte.notas, 'Se varó la LLQ 376 a las 2 pm.');

  // Y lo que no se reconoció es justo lo que falta para aprobar.
  const faltas = faltasDelReporte(reporte, { hoy: '2026-10-05', claseDeMedidor: () => 'odometro' });
  assert.deepEqual(
    faltas.map((f) => `${f.seccion} ${f.renglon}`),
    ['actividades 2', 'maquinaria 1', 'viajes 2'],
  );
});

prueba('sin fecha en el reporte, se toma la del mensaje y se avisa (RF-62)', () => {
  const resuelto = resolverPropuesta({ fecha_evento: 'ayer' }, CATALOGOS_DE_PRUEBA, {
    diaDelMensaje: '2026-10-02',
    destino: 'reporte',
  });
  assert.equal(resuelto.reporte.fecha, '2026-10-02');
  assert.equal(resuelto.fechaSupuesta, true);
});

prueba('un incidente sin novedades lleva su resumen a las notas (RF-38)', () => {
  const incidente = resolverPropuesta(
    { fecha_evento: '2026-10-01', resumen: 'Cierre vial en el PR 2 por derrumbe.' },
    CATALOGOS_DE_PRUEBA,
    { diaDelMensaje: '2026-10-01', destino: 'notas' },
  );
  assert.equal(incidente.reporte.notas, 'Cierre vial en el PR 2 por derrumbe.');
  // En un reporte diario, el resumen no es una nota.
  const reporte = resolverPropuesta(
    { fecha_evento: '2026-10-01', resumen: 'Reporte del día.' },
    CATALOGOS_DE_PRUEBA,
    { diaDelMensaje: '2026-10-01', destino: 'reporte' },
  );
  assert.equal(reporte.reporte.notas, '');
});

prueba('un reporte de almacén es su propia categoría y no va a la bitácora (023/RF-18, RF-40)', () => {
  assert.equal(destinoDeCategoria('reporte_almacen'), 'almacen');
  assert.equal(etiquetaDeCategoria('reporte_almacen'), 'Reporte de almacén');
  assert.equal(estadoInicialDeCategoria('reporte_almacen'), 'pendiente');
});

/** Los materiales del almacén de la obra de prueba. */
const CATALOGOS_CON_ALMACEN = {
  ...CATALOGOS_DE_PRUEBA,
  materialesAlmacen: [
    { id: 'cemento', nombre: 'Cemento gris' },
    { id: 'alambre', nombre: 'Alambre negro para amarre calibre 18' },
  ],
};

prueba('el reporte de almacén se lee en ingresos y salidas, con la fecha del encabezado (023/RF-19 a RF-21)', () => {
  const { reporte, fechaSupuesta } = resolverPropuesta(
    {
      fecha_evento: '2026-10-07',
      almacen: {
        ingresos: [
          {
            material: 'cemento GRIS',
            cantidad: 100,
            unidad: 'Bultos',
            entregado_por: 'Transportes El Roble – Jairo Pérez',
            observacion: 'Remisión 4587',
          },
          { material: 'Tubería PVC 4"', cantidad: 2.5, unidad: 'mts', entregado_por: '' },
        ],
        salidas: [
          {
            material: 'Cemento gris',
            cantidad: 30,
            unidad: 'bulto',
            recibido_por: 'Oscar Mejía',
            para_que: 'Cuneta K1+170 a K1+300',
          },
        ],
      },
    },
    CATALOGOS_CON_ALMACEN,
    { diaDelMensaje: '2026-10-08', destino: 'almacen' },
  );
  assert.equal(reporte.fecha, '2026-10-07');
  assert.equal(fechaSupuesta, false);
  assert.deepEqual(reporte.almacen, [
    {
      tipo: 'ingreso',
      materialId: 'cemento',
      materialNuevo: null,
      escrito: 'cemento GRIS',
      cantidad: 10000,
      unidadEscrita: 'Bultos',
      unidad: 'bulto',
      responsable: 'Transportes El Roble – Jairo Pérez',
      paraQue: '',
      observacion: 'Remisión 4587',
    },
    {
      // No está en el almacén: queda sin elegir, para elegirlo, registrarlo o quitarlo (RF-27).
      tipo: 'ingreso',
      materialId: null,
      materialNuevo: null,
      escrito: 'Tubería PVC 4"',
      cantidad: 250,
      unidadEscrita: 'mts',
      unidad: 'metro',
      responsable: '',
      paraQue: '',
      observacion: '',
    },
    {
      tipo: 'salida',
      materialId: 'cemento',
      materialNuevo: null,
      escrito: 'Cemento gris',
      cantidad: 3000,
      unidadEscrita: 'bulto',
      unidad: 'bulto',
      responsable: 'Oscar Mejía',
      paraQue: 'Cuneta K1+170 a K1+300',
      observacion: '',
    },
  ]);
  // Un nombre parecido no es el mismo material: solo el igual sin tildes ni mayúsculas (RF-26).
  const parecido = resolverPropuesta(
    { almacen: { ingresos: [{ material: 'Cemento', cantidad: 1, unidad: 'bulto' }] } },
    CATALOGOS_CON_ALMACEN,
    { diaDelMensaje: '2026-10-08', destino: 'almacen' },
  );
  assert.equal(parecido.reporte.almacen[0].materialId, null);
  assert.equal(parecido.fechaSupuesta, true, 'sin encabezado, la fecha del mensaje (RF-21)');
  // Un reporte diario no trae almacén.
  assert.deepEqual(
    resolverPropuesta(PROPUESTA_DE_LA_PLANTILLA, CATALOGOS_DE_PRUEBA, {
      diaDelMensaje: '2026-10-02',
      destino: 'reporte',
    }).reporte.almacen,
    [],
  );
});

prueba('el vale de un viaje y la hoja de una persona se leen de la propuesta (023/RF-50, RF-62)', () => {
  const { reporte } = resolverPropuesta(
    {
      fecha_evento: '2026-10-05',
      viajes: [
        { placa: 'LLQ 375', material: 'sub-base', origen: 'Fortune', destino: 'obra', abscisa_llegada: 'K1+175', hora: '7:30', vale: ' F-0458 ' },
        { placa: 'LLQ 375', material: 'sub-base', origen: 'Fortune', hora: '9:00' },
        // Un renglón con varios viajes no reparte un mismo vale entre todos.
        { placa: 'LLQ 375', cantidad: 2, material: 'sub-base', origen: 'Fortune', hora: '10:00', vale: 'F-0460' },
      ],
      personal: [
        { nombre: 'Silfrido Medina', entrada: '07:30', salida: '6:00Pm', cargo_hoja: 'CONDUCTORES' },
        { nombre: 'Oscar Velandia', entrada: '07:30', salida: '18:00' },
      ],
    },
    CATALOGOS_DE_PRUEBA,
    { diaDelMensaje: '2026-10-06', destino: 'reporte' },
  );
  assert.deepEqual(
    reporte.viajes.map((v) => v.vale),
    ['F-0458', null, null, null],
  );
  assert.deepEqual(
    reporte.personal.map((p) => [p.escrito, p.hoja, p.salida]),
    [
      ['Silfrido Medina', 'CONDUCTORES', '18:00'],
      ['Oscar Velandia', null, '18:00'],
    ],
  );
});

prueba('una propuesta corregida antes de la spec 023 se lee sin almacén, vale ni hoja', () => {
  // Las que ya estaban guardadas en la base no traen los campos nuevos.
  const vieja = reporteCompleto() as unknown as Record<string, unknown>;
  delete vieja.almacen;
  const leida = reporteCorregido.parse({
    ...vieja,
    viajes: (vieja.viajes as Record<string, unknown>[]).map(({ vale: _vale, ...v }) => v),
    personal: (vieja.personal as Record<string, unknown>[]).map(({ hoja: _hoja, ...p }) => p),
  });
  assert.deepEqual(leida.almacen, []);
  assert.equal(leida.viajes[0].vale, null);
  assert.equal(leida.personal[0].hoja, null);
});

prueba('un renglón con una cantidad absurda de viajes no pasa de 30', () => {
  const resuelto = resolverPropuesta(
    { fecha_evento: '2026-10-01', viajes: [{ placa: 'LLQ 375', cantidad: 4000 }] },
    CATALOGOS_DE_PRUEBA,
    { diaDelMensaje: '2026-10-01', destino: 'cantera' },
  );
  assert.equal(resuelto.reporte.viajes.length, 30);
});

console.log('\nWhatsApp, guardado automático: tipo de reporte y datos por defecto (spec 024)\n');

/** Un reporte vacío, para armar casos con una sola sección. */
function reporteVacio(): ReporteDelDia {
  return {
    fecha: '2026-10-07',
    clima: [],
    actividades: [],
    maquinaria: [],
    personal: [],
    ensayos: [],
    viajes: [],
    notas: '',
    almacen: [],
  };
}

const PERSONA_DEL_ARCHIVO = {
  usuarioId: null,
  escrito: 'Yobani Osorio',
  entrada: '06:00',
  salida: '18:00',
  observaciones: '',
  hoja: 'CONDUCTORES',
};

prueba('una fecha que no existe en el calendario se toma como no leída (RF-21)', () => {
  const leer = (fecha_evento: string) =>
    resolverPropuesta({ fecha_evento }, { obraId: 'o', vehiculos: [], personas: [], sitios: [], materiales: [] }, {
      diaDelMensaje: '2026-10-07',
      destino: 'cantera',
    });
  assert.deepEqual(leer('2026-02-30'), { reporte: { ...leer('2026-10-07').reporte }, fechaSupuesta: true });
  assert.equal(leer('2026-13-01').fechaSupuesta, true);
  assert.equal(leer('2026-02-28').reporte.fecha, '2026-02-28');
  assert.equal(leer('2026-02-28').fechaSupuesta, false);
});

prueba('cada mensaje cuenta como uno de los reportes que se esperan (RF-38)', () => {
  const soloPersonal = { ...reporteVacio(), personal: [PERSONA_DEL_ARCHIVO] };
  assert.equal(tipoDeReporte('reporte_diario', soloPersonal), 'personal');
  // Con cualquier otra sección, es el reporte diario.
  assert.equal(
    tipoDeReporte('reporte_diario', { ...soloPersonal, notas: 'Sin novedad' }),
    'reporte_diario',
  );
  assert.equal(tipoDeReporte('reporte_actividades', reporteVacio()), 'reporte_diario');
  assert.equal(tipoDeReporte('laboratorio', reporteVacio()), 'control_calidad');
  assert.equal(tipoDeReporte('inicio_actividades', reporteVacio()), 'inicio_actividades');
  assert.equal(tipoDeReporte('suministro_cantera', reporteVacio()), 'viajes');
  // Lo que no es ninguno de los esperados no cuenta para el día.
  assert.equal(tipoDeReporte('incidente', reporteVacio()), null);
  assert.equal(tipoDeReporte('reporte_almacen', reporteVacio()), null);
  assert.equal(tipoDeReporte('ignorar', reporteVacio()), null);
  assert.equal(tipoDeReporte(null, reporteVacio()), null);
});

const VIAJE_SIN_COMPLETAR = {
  vehiculoId: 'tfo420',
  materialId: 'subbase',
  origenId: 'porton',
  destino: null,
  pr: null,
  metros: null,
  hora: null,
  conductorId: 'zuleta',
  vale: '0000557',
  conductorEscrito: 'Fernando Zuleta',
  conductorPor: 'escrito' as const,
  placaEscrita: 'TFO420',
  materialEscrito: 'SUBBASE',
  origenEscrito: 'PORTON DE LA VEGA',
  destinoEscrito: null,
};

// 7-oct-2026 a las 21:06 en Colombia (02:06 del 8-oct en UTC).
const ENVIADO_EL_7_OCT = Date.parse('2026-10-08T02:06:00Z');

prueba('un viaje sin hora toma la de la foto y, sin ella, la del mensaje en Colombia (RF-16)', () => {
  assert.equal(completarViaje(VIAJE_SIN_COMPLETAR, { horaFoto: '13:47', enviadoEn: ENVIADO_EL_7_OCT }).hora, '13:47');
  assert.equal(completarViaje(VIAJE_SIN_COMPLETAR, { horaFoto: '1:47 pm', enviadoEn: ENVIADO_EL_7_OCT }).hora, '13:47');
  assert.equal(completarViaje(VIAJE_SIN_COMPLETAR, { horaFoto: null, enviadoEn: ENVIADO_EL_7_OCT }).hora, '21:06');
  assert.equal(completarViaje(VIAJE_SIN_COMPLETAR, { horaFoto: 'borrosa', enviadoEn: ENVIADO_EL_7_OCT }).hora, '21:06');
  // La hora que trae el viaje no se toca.
  assert.equal(
    completarViaje({ ...VIAJE_SIN_COMPLETAR, hora: '07:50' }, { horaFoto: '13:47', enviadoEn: ENVIADO_EL_7_OCT }).hora,
    '07:50',
  );
});

prueba('un viaje sin destino escrito va a la obra; uno escrito y no reconocido no (RF-17)', () => {
  const contexto = { horaFoto: null, enviadoEn: ENVIADO_EL_7_OCT };
  assert.equal(completarViaje(VIAJE_SIN_COMPLETAR, contexto).destino, DESTINO_OBRA);
  // «Vía las Margaritas» no es un sitio de la obra: no se inventa que llegó a la obra.
  assert.equal(
    completarViaje({ ...VIAJE_SIN_COMPLETAR, destinoEscrito: 'Vía las Margaritas' }, contexto).destino,
    null,
  );
  assert.equal(completarViaje({ ...VIAJE_SIN_COMPLETAR, destino: 'porton' }, contexto).destino, 'porton');
});

prueba('de una máquina del reporte se toma la placa colombiana que trae escrita (RF-30)', () => {
  assert.equal(placaDeLaMaquina('Volqueta Foton LLQ 375'), 'LLQ375');
  assert.equal(placaDeLaMaquina('Volqueta Kenworth TAY-076'), 'TAY076');
  assert.equal(placaDeLaMaquina('camioneta lvv405'), 'LVV405');
  // Sin placa (un serial de maquinaria amarilla), no hay con qué registrarla.
  assert.equal(placaDeLaMaquina('Motoniveladora MC770191'), null);
  assert.equal(placaDeLaMaquina('Recicladora Wirtgen WR 2000'), null);
  assert.equal(placaDeLaMaquina(null), null);
});

prueba('una placa de menos de cinco letras y cifras no alcanza para registrar la volqueta (RF-31)', () => {
  assert.equal(placaRegistrable('TFO420'), 'TFO420');
  assert.equal(placaRegistrable('tfo 420'), 'TFO420');
  assert.equal(placaRegistrable('LLQ-377'), 'LLQ377');
  assert.equal(placaRegistrable('TFO4'), null);
  assert.equal(placaRegistrable('TFO 4…'), null);
  assert.equal(placaRegistrable(''), null);
  assert.equal(placaRegistrable(null), null);
});

console.log('\nWhatsApp, guardado automático: viajes sin duplicar (spec 024)\n');

// Los viajes vigentes ya guardados ese día en la obra.
const GUARDADOS_DEL_DIA = [
  { id: 'v-437', vale: '0000437', vehiculoId: 'llq377', hora: '07:41', anulado: false },
  { id: 'v-sin-vale', vale: null, vehiculoId: 'tfo420', hora: '09:55', anulado: false },
  { id: 'v-anulado', vale: '0000999', vehiculoId: 'tay076', hora: '10:00', anulado: true },
];

prueba('con número de vale, el viaje repetido es el que tiene ese vale (RF-11, RF-13)', () => {
  // La IA leyó distinta la hora de la misma foto: sigue siendo el mismo viaje.
  assert.equal(
    viajeRepetido({ vale: '0000437', vehiculoId: 'llq377', hora: '19:41' }, GUARDADOS_DEL_DIA),
    'v-437',
  );
  // Solo las mayúsculas no cuentan, como en Control Cantera (023/RF-56).
  assert.equal(viajeRepetido({ vale: 'f-1', vehiculoId: 'x', hora: '08:00' }, [
    { id: 'v-f1', vale: 'F-1', vehiculoId: 'y', hora: '15:00', anulado: false },
  ]), 'v-f1');
  // Otro vale de la misma volqueta a la misma hora es otro viaje.
  assert.equal(viajeRepetido({ vale: '0000438', vehiculoId: 'llq377', hora: '07:41' }, GUARDADOS_DEL_DIA), null);
  // Un anulado no cuenta.
  assert.equal(viajeRepetido({ vale: '0000999', vehiculoId: 'tay076', hora: '10:00' }, GUARDADOS_DEL_DIA), null);
});

prueba('sin vale, es repetido el de la misma volqueta a 30 minutos o menos (RF-12)', () => {
  assert.equal(viajeRepetido({ vale: null, vehiculoId: 'tfo420', hora: '10:24' }, GUARDADOS_DEL_DIA), 'v-sin-vale');
  assert.equal(viajeRepetido({ vale: '', vehiculoId: 'tfo420', hora: '09:25' }, GUARDADOS_DEL_DIA), 'v-sin-vale');
  assert.equal(viajeRepetido({ vale: null, vehiculoId: 'tfo420', hora: '10:26' }, GUARDADOS_DEL_DIA), null);
  // También contra uno que sí tenía vale: el renglón del reporte diario y la foto del vale.
  assert.equal(viajeRepetido({ vale: null, vehiculoId: 'llq377', hora: '07:30' }, GUARDADOS_DEL_DIA), 'v-437');
  assert.equal(viajeRepetido({ vale: null, vehiculoId: 'llq379', hora: '07:41' }, GUARDADOS_DEL_DIA), null);
  assert.equal(viajeRepetido({ vale: null, vehiculoId: 'tay076', hora: '10:00' }, GUARDADOS_DEL_DIA), null);
  // Sin volqueta o sin hora no hay con qué comparar.
  assert.equal(viajeRepetido({ vale: null, vehiculoId: null, hora: '09:55' }, GUARDADOS_DEL_DIA), null);
  assert.equal(viajeRepetido({ vale: null, vehiculoId: 'tfo420', hora: null }, GUARDADOS_DEL_DIA), null);
});

prueba('de un renglón con varios viajes se guardan solo los que faltan (RF-14)', () => {
  assert.equal(viajesQueFaltan(4, 3), 1);
  assert.equal(viajesQueFaltan(4, 0), 4);
  assert.equal(viajesQueFaltan(4, 4), 0);
  assert.equal(viajesQueFaltan(2, 5), 0);
});

console.log('\nWhatsApp, guardado automático: personas que no se reconocen (spec 024)\n');

const PERSONAS_DE_LA_OBRA = [
  { id: 'eddier', nombreCompleto: 'Eddier Alberto Quiceno Jacome' },
  { id: 'yobani', nombreCompleto: 'Yobani Hernando Osorio Aguirre' },
  { id: 'diego-c', nombreCompleto: 'Diego Cardona Henao' },
  { id: 'diego-r', nombreCompleto: 'Diego Ramírez Henao' },
];

prueba('una persona reconocida o con una sola parecida no se registra otra vez (RF-22, RF-23)', () => {
  assert.deepEqual(decisionDePersona('Yobani Osorio', PERSONAS_DE_LA_OBRA, { seccion: 'viajes' }), {
    tipo: 'reconocida',
    usuarioId: 'yobani',
  });
  // «Quinceno» no es «Quiceno», pero comparte dos palabras con una sola persona.
  assert.deepEqual(decisionDePersona('Eddier Alberto Quinceno', PERSONAS_DE_LA_OBRA, { seccion: 'viajes' }), {
    tipo: 'coincidencia',
    usuarioId: 'eddier',
  });
});

prueba('con dos o más parecidas no se registra a nadie: se elige (RF-24)', () => {
  // Dos palabras en común con dos personas.
  assert.deepEqual(decisionDePersona('Diego Henao', PERSONAS_DE_LA_OBRA, { seccion: 'viajes' }), {
    tipo: 'ambigua',
    candidatos: ['diego-c', 'diego-r'],
  });
  // Una sola palabra que está en dos nombres tampoco se registra como alguien nuevo.
  assert.deepEqual(decisionDePersona('Diego', PERSONAS_DE_LA_OBRA, { seccion: 'personal' }), {
    tipo: 'ambigua',
    candidatos: ['diego-c', 'diego-r'],
  });
});

prueba('una persona sin parecidas se registra con el cargo que dice el reporte (RF-22, RF-25, RF-26)', () => {
  // Comparte solo «Eddier»: es otra persona, y sale en «Creado automáticamente» (RF-36).
  assert.deepEqual(decisionDePersona('Eddier Quinceno', PERSONAS_DE_LA_OBRA, { seccion: 'viajes' }), {
    tipo: 'crear',
    nombre: 'Eddier Quinceno',
    cargo: 'conductor',
  });
  assert.deepEqual(decisionDePersona('  Anderson   Daza ', PERSONAS_DE_LA_OBRA, { seccion: 'maquinaria' }), {
    tipo: 'crear',
    nombre: 'Anderson Daza',
    cargo: 'conductor',
  });
  assert.deepEqual(
    decisionDePersona('Luz Marina Pérez', PERSONAS_DE_LA_OBRA, { seccion: 'personal', hoja: 'CONTROLADORAS' }),
    { tipo: 'crear', nombre: 'Luz Marina Pérez', cargo: 'controlador_vial' },
  );
  // Una hoja que no es un cargo, o sin hoja: «sin definir».
  assert.deepEqual(
    decisionDePersona('Pedro Gómez', PERSONAS_DE_LA_OBRA, { seccion: 'personal', hoja: 'INGENIEROS' }),
    { tipo: 'crear', nombre: 'Pedro Gómez', cargo: null },
  );
  assert.deepEqual(decisionDePersona('Pedro Gómez', PERSONAS_DE_LA_OBRA, { seccion: 'personal' }), {
    tipo: 'crear',
    nombre: 'Pedro Gómez',
    cargo: null,
  });
  // Sin nombre no hay a quién registrar.
  assert.equal(decisionDePersona('  ', PERSONAS_DE_LA_OBRA, { seccion: 'viajes' }), null);
  assert.equal(decisionDePersona(null, PERSONAS_DE_LA_OBRA, { seccion: 'viajes' }), null);
});

console.log('\nWhatsApp, guardado automático: cuándo se arma la bitácora (spec 024)\n');

const HORARIO_LUNES_A_SABADO = {
  semana: [{ desde: '07:30', hasta: '17:00' }],
  sabado: [{ desde: '07:30', hasta: '12:00' }],
};
const OSCAR = '280036280139944';
const ESPERADOS_DE_LA_OBRA = [
  { tipoReporte: 'reporte_diario' as const, autorId: OSCAR, autorNombre: 'ING Oscar Velandia' },
  { tipoReporte: 'personal' as const, autorId: null, autorNombre: null },
];

prueba('el día está completo cuando llegó cada reporte esperado (RF-39, RF-43)', () => {
  const dia = (recibidos: { tipoReporte: 'reporte_diario' | 'personal' | 'viajes'; autorId: string }[]) =>
    diaCompleto({ esperados: ESPERADOS_DE_LA_OBRA, recibidos, horario: HORARIO_LUNES_A_SABADO, fecha: '2026-10-07' });

  assert.deepEqual(dia([{ tipoReporte: 'personal', autorId: '213877006565409@lid' }]), {
    completo: false,
    faltan: [ESPERADOS_DE_LA_OBRA[0]],
  });
  // El reporte diario de otra persona no cuenta si se dijo quién lo manda (RF-39).
  assert.equal(
    dia([
      { tipoReporte: 'personal', autorId: '213877006565409@lid' },
      { tipoReporte: 'reporte_diario', autorId: '83618886111404@lid' },
    ]).completo,
    false,
  );
  // El autor se compara sin lo que va después de la arroba.
  assert.deepEqual(
    dia([
      { tipoReporte: 'viajes', autorId: '213877006565409@lid' },
      { tipoReporte: 'reporte_diario', autorId: `${OSCAR}@lid` },
      { tipoReporte: 'personal', autorId: '66512316530855' },
    ]),
    { completo: true, faltan: [] },
  );
});

prueba('sin lista, o en un día que la obra no trabaja, basta el primer mensaje (RF-40, RF-41)', () => {
  const unMensaje = [{ tipoReporte: 'viajes' as const, autorId: '213877006565409@lid' }];
  assert.deepEqual(
    diaCompleto({ esperados: [], recibidos: unMensaje, horario: HORARIO_LUNES_A_SABADO, fecha: '2026-10-07' }),
    { completo: true, faltan: [] },
  );
  // El 11-oct-2026 es domingo: la lista no aplica.
  assert.deepEqual(
    diaCompleto({ esperados: ESPERADOS_DE_LA_OBRA, recibidos: unMensaje, horario: HORARIO_LUNES_A_SABADO, fecha: '2026-10-11' }),
    { completo: true, faltan: [] },
  );
  // Un sábado de una obra sin jornada de sábado, y un festivo (12-oct-2026), tampoco.
  assert.equal(
    diaCompleto({
      esperados: ESPERADOS_DE_LA_OBRA,
      recibidos: unMensaje,
      horario: { ...HORARIO_LUNES_A_SABADO, sabado: [] },
      fecha: '2026-10-10',
    }).completo,
    true,
  );
  assert.equal(
    diaCompleto({ esperados: ESPERADOS_DE_LA_OBRA, recibidos: unMensaje, horario: HORARIO_LUNES_A_SABADO, fecha: '2026-10-12' }).completo,
    true,
  );
  // Un sábado de una obra que sí trabaja sábados espera la lista.
  assert.equal(
    diaCompleto({ esperados: ESPERADOS_DE_LA_OBRA, recibidos: unMensaje, horario: HORARIO_LUNES_A_SABADO, fecha: '2026-10-10' }).completo,
    false,
  );
  // Sin mensajes no hay bitácora que armar (RF-49).
  assert.equal(
    diaCompleto({ esperados: [], recibidos: [], horario: HORARIO_LUNES_A_SABADO, fecha: '2026-10-07' }).completo,
    false,
  );
});

prueba('la hora límite es el mediodía del día siguiente en Colombia (RF-46)', () => {
  // 8-oct a las 11:59 y a las 12:00 en Colombia son 16:59 y 17:00 en UTC.
  assert.equal(diaVencido('2026-10-07', Date.parse('2026-10-08T16:59:00Z')), false);
  assert.equal(diaVencido('2026-10-07', Date.parse('2026-10-08T17:00:00Z')), true);
  assert.equal(diaVencido('2026-10-07', Date.parse('2026-10-07T23:00:00Z')), false);
  assert.equal(diaVencido('fecha mala', Date.parse('2026-10-08T17:00:00Z')), false);
});

prueba('un renglón que falta va a «No se pudo guardar» y el resto se guarda (RF-19, RF-20)', () => {
  const reporte = {
    ...reporteVacio(),
    personal: [PERSONA_DEL_ARCHIVO, { ...PERSONA_DEL_ARCHIVO, escrito: 'Luz Pérez' }],
    viajes: [VIAJE_SIN_COMPLETAR, { ...VIAJE_SIN_COMPLETAR, vale: '0000558' }],
  };
  const { guardable, excepciones } = separarRenglones(reporte, [
    { seccion: 'viajes', renglon: 0, mensaje: 'Elija el origen.' },
    { seccion: 'viajes', renglon: 0, mensaje: 'Falta la hora del viaje.' },
    { seccion: 'personal', renglon: 1, mensaje: 'Elija la persona.' },
  ]);
  assert.deepEqual(guardable?.viajes.map((v) => v.vale), ['0000558']);
  assert.deepEqual(guardable?.personal.map((p) => p.escrito), ['Yobani Osorio']);
  assert.deepEqual(excepciones, [
    { seccion: 'personal', renglon: 1, motivo: 'Elija la persona.', datos: reporte.personal[1] },
    { seccion: 'viajes', renglon: 0, motivo: 'Elija el origen. Falta la hora del viaje.', datos: reporte.viajes[0] },
  ]);
});

prueba('una falta de toda una sección la aparta entera, y sin fecha no se guarda nada (RF-19, RF-21)', () => {
  const conClima = {
    ...reporteVacio(),
    clima: [
      { condicion: 'soleado' as const, desde: '07:00', hasta: '12:00' },
      { condicion: 'lloviendo' as const, desde: '11:00', hasta: '17:00' },
    ],
    personal: [PERSONA_DEL_ARCHIVO],
  };
  const porSeccion = separarRenglones(conClima, [{ seccion: 'clima', renglon: null, mensaje: 'Las franjas se cruzan.' }]);
  assert.deepEqual(porSeccion.guardable?.clima, []);
  assert.equal(porSeccion.guardable?.personal.length, 1);
  assert.deepEqual(porSeccion.excepciones, [
    { seccion: 'clima', renglon: null, motivo: 'Las franjas se cruzan.', datos: { renglones: conClima.clima } },
  ]);

  const sinFecha = separarRenglones(conClima, [{ seccion: 'fecha', renglon: null, mensaje: 'Falta el día del reporte.' }]);
  assert.equal(sinFecha.guardable, null);
  assert.deepEqual(sinFecha.excepciones, [
    { seccion: 'fecha', renglon: null, motivo: 'Falta el día del reporte.', datos: null },
  ]);

  // Sin faltas, todo se guarda.
  assert.deepEqual(separarRenglones(conClima, []), { guardable: conClima, excepciones: [] });
});

console.log('\nReportes de WhatsApp: archivos\n');

prueba('se guardan fotos, documentos, notas de voz y videos (RF-7, RF-52)', () => {
  for (const tipo of [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/ogg',
    'video/mp4',
  ]) {
    assert.equal(rechazoDeArchivo(tipo, 1000), null, tipo);
  }
  // Como llegan de verdad: con parámetros y mayúsculas.
  assert.equal(tipoDeArchivo('audio/ogg; codecs=opus'), 'audio/ogg');
  assert.equal(tipoDeArchivo('IMAGE/JPEG'), 'image/jpeg');
  assert.equal(tipoDeArchivo(null), '');
});

prueba('un ejecutable, un archivo vacío o uno de más de 16 MB no se guardan', () => {
  assert.equal(rechazoDeArchivo('application/x-msdownload', 1000)?.estado, 415);
  assert.equal(rechazoDeArchivo('', 1000)?.estado, 415);
  assert.equal(rechazoDeArchivo('image/jpeg', 0)?.estado, 422);
  assert.equal(rechazoDeArchivo('image/jpeg', TAMANO_MAXIMO_DE_ARCHIVO)?.estado, undefined);
  assert.equal(rechazoDeArchivo('video/mp4', TAMANO_MAXIMO_DE_ARCHIVO + 1)?.estado, 413);
});

console.log('\nReportes de WhatsApp: contratos\n');

/** Lo que manda n8n por el reporte de la plantilla, con el esquema 2. */
function entregaDePrueba() {
  return {
    esquema: 2,
    grupo: { id: '120363405170214664@g.us', nombre: 'Berrio_Consorcio Magdalena Medio' },
    mensaje: {
      id: '3EB0C431C26A1D3F5A2B',
      autorId: '123456789@lid',
      autorNombre: 'Oscar',
      enviadoEn: '2026-10-01T22:15:00-05:00',
      tipo: 'texto',
      texto: 'Reporte octubre 1 de 2026 …',
    },
    propuesta: {
      categoria: 'reporte_diario',
      fecha_evento: '2026-10-01',
      clima: [{ condicion: 'soleado', desde: '7:00 am', hasta: '3:00 pm' }],
      maquinaria: [
        {
          equipo: 'Volqueta: Foton LLQ 375',
          operador: 'Silfrido Medina',
          medidor_inicial: 32524,
          medidor_final: 32615,
          observacion: 'Sin novedad',
        },
      ],
      viajes: [{ placa: 'TFO 420', material: 'Sub-base', origen: 'Fortune', hora: '7:30 am' }],
      // Un campo que la IA estrene mañana se conserva: la propuesta se guarda tal cual (RF-27).
      campo_nuevo: 'se conserva',
    },
  };
}

prueba('la entrega con el esquema 2 se acepta, y la propuesta llega tal cual (RF-1, RF-27)', () => {
  const entrega = entregaDeWhatsapp.parse(entregaDePrueba());
  assert.equal(entrega.propuesta.categoria, 'reporte_diario');
  assert.equal(entrega.propuesta.maquinaria[0].operador, 'Silfrido Medina');
  // Lo que no trae, llega como lista vacía, no como ausente.
  assert.deepEqual(entrega.propuesta.personal, []);
  assert.deepEqual(entrega.propuesta.actividades, []);
  assert.equal((entrega.propuesta as Record<string, unknown>).campo_nuevo, 'se conserva');
  assert.equal(entrega.mensaje.tieneArchivo, false);
});

prueba('la entrega con el esquema 1, o sin esquema, se rechaza', () => {
  const v1 = entregaDeWhatsapp.safeParse({ ...entregaDePrueba(), esquema: 1 });
  assert.equal(v1.success, false);
  assert.ok(
    v1.error!.issues.some((i) => i.message.includes('esquema 2')),
    JSON.stringify(v1.error!.issues),
  );
  const { esquema: _sinEsquema, ...sinEsquema } = entregaDePrueba();
  assert.equal(entregaDeWhatsapp.safeParse(sinEsquema).success, false);
});

prueba('la entrega de un chat privado, sin categoría o con fecha inválida se rechaza', () => {
  const base = entregaDePrueba();
  assert.equal(
    entregaDeWhatsapp.safeParse({ ...base, grupo: { ...base.grupo, id: '573001234567@s.whatsapp.net' } })
      .success,
    false,
  );
  assert.equal(
    entregaDeWhatsapp.safeParse({ ...base, propuesta: { ...base.propuesta, categoria: '' } }).success,
    false,
  );
  assert.equal(
    entregaDeWhatsapp.safeParse({ ...base, mensaje: { ...base.mensaje, enviadoEn: 'ayer' } }).success,
    false,
  );
});

prueba('descartar exige motivo, y espacios no son un motivo (RF-55)', () => {
  assert.equal(descarte.safeParse({ version: 0 }).success, false);
  assert.equal(descarte.safeParse({ version: 0, motivo: '   ' }).success, false);
  assert.equal(descarte.parse({ version: 3, motivo: ' Es un chiste ' }).motivo, 'Es un chiste');
});

prueba('aprobar, corregir, descartar y devolver exigen la versión leída (RF-29)', () => {
  const propuesta = reporteCompleto();
  assert.equal(aprobacion.safeParse({ propuesta }).success, false);
  assert.equal(propuestaCorregida.safeParse({ propuesta }).success, false);
  assert.equal(descarte.safeParse({ motivo: 'No sirve' }).success, false);
  assert.equal(devolucionAPendiente.safeParse({}).success, false);
  assert.equal(aprobacion.safeParse({ version: -1, propuesta }).success, false);

  const aprobada = aprobacion.parse({ version: 2, propuesta });
  assert.equal(aprobada.soloViajes, false);
  assert.deepEqual(aprobada.fotos, { delDia: null, porActividad: {} });
  // El reporte que la regla da por completo es también un cuerpo válido.
  assert.deepEqual(aprobada.propuesta, propuesta);
});

prueba('una corrección a medias se puede guardar: lo que falta se exige al aprobar (RF-26, RF-64)', () => {
  const aMedias = reporteCompleto();
  aMedias.fecha = null;
  aMedias.personal[0] = { ...aMedias.personal[0], usuarioId: null, entrada: null };
  aMedias.viajes[0] = { ...aMedias.viajes[0], hora: null, conductorId: null };
  assert.equal(propuestaCorregida.safeParse({ version: 0, propuesta: aMedias }).success, true);
});

prueba('las fotos por actividad se eligen por renglón (RF-50)', () => {
  const propuesta = reporteCompleto();
  const conFotos = aprobacion.parse({
    version: 0,
    propuesta,
    fotos: { delDia: 'foto-1', porActividad: { '0': 'foto-2' } },
  });
  assert.equal(conFotos.fotos.porActividad['0'], 'foto-2');
  assert.equal(
    aprobacion.safeParse({ version: 0, propuesta, fotos: { porActividad: { primera: 'foto-2' } } })
      .success,
    false,
  );
});

prueba('asociar un grupo exige la obra (RF-8)', () => {
  const sinObra = grupoAsociado.safeParse({});
  assert.equal(sinObra.success, false);
  assert.equal(sinObra.error!.issues[0].message, 'Elija la obra.');
  assert.equal(grupoAsociado.safeParse({ obraId: '  ' }).success, false);
  assert.equal(grupoAsociado.parse({ obraId: 'obra-a' }).obraId, 'obra-a');
});

/* ------------------------------------------------------------------------ */
/* Criptografía de las contraseñas web                                       */
/* ------------------------------------------------------------------------ */

/**
 * Corre aquí, en Node, y no en un entorno de pruebas aparte, porque
 * `crypto.subtle` es exactamente la misma API que usará Cloudflare Workers: lo
 * que se comprueba aquí es lo que va a correr en producción.
 */
/* ------------------------------------------------------------------------ */
/* La guardia de la integración de WhatsApp (spec 021)                       */
/* ------------------------------------------------------------------------ */

async function verificarIntegracion() {
  console.log('\nGuardia de la integración de WhatsApp\n');

  const token = 'a'.repeat(64);
  const hash = await hashDeTokenDeIntegracion(token);

  await pruebaAsync('el hash es un SHA-256 en hexadecimal y no el token', async () => {
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.notEqual(hash, token);
    assert.equal(await hashDeTokenDeIntegracion(token), hash);
  });

  await pruebaAsync('el token correcto pasa (RF-2)', async () => {
    assert.equal(await tokenDeIntegracionValido(`Bearer ${token}`, hash), true);
    // El hash del .env se lee sin importar mayúsculas ni espacios de más.
    assert.equal(await tokenDeIntegracionValido(`Bearer ${token}`, ` ${hash.toUpperCase()} `), true);
  });

  await pruebaAsync('un token incorrecto, ausente o de otra forma no pasa (RF-3)', async () => {
    assert.equal(await tokenDeIntegracionValido(`Bearer ${'b'.repeat(64)}`, hash), false);
    assert.equal(await tokenDeIntegracionValido(null, hash), false);
    assert.equal(await tokenDeIntegracionValido('Bearer ', hash), false);
    assert.equal(await tokenDeIntegracionValido(`Basic ${token}`, hash), false);
    // El hash mismo no sirve de token: quien vea el .env no entra.
    assert.equal(await tokenDeIntegracionValido(`Bearer ${hash}`, hash), false);
  });

  await pruebaAsync('sin hash configurado, o con uno mal escrito, no entra nadie', async () => {
    assert.equal(await tokenDeIntegracionValido(`Bearer ${token}`, undefined), false);
    assert.equal(await tokenDeIntegracionValido(`Bearer ${token}`, ''), false);
    assert.equal(await tokenDeIntegracionValido(`Bearer ${token}`, 'no-es-un-hash'), false);
  });

  await pruebaAsync('la guardia responde 401 a la cookie del panel y deja pasar el token', async () => {
    const anterior = process.env.TOKEN_INTEGRACION_WHATSAPP;
    process.env.TOKEN_INTEGRACION_WHATSAPP = hash;
    try {
      const conCookie = new Request('http://localhost/api/integraciones/whatsapp/mensajes', {
        method: 'POST',
        headers: { cookie: 'sesion=una-sesion-del-panel' },
      });
      const rechazo = await requerirIntegracion(conCookie);
      assert.equal(rechazo?.status, 401);

      const conToken = new Request('http://localhost/api/integraciones/whatsapp/mensajes', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(await requerirIntegracion(conToken), null);
    } finally {
      if (anterior === undefined) delete process.env.TOKEN_INTEGRACION_WHATSAPP;
      else process.env.TOKEN_INTEGRACION_WHATSAPP = anterior;
    }
  });
}

async function verificarCripto() {
  await pruebaAsync('una contraseña verifica contra su hash y no contra otro', async () => {
    const hash = await hashDeClave('caterpillar-120k');
    assert.equal(await verificarClave('caterpillar-120k', hash), true);
    assert.equal(await verificarClave('caterpillar-120K', hash), false);
    assert.equal(await verificarClave('', hash), false);
  });

  await pruebaAsync('dos hashes de la misma contraseña son distintos', async () => {
    // Si el salt no fuera por fila, dos personas con la misma contraseña
    // tendrían el mismo hash y quedarían delatadas la una por la otra.
    const [a, b] = await Promise.all([hashDeClave('la-misma'), hashDeClave('la-misma')]);
    assert.notEqual(a, b);
    assert.equal(await verificarClave('la-misma', a), true);
    assert.equal(await verificarClave('la-misma', b), true);
  });

  await pruebaAsync('el hash lleva sus propios parámetros dentro', async () => {
    // Es lo que permitirá subir el coste sin migrar ni una fila: las
    // credenciales viejas se siguen verificando con el suyo.
    const [algoritmo, digest, iteraciones, salt, dk] = (await hashDeClave('x')).split('$');
    assert.equal(algoritmo, 'pbkdf2');
    assert.equal(digest, 'sha256');
    assert.ok(Number(iteraciones) >= 100_000);
    assert.equal(salt.length, 32);
    assert.equal(dk.length, 64);
  });

  await pruebaAsync('un hash con formato roto no autentica a nadie', async () => {
    for (const roto of ['', 'x', 'pbkdf2$sha256$abc$00$00', 'bcrypt$sha256$1$00$00', '$$$$']) {
      assert.equal(await verificarClave('lo-que-sea', roto), false);
    }
  });

  await pruebaAsync('la contraseña temporal no trae caracteres que se confundan', async () => {
    // Se dicta por teléfono: un cero confundido con una O es una llamada de
    // vuelta. La `L` sí vale — la que se parece a un uno es la minúscula, y
    // aquí todo va en mayúscula. Y dos claves iguales delatarían un generador
    // roto, que es el peor fallo posible de esta función.
    const generadas = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const clave = generarClaveTemporal();
      assert.match(clave, /^[A-Z2-9]{4}(-[A-Z2-9]{4})+$/);
      assert.ok(!/[O0I1]/.test(clave), `caracter ambiguo en ${clave}`);
      generadas.add(clave);
    }
    assert.equal(generadas.size, 50);
  });

  const costo = await medirCostoDeClave();
  console.log(`\n  · derivar una contraseña cuesta ${costo} ms en este equipo`);
  if (costo > 1000) {
    console.log('    (por encima de 1 s: convendría bajar ITERACIONES_CLAVE)');
  }
}

/* ------------------------------------------------------------------------ */

/**
 * La firma SigV4, contra los vectores publicados por AWS.
 *
 * Estos dos ejemplos salen de la documentación de Amazon —"Signature
 * Calculations for the Authorization Header: Transferring Payload in a Single
 * Chunk"— y son la única forma de saber que `firma-s3.ts` está bien **sin
 * llamar a Cloudflare**. Importa mucho: una firma mal calculada no se degrada
 * ni avisa, responde 403 sin decir qué parte del cálculo falló, y se puede ir
 * un día entero buscándolo en el sitio equivocado.
 *
 * Los dos casos no son redundantes. El PUT cubre el cuerpo firmado por su
 * hash, las cabeceras extra y una clave con carácter especial (`$`, que hay que
 * codificar); el GET cubre el cuerpo vacío y una cabecera —`range`— que se
 * ordena entre las demás.
 */
const CREDENCIALES_DE_EJEMPLO = {
  llaveId: 'AKIAIOSFODNN7EXAMPLE',
  // Ojo: los ejemplos de S3 usan la variante con barra (`…MDENG/bPxRfiCY…`).
  // El otro juego de vectores de AWS, el genérico, lleva un `+` en esa
  // posición, y confundirlos da una firma perfecta sobre una clave distinta:
  // todo el cálculo cuadra y solo falla el último HMAC.
  llaveSecreta: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
  servicio: 's3',
};

async function verificarFirmaS3() {
  const instante = new Date('2013-05-24T00:00:00Z');

  await pruebaAsync('el hash del cuerpo coincide con el vector de AWS', async () => {
    const cabeceras = await firmarPeticion(
      {
        metodo: 'PUT',
        url: 'https://examplebucket.s3.amazonaws.com/test%24file.text',
        cuerpo: new TextEncoder().encode('Welcome to Amazon S3.'),
        instante,
      },
      CREDENCIALES_DE_EJEMPLO,
    );
    assert.equal(
      cabeceras['x-amz-content-sha256'],
      '44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072',
    );
  });

  await pruebaAsync('firma un PUT con cuerpo igual que el vector de AWS', async () => {
    const cabeceras = await firmarPeticion(
      {
        metodo: 'PUT',
        url: 'https://examplebucket.s3.amazonaws.com/test%24file.text',
        cabeceras: {
          date: 'Fri, 24 May 2013 00:00:00 GMT',
          'x-amz-storage-class': 'REDUCED_REDUNDANCY',
        },
        cuerpo: new TextEncoder().encode('Welcome to Amazon S3.'),
        instante,
      },
      CREDENCIALES_DE_EJEMPLO,
    );

    assert.equal(
      cabeceras.Authorization,
      'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, ' +
        'SignedHeaders=date;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class, ' +
        'Signature=98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd',
    );
  });

  await pruebaAsync('firma un GET sin cuerpo igual que el vector de AWS', async () => {
    const cabeceras = await firmarPeticion(
      {
        metodo: 'GET',
        url: 'https://examplebucket.s3.amazonaws.com/test.txt',
        cabeceras: { range: 'bytes=0-9' },
        instante,
      },
      CREDENCIALES_DE_EJEMPLO,
    );

    assert.equal(
      cabeceras.Authorization,
      'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, ' +
        'SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, ' +
        'Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41',
    );
  });

  await pruebaAsync('la firma cambia con el día, la región y el servicio', async () => {
    // El encadenamiento de HMAC existe justamente para esto: una firma
    // interceptada no se puede reusar mañana ni contra otro servicio.
    const base = {
      metodo: 'GET',
      url: 'https://examplebucket.s3.amazonaws.com/test.txt',
      instante,
    };
    const hoy = await firmarPeticion(base, CREDENCIALES_DE_EJEMPLO);
    const manana = await firmarPeticion(
      { ...base, instante: new Date('2013-05-25T00:00:00Z') },
      CREDENCIALES_DE_EJEMPLO,
    );
    const otraRegion = await firmarPeticion(base, {
      ...CREDENCIALES_DE_EJEMPLO,
      region: 'eu-west-1',
    });

    assert.notEqual(hoy.Authorization, manana.Authorization);
    assert.notEqual(hoy.Authorization, otraRegion.Authorization);
  });

  await pruebaAsync('una clave con espacios y acentos se codifica sin romper la firma', async () => {
    // No es teórico: el nombre del objeto lo arma el servidor a partir de ids,
    // pero la ruta pasa por el mismo camino que cualquier otra. Si esto se
    // codificara dos veces —el error clásico en S3— fallaría solo a veces.
    const cabeceras = await firmarPeticion(
      {
        metodo: 'PUT',
        url: 'https://examplebucket.s3.amazonaws.com/obra%20norte/motoniveladora%20a%C3%B1o.jpg',
        cuerpo: new TextEncoder().encode('x'),
        instante,
      },
      CREDENCIALES_DE_EJEMPLO,
    );
    assert.match(cabeceras.Authorization, /^AWS4-HMAC-SHA256 Credential=/);
    assert.ok(cabeceras.Authorization.includes('SignedHeaders=host;x-amz-content-sha256;x-amz-date'));
  });
}

/* ------------------------------------------------------------------------ */
/* Escrituras simultáneas del almacén (spec 009, RF-16)                      */
/* ------------------------------------------------------------------------ */

/**
 * El choque se simula con la misma forma que tiene de verdad: Drizzle envuelve el
 * error del driver y el código de Postgres queda en `cause`. Contra Neon se
 * comprueba en T8, con dos salidas lanzadas a la vez.
 */
function choqueDePostgres(): Error {
  return new Error('Failed query: insert into "almacen_movimientos"…', {
    cause: { code: '40001', message: 'could not serialize access' },
  });
}

async function verificarChoques() {
  await pruebaAsync('un cuerpo que no es JSON responde 400 y no 500 (defecto, 2026-10-06)', async () => {
    // `cuerpoJson` lo detectaba, pero lanzaba un error que `responder` no reconocía y
    // salía como «Algo falló en el servidor»: un falso fallo en el registro de errores.
    const esquema = { parse: (dato: unknown) => dato };
    const peticion = (cuerpo: string) =>
      new Request('http://localhost/api/prueba', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo,
      });

    const mala = await responder(async () => {
      await cuerpoJson(peticion('esto no es json'), esquema);
      return Response.json({ ok: true });
    });
    assert.equal(mala.status, 400);
    assert.equal(((await mala.json()) as { error: string }).error, 'El cuerpo de la petición no es JSON válido.');

    // Y un cuerpo bueno sigue pasando.
    const buena = await responder(async () => Response.json(await cuerpoJson(peticion('{"a":1}'), esquema)));
    assert.equal(buena.status, 200);
    assert.deepEqual(await buena.json(), { a: 1 });
  });

  await pruebaAsync('un choque de dos salidas simultáneas se repite una vez', async () => {
    // El primer intento choca y no guardó nada; el segundo ve el stock nuevo.
    let intentos = 0;
    const resultado = await conReintentoSiChoca(async () => {
      intentos += 1;
      if (intentos === 1) throw choqueDePostgres();
      return 'guardada';
    });
    assert.equal(resultado, 'guardada');
    assert.equal(intentos, 2);
  });

  await pruebaAsync('un segundo choque se responde 409 con qué hacer', async () => {
    let intentos = 0;
    const respuesta = await responder(() =>
      conReintentoSiChoca(async () => {
        intentos += 1;
        throw choqueDePostgres();
      }),
    );
    assert.equal(intentos, 2);
    assert.equal(respuesta.status, 409);
    assert.deepEqual(await respuesta.json(), { error: MENSAJE_DE_CHOQUE });
  });

  await pruebaAsync('cualquier otro fallo no se reintenta', async () => {
    let intentos = 0;
    await assert.rejects(
      conReintentoSiChoca(async () => {
        intentos += 1;
        throw new Error('Failed query', { cause: { code: '23505' } });
      }),
    );
    assert.equal(intentos, 1);
  });
}

/* ------------------------------------------------------------------------ */
/* Spec 025: horas reportadas, novedades, ensayos más flexibles, listados    */
/* ------------------------------------------------------------------------ */

prueba('025/RF-6: una persona con solo horas laboradas se guarda', () => {
  assert.equal(validarPersonaDelParte({ horasLaboradas: 8 }), null);
});

prueba('025/RF-5, RF-12: L con sus extra se guarda; las extra que faltan son 0', () => {
  assert.equal(validarPersonaDelParte({ horasLaboradas: 13, extraDiurnas: 3, extraNocturnas: 1 }), null);
  assert.equal(validarPersonaDelParte({ horasLaboradas: 11, extraDiurnas: 1 }), null);
});

prueba('025/RF-9: más de 16 horas laboradas no se guarda', () => {
  const error = validarPersonaDelParte({ horasLaboradas: 17 });
  assert.equal(error, 'mas_de_16');
  assert.equal(mensajeDePersona(error!), 'Son más de 16 horas. Revise las horas.');
  assert.equal(validarPersonaDelParte({ horasLaboradas: 16 }), null);
});

prueba('025/RF-10: las extra no pueden pasar de las laboradas', () => {
  const error = validarPersonaDelParte({ horasLaboradas: 4, extraDiurnas: 3, extraNocturnas: 2 });
  assert.equal(error, 'extra_mayor');
  assert.equal(mensajeDePersona(error!), 'Las horas extra no pueden ser más que las laboradas.');
});

prueba('025/RF-11: extra sin laboradas no se guarda', () => {
  const error = validarPersonaDelParte({ extraDiurnas: 1 });
  assert.equal(error, 'extra_sin_laboradas');
  assert.equal(mensajeDePersona(error!), 'Escriba primero las horas laboradas.');
});

prueba('025/RF-8: sin horas, sin entrada y salida, y sin novedad, no se guarda', () => {
  const error = validarPersonaDelParte({});
  assert.equal(error, 'sin_horas');
  assert.equal(
    mensajeDePersona(error!),
    'Escriba sus horas laboradas (L) o su novedad.',
  );
});

prueba('025/RF-19, RF-20: con novedad se guarda sin horas, y también con horas', () => {
  assert.equal(validarPersonaDelParte({ novedad: 'incapacitado' }), null);
  assert.equal(validarPersonaDelParte({ novedad: 'permiso', horasLaboradas: 4 }), null);
});

prueba('025/RF-7: con entrada y salida sigue la regla de la 016', () => {
  assert.equal(validarPersonaDelParte({ entrada: '07:00', salida: '17:00' }), null);
  assert.equal(validarPersonaDelParte({ entrada: '07:00', salida: null }), 'falta_salida');
  // Con horas y media jornada escrita, la media jornada es un dedazo.
  assert.equal(validarPersonaDelParte({ horasLaboradas: 8, entrada: '07:00' }), 'falta_salida');
});

prueba('025/RF-4: las horas van de media hora en media hora', () => {
  assert.equal(validarPersonaDelParte({ horasLaboradas: 8.5 }), null);
  assert.equal(validarPersonaDelParte({ horasLaboradas: 8.3 }), 'horas_invalidas');
  assert.equal(validarPersonaDelParte({ horasLaboradas: -1 }), 'horas_invalidas');
});

prueba('025/RF-14: con horas laboradas mandan las reportadas', () => {
  const h = horasDeLaPersona(
    '2026-10-08',
    { horasLaboradas: 13, extraDiurnas: 3, extraNocturnas: 1, entrada: '07:30', salida: '17:00' },
    HORARIO_PROPUESTO,
  );
  assert.ok(h);
  assert.equal(h.fuente, 'reportadas');
  assert.equal(h.trabajados, 13 * 60);
  assert.equal(h.extraDiurna, 180);
  assert.equal(h.extraNocturna, 60);
  assert.equal(h.extra, 240);
});

prueba('025/RF-15, RF-22: solo entrada y salida se calcula; una novedad sola no tiene horas', () => {
  const h = horasDeLaPersona('2026-10-08', { entrada: '07:30', salida: '17:00' }, HORARIO_PROPUESTO);
  assert.ok(h);
  assert.equal(h.fuente, 'calculadas');
  assert.equal(h.trabajados, 480);
  assert.equal(horasDeLaPersona('2026-10-08', { novedad: 'incapacitado' }, HORARIO_PROPUESTO), null);
});

prueba('025/RF-16: avisa si lo reportado no cuadra con la entrada y la salida', () => {
  const dia = { entrada: '07:30', salida: '17:00' };
  assert.equal(horasNoCuadran('2026-10-08', { ...dia, horasLaboradas: 8 }, HORARIO_PROPUESTO), false);
  assert.equal(horasNoCuadran('2026-10-08', { ...dia, horasLaboradas: 10 }, HORARIO_PROPUESTO), true);
  assert.equal(horasNoCuadran('2026-10-08', { horasLaboradas: 10 }, HORARIO_PROPUESTO), false);
});

prueba('025/RF-6, RF-19: una persona con solo horas, o incapacitada, deja cerrar', () => {
  const bloqueos = bloqueosDelCierre(
    {
      ...PARTE_COMPLETO,
      personal: [
        { nombre: 'Oscar Velandia', entrada: null, salida: null, horasLaboradas: 8 },
        { nombre: 'Vicente Arias', entrada: null, salida: null, novedad: 'incapacitado' },
      ],
    },
    { delDia: 1, itemsConFoto: ['act-1'] },
  );
  assert.deepEqual(bloqueos, []);
});

prueba('025/RF-8: una persona sin nada no deja cerrar, con el mensaje de la regla', () => {
  const bloqueos = bloqueosDelCierre(
    { ...PARTE_COMPLETO, personal: [{ nombre: 'Ana Ruiz', entrada: null, salida: null }] },
    { delDia: 1, itemsConFoto: ['act-1'] },
  );
  assert.deepEqual(bloqueos, [
    'Ana Ruiz: Escriba sus horas laboradas (L) o su novedad.',
  ]);
});

prueba('025/RF-29 a RF-33: ensayo sin fin, con metros libres y con tramo en cualquier orden', () => {
  const base = {
    observacion: 'Sin observaciones',
    horaInicio: '18:30',
    responsable: 'Jesús Gutiérrez',
  };
  assert.deepEqual(faltasDelEnsayo({ ...base, ubicacion: { pr: 0, metros: 70 } }), []);
  assert.deepEqual(faltasDelEnsayo({ ...base, horaFin: '18:30', ubicacion: { pr: 0, metros: 70 } }), [
    { campo: 'horaFin', mensaje: MENSAJES_DE_ENSAYO.finNoPosterior },
  ]);
  const tramo = { desde: { pr: 1, metros: 300 }, hasta: { pr: 1, metros: 170 } };
  assert.deepEqual(faltasDelEnsayo({ ...base, ubicacion: tramo }), []);
  assert.deepEqual(
    faltasDelEnsayo({ ...base, ubicacion: { desde: { pr: 1, metros: 300 }, hasta: { pr: null, metros: 170 } } }),
    [{ campo: 'tramo', mensaje: `Fin del tramo: ${MENSAJES_DE_ENSAYO.sinPr}` }],
  );
});

prueba('025/RF-38, RF-39: sin observación vale con resultado o cumple; sin nada, no', () => {
  const base = { horaInicio: '18:30', responsable: 'Jesús Gutiérrez', ubicacion: { lugar: 'Laboratorio' } };
  assert.deepEqual(faltasDelEnsayo({ ...base, observacion: '', resultado: 2.98 }), []);
  assert.deepEqual(faltasDelEnsayo({ ...base, observacion: '', cumple: 'no' }), []);
  assert.deepEqual(faltasDelEnsayo({ ...base, observacion: '' }).map((f) => f.campo), ['observacion']);
});

prueba('025/RF-31, RF-33, RF-43: la ubicación del ensayo como tramo, abscisa o lugar', () => {
  assert.deepEqual(ubicacionDeTexto('Pr 0 + 70  al  Pr 0 +150'), {
    desde: { pr: 0, metros: 70 },
    hasta: { pr: 0, metros: 150 },
  });
  assert.deepEqual(ubicacionDeTexto('Pr 0 + 500  al  Pr 0 +660'), {
    desde: { pr: 0, metros: 500 },
    hasta: { pr: 0, metros: 660 },
  });
  // Al revés, como se escribió.
  assert.deepEqual(ubicacionDeTexto('Pr 1 + 300  al  Pr 1 +170'), {
    desde: { pr: 1, metros: 300 },
    hasta: { pr: 1, metros: 170 },
  });
  assert.deepEqual(ubicacionDeTexto('desde K1+100 hasta K1+200'), {
    desde: { pr: 1, metros: 100 },
    hasta: { pr: 1, metros: 200 },
  });
  assert.deepEqual(ubicacionDeTexto('K1+140'), { pr: 1, metros: 140 });
  assert.deepEqual(ubicacionDeTexto('Cantera La Fortune'), { lugar: 'Cantera La Fortune' });
  assert.equal(ubicacionDeTexto('  '), null);
});

prueba('025/RF-40: el nombre largo de un ensayo se asocia al de la lista', () => {
  assert.equal(reconocerEnsayo('Compresión de probetas de suelo cemento con 4%'), 'compresion_simple');
  assert.equal(reconocerEnsayo('Compresión simple'), 'compresion_simple');
  assert.equal(reconocerEnsayo('Moldeo de probetas'), 'moldeo_de_probetas');
  assert.equal(reconocerEnsayo('Densidades en capa estabilizada'), 'densidad_en_campo');
  assert.equal(reconocerEnsayo('Ensayo raro'), null);
});

/** Lo que la IA devolvería del personal y los ensayos del reporte del 8-oct (spec 025). */
const PROPUESTA_DEL_8_OCT = {
  fecha_evento: '2026-10-08',
  personal: [
    { nombre: 'Oscar Velandia', cargo_hoja: 'Ingenieros', horas_laboradas: 8, extra_diurnas: 0, extra_nocturnas: 0 },
    { nombre: 'Anderson Daza', cargo_hoja: 'Conductores', horas_laboradas: 13, extra_diurnas: 3, extra_nocturnas: 1 },
    // «ED: 1» y «EN: 0.» sin «Hrs.», como en el reporte.
    { nombre: 'Alejandro Soto', cargo_hoja: 'Conductores', horas_laboradas: '11', extra_diurnas: '1', extra_nocturnas: '0.' },
    { nombre: 'Vicente Arias', cargo_hoja: 'Operadores', novedad: 'Incapacitado.' },
  ],
  ensayos: [
    {
      tipo: 'Compresión de probetas de suelo cemento con 4%',
      hora_inicio: '6:30 pm',
      responsable: 'Jesús Gutiérrez',
      ubicacion: 'Pr 0 + 70  al  Pr 0 +150',
      edad_dias: 28,
      resultado: 2.98,
      unidad: 'MPa',
      cumple: 'no',
      observacion: 'Suelo cemento al 4 %.',
    },
    {
      tipo: 'Compresión de probetas de suelo cemento con 6%',
      hora_inicio: '7:10 pm',
      responsable: 'Jesús Gutiérrez',
      ubicacion: 'Pr 1 + 300  al  Pr 1 +170',
      edad_dias: '7',
      resultado: '3.57 Mpa',
      cumple: 'si',
    },
  ],
};

prueba('025/RF-23 a RF-26, RF-40 a RF-43: el personal y los ensayos del 8-oct se leen sin faltas', () => {
  const catalogos: CatalogosDeLaObra = {
    ...CATALOGOS_DE_PRUEBA,
    personas: [
      { id: 'oscar', nombreCompleto: 'Oscar Velandia' },
      { id: 'anderson', nombreCompleto: 'Anderson Daza' },
      { id: 'alejandro', nombreCompleto: 'Alejandro Soto' },
      { id: 'vicente', nombreCompleto: 'Vicente Arias' },
    ],
  };
  const { reporte } = resolverPropuesta(PROPUESTA_DEL_8_OCT, catalogos, {
    diaDelMensaje: '2026-10-08',
    destino: 'reporte',
  });
  assert.deepEqual(
    reporte.personal.map((p) => [p.usuarioId, p.hoja, p.horasLaboradas, p.extraDiurnas, p.extraNocturnas, p.novedad]),
    [
      ['oscar', 'Ingenieros', 8, 0, 0, undefined],
      ['anderson', 'Conductores', 13, 3, 1, undefined],
      ['alejandro', 'Conductores', 11, 1, 0, undefined],
      ['vicente', 'Operadores', undefined, undefined, undefined, 'incapacitado'],
    ],
  );
  assert.deepEqual(reporte.ensayos[0], {
    ensayo: 'compresion_simple',
    escrito: 'Compresión de probetas de suelo cemento con 4%',
    horaInicio: '18:30',
    horaFin: null,
    responsable: 'Jesús Gutiérrez',
    ubicacion: { desde: { pr: 0, metros: 70 }, hasta: { pr: 0, metros: 150 } },
    observacion: 'Suelo cemento al 4 %.',
    edadDias: 28,
    resultado: 2.98,
    unidad: 'MPa',
    cumple: 'no',
  });
  assert.deepEqual(
    [reporte.ensayos[1].edadDias, reporte.ensayos[1].resultado, reporte.ensayos[1].cumple, reporte.ensayos[1].observacion],
    [7, 3.57, 'si', null],
  );
  assert.deepEqual(
    faltasDelReporte(reporte, CONTEXTO_DEL_REPORTE).filter((f) => f.seccion === 'personal' || f.seccion === 'ensayos'),
    [],
  );
});

prueba('025/RF-49 a RF-51: el rango de fechas, con la semana por defecto y sus errores', () => {
  assert.deepEqual(rangoDeFechas(null, null, '2026-10-09'), { desde: '2026-10-03', hasta: '2026-10-09' });
  assert.deepEqual(rangoDeFechas(null, '2026-10-08', '2026-10-09'), { desde: '2026-10-02', hasta: '2026-10-08' });
  assert.deepEqual(rangoDeFechas('2026-10-01', null, '2026-10-09'), { desde: '2026-10-01', hasta: '2026-10-09' });
  assert.deepEqual(rangoDeFechas('2026-10-08', '2026-10-08', '2026-10-09'), { desde: '2026-10-08', hasta: '2026-10-08' });
  assert.deepEqual(rangoDeFechas('2026-10-09', '2026-10-08', '2026-10-09'), { error: 'orden' });
  assert.equal(MENSAJES_DE_RANGO.orden, 'Tiene que ser igual o posterior a «Desde».');
  assert.deepEqual(rangoDeFechas('2025-01-01', '2026-10-08', '2026-10-09'), { error: 'largo' });
  assert.deepEqual(rangoDeFechas('2025-10-08', '2026-10-08', '2026-10-09'), { desde: '2025-10-08', hasta: '2026-10-08' });
  assert.deepEqual(rangoDeFechas('8/10/2026', null, '2026-10-09'), { error: 'formato' });
  assert.deepEqual(rangoDeFechas('2026-13-45', null, '2026-10-09'), { error: 'formato' });
});

prueba('025/RF-55, RF-58: las tablas van de a 15, y la página que ya no existe se corrige', () => {
  assert.equal(POR_PAGINA, 15);
  const filas = Array.from({ length: 40 }, (_, i) => i + 1);
  assert.deepEqual(recortarPagina(filas, 1).filas, filas.slice(0, 15));
  assert.deepEqual(recortarPagina(filas, 3), { filas: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40], pagina: 3 });
  // La 4 ya no existe: se ve la última.
  assert.equal(recortarPagina(filas, 4).pagina, 3);
  assert.deepEqual(recortarPagina(filas.slice(0, 3), 4), { filas: [1, 2, 3], pagina: 1 });
  assert.deepEqual(recortarPagina([], 2), { filas: [], pagina: 1 });
});

/* ------------------------------------------------------------------------ */
/* Spec 026: máquinas por nombre, medidores al día                           */
/* ------------------------------------------------------------------------ */

/** Los equipos de CONSORCIO MAGDALENA en producción el 2026-10-09, los que importan. */
const EQUIPOS_DE_MAGDALENA = [
  { id: 'rec-01', codigoInterno: 'REC-01', placa: '03WR0166', obraId: 'mag', tipoId: 'recicladora', marca: 'WIRTGEN WR 2000', modelo: '2007' },
  { id: 'vibro-01', codigoInterno: 'VIBROCMP-01', placa: 'MC009723', obraId: 'mag', tipoId: 'vibrocompactadora', marca: 'DYNAPAC', modelo: '2006' },
  { id: 'motonv-01', codigoInterno: 'MOTONV-01', placa: 'MC770191', obraId: 'mag', tipoId: 'motoniveladora', marca: 'KOMATSU', modelo: '1995' },
  { id: 'retro-01', codigoInterno: 'RETRO-01', placa: 'MC762956', obraId: 'mag', tipoId: 'retrocargador', marca: 'CASE', modelo: '2026' },
  { id: 'wa-monta', codigoInterno: 'WA-MONTACARGAS-1A2B', placa: null, obraId: 'mag', tipoId: 'montacargas', marca: null, modelo: 'Montacarga a Diesel' },
];

prueba('026/RF-2: el tipo de equipo se reconoce aunque se escriba distinto', () => {
  const vibro = TIPOS_VEHICULO.find((t) => t.nombre === 'Vibro Compactadora')!.id;
  assert.equal(tipoDeEquipo('Vibrócompactador Volvo'), vibro);
  assert.equal(tipoDeEquipo('Vibrocompactador dynapac 7ton'), vibro);
  assert.equal(tipoDeEquipo('Montacarga a Diesel'), TIPOS_VEHICULO.find((t) => t.nombre === 'Montacargas')!.id);
  assert.equal(tipoDeEquipo('Excavadora de oruga Liugong'), TIPOS_VEHICULO.find((t) => t.nombre === 'Excavadora de oruga')!.id);
  assert.equal(tipoDeEquipo('Motoniveladora Komatsu GD 566'), 'motoniveladora');
  assert.equal(tipoDeEquipo('Algo raro'), null);
});

prueba('026/RF-1 a RF-4, RF-7, RF-14: la máquina por placa, por modelo o por tipo y marca', () => {
  const equipos = EQUIPOS_DE_MAGDALENA;
  assert.deepEqual(reconocerMaquina('Recicladora wirtgen wr2000', equipos, 'mag'), {
    id: 'rec-01', como: 'tipo_marca', candidatos: [], tipoId: 'recicladora',
  });
  assert.equal(reconocerMaquina('Vibrocompactador dynapac 7ton', equipos, 'mag').id, 'vibro-01');
  assert.equal(reconocerMaquina('Retrocargador mc 762956', equipos, 'mag').como, 'placa');
  assert.deepEqual(reconocerMaquina('Montacarga a Diesel', equipos, 'mag'), {
    id: 'wa-monta', como: 'modelo', candidatos: [], tipoId: tipoDeEquipo('Montacargas'),
  });
  // No registrado: sin equipo, pero con el tipo para registrarlo (RF-8).
  const volvo = reconocerMaquina('Vibrócompactador Volvo', equipos, 'mag');
  assert.equal(volvo.id, null);
  assert.equal(volvo.tipoId, tipoDeEquipo('Vibro Compactadora'));
  // La marca que la IA trae aparte también sirve.
  assert.equal(reconocerMaquina('Vibrocompactador 7 ton', equipos, 'mag', { marca: 'Dynapac' }).id, 'vibro-01');
});

prueba('026/RF-5: dos equipos del mismo tipo y marca son ninguno', () => {
  const equipos = [
    ...EQUIPOS_DE_MAGDALENA,
    { id: 'motonv-02', codigoInterno: 'MOTONV-02', placa: null, obraId: 'mag', tipoId: 'motoniveladora', marca: 'Komatsu', modelo: null },
  ];
  const r = reconocerMaquina('Motoniveladora Komatsu GD 566', equipos, 'mag');
  assert.equal(r.id, null);
  assert.deepEqual(r.candidatos.sort(), ['motonv-01', 'motonv-02']);
});

prueba('026/RF-16: la unidad de la lectura', () => {
  assert.equal(unidadDeMedidor('14647.0 hr'), 'horometro');
  assert.equal(unidadDeMedidor(null, '47283 Km'), 'odometro');
  assert.equal(unidadDeMedidor('h'), 'horometro');
  assert.equal(unidadDeMedidor('horas'), 'horometro');
  assert.equal(unidadDeMedidor('5828.4'), null);
});

prueba('026/RF-6, RF-16, RF-17: dos Komatsu en conflicto, y la lectura en horas de una volqueta', () => {
  const catalogos: CatalogosDeLaObra = {
    ...CATALOGOS_DE_PRUEBA,
    obraId: 'mag',
    vehiculos: [
      ...EQUIPOS_DE_MAGDALENA,
      { id: 'tfo427', codigoInterno: 'VOL-MAG-06', placa: 'TFO427', obraId: 'mag', tipoId: 'volqueta', marca: 'KENTWORTH', modelo: '2014' },
    ],
  };
  const { reporte } = resolverPropuesta(
    {
      fecha_evento: '2026-10-08',
      maquinaria: [
        { equipo: 'Motoniveladora Komatsu alquilada GD555', marca: 'Komatsu', tipo_equipo: 'Motoniveladora', unidad_medidor: 'h', medidor_inicial: 5828.4, medidor_final: 5836.6 },
        { equipo: 'Motoniveladora Komatsu GD 566', unidad_medidor: 'h', medidor_inicial: 5733, medidor_final: 5733 },
        { equipo: 'Recicladora wirtgen wr2000', medidor_inicial: 449, medidor_final: 449 },
        { equipo: 'Volqueta Kentworth TFO 427', unidad_medidor: 'hr', medidor_inicial: 14647.0, medidor_final: 16655.9 },
      ],
    },
    catalogos,
    { diaDelMensaje: '2026-10-08', destino: 'reporte' },
  );
  assert.deepEqual(
    reporte.maquinaria.map((m) => [m.vehiculoId, m.conflicto ?? false, m.unidad ?? null]),
    [
      [null, true, 'horometro'],
      [null, true, 'horometro'],
      ['rec-01', false, null],
      ['tfo427', false, 'horometro'],
    ],
  );
  const faltas = faltasDelReporte(reporte, { ...CONTEXTO_DEL_REPORTE, hoy: '2026-10-09' }).filter((f) => f.seccion === 'maquinaria');
  assert.match(faltas.find((f) => f.renglon === 0)!.mensaje, /Dos renglones del reporte pueden ser el mismo equipo/);
  // La volqueta se mide en horas porque así lo dice el reporte: el salto es de horas.
  assert.match(faltas.find((f) => f.renglon === 3)!.mensaje, / h /);
  assert.equal(faltas.some((f) => f.renglon === 2), false);
});

prueba('026/RF-18, RF-19: la lectura contra la registrada en Vehículos', () => {
  const r = { valor: 5800, fecha: '2026-10-07' };
  assert.match(faltaContraElVehiculo('horometro', 5790, r, '2026-10-08')!, /es menor que la registrada en Vehículos \(5800 h\)/);
  assert.match(faltaContraElVehiculo('horometro', 5830, { valor: 5800, fecha: '2026-10-08' }, '2026-10-08')!, /Son más de 24 h desde la última lectura registrada/);
  assert.equal(faltaContraElVehiculo('horometro', 5830, r, '2026-10-09'), null);
  assert.equal(faltaContraElVehiculo('horometro', 5830, { valor: null, fecha: null }, '2026-10-09'), null);
  assert.equal(faltaContraElVehiculo('odometro', 47283, { valor: 47148, fecha: '2026-10-07' }, '2026-10-08'), null);
  assert.equal(faltaContraElVehiculo('horometro', null, r, '2026-10-08'), null);
});

prueba('026/RF-43, RF-44: un día anterior a la lectura registrada no se compara', () => {
  // El 8-oct reprocesado después del 9-oct: la LLQ379 dice 47283 y Vehículos, 47402 del 9-oct.
  const del9 = { valor: 47402, fecha: '2026-10-09' };
  assert.equal(faltaContraElVehiculo('odometro', 47283, del9, '2026-10-08'), null);
  // Ni siquiera si es mayor (la TFO 429): no va a tocar Vehículos.
  assert.equal(faltaContraElVehiculo('horometro', 16253, { valor: 15714.6, fecha: '2026-10-09' }, '2026-10-08'), null);
  // El mismo día sí se compara.
  assert.match(faltaContraElVehiculo('odometro', 47283, del9, '2026-10-09')!, /es menor que la registrada/);
  // RF-44: dos días de reporte dan el doble de tope, aunque se procesen el mismo día.
  assert.equal(faltaContraElVehiculo('horometro', 5845, { valor: 5800, fecha: '2026-10-07' }, '2026-10-09'), null);
  assert.match(faltaContraElVehiculo('horometro', 5849, { valor: 5800, fecha: '2026-10-07' }, '2026-10-09')!, /Son más de 48 h/);
});

prueba('026/RF-46, RF-47: esperar el archivo de una imagen o un documento, hasta 30 min', () => {
  const llego = Date.parse('2026-10-10T21:05:28Z');
  const imagen = { tipo: 'imagen', tieneArchivo: false, recibidoEnMs: llego };
  assert.equal(esperaArchivo(imagen, llego + 12_000), true);
  assert.equal(esperaArchivo({ ...imagen, tieneArchivo: true }, llego + 12_000), false);
  assert.equal(esperaArchivo({ ...imagen, tipo: 'documento' }, llego + 29 * 60_000), true);
  assert.equal(esperaArchivo(imagen, llego + 30 * 60_000), false);
  assert.equal(esperaArchivo({ ...imagen, tipo: 'video' }, llego + 1_000), false);
  assert.equal(esperaArchivo({ ...imagen, tipo: 'texto' }, llego + 1_000), false);
});

prueba('026/RF-33: en el celular el menú queda oculto, sin riel', () => {
  for (const preferencia of [null, 'abierto', 'plegado'] as const) {
    assert.equal(regimenDelMenu({ ventana: 390, preferencia }), 'oculto', String(preferencia));
    assert.equal(regimenDelMenu({ ventana: 767, preferencia }), 'oculto');
    assert.equal(regimenDelMenu({ ventana: 768, preferencia }), 'riel');
  }
});

/* ── Cambio del 2026-10-13: lo que no se leyó el 8 y 9-oct ── */

const KOMATSU_DEL_8_OCT = [
  { equipo: 'Motoniveladora Komatsu alquilada GD555', marca: 'Komatsu', tipo_equipo: 'Motoniveladora', unidad_medidor: 'h', medidor_inicial: 5828.4, medidor_final: 5836.6 },
  { equipo: 'Motoniveladora Komatsu GD 566', marca: 'Komatsu', tipo_equipo: 'Motoniveladora', unidad_medidor: 'h', medidor_inicial: 5733, medidor_final: 5733 },
];

prueba('026/RF-49: el modelo escrito en el renglón reconoce el equipo, pero no un año', () => {
  const equipos = EQUIPOS_DE_MAGDALENA.map((e) => (e.id === 'motonv-01' ? { ...e, modelo: 'GD 566' } : e));
  const r = reconocerMaquina('Motoniveladora Komatsu GD566', equipos, 'mag');
  assert.deepEqual([r.id, r.como], ['motonv-01', 'modelo']);
  // «1995» (el año de la MOTONV-01 de antes) no reconoce nada por estar escrito.
  assert.equal(reconocerMaquina('Equipo 1995', EQUIPOS_DE_MAGDALENA, 'mag').id, null);
  // Dos modelos dentro del renglón son ninguno.
  const dos = [...equipos, { id: 'otra', codigoInterno: 'OTRA', placa: null, obraId: 'mag', tipoId: 'motoniveladora', marca: 'KOMATSU', modelo: 'GD5' + '66' }];
  assert.equal(reconocerMaquina('Motoniveladora Komatsu GD 566', dos, 'mag').id, null);
});

prueba('026/RF-50: la GD 566 se reconoce por modelo y la alquilada queda para registrarse', () => {
  const catalogos: CatalogosDeLaObra = {
    ...CATALOGOS_DE_PRUEBA,
    obraId: 'mag',
    vehiculos: EQUIPOS_DE_MAGDALENA.map((e) => (e.id === 'motonv-01' ? { ...e, modelo: 'GD 566' } : e)),
  };
  const { reporte } = resolverPropuesta(
    { fecha_evento: '2026-10-08', maquinaria: KOMATSU_DEL_8_OCT },
    catalogos,
    { diaDelMensaje: '2026-10-08', destino: 'reporte' },
  );
  assert.deepEqual(
    reporte.maquinaria.map((m) => [m.vehiculoId, m.conflicto ?? false, m.tipoId ?? null]),
    [
      [null, false, 'motoniveladora'],
      ['motonv-01', false, 'motoniveladora'],
    ],
  );
  // La alquilada no tiene candidatos fuera de la ya tomada: se registra (RF-8).
  const tomados = equiposTomados(reporte.maquinaria, catalogos);
  assert.deepEqual([...tomados], ['motonv-01']);
  assert.deepEqual(reconocerMaquina(reporte.maquinaria[0].escrito, catalogos.vehiculos, 'mag', {}, tomados).candidatos, []);
  // Sin el modelo distintivo sigue el choque de RF-6.
  const sinModelo = resolverPropuesta(
    { fecha_evento: '2026-10-08', maquinaria: KOMATSU_DEL_8_OCT },
    { ...catalogos, vehiculos: EQUIPOS_DE_MAGDALENA },
    { diaDelMensaje: '2026-10-08', destino: 'reporte' },
  );
  assert.deepEqual(sinModelo.reporte.maquinaria.map((m) => m.conflicto ?? false), [true, true]);
});

prueba('026/RF-51: un punto de más en la lectura se sugiere, no se corrige', () => {
  // TAY076: el 8-oct terminó «18740.7», el 9-oct inició «18740.7» (era 187407).
  assert.equal(lecturaSugerida('odometro', 187202, 18740.7), 187407);
  assert.equal(lecturaSugerida('odometro', 18740.7, 187489), 187407);
  // TFO427: «16655.9» por 14655.9 es un dígito cambiado, no se adivina.
  assert.equal(lecturaSugerida('horometro', 14647, 16655.9), null);
  assert.equal(lecturaSugerida('odometro', 100, 90), null);
  const catalogos: CatalogosDeLaObra = {
    ...CATALOGOS_DE_PRUEBA,
    obraId: 'mag',
    vehiculos: [{ id: 'tay076', codigoInterno: 'VOL-MAG-04', placa: 'TAY076', obraId: 'mag', tipoId: 'volqueta', marca: 'KENTWORTH', modelo: '2015' }],
  };
  const { reporte } = resolverPropuesta(
    { fecha_evento: '2026-10-08', maquinaria: [{ equipo: 'Volqueta Kentworth TAY 076', unidad_medidor: 'km', medidor_inicial: 187202, medidor_final: 18740.7 }] },
    catalogos,
    { diaDelMensaje: '2026-10-08', destino: 'reporte' },
  );
  const [falta] = faltasDelReporte(reporte, { ...CONTEXTO_DEL_REPORTE, hoy: '2026-10-09' });
  assert.match(falta.mensaje, /no puede ser menor que la inicial .* ¿Quiso decir 187407\?$/);
  assert.equal(reporte.maquinaria[0].medidorFinal, 18740.7, 'la lectura no se toca');
});

prueba('026/RF-53: «Humedad» está en la lista de ensayos', () => {
  assert.equal(reconocerEnsayo('Humedad'), 'humedad');
  assert.equal(reconocerEnsayo('Humedades'), 'humedad');
  assert.equal(reconocerEnsayo('Humedad natural'), 'humedad');
  assert.equal(reconocerEnsayo('Contenido de humedad'), 'humedad');
  assert.equal(reconocerEnsayo('densidad'), 'densidad_en_campo');
  assert.equal(nombreDeEnsayo('humedad'), 'Humedad');
});

prueba('los ids de ensayos y actividades salen del renglón del reporte, no de la lista filtrada', () => {
  // El 9-oct: tres humedades apartadas y luego guardadas al reprocesar (2026-10-13).
  const reporte = { actividades: [{}, {}], ensayos: [{}, {}, {}, {}, {}] } as unknown as ReporteDelDia;
  const apartado = (seccion: string, renglon: number | null) => ({ seccion, renglon, motivo: 'x', datos: null });
  assert.deepEqual(renglonesGuardados(reporte, [apartado('ensayos', 0), apartado('ensayos', 2)]), {
    actividades: [0, 1],
    ensayos: [1, 3, 4],
  });
  assert.deepEqual(renglonesGuardados(reporte, []).ensayos, [0, 1, 2, 3, 4]);
  // La sección entera apartada no guarda nada.
  assert.deepEqual(renglonesGuardados(reporte, [apartado('actividades', null)]).actividades, []);
  // Lo de otras secciones no cuenta.
  assert.deepEqual(renglonesGuardados(reporte, [apartado('maquinaria', 1)]).ensayos, [0, 1, 2, 3, 4]);
});

/* ── Todas las fotos del día en la bitácora (spec 027) ── */

const fotoDePrueba = (cambios: Partial<FotoCandidata> = {}): FotoCandidata => ({
  mediaId: 'm1',
  mensajeId: 'msg1',
  mime: 'image/jpeg',
  categoria: 'reporte_diario',
  fechaHecho: '2026-10-08',
  sha256: 'aaa',
  recibidaEnMs: Date.parse('2026-10-08T23:10:00Z'),
  ...cambios,
});
const bitacoraAbierta = { fecha: '2026-10-08', cerradaEnMs: null };

prueba('027: una foto de la obra entra a la bitácora abierta de su día (RF-1, RF-2)', () => {
  assert.equal(fotoEntraALaBitacora(fotoDePrueba(), bitacoraAbierta), 'agregar');
  assert.equal(fotoEntraALaBitacora(fotoDePrueba({ categoria: 'incidente' }), bitacoraAbierta), 'agregar');
  assert.equal(fotoEntraALaBitacora(fotoDePrueba({ categoria: 'seguimiento' }), bitacoraAbierta), 'agregar');
  assert.equal(fotoEntraALaBitacora(fotoDePrueba({ mime: 'image/png' }), bitacoraAbierta), 'agregar');
  // De otro día no es de esta bitácora.
  assert.equal(fotoEntraALaBitacora(fotoDePrueba({ fechaHecho: '2026-10-09' }), bitacoraAbierta), 'no');
});

prueba('027: vales, «Ignorar» y videos no entran a las fotos del día (RF-3 a RF-6)', () => {
  for (const categoria of ['suministro_cantera', 'reporte_almacen', 'ignorar']) {
    assert.equal(fotoEntraALaBitacora(fotoDePrueba({ categoria }), bitacoraAbierta), 'no', categoria);
  }
  assert.equal(fotoEntraALaBitacora(fotoDePrueba({ mime: 'video/mp4' }), bitacoraAbierta), 'no');
  assert.equal(fotoEntraALaBitacora(fotoDePrueba({ mime: 'application/pdf' }), bitacoraAbierta), 'no');
});

prueba('027: sin categoría o sin día todavía, la foto espera (RF-10)', () => {
  assert.equal(fotoEntraALaBitacora(fotoDePrueba({ categoria: null }), bitacoraAbierta), 'no');
  assert.equal(fotoEntraALaBitacora(fotoDePrueba({ fechaHecho: null }), bitacoraAbierta), 'no');
});

prueba('027: a una bitácora cerrada no entra; la que llega después del cierre se aparta (RF-20, RF-21)', () => {
  const cerrada = { fecha: '2026-10-08', cerradaEnMs: Date.parse('2026-10-10T15:00:00Z') };
  const tarde = Date.parse('2026-10-10T16:00:00Z');
  assert.equal(fotoEntraALaBitacora(fotoDePrueba({ recibidaEnMs: tarde }), cerrada), 'apartar_cerrada');
  // Llegó antes del cierre y no se agregó: ya no se agrega, ni se avisa.
  assert.equal(fotoEntraALaBitacora(fotoDePrueba(), cerrada), 'no');
  // Un vale que llega tarde no genera aviso: nunca iba a entrar.
  assert.equal(
    fotoEntraALaBitacora(fotoDePrueba({ categoria: 'suministro_cantera', recibidaEnMs: tarde }), cerrada),
    'no',
  );
});

prueba('027: las bitácoras anteriores al 7-oct-2026 no reciben fotos (RF-31)', () => {
  assert.equal(
    fotoEntraALaBitacora(fotoDePrueba({ fechaHecho: '2026-10-06' }), { fecha: '2026-10-06', cerradaEnMs: null }),
    'no',
  );
  assert.equal(
    fotoEntraALaBitacora(fotoDePrueba({ fechaHecho: '2026-10-07' }), { fecha: '2026-10-07', cerradaEnMs: null }),
    'agregar',
  );
});

prueba('027: la misma foto entra una sola vez y nunca la principal (RF-8, RF-12)', () => {
  const temprana = fotoDePrueba({ mediaId: 'a', sha256: 'x', recibidaEnMs: 1 });
  const repetida = fotoDePrueba({ mediaId: 'b', sha256: 'x', recibidaEnMs: 2 });
  const otra = fotoDePrueba({ mediaId: 'c', sha256: 'y', recibidaEnMs: 3 });
  const principal = fotoDePrueba({ mediaId: 'd', sha256: 'z', recibidaEnMs: 0 });
  assert.deepEqual(
    fotosParaAgregar([repetida, otra, temprana, principal], [], 'z').map((f) => f.mediaId),
    ['a', 'c'],
  );
  // Sin huella se distinguen por su id.
  const sinHuella = [fotoDePrueba({ mediaId: 'e', sha256: null }), fotoDePrueba({ mediaId: 'f', sha256: null })];
  assert.deepEqual(
    fotosParaAgregar(sinHuella, [], null).map((f) => f.mediaId),
    ['e', 'f'],
  );
});

prueba('027: lo que ya está en la bitácora, agregado o quitado, no se vuelve a agregar (RF-27)', () => {
  const candidatas = [
    fotoDePrueba({ mediaId: 'a', sha256: 'x' }),
    fotoDePrueba({ mediaId: 'b', sha256: 'y' }),
    fotoDePrueba({ mediaId: 'c', sha256: 'w' }),
  ];
  // `a` ya tiene su fila (agregada o quitada); `b` es el mismo archivo que otra que ya estaba.
  const yaEstan = [
    { mediaId: 'a', sha256: 'x' },
    { mediaId: 'otra', sha256: 'y' },
  ];
  assert.deepEqual(
    fotosParaAgregar(candidatas, yaEstan, null).map((f) => f.mediaId),
    ['c'],
  );
});

/* ── Una sola sección de fotos (spec 027, cambio del 2026-10-14) ── */

const fotoDeSeccion = (cambios: Partial<FotoDeLaSeccion> & { mediaId: string }): FotoDeLaSeccion => ({
  sha256: null,
  horaMs: 0,
  quitada: false,
  ...cambios,
});

prueba('027/RF-35 a RF-37: una sola sección, por hora, sin principal ni repetidas', () => {
  const lista = [
    // WhatsApp a las 15:00 y a las 7:40; subida en el panel a las 10:00.
    fotoDeSeccion({ mediaId: 'wa-tarde', sha256: 'a', horaMs: Date.parse('2026-10-08T20:00:00Z') }),
    fotoDeSeccion({ mediaId: 'wa-temprano', sha256: 'b', horaMs: Date.parse('2026-10-08T12:40:00Z') }),
    fotoDeSeccion({ mediaId: 'subida', sha256: null, horaMs: Date.parse('2026-10-08T15:00:00Z') }),
  ];
  // La principal vieja es copia de «wa-temprano» (misma huella) y otra que solo existe como principal.
  const principales = [
    fotoDeSeccion({ mediaId: 'copia', sha256: 'b', horaMs: Date.parse('2026-10-08T12:41:00Z') }),
    fotoDeSeccion({ mediaId: 'sola', sha256: 'c', horaMs: Date.parse('2026-10-08T13:00:00Z') }),
  ];
  const { fotos } = unificarFotosDelDia(lista, principales);
  assert.deepEqual(
    fotos.map((f) => f.mediaId),
    ['wa-temprano', 'sola', 'subida', 'wa-tarde'],
  );
});

prueba('027/RF-39: las quitadas van aparte, y su copia principal tampoco vuelve', () => {
  const lista = [
    fotoDeSeccion({ mediaId: 'quitada', sha256: 'x', horaMs: 1, quitada: true }),
    fotoDeSeccion({ mediaId: 'queda', sha256: 'y', horaMs: 2 }),
  ];
  const principales = [fotoDeSeccion({ mediaId: 'copia-de-la-quitada', sha256: 'x', horaMs: 3 })];
  const { fotos, quitadas } = unificarFotosDelDia(lista, principales);
  assert.deepEqual(
    fotos.map((f) => f.mediaId),
    ['queda'],
  );
  assert.deepEqual(
    quitadas.map((f) => f.mediaId),
    ['quitada'],
  );
  // La principal que es la misma fila de media que una de la lista no se cuenta dos veces.
  assert.equal(unificarFotosDelDia([fotoDeSeccion({ mediaId: 'm' })], [fotoDeSeccion({ mediaId: 'm' })]).fotos.length, 1);
});

prueba('027/RF-41: con una foto de WhatsApp y sin principal, el cierre no pide fotografía', () => {
  const soloWhatsapp = unificarFotosDelDia([fotoDeSeccion({ mediaId: 'wa', sha256: 'a', horaMs: 1 })], []);
  assert.deepEqual(
    bloqueosDelCierre(PARTE_COMPLETO, { delDia: soloWhatsapp.fotos.length, itemsConFoto: ['act-2'] }),
    [],
  );
  // Todas quitadas: vuelve a faltar.
  const todasQuitadas = unificarFotosDelDia([fotoDeSeccion({ mediaId: 'wa', quitada: true })], []);
  assert.equal(todasQuitadas.fotos.length, 0);
  assert.ok(
    bloqueosDelCierre(PARTE_COMPLETO, { delDia: todasQuitadas.fotos.length, itemsConFoto: ['act-2'] }).some((b) =>
      b.includes('Fotografía del día'),
    ),
  );
});

// ---------------------------------------------------------------------------
// Spec 029: medidores encadenados y día por venir
// ---------------------------------------------------------------------------

prueba('029/RF-1: la final de la bitácora anterior gana a la lectura del vehículo', () => {
  assert.deepEqual(
    lecturaAnterior({ valor: 1250.5, fecha: '2026-10-16' }, { valor: 1300, fecha: '2026-10-18' }, '2026-10-19'),
    { valor: 1250.5, fecha: '2026-10-16', origen: 'bitacora' },
  );
});

prueba('029/RF-2: sin bitácora anterior, vale la del vehículo solo si es de un día anterior', () => {
  assert.deepEqual(lecturaAnterior(null, { valor: 1300, fecha: '2026-10-18' }, '2026-10-19'), {
    valor: 1300,
    fecha: '2026-10-18',
    origen: 'vehiculo',
  });
  // Del mismo día o posterior no es «la de ayer».
  assert.equal(lecturaAnterior(null, { valor: 1300, fecha: '2026-10-19' }, '2026-10-19'), null);
  assert.equal(lecturaAnterior(null, { valor: 1300, fecha: '2026-10-20' }, '2026-10-19'), null);
  // Una bitácora del mismo día tampoco (no debería llegar, pero no se usa).
  assert.equal(lecturaAnterior({ valor: 5, fecha: '2026-10-19' }, { valor: null, fecha: null }, '2026-10-19'), null);
});

prueba('029/RF-3: sin ninguna lectura anterior, nada', () => {
  assert.equal(lecturaAnterior(null, { valor: null, fecha: null }, '2026-10-19'), null);
  assert.equal(lecturaAnterior(null, { valor: 1300, fecha: null }, '2026-10-19'), null);
});

prueba('029/RF-5, RF-9: avisa si la inicial no coincide y dice de dónde salió si coincide', () => {
  const deAyer = { valor: 14655.9, fecha: '2026-10-18', origen: 'bitacora' as const };
  assert.deepEqual(avisoDeLecturaInicial(14655.9, deAyer), { ayuda: 'Final del 18-oct' });
  assert.deepEqual(avisoDeLecturaInicial(14660, deAyer), {
    aviso: 'No coincide con la final del día anterior (14655.9, 18-oct).',
  });
  const delVehiculo = { valor: 187407, fecha: '2026-10-09', origen: 'vehiculo' as const };
  assert.deepEqual(avisoDeLecturaInicial(187407, delVehiculo), {
    ayuda: 'Última lectura del vehículo (9-oct)',
  });
  assert.ok(avisoDeLecturaInicial(187000, delVehiculo).aviso?.startsWith('No coincide con la última lectura del vehículo'));
  // Inicial vacía o sin anterior: nada.
  assert.deepEqual(avisoDeLecturaInicial(null, deAyer), {});
  assert.deepEqual(avisoDeLecturaInicial(100, null), {});
  assert.equal(diaCorto('2026-01-05'), '5-ene');
});

prueba('029/RF-7: el reporte sin lectura inicial toma la anterior, sin pisar la escrita', () => {
  const maquina = {
    vehiculoId: 'tfo427',
    escrito: 'TFO 427',
    operadorId: null,
    operadorEscrito: null,
    medidorInicial: null,
    medidorFinal: 14670,
    observaciones: '',
  };
  const reporte: ReporteDelDia = {
    ...reporteVacio(),
    maquinaria: [
      maquina,
      { ...maquina, vehiculoId: 'escrita', medidorInicial: 10 },
      { ...maquina, vehiculoId: 'sinfinal', medidorFinal: null },
      { ...maquina, vehiculoId: null },
      { ...maquina, vehiculoId: 'sinanterior' },
    ],
  };
  const anterior = { valor: 14655.9, fecha: '2026-10-06', origen: 'bitacora' as const };
  const completo = completarIniciales(reporte, {
    tfo427: anterior,
    escrita: anterior,
    sinfinal: anterior,
  });
  assert.deepEqual(
    completo.maquinaria.map((m) => m.medidorInicial),
    [14655.9, 10, null, null, null],
  );
  // No toca el reporte original.
  assert.equal(reporte.maquinaria[0].medidorInicial, null);
});

prueba('029/RF-33: un día posterior a hoy está por venir', () => {
  assert.equal(diaPorVenir('2026-10-24', '2026-10-19'), true);
  assert.equal(diaPorVenir('2026-10-19', '2026-10-19'), false);
  assert.equal(diaPorVenir('2026-10-18', '2026-10-19'), false);
});

// ---------------------------------------------------------------------------
// Spec 029: ensayos de obra en Laboratorio
// ---------------------------------------------------------------------------

const PARTES_CON_ENSAYOS: ParteConEnsayos[] = [
  {
    id: 'p13',
    obraId: 'obra',
    fecha: '2026-10-13',
    cerrada: true,
    laboratorio: [
      // Un material de antes del 2026-09-16: no es un ensayo.
      { id: 'mat', nombre: 'Cemento' } as never,
      {
        id: 'e1',
        ensayo: 'densidad_en_campo',
        nombre: 'Densidad en campo',
        observacion: '',
        horaInicio: '09:00',
        responsable: ' Catalina Chaparro ',
        ubicacion: { pr: 1, metros: 460 },
        resultado: 98.5,
        unidad: '%',
        cumple: 'si',
        origen: { mensajeId: 'm', aprobadoPor: 'ia', aprobadoEn: '2026-10-13T20:00:00Z' },
      },
    ],
  },
  {
    id: 'p14',
    obraId: 'obra',
    fecha: '2026-10-14',
    cerrada: false,
    laboratorio: [
      { id: 'sin-hora', ensayo: 'humedad', nombre: 'Humedad', observacion: 'Sin observaciones', ubicacion: { lugar: 'Vía las Margaritas' } },
      {
        id: 'tarde',
        ensayo: 'compresion_cilindros',
        nombre: 'Compresión de cilindros',
        observacion: '',
        horaInicio: '15:30',
        ubicacion: { desde: { pr: 0, metros: 70 }, hasta: { pr: 0, metros: 150 } },
        edadDias: 7,
        resultado: 18,
        unidad: 'MPa',
        cumple: 'no',
      },
      { id: 'manana', ensayo: 'densidad_en_campo', nombre: 'Densidad en campo', observacion: '', horaInicio: '08:15' },
    ],
  },
];

prueba('029/RF-26: la ubicación se lee como en la obra', () => {
  assert.equal(textoDeUbicacion({ pr: 1, metros: 460 }), 'PR 1 + 460');
  assert.equal(
    textoDeUbicacion({ desde: { pr: 0, metros: 70 }, hasta: { pr: 0, metros: 150 } }),
    'PR 0 + 070 a PR 0 + 150',
  );
  assert.equal(textoDeUbicacion({ lugar: ' Vía las Margaritas ' }), 'Vía las Margaritas');
  assert.equal(textoDeUbicacion({ lugar: '  ' }), null);
  assert.equal(textoDeUbicacion(undefined), null);
});

prueba('029/RF-25, RF-28: solo ensayos, del día más reciente al más antiguo y por hora', () => {
  const ensayos = ensayosDeLosPartes(PARTES_CON_ENSAYOS);
  assert.deepEqual(
    ensayos.map((e) => e.id),
    ['p14:manana', 'p14:tarde', 'p14:sin-hora', 'p13:e1'],
  );
  const [, tarde, , delTrece] = ensayos;
  assert.equal(tarde.ubicacion, 'PR 0 + 070 a PR 0 + 150');
  assert.equal(tarde.edadDias, 7);
  assert.equal(tarde.cumple, 'no');
  assert.equal(tarde.desdeWhatsapp, false);
  assert.equal(tarde.bitacoraCerrada, false);
  assert.equal(delTrece.responsable, 'Catalina Chaparro');
  assert.equal(delTrece.desdeWhatsapp, true);
  assert.equal(delTrece.bitacoraCerrada, true);
  assert.equal(delTrece.parteId, 'p13');
});

prueba('029/RF-27: se filtra por ensayo y por cumple', () => {
  const ensayos = ensayosDeLosPartes(PARTES_CON_ENSAYOS);
  assert.deepEqual(
    filtrarEnsayosDeObra(ensayos, { ensayo: 'densidad_en_campo', cumple: null }).map((e) => e.id),
    ['p14:manana', 'p13:e1'],
  );
  assert.deepEqual(filtrarEnsayosDeObra(ensayos, { ensayo: null, cumple: 'no' }).map((e) => e.id), ['p14:tarde']);
  assert.deepEqual(
    filtrarEnsayosDeObra(ensayos, { ensayo: null, cumple: 'sin_dato' }).map((e) => e.id),
    ['p14:manana', 'p14:sin-hora'],
  );
  assert.equal(filtrarEnsayosDeObra(ensayos, { ensayo: null, cumple: null }).length, 4);
});

// ---------------------------------------------------------------------------
// Spec 030: periodos de los reportes
// ---------------------------------------------------------------------------

prueba('030/RF-4: la semana va de lunes a domingo', () => {
  // Miércoles 7-oct-2026 → lunes 5 a domingo 11.
  assert.deepEqual(periodoDe('semana', '2026-10-07'), { tipo: 'semana', desde: '2026-10-05', hasta: '2026-10-11' });
  // El lunes y el domingo son de su propia semana.
  assert.equal(periodoDe('semana', '2026-10-05').desde, '2026-10-05');
  assert.equal(periodoDe('semana', '2026-10-11').desde, '2026-10-05');
  // Una semana que cruza de mes: miércoles 30-sep → lunes 28-sep a domingo 4-oct.
  assert.deepEqual(periodoDe('semana', '2026-09-30'), { tipo: 'semana', desde: '2026-09-28', hasta: '2026-10-04' });
  assert.equal(diasDe(periodoDe('semana', '2026-09-30')).length, 7);
});

prueba('030/RF-4: el día y el mes del calendario', () => {
  assert.deepEqual(periodoDe('dia', '2026-10-07'), { tipo: 'dia', desde: '2026-10-07', hasta: '2026-10-07' });
  assert.deepEqual(periodoDe('mes', '2026-10-19'), { tipo: 'mes', desde: '2026-10-01', hasta: '2026-10-31' });
  assert.equal(periodoDe('mes', '2026-02-10').hasta, '2026-02-28');
  assert.equal(periodoDe('mes', '2028-02-10').hasta, '2028-02-29');
  assert.equal(diasDe(periodoDe('mes', '2026-10-19')).length, 31);
  assert.throws(() => periodoDe('dia', '19/10/2026'));
  assert.equal(esTipoDePeriodo('semana'), true);
  assert.equal(esTipoDePeriodo('anio'), false);
});

prueba('030/RF-4: las flechas pasan al periodo entero anterior o siguiente', () => {
  const semana = periodoDe('semana', '2026-10-07');
  assert.equal(periodoVecino(semana, -1).desde, '2026-09-28');
  assert.equal(periodoVecino(semana, 1).desde, '2026-10-12');
  assert.equal(periodoVecino(periodoDe('dia', '2026-10-01'), -1).desde, '2026-09-30');
  // Del 31 de octubre no se salta noviembre por tener 30 días.
  assert.deepEqual(periodoVecino(periodoDe('mes', '2026-10-31'), 1), { tipo: 'mes', desde: '2026-11-01', hasta: '2026-11-30' });
  assert.equal(periodoVecino(periodoDe('mes', '2026-01-15'), -1).desde, '2025-12-01');
});

// ---------------------------------------------------------------------------
// Spec 030: mantenimiento
// ---------------------------------------------------------------------------

prueba('030/RF-23 a RF-25: el intervalo de la máquina gana al del tipo, y este al de arranque', () => {
  assert.deepEqual(intervaloEfectivo('aceite', 'horometro'), { cada: 250, avisoPorcentaje: 90, origen: 'arranque' });
  assert.deepEqual(intervaloEfectivo('preventivo', 'odometro'), { cada: 10000, avisoPorcentaje: 90, origen: 'arranque' });
  assert.equal(intervaloEfectivo('aceite', 'odometro').cada, 5000);
  const porTipo = { cada: 300, avisoPorcentaje: 80 };
  assert.deepEqual(intervaloEfectivo('aceite', 'horometro', porTipo), { ...porTipo, origen: 'tipo' });
  assert.deepEqual(intervaloEfectivo('aceite', 'horometro', porTipo, { cada: 200, avisoPorcentaje: 95 }), {
    cada: 200,
    avisoPorcentaje: 95,
    origen: 'vehiculo',
  });
});

prueba('030/RF-26 a RF-28: al día, próximo, vencido, sin registro y revisar', () => {
  const base = { clase: 'aceite' as const, medidor: 'horometro' as const, intervalo: { cada: 250, avisoPorcentaje: 90 } };
  const servicio = { lectura: 1000, fecha: '2026-10-01' };
  assert.deepEqual(estadoDeMantenimiento({ ...base, lecturaActual: 1100, ultimo: servicio }), {
    estado: 'al_dia',
    recorrido: 100,
    texto: 'Cambio de aceite en 150 h',
  });
  // 90 % de 250 = 225.
  assert.equal(estadoDeMantenimiento({ ...base, lecturaActual: 1225, ultimo: servicio }).estado, 'proximo');
  assert.equal(estadoDeMantenimiento({ ...base, lecturaActual: 1227, ultimo: servicio }).texto, 'Cambio de aceite en 23 h');
  assert.equal(estadoDeMantenimiento({ ...base, lecturaActual: 1224.9, ultimo: servicio }).estado, 'al_dia');
  assert.deepEqual(estadoDeMantenimiento({ ...base, lecturaActual: 1250, ultimo: servicio }), {
    estado: 'vencido',
    recorrido: 250,
    texto: 'Cambio de aceite vencido',
  });
  assert.equal(
    estadoDeMantenimiento({ ...base, clase: 'preventivo', medidor: 'odometro', intervalo: { cada: 10000, avisoPorcentaje: 90 }, lecturaActual: 45140, ultimo: { lectura: 35000, fecha: '2026-09-01' } }).texto,
    'Preventivo vencido hace 140 km',
  );
  // Sin servicio: sin registro, sin alerta (RF-27).
  assert.equal(estadoDeMantenimiento({ ...base, lecturaActual: 5000, ultimo: null }).estado, 'sin_registro');
  // Lectura corregida hacia atrás, o sin lectura: revisar (caso límite).
  assert.equal(estadoDeMantenimiento({ ...base, lecturaActual: 900, ultimo: servicio }).estado, 'revisar');
  assert.equal(estadoDeMantenimiento({ ...base, lecturaActual: null, ultimo: servicio }).estado, 'revisar');
});

prueba('030/RF-31: correctivo pendiente, vencidas, próximas, sin registro y al día', () => {
  const maquinas = [
    { id: 'al-dia', correctivoPendiente: false, estados: ['al_dia', 'al_dia'] as const },
    { id: 'sin', correctivoPendiente: false, estados: ['sin_registro', 'al_dia'] as const },
    { id: 'vencida', correctivoPendiente: false, estados: ['al_dia', 'vencido'] as const },
    { id: 'correctivo', correctivoPendiente: true, estados: ['al_dia', 'al_dia'] as const },
    { id: 'proxima', correctivoPendiente: false, estados: ['proximo', 'al_dia'] as const },
  ];
  assert.deepEqual(
    [...maquinas].sort((a, b) => rangoDeMantenimiento(a) - rangoDeMantenimiento(b)).map((m) => m.id),
    ['correctivo', 'vencida', 'proxima', 'sin', 'al-dia'],
  );
});

prueba('030/RF-33: avisa si la lectura del servicio es mayor que la registrada', () => {
  assert.ok(avisoDeLecturaDeServicio(460, 455, 'horometro')?.startsWith('La lectura (460 h) es mayor'));
  assert.equal(avisoDeLecturaDeServicio(455, 455, 'horometro'), null);
  assert.equal(avisoDeLecturaDeServicio(400, 455, 'horometro'), null);
  assert.equal(avisoDeLecturaDeServicio(460, null, 'horometro'), null);
});

// ---------------------------------------------------------------------------
// Spec 030: reporte de máquinas
// ---------------------------------------------------------------------------

const SEMANA_DE_PRUEBA = diasDe(periodoDe('semana', '2026-10-07')); // 5 al 11-oct
const VEHICULOS_DE_PRUEBA = [
  { id: 'rec', codigo: 'PRUEBA-026-REC', tipo: 'Recicladora', claseMedidor: 'horometro' as const },
  { id: 'vol', codigo: 'WA-LPN264', tipo: 'Volqueta', claseMedidor: 'odometro' as const },
  { id: 'quieta', codigo: 'MOTONV-01', tipo: 'Motoniveladora', claseMedidor: 'horometro' as const },
];
const PARTES_DE_PRUEBA: ParteDelPeriodo[] = [
  {
    fecha: '2026-10-05',
    abierta: false,
    maquinaria: [
      { vehiculoId: 'rec', codigo: 'PRUEBA-026-REC', claseMedidor: 'horometro', medidorInicial: 440, medidorFinal: 445, operadorNombre: 'Pedro Cartagena' },
      { vehiculoId: 'vol', codigo: 'WA-LPN264', claseMedidor: 'odometro', medidorInicial: 700, medidorFinal: 700 },
    ],
  },
  {
    fecha: '2026-10-06',
    abierta: true,
    maquinaria: [
      { vehiculoId: 'rec', codigo: 'PRUEBA-026-REC', claseMedidor: 'horometro', medidorInicial: 445, medidorFinal: 449.5 },
      { vehiculoId: 'vol', codigo: 'WA-LPN264', claseMedidor: 'odometro', medidorInicial: 700, medidorFinal: 756 },
      // Una máquina de otra obra que trabajó aquí ese día.
      { vehiculoId: 'ajena', codigo: 'TFO427', claseMedidor: 'odometro', medidorInicial: 100, medidorFinal: 130 },
    ],
  },
  { fecha: '2026-10-07', abierta: false, maquinaria: [] },
];

prueba('030/RF-13 a RF-16: sí, no y sin bitácora, con el operador del preoperacional', () => {
  const { maquinas } = usoDeMaquinas({
    dias: SEMANA_DE_PRUEBA,
    partes: PARTES_DE_PRUEBA,
    vehiculos: VEHICULOS_DE_PRUEBA,
    preoperacionales: [{ vehiculoId: 'rec', fecha: '2026-10-06', operadorNombre: 'Jorge Castro' }],
  });
  const rec = maquinas.find((m) => m.vehiculoId === 'rec')!;
  assert.deepEqual(
    rec.dias.map((d) => d.trabajo),
    ['si', 'si', 'no', 'sin_bitacora', 'sin_bitacora', 'sin_bitacora', 'sin_bitacora'],
  );
  // RF-16: la bitácora manda; si no dice, el preoperacional; si tampoco, nadie.
  assert.deepEqual(rec.dias.slice(0, 3).map((d) => d.operador), ['Pedro Cartagena', 'Jorge Castro', null]);
  assert.equal(rec.dias[1].abierta, true);
  // Avance cero → no (RF-14).
  const vol = maquinas.find((m) => m.vehiculoId === 'vol')!;
  assert.deepEqual(vol.dias.slice(0, 3).map((d) => d.trabajo), ['no', 'si', 'no']);
  assert.equal(vol.dias[0].avance, 0);
});

prueba('030/RF-11, RF-17 a RF-19, RF-21: máquinas, totales, días, promedio y cifras', () => {
  const { maquinas, cifras } = usoDeMaquinas({
    dias: SEMANA_DE_PRUEBA,
    partes: PARTES_DE_PRUEBA,
    vehiculos: VEHICULOS_DE_PRUEBA,
    preoperacionales: [],
  });
  // Las tres de la obra y la de otra obra que aparece en una bitácora, por código.
  assert.deepEqual(maquinas.map((m) => m.codigo), ['MOTONV-01', 'PRUEBA-026-REC', 'TFO427', 'WA-LPN264']);
  const rec = maquinas.find((m) => m.vehiculoId === 'rec')!;
  assert.deepEqual([rec.total, rec.diasTrabajados, rec.diasSinTrabajar, rec.promedio], [9.5, 2, 1, 4.8]);
  const quieta = maquinas.find((m) => m.vehiculoId === 'quieta')!;
  assert.deepEqual([quieta.total, quieta.diasTrabajados, quieta.diasSinTrabajar, quieta.promedio], [0, 0, 3, null]);
  const ajena = maquinas.find((m) => m.vehiculoId === 'ajena')!;
  assert.equal(ajena.tipo, null);
  assert.equal(ajena.claseMedidor, 'odometro');
  assert.deepEqual(cifras, { trabajaron: 3, noTrabajaron: 1, horas: 9.5, kilometros: 86 });
  // El avance del día con un decimal, sin los restos de la coma flotante.
  const vibro = usoDeMaquinas({
    dias: ['2026-10-05'],
    partes: [{ fecha: '2026-10-05', abierta: false, maquinaria: [{ vehiculoId: 'v', codigo: 'VIBRO', claseMedidor: 'horometro', medidorInicial: 1170.7, medidorFinal: 1185.1 }] }],
    vehiculos: [],
    preoperacionales: [],
  });
  assert.equal(vibro.maquinas[0].dias[0].avance, 14.4);
});

// ---------------------------------------------------------------------------
// Spec 030: reporte de personal
// ---------------------------------------------------------------------------

const PERSONAL_DE_PRUEBA: ParteConPersonal[] = [
  {
    fecha: '2026-10-05',
    abierta: false,
    horario: HORARIO_PROPUESTO,
    personal: [
      { usuarioId: 'ana', nombre: 'Ana Ruiz', cargo: 'operador', horasLaboradas: 11, extraDiurnas: 2.5, extraNocturnas: 0 },
      // Una fila vieja: solo entrada y salida, con el horario del parte.
      { usuarioId: 'luis', nombre: 'Luis Peña', cargo: 'ayudante', entrada: '07:00', salida: '18:00' },
    ],
  },
  {
    fecha: '2026-10-06',
    abierta: true,
    horario: HORARIO_PROPUESTO,
    personal: [
      { usuarioId: 'ana', nombre: 'Ana Ruiz', cargo: 'conductor', horasLaboradas: 12, extraDiurnas: 2, extraNocturnas: 2 },
      { usuarioId: 'luis', nombre: 'Luis Peña', cargo: 'ayudante', novedad: 'incapacitado' },
    ],
  },
  {
    fecha: '2026-10-07',
    abierta: false,
    horario: HORARIO_PROPUESTO,
    personal: [
      { usuarioId: 'ana', nombre: 'Ana Ruiz', cargo: 'conductor', horasLaboradas: 12, extraDiurnas: 4, extraNocturnas: 0 },
      { usuarioId: 'luis', nombre: 'Luis Peña', cargo: 'ayudante', novedad: 'incapacitado' },
    ],
  },
  {
    fecha: '2026-10-08',
    abierta: false,
    horario: HORARIO_PROPUESTO,
    personal: [{ usuarioId: 'ana', nombre: 'Ana Ruiz', cargo: 'conductor', horasLaboradas: 12, extraDiurnas: 3, extraNocturnas: 0 }],
  },
];

prueba('030/RF-44, RF-45: horas reportadas y calculadas, por persona y día', () => {
  const { personas } = horasDelPersonal({ dias: SEMANA_DE_PRUEBA, partes: PERSONAL_DE_PRUEBA });
  assert.deepEqual(personas.map((p) => p.nombre), ['Ana Ruiz', 'Luis Peña']);
  const [ana, luis] = personas;
  // El cargo de la bitácora más reciente.
  assert.equal(ana.cargo, 'conductor');
  assert.deepEqual(ana.dias[0], {
    fecha: '2026-10-05',
    estado: 'registrada',
    laboradas: 11 * 60,
    extraDiurna: 150,
    extraNocturna: 0,
    novedad: null,
    fuente: 'reportadas',
    abierta: false,
  });
  // La fila vieja, con la misma cuenta que la bitácora.
  const calculadas = horasDeLaPersona('2026-10-05', { entrada: '07:00', salida: '18:00' }, HORARIO_PROPUESTO)!;
  assert.equal(luis.dias[0].fuente, 'calculadas');
  assert.equal(luis.dias[0].laboradas, calculadas.trabajados);
  // Ausente el 8 (hay bitácora y no está), sin bitácora del 9 en adelante.
  assert.deepEqual(luis.dias.map((d) => d.estado), ['registrada', 'registrada', 'registrada', 'ausente', 'sin_bitacora', 'sin_bitacora', 'sin_bitacora']);
  assert.equal(ana.dias[1].abierta, true);
});

prueba('030/RF-46 a RF-48, RF-50: totales, novedades, avisos y cifras', () => {
  const { personas, cifras } = horasDelPersonal({ dias: SEMANA_DE_PRUEBA, partes: PERSONAL_DE_PRUEBA });
  const [ana, luis] = personas;
  assert.deepEqual([ana.laboradas, ana.extraDiurna, ana.extraNocturna, ana.diasTrabajados], [47 * 60, 11.5 * 60, 120, 4]);
  // Más de 2 h extra en el día: 5-oct (2,5), 6-oct (4), 7-oct (4) y 8-oct (3).
  assert.deepEqual(ana.diasConExtraDeMas, ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']);
  // 13,5 h extra en la semana del 5-oct: pasa de 12.
  assert.deepEqual(ana.semanasConExtraDeMas, [{ desde: '2026-10-05', extra: 13.5 * 60 }]);
  assert.deepEqual(luis.novedades, { incapacitado: 2 });
  assert.equal(luis.diasTrabajados, 1);
  assert.deepEqual(luis.semanasConExtraDeMas, []);
  assert.equal(cifras.personas, 2);
  assert.equal(cifras.conNovedad, 1);
  assert.equal(cifras.laboradas, ana.laboradas + luis.laboradas);
  assert.equal(cifras.extraNocturna, 120 + luis.extraNocturna);
});

// ---------------------------------------------------------------------------
// Spec 030: actividades, cantera, calidad y clima
// ---------------------------------------------------------------------------

prueba('030/RF-51, RF-52: cantidad por ítem y las actividades sin ítem aparte', () => {
  const { items, otras } = cantidadesPorItem([
    {
      fecha: '2026-10-06',
      actividades: [
        { item: '4.3.8', nombre: 'Disposición de material', descripcion: '', unidad: 'm³', cantidad: 120.5 },
        { item: '5.1.15', nombre: 'Sub-base granular', descripcion: 'K1+040', unidad: 'm³', cantidad: 312 },
        { item: null, nombre: 'Otra actividad', descripcion: 'Limpieza de cunetas', unidad: 'm', cantidad: 40 },
      ],
    },
    {
      fecha: '2026-10-05',
      actividades: [
        { item: '5.1.15', nombre: 'Sub-base granular', descripcion: 'K0+900', unidad: 'm³', cantidad: 100.25 },
        // Sin cantidad: el día cuenta, la cantidad no suma.
        { item: '5.1.15', nombre: 'Sub-base granular', descripcion: 'K0+950', unidad: 'm³', cantidad: null },
        // De antes del 2026-09-16: sin ítem.
        { nombre: 'Excavación', descripcion: 'Filtro' },
      ],
    },
  ]);
  // Por ítem, en orden numérico: 4.3.8 antes que 5.1.15.
  assert.deepEqual(items.map((i) => [i.item, i.cantidad, i.dias]), [
    ['4.3.8', 120.5, ['2026-10-06']],
    ['5.1.15', 412.25, ['2026-10-05', '2026-10-06']],
  ]);
  assert.deepEqual(items[1].porDia, [
    { fecha: '2026-10-05', cantidad: 100.25 },
    { fecha: '2026-10-06', cantidad: 312 },
  ]);
  assert.equal(items[1].unidad, 'm³');
  assert.deepEqual(otras.map((o) => [o.fecha, o.descripcion, o.cantidad]), [
    ['2026-10-05', 'Filtro', null],
    ['2026-10-06', 'Limpieza de cunetas', 40],
  ]);
});

prueba('030/RF-53: viajes por volqueta, material, origen y destino', () => {
  const viaje = { fecha: '2026-10-07', volqueta: 'LLQ376', material: 'SUBBASE', origen: 'PORTON DE LA VEGA', destino: 'Vía las Margaritas' };
  const agrupados = viajesAgrupados([
    viaje,
    { ...viaje, volqueta: 'TFO420' },
    { ...viaje, material: 'BASE' },
    { ...viaje, destino: 'Obra · PR 1 + 460' },
  ]);
  assert.equal(agrupados.total, 4);
  assert.deepEqual(agrupados.porVolqueta, [
    { nombre: 'LLQ376', viajes: 3 },
    { nombre: 'TFO420', viajes: 1 },
  ]);
  assert.deepEqual(agrupados.porMaterial.map((c) => c.nombre), ['SUBBASE', 'BASE']);
  assert.deepEqual(agrupados.porOrigen, [{ nombre: 'PORTON DE LA VEGA', viajes: 4 }]);
  assert.equal(agrupados.porDestino.length, 2);
  assert.equal(viajesAgrupados([]).total, 0);
});

prueba('030/RF-54: cuántos cumplen, no cumplen o no lo dicen, por ensayo', () => {
  const ensayos = ensayosDeLosPartes(PARTES_CON_ENSAYOS);
  const { porEnsayo, noCumplen } = calidadPorEnsayo(ensayos);
  assert.deepEqual(porEnsayo.map((e) => [e.nombre, e.total, e.cumplen, e.noCumplen, e.sinDato]), [
    ['Densidad en campo', 2, 1, 0, 1],
    ['Compresión de cilindros', 1, 0, 1, 0],
    ['Humedad', 1, 0, 0, 1],
  ]);
  assert.deepEqual(noCumplen.map((e) => e.id), ['p14:tarde']);
});

prueba('030/RF-55: clima, días con lluvia, sin trabajo y notas', () => {
  const franja = (condicion: string, desde: string, hasta: string) => ({ condicion, nombre: condicion, desde, hasta });
  const { dias, diasConLluvia, diasSinTrabajo, diasConBitacora } = climaDelPeriodo({
    dias: ['2026-10-05', '2026-10-06', '2026-10-07'],
    partes: [
      {
        fecha: '2026-10-05',
        abierta: false,
        clima: [franja('lloviendo', '13:00', '17:00'), franja('soleado', '07:00', '13:00')],
        sinTrabajo: false,
        motivoSinTrabajo: null,
        notas: '  Llovió en la tarde. ',
      },
      { fecha: '2026-10-06', abierta: true, clima: [franja('lloviendo', '07:00', '17:00')], sinTrabajo: true, motivoSinTrabajo: 'Lluvia todo el día', notas: null },
    ],
  });
  // Las franjas en orden de hora.
  assert.deepEqual(dias[0].franjas.map((f) => f.desde), ['07:00', '13:00']);
  assert.equal(dias[0].notas, 'Llovió en la tarde.');
  assert.deepEqual(dias.map((d) => [d.conBitacora, d.lluvia, d.sinTrabajo]), [
    [true, true, false],
    [true, true, true],
    [false, false, false],
  ]);
  assert.deepEqual([diasConLluvia, diasSinTrabajo, diasConBitacora], [2, 1, 2]);
});

prueba('032/RF-36, RF-37: Reportes dice qué día no hubo actividades o ensayos, y por qué', () => {
  const { dias } = climaDelPeriodo({
    dias: ['2026-10-05', '2026-10-06', '2026-10-07'],
    partes: [
      {
        fecha: '2026-10-05',
        abierta: false,
        clima: [],
        sinTrabajo: false,
        motivoSinTrabajo: null,
        sinActividades: true,
        motivoSinActividades: ' Lluvia toda la tarde ',
        sinEnsayos: true,
        motivoSinEnsayos: null,
        notas: null,
      },
      // Día sin trabajo: ya lo dice su columna, las marcas no se repiten (RF-37).
      { fecha: '2026-10-06', abierta: true, clima: [], sinTrabajo: true, motivoSinTrabajo: 'Domingo', sinActividades: true, notas: null },
    ],
  });
  assert.deepEqual(dias.map((d) => d.sinRegistro), [
    ['No se realizaron actividades — Lluvia toda la tarde', 'No se realizaron ensayos — sin motivo escrito'],
    [],
    [],
  ]);
});

// ---------------------------------------------------------------------------
// Spec 030: el módulo de Reportes
// ---------------------------------------------------------------------------

prueba('030/RF-1: Reportes es de la gerencia y del residente, y nada más', () => {
  for (const rol of ['admin', 'supervisor'] as const) {
    for (const accion of ['ver', 'listar', 'escribir'] as const) {
      assert.ok(alcanza(rol, 'reportes', accion), `${rol} reportes/${accion}`);
    }
    assert.equal(alcanza(rol, 'reportes', 'anular'), false, `${rol} reportes/anular`);
    assert.ok(modulosVisibles(rol).includes('reportes'), rol);
  }
  for (const rol of ['operador', 'almacenista', 'encargado_planta', 'laboratorista'] as const) {
    for (const accion of ['ver', 'listar', 'escribir', 'aprobar', 'anular'] as const) {
      assert.equal(alcanza(rol, 'reportes', accion), false, `${rol} reportes/${accion}`);
    }
    assert.ok(!modulosVisibles(rol).includes('reportes'), rol);
  }
  // No se apaga por obra (los menús por empresa: ver las pruebas «033/…»).
  assert.equal(moduloApagado('reportes', { almacen: false, cantera: false, laboratorio: false }), false);
  assert.equal(moduloDeLaRuta('/panel/reportes'), 'reportes');
});

// ---------------------------------------------------------------------------
// Spec 030: el Excel de los reportes
// ---------------------------------------------------------------------------

prueba('030/RF-9: el periodo y el nombre del archivo', () => {
  assert.equal(textoDelPeriodo(periodoDe('semana', '2026-10-07')), 'Semana del 5-oct al 11-oct de 2026');
  assert.equal(textoDelPeriodo(periodoDe('dia', '2026-10-07')), 'Día 7-oct de 2026');
  assert.equal(textoDelPeriodo(periodoDe('mes', '2026-10-07')), 'Mes de octubre de 2026');
  assert.equal(
    nombreDelArchivoDeReporte('maquinas', 'OBR 001', periodoDe('semana', '2026-10-07')),
    'reporte-maquinas-OBR-001-2026-10-05-2026-10-11.xlsx',
  );
});

prueba('030/RF-9: las hojas de Máquinas, con números como números', () => {
  const uso = usoDeMaquinas({ dias: SEMANA_DE_PRUEBA, partes: PARTES_DE_PRUEBA, vehiculos: VEHICULOS_DE_PRUEBA, preoperacionales: [] });
  const datos = {
    obraId: 'obra',
    periodo: { ...periodoDe('semana', '2026-10-07'), dias: SEMANA_DE_PRUEBA },
    abiertas: ['2026-10-06'],
    obra: { codigo: 'PRUEBA', nombre: 'Obra de prueba' },
    cifras: { ...uso.cifras, mantenimientosVencidos: 1 },
    maquinas: uso.maquinas.map((m) => ({
      ...m,
      mantenimiento:
        m.vehiculoId === 'rec'
          ? { estado: 'vencido' as const, texto: 'Cambio de aceite vencido hace 10 h', correctivoPendiente: true, fueraDeServicio: false }
          : null,
    })),
  } as ReporteDe<'maquinas'>;
  const [resumen, porDia] = hojasDelReporte('maquinas', datos);
  assert.equal(resumen.nombre, 'Máquinas');
  const rec = resumen.filas.find((f) => f[0] === 'PRUEBA-026-REC')!;
  assert.deepEqual(rec, ['PRUEBA-026-REC', 'Recicladora', 'h', 9.5, 2, 1, 4.8, 'Cambio de aceite vencido hace 10 h · correctivo pendiente']);
  assert.equal(typeof rec[3], 'number');
  // Una fila por máquina y día, con «Sí», «No» o «Sin bitácora».
  assert.equal(porDia.filas.length, uso.maquinas.length * 7);
  assert.deepEqual(porDia.filas.find((f) => f[1] === 'PRUEBA-026-REC' && f[0] === '2026-10-05'), ['2026-10-05', 'PRUEBA-026-REC', 'Sí', 'Pedro Cartagena', 440, 445, 5]);
  assert.equal(porDia.filas.find((f) => f[1] === 'PRUEBA-026-REC' && f[0] === '2026-10-11')![2], 'Sin bitácora');
});

prueba('030/RF-9: las hojas de Personal, en horas y con los avisos', () => {
  const { personas, cifras } = horasDelPersonal({ dias: SEMANA_DE_PRUEBA, partes: PERSONAL_DE_PRUEBA });
  const datos = {
    obraId: 'obra',
    periodo: { ...periodoDe('semana', '2026-10-07'), dias: SEMANA_DE_PRUEBA },
    abiertas: [],
    cifras,
    personas,
    obra: { codigo: 'PRUEBA', nombre: 'Obra de prueba' },
  } as ReporteDe<'personal'>;
  const [resumen, porDia] = hojasDelReporte('personal', datos);
  const ana = resumen.filas.find((f) => f[0] === 'Ana Ruiz')!;
  assert.deepEqual(ana.slice(2, 6), [47, 11.5, 2, 4]);
  assert.match(String(ana[7]), /Más de 2 h extra: 5-oct, 6-oct, 7-oct, 8-oct/);
  assert.match(String(ana[7]), /Más de 12 h extra la semana del 5-oct \(13\.5 h\)/);
  const luis = resumen.filas.find((f) => f[0] === 'Luis Peña')!;
  assert.equal(luis[6], 'Incapacitado: 2 días');
  // Un día que no está en la bitácora no lleva horas.
  const ausente = porDia.filas.find((f) => f[1] === 'Luis Peña' && f[0] === '2026-10-08')!;
  assert.deepEqual(ausente.slice(2, 6), ['No está', null, null, null]);
});

prueba('030/RF-10: la página para imprimir, con título, periodo y sin «Por día» en un mes', () => {
  const hojas = [
    { nombre: 'Personal', encabezados: ['Persona', 'Horas laboradas'], formatos: { 'Horas laboradas': 'numero' as const }, filas: [['Ana <Ruiz>', 1234.5]] },
    { nombre: 'Por día', encabezados: ['Fecha'], filas: [['2026-10-05']] },
  ];
  const semana = paginaParaImprimir({ titulo: 'Personal · Obra', subtitulo: 'Semana del 5-oct al 11-oct de 2026', hojas, esMes: false });
  assert.match(semana, /<title>Personal · Obra<\/title>/);
  assert.match(semana, /Semana del 5-oct al 11-oct de 2026/);
  assert.match(semana, /size: letter landscape/);
  assert.match(semana, /break-inside: avoid/);
  // Lo escrito por la gente no se vuelve HTML.
  assert.match(semana, /Ana &lt;Ruiz&gt;/);
  assert.ok(!semana.includes('<Ruiz>'));
  // Los números como en Colombia, a la derecha.
  assert.match(semana, /<td class="numero">1\.234,5<\/td>/);
  assert.match(semana, /<h2>Por día<\/h2>/);
  // En un mes, sin la cuadrícula por día.
  const mes = paginaParaImprimir({ titulo: 'Personal · Obra', subtitulo: 'Mes de octubre de 2026', hojas, esMes: true });
  assert.ok(!mes.includes('<h2>Por día</h2>'));
  assert.match(mes, /<h2>Personal<\/h2>/);
});

console.log('\nMantenimientos que llegan por WhatsApp (spec 030)\n');

prueba('la clase de mantenimiento se entiende con las palabras de la obra (030/RF-36)', () => {
  assert.equal(claseDeMantenimiento('aceite'), 'aceite');
  assert.equal(claseDeMantenimiento('Cambio de aceite y filtros'), 'aceite');
  assert.equal(claseDeMantenimiento('PREVENTIVO'), 'preventivo');
  assert.equal(claseDeMantenimiento('mantenimiento preventivo'), 'preventivo');
  assert.equal(claseDeMantenimiento('correctivo'), 'correctivo');
  assert.equal(claseDeMantenimiento('reparación de la bomba'), 'correctivo');
  assert.equal(claseDeMantenimiento('daño en la dirección'), 'correctivo');
  assert.equal(claseDeMantenimiento('llanta reventada'), 'correctivo');
  assert.equal(claseDeMantenimiento('lavado'), null);
  assert.equal(claseDeMantenimiento(''), null);
  assert.equal(claseDeMantenimiento(null), null);
});

const CATALOGOS_DEL_MANTENIMIENTO: CatalogosDeLaObra = {
  obraId: 'obra-a',
  vehiculos: [
    { id: 'tfo427', codigoInterno: 'VOL-MAG-07', placa: 'TFO427', obraId: 'obra-a' },
    ...VOLQUETAS_DE_LOS_VALES,
  ],
  personas: [],
  sitios: [],
  materiales: [],
  preoperacionales: [],
  ultimosViajes: [],
};

prueba('un cambio de aceite del mensaje reconoce la máquina y su clase (030/RF-37 a RF-39)', () => {
  const propuesta = propuestaDeIa.parse({
    categoria: 'reporte_diario',
    fecha_evento: '2026-10-07',
    mantenimientos: [
      { equipo: 'Volqueta TFO 427', clase: 'cambio de aceite', lectura: 45210, descripcion: 'Aceite 15W40 y filtro' },
      { equipo: 'TFO420', clase: null, resuelto: true, descripcion: 'Ya quedó reparada' },
    ],
  });
  const { reporte } = resolverPropuesta(propuesta, CATALOGOS_DEL_MANTENIMIENTO, {
    diaDelMensaje: '2026-10-07',
    destino: 'reporte',
  });
  assert.deepEqual(
    reporte.mantenimientos?.map((m) => [m.vehiculoId, m.clase, m.resuelto, m.descripcion]),
    [
      ['tfo427', 'aceite', false, 'Aceite 15W40 y filtro'],
      ['tfo420', null, true, 'Ya quedó reparada'],
    ],
  );
  assert.equal(reporte.mantenimientos?.[0].lectura, 45210);
  // Quedó reparada sin decir la clase: cierra el correctivo, no es una falta (RF-41).
  assert.deepEqual(
    faltasDelReporte(reporte, CONTEXTO_DEL_REPORTE).filter((f) => f.seccion === 'mantenimientos'),
    [],
  );
});

prueba('un mantenimiento sin máquina o sin clase va a «No se pudo guardar» (030/RF-40)', () => {
  const reporte: ReporteDelDia = {
    ...reporteCompleto(),
    mantenimientos: [
      { vehiculoId: null, escrito: 'la amarilla', clase: 'preventivo', resuelto: false, lectura: null, descripcion: '' },
      { vehiculoId: 'tfo427', escrito: 'TFO427', clase: null, resuelto: false, lectura: null, descripcion: 'lavado' },
      { vehiculoId: null, escrito: 'AB5123', clase: 'aceite', resuelto: false, lectura: null, descripcion: '', conflicto: true },
    ],
  };
  const faltas = faltasDelReporte(reporte, CONTEXTO_DEL_REPORTE);
  assert.deepEqual(
    faltas.map((f) => `${f.seccion} ${f.renglon}`),
    ['mantenimientos 0', 'mantenimientos 1', 'mantenimientos 2'],
  );
  assert.ok(faltas[0].mensaje.includes('la amarilla'));
  assert.match(faltas[1].mensaje, /cambio de aceite, preventivo o correctivo/);
  assert.match(faltas[2].mensaje, /más de una máquina/);
});

prueba('un mensaje sin mantenimientos se lee como antes (030/RF-36)', () => {
  const { reporte } = resolverPropuesta(
    propuestaDeIa.parse({ categoria: 'reporte_diario', fecha_evento: '2026-10-07' }),
    CATALOGOS_DEL_MANTENIMIENTO,
    { diaDelMensaje: '2026-10-07', destino: 'reporte' },
  );
  assert.equal('mantenimientos' in reporte, false);
  const corregida = reporteCorregido.parse({
    fecha: '2026-10-05',
    clima: [],
    actividades: [],
    maquinaria: [],
    personal: [],
    ensayos: [],
    viajes: [],
    notas: '',
  });
  assert.equal(corregida.mantenimientos, undefined);
  const conMantenimiento = reporteCorregido.parse({
    ...corregida,
    mantenimientos: [
      { vehiculoId: 'tfo427', escrito: 'TFO427', clase: 'aceite', resuelto: false, lectura: 45210, descripcion: '' },
    ],
  });
  assert.equal(conMantenimiento.mantenimientos?.[0].clase, 'aceite');
  assert.throws(() =>
    reporteCorregido.parse({
      ...corregida,
      mantenimientos: [
        { vehiculoId: 'tfo427', escrito: 'TFO427', clase: 'lavado', resuelto: false, lectura: null, descripcion: '' },
      ],
    }),
  );
});

prueba('un mantenimiento no reconocido se aparta solo, con su renglón (030/RF-40)', () => {
  const reporte: ReporteDelDia = {
    ...reporteCompleto(),
    mantenimientos: [
      { vehiculoId: 'tfo427', escrito: 'TFO427', clase: 'aceite', resuelto: false, lectura: null, descripcion: '' },
      { vehiculoId: null, escrito: 'la amarilla', clase: 'preventivo', resuelto: false, lectura: null, descripcion: '' },
    ],
  };
  const faltas = faltasDelReporte(reporte, CONTEXTO_DEL_REPORTE);
  const { guardable, excepciones } = separarRenglones(reporte, faltas);
  assert.deepEqual(
    excepciones.map((e) => [e.seccion, e.renglon]),
    [['mantenimientos', 1]],
  );
  assert.equal((excepciones[0].datos as { escrito: string }).escrito, 'la amarilla');
  assert.deepEqual(guardable?.mantenimientos?.map((m) => m.vehiculoId), ['tfo427']);
  // Un reporte de antes, sin la sección, se separa como siempre.
  assert.deepEqual(separarRenglones(reporteCompleto(), []).excepciones, []);
});

prueba('la salida del clasificador con mantenimientos pasa por el contrato (030/T20)', () => {
  // Como la manda n8n con el esquema de generar_workflow_clasificar.py: todos los campos
  // presentes, los textos que no se saben vacíos y la clase vacía cuando no se entiende.
  const salida = {
    categoria: 'vehiculo_maquinaria',
    resumen: 'Cambio de aceite a la TFO427 y la recicladora quedó reparada.',
    autor: { id_lid: '123', nombre: 'Prueba', cargo: '' },
    fecha_evento: '2026-10-07',
    complementa_a: '',
    hora_foto: '',
    descripcion_archivo: '',
    clima: [],
    actividades: [],
    maquinaria: [],
    personal: [],
    ensayos: [],
    viajes: [],
    novedades: [],
    almacen: { ingresos: [], salidas: [] },
    mantenimientos: [
      { equipo: 'TFO427', tipo_equipo: 'Volqueta', marca: '', clase: 'aceite', resuelto: false, lectura: 45210, descripcion: 'Cambio de aceite y filtro' },
      { equipo: 'TFO420', tipo_equipo: '', marca: '', clase: '', resuelto: true, lectura: null, descripcion: 'Ya quedó reparada' },
      { equipo: 'TFO427', tipo_equipo: 'Volqueta', marca: '', clase: '', resuelto: false, lectura: null, descripcion: 'Se le hizo algo' },
    ],
    confianza: 'alta',
    requiere_revision: false,
    motivo_revision: '',
  };
  const { reporte } = resolverPropuesta(propuestaDeIa.parse(salida), CATALOGOS_DEL_MANTENIMIENTO, {
    diaDelMensaje: '2026-10-07',
    destino: 'notas',
  });
  assert.deepEqual(
    reporte.mantenimientos?.map((m) => [m.vehiculoId, m.clase, m.resuelto, m.lectura]),
    [
      ['tfo427', 'aceite', false, 45210],
      ['tfo420', null, true, null],
      ['tfo427', null, false, null],
    ],
  );
  // Solo el tercero falta: no se entendió qué fue y no dice que quedó reparada.
  assert.deepEqual(
    faltasDelReporte(reporte, CONTEXTO_DEL_REPORTE)
      .filter((f) => f.seccion === 'mantenimientos')
      .map((f) => f.renglon),
    [2],
  );
});

prueba('031/RF-1 a RF-3: Contrato y Presupuesto es de la gerencia y del residente, y solo la gerencia aprueba', () => {
  for (const rol of ['admin', 'supervisor'] as const) {
    for (const accion of ['ver', 'listar', 'escribir'] as const) {
      assert.ok(alcanza(rol, 'contrato', accion), `${rol} contrato/${accion}`);
    }
    assert.ok(modulosVisibles(rol).includes('contrato'), rol);
  }
  assert.equal(alcanza('admin', 'contrato', 'aprobar'), true);
  assert.equal(alcanza('supervisor', 'contrato', 'aprobar'), false);
  for (const rol of ['operador', 'almacenista', 'encargado_planta', 'laboratorista'] as const) {
    for (const accion of ['ver', 'listar', 'escribir', 'aprobar', 'anular'] as const) {
      assert.equal(alcanza(rol, 'contrato', accion), false, `${rol} contrato/${accion}`);
    }
    assert.ok(!modulosVisibles(rol).includes('contrato'), rol);
  }
  assert.equal(moduloApagado('contrato', { almacen: false, cantera: false, laboratorio: false }), false);
  assert.equal(moduloDeLaRuta('/panel/contrato'), 'contrato');
});

// ── Spec 031: el contrato ──

const CONTRATO_VACIO: ContratoParaRevisar = {
  contratanteNombre: '',
  esConsorcio: false,
  nombreConsorcio: '',
  integrantes: [],
  tipo: null,
  numero: '',
  fechaInicio: null,
  fechaFin: null,
  valor: null,
  anticipoPorcentaje: null,
  retencionPorcentaje: null,
  impuestos: [],
};

const CONTRATO_COMPLETO: ContratoParaRevisar = {
  contratanteNombre: 'INVIAS',
  esConsorcio: true,
  nombreConsorcio: 'Consorcio Magdalena Medio',
  integrantes: [
    { nombre: 'OCC', nit: '900.000.001', porcentaje: 60 },
    { nombre: 'Elemental', nit: '900.000.002', porcentaje: 40 },
  ],
  tipo: 'precios_unitarios',
  numero: '2026-0118',
  fechaInicio: '2026-10-01',
  fechaFin: '2026-10-31',
  valor: 54_441_800_920,
  anticipoPorcentaje: 20,
  retencionPorcentaje: 5,
  impuestos: [{ id: 'i1', nombre: 'Retefuente', porcentaje: 2, base: 'corte' }],
};

prueba('031/RF-13: el plazo son los días entre el inicio y el fin', () => {
  assert.equal(plazoEnDias('2026-10-01', '2026-10-31'), 30);
  assert.equal(plazoEnDias('2026-10-01', '2026-10-01'), 0);
  // Cruza de año y un febrero bisiesto.
  assert.equal(plazoEnDias('2027-12-15', '2028-03-01'), 77);
  assert.equal(plazoEnDias('2026-10-31', '2026-10-01'), null);
  assert.equal(plazoEnDias(null, '2026-10-01'), null);
});

prueba('031/RF-14, RF-22: no se guarda con el fin antes del inicio ni un porcentaje imposible', () => {
  assert.deepEqual(faltasParaGuardarContrato(CONTRATO_VACIO), []);
  assert.deepEqual(faltasParaGuardarContrato(CONTRATO_COMPLETO), []);
  assert.equal(porcentajeValido(-1), false);
  assert.equal(porcentajeValido(0), true);
  assert.equal(porcentajeValido(100), true);
  assert.equal(porcentajeValido(101), false);
  assert.equal(porcentajeValido(null), true);
  const malo = {
    ...CONTRATO_COMPLETO,
    fechaFin: '2026-09-30',
    anticipoPorcentaje: 101,
    impuestos: [{ id: 'i1', nombre: 'ReteICA', porcentaje: -1, base: 'corte' as const }],
  };
  assert.deepEqual(faltasParaGuardarContrato(malo), [
    'La fecha de fin es anterior a la de inicio.',
    'El anticipo debe estar entre 0 % y 100 %.',
    'ReteICA: el porcentaje debe estar entre 0 % y 100 %.',
  ]);
});

prueba('031/RF-11, RF-17: lo que falta para aprobar, con la suma del consorcio', () => {
  assert.deepEqual(faltasParaAprobarContrato(CONTRATO_COMPLETO), []);
  assert.deepEqual(faltasParaAprobarContrato(CONTRATO_VACIO), [
    'Falta el nombre del contratante.',
    'Falta el tipo de contrato.',
    'Falta el número del contrato.',
    'Falta la fecha de inicio.',
    'Falta la fecha de fin.',
    'Falta el valor del contrato.',
  ]);
  const noventaYNueve = {
    ...CONTRATO_COMPLETO,
    integrantes: [
      { nombre: 'OCC', nit: '', porcentaje: 59 },
      { nombre: 'Elemental', nit: '', porcentaje: 40 },
    ],
  };
  assert.deepEqual(faltasParaAprobarContrato(noventaYNueve), [
    'Las participaciones de los integrantes suman 99 %; deben sumar 100 %.',
  ]);
  // Sin consorcio, los integrantes no cuentan.
  assert.deepEqual(faltasParaAprobarContrato({ ...noventaYNueve, esConsorcio: false }), []);
  // Un impuesto sugerido sin porcentaje (ReteICA) no deja aprobar hasta escribirlo.
  const conReteIca = {
    ...CONTRATO_COMPLETO,
    impuestos: [{ id: 'i2', ...IMPUESTOS_SUGERIDOS[2] }],
  };
  assert.deepEqual(faltasParaAprobarContrato(conReteIca), ['ReteICA: falta el porcentaje.']);
  assert.equal(TIPOS_DE_CONTRATO.length, 13);
});

prueba('031/RF-16, RF-70: la diferencia con el presupuesto, en pesos', () => {
  assert.equal(enPesos(54_441_800_920), '$ 54.441.800.920');
  assert.equal(enPesos(0), '$ 0');
  assert.equal(enPesos(-1500.4), '-$ 1.500');
  assert.equal(diferenciaConPresupuesto(100, 100), null);
  assert.equal(diferenciaConPresupuesto(null, 100), null);
  assert.deepEqual(diferenciaConPresupuesto(54_441_800_920, 54_000_000_000), {
    diferencia: 441_800_920,
    texto: 'El contrato vale $ 441.800.920 más que el presupuesto vigente.',
  });
  assert.equal(diferenciaConPresupuesto(1_000, 1_500)?.texto, 'El contrato vale $ 500 menos que el presupuesto vigente.');
});

prueba('031/RF-30: el contrato acepta PDF o imagen de hasta 20 MB', () => {
  assert.equal(rechazoDeArchivoDelContrato('application/pdf', 1000), null);
  assert.equal(rechazoDeArchivoDelContrato('image/jpeg', 20 * 1024 * 1024), null);
  assert.equal(rechazoDeArchivoDelContrato('image/png', 20 * 1024 * 1024 + 1)?.estado, 413);
  assert.equal(
    rechazoDeArchivoDelContrato('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1000)?.estado,
    415,
  );
  assert.equal(rechazoDeArchivoDelContrato('application/pdf', 0)?.estado, 422);
});

// ── Spec 031: las pólizas ──

prueba('031/RF-24: vigente, por vencer desde 30 días antes y vencida', () => {
  assert.deepEqual(vigenciaDePoliza('2026-12-31', '2026-10-20'), { vigencia: 'vigente', dias: 72, texto: 'Vence en 72 días' });
  // 31 días antes todavía es vigente; 30 ya avisa.
  assert.equal(vigenciaDePoliza('2026-11-20', '2026-10-20').vigencia, 'vigente');
  assert.deepEqual(vigenciaDePoliza('2026-11-19', '2026-10-20'), { vigencia: 'por_vencer', dias: 30, texto: 'Vence en 30 días' });
  assert.equal(vigenciaDePoliza('2026-10-21', '2026-10-20').texto, 'Vence mañana');
  // El día del fin todavía cubre.
  assert.deepEqual(vigenciaDePoliza('2026-10-20', '2026-10-20'), { vigencia: 'por_vencer', dias: 0, texto: 'Vence hoy' });
  assert.deepEqual(vigenciaDePoliza('2026-10-19', '2026-10-20'), { vigencia: 'vencida', dias: 1, texto: 'Venció ayer' });
  assert.equal(vigenciaDePoliza('2026-10-10', '2026-10-20').texto, 'Venció hace 10 días');
});

prueba('031/RF-25, RF-26: solo avisan las activas por vencer o vencidas, de la más urgente', () => {
  const polizas: PolizaParaAviso[] = [
    { id: 'lejos', amparo: 'cumplimiento', numero: '1', hasta: '2027-06-30', estado: 'activa' },
    { id: 'pronto', amparo: 'anticipo', numero: '2', hasta: '2026-11-09', estado: 'activa' },
    { id: 'vencida', amparo: 'rce', numero: '3', hasta: '2026-10-01', estado: 'activa' },
    { id: 'reemplazada', amparo: 'salarios', numero: '4', hasta: '2026-10-05', estado: 'reemplazada' },
    { id: 'anulada', amparo: 'estabilidad', numero: '5', hasta: '2026-10-25', estado: 'anulada' },
  ];
  assert.deepEqual(
    polizasConAviso(polizas, '2026-10-20').map((p) => [p.id, p.vigencia, p.texto]),
    [
      ['vencida', 'vencida', 'Venció hace 19 días'],
      ['pronto', 'por_vencer', 'Vence en 20 días'],
    ],
  );
});

// ── Spec 031: el presupuesto ──

function itemDePrueba(id: string, item: string, cantidad: number | null, valorUnitario: number | null): ItemDelPresupuesto {
  return {
    id,
    renglon: null,
    item,
    icociv: '',
    especificaciones: '',
    descripcion: `Descripción de ${item}`,
    unidad: 'm3',
    unidadEscrita: 'm3',
    cantidad,
    valorUnitario,
    valorTotal: 0,
  };
}

/** Dos vías con el mismo ítem 4.1.8 en su capítulo de alcantarillas, y tres rubros. */
const PRESUPUESTO_DE_PRUEBA: EstructuraDePresupuesto = normalizarEstructura({
  aiu: { administracion: 0.2623, imprevistos: 0.01, utilidad: 0.05 },
  grupos: [
    {
      id: 'g1',
      nombre: 'Circuito Remedios',
      capitulos: [
        {
          id: 'c1',
          codigo: '01',
          nombre: 'Construcción de alcantarillas',
          items: [itemDePrueba('i1', '4.1.8', 2006, 55525), itemDePrueba('i2', '2.8', 42, 242062)],
        },
      ],
    },
    {
      id: 'g2',
      nombre: 'Vía La Ye–Yondo',
      capitulos: [
        { id: 'c2', codigo: '01', nombre: 'Construcción de alcantarillas', items: [itemDePrueba('i3', '4.1.8', 100.12345, 55525)] },
      ],
    },
  ],
  rubros: [
    { id: 'r1', grupoId: 'g1', nombre: 'Plan de manejo ambiental', unidad: 'estimado', cantidad: null, valorUnitario: null, valor: 218336960 },
    { id: 'r2', grupoId: 'g1', nombre: 'Caracterización vial', unidad: 'Km', cantidad: 25, valorUnitario: 1055961, valor: 1 },
    { id: 'r3', grupoId: null, nombre: 'Actualización de precios', unidad: 'estimado', cantidad: null, valorUnitario: null, valor: 3817063720 },
  ],
});

prueba('031/RF-35, RF-69: el total del ítem al peso y las cantidades con tres decimales', () => {
  assert.equal(totalDelItem(2006, 55525), 111383150);
  assert.equal(totalDelItem(0.3335, 3), 1);
  assert.equal(totalDelItem(null, 55525), 0);
  const [, via2] = PRESUPUESTO_DE_PRUEBA.grupos;
  assert.equal(via2.capitulos[0].items[0].cantidad, 100.123);
  assert.equal(via2.capitulos[0].items[0].valorTotal, 5559330);
  // Un total inventado que llega se recalcula; el rubro con cantidad y precio, también.
  assert.equal(PRESUPUESTO_DE_PRUEBA.rubros[1].valor, 26399025);
});

prueba('031/RF-36 a RF-40: subtotales por capítulo y grupo, rubros y valor con el AIU incluido', () => {
  const r = resumenDelPresupuesto(PRESUPUESTO_DE_PRUEBA);
  assert.deepEqual(
    r.grupos.map((g) => [g.nombre, g.subtotal, g.rubros, g.capitulos.map((c) => c.subtotal)]),
    [
      ['Circuito Remedios', 111383150 + 10166604, 218336960 + 26399025, [121549754]],
      ['Vía La Ye–Yondo', 5559330, 0, [5559330]],
    ],
  );
  assert.equal(r.obras, 127109084);
  assert.equal(r.rubros, 218336960 + 26399025 + 3817063720);
  assert.equal(r.valor, r.obras + r.rubros);
  assert.equal(r.items, 3);
  assert.deepEqual(r.aiu, { administracion: 26.23, imprevistos: 1, utilidad: 5, total: 32.23 });
  // Sin grupos con nombre (RF-33): el resumen es el mismo, con un grupo vacío.
  const sinGrupos = resumenDelPresupuesto({ ...PRESUPUESTO_DE_PRUEBA, grupos: [{ ...PRESUPUESTO_DE_PRUEBA.grupos[0], nombre: '' }] });
  assert.equal(sinGrupos.grupos[0].nombre, '');
  assert.equal(sinGrupos.obras, 121549754);
});

prueba('031/RF-47: un borrador no se guarda con ids repetidos ni valores negativos', () => {
  assert.deepEqual(faltasParaGuardarPresupuesto(PRESUPUESTO_DE_PRUEBA), []);
  const malo = copiarParaNuevaVersion(PRESUPUESTO_DE_PRUEBA);
  malo.grupos[1].capitulos[0].id = 'c1';
  malo.grupos[1].capitulos[0].items[0].cantidad = -1;
  malo.rubros[0].grupoId = 'g9';
  malo.aiu.utilidad = 5;
  assert.deepEqual(faltasParaGuardarPresupuesto(malo), [
    'Los porcentajes del AIU van entre 0 % y 100 %.',
    'Hay dos grupos o capítulos con el mismo identificador (c1).',
    'Ítem 4.1.8: la cantidad no puede ser negativa.',
    'El rubro «Plan de manejo ambiental» es de un grupo que ya no está.',
  ]);
});

prueba('031/RF-50: no se aprueba sin ítems ni con un ítem incompleto', () => {
  assert.deepEqual(faltasParaAprobarPresupuesto(PRESUPUESTO_DE_PRUEBA), []);
  assert.deepEqual(faltasParaAprobarPresupuesto({ aiu: PRESUPUESTO_DE_PRUEBA.aiu, grupos: [], rubros: [] }), [
    'El presupuesto no tiene ítems.',
  ]);
  const incompleto = copiarParaNuevaVersion(PRESUPUESTO_DE_PRUEBA);
  const item = incompleto.grupos[1].capitulos[0].items[0];
  item.unidad = null;
  item.unidadEscrita = 'gl';
  item.cantidad = 0;
  item.valorUnitario = null;
  assert.deepEqual(faltasParaAprobarPresupuesto(incompleto), [
    'Ítem 4.1.8 (Construcción de alcantarillas · Vía La Ye–Yondo): la unidad «gl» no es una de las de la bitácora.',
    'Ítem 4.1.8 (Construcción de alcantarillas · Vía La Ye–Yondo): falta la cantidad.',
    'Ítem 4.1.8 (Construcción de alcantarillas · Vía La Ye–Yondo): falta el valor unitario.',
  ]);
});

prueba('031/RF-52 a RF-54: la nueva versión conserva los ids y avisa lo reportado que desaparece', () => {
  const v2 = copiarParaNuevaVersion(PRESUPUESTO_DE_PRUEBA);
  assert.deepEqual(v2, PRESUPUESTO_DE_PRUEBA);
  assert.notEqual(v2.grupos[0], PRESUPUESTO_DE_PRUEBA.grupos[0]);
  // Cambiar la copia no toca la vigente.
  v2.grupos[0].capitulos[0].items = v2.grupos[0].capitulos[0].items.filter((i) => i.item !== '2.8');
  v2.grupos[1].capitulos[0].items = [];
  assert.equal(PRESUPUESTO_DE_PRUEBA.grupos[0].capitulos[0].items.length, 2);
  // Se van 2.8 de c1 (con 12 m³ reportados) y 4.1.8 de c2 (sin nada reportado).
  const reportado = new Map([
    [claveDeItem('c1', '2.8'), 12],
    [claveDeItem('c1', '4.1.8'), 300],
  ]);
  assert.deepEqual(itemsQueDesaparecen(PRESUPUESTO_DE_PRUEBA, v2, reportado), [
    { item: '2.8', capituloId: 'c1', capitulo: 'Construcción de alcantarillas', grupo: 'Circuito Remedios', reportado: 12 },
  ]);
});

prueba('031/RF-34: las unidades del formulario se leen como las de la bitácora', () => {
  assert.equal(unidadDelPresupuesto('m3'), 'm3');
  assert.equal(unidadDelPresupuesto('m³'), 'm3');
  assert.equal(unidadDelPresupuesto('M2'), 'm2');
  assert.equal(unidadDelPresupuesto('m'), 'm');
  assert.equal(unidadDelPresupuesto('kg'), 'kg');
  assert.equal(unidadDelPresupuesto('Und'), 'und');
  assert.equal(unidadDelPresupuesto('un'), 'und');
  assert.equal(unidadDelPresupuesto('m3-Km'), 'm3_km');
  assert.equal(unidadDelPresupuesto('m3-km'), 'm3_km');
  assert.equal(unidadDelPresupuesto('estimado'), null);
  assert.equal(unidadDelPresupuesto('Km'), null);
});


// ── Spec 031: las actividades de la obra ──

/** El de PRESUPUESTO_DE_PRUEBA con los nombres del formulario de OCC. */
const PRESUPUESTO_CON_VIAS: EstructuraDePresupuesto = {
  ...PRESUPUESTO_DE_PRUEBA,
  grupos: [
    {
      ...PRESUPUESTO_DE_PRUEBA.grupos[0],
      nombre: 'Circuito Remedios - La Y De La Virgen - Puerto Berrío',
      capitulos: [
        { ...PRESUPUESTO_DE_PRUEBA.grupos[0].capitulos[0], nombre: 'CONSTRUCCIÓN DE ALCANTARILLAS' },
        { id: 'c3', codigo: '02', nombre: 'CONSTRUCCIÓN DE CUNETA', items: [itemDePrueba('i4', '4.1.8', 4345, 55525)] },
      ],
    },
    {
      ...PRESUPUESTO_DE_PRUEBA.grupos[1],
      nombre: 'VIA LA YE-YONDO',
      capitulos: [
        { ...PRESUPUESTO_DE_PRUEBA.grupos[1].capitulos[0], nombre: 'CONSTRUCCIÓN DE ALCANTARILLAS' },
        { id: 'c4', codigo: '02', nombre: 'CONSTRUCCIÓN DE CUNETA', items: [itemDePrueba('i5', '4.1.8', 5214, 55525)] },
      ],
    },
  ],
};

prueba('031/RF-58, RF-59: el catálogo fijo sin capítulo y el del presupuesto con capítulo y grupo', () => {
  const fijo = catalogoFijo();
  assert.equal(fijo.origen, 'fijo');
  assert.equal(fijo.actividades.length, 31);
  assert.ok(fijo.actividades.every((a) => a.capituloId === null && a.clave === a.item));
  const catalogo = catalogoDelPresupuesto(PRESUPUESTO_CON_VIAS);
  assert.equal(catalogo.origen, 'presupuesto');
  assert.deepEqual(
    catalogo.actividades.map((a) => [a.clave, a.capitulo, a.grupo?.slice(0, 8)]),
    [
      ['c1|4.1.8', 'CONSTRUCCIÓN DE ALCANTARILLAS', 'Circuito'],
      ['c1|2.8', 'CONSTRUCCIÓN DE ALCANTARILLAS', 'Circuito'],
      ['c3|4.1.8', 'CONSTRUCCIÓN DE CUNETA', 'Circuito'],
      ['c2|4.1.8', 'CONSTRUCCIÓN DE ALCANTARILLAS', 'VIA LA Y'],
      ['c4|4.1.8', 'CONSTRUCCIÓN DE CUNETA', 'VIA LA Y'],
    ],
  );
  // Sin grupos, el grupo es nulo; y un ítem sin unidad no se ofrece.
  const sinGrupo = copiarParaNuevaVersion(PRESUPUESTO_DE_PRUEBA);
  sinGrupo.grupos[1].nombre = ' ';
  sinGrupo.grupos[0].capitulos[0].items[1].unidad = null;
  const otro = catalogoDelPresupuesto(sinGrupo);
  assert.equal(otro.actividades.length, 2);
  assert.equal(otro.actividades[1].grupo, null);
});

prueba('031/RF-59, RF-61: la etiqueta con capítulo y grupo, sin precios, y la búsqueda sin tildes', () => {
  const catalogo = catalogoDelPresupuesto(PRESUPUESTO_CON_VIAS);
  const opcion = opcionDeActividad(catalogo.actividades[3]);
  assert.equal(opcion.etiqueta, '4.1.8 · CONSTRUCCIÓN DE ALCANTARILLAS · VIA LA YE-YONDO');
  assert.equal(opcion.detalle, 'Descripción de 4.1.8');
  assert.doesNotMatch(`${opcion.etiqueta} ${opcion.detalle}`, /\$/);
  assert.equal(opcionDeActividad(catalogoFijo().actividades[0]).etiqueta.startsWith('2.8 · '), true);
  // Por número, por capítulo sin tilde y por descripción.
  assert.equal(buscarActividad(catalogo, '4.1.8').length, 4);
  assert.deepEqual(buscarActividad(catalogo, 'cuneta yondo').map((a) => a.clave), []);
  assert.deepEqual(buscarActividad(catalogo, 'cuneta').map((a) => a.clave), ['c3|4.1.8', 'c4|4.1.8']);
  assert.deepEqual(buscarActividad(catalogo, 'construccion de alcantarillas · via').map((a) => a.clave), ['c2|4.1.8']);
  assert.equal(buscarActividad(catalogoFijo(), 'excavacion').length > 0, true);
  assert.equal(actividadDelCatalogo(catalogo, '4.1.8', 'c4')?.capitulo, 'CONSTRUCCIÓN DE CUNETA');
  assert.equal(actividadDelCatalogo(catalogo, '2.8', 'c4'), undefined);
  assert.equal(actividadDelCatalogo(catalogoFijo(), '4.1.8', null)?.capitulo, null);
});

prueba('031/RF-64 a RF-66: el capítulo se reconoce por lo escrito, y sin pista o con empate no', () => {
  const catalogo = catalogoDelPresupuesto(PRESUPUESTO_CON_VIAS);
  const posibles = capitulosDelItem(catalogo, '4.1.8');
  assert.equal(posibles.length, 4);
  assert.equal(capitulosDelItem(catalogo, '2.8').length, 1);
  assert.equal(reconocerCapitulo('excavación alcantarilla vía Ye-Yondo K0+120', posibles)?.clave, 'c2|4.1.8');
  assert.equal(reconocerCapitulo('cuneta sector Remedios', posibles)?.clave, 'c3|4.1.8');
  // «cuneta» sola está en las dos vías: empate.
  assert.equal(reconocerCapitulo('excavación para la cuneta', posibles), null);
  assert.equal(reconocerCapitulo('excavación en el K1+200', posibles), null);
  assert.equal(reconocerCapitulo('', posibles), null);
});

prueba('031/RF-58 a RF-63: la actividad de la bitácora con el presupuesto vigente lleva su capítulo', () => {
  const catalogo = catalogoDelPresupuesto(PRESUPUESTO_CON_VIAS);
  const base = {
    id: 'act-031',
    clave: '4.1.8',
    descripcion: '',
    observaciones: '',
    longitud: null,
    ancho: null,
    alto: null,
    area: null,
    volumen: null,
    cantidad: 30,
  };
  // Con capítulo: el ítem de ese capítulo, con capítulo y grupo congelados (RF-60).
  const conCapitulo = construirActividadDelParte({ ...base, capituloId: 'c4' }, catalogo)!;
  assert.deepEqual(
    [conCapitulo.item, conCapitulo.unidad, conCapitulo.cantidad, conCapitulo.capituloId, conCapitulo.capitulo, conCapitulo.grupo],
    ['4.1.8', 'm³', 30, 'c4', 'CONSTRUCCIÓN DE CUNETA', 'VIA LA YE-YONDO'],
  );
  assert.doesNotMatch(JSON.stringify(conCapitulo), /valor/i);
  // Sin capítulo, o con uno donde no está el ítem, no hay actividad.
  assert.equal(construirActividadDelParte(base, catalogo), null);
  assert.equal(construirActividadDelParte({ ...base, clave: '2.8', capituloId: 'c4' }, catalogo), null);
  // Sin presupuesto, la lista fija de siempre, sin capítulo (RF-58).
  const fija = construirActividadDelParte({ ...base, capituloId: 'c4' })!;
  assert.equal(fija.item, '4.1.8');
  assert.equal('capituloId' in fija, false);
  // «Otra actividad» sigue igual (RF-63).
  assert.equal(
    construirActividadDelParte({ ...base, clave: CLAVE_OTRA_ACTIVIDAD, texto: 'Limpieza', unidad: 'm2' }, catalogo)?.nombre,
    'Limpieza',
  );

  // En la sección: una nueva sin capítulo se explica; una vieja sin capítulo se conserva (RF-62).
  const sinCapitulo = actividadesDelParte([{ ...base, id: 'nueva' }], [], catalogo);
  assert.deepEqual(sinCapitulo, { error: 'Elija el capítulo de la actividad 4.1.8.' });
  const vieja = construirActividadDelParte({ ...base, id: 'vieja' })!;
  const seccion = actividadesDelParte([{ ...base, id: 'vieja' }, { ...base, id: 'nueva', capituloId: 'c2' }], [vieja], catalogo);
  assert.ok('filas' in seccion);
  if ('filas' in seccion) {
    assert.deepEqual(
      seccion.filas.map((f) => [f.id, f.capituloId ?? null]),
      [
        ['vieja', null],
        ['nueva', 'c2'],
      ],
    );
  }
  assert.deepEqual(actividadesDelParte([{ ...base, id: 'x', capituloId: 'c9' }], [], catalogo), {
    error: 'La actividad 4.1.8 no está en ese capítulo del presupuesto vigente de la obra.',
  });
  // Una guardada con capítulo cuyo ítem quitó una versión posterior se conserva, con su capítulo.
  const sinEl28 = copiarParaNuevaVersion(PRESUPUESTO_CON_VIAS);
  sinEl28.grupos[0].capitulos[0].items = sinEl28.grupos[0].capitulos[0].items.filter((i) => i.item !== '2.8');
  const del28 = construirActividadDelParte({ ...base, id: 'a28', clave: '2.8', capituloId: 'c1', cantidad: 12 }, catalogo)!;
  const conservada = actividadesDelParte([{ ...base, id: 'a28', clave: '2.8', capituloId: 'c1', cantidad: 12 }], [del28], catalogoDelPresupuesto(sinEl28));
  assert.ok('filas' in conservada);
  if ('filas' in conservada) {
    assert.deepEqual(
      [conservada.filas[0].item, conservada.filas[0].capituloId, conservada.filas[0].capitulo, conservada.filas[0].cantidad],
      ['2.8', 'c1', 'CONSTRUCCIÓN DE ALCANTARILLAS', 12],
    );
  }
});

prueba('031/RF-68: Reportes cuenta cada ítem dentro de su capítulo, con lo contratado y el %', () => {
  const base = { nombre: 'Excavación', descripcion: '', unidad: 'm³' };
  const partes = [
    {
      fecha: '2026-10-05',
      actividades: [
        { ...base, item: '4.1.8', cantidad: 100, capituloId: 'c1', capitulo: 'ALCANTARILLAS', grupo: 'Remedios' },
        { ...base, item: '4.1.8', cantidad: 40, capituloId: 'c4', capitulo: 'CUNETA', grupo: 'Ye-Yondo' },
        // De antes del presupuesto: sin capítulo, suma aparte por ítem.
        { ...base, item: '4.1.8', cantidad: 7 },
      ],
    },
    { fecha: '2026-10-06', actividades: [{ ...base, item: '4.1.8', cantidad: 50, capituloId: 'c1', capitulo: 'ALCANTARILLAS', grupo: 'Remedios' }] },
  ];
  const { items } = cantidadesPorItem(partes);
  assert.deepEqual(
    items.map((i) => [claveDeCantidad(i), i.capitulo, i.cantidad]),
    [
      ['4.1.8', null, 7],
      ['c1|4.1.8', 'ALCANTARILLAS', 150],
      ['c4|4.1.8', 'CUNETA', 40],
    ],
  );
  // Lo acumulado viene de toda la obra hasta el fin del periodo: aquí, 50 más de antes.
  const conAvance = conContratado(items, new Map([['c1|4.1.8', 2006], ['c4|4.1.8', 4352]]), new Map([['c1|4.1.8', 200], ['c4|4.1.8', 40]]));
  assert.deepEqual(
    conAvance.map((i) => [i.capitulo, i.contratado, i.acumulado, i.porcentaje]),
    [
      [null, null, 7, null],
      ['ALCANTARILLAS', 2006, 200, 10],
      ['CUNETA', 4352, 40, 0.9],
    ],
  );
});

prueba('031/RF-64 a RF-67: WhatsApp reconoce el capítulo del ítem, y si no puede lo aparta con los posibles', () => {
  const catalogos = { ...CATALOGOS_DE_PRUEBA, actividades: catalogoDelPresupuesto(PRESUPUESTO_CON_VIAS) };
  const propuesta = propuestaDeIa.parse({
    categoria: 'reporte_diario',
    fecha_evento: '2026-10-01',
    actividades: [
      // El 2.8 está en un solo capítulo: ese (RF-65).
      { descripcion: 'Demolición', items_pago: [{ codigo: '2.8', cantidad: 5 }] },
      // El 4.1.8 está en cuatro: el mensaje dice cuál (RF-64).
      { descripcion: 'Excavación', items_pago: [{ codigo: '4.1.8', cantidad: 30, capitulo: 'alcantarilla vía Ye-Yondo' }] },
      // Sin pista: queda sin capítulo (RF-66).
      { descripcion: 'Excavación', items_pago: [{ codigo: '4.1.8', cantidad: 10 }] },
      // Fuera del presupuesto vigente (RF-67).
      { descripcion: 'Otra cosa', items_pago: [{ codigo: '9.9.9', cantidad: 1 }] },
    ],
  });
  const { reporte } = resolverPropuesta(propuesta, catalogos, { diaDelMensaje: '2026-10-01', destino: 'reporte' });
  assert.deepEqual(
    reporte.actividades.map((a) => [a.clave, a.capituloId ?? null]),
    [
      ['2.8', 'c1'],
      ['4.1.8', 'c2'],
      ['4.1.8', null],
      [null, null],
    ],
  );
  const faltas = faltasDelReporte(reporte, { ...CONTEXTO_DEL_REPORTE, hoy: '2026-10-05', actividades: catalogos.actividades })
    .filter((f) => f.seccion === 'actividades')
    .map((f) => [f.renglon, f.mensaje]);
  assert.equal(faltas.length, 2);
  assert.equal(faltas[0][0], 2);
  assert.match(String(faltas[0][1]), /está en varios capítulos del presupuesto y el mensaje no dice cuál/);
  assert.match(String(faltas[0][1]), /CONSTRUCCIÓN DE CUNETA · VIA LA YE-YONDO/);
  assert.equal(faltas[1][0], 3);
  assert.match(String(faltas[1][1]), /9\.9\.9 no está en el presupuesto/);
  // Sin presupuesto (catálogo fijo), lo de siempre: sin capítulo y sin faltas por eso.
  const { reporte: sinPresupuesto } = resolverPropuesta(propuesta, CATALOGOS_DE_PRUEBA, { diaDelMensaje: '2026-10-01', destino: 'reporte' });
  assert.equal(sinPresupuesto.actividades[1].capituloId, undefined);
});

console.log('\nAsistente (spec 028)\n');

prueba('028/RF-1 a RF-5, RF-65: cada rol alcanza sus módulos, y el residente también vehículos y personas', () => {
  const de = (rol: Rol, obraId: string | null = 'obra-a', modulosDeObra = TODOS_LOS_MODULOS) =>
    alcanceDelAsistente({ rol, obraId, modulosDeObra });
  const gerencia = de('admin', null);
  assert.equal(gerencia.usa, true);
  assert.equal(gerencia.obras, 'todas');
  assert.deepEqual(gerencia.modulos, [...MODULOS_CONSULTABLES]);
  assert.deepEqual(de('supervisor'), {
    usa: true,
    obras: ['obra-a'],
    modulos: ['bitacoras', 'preoperacionales', 'almacen', 'cantera', 'laboratorio', 'whatsapp', 'reportes', 'contrato', 'vehiculos', 'personas'],
  });
  assert.deepEqual(de('almacenista').modulos, ['almacen']);
  assert.deepEqual(de('encargado_planta').modulos, ['cantera']);
  assert.deepEqual(de('laboratorista').modulos, ['laboratorio']);
  // RF-2: el operador no lo usa.
  assert.deepEqual(de('operador'), { usa: false, obras: [], modulos: [] });
  // Solo gerencia alcanza todas las obras; los demás, la suya.
  assert.deepEqual(de('almacenista').obras, ['obra-a']);
});

prueba('028/RF-5, RF-10: un módulo apagado en la obra queda fuera, y sin obra no hay nada', () => {
  const sinAlmacen = { ...TODOS_LOS_MODULOS, almacen: false };
  const residente = alcanceDelAsistente({ rol: 'supervisor', obraId: 'obra-a', modulosDeObra: sinAlmacen });
  assert.ok(!residente.modulos.includes('almacen'));
  assert.ok(residente.modulos.includes('cantera'));
  // El almacenista de una obra sin almacén no alcanza nada, pero sigue siendo usuario.
  assert.deepEqual(alcanceDelAsistente({ rol: 'almacenista', obraId: 'obra-a', modulosDeObra: sinAlmacen }).modulos, []);
  // La gerencia no se filtra por los módulos de una obra (017/RF-10).
  assert.ok(alcanceDelAsistente({ rol: 'admin', obraId: null, modulosDeObra: sinAlmacen }).modulos.includes('almacen'));
  // RF-10: residente sin obra.
  assert.deepEqual(alcanceDelAsistente({ rol: 'supervisor', obraId: null, modulosDeObra: TODOS_LOS_MODULOS }), {
    usa: true,
    obras: [],
    modulos: [],
  });
});

prueba('028/RF-4, RF-6: la obra se decide por quién pregunta', () => {
  const residente = alcanceDelAsistente({ rol: 'supervisor', obraId: 'obra-a', modulosDeObra: TODOS_LOS_MODULOS });
  assert.equal(obraAlAlcance(residente, 'obra-a'), true);
  assert.equal(obraAlAlcance(residente, 'obra-b'), false);
  assert.equal(obraAlAlcance(alcanceDelAsistente({ rol: 'admin', obraId: null, modulosDeObra: TODOS_LOS_MODULOS }), 'obra-b'), true);
});

prueba('028/RF-9, RF-49: una conversación se muestra entera solo si todavía se alcanza lo que consultó', () => {
  const residenteA = alcanceDelAsistente({ rol: 'supervisor', obraId: 'obra-a', modulosDeObra: TODOS_LOS_MODULOS });
  const deCantera = { obras: ['obra-a'], modulos: ['cantera' as const] };
  assert.equal(conversacionVisible(deCantera, residenteA), true);
  // Le cambiaron la obra: lo de la obra A ya no.
  const residenteB = alcanceDelAsistente({ rol: 'supervisor', obraId: 'obra-b', modulosDeObra: TODOS_LOS_MODULOS });
  assert.equal(conversacionVisible(deCantera, residenteB), false);
  // Le apagaron Cantera en su obra.
  const sinCantera = alcanceDelAsistente({ rol: 'supervisor', obraId: 'obra-a', modulosDeObra: { ...TODOS_LOS_MODULOS, cantera: false } });
  assert.equal(conversacionVisible(deCantera, sinCantera), false);
  // Una conversación sin consultas (p. ej. «hola») se ve siempre que use el asistente.
  assert.equal(conversacionVisible({ obras: [], modulos: [] }, residenteB), true);
  // Pasó a operador: ya no usa el asistente.
  const operador = alcanceDelAsistente({ rol: 'operador', obraId: 'obra-a', modulosDeObra: TODOS_LOS_MODULOS });
  assert.equal(conversacionVisible({ obras: [], modulos: [] }, operador), false);
});

prueba('028/RF-1, RF-2, RF-59: el asistente es de los cinco roles del panel, y los límites de la gerencia', () => {
  for (const rol of ROLES) {
    const usa = ROLES_DEL_ASISTENTE.includes(rol);
    // La tabla de permisos y la regla del asistente dicen lo mismo.
    assert.equal(alcanza(rol, 'asistente', 'ver'), usa, `${rol} asistente/ver`);
    assert.equal(modulosVisibles(rol).includes('asistente'), usa, rol);
    assert.equal(alcanceDelAsistente({ rol, obraId: 'obra-a', modulosDeObra: TODOS_LOS_MODULOS }).usa, usa, rol);
    // RF-59: cambiar los límites y ver el uso, solo la gerencia.
    assert.equal(alcanza(rol, 'asistente', 'escribir'), rol === 'admin', `${rol} asistente/escribir`);
  }
  assert.equal(alcanza('operador', 'asistente', 'ver'), false);
  // No depende de los módulos que lleve la obra.
  assert.equal(moduloApagado('asistente', { almacen: false, cantera: false, laboratorio: false }), false);
  assert.equal(moduloDeLaRuta('/panel/asistente'), 'asistente');
  assert.match(motivoDeRechazo('asistente', 'escribir'), /cambiar los límites del asistente/);
});

prueba('028/RF-50, RF-51, RF-59: el límite del día, el de la persona sobre el de todos', () => {
  assert.equal(limiteDelDia('ana', []), 30);
  assert.equal(limiteDelDia('ana', [{ usuarioId: null, limite: 20 }]), 20);
  assert.equal(limiteDelDia('ana', [{ usuarioId: null, limite: 20 }, { usuarioId: 'ana', limite: 50 }]), 50);
  assert.equal(limiteDelDia('beto', [{ usuarioId: null, limite: 20 }, { usuarioId: 'ana', limite: 50 }]), 20);
  // La 30.ª todavía entra (le queda 1 antes de hacerla); después, 0, y nunca negativo.
  assert.equal(preguntasQueQuedan(30, 29), 1);
  assert.equal(preguntasQueQuedan(30, 30), 0);
  assert.equal(preguntasQueQuedan(30, 31), 0);
});

prueba('028/RF-54: el conteo cambia de día a la medianoche de Colombia, no a la de UTC', () => {
  // 23:59 del 21-oct en Bogotá = 04:59 UTC del 22-oct.
  assert.equal(diaDelConteo(Date.parse('2026-10-22T04:59:00Z')), '2026-10-21');
  // 00:00 del 22-oct en Bogotá = 05:00 UTC.
  assert.equal(diaDelConteo(Date.parse('2026-10-22T05:00:00Z')), '2026-10-22');
});

prueba('028/RF-64: hasta 3 meses (92 días) por pregunta', () => {
  assert.equal(faltaDelPeriodo('2026-07-01', '2026-09-30'), null); // 92 días
  assert.match(faltaDelPeriodo('2026-07-01', '2026-10-01') ?? '', /93 días.*3 meses o menos/);
  assert.equal(faltaDelPeriodo('2026-10-21', '2026-10-21'), null);
  assert.match(faltaDelPeriodo('2026-10-22', '2026-10-21') ?? '', /al revés/);
});

prueba('028/RF-66 a RF-68: tipos, cantidad y tamaño de los adjuntos', () => {
  const MB = 1024 * 1024;
  assert.equal(claseDeAdjunto('vale.jpg', 'image/jpeg'), 'imagen');
  assert.equal(claseDeAdjunto('informe.pdf', 'application/pdf'), 'pdf');
  // Sin tipo (algunos .xlsx en Windows): por la extensión.
  assert.equal(claseDeAdjunto('Horas.XLSX', ''), 'excel');
  assert.equal(claseDeAdjunto('acta.docx', 'application/octet-stream'), 'word');
  assert.equal(claseDeAdjunto('viejo.xls', 'application/vnd.ms-excel'), null);
  assert.equal(claseDeAdjunto('video.mp4', 'video/mp4'), null);
  const foto = (nombre: string, bytes = MB) => ({ nombre, tipo: 'image/jpeg', bytes });
  assert.deepEqual(faltasDeLosAdjuntos([1, 2, 3, 4, 5].map((n) => foto(`f${n}.jpg`))), []);
  assert.match(faltasDeLosAdjuntos([1, 2, 3, 4, 5, 6].map((n) => foto(`f${n}.jpg`)))[0], /hasta 5 archivos por pregunta; hay 6/);
  assert.deepEqual(faltasDeLosAdjuntos([foto('justo.jpg', 10 * MB)]), []);
  assert.match(faltasDeLosAdjuntos([foto('grande.jpg', 10.1 * MB)])[0], /«grande.jpg» pesa 10,1 MB; el máximo es 10 MB/);
  assert.match(faltasDeLosAdjuntos([{ nombre: 'nota.mp3', tipo: 'audio/mpeg', bytes: MB }])[0], /«nota.mp3»: solo se aceptan/);
  assert.match(faltasDeLosAdjuntos([foto('vacio.jpg', 0)])[0], /llegó vacío/);
});

prueba('028/RF-44: el título sale de la primera pregunta', () => {
  assert.equal(tituloDeConversacion('  ¿Cuántos viajes\nhubo ayer?  '), '¿Cuántos viajes hubo ayer?');
  const larga = '¿Cuántos metros cúbicos de sub-base se colocaron la semana pasada y con qué volquetas, por día?';
  const titulo = tituloDeConversacion(larga);
  assert.ok(titulo.length <= 61 && titulo.endsWith('…'), titulo);
  assert.ok(!titulo.includes(' …'));
  assert.equal(tituloDeConversacion('', true), 'Archivo adjunto');
  assert.equal(tituloDeConversacion('   '), 'Conversación');
});

prueba('028/RF-57: el costo estimado, en microdólares', () => {
  // 30 000 de entrada y 2 000 de salida: 0,12 + 0,04 = 0,16 USD.
  assert.equal(costoEstimado({ entrada: 30_000, salida: 2_000 }), 160_000);
  // Con caché: 10 000 leídos y 5 000 escritos suman 0,002 + 0,025.
  assert.equal(costoEstimado({ entrada: 0, salida: 0, cacheLeida: 10_000, cacheEscrita: 5_000 }), 27_000);
});

prueba('028/RF-83: la consulta de anulados solo nombra los módulos que la persona alcanza', () => {
  const sinAlmacen = { ...TODOS_LOS_MODULOS, almacen: false };
  const residente = alcanceDelAsistente({ rol: 'supervisor', obraId: 'obra-a', modulosDeObra: sinAlmacen });
  assert.deepEqual(modulosDeAnulados(residente.modulos), ['bitacoras', 'cantera', 'preoperacionales', 'laboratorio']);
  assert.deepEqual(modulosDeAnulados(alcanceDelAsistente({ rol: 'admin', obraId: null, modulosDeObra: sinAlmacen }).modulos), [
    'bitacoras',
    'cantera',
    'almacen',
    'preoperacionales',
    'laboratorio',
  ]);
  // El laboratorista solo ve los de laboratorio; el almacenista sin almacén, ninguno.
  assert.deepEqual(
    modulosDeAnulados(alcanceDelAsistente({ rol: 'laboratorista', obraId: 'obra-a', modulosDeObra: TODOS_LOS_MODULOS }).modulos),
    ['laboratorio'],
  );
  assert.deepEqual(modulosDeAnulados(alcanceDelAsistente({ rol: 'almacenista', obraId: 'obra-a', modulosDeObra: sinAlmacen }).modulos), []);
});

prueba('028/RF-84: lo registrado de WhatsApp se cuenta por día y por tipo', () => {
  assert.deepEqual(
    resumenDeRegistrados([
      { dia: '2026-10-02', categoria: 'bitacora' },
      { dia: '2026-10-01', categoria: 'viajes' },
      { dia: '2026-10-01', categoria: 'bitacora' },
      { dia: '2026-10-01', categoria: 'viajes' },
      { dia: '2026-10-01', categoria: null },
    ]),
    [
      { dia: '2026-10-01', categoria: 'bitacora', mensajes: 1 },
      { dia: '2026-10-01', categoria: 'sin tipo', mensajes: 1 },
      { dia: '2026-10-01', categoria: 'viajes', mensajes: 2 },
      { dia: '2026-10-02', categoria: 'bitacora', mensajes: 1 },
    ],
  );
  assert.deepEqual(resumenDeRegistrados([]), []);
});

prueba('028/RF-81: los grupos por fecha van por el día de Colombia', () => {
  // Hoy: 22-oct a las 10 a. m. de Colombia (15:00 UTC).
  const ahora = Date.parse('2026-10-22T15:00:00Z');
  assert.equal(grupoDeFecha('2026-10-22T05:00:00Z', ahora), 'Hoy'); // medianoche de Colombia
  assert.equal(grupoDeFecha('2026-10-22T04:59:00Z', ahora), 'Ayer'); // 11:59 p. m. del 21 en Colombia, ya 22 en UTC
  assert.equal(grupoDeFecha('2026-10-21T12:00:00Z', ahora), 'Ayer');
  assert.equal(grupoDeFecha('2026-10-20T12:00:00Z', ahora), 'Últimos 7 días');
  assert.equal(grupoDeFecha('2026-10-16T12:00:00Z', ahora), 'Últimos 7 días'); // hace 6 días: 7 días con hoy
  assert.equal(grupoDeFecha('2026-10-15T12:00:00Z', ahora), 'Anteriores'); // hace 7 días
  const grupos = agruparPorFecha(
    [
      { id: 'a', actualizadaEn: '2026-10-22T14:00:00Z' },
      { id: 'b', actualizadaEn: '2026-10-01T14:00:00Z' },
      { id: 'c', actualizadaEn: '2026-10-22T13:00:00Z' },
    ],
    ahora,
  );
  assert.deepEqual(
    grupos.map((g) => [g.grupo, g.conversaciones.map((c) => c.id)]),
    [
      ['Hoy', ['a', 'c']],
      ['Anteriores', ['b']],
    ],
  );
});

prueba('028/RF-81: el buscador no distingue mayúsculas ni tildes', () => {
  const lista = [{ titulo: '¿Cuántos viajes de cantera hubo?' }, { titulo: 'Ensayos de compresión' }];
  assert.deepEqual(conversacionesQueCoinciden(lista, 'CUANTOS'), [lista[0]]);
  assert.deepEqual(conversacionesQueCoinciden(lista, 'compresion'), [lista[1]]);
  assert.deepEqual(conversacionesQueCoinciden(lista, '  '), lista);
  assert.deepEqual(conversacionesQueCoinciden(lista, 'almacén'), []);
});

prueba('028/RF-74: los ejemplos son solo de los módulos que la persona alcanza', () => {
  const sinAlmacen = { ...TODOS_LOS_MODULOS, almacen: false };
  const modulosDe = (rol: Rol, modulosDeObra = TODOS_LOS_MODULOS) => alcanceDelAsistente({ rol, obraId: 'obra-a', modulosDeObra }).modulos;
  const gerencia = ejemplosDePregunta(modulosDe('admin'));
  assert.equal(gerencia.length, 3);
  assert.ok(gerencia[0].includes('reporte'));
  for (const rol of ROLES_DEL_ASISTENTE) {
    const ejemplos = ejemplosDePregunta(modulosDe(rol));
    assert.ok(ejemplos.length >= 1 && ejemplos.length <= 3, rol);
  }
  assert.ok(ejemplosDePregunta(modulosDe('almacenista')).every((p) => /almac|stock/i.test(p)));
  assert.ok(ejemplosDePregunta(modulosDe('encargado_planta')).every((p) => /cantera/i.test(p)));
  assert.ok(ejemplosDePregunta(modulosDe('laboratorista')).every((p) => /ensayo|granulometr/i.test(p)));
  // Módulo apagado: el almacenista no recibe ejemplos, y el residente ninguno de almacén.
  assert.deepEqual(ejemplosDePregunta(modulosDe('almacenista', sinAlmacen)), []);
  assert.ok(ejemplosDePregunta(modulosDe('supervisor', sinAlmacen)).every((p) => !/almac|stock/i.test(p)));
});

/**
 * Spec 031, T4: el formulario de presupuesto. Asíncrona porque abre el Excel real de OCC
 * (`docs/preupuesto.xlsx`) con el mismo lector que usa el servidor.
 */
async function verificarFormulario() {
  console.log('\nFormulario de presupuesto (spec 031)\n');
  let n = 0;
  const contador = () => `id${++n}`;

  const archivo = readFileSync(path.join(__dirname, '..', 'docs', 'preupuesto.xlsx'));
  const hojas = await hojasDelLibro(archivo.buffer.slice(archivo.byteOffset, archivo.byteOffset + archivo.byteLength));

  await pruebaAsync('031/RF-41 a RF-43: el formulario de OCC da 2 grupos, 14 capítulos, 76 ítems, 8 rubros y $54.441.800.920', async () => {
    const leido = leerFormulario(hojas, contador);
    assert.ok(leido.ok, leido.ok ? '' : leido.error);
    if (!leido.ok) return;
    assert.deepEqual(leido.conteo, { grupos: 2, capitulos: 14, items: 76, rubros: 8 });
    assert.equal(leido.valor, 54_441_800_920);
    assert.equal(leido.valorDelExcel, 54_441_800_920);
    assert.equal(leido.cuadra, true);
    assert.deepEqual(leido.diferencias, []);
    const { estructura } = leido;
    assert.deepEqual(estructura.aiu, { administracion: 0.2623, imprevistos: 0.01, utilidad: 0.05 });
    const [remedios, yondo] = estructura.grupos;
    assert.match(remedios.nombre, /^Circuito Remedios/);
    assert.equal(yondo.nombre, 'VIA LA YE-YONDO');
    assert.deepEqual(
      yondo.capitulos.map((c) => [c.codigo, c.nombre, c.items.length]),
      [
        ['01', 'CONSTRUCCIÓN DE ALCANTARILLAS', 11],
        ['02', 'CONSTRUCCIÓN DE CUNETA', 5],
        ['03', 'CONSTRUCCIÓN DE FILTRO PARA CUNETAS', 2],
        ['04', 'CONSTRUCCIÓN DE BORDILLOS', 3],
        ['05', 'CONSTRUCCIÓN DE DISIPADORES', 4],
        ['06', 'ESTABILIZACION CON MATERIAL GRANULAR', 11],
        ['07', 'SEÑALIZACIÓN VIAL', 2],
      ],
    );
    // El primer capítulo de la primera vía está en la columna «Nº»; los demás, en «DESCRIPCIÓN».
    assert.equal(remedios.capitulos[0].nombre, 'CONSTRUCCIÓN DE ALCANTARILLAS');
    // Los subtotales del Excel salen iguales por capítulo.
    assert.equal(remedios.capitulos[0].items.reduce((s, i) => s + i.valorTotal, 0), 2_171_831_070);
    assert.equal(yondo.capitulos[5].items.reduce((s, i) => s + i.valorTotal, 0), 9_953_423_055);
    // 4.1.8 está en cuatro capítulos: alcantarillas y cuneta de cada vía (RF-36).
    const con418 = estructura.grupos.flatMap((g) => g.capitulos.filter((c) => c.items.some((i) => i.item === '4.1.8')));
    assert.equal(con418.length, 4);
    const r5 = remedios.capitulos[0].items[4];
    assert.deepEqual([r5.renglon, r5.item, r5.icociv, r5.especificaciones, r5.unidad], [5, '5.1.7', '11103', '5.1.7', 'm3']);
    assert.equal(remedios.capitulos[0].items[0].especificaciones, 'INVIAS 201-22');
    // Todas las unidades de los ítems se reconocen.
    assert.ok(estructura.grupos.every((g) => g.capitulos.every((c) => c.items.every((i) => i.unidad !== null))));
    // Los rubros: tres por vía y dos de todo el contrato (primas y actualización de precios).
    assert.deepEqual(
      estructura.rubros.map((r) => [r.grupoId === remedios.id ? 'remedios' : r.grupoId === yondo.id ? 'yondo' : null, r.valor]),
      [
        ['remedios', 218_336_960],
        ['remedios', 223_237_641],
        ['remedios', 26_399_025],
        ['yondo', 274_547_283],
        ['yondo', 264_473_841],
        ['yondo', 31_678_830],
        [null, 460_006_797],
        [null, 3_817_063_720],
      ],
    );
  });

  const ENCABEZADOS: Celda[] = ['Nº', 'ÍTEM DE PAGO', 'DESCRIPCIÓN', 'UND.', 'CANTIDAD', 'VALOR UNITARIO', 'VALOR TOTAL'];

  await pruebaAsync('031/RF-46: sin encabezados, sin ítems o sin valor total no se crea nada', async () => {
    const sinEncabezados = leerFormulario([[['Item', 'Descripción', 'Cantidad'], ['1', 'Excavación', 3]]], contador);
    assert.equal(sinEncabezados.ok, false);
    assert.match(sinEncabezados.ok ? '' : sinEncabezados.error, /No encontré la fila de encabezados/);
    const sinItems = leerFormulario([[ENCABEZADOS, [null, null, 'VALOR TOTAL', null, null, null, 0]]], contador);
    assert.match(sinItems.ok ? '' : sinItems.error, /No encontré ítems/);
    const sinTotal = leerFormulario([[ENCABEZADOS, [1, '4.1.8', 'Excavación', 'm3', 10, 100, 1000]]], contador);
    assert.match(sinTotal.ok ? '' : sinTotal.error, /VALOR TOTAL/);
  });

  await pruebaAsync('031/RF-44, RF-45: un total que no cuadra se señala y se crea con el calculado', async () => {
    const leido = leerFormulario(
      [
        [
          ['Formulario 1'],
          ENCABEZADOS,
          [null, null, 'CAPÍTULO ÚNICO', null, null, null, null],
          [1, '4.1.8', 'Excavación', 'm3', 10, 100, 1000],
          [2, '2.8', 'Demolición', 'm3', 3, 50, 999],
          ['Subtotal', 'TOTAL', null, null, null, null, 1999],
          [null, null, 'VALOR TOTAL', null, null, null, 2000],
        ],
      ],
      contador,
    );
    assert.ok(leido.ok);
    if (!leido.ok) return;
    // Sin grupo con nombre: un grupo vacío que la pantalla no muestra (RF-33).
    assert.deepEqual(leido.conteo, { grupos: 0, capitulos: 1, items: 2, rubros: 0 });
    assert.equal(leido.estructura.grupos[0].nombre, '');
    assert.deepEqual(leido.diferencias, [{ renglon: 2, item: '2.8', capitulo: 'CAPÍTULO ÚNICO', calculado: 150, delExcel: 999 }]);
    assert.equal(leido.estructura.grupos[0].capitulos[0].items[1].valorTotal, 150);
    assert.equal(leido.estructura.grupos[0].capitulos[0].items[1].totalDelExcel, 999);
    assert.equal(leido.valor, 1150);
    assert.equal(leido.cuadra, false);
  });

  await pruebaAsync('031/RF-75: una segunda fila de encabezados con «VALOR TOTAL» no corta la lectura', async () => {
    const leido = leerFormulario(
      [
        [
          ['Nº', 'ÍTEM DE PAGO', 'ESPECIFICACIONES', 'ESPECIFICACIONES', 'DESCRIPCIÓN', 'UND.', 'CANTIDAD', 'VALOR UNITARIO', 'VALOR TOTAL'],
          ['Nº', 'ÍTEM DE PAGO', 'GENERAL', 'PARTICULAR', 'DESCRIPCIÓN', 'UND.', 'CANTIDAD', 'VALOR UNITARIO', 'VALOR TOTAL'],
          ['EXPLANACIONES'],
          [1, '201.7.1', '201 - 22', null, 'Demolición estructuras', 'm3', 100, 137989, 13798900],
          [null, null, null, null, 'VALOR TOTAL', null, null, null, 13798900],
        ],
      ],
      contador,
    );
    assert.ok(leido.ok, leido.ok ? '' : leido.error);
    if (!leido.ok) return;
    assert.deepEqual(leido.conteo, { grupos: 0, capitulos: 1, items: 1, rubros: 0 });
    assert.equal(leido.estructura.grupos[0].capitulos[0].nombre, 'EXPLANACIONES');
    assert.equal(leido.cuadra, true);
  });

  const libro = readFileSync(
    path.join(__dirname, '..', 'docs', 'Planificación CONSORCIO CARTAGENA (V4-CON AJUSTE DEL CANAL Y LA VIA) 26-09-2026.xlsx'),
  );
  const hojasDelLibroDePlanificacion = await hojasDelLibro(libro.buffer.slice(libro.byteOffset, libro.byteOffset + libro.byteLength));

  await pruebaAsync('031/RF-74, RF-76: el libro de planificación va a la IA y solo con la hoja del presupuesto', async () => {
    // 79 hojas (datos, propuesta, vista árbol, flujos, gastos y un APU por ítem): solo la
    // segunda, «PROPUESTA ECONOMICA», es el presupuesto.
    assert.equal(hojasDelLibroDePlanificacion.length, 79);
    const delPresupuesto = hojasDelPresupuesto(hojasDelLibroDePlanificacion);
    assert.equal(delPresupuesto.length, 1);
    assert.equal(delPresupuesto[0], hojasDelLibroDePlanificacion[1]);
    // Tres niveles, subtotales e IVA por sección: el lector no lo cuadra y le toca a la IA.
    const leido = leerFormulario(hojasDelLibroDePlanificacion, contador);
    assert.ok(!leido.ok || !leido.cuadra);
  });

  await pruebaAsync('031/RF-76, RF-77: a la IA va solo la hoja del presupuesto, fila por fila, con tope', async () => {
    const paraLaIa = textoParaLaIa(hojasDelLibroDePlanificacion);
    assert.ok(paraLaIa);
    if (!paraLaIa) return;
    assert.ok(paraLaIa.filas > 150 && paraLaIa.filas < FILAS_MAXIMAS_PARA_LA_IA, String(paraLaIa.filas));
    const lineas = paraLaIa.texto.split('\n');
    // El ítem 1 está en la fila 17 de «PROPUESTA ECONOMICA», con su número real.
    const f17 = lineas.find((l) => l.startsWith('H1F17 |'));
    assert.ok(f17 && f17.includes('201.7.1') && f17.includes('137989') && f17.includes('13798900'), f17 ?? 'sin fila 17');
    // Ni las filas vacías ni las otras hojas (la «Vista árbol» dice «Precio contractual»).
    assert.ok(lineas.every((l) => !/^H\d+F\d+ \|[ |]*$/.test(l)));
    assert.ok(!paraLaIa.texto.includes('Precio contractual'));
    // Más de 1 500 filas: no se manda (RF-77). Sin hoja del presupuesto, tampoco.
    const grande: Celda[][] = [ENCABEZADOS, ...Array.from({ length: FILAS_MAXIMAS_PARA_LA_IA }, (_, i): Celda[] => [i + 1, '1.1', 'x', 'm3', 1, 1, 1])];
    assert.equal(textoParaLaIa([grande]), null);
    assert.equal(textoParaLaIa([[['Item', 'Descripción'], [1, 'x']]]), null);
  });

  await pruebaAsync('031/RF-78 a RF-81, RF-88: lo que lee la IA se comprueba contra su fila', async () => {
    const item = (fila: number, cantidad: number, valorUnitario: number, valorTotal = 0): ItemLeidoPorIa => ({
      hoja: 1, fila, numero: '1', item: '201.7.1', icociv: '11601', especificaciones: '201 - 22',
      descripcion: 'Demolicion estructuras', unidad: 'm3', cantidad, valorUnitario, valorTotal,
    });
    const SITIOS = 'VÍA 90A01 · SITIOS CRÍTICOS';
    const SITIOS_COMPLETO = 'VIA 90A01 DEL CORREDOR CARTAGENA - BARRANQUILLA EN LOS DEPARTAMENTOS DE ATLANTICO Y BOLIVAR · SITIOS CRITICOS';
    const leido = estructuraDeLaIa(
      {
        grupos: [
          {
            nombre: SITIOS,
            nombreCompleto: SITIOS_COMPLETO,
            capitulos: [
              {
                nombre: 'EXPLANACIONES',
                // Fila 17: bien. Fila 18: la IA le puso la cantidad de otra fila. Fila 9999: no existe.
                items: [item(17, 100, 137989, 13798900), item(18, 100, 94272), item(9999, 1, 1)],
              },
            ],
          },
          // Un capítulo y un grupo que se quedan sin ítems comprobados no se crean.
          { nombre: 'VÍA 90A01 · REHABILITACIÓN', nombreCompleto: '', capitulos: [{ nombre: 'BASES', items: [item(47, 1, 1)] }] },
        ],
        rubros: [
          // El IVA de la sección, en su grupo.
          { hoja: 1, fila: 41, grupo: SITIOS, nombre: 'VALOR IVA (OBRA)', unidad: '', cantidad: 0, valorUnitario: 0, valor: 57151345 },
          // Las provisiones son de la vía, que no es un grupo: quedan en todo el contrato.
          { hoja: 1, fila: 77, grupo: 'VIA 90A01', nombre: 'PROVISIÓN PARA AJUSTES', unidad: '', cantidad: 0, valorUnitario: 0, valor: 638117062 },
          // Un valor que no está en su fila.
          { hoja: 1, fila: 78, grupo: '', nombre: 'INVENTADO', unidad: '', cantidad: 0, valorUnitario: 0, valor: 1 },
        ],
        aiu: { administracion: 0, imprevistos: 0, utilidad: 0 },
        valorTotalDelExcel: 13798900 + 57151345 + 638117062,
      },
      hojasDelLibroDePlanificacion,
      contador,
    );
    assert.ok(leido.ok, leido.ok ? '' : leido.error);
    if (!leido.ok) return;
    assert.deepEqual(leido.conteo, { grupos: 1, capitulos: 1, items: 1, rubros: 2 });
    const [sitios] = leido.estructura.grupos;
    assert.equal(sitios.nombre, SITIOS);
    // RF-88: la frase completa queda para mostrarla, y el resumen la lleva.
    assert.equal(sitios.nombreCompleto, SITIOS_COMPLETO);
    assert.equal(resumenDelPresupuesto(leido.estructura).grupos[0].nombreCompleto, SITIOS_COMPLETO);
    assert.deepEqual(
      sitios.capitulos[0].items.map((i) => [i.renglon, i.item, i.unidad, i.cantidad, i.valorUnitario, i.valorTotal]),
      [[1, '201.7.1', 'm3', 100, 137989, 13798900]],
    );
    assert.deepEqual(
      leido.estructura.rubros.map((r) => [r.nombre, r.grupoId === sitios.id ? 'sitios' : r.grupoId, r.valor]),
      [
        ['VALOR IVA (OBRA)', 'sitios', 57151345],
        ['PROVISIÓN PARA AJUSTES', null, 638117062],
      ],
    );
    assert.deepEqual(
      leido.rechazados.map((r) => [r.fila, r.motivo]),
      [
        [18, 'no encontrado en la fila 18'],
        [9999, 'no encontrado en la fila 9999'],
        [47, 'no encontrado en la fila 47'],
        [78, 'no encontrado en la fila 78'],
      ],
    );
    assert.deepEqual(leido.diferencias, []);
    assert.equal(leido.cuadra, true);
    // Si la IA no deja ningún ítem comprobable, no se crea nada.
    const vacio = estructuraDeLaIa(
      { grupos: [{ nombre: '', nombreCompleto: '', capitulos: [{ nombre: 'X', items: [item(18, 100, 94272)] }] }], rubros: [], aiu: { administracion: 0, imprevistos: 0, utilidad: 0 }, valorTotalDelExcel: 0 },
      hojasDelLibroDePlanificacion,
      contador,
    );
    assert.match(vacio.ok ? '' : vacio.error, /La IA no encontró ítems/);
  });
}

prueba('032/RF-11: la placa se guarda en mayúsculas, solo con letras y cifras', () => {
  assert.equal(normalizarPlaca('tay-076'), 'TAY076');
  assert.equal(normalizarPlaca(' TAY 076 '), 'TAY076');
  assert.equal(normalizarPlaca('mc.770.197'), 'MC770197');
  assert.equal(normalizarPlaca('03WR0166'), '03WR0166');
  assert.equal(normalizarPlaca('  - '), null);
  assert.equal(normalizarPlaca(''), null);
  assert.equal(normalizarPlaca(null), null);
});

prueba('032/RF-13, RF-20: el equipo se nombra por su placa o, sin ella, con el aviso', () => {
  assert.equal(identificacionDelVehiculo({ placa: 'llq 375', tipo: 'Volqueta' }), 'LLQ375');
  assert.equal(
    identificacionDelVehiculo({ placa: null, tipo: 'Motoniveladora', marca: 'KOMATSU', modelo: 'Motoniveladora Komatsu alquilada GD555' }),
    `Motoniveladora Komatsu alquilada GD555 · ${AVISO_FALTA_PLACA}`,
  );
  assert.equal(
    identificacionDelVehiculo({ placa: '', tipo: 'Vibro Compactadora', marca: 'VOLVO', modelo: null }),
    `Vibro Compactadora VOLVO · ${AVISO_FALTA_PLACA}`,
  );
  assert.equal(identificacionDelVehiculo({ placa: null }), `Equipo · ${AVISO_FALTA_PLACA}`);
  // El modelo que escribió WhatsApp ya dice el tipo, con tilde y sin plural.
  assert.equal(
    identificacionDelVehiculo({ placa: null, tipo: 'Vibro Compactadora', marca: 'VOLVO', modelo: 'Vibrócompactador Volvo' }),
    `Vibrócompactador Volvo · ${AVISO_FALTA_PLACA}`,
  );
  assert.equal(
    identificacionDelVehiculo({ placa: null, tipo: 'Montacargas', marca: null, modelo: 'Montacarga a Diesel' }),
    `Montacarga a Diesel · ${AVISO_FALTA_PLACA}`,
  );
});

prueba('032/RF-18, RF-19: WhatsApp reconoce la máquina por su placa y por su código de antes', () => {
  // Así queda un equipo después del script de la spec 032: el código es la placa.
  const flota: VehiculoConocido[] = [
    { id: 'tay076', codigoInterno: 'TAY076', placa: 'TAY076', codigoAnterior: 'VOL-MAG-04', obraId: 'obra-a' },
    { id: 'llq375', codigoInterno: 'LLQ375', placa: 'LLQ375', codigoAnterior: 'WA-LLQ375', obraId: 'obra-a' },
    { id: 'nuevo', codigoInterno: 'PRB032', placa: 'PRB032', codigoAnterior: null, obraId: 'obra-a' },
  ];
  assert.equal(reconocerVehiculo('VOL-MAG-04', flota, 'obra-a'), 'tay076');
  assert.equal(reconocerVehiculo('Volqueta vol mag 04', flota, 'obra-a'), 'tay076');
  assert.equal(reconocerVehiculo('Volqueta TAY 076', flota, 'obra-a'), 'tay076');
  assert.equal(reconocerVehiculo('WA-LLQ375', flota, 'obra-a'), 'llq375');
  assert.equal(reconocerVehiculo('prb-032', flota, 'obra-a'), 'nuevo');
  // El código viejo de otra obra no se toma: solo cuentan los equipos de la obra.
  assert.equal(reconocerVehiculo('VOL-MAG-04', flota, 'obra-b'), null);
});

const PARTE_SIN_ACTIVIDADES_032 = {
  maquinaria: [{ codigo: 'TAY076', claseMedidor: 'odometro' as const, medidorInicial: 100, medidorFinal: 150 }],
  personal: [{ nombre: 'Pedro Cartagena', entrada: '07:30', salida: '17:00' }],
  actividades: [],
  clima: [{}],
  laboratorio: [],
  notas: 'Sin novedad.',
};
const FOTO_DEL_DIA_032 = { delDia: 1, itemsConFoto: [] };

prueba('032/RF-24, RF-25, RF-32: con la marca y su motivo, la sección vacía deja cerrar', () => {
  // Sin marcas: faltan las dos secciones.
  assert.deepEqual(bloqueosDelCierre(PARTE_SIN_ACTIVIDADES_032, FOTO_DEL_DIA_032), [
    'Falta llenar: Actividades y Control Calidad de Obra.',
  ]);
  // Con las dos marcas y su motivo: nada, ni siquiera la foto de una actividad (RF-25).
  assert.deepEqual(
    bloqueosDelCierre(
      {
        ...PARTE_SIN_ACTIVIDADES_032,
        sinActividades: true,
        motivoSinActividades: 'Lluvia toda la tarde, solo mantenimiento.',
        sinEnsayos: true,
        motivoSinEnsayos: 'No hubo material para ensayar.',
      },
      FOTO_DEL_DIA_032,
    ),
    [],
  );
  // Un ensayo del módulo de Laboratorio llena la sección: la marca de ensayos sobra.
  assert.deepEqual(
    bloqueosDelCierre(
      { ...PARTE_SIN_ACTIVIDADES_032, sinActividades: true, motivoSinActividades: 'Lluvia.', ensayosDelModulo: 1 },
      FOTO_DEL_DIA_032,
    ),
    [],
  );
});

prueba('032/RF-23, RF-31: la marca sin motivo no deja cerrar, y lo dice', () => {
  assert.deepEqual(
    bloqueosDelCierre(
      { ...PARTE_SIN_ACTIVIDADES_032, sinActividades: true, motivoSinActividades: '  ', sinEnsayos: true },
      FOTO_DEL_DIA_032,
    ),
    [faltaElMotivoSinRegistro('actividades'), faltaElMotivoSinRegistro('ensayos')],
  );
  assert.equal(faltaElMotivoSinRegistro('actividades'), 'Actividades: falta el motivo de por qué no se realizaron.');
  assert.equal(faltaElMotivoSinRegistro('ensayos'), 'Control de calidad: falta el motivo de por qué no se realizaron.');
  // Lo que falta en otras secciones se sigue diciendo junto.
  assert.deepEqual(
    bloqueosDelCierre({ ...PARTE_SIN_ACTIVIDADES_032, notas: null, sinActividades: true }, FOTO_DEL_DIA_032),
    ['Falta llenar: Control Calidad de Obra y Notas.', faltaElMotivoSinRegistro('actividades')],
  );
});

prueba('032/RF-37, RF-38: en día sin trabajo las marcas no cuentan; sin marcas, todo igual', () => {
  const domingo = {
    maquinaria: [],
    personal: [],
    actividades: [],
    clima: [{}],
    laboratorio: [],
    notas: 'Domingo.',
    sinTrabajo: true,
    motivoSinTrabajo: 'Domingo.',
    // Marcada sin motivo: en un día sin trabajo no se mira.
    sinActividades: true,
  };
  assert.deepEqual(bloqueosDelCierre(domingo, FOTO_DEL_DIA_032), []);
  // Un parte de antes del cambio (sin las marcas) se evalúa como siempre.
  assert.deepEqual(bloqueosDelCierre({ ...PARTE_SIN_ACTIVIDADES_032, actividades: [{ id: 'a' }] }, { delDia: 1, itemsConFoto: ['a'] }), [
    'Falta llenar: Control Calidad de Obra.',
  ]);
});

prueba('032: en el índice, la sección vacía con su marca y su motivo «no aplica»', () => {
  const conMarcas = seccionesDelParte({ ...PARTE_VACIO, actividadesNoAplican: true, ensayosNoAplican: true });
  assert.equal(conMarcas.find((s) => s.id === 'actividades')?.estado, 'no_aplica');
  assert.equal(conMarcas.find((s) => s.id === 'laboratorio')?.estado, 'no_aplica');
  // Sin la marca, la sección vacía sigue «sin registrar»; con filas, se cuentan.
  assert.notEqual(seccionesDelParte(PARTE_VACIO).find((s) => s.id === 'actividades')?.estado, 'no_aplica');
  const conFilas = seccionesDelParte({ ...PARTE_VACIO, actividades: 2, actividadesNoAplican: true });
  assert.equal(conFilas.find((s) => s.id === 'actividades')?.cuantos, 2);
});

prueba('032/RF-27, RF-28, RF-34, RF-35: cómo queda la marca tras un guardado', () => {
  const sin = { marcada: false, motivo: null };
  const con = { marcada: true, motivo: 'Lluvia.' };
  // Marcar con motivo, en una sección vacía.
  assert.deepEqual(resolverSeccionSinRegistro(sin, { marcada: true, motivo: '  Lluvia.  ' }, 0), {
    marcada: true,
    motivo: 'Lluvia.',
    error: null,
  });
  // Marcar sin motivo se deja guardar; lo que no deja es cerrar.
  assert.deepEqual(resolverSeccionSinRegistro(sin, { marcada: true }, 0), { marcada: true, motivo: null, error: null });
  // Solo el motivo, con la marca ya guardada.
  assert.deepEqual(resolverSeccionSinRegistro({ marcada: true, motivo: null }, { motivo: 'Paro.' }, 0), {
    marcada: true,
    motivo: 'Paro.',
    error: null,
  });
  // Desmarcar borra el motivo (RF-28, RF-35).
  assert.deepEqual(resolverSeccionSinRegistro(con, { marcada: false }, 0), { marcada: false, motivo: null, error: null });
  // Marcar una sección con filas es contradecirse.
  assert.equal(resolverSeccionSinRegistro(sin, { marcada: true, motivo: 'x' }, 2).error, 'con_registros');
  // Llega una actividad (WhatsApp) sin tocar la marca: se desmarca sola (RF-27, RF-34).
  assert.deepEqual(resolverSeccionSinRegistro(con, {}, 1), { marcada: false, motivo: null, error: null });
  // Sin cambios y sin filas, queda como estaba.
  assert.deepEqual(resolverSeccionSinRegistro(con, {}, 0), { ...con, error: null });
});

/* ── Grupo empresarial (spec 033) ── */

console.log('\nGrupo empresarial (spec 033)\n');

/** Las páginas de un menú, fáciles de comparar. */
const paginas = (menu: { pagina: string }[]) => menu.map((m) => m.pagina);

prueba('033/RF-1: las cuatro empresas, en el orden de las tarjetas; Proyectos sin corte propio', () => {
  assert.deepEqual(
    EMPRESAS.map((e) => e.nombre),
    ['Elemental Ingeniería y Arquitectura', 'OCC', 'Geolab', 'Proyectos'],
  );
  for (const e of EMPRESAS) assert.ok(e.funcion.length > 0, e.id);
  // Cambio del 2026-10-27: los cortes de Proyectos son los de sus obras.
  assert.deepEqual([...EMPRESAS_CON_CORTE], ['elemental', 'occ', 'geolab']);
});

prueba('033/RF-13 a RF-15, RF-29: gerencia ve el menú entero de cada empresa, con el asistente', () => {
  // Menús definitivos (cambio del 2026-10-27).
  assert.deepEqual(paginas(menuDeEmpresa('elemental', 'admin')), [
    'recursos-humanos', 'compras', 'tesoreria', 'documentos', 'licitaciones', 'asistente',
  ]);
  // Con Recursos Humanos de consulta en OCC y Geolab desde la spec 035 (RF-3).
  assert.deepEqual(paginas(menuDeEmpresa('occ', 'admin')), [
    'whatsapp', 'bitacora', 'documentos', 'recursos-humanos', 'reportes', 'vehiculos', 'preoperacionales',
    'asignaciones', 'solicitudes-compra', 'solicitudes-pago', 'asistente',
  ]);
  assert.deepEqual(paginas(menuDeEmpresa('geolab', 'admin')), [
    'bitacora', 'whatsapp', 'laboratorio', 'reportes', 'documentos', 'recursos-humanos', 'solicitudes-compra',
    'solicitudes-pago', 'asistente',
  ]);
  assert.equal(menuDeEmpresa('occ', 'admin')[4].titulo, 'Reportes de vehículos y maquinaria');
  assert.equal(menuDeEmpresa('geolab', 'admin')[3].titulo, 'Reportes de laboratorio');
  // Ninguno lleva ya la información de la empresa, la financiera ni el consolidado.
  for (const empresa of ['elemental', 'occ', 'geolab'] as const) {
    const permisos = menuDeEmpresa(empresa, 'admin').map((m) => m.permiso);
    assert.ok(!permisos.includes('empresa') && !permisos.includes('finanzas'), empresa);
  }
});

prueba('033/RF-17, RF-18: el menú de una obra, sin los módulos que la obra tiene apagados', () => {
  // Con Documentos después de Contrato y Presupuesto desde la spec 034 (RF-2).
  assert.deepEqual(paginas(menuDeObra('admin')), [
    'bitacoras', 'whatsapp', 'reportes', 'recursos-humanos', 'calidad', 'almacen',
    'preoperacionales', 'asignaciones', 'cantera', 'contrato', 'documentos', 'solicitudes-compra',
    'solicitudes-pago', 'asistente',
  ]);
  assert.equal(menuDeObra('admin')[2].titulo, 'Reportes e informes');
  // Calidad es el laboratorio de la obra: se apaga con él.
  const sinCanteraNiLaboratorio = { almacen: true, cantera: false, laboratorio: false };
  assert.deepEqual(paginas(menuDeObra('admin', sinCanteraNiLaboratorio)), [
    'bitacoras', 'whatsapp', 'reportes', 'recursos-humanos', 'almacen', 'preoperacionales',
    'asignaciones', 'contrato', 'documentos', 'solicitudes-compra', 'solicitudes-pago', 'asistente',
  ]);
});

prueba('033/RF-49: Licitaciones abre LicitApp en una pestaña nueva', () => {
  const licitaciones = menuDeEmpresa('elemental', 'admin').find((m) => m.pagina === 'licitaciones');
  assert.equal(licitaciones?.externa, DIRECCION_DE_LICITAPP);
  assert.equal(DIRECCION_DE_LICITAPP, 'https://licitapp-elementaling.cloud/');
  const enlaces = menuDelLugar({ tipo: 'empresa', empresa: 'elemental', pagina: null }, 'admin').entradas;
  assert.deepEqual(enlaces.find((e) => e.clave === 'licitaciones'), {
    clave: 'licitaciones',
    titulo: 'Licitaciones',
    ruta: 'https://licitapp-elementaling.cloud/',
    externa: true,
  });
  // Las demás son del panel.
  assert.deepEqual(enlaces.find((e) => e.clave === 'compras'), {
    clave: 'compras',
    titulo: 'Compras',
    ruta: '/panel/elemental/compras',
  });
});

prueba('033/RF-51: piden compras y pagos el residente, el almacenista, el laboratorista y gerencia; aprueba gerencia', () => {
  // Más el Encargado de OCC, que pide en nombre de OCC (spec 034, RF-16).
  assert.deepEqual(
    ROLES.filter((r) => alcanza(r, 'solicitudes', 'escribir')),
    ['admin', 'supervisor', 'almacenista', 'laboratorista', 'encargado_occ'],
  );
  // Documentos dejó de ser solo de la gerencia con la spec 034: su prueba es la de 034/RF-4.
  // La auxiliar de RR. HH. ve todo lo de Elemental desde la spec 035 (RF-10).
  for (const modulo of ['compras', 'tesoreria', 'licitaciones'] as const) {
    assert.deepEqual(ROLES.filter((r) => alcanza(r, modulo, 'ver')), ['admin', 'auxiliar_rrhh'], modulo);
  }
  for (const modulo of ['compras', 'tesoreria'] as const) {
    assert.deepEqual(ROLES.filter((r) => alcanza(r, modulo, 'aprobar')), ['admin'], modulo);
  }
  assert.equal(
    motivoDeRechazo('compras', 'aprobar'),
    'No puede aprobar ni rechazar solicitudes de compra: lo hace la gerencia.',
  );
  // Recursos Humanos: lo llevan gerencia y la auxiliar de RR. HH. (035); el residente consulta el de su obra.
  // El Encargado de OCC y el laboratorista consultan el de su empresa (035/RF-4).
  assert.deepEqual(ROLES.filter((r) => alcanza(r, 'rrhh', 'ver')), [
    'admin',
    'supervisor',
    'laboratorista',
    'encargado_occ',
    'auxiliar_rrhh',
  ]);
  assert.equal(alcanza('supervisor', 'rrhh', 'escribir'), false);
});

prueba('033/RF-52: las páginas que cambiaron de nombre llevan a la nueva', () => {
  const tesoreria = '/panel/elemental/tesoreria';
  for (const pagina of ['empresa', 'finanzas', 'consolidado']) {
    assert.equal(rutaRenombrada({ tipo: 'empresa', empresa: 'occ', pagina }), tesoreria, pagina);
  }
  assert.equal(rutaRenombrada({ tipo: 'obra', obraId: 'o1', pagina: 'obra' }), tesoreria);
  assert.equal(rutaRenombrada({ tipo: 'obra', obraId: 'o1', pagina: 'finanzas' }), tesoreria);
  assert.equal(
    rutaRenombrada({ tipo: 'empresa', empresa: 'geolab', pagina: 'personas' }),
    '/panel/elemental/recursos-humanos?pestana=personas',
  );
  assert.equal(
    rutaRenombrada({ tipo: 'empresa', empresa: 'elemental', pagina: 'obras' }),
    '/panel/elemental/recursos-humanos?pestana=obras',
  );
  assert.equal(rutaRenombrada({ tipo: 'empresa', empresa: 'occ', pagina: 'maquinaria' }), '/panel/occ/bitacora');
  assert.equal(rutaRenombrada({ tipo: 'obra', obraId: 'o1', pagina: 'laboratorio' }), '/panel/proyectos/o1/calidad');
  assert.equal(
    rutaRenombrada({ tipo: 'obra', obraId: 'o1', pagina: 'personas' }),
    '/panel/proyectos/o1/recursos-humanos',
  );
  // Las que siguen igual, y la portada.
  assert.equal(rutaRenombrada({ tipo: 'empresa', empresa: 'occ', pagina: 'vehiculos' }), null);
  assert.equal(rutaRenombrada({ tipo: 'empresa', empresa: 'geolab', pagina: 'laboratorio' }), null);
  assert.equal(rutaRenombrada({ tipo: 'obra', obraId: 'o1', pagina: null }), null);
  assert.equal(rutaRenombrada({ tipo: 'proyectos' }), null);

  // Para quien entra (visto en la demo de la T22): la residente no va a Tesorería ni a
  // Recursos Humanos de Elemental, que le darían «Sin acceso», sino a su Inicio.
  const gerencia = { rol: 'admin' as const, obraId: null };
  const residente = { rol: 'supervisor' as const, obraId: 'o1' };
  const laboratorista = { rol: 'laboratorista' as const, obraId: 'o9' };
  const occEmpresa = { tipo: 'empresa' as const, empresa: 'occ' as const, pagina: 'empresa' };
  assert.equal(rutaRenombradaPara(occEmpresa, gerencia), tesoreria);
  assert.equal(rutaRenombradaPara(occEmpresa, residente), '/panel/proyectos/o1');
  assert.equal(rutaRenombradaPara({ tipo: 'obra', obraId: 'o1', pagina: 'finanzas' }, residente), '/panel/proyectos/o1');
  assert.equal(rutaRenombradaPara({ tipo: 'empresa', empresa: 'geolab', pagina: 'personas' }, laboratorista), '/panel/geolab/laboratorio');
  assert.equal(
    rutaRenombradaPara({ tipo: 'empresa', empresa: 'geolab', pagina: 'personas' }, gerencia),
    '/panel/elemental/recursos-humanos?pestana=personas',
  );
  // La auxiliar de RR. HH. sí entra a Recursos Humanos; a Tesorería también la ve.
  const auxiliar = { rol: 'auxiliar_rrhh' as const, obraId: null };
  assert.equal(
    rutaRenombradaPara({ tipo: 'empresa', empresa: 'elemental', pagina: 'personas' }, auxiliar),
    '/panel/elemental/recursos-humanos?pestana=personas',
  );
  // Dentro de una obra, la nueva sigue en la obra: la decide la página de la obra.
  assert.equal(rutaRenombradaPara({ tipo: 'obra', obraId: 'o1', pagina: 'laboratorio' }, residente), '/panel/proyectos/o1/calidad');
  assert.equal(rutaRenombradaPara({ tipo: 'empresa', empresa: 'occ', pagina: 'vehiculos' }, residente), null);
});

prueba('033/RF-21, RF-32, RF-44: el menú reparte con los permisos de hoy; datos y finanzas solo gerencia', () => {
  // El residente ve en su obra lo mismo que veía antes en el menú (sin Personas, que
  // solo lista), y nada de la información de la obra ni de las finanzas. Con
  // Preoperacionales y Asignaciones (cambio del 2026-10-27 a RF-17).
  // Con los menús definitivos (cambio del 2026-10-27), el mismo menú de la obra: Recursos
  // Humanos en consulta y las solicitudes de compra y de pago. Y Documentos de su obra
  // (spec 034, RF-5).
  assert.deepEqual(paginas(menuDeObra('supervisor')), [
    'bitacoras', 'whatsapp', 'reportes', 'recursos-humanos', 'calidad', 'almacen',
    'preoperacionales', 'asignaciones', 'cantera', 'contrato', 'documentos', 'solicitudes-compra',
    'solicitudes-pago', 'asistente',
  ]);
  // Todo lo que el residente veía antes sigue en algún menú suyo (RF-21).
  const antes = modulosVisibles('supervisor').filter((m) => m !== 'inicio');
  const ahora = new Set(menuDeObra('supervisor').map((m) => m.permiso));
  assert.deepEqual(antes.filter((m) => !ahora.has(m)), []);
  assert.deepEqual(paginas(menuDeObra('almacenista')), [
    'almacen', 'solicitudes-compra', 'solicitudes-pago', 'asistente',
  ]);
  assert.deepEqual(paginas(menuDeObra('encargado_planta')), ['cantera', 'asistente']);
  assert.deepEqual(paginas(menuDeObra('almacenista', { almacen: false, cantera: true, laboratorio: true })), [
    'solicitudes-compra', 'solicitudes-pago', 'asistente',
  ]);
  // Con los documentos de Geolab desde la spec 034 (RF-7).
  assert.deepEqual(paginas(menuDeEmpresa('geolab', 'laboratorista')), [
    'laboratorio', 'documentos', 'recursos-humanos', 'solicitudes-compra', 'solicitudes-pago', 'asistente',
  ]);
  for (const rol of ROLES.filter((r) => r !== 'admin')) {
    for (const accion of ['ver', 'listar', 'escribir', 'anular'] as const) {
      assert.equal(alcanza(rol, 'finanzas', accion), false, `${rol} finanzas/${accion}`);
      assert.equal(alcanza(rol, 'empresa', accion), false, `${rol} empresa/${accion}`);
    }
  }
  assert.ok(alcanza('admin', 'finanzas', 'anular'));
  assert.equal(alcanza('admin', 'finanzas', 'aprobar'), false);
  assert.equal(
    motivoDeRechazo('finanzas', 'escribir'),
    'No puede registrar cortes financieros: lo hace la gerencia.',
  );
  assert.equal(motivoDeRechazo('empresa', 'escribir'), 'No puede cambiar los datos de la empresa: lo hace la gerencia.');
});

prueba('033/RF-12: cada rol entra a su empresa, y a Proyectos solo con su obra', () => {
  for (const e of EMPRESAS) assert.ok(alcanzaLaEmpresa('admin', e.id), e.id);
  assert.deepEqual(
    EMPRESAS.filter((e) => alcanzaLaEmpresa('supervisor', e.id)).map((e) => e.id),
    ['proyectos'],
  );
  assert.deepEqual(
    EMPRESAS.filter((e) => alcanzaLaEmpresa('laboratorista', e.id)).map((e) => e.id),
    ['geolab'],
  );
  assert.deepEqual(EMPRESAS.filter((e) => alcanzaLaEmpresa('operador', e.id)), []);

  assert.ok(alcanzaLaObraDeLaRuta({ rol: 'admin', obraId: null }, 'cualquiera'));
  assert.ok(alcanzaLaObraDeLaRuta({ rol: 'supervisor', obraId: 'o1' }, 'o1'));
  assert.equal(alcanzaLaObraDeLaRuta({ rol: 'supervisor', obraId: 'o1' }, 'o2'), false);
  assert.equal(alcanzaLaObraDeLaRuta({ rol: 'supervisor', obraId: null }, 'o1'), false);
  assert.ok(alcanzaLaObraDeLaRuta({ rol: 'almacenista', obraId: 'o1' }, 'o1'));
  // El laboratorista no entra a Proyectos aunque tenga obra: su lugar es Geolab.
  assert.equal(alcanzaLaObraDeLaRuta({ rol: 'laboratorista', obraId: 'o1' }, 'o1'), false);
});

prueba('033/RF-45, RF-46: la empresa de la persona, o la de su rol si no tiene', () => {
  assert.equal(empresaDeLaPersona(null, 'operador'), 'occ');
  assert.equal(empresaDeLaPersona(null, 'laboratorista'), 'geolab');
  assert.equal(empresaDeLaPersona(null, 'supervisor'), 'proyectos');
  assert.equal(empresaDeLaPersona(null, 'almacenista'), 'proyectos');
  assert.equal(empresaDeLaPersona(null, 'encargado_planta'), 'proyectos');
  assert.equal(empresaDeLaPersona(null, 'admin'), 'elemental');
  // La elegida manda sobre el rol; una que no existe, no.
  assert.equal(empresaDeLaPersona('geolab', 'operador'), 'geolab');
  assert.equal(empresaDeLaPersona('otra', 'operador'), 'occ');
});

prueba('033/RF-6 a RF-9: cada rol entra a lo suyo', () => {
  assert.equal(destinoAlEntrar({ rol: 'admin', obras: [] }), '/panel');
  // El residente, directo a su obra: la portada es el resumen del día.
  assert.equal(destinoAlEntrar({ rol: 'supervisor', obras: ['o1'] }), '/panel/proyectos/o1');
  // Con varias obras o sin ninguna, la lista de Proyectos (RF-7 y caso límite).
  assert.equal(destinoAlEntrar({ rol: 'supervisor', obras: ['o1', 'o2'] }), '/panel/proyectos');
  assert.equal(destinoAlEntrar({ rol: 'supervisor', obras: [] }), '/panel/proyectos');
  assert.equal(destinoAlEntrar({ rol: 'laboratorista', obras: ['o1'] }), '/panel/geolab/laboratorio');
  // Almacenista y encargado de planta, a su módulo como hoy (008/RF-4).
  assert.equal(destinoAlEntrar({ rol: 'almacenista', obras: ['o1'] }), '/panel/proyectos/o1/almacen');
  assert.equal(destinoAlEntrar({ rol: 'encargado_planta', obras: ['o1'] }), '/panel/proyectos/o1/cantera');
  assert.equal(destinoAlEntrar({ rol: 'operador', obras: ['o1'] }), null);
});

prueba('033/RF-47: las direcciones de antes llevan a su pantalla dentro de la empresa', () => {
  const gerencia = { rol: 'admin' as const, obraId: null };
  const residente = { rol: 'supervisor' as const, obraId: 'o1' };
  const laboratorista = { rol: 'laboratorista' as const, obraId: 'o1' };

  // Las de una empresa, con sus parámetros.
  assert.equal(rutaNueva('/panel/vehiculos', gerencia), '/panel/occ/vehiculos');
  assert.equal(rutaNueva('/panel/asignaciones?pagina=2', gerencia), '/panel/occ/asignaciones?pagina=2');
  assert.equal(rutaNueva('/panel/preoperacionales', gerencia), '/panel/occ/preoperacionales');
  // El residente, a los de su obra (cambio del 2026-10-27 a RF-17).
  assert.equal(rutaNueva('/panel/preoperacionales', residente), '/panel/proyectos/o1/preoperacionales');
  assert.equal(rutaNueva('/panel/asignaciones', residente), '/panel/proyectos/o1/asignaciones');
  // Obras y Personas, en Recursos Humanos de Elemental (cambio del 2026-10-27).
  assert.equal(rutaNueva('/panel/obras/', gerencia), '/panel/elemental/recursos-humanos?pestana=obras');
  assert.equal(rutaNueva('/panel/personas', gerencia), '/panel/elemental/recursos-humanos?pestana=personas');
  // Quien no entra a Elemental (visto en la demo de la T22): Personas, a Recursos Humanos de
  // lo suyo; Obras, que no tiene equivalente, a su Inicio.
  assert.equal(rutaNueva('/panel/personas', residente), '/panel/proyectos/o1/recursos-humanos');
  assert.equal(rutaNueva('/panel/personas', { rol: 'encargado_occ', obraId: null }), '/panel/occ/recursos-humanos');
  assert.equal(rutaNueva('/panel/personas', { rol: 'laboratorista', obraId: 'o1' }), '/panel/geolab/recursos-humanos');
  assert.equal(rutaNueva('/panel/personas', { rol: 'almacenista', obraId: 'o1' }), '/panel/proyectos/o1/almacen');
  assert.equal(rutaNueva('/panel/obras', residente), '/panel/proyectos/o1');
  assert.equal(
    rutaNueva('/panel/personas', { rol: 'auxiliar_rrhh', obraId: null }),
    '/panel/elemental/recursos-humanos?pestana=personas',
  );

  // Las de una obra: gerencia, a la obra de la dirección, que sale de los parámetros.
  assert.equal(
    rutaNueva('/panel/bitacoras?fecha=2026-10-08&obraId=o9', gerencia),
    '/panel/proyectos/o9/bitacoras?fecha=2026-10-08',
  );
  assert.equal(
    rutaNueva('/panel/reportes?obra=o9&pestana=calidad', gerencia),
    '/panel/proyectos/o9/reportes?pestana=calidad',
  );
  // Sin obra, a la lista, que la lleva a esa pantalla al elegir una.
  assert.equal(
    rutaNueva('/panel/bitacoras?fecha=2026-10-08', gerencia),
    '/panel/proyectos?ir=bitacoras&fecha=2026-10-08',
  );
  assert.equal(rutaNueva('/panel/laboratorio', gerencia), '/panel/geolab/laboratorio');
  assert.equal(rutaNueva('/panel/asistente?conversacion=c1', gerencia), '/panel/elemental/asistente?conversacion=c1');

  // El residente va siempre a la suya, diga lo que diga la dirección.
  assert.equal(rutaNueva('/panel/bitacoras?obraId=o9', residente), '/panel/proyectos/o1/bitacoras');
  assert.equal(rutaNueva('/panel/asistente', residente), '/panel/proyectos/o1/asistente');
  assert.equal(rutaNueva('/panel/cantera', { rol: 'encargado_planta', obraId: null }), '/panel/proyectos');

  // El laboratorista, a Geolab.
  assert.equal(rutaNueva('/panel/laboratorio', laboratorista), '/panel/geolab/laboratorio');
  assert.equal(rutaNueva('/panel/asistente', laboratorista), '/panel/geolab/asistente');

  // Lo que no es de antes no se toca.
  assert.equal(rutaNueva('/panel', gerencia), null);
  assert.equal(rutaNueva('/panel/occ/vehiculos', gerencia), null);
  assert.equal(rutaNueva('/panel/laboratorio/e1/informe', gerencia), null);
  assert.equal(rutaNueva('/panel/laboratorio/e1', gerencia), null);
  assert.equal(rutaNueva('/panel/desconocido', gerencia), null);
});

/** Un corte de prueba: vigente salvo que se diga, con valores pequeños. */
const corteDe = (fechaCorte: string, saldo: number, extra: Partial<CorteParaRegla> = {}): CorteParaRegla => ({
  fechaCorte,
  saldo,
  cuentasPorPagar: 100,
  cuentasPorCobrar: 50,
  anuladoEn: null,
  ...extra,
});

prueba('033/RF-35, RF-36: el corte no puede ser futuro ni repetir fecha vigente', () => {
  const valores = { saldo: 1000, cuentasPorPagar: 0, cuentasPorCobrar: 0 };
  assert.equal(validarCorte({ ...valores, fechaCorte: '2026-10-27' }, '2026-10-27', []), null);
  assert.equal(
    validarCorte({ ...valores, fechaCorte: '2026-10-28' }, '2026-10-27', []),
    'La fecha de corte no puede ser futura',
  );
  assert.equal(
    validarCorte({ ...valores, fechaCorte: '2026-10-15' }, '2026-10-27', [{ fechaCorte: '2026-10-15' }]),
    'Ya hay un corte del 15-oct-2026; anúlalo para registrar otro',
  );
  // Otra fecha sí; el saldo puede ser negativo; lo que se debe y lo que le deben, no.
  assert.equal(validarCorte({ ...valores, fechaCorte: '2026-10-16' }, '2026-10-27', [{ fechaCorte: '2026-10-15' }]), null);
  assert.equal(validarCorte({ ...valores, saldo: -5, fechaCorte: '2026-10-16' }, '2026-10-27', []), null);
  assert.equal(
    validarCorte({ ...valores, cuentasPorPagar: -1, fechaCorte: '2026-10-16' }, '2026-10-27', []),
    'Las cuentas por pagar no pueden ser negativas',
  );
  assert.equal(
    validarCorte({ ...valores, cuentasPorCobrar: -1, fechaCorte: '2026-10-16' }, '2026-10-27', []),
    'Las cuentas por cobrar no pueden ser negativas',
  );
  assert.equal(fechaDelCorte('2026-01-05'), '5-ene-2026');
});

prueba('033/RF-37, RF-38: el último vigente y su diferencia con el anterior, sin los anulados', () => {
  const cortes = [
    corteDe('2026-09-30', 1000),
    corteDe('2026-10-20', 1500, { cuentasPorPagar: 80 }),
    // Anulado: no es el último aunque sea el más reciente, ni cuenta como anterior.
    corteDe('2026-10-25', 9999, { anuladoEn: '2026-10-26T10:00:00Z' }),
  ];
  assert.equal(ultimoCorte(cortes)?.fechaCorte, '2026-10-20');
  assert.deepEqual(diferenciaConElAnterior(cortes), { saldo: 500, cuentasPorPagar: -20, cuentasPorCobrar: 0 });
  // Con uno solo no hay diferencia; sin ninguno, ni último.
  assert.equal(diferenciaConElAnterior([corteDe('2026-10-20', 1)]), null);
  assert.equal(ultimoCorte([]), null);
  assert.equal(ultimoCorte([corteDe('2026-10-20', 1, { anuladoEn: 'x' })]), null);
});

prueba('033/RF-43: desactualizado con más de 30 días', () => {
  assert.equal(estaDesactualizado('2026-09-27', '2026-10-27'), false); // 30 días
  assert.ok(estaDesactualizado('2026-09-26', '2026-10-27')); // 31 días
  assert.equal(estaDesactualizado('2026-10-27', '2026-10-27'), false);
});

prueba('033/RF-41, RF-42: el consolidado, una fila por empresa y por obra y el total sin Proyectos', () => {
  const r = consolidado(
    {
      empresas: [
        { id: 'elemental', nombre: 'Elemental', cortes: [corteDe('2026-10-20', 1000)] },
        { id: 'occ', nombre: 'OCC', cortes: [corteDe('2026-09-01', 2000)] },
        { id: 'geolab', nombre: 'Geolab', cortes: [] },
      ],
      obras: [
        { id: 'o1', nombre: 'Consorcio Magdalena', dadaDeBaja: false, cortes: [corteDe('2026-10-25', 300)] },
        { id: 'o2', nombre: 'Consorcio Alcaraván', dadaDeBaja: false, cortes: [] },
        // De baja con corte: sigue en el consolidado (caso límite); sin corte, no.
        { id: 'o3', nombre: 'Vieja con corte', dadaDeBaja: true, cortes: [corteDe('2026-10-01', 7)] },
        { id: 'o4', nombre: 'Vieja sin corte', dadaDeBaja: true, cortes: [] },
      ],
    },
    '2026-10-27',
  );
  assert.deepEqual(
    r.filas.map((f) => [f.tipo, f.id, f.corte?.fechaCorte ?? null, f.desactualizado]),
    [
      ['empresa', 'elemental', '2026-10-20', false],
      ['empresa', 'occ', '2026-09-01', true],
      ['empresa', 'geolab', null, false],
      ['obra', 'o1', '2026-10-25', false],
      ['obra', 'o2', null, false],
      ['obra', 'o3', '2026-10-01', false],
    ],
  );
  assert.deepEqual(r.total, { saldo: 3307, cuentasPorPagar: 400, cuentasPorCobrar: 200 });
  assert.equal(r.conCorte, 4);
});

prueba('033/RF-2, RF-3: la tarjeta de Proyectos suma el saldo de sus obras, a la fecha del más antiguo', () => {
  assert.deepEqual(
    resumenDeProyectos([
      { cortes: [corteDe('2026-10-25', 300), corteDe('2026-10-01', 1)] },
      { cortes: [corteDe('2026-10-10', -100)] },
      { cortes: [] },
    ]),
    { saldo: 200, fechaCorte: '2026-10-10' },
  );
  assert.equal(resumenDeProyectos([{ cortes: [] }]), null);
});

prueba('033/RNF: los valores en pesos, con punto de miles', () => {
  assert.equal(enPesos(1234567), '$ 1.234.567');
  assert.equal(enPesos(-1234567), '-$ 1.234.567');
  assert.equal(enPesos(0), '$ 0');
});

prueba('033/RF-23, RF-24: OCC ve los reportes de vehículos y maquinaria; una obra, todos', () => {
  assert.deepEqual(categoriasDeWhatsappDe('occ'), ['vehiculo_maquinaria', 'suministro_cantera']);
  // Todas son categorías que existen: un nombre mal escrito dejaría la bandeja vacía.
  for (const c of categoriasDeWhatsappDe('occ')!) assert.ok(CATEGORIAS_DE_WHATSAPP.includes(c), c);
  assert.equal(categoriasDeWhatsappDe('proyectos'), null);
  assert.equal(categoriasDeWhatsappDe(null), null);
});

prueba('033/RF-30: desde una obra, el asistente responde sobre ella si no nombra otra', () => {
  assert.equal(
    indicacionDeObraPorDefecto({ id: 'o1', nombre: 'Consorcio Magdalena' }),
    'Pregunta desde la obra «Consorcio Magdalena» (id o1). Si la pregunta no nombra otra obra, responda sobre esta y consulte con su id.',
  );
  // Fuera de una obra no se dice nada: el contexto queda como antes.
  assert.equal(indicacionDeObraPorDefecto(null), '');
});

prueba('033/RF-10, RF-19: la dirección dice en qué empresa, obra y página se está', () => {
  assert.deepEqual(lugarDeLaRuta('/panel/occ/vehiculos'), { tipo: 'empresa', empresa: 'occ', pagina: 'vehiculos' });
  assert.deepEqual(lugarDeLaRuta('/panel/geolab'), { tipo: 'empresa', empresa: 'geolab', pagina: null });
  assert.deepEqual(lugarDeLaRuta('/panel/elemental/consolidado/'), { tipo: 'empresa', empresa: 'elemental', pagina: 'consolidado' });
  assert.deepEqual(lugarDeLaRuta('/panel/proyectos'), { tipo: 'proyectos' });
  assert.deepEqual(lugarDeLaRuta('/panel/proyectos?ir=bitacoras'), { tipo: 'proyectos' });
  assert.deepEqual(lugarDeLaRuta('/panel/proyectos/o%201/bitacoras?fecha=2026-10-08'), { tipo: 'obra', obraId: 'o 1', pagina: 'bitacoras' });
  assert.deepEqual(lugarDeLaRuta('/panel/proyectos/o1'), { tipo: 'obra', obraId: 'o1', pagina: null });
  // Fuera de una empresa: la portada, las direcciones de antes y el ensayo de laboratorio.
  assert.equal(lugarDeLaRuta('/panel'), null);
  assert.equal(lugarDeLaRuta('/panel/bitacoras'), null);
  assert.equal(lugarDeLaRuta('/panel/laboratorio/e1'), null);
  assert.equal(lugarDeLaRuta('/'), null);
  assert.equal(empresaDelLugar(lugarDeLaRuta('/panel/proyectos/o1/almacen')), 'proyectos');
  assert.equal(empresaDelLugar(lugarDeLaRuta('/panel/occ')), 'occ');
  assert.equal(empresaDelLugar(null), null);
});

prueba('033/RF-10, RF-11, RF-18, RF-20: el menú lateral de cada lugar', () => {
  const titulos = (m: { titulo: string }[]) => m.map((e) => e.titulo);
  // En las tarjetas, la gerencia ve las cuatro empresas; los demás no llegan ahí.
  assert.deepEqual(titulos(menuDelLugar(null, 'admin').entradas), [
    'Elemental Ingeniería y Arquitectura', 'OCC', 'Geolab', 'Proyectos',
  ]);
  assert.deepEqual(menuDelLugar(null, 'supervisor'), { navegacion: [], entradas: [] });

  // Dentro de una empresa: «← Empresas» y su menú, con sus rutas.
  const occ = menuDelLugar({ tipo: 'empresa', empresa: 'occ', pagina: 'vehiculos' }, 'admin');
  assert.deepEqual(occ.navegacion, [{ clave: 'empresas', titulo: '← Empresas', ruta: '/panel' }]);
  assert.equal(occ.entradas.length, 11);
  assert.deepEqual(occ.entradas[7], { clave: 'asignaciones', titulo: 'Asignaciones', ruta: '/panel/occ/asignaciones' });

  // El laboratorista en Geolab: sin «← Empresas», que no tiene a dónde ir.
  const geolab = menuDelLugar({ tipo: 'empresa', empresa: 'geolab', pagina: null }, 'laboratorista');
  assert.deepEqual(geolab.navegacion, []);
  assert.deepEqual(titulos(geolab.entradas), [
    'Laboratorio', 'Documentos', 'Recursos Humanos', 'Solicitudes de compra', 'Solicitudes de pago', 'Asistente',
  ]);

  // En una obra: «Cambiar de obra» para la gerencia, y sin los módulos apagados.
  const obra = menuDelLugar({ tipo: 'obra', obraId: 'o1', pagina: 'bitacoras' }, 'admin', {
    almacen: false, cantera: true, laboratorio: false,
  });
  assert.deepEqual(titulos(obra.navegacion), ['← Empresas', 'Cambiar de obra']);
  assert.equal(obra.navegacion[1].ruta, '/panel/proyectos');
  assert.ok(!obra.entradas.some((e) => e.clave === 'almacen' || e.clave === 'calidad'));
  assert.equal(obra.entradas.find((e) => e.clave === 'bitacoras')?.ruta, '/panel/proyectos/o1/bitacoras');
  // El residente en su obra: su menú, sin ir y venir.
  assert.deepEqual(menuDelLugar({ tipo: 'obra', obraId: 'o1', pagina: null }, 'supervisor').navegacion, []);
  // La lista de obras: solo volver.
  assert.deepEqual(menuDelLugar({ tipo: 'proyectos' }, 'admin').entradas, []);

  // Con la persona, donde no entra el menú sale vacío (RF-12; visto en la demo de la T22).
  const laResidente = { rol: 'supervisor' as const, obraId: 'o1' };
  const enOcc = { tipo: 'empresa' as const, empresa: 'occ' as const, pagina: null };
  assert.deepEqual(menuDelLugar(enOcc, laResidente).entradas, []);
  assert.deepEqual(menuDelLugar({ tipo: 'obra', obraId: 'o9', pagina: null }, laResidente).entradas, []);
  assert.ok(menuDelLugar({ tipo: 'obra', obraId: 'o1', pagina: null }, laResidente).entradas.length > 0);
  assert.deepEqual(menuDelLugar({ tipo: 'obra', obraId: 'o1', pagina: null }, { rol: 'laboratorista', obraId: 'o1' }).entradas, []);
  assert.ok(menuDelLugar(enOcc, { rol: 'admin', obraId: null }).entradas.length > 0);
  assert.ok(menuDelLugar({ tipo: 'empresa', empresa: 'geolab', pagina: null }, { rol: 'laboratorista', obraId: 'o1' }).entradas.length > 0);
});

prueba('033/RF-48: el título de la pestaña dice el módulo y la empresa', () => {
  assert.equal(tituloDelLugar(lugarDeLaRuta('/panel/occ/vehiculos')), 'Vehículos · OCC');
  assert.equal(tituloDelLugar(lugarDeLaRuta('/panel/geolab/reportes')), 'Reportes de laboratorio · Geolab');
  assert.equal(tituloDelLugar(lugarDeLaRuta('/panel/elemental')), 'Elemental Ingeniería y Arquitectura');
  assert.equal(tituloDelLugar(lugarDeLaRuta('/panel/proyectos/o1/bitacoras')), 'Bitácoras · Proyectos');
  assert.equal(tituloDelLugar(lugarDeLaRuta('/panel/proyectos/o1')), 'Resumen del día · Proyectos');
  assert.equal(tituloDelLugar(lugarDeLaRuta('/panel/proyectos')), 'Proyectos');
  assert.equal(tituloDelLugar(null), null);
  // Tal cual lo pide la spec, sin el nombre del sistema: la empresa ya dice dónde se está.
  assert.equal(tituloDeLaPestana('/panel/occ/vehiculos'), 'Vehículos · OCC');
  // Las de antes, que redirigen, y el ensayo siguen como siempre.
  assert.equal(tituloDeLaPestana('/panel/obras'), 'Obras · Control de Obra OCC');
});

prueba('033/RF-34: lo que se escribe en un campo de pesos', () => {
  assert.equal(pesosDeTexto('1.534.500.000'), 1_534_500_000);
  assert.equal(pesosDeTexto('$ 1534500000'), 1_534_500_000);
  assert.equal(pesosDeTexto(' -45.000.000 '), -45_000_000);
  assert.equal(pesosDeTexto('0'), 0);
  // Vacío, con decimales o con letras no es un valor.
  assert.equal(pesosDeTexto(''), null);
  assert.equal(pesosDeTexto('1500,50'), null);
  assert.equal(pesosDeTexto('mil'), null);
  assert.equal(pesosDeTexto('-'), null);
});

prueba('033/RF-38: la diferencia se lee con su signo', () => {
  assert.equal(textoDeDiferencia(500_000), '+$ 500.000');
  assert.equal(textoDeDiferencia(-20_000), '-$ 20.000');
  assert.equal(textoDeDiferencia(0), 'Sin cambio');
});

prueba('033/RF-25, RF-27: Reportes muestra en cada empresa solo sus pestañas', () => {
  assert.deepEqual(pestanasDeReportes('occ'), ['maquinas', 'mantenimiento']);
  assert.deepEqual(pestanasDeReportes('geolab'), ['calidad']);
  // Dentro de una obra (Proyectos), todas.
  assert.equal(pestanasDeReportes('proyectos'), null);
  assert.equal(pestanasDeReportes(null), null);
});

prueba('034/RF-18 a RF-23: las clases de documento de cada lugar', () => {
  const ids = (lugar: LugarDeDocumentos) => clasesDe(lugar).map((c) => c.id);
  const lugares: LugarDeDocumentos[] = ['elemental', 'occ', 'geolab', 'obra'];
  for (const lugar of lugares) {
    // Proveedores en los cuatro, y «Otro» siempre al final.
    assert.ok(ids(lugar).includes('proveedores'), lugar);
    assert.equal(ids(lugar).at(-1), 'otro', lugar);
    // Sin repetidos: el slug es la llave.
    assert.equal(new Set(ids(lugar)).size, ids(lugar).length, lugar);
  }
  // Las comunes en las tres empresas y no en la obra.
  for (const lugar of ['elemental', 'occ', 'geolab'] as const) assert.ok(esClaseDe(lugar, 'camara_de_comercio'));
  assert.ok(!esClaseDe('obra', 'camara_de_comercio'));
  // Las propias, solo en su lugar.
  assert.deepEqual(lugares.filter((l) => esClaseDe(l, 'rup')), ['elemental']);
  assert.deepEqual(lugares.filter((l) => esClaseDe(l, 'fichas_tecnicas')), ['occ']);
  assert.deepEqual(lugares.filter((l) => esClaseDe(l, 'calibracion')), ['geolab']);
  assert.deepEqual(lugares.filter((l) => esClaseDe(l, 'planos')), ['obra']);
  // El nombre se congela con el documento; una clase de otro lugar no tiene nombre ahí.
  assert.equal(nombreDeClase('geolab', 'calibracion'), 'Certificados de calibración');
  assert.equal(nombreDeClase('obra', 'proveedores'), 'Información de proveedores');
  assert.equal(nombreDeClase('occ', 'planos'), null);
  assert.equal(nombreDeClase('occ', 'no-existe'), null);
});

prueba('034/RF-25 a RF-28: el tipo real y el tamaño del archivo', () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(12).fill(0)].slice(0, 12));
  const pdf = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31);
  const jpg = bytes(0xff, 0xd8, 0xff, 0xe0);
  const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  const webp = bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50);
  const zip = bytes(0x50, 0x4b, 0x03, 0x04);
  const ole = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
  const exe = bytes(0x4d, 0x5a, 0x90, 0x00); // MZ: un ejecutable de Windows
  assert.equal(tipoPorFirma(pdf), 'pdf');
  assert.equal(tipoPorFirma(webp), 'webp');
  assert.equal(tipoPorFirma(exe), null);
  // Un RIFF que no es WEBP (un .wav) no pasa por imagen.
  assert.equal(tipoPorFirma(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45)), null);
  assert.equal(extensionDe('Ficha.Técnica.PDF'), 'pdf');
  assert.equal(extensionDe('sin-extension'), '');

  // Los admitidos, con el tipo que se guarda.
  const aceptados: [string, Uint8Array, string][] = [
    ['a.pdf', pdf, 'application/pdf'],
    ['a.JPG', jpg, 'image/jpeg'],
    ['a.jpeg', jpg, 'image/jpeg'],
    ['a.png', png, 'image/png'],
    ['a.webp', webp, 'image/webp'],
    ['a.docx', zip, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['a.xlsx', zip, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['a.doc', ole, 'application/msword'],
    ['a.xls', ole, 'application/vnd.ms-excel'],
  ];
  for (const [nombre, cabecera, mime] of aceptados) {
    assert.deepEqual(revisarDocumento(nombre, 1000, cabecera), { ok: true, mime }, nombre);
  }

  // Un ejecutable renombrado: la extensión dice PDF, los bytes no.
  const renombrado = revisarDocumento('cotizacion.pdf', 1000, exe);
  assert.ok(!renombrado.ok && renombrado.estado === 415 && renombrado.mensaje.includes('dice ser .pdf'));
  // Un Word nuevo con nombre de Excel viejo tampoco: la firma es de otra familia.
  assert.equal(revisarDocumento('a.xls', 1000, zip).ok, false);
  // Tipos no admitidos, con el mensaje de los que sí.
  for (const nombre of ['notas.txt', 'programa.exe', 'sin-extension', 'a.constructor']) {
    const r = revisarDocumento(nombre, 1000, pdf);
    assert.ok(!r.ok && r.estado === 415 && r.mensaje.startsWith('Solo se admiten'), nombre);
  }
  // Vacío y tamaño: 20 MB justos pasan, uno más no.
  const vacio = revisarDocumento('a.pdf', 0, new Uint8Array());
  assert.ok(!vacio.ok && vacio.estado === 422);
  assert.equal(revisarDocumento('a.pdf', TAMANO_MAXIMO_DE_DOCUMENTO, pdf).ok, true);
  const grande = revisarDocumento('a.pdf', TAMANO_MAXIMO_DE_DOCUMENTO + 1, pdf);
  assert.ok(!grande.ok && grande.estado === 413);
});

prueba('034/RF-24, RF-29: lo que le falta a un documento antes de guardarlo', () => {
  const bien = { clase: 'rut', nombre: 'RUT 2026', fecha: '2026-10-01', vence: null };
  assert.deepEqual(faltasDelDocumento('occ', bien), []);
  assert.deepEqual(faltasDelDocumento('occ', { ...bien, clase: '' }), ['Elija la clase del documento.']);
  // Una clase de otro lugar: los planos son de la obra.
  assert.deepEqual(faltasDelDocumento('occ', { ...bien, clase: 'planos' }), ['Esa clase no es de este lugar.']);
  assert.deepEqual(faltasDelDocumento('occ', { ...bien, nombre: '   ' }), ['Escriba el nombre del documento.']);
  assert.deepEqual(faltasDelDocumento('occ', { ...bien, fecha: '' }), ['Escriba la fecha del documento.']);
  assert.deepEqual(faltasDelDocumento('occ', { ...bien, fecha: '2026-02-30' }), ['Escriba la fecha del documento.']);
  // El vencimiento: el mismo día vale; antes, no.
  assert.deepEqual(faltasDelDocumento('occ', { ...bien, vence: '2026-10-01' }), []);
  assert.deepEqual(faltasDelDocumento('occ', { ...bien, vence: '2026-09-30' }), [
    'El vencimiento no puede ser antes de la fecha del documento.',
  ]);
  assert.deepEqual(faltasDelDocumento('occ', { ...bien, vence: '30/10/2026' }), ['La fecha de vencimiento no es válida.']);
  // Todo vacío: las faltas en el orden del formulario.
  assert.equal(faltasDelDocumento('obra', { clase: '', nombre: '', fecha: '', vence: null }).length, 3);
});

prueba('034/RF-38 a RF-42: el aviso de vencimiento y el resumen', () => {
  const hoy = '2026-10-28';
  const vigente = { anulado: false };
  assert.equal(estadoDelVencimiento({ ...vigente, vence: null }, hoy), null);
  // A 30 días avisa; a 31, no.
  assert.deepEqual(estadoDelVencimiento({ ...vigente, vence: '2026-11-27' }, hoy), {
    estado: 'por_vencer',
    texto: 'Vence en 30 días',
    detalle: 'Vence el 2026-11-27',
  });
  assert.equal(estadoDelVencimiento({ ...vigente, vence: '2026-11-28' }, hoy), null);
  assert.equal(estadoDelVencimiento({ ...vigente, vence: hoy }, hoy)?.texto, 'Vence hoy');
  assert.deepEqual(estadoDelVencimiento({ ...vigente, vence: '2026-10-25' }, hoy), {
    estado: 'vencido',
    texto: 'Vencido',
    detalle: 'Venció hace 3 días',
  });
  // Anulado: sin aviso aunque esté vencido.
  assert.equal(estadoDelVencimiento({ anulado: true, vence: '2026-10-25' }, hoy), null);

  assert.deepEqual(
    resumenDeVencimientos(
      [
        { anulado: false, vence: '2026-10-25' },
        { anulado: false, vence: '2026-11-01' },
        { anulado: false, vence: '2026-11-02' },
        { anulado: false, vence: '2027-01-01' },
        { anulado: false, vence: null },
        { anulado: true, vence: '2026-10-01' },
      ],
      hoy,
    ),
    { vencidos: 1, porVencer: 2 },
  );
  assert.deepEqual(resumenDeVencimientos([], hoy), { vencidos: 0, porVencer: 0 });
});

prueba('034/RF-34: buscar sin mayúsculas ni tildes, en los cuatro campos', () => {
  const doc = {
    nombre: 'Cámara de comercio octubre',
    proveedor: 'Ferretería El Tornillo',
    descripcion: 'Renovación anual',
    nombreArchivo: 'CCB-2026.pdf',
  };
  assert.ok(coincideBusqueda(doc, 'camara'));
  assert.ok(coincideBusqueda(doc, '  FERRETERIA '));
  assert.ok(coincideBusqueda(doc, 'renovacion'));
  assert.ok(coincideBusqueda(doc, 'ccb-2026'));
  assert.ok(coincideBusqueda(doc, ''));
  assert.ok(!coincideBusqueda(doc, 'póliza'));
});

prueba('034/RF-12 a RF-17: el Encargado de OCC entra a OCC y solo a OCC', () => {
  const encargado = { rol: 'encargado_occ' as const, obraId: null };
  // RF-14: sin tarjetas, directo a OCC; ninguna otra empresa ni obra.
  assert.equal(destinoAlEntrar({ rol: 'encargado_occ', obras: [] }), '/panel/occ');
  assert.ok(alcanzaLaEmpresa('encargado_occ', 'occ'));
  for (const empresa of ['elemental', 'geolab', 'proyectos'] as const) {
    assert.equal(alcanzaLaEmpresa('encargado_occ', empresa), false, empresa);
  }
  assert.equal(alcanzaLaObraDeLaRuta(encargado, 'o1'), false);
  // RF-15: el menú de OCC completo, sin «← Empresas».
  const menu = menuDelLugar({ tipo: 'empresa', empresa: 'occ', pagina: null }, 'encargado_occ');
  assert.deepEqual(menu.navegacion, []);
  assert.deepEqual(
    menu.entradas.map((m) => m.titulo),
    menuDeEmpresa('occ', 'admin').map((m) => m.titulo),
  );
  // Once desde la spec 035: Recursos Humanos de consulta (RF-3).
  assert.equal(menu.entradas.length, 11);
  // RF-16: lo de la gerencia en OCC, menos anular documentos y aprobar compras o pagos.
  assert.ok(alcanza('encargado_occ', 'vehiculos', 'escribir'));
  assert.ok(alcanza('encargado_occ', 'asignaciones', 'escribir'));
  assert.ok(alcanza('encargado_occ', 'preoperacionales', 'anular'));
  assert.ok(alcanza('encargado_occ', 'reportes', 'escribir'));
  assert.ok(alcanza('encargado_occ', 'documentos', 'escribir'));
  assert.ok(alcanza('encargado_occ', 'solicitudes', 'escribir'));
  assert.equal(alcanza('encargado_occ', 'documentos', 'anular'), false);
  assert.equal(alcanza('encargado_occ', 'compras', 'aprobar'), false);
  assert.equal(alcanza('encargado_occ', 'tesoreria', 'aprobar'), false);
  // La bitácora y WhatsApp de OCC se consultan: se corrigen y se aprueban en la obra.
  assert.ok(alcanza('encargado_occ', 'bitacoras', 'listar'));
  for (const accion of ['escribir', 'anular'] as const) {
    assert.equal(alcanza('encargado_occ', 'bitacoras', accion), false, accion);
  }
  for (const accion of ['escribir', 'aprobar'] as const) {
    assert.equal(alcanza('encargado_occ', 'whatsapp', accion), false, accion);
  }
  // Fuera de OCC, nada; obras y personas solo para llenar sus selectores.
  // Recursos Humanos sí: consulta el personal de OCC desde la spec 035 (RF-4).
  for (const modulo of ['inicio', 'almacen', 'cantera', 'laboratorio', 'contrato', 'empresa', 'finanzas'] as const) {
    assert.equal(alcanza('encargado_occ', modulo, 'ver'), false, modulo);
  }
  assert.ok(alcanza('encargado_occ', 'obras', 'listar') && !alcanza('encargado_occ', 'obras', 'ver'));
  assert.ok(alcanza('encargado_occ', 'personas', 'listar') && !alcanza('encargado_occ', 'personas', 'escribir'));
  // RF-12, RF-13: el cargo, su empresa, y que solo la gerencia da ese acceso.
  assert.equal(cargoPorId('encargado_occ')?.rolSugerido, 'encargado_occ');
  assert.equal(cargoPorId('encargado_occ')?.operaVehiculos, false);
  assert.equal(empresaDeLaPersona(null, 'encargado_occ'), 'occ');
  assert.ok(puedeCambiarRol('admin', 'encargado_occ'));
  assert.equal(puedeCambiarRol('supervisor', 'encargado_occ'), false);
  // El asistente: todas las obras, con los módulos de OCC que alcanza.
  const alcance = alcanceDelAsistente({ ...encargado, modulosDeObra: TODOS_LOS_MODULOS });
  assert.equal(alcance.obras, 'todas');
  assert.deepEqual(alcance.modulos, ['bitacoras', 'preoperacionales', 'whatsapp', 'reportes', 'vehiculos']);
  // Las direcciones de antes lo llevan a OCC, nunca a una obra.
  assert.equal(rutaNueva('/panel/preoperacionales', encargado), '/panel/occ/preoperacionales');
  assert.equal(rutaNueva('/panel/bitacoras?obraId=o1', encargado), '/panel/occ');
});

prueba('034/RF-2, RF-4 a RF-10: quién ve Documentos y dónde', () => {
  // RF-2: en la obra, después de Contrato y Presupuesto.
  const deObra = menuDeObra('admin').map((m) => m.pagina);
  assert.equal(deObra.indexOf('documentos'), deObra.indexOf('contrato') + 1);
  // No tiene interruptor por obra: con todo apagado sigue.
  assert.ok(
    menuDeObra('supervisor', { almacen: false, cantera: false, laboratorio: false }).some((m) => m.pagina === 'documentos'),
  );
  // RF-4 a RF-8: ven y suben gerencia, residente, laboratorista y Encargado de OCC; desde la
  // spec 035, también la auxiliar de RR. HH. en los de Elemental (035/RF-10). Nadie más.
  assert.deepEqual(
    ROLES.filter((r) => alcanza(r, 'documentos', 'ver')),
    ['admin', 'supervisor', 'laboratorista', 'encargado_occ', 'auxiliar_rrhh'],
  );
  assert.deepEqual(
    ROLES.filter((r) => alcanza(r, 'documentos', 'escribir')),
    ['admin', 'supervisor', 'laboratorista', 'encargado_occ', 'auxiliar_rrhh'],
  );
  // RF-10: anula solo la gerencia.
  assert.deepEqual(ROLES.filter((r) => alcanza(r, 'documentos', 'anular')), ['admin']);
  const tiene = (menu: { pagina: string }[]) => menu.some((m) => m.pagina === 'documentos');
  // RF-5: el residente, en su obra.
  assert.ok(tiene(menuDeObra('supervisor')));
  // RF-6, RF-7: cada uno en su empresa, y a las demás no entra.
  assert.ok(tiene(menuDeEmpresa('geolab', 'laboratorista')));
  assert.ok(tiene(menuDeEmpresa('occ', 'encargado_occ')));
  assert.equal(alcanzaLaEmpresa('laboratorista', 'occ'), false);
  assert.equal(alcanzaLaEmpresa('supervisor', 'occ'), false);
  // RF-4: la gerencia, en las tres empresas y en la obra.
  for (const empresa of ['elemental', 'occ', 'geolab'] as const) assert.ok(tiene(menuDeEmpresa(empresa, 'admin')), empresa);
  // RF-8: operador, almacenista y encargado de planta, en ningún lado.
  for (const rol of ['operador', 'almacenista', 'encargado_planta'] as const) {
    assert.ok(!tiene(menuDeObra(rol)), rol);
  }
});

prueba('034/RF-16, RF-50, RF-51: el Encargado de OCC ve todas las obras, solo en sus módulos', () => {
  const encargado = sesionDe('encargado_occ', null);
  // Todas las obras: sin filtro, y alcanza cualquiera.
  assert.equal(filtroDeObra(encargado, vehiculos.obraId), undefined);
  assert.ok(alcanzaLaObra(encargado, 'obra-a') && alcanzaLaObra(encargado, 'obra-b'));
  // Sin obra no es «cuenta a medio configurar»: no se le avisa que le falta obra.
  assert.equal(sinObraAsignada('encargado_occ', null), false);
  // Las fotos: las de preoperacionales y bitácoras sí; el contrato y los documentos sueltos no.
  const deObra = { existe: true, obraId: 'obra-b' };
  assert.ok(alcanzaLaImagen(encargado, deObra, 'preoperacionales'));
  assert.ok(alcanzaLaImagen(encargado, deObra, 'bitacoras'));
  assert.equal(alcanzaLaImagen(encargado, deObra, 'contrato'), false);
  assert.equal(alcanzaLaImagen(encargado, deObra, null), false);
  assert.equal(alcanzaLaImagen(encargado, deObra), false);
  // Lo huérfano sigue siendo solo de la gerencia.
  assert.equal(alcanzaLaImagen(encargado, { existe: false, obraId: null }, 'bitacoras'), false);
  assert.ok(alcanzaLaImagen(sesionDe('admin', null), { existe: true, obraId: 'obra-b' }, 'contrato'));
  // Nada cambia para el residente: su obra, con o sin módulo.
  const residente = sesionDe('supervisor', 'obra-a');
  assert.ok(alcanzaLaImagen(residente, { existe: true, obraId: 'obra-a' }, 'contrato'));
  assert.equal(alcanzaLaImagen(residente, deObra, 'bitacoras'), false);
  // La cerradura de los módulos sigue en la tabla: fuera de OCC recibe 403.
  for (const modulo of ['obras', 'personas', 'contrato', 'almacen', 'laboratorio'] as const) {
    assert.equal(alcanza('encargado_occ', modulo, 'escribir'), false, modulo);
  }
  for (const modulo of ['compras', 'tesoreria'] as const) {
    assert.equal(alcanza('encargado_occ', modulo, 'ver'), false, modulo);
  }
});

prueba('034/RF-13, RF-14: el Encargado de OCC es de OCC y no lleva obra', () => {
  assert.equal(reparoDelAccesoSinObra({ rol: 'encargado_occ', obraId: null, empresa: 'occ' }), null);
  // Sin empresa todavía: el servidor le pone OCC.
  assert.equal(reparoDelAccesoSinObra({ rol: 'encargado_occ', obraId: null, empresa: null }), null);
  assert.equal(reparoDelAccesoSinObra({ rol: 'encargado_occ', obraId: 'o1', empresa: 'occ' })?.campo, 'obraId');
  assert.equal(reparoDelAccesoSinObra({ rol: 'encargado_occ', obraId: null, empresa: 'geolab' })?.campo, 'empresa');
  // Los demás roles, sin reparo: un residente con obra y de Proyectos sigue igual.
  assert.equal(reparoDelAccesoSinObra({ rol: 'supervisor', obraId: 'o1', empresa: 'proyectos' }), null);
  assert.equal(reparoDelAccesoSinObra({ rol: 'operador', obraId: 'o1', empresa: 'occ' }), null);
});

prueba('035/RF-8: la auxiliar de RR. HH. es de Elemental y no lleva obra', () => {
  assert.equal(empresaDelAccesoSinObra('auxiliar_rrhh'), 'elemental');
  assert.equal(empresaDelAccesoSinObra('encargado_occ'), 'occ');
  assert.equal(empresaDelAccesoSinObra('supervisor'), null);
  assert.equal(reparoDelAccesoSinObra({ rol: 'auxiliar_rrhh', obraId: null, empresa: 'elemental' }), null);
  assert.equal(reparoDelAccesoSinObra({ rol: 'auxiliar_rrhh', obraId: null, empresa: null }), null);
  const conObra = reparoDelAccesoSinObra({ rol: 'auxiliar_rrhh', obraId: 'o1', empresa: 'elemental' });
  assert.equal(conObra?.campo, 'obraId');
  assert.match(conObra?.mensaje ?? '', /no lleva obra/);
  assert.deepEqual(reparoDelAccesoSinObra({ rol: 'auxiliar_rrhh', obraId: null, empresa: 'occ' }), {
    campo: 'empresa',
    mensaje: 'La auxiliar de Recursos Humanos es de Elemental.',
  });
});

prueba('035/RF-11: el selector de Acceso ofrece solo lo que cada rol puede dar', () => {
  assert.deepEqual(rolesQuePuedeDar('auxiliar_rrhh'), ['operador']);
  assert.deepEqual(rolesQuePuedeDar('admin'), [...ROLES]);
  assert.deepEqual(rolesQuePuedeDar('supervisor'), ['supervisor', 'operador']);
  for (const rol of ['operador', 'almacenista', 'encargado_planta', 'laboratorista', 'encargado_occ'] as const) {
    assert.deepEqual(rolesQuePuedeDar(rol), [], rol);
  }
});

prueba('035/RF-8 a RF-11: la auxiliar de RR. HH. entra a Elemental y solo a Elemental', () => {
  const auxiliar = { rol: 'auxiliar_rrhh' as const, obraId: null };
  // RF-9: directo a su Recursos Humanos, sin tarjetas.
  assert.equal(destinoAlEntrar({ rol: 'auxiliar_rrhh', obras: [] }), '/panel/elemental/recursos-humanos');
  assert.ok(alcanzaLaEmpresa('auxiliar_rrhh', 'elemental'));
  for (const empresa of ['occ', 'geolab', 'proyectos'] as const) {
    assert.equal(alcanzaLaEmpresa('auxiliar_rrhh', empresa), false, empresa);
  }
  assert.equal(alcanzaLaObraDeLaRuta(auxiliar, 'o1'), false);
  // RF-10: el menú de Elemental sin el Asistente, y sin «← Empresas».
  const menu = menuDelLugar({ tipo: 'empresa', empresa: 'elemental', pagina: null }, 'auxiliar_rrhh');
  assert.deepEqual(menu.navegacion, []);
  assert.deepEqual(
    menu.entradas.map((m) => m.clave),
    ['recursos-humanos', 'compras', 'tesoreria', 'documentos', 'licitaciones'],
  );
  // Recursos Humanos entero; las pestañas Personas (escribe) y Obras (consulta).
  for (const accion of ['ver', 'listar', 'escribir', 'anular'] as const) assert.ok(alcanza('auxiliar_rrhh', 'rrhh', accion), accion);
  assert.ok(alcanza('auxiliar_rrhh', 'personas', 'escribir') && !alcanza('auxiliar_rrhh', 'personas', 'activar'));
  assert.ok(alcanza('auxiliar_rrhh', 'obras', 'ver') && !alcanza('auxiliar_rrhh', 'obras', 'escribir'));
  // Documentos de Elemental: sube, no anula (034/RF-10).
  assert.ok(alcanza('auxiliar_rrhh', 'documentos', 'escribir') && !alcanza('auxiliar_rrhh', 'documentos', 'anular'));
  // Compras y Tesorería las ve; aprobar es de la gerencia.
  assert.ok(alcanza('auxiliar_rrhh', 'compras', 'ver') && !alcanza('auxiliar_rrhh', 'compras', 'aprobar'));
  assert.ok(alcanza('auxiliar_rrhh', 'tesoreria', 'ver') && !alcanza('auxiliar_rrhh', 'tesoreria', 'aprobar'));
  // Nada de las obras ni el Asistente.
  for (const modulo of ['bitacoras', 'preoperacionales', 'contrato', 'almacen', 'laboratorio', 'whatsapp', 'asistente', 'vehiculos'] as const) {
    assert.equal(alcanza('auxiliar_rrhh', modulo, 'ver'), false, modulo);
  }
  // RF-11: solo da el acceso de operador (una persona sin panel); los demás, la gerencia.
  assert.ok(puedeCambiarRol('auxiliar_rrhh', 'operador'));
  for (const rol of ['admin', 'supervisor', 'auxiliar_rrhh', 'encargado_occ', 'laboratorista'] as const) {
    assert.equal(puedeCambiarRol('auxiliar_rrhh', rol), false, rol);
  }
  assert.ok(puedeCambiarRol('admin', 'auxiliar_rrhh'));
  // RF-8: el cargo y su empresa.
  assert.equal(cargoPorId('auxiliar_rrhh')?.rolSugerido, 'auxiliar_rrhh');
  assert.equal(empresaDeLaPersona(null, 'auxiliar_rrhh'), 'elemental');
  // Lleva el personal de todas las obras: no es una cuenta «sin obra».
  assert.equal(sinObraAsignada('auxiliar_rrhh', null), false);
  // Y las fotos de las obras no las alcanza: no tiene sus módulos.
  assert.equal(alcanzaLaImagen(sesionDe('auxiliar_rrhh', null), { existe: true, obraId: 'o1' }, 'bitacoras'), false);
  // Lo de antes la lleva a su Recursos Humanos, nunca a una obra.
  assert.equal(rutaNueva('/panel/bitacoras?obraId=o1', auxiliar), '/panel/elemental/recursos-humanos');
});

prueba('035/RF-2 a RF-7: quién ve Recursos Humanos y dónde', () => {
  const tiene = (menu: { pagina: string }[]) => menu.some((m) => m.pagina === 'recursos-humanos');
  // RF-3: en OCC y en Geolab, después de Documentos.
  for (const empresa of ['occ', 'geolab'] as const) {
    const paginas = menuDeEmpresa(empresa, 'admin').map((m) => m.pagina);
    assert.equal(paginas.indexOf('recursos-humanos'), paginas.indexOf('documentos') + 1, empresa);
  }
  // RF-2, RF-4, RF-5: Elemental (gerencia y auxiliar), OCC (Encargado), Geolab (laboratorista), obra (residente).
  assert.ok(tiene(menuDeEmpresa('elemental', 'auxiliar_rrhh')));
  assert.ok(tiene(menuDeEmpresa('occ', 'encargado_occ')));
  assert.ok(tiene(menuDeEmpresa('geolab', 'laboratorista')));
  assert.ok(tiene(menuDeObra('supervisor')));
  // Cada uno solo entra a lo suyo (lo decide el lugar, no la fila).
  assert.equal(alcanzaLaEmpresa('encargado_occ', 'geolab'), false);
  assert.equal(alcanzaLaEmpresa('laboratorista', 'occ'), false);
  // RF-6: escriben y anulan solo gerencia y la auxiliar.
  assert.deepEqual(ROLES.filter((r) => alcanza(r, 'rrhh', 'escribir')), ['admin', 'auxiliar_rrhh']);
  assert.deepEqual(ROLES.filter((r) => alcanza(r, 'rrhh', 'anular')), ['admin', 'auxiliar_rrhh']);
  // RF-4, RF-5: los que consultan.
  for (const rol of ['supervisor', 'encargado_occ', 'laboratorista'] as const) {
    assert.ok(alcanza(rol, 'rrhh', 'ver') && alcanza(rol, 'rrhh', 'listar') && !alcanza(rol, 'rrhh', 'escribir'), rol);
  }
  // RF-7: operador, almacenista y encargado de planta, en ningún lado.
  for (const rol of ['operador', 'almacenista', 'encargado_planta'] as const) {
    assert.equal(alcanza(rol, 'rrhh', 'ver'), false, rol);
    assert.ok(!tiene(menuDeObra(rol)), rol);
  }
});

prueba('035/RF-12, RF-16, RF-17: lo que impide guardar una ficha', () => {
  const vacia: DatosDeLaFicha = {
    tipoDocumento: null, fechaNacimiento: null, telefono: null, correo: null, direccion: null, ciudad: null,
    emergenciaNombre: null, emergenciaParentesco: null, emergenciaTelefono: null, fechaIngreso: null,
    tipoContrato: null, finContrato: null, salario: null, eps: null, arl: null, pension: null, caja: null, notas: null,
  };
  // Vacía se guarda: lo que falta es un aviso (RF-26), no un rechazo.
  assert.deepEqual(faltasDeLaFicha(vacia), []);
  const buena = { ...vacia, tipoDocumento: 'cc', fechaIngreso: '2026-01-15', tipoContrato: 'termino_fijo', finContrato: '2026-12-31', salario: 2_500_000, correo: 'ana@ejemplo.co' };
  assert.deepEqual(faltasDeLaFicha(buena), []);
  // RF-16: el fin antes del ingreso; el mismo día vale.
  assert.deepEqual(faltasDeLaFicha({ ...buena, finContrato: '2026-01-14' }), ['El contrato no puede terminar antes de la fecha de ingreso.']);
  assert.deepEqual(faltasDeLaFicha({ ...buena, finContrato: '2026-01-15' }), []);
  // Un indefinido no tiene fecha de terminación.
  assert.deepEqual(faltasDeLaFicha({ ...buena, tipoContrato: 'termino_indefinido' }), [
    'Un contrato de término indefinido no tiene fecha de terminación.',
  ]);
  // RF-17: salario 0, negativo o con decimales.
  for (const salario of [0, -1, 1500000.5]) {
    assert.deepEqual(faltasDeLaFicha({ ...buena, salario }), ['El salario va en pesos, sin decimales y mayor que cero.'], String(salario));
  }
  // Fechas que no existen, correo y tipos que no existen.
  assert.deepEqual(faltasDeLaFicha({ ...vacia, fechaNacimiento: '1990-02-30' }), ['La fecha de nacimiento no es válida.']);
  assert.deepEqual(faltasDeLaFicha({ ...vacia, correo: 'ana@' }), ['El correo no es válido.']);
  assert.deepEqual(faltasDeLaFicha({ ...vacia, tipoDocumento: 'nit' }), ['Ese tipo de documento no existe.']);
  assert.deepEqual(faltasDeLaFicha({ ...vacia, tipoContrato: 'verbal' }), ['Ese tipo de contrato no existe.']);
  assert.equal(nombreDeTipoDeContrato('obra_labor'), 'Obra o labor');
  assert.equal(nombreDeEstadoLaboral('incapacidad'), 'Incapacitado');
});

prueba('035/RF-26: la ficha incompleta, por cada uno de sus cuatro campos', () => {
  const completa = { fechaIngreso: '2026-01-15', tipoContrato: 'termino_fijo', eps: 'Sura', arl: 'Positiva' };
  assert.deepEqual(faltasDeFichaCompleta(completa), []);
  assert.deepEqual(faltasDeFichaCompleta({ ...completa, fechaIngreso: null }), ['fecha de ingreso']);
  assert.deepEqual(faltasDeFichaCompleta({ ...completa, tipoContrato: null }), ['tipo de contrato']);
  assert.deepEqual(faltasDeFichaCompleta({ ...completa, eps: '  ' }), ['EPS']);
  assert.deepEqual(faltasDeFichaCompleta({ ...completa, arl: null }), ['ARL']);
  // Sin ficha (las personas de antes y las de WhatsApp), le falta todo.
  assert.deepEqual(faltasDeFichaCompleta(null), ['fecha de ingreso', 'tipo de contrato', 'EPS', 'ARL']);
});

prueba('035/RF-13: el salario lo ven la gerencia y la auxiliar de RR. HH., y nadie más', () => {
  assert.deepEqual(ROLES.filter(veElSalario), ['admin', 'auxiliar_rrhh']);
});

prueba('035/RF-23: las clases de documento de una persona', () => {
  const ids = clasesDe('persona').map((c) => c.id);
  // Las de RF-23, con «Otro» al final y sin repetidos.
  for (const id of ['hoja_de_vida', 'identidad', 'contrato_laboral', 'afiliacion_eps', 'afiliacion_arl', 'afiliacion_pension',
    'afiliacion_caja', 'estudios', 'cursos', 'examen_medico', 'examen_retiro', 'consentimiento_examen_retiro',
    'licencia_conduccion', 'dotacion', 'liquidacion', 'paz_y_salvo']) {
    assert.ok(ids.includes(id), id);
  }
  assert.equal(ids.at(-1), 'otro');
  assert.equal(new Set(ids).size, ids.length);
  // Ni las comunes de empresa ni las de la obra; y las de la persona solo en la persona.
  assert.ok(!esClaseDe('persona', 'camara_de_comercio') && !esClaseDe('persona', 'planos'));
  for (const lugar of ['elemental', 'occ', 'geolab', 'obra'] as const) {
    assert.equal(esClaseDe(lugar, 'paz_y_salvo'), false, lugar);
  }
  assert.equal(nombreDeClase('persona', 'consentimiento_examen_retiro'), 'Consentimiento de no realizar el examen médico de retiro');
});

prueba('035/RF-19: lo que falta para retirar a una persona', () => {
  const examen = 'Examen médico de retiro, o el consentimiento firmado de no realizarlo';
  // Sin nada, las tres faltas.
  assert.deepEqual(faltasParaRetirar('termino_fijo', []), ['Paz y salvo', 'Liquidación', examen]);
  // Con todo, nada.
  assert.deepEqual(faltasParaRetirar('termino_fijo', ['paz_y_salvo', 'liquidacion', 'examen_retiro']), []);
  // El consentimiento reemplaza al examen.
  assert.deepEqual(faltasParaRetirar('obra_labor', ['paz_y_salvo', 'liquidacion', 'consentimiento_examen_retiro']), []);
  // Prestación de servicios no pide liquidación.
  assert.deepEqual(faltasParaRetirar('prestacion_servicios', ['paz_y_salvo', 'examen_retiro']), []);
  assert.deepEqual(faltasParaRetirar('prestacion_servicios', []), ['Paz y salvo', examen]);
  // Sin tipo de contrato en la ficha, se pide: no se sabe que no la tenga.
  assert.deepEqual(faltasParaRetirar(null, ['paz_y_salvo', 'examen_retiro']), ['Liquidación']);
  // Un examen ocupacional de ingreso no es el de retiro.
  assert.deepEqual(faltasParaRetirar('aprendizaje', ['paz_y_salvo', 'liquidacion', 'examen_medico']), [examen]);
});

prueba('035, caso límite: un documento de retiro anulado después del retiro', () => {
  const completos = ['paz_y_salvo', 'liquidacion', 'consentimiento_examen_retiro'];
  // Retirada con todo: nada que decir.
  assert.deepEqual(faltasDeLaRetirada('retirado', 'termino_fijo', completos), []);
  // Se anuló la liquidación después: sigue retirada y la ficha lo dice.
  assert.deepEqual(faltasDeLaRetirada('retirado', 'termino_fijo', ['paz_y_salvo', 'consentimiento_examen_retiro']), ['Liquidación']);
  // Prestación de servicios no la pide, ni antes ni después.
  assert.deepEqual(faltasDeLaRetirada('retirado', 'prestacion_servicios', ['paz_y_salvo', 'examen_retiro']), []);
  // Quien no está retirada no tiene este aviso: lo suyo es «Retirar», que dice lo que falta.
  assert.deepEqual(faltasDeLaRetirada('activo', 'termino_fijo', []), []);
  assert.deepEqual(faltasDeLaRetirada('vacaciones', null, []), []);
});

prueba('035/RF-20: la fecha y el motivo del retiro', () => {
  assert.deepEqual(faltasDelRetiro({ fecha: '2026-10-28', motivo: 'Terminó la obra' }, '2026-01-10'), []);
  assert.deepEqual(faltasDelRetiro({ fecha: '2026-10-28', motivo: 'Renuncia' }, null), []);
  // El mismo día del ingreso vale; antes, no.
  assert.deepEqual(faltasDelRetiro({ fecha: '2026-01-10', motivo: 'Periodo de prueba' }, '2026-01-10'), []);
  assert.deepEqual(faltasDelRetiro({ fecha: '2026-01-09', motivo: 'x' }, '2026-01-10'), ['El retiro no puede ser antes de la fecha de ingreso.']);
  assert.deepEqual(faltasDelRetiro({ fecha: '2026-02-30', motivo: '  ' }, null), ['Escriba la fecha del retiro.', 'Escriba el motivo del retiro.']);
  assert.deepEqual(faltasDelRetiro({ fecha: '', motivo: 'x' }, null), ['Escriba la fecha del retiro.']);
});

prueba('035/RF-21: los selectores no ofrecen a inactivos ni retirados', () => {
  assert.equal(seOfreceEnSelectores({ activo: true }), true);
  assert.equal(seOfreceEnSelectores({ activo: true, retirado: false }), true);
  assert.equal(seOfreceEnSelectores({ activo: false, retirado: false }), false);
  assert.equal(seOfreceEnSelectores({ activo: false, retirado: true }), false);
  // Reactivada en Personas sin dejar de estar retirada: sigue sin ofrecerse.
  assert.equal(seOfreceEnSelectores({ activo: true, retirado: true }), false);
});

prueba('035/RF-26 a RF-31: los avisos de cada persona y el resumen del personal', () => {
  const hoy = '2026-10-28';
  const fichaCompleta = { estado: 'activo', fechaIngreso: '2026-01-15', tipoContrato: 'termino_indefinido', eps: 'Sura', arl: 'Positiva', finContrato: null };
  const sin = (p: Partial<PersonaParaAvisos>): PersonaParaAvisos => ({ activo: true, ficha: fichaCompleta, documentos: [], ...p });
  const tipos = (p: PersonaParaAvisos) => avisosDeLaPersona(p, hoy).map((a) => a.tipo);

  // Al día, sin avisos.
  assert.deepEqual(avisosDeLaPersona(sin({}), hoy), []);
  // Documentos: dos vencidos y dos por vencer; el más cercano manda.
  const conDocs = sin({
    documentos: [
      { nombre: 'Curso de alturas', vence: '2026-10-20', anulado: false },
      { nombre: 'Licencia', vence: '2026-10-01', anulado: false },
      { nombre: 'Examen periódico', vence: '2026-11-20', anulado: false },
      { nombre: 'Afiliación ARL', vence: '2026-11-05', anulado: false },
      { nombre: 'Anulado vencido', vence: '2026-01-01', anulado: true },
      { nombre: 'Hoja de vida', vence: null, anulado: false },
    ],
  });
  const avisos = avisosDeLaPersona(conDocs, hoy);
  assert.deepEqual(avisos.map((a) => a.texto), ['2 documentos vencidos', 'Vence en 8 días']);
  assert.equal(avisos[0].detalle, 'Curso de alturas, Licencia');
  assert.equal(avisos[0].tono, 'malo');
  // Contrato: a 30 días avisa, a 31 no; el día de la fecha todavía vale; después, terminado.
  const conFin = (finContrato: string) => sin({ ficha: { ...fichaCompleta, tipoContrato: 'termino_fijo', finContrato } });
  assert.deepEqual(avisosDeLaPersona(conFin('2026-11-27'), hoy).map((a) => a.texto), ['Contrato termina en 30 días']);
  assert.deepEqual(tipos(conFin('2026-11-28')), []);
  assert.deepEqual(avisosDeLaPersona(conFin(hoy), hoy).map((a) => a.texto), ['Contrato termina hoy']);
  assert.deepEqual(tipos(conFin('2026-10-27')), ['contrato_terminado']);
  // Ficha incompleta, y sin ficha.
  assert.deepEqual(avisosDeLaPersona(sin({ ficha: { ...fichaCompleta, eps: null } }), hoy)[0].detalle, 'Falta: EPS.');
  assert.deepEqual(tipos(sin({ ficha: null })), ['ficha_incompleta']);
  // Retirada o desactivada: nada, aunque tenga de todo.
  const deTodo = { ...conDocs, ficha: { ...fichaCompleta, eps: null, finContrato: '2026-10-01' } };
  assert.deepEqual(tipos({ ...deTodo, ficha: { ...deTodo.ficha, estado: 'retirado' } }), []);
  assert.deepEqual(tipos({ ...deTodo, activo: false }), []);
  // El orden: de lo más grave a lo menos.
  assert.deepEqual(tipos({ ...deTodo, ficha: { ...deTodo.ficha, finContrato: '2026-10-27' } }), [
    'documentos_vencidos', 'contrato_terminado', 'ficha_incompleta', 'documentos_por_vencer',
  ]);

  // El resumen cuenta personas, no avisos.
  assert.deepEqual(
    resumenDelPersonal(
      [sin({}), conDocs, conFin('2026-11-01'), conFin('2026-10-01'), sin({ ficha: null }), { ...deTodo, activo: false }],
      hoy,
    ),
    { conDocumentosVencidos: 1, conDocumentosPorVencer: 1, contratosPorTerminar: 1, contratosTerminados: 1, fichasIncompletas: 1 },
  );
  assert.deepEqual(resumenDelPersonal([], hoy), {
    conDocumentosVencidos: 0, conDocumentosPorVencer: 0, contratosPorTerminar: 0, contratosTerminados: 0, fichasIncompletas: 0,
  });
});

prueba('035/RF-32, RF-33: a qué fichas llega cada quien', () => {
  const obraA = 'obra-a';
  const de = (rol: Rol, empresa: string | null, obraId: string | null) => ({ rol, empresa, obraId });
  const operadorOcc = de('operador', null, obraA);
  const operadorDeOtra = de('operador', 'occ', 'obra-b');
  const laboratoristaB = de('laboratorista', null, 'obra-b');
  const deProyectos = de('operador', 'proyectos', obraA);
  const elemental = de('admin', null, null);

  for (const rol of ['admin', 'auxiliar_rrhh'] as const) {
    for (const p of [operadorOcc, operadorDeOtra, laboratoristaB, deProyectos, elemental]) {
      assert.equal(alcanzaLaPersona({ rol, obraId: null }, p), true, rol);
    }
  }
  const encargado = { rol: 'encargado_occ' as const, obraId: null };
  assert.equal(alcanzaLaPersona(encargado, operadorOcc), true);
  assert.equal(alcanzaLaPersona(encargado, operadorDeOtra), true);
  assert.equal(alcanzaLaPersona(encargado, laboratoristaB), false);
  assert.equal(alcanzaLaPersona(encargado, deProyectos), false);
  assert.equal(alcanzaLaPersona(encargado, elemental), false);

  const laboratorista = { rol: 'laboratorista' as const, obraId: obraA };
  assert.equal(alcanzaLaPersona(laboratorista, laboratoristaB), true);
  // Su obra no le abre las fichas de OCC: lo suyo es Geolab.
  assert.equal(alcanzaLaPersona(laboratorista, operadorOcc), false);

  const residente = { rol: 'supervisor' as const, obraId: obraA };
  assert.equal(alcanzaLaPersona(residente, operadorOcc), true);
  assert.equal(alcanzaLaPersona(residente, deProyectos), true);
  assert.equal(alcanzaLaPersona(residente, operadorDeOtra), false);
  assert.equal(alcanzaLaPersona(residente, elemental), false);
  assert.equal(alcanzaLaPersona({ rol: 'supervisor', obraId: null }, operadorOcc), false);

  for (const rol of ['operador', 'almacenista', 'encargado_planta'] as const) {
    assert.equal(alcanzaLaPersona({ rol, obraId: obraA }, operadorOcc), false, rol);
  }
});

prueba('035/RF-15: el historial dice qué campos cambiaron', () => {
  const vacia: FichaGuardable = {
    tipoDocumento: null, fechaNacimiento: null, telefono: null, correo: null, direccion: null, ciudad: null,
    emergenciaNombre: null, emergenciaParentesco: null, emergenciaTelefono: null, fechaIngreso: null,
    tipoContrato: null, finContrato: null, salario: null, eps: null, arl: null, pension: null, caja: null,
    notas: null, estado: 'activo',
  };
  // Sin ficha antes: lo que se llenó.
  assert.deepEqual(camposCambiados(null, vacia), []);
  const primera = { ...vacia, fechaIngreso: '2026-01-10', salario: 2_500_000, eps: 'Sura' };
  assert.deepEqual(camposCambiados(null, primera), ['fechaIngreso', 'salario', 'eps']);
  // Después: solo lo distinto, en el orden del formulario.
  assert.deepEqual(camposCambiados(primera, { ...primera, estado: 'vacaciones', telefono: '300' }), ['telefono', 'estado']);
  assert.deepEqual(camposCambiados(primera, { ...primera }), []);
  assert.deepEqual(camposCambiados(primera, { ...primera, salario: null }), ['salario']);
});

prueba('036/RF-8: el número SC y los estados', () => {
  assert.equal(numeroDeSolicitud(1), 'SC-0001');
  assert.equal(numeroDeSolicitud(12345), 'SC-12345');
  assert.equal(nombreDeEstadoDeSolicitud('recibida_en_parte'), 'Recibida en parte');
  assert.equal(ESTADOS_DE_SOLICITUD.length, 8);
  // RF-24: abiertas arriba; recibida, rechazada y cancelada, cerradas.
  assert.deepEqual(
    ESTADOS_DE_SOLICITUD.filter((e) => !solicitudAbierta(e.id)).map((e) => e.id),
    ['recibida', 'rechazada', 'cancelada'],
  );
});

prueba('036/RF-7 a RF-10: lo que impide enviar una solicitud', () => {
  const hoy = '2026-10-29';
  const buena: DatosDeLaSolicitud = {
    renglones: [
      { descripcion: 'Cemento gris', cantidad: 20, unidad: 'bulto', materialId: 'm1' },
      { descripcion: 'Guantes de nitrilo', cantidad: 2.5, unidad: 'caja', materialId: null },
    ],
    paraCuando: hoy,
    urgente: true,
    paraQue: 'Fundir la placa',
    proveedorSugerido: '',
    valorEstimado: null,
  };
  assert.deepEqual(faltasDeLaSolicitud(buena, hoy), []);
  assert.deepEqual(faltasDeLaSolicitud({ ...buena, valorEstimado: 1_200_000, paraCuando: '2026-11-15' }, hoy), []);

  // RF-9: sin renglones, sin descripción, cantidad 0, negativa o con tres decimales, sin unidad.
  assert.deepEqual(faltasDeLaSolicitud({ ...buena, renglones: [] }, hoy), [
    'Agregue al menos un renglón con lo que se necesita.',
  ]);
  const renglon = buena.renglones[0];
  assert.deepEqual(faltasDeLaSolicitud({ ...buena, renglones: [renglon, { ...renglon, descripcion: '  ' }] }, hoy), [
    'El renglón 2 no dice qué se necesita.',
  ]);
  for (const cantidad of [0, -3, 1.234, Number.NaN]) {
    assert.deepEqual(faltasDeLaSolicitud({ ...buena, renglones: [{ ...renglon, cantidad }] }, hoy), [
      'La cantidad del renglón 1 debe ser mayor que cero, con dos decimales a lo más.',
    ]);
  }
  assert.deepEqual(faltasDeLaSolicitud({ ...buena, renglones: [{ ...renglon, unidad: '' }] }, hoy), [
    'El renglón 1 no tiene unidad.',
  ]);

  // RF-10: ayer no; sin fecha o con una que no existe, tampoco.
  assert.deepEqual(faltasDeLaSolicitud({ ...buena, paraCuando: '2026-10-28' }, hoy), [
    'La fecha «para cuándo» no puede ser anterior a hoy.',
  ]);
  assert.deepEqual(faltasDeLaSolicitud({ ...buena, paraCuando: '' }, hoy), ['Diga para cuándo se necesita.']);
  assert.deepEqual(faltasDeLaSolicitud({ ...buena, paraCuando: '2026-02-30' }, hoy), ['Diga para cuándo se necesita.']);

  // El valor estimado es opcional, pero si va, en pesos y mayor que cero.
  for (const valorEstimado of [0, -1, 1500.5]) {
    assert.deepEqual(faltasDeLaSolicitud({ ...buena, valorEstimado }, hoy), [
      'El valor estimado va en pesos, sin decimales y mayor que cero.',
    ]);
  }
});

prueba('036/RF-5, RF-11, RF-13 a RF-16, RF-20: quién da cada paso y desde qué estado', () => {
  const residente = { id: 'r1', rol: 'supervisor' as const };
  const gerencia = { id: 'g1', rol: 'admin' as const };
  const almacenista = { id: 'a1', rol: 'almacenista' as const };
  const enviada: SolicitudParaPaso = { estado: 'enviada', pedidaPor: 'r1', tieneCompraVigente: false };
  const aprobada: SolicitudParaPaso = { ...enviada, estado: 'aprobada' };
  const comprada: SolicitudParaPaso = { ...enviada, estado: 'comprada', tieneCompraVigente: true };

  // RF-11: corregir y cancelar, solo quien la pidió y solo antes de aprobarla.
  assert.equal(porQueNoPuedeDar('corregir', residente, enviada), null);
  assert.equal(porQueNoPuedeDar('cancelar', residente, { ...enviada, estado: 'devuelta' }), null);
  assert.deepEqual(porQueNoPuedeDar('corregir', { id: 'r2', rol: 'supervisor' }, enviada), {
    estado: 403,
    mensaje: 'Solo quien pidió la solicitud puede corregirla.',
  });
  assert.equal(puedeDar('cancelar', gerencia, enviada), false);
  assert.ok(puedeDar('cancelar', gerencia, { ...enviada, pedidaPor: 'g1' }));
  assert.deepEqual(porQueNoPuedeDar('corregir', residente, aprobada), {
    estado: 409,
    mensaje: 'Esta solicitud está aprobada: no se puede corregir.',
  });

  // RF-5, RF-13 a RF-15: aprobar, rechazar y devolver, solo la gerencia.
  for (const paso of ['aprobar', 'rechazar', 'devolver'] as const) {
    assert.ok(puedeDar(paso, gerencia, enviada), paso);
    for (const rol of ROLES.filter((r) => r !== 'admin')) {
      assert.equal(puedeDar(paso, { id: 'r1', rol }, enviada), false, `${paso} ${rol}`);
    }
  }
  assert.deepEqual(porQueNoPuedeDar('aprobar', { id: 'e1', rol: 'encargado_occ' }, enviada), {
    estado: 403,
    mensaje: 'No puede aprobar ni rechazar solicitudes de compra: lo hace la gerencia.',
  });
  // Una devuelta está en manos de quien la pidió: se rechaza, pero no se aprueba ni se vuelve a devolver.
  assert.ok(puedeDar('rechazar', gerencia, { ...enviada, estado: 'devuelta' }));
  assert.equal(puedeDar('aprobar', gerencia, { ...enviada, estado: 'devuelta' }), false);
  assert.equal(puedeDar('devolver', gerencia, { ...enviada, estado: 'devuelta' }), false);

  // RF-16, RF-19: registrar y anular compras, la gerencia; la auxiliar de RR. HH. no.
  assert.ok(puedeDar('registrar_compra', gerencia, aprobada));
  assert.ok(puedeDar('registrar_compra', gerencia, { ...comprada, estado: 'recibida_en_parte' }));
  assert.equal(puedeDar('registrar_compra', gerencia, enviada), false);
  assert.deepEqual(porQueNoPuedeDar('registrar_compra', { id: 'x1', rol: 'auxiliar_rrhh' }, aprobada), {
    estado: 403,
    mensaje: 'No puede registrar compras: lo hace la gerencia.',
  });
  assert.deepEqual(porQueNoPuedeDar('anular_compra', gerencia, aprobada), {
    estado: 409,
    mensaje: 'Esta solicitud no tiene compras registradas.',
  });
  assert.ok(puedeDar('anular_compra', gerencia, comprada));
  assert.equal(puedeDar('anular_compra', almacenista, comprada), false);

  // RF-20: recibir, quien ve Solicitudes de compra, y solo con compra.
  assert.deepEqual(porQueNoPuedeDar('recibir', almacenista, aprobada), {
    estado: 409,
    mensaje: 'Esta solicitud no tiene compras registradas.',
  });
  assert.ok(puedeDar('recibir', almacenista, { ...aprobada, tieneCompraVigente: true }));
  for (const rol of ['supervisor', 'laboratorista', 'encargado_occ', 'admin'] as const) {
    assert.ok(puedeDar('recibir', { id: 'z', rol }, comprada), rol);
  }
  for (const rol of ['operador', 'encargado_planta', 'auxiliar_rrhh'] as const) {
    assert.equal(puedeDar('recibir', { id: 'z', rol }, comprada), false, rol);
  }

  // Cerradas: ningún paso, ni para la gerencia que la pidió.
  for (const estado of ['recibida', 'rechazada', 'cancelada'] as const) {
    for (const paso of PASOS_DE_SOLICITUD) {
      assert.equal(puedeDar(paso, gerencia, { estado, pedidaPor: 'g1', tieneCompraVigente: true }), false, `${estado} ${paso}`);
    }
  }
  assert.deepEqual(porQueNoPuedeDar('aprobar', gerencia, { ...enviada, estado: 'rechazada' }), {
    estado: 409,
    mensaje: 'Esta solicitud está rechazada: no se puede aprobar.',
  });

  // La tabla de permisos: registrar y anular compras es de la gerencia.
  assert.deepEqual(ROLES.filter((r) => alcanza(r, 'compras', 'escribir')), ['admin']);
  assert.deepEqual(ROLES.filter((r) => alcanza(r, 'compras', 'anular')), ['admin']);
  assert.equal(motivoDeRechazo('compras', 'anular'), 'No puede anular compras: lo hace la gerencia.');
});

prueba('036/RF-16, RF-18, RF-19: lo que impide registrar una compra', () => {
  const renglones: RenglonParaCompra[] = [
    { id: 'a', orden: 1, cantidadAprobada: 20, enCompraVigente: false },
    { id: 'b', orden: 2, cantidadAprobada: 0, enCompraVigente: false },
    { id: 'c', orden: 3, cantidadAprobada: 5, enCompraVigente: true },
    { id: 'd', orden: 4, cantidadAprobada: null, enCompraVigente: false },
  ];
  const buena: DatosDeLaCompra = {
    proveedor: 'Ferretería El Tornillo',
    valor: 640_000,
    fecha: '2026-10-29',
    factura: '',
    renglonIds: ['a'],
  };
  assert.deepEqual(faltasDeLaCompra(buena, renglones), []);
  // El mismo renglón dos veces en la lista es uno solo.
  assert.deepEqual(faltasDeLaCompra({ ...buena, renglonIds: ['a', 'a'] }, renglones), []);

  // RF-18: el valor, en pesos y mayor que cero.
  for (const valor of [0, -5, 640_000.5]) {
    assert.deepEqual(faltasDeLaCompra({ ...buena, valor }, renglones), [
      'El valor de la compra va en pesos, sin decimales y mayor que cero.',
    ]);
  }
  assert.deepEqual(faltasDeLaCompra({ ...buena, proveedor: ' ', fecha: '' }, renglones), [
    'Diga a qué proveedor se le compró.',
    'Diga la fecha de la compra.',
  ]);

  // RF-19: renglones aprobados, libres y de esta solicitud.
  assert.deepEqual(faltasDeLaCompra({ ...buena, renglonIds: [] }, renglones), ['Elija qué renglones cubre esta compra.']);
  assert.deepEqual(faltasDeLaCompra({ ...buena, renglonIds: ['b', 'd'] }, renglones), [
    'El renglón 2 no quedó aprobado.',
    'El renglón 4 no quedó aprobado.',
  ]);
  assert.deepEqual(faltasDeLaCompra({ ...buena, renglonIds: ['c'] }, renglones), ['El renglón 3 ya está en otra compra.']);
  assert.deepEqual(faltasDeLaCompra({ ...buena, renglonIds: ['z'] }, renglones), [
    'Uno de los renglones elegidos no es de esta solicitud.',
  ]);
});

prueba('036/RF-19, RF-21: el estado después de comprar, anular y recibir', () => {
  const libre = { cantidadAprobada: 20, enCompraVigente: false, recibido: 0 };
  const comprado = { ...libre, enCompraVigente: true };
  const quitado = { cantidadAprobada: 0, enCompraVigente: false, recibido: 0 };

  // Una compra con parte de los renglones: sigue aprobada; con todos, comprada.
  assert.equal(estadoTrasComprasYRecibos([comprado, libre]), 'aprobada');
  assert.equal(estadoTrasComprasYRecibos([comprado, comprado]), 'comprada');
  // El renglón que la gerencia quitó al aprobar no se espera.
  assert.equal(estadoTrasComprasYRecibos([comprado, quitado]), 'comprada');
  // Anular la única compra la devuelve a aprobada.
  assert.equal(estadoTrasComprasYRecibos([libre, libre]), 'aprobada');

  // Recibido en parte, completo y de más.
  assert.equal(estadoTrasComprasYRecibos([{ ...comprado, recibido: 8 }, comprado]), 'recibida_en_parte');
  assert.equal(estadoTrasComprasYRecibos([{ ...comprado, recibido: 20 }, comprado]), 'recibida_en_parte');
  assert.equal(estadoTrasComprasYRecibos([{ ...comprado, recibido: 20 }, { ...comprado, recibido: 20 }]), 'recibida');
  assert.equal(estadoTrasComprasYRecibos([{ ...comprado, recibido: 25 }, { ...comprado, recibido: 20 }, quitado]), 'recibida');
  // Lo del primer proveedor llega antes de comprarle al segundo.
  assert.equal(estadoTrasComprasYRecibos([{ ...comprado, recibido: 20 }, libre]), 'recibida_en_parte');
});

prueba('036/RF-31: el almacenista no ve los valores de compra', () => {
  assert.equal(veLosValores('almacenista'), false);
  for (const rol of ['admin', 'supervisor', 'laboratorista', 'encargado_occ', 'auxiliar_rrhh'] as const) {
    assert.ok(veLosValores(rol), rol);
  }
});

prueba('036/RF-12, RF-24, RF-25: vencidas, marcas, orden de la bandeja y del lugar, y el resumen', () => {
  const hoy = '2026-10-29';
  // RF-25: se vence al día siguiente, no el mismo día; recibida o cerrada ya no.
  assert.equal(estaVencida({ estado: 'aprobada', paraCuando: hoy }, hoy), false);
  assert.equal(estaVencida({ estado: 'aprobada', paraCuando: '2026-10-28' }, hoy), true);
  assert.equal(estaVencida({ estado: 'recibida_en_parte', paraCuando: '2026-10-28' }, hoy), true);
  for (const estado of ['recibida', 'rechazada', 'cancelada'] as const) {
    assert.equal(estaVencida({ estado, paraCuando: '2026-10-01' }, hoy), false, estado);
  }
  assert.deepEqual(marcasDeLaSolicitud({ estado: 'devuelta', paraCuando: '2026-10-28' }, hoy), ['Devuelta: corrígela', 'Vencida']);
  assert.deepEqual(marcasDeLaSolicitud({ estado: 'enviada', paraCuando: hoy }, hoy), []);

  const s = (numero: number, estado: EstadoDeSolicitud, urgente: boolean, paraCuando: string): SolicitudEnLista => ({
    numero,
    estado,
    urgente,
    paraCuando,
  });
  const lista = [
    s(1, 'recibida', true, '2026-10-01'),
    s(2, 'aprobada', false, '2026-11-02'),
    s(3, 'enviada', false, '2026-11-01'),
    s(4, 'cancelada', false, '2026-10-20'),
    s(5, 'enviada', true, '2026-11-10'),
    s(6, 'comprada', true, '2026-11-05'),
    s(7, 'enviada', false, '2026-10-30'),
    s(8, 'devuelta', false, '2026-10-25'),
    s(9, 'enviada', true, '2026-11-10'),
  ];
  // RF-12: por aprobar (urgentes y luego por fecha), demás abiertas, cerradas de la más nueva.
  assert.deepEqual(ordenDeLaBandeja(lista).map((x) => x.numero), [5, 9, 7, 3, 6, 8, 2, 4, 1]);
  // RF-24: abiertas y luego cerradas, sin poner primero las que esperan aprobación.
  assert.deepEqual(ordenDelLugar(lista).map((x) => x.numero), [6, 5, 9, 8, 7, 3, 2, 4, 1]);
  // No cambia la lista que recibe.
  assert.equal(lista[0].numero, 1);

  // RF-12: cuántas esperan aprobación, cuántas urgentes abiertas y cuántas vencidas.
  assert.deepEqual(resumenDeLaBandeja(lista, hoy), { porAprobar: 4, urgentes: 3, vencidas: 1 });
  assert.deepEqual(resumenDeLaBandeja([], hoy), { porAprobar: 0, urgentes: 0, vencidas: 0 });
});

prueba('036/RF-17, RF-31: las clases de los adjuntos de una solicitud y las que llevan precio', () => {
  const ids = clasesDe('solicitud').map((c) => c.id);
  assert.deepEqual(ids, ['cotizacion', 'orden_de_compra', 'factura', 'remision', 'foto', 'ficha_tecnica', 'otro']);
  // Solo en la solicitud: ni las empresas, ni la obra, ni la persona las ofrecen.
  const otros: LugarDeDocumentos[] = ['elemental', 'occ', 'geolab', 'obra', 'persona'];
  for (const id of ids.filter((x) => x !== 'otro')) {
    assert.deepEqual(otros.filter((l) => esClaseDe(l, id)), [], id);
  }
  // Ni las comunes de empresa ni las de la persona son de una solicitud.
  assert.ok(!esClaseDe('solicitud', 'camara_de_comercio') && !esClaseDe('solicitud', 'liquidacion'));
  assert.equal(nombreDeClase('solicitud', 'orden_de_compra'), 'Orden de compra');

  // RF-31: cotización, orden de compra y factura llevan precio; las demás, no.
  assert.deepEqual(ids.filter(llevaPrecio), ['cotizacion', 'orden_de_compra', 'factura']);
  assert.equal(llevaPrecio('planos'), false);
});

prueba('036/RF-11, RF-14, RF-15: el motivo de cancelar, rechazar, devolver y anular', () => {
  assert.equal(faltaDelMotivo('cancelar', ' '), 'Diga por qué se cancela.');
  assert.equal(faltaDelMotivo('rechazar', ''), 'Diga por qué se rechaza.');
  assert.equal(faltaDelMotivo('devolver', ''), 'Diga qué debe corregirse.');
  assert.equal(faltaDelMotivo('anular_compra', ''), 'Diga por qué se anula la compra.');
  assert.equal(faltaDelMotivo('rechazar', 'No hay presupuesto'), null);
  // Aprobar no pide motivo.
  assert.equal(faltaDelMotivo('aprobar', ''), null);
});

prueba('036/RF-13: aprobar con cantidades bajadas o renglones quitados', () => {
  const renglones = [
    { id: 'a', orden: 1, descripcion: 'Cemento', cantidad: 20 },
    { id: 'b', orden: 2, descripcion: 'Guantes', cantidad: 2.5 },
  ];
  // Sin decir nada: todo entero, sin cambios.
  assert.deepEqual(aprobacionDeLaSolicitud(renglones, []), { faltas: [], aprobadas: { a: 20, b: 2.5 }, cambios: [] });
  // Bajar una y quitar la otra.
  assert.deepEqual(
    aprobacionDeLaSolicitud(renglones, [
      { renglonId: 'a', cantidad: 15 },
      { renglonId: 'b', cantidad: 0 },
    ]),
    {
      faltas: [],
      aprobadas: { a: 15, b: 0 },
      cambios: [
        { renglon: 1, descripcion: 'Cemento', antes: 20, despues: 15 },
        { renglon: 2, descripcion: 'Guantes', antes: 2.5, despues: 0 },
      ],
    },
  );
  // No se sube, no va negativa ni con tres decimales.
  for (const cantidad of [21, -1, 1.234]) {
    assert.deepEqual(aprobacionDeLaSolicitud(renglones, [{ renglonId: 'a', cantidad }]).faltas, [
      'La cantidad aprobada del renglón 1 va de 0 a 20.',
    ]);
  }
  assert.deepEqual(aprobacionDeLaSolicitud(renglones, [{ renglonId: 'z', cantidad: 1 }]).faltas, [
    'Uno de los renglones no es de esta solicitud.',
  ]);
  // Todo en cero: se rechaza, no se aprueba.
  assert.deepEqual(
    aprobacionDeLaSolicitud(renglones, [
      { renglonId: 'a', cantidad: 0 },
      { renglonId: 'b', cantidad: 0 },
    ]).faltas,
    ['Para no aprobar nada, recházala.'],
  );
});

prueba('036/RF-11, RF-23: qué cambió al corregir una solicitud', () => {
  const antes: DatosDeLaSolicitud = {
    renglones: [{ descripcion: 'Cemento', cantidad: 20, unidad: 'bulto', materialId: null }],
    paraCuando: '2026-11-01',
    urgente: false,
    paraQue: 'Placa',
    proveedorSugerido: '',
    valorEstimado: null,
  };
  assert.deepEqual(camposCorregidos(antes, { ...antes, paraQue: ' Placa ' }), []);
  assert.deepEqual(
    camposCorregidos(antes, {
      ...antes,
      renglones: [{ descripcion: 'Cemento', cantidad: 25, unidad: 'bulto', materialId: null }],
      urgente: true,
      valorEstimado: 300_000,
    }),
    ['lo que se pide', 'urgencia', 'valor estimado'],
  );
});

prueba('036/RF-20: lo que impide registrar lo que llegó', () => {
  const renglones: RenglonParaRecibir[] = [
    { id: 'a', orden: 1, cantidadAprobada: 20, enCompraVigente: true },
    { id: 'b', orden: 2, cantidadAprobada: 4, enCompraVigente: false },
    { id: 'c', orden: 3, cantidadAprobada: 0, enCompraVigente: false },
  ];
  const fecha = '2026-10-29';
  assert.deepEqual(faltasDelRecibo({ fecha, recibos: [{ renglonId: 'a', cantidad: 8 }] }, renglones), []);
  // Llegó de más: se deja (caso límite).
  assert.deepEqual(faltasDelRecibo({ fecha, recibos: [{ renglonId: 'a', cantidad: 25 }] }, renglones), []);
  assert.deepEqual(faltasDelRecibo({ fecha: '', recibos: [] }, renglones), ['Diga qué día llegó.', 'Diga qué llegó.']);
  assert.deepEqual(faltasDelRecibo({ fecha, recibos: [{ renglonId: 'b', cantidad: 1 }] }, renglones), [
    'El renglón 2 todavía no tiene compra.',
  ]);
  assert.deepEqual(faltasDelRecibo({ fecha, recibos: [{ renglonId: 'c', cantidad: 1 }] }, renglones), [
    'El renglón 3 no quedó aprobado.',
  ]);
  for (const cantidad of [0, -2, 1.005]) {
    assert.deepEqual(faltasDelRecibo({ fecha, recibos: [{ renglonId: 'a', cantidad }] }, renglones), [
      'La cantidad recibida del renglón 1 debe ser mayor que cero, con dos decimales a lo más.',
    ]);
  }
  assert.deepEqual(
    faltasDelRecibo(
      {
        fecha,
        recibos: [
          { renglonId: 'a', cantidad: 1 },
          { renglonId: 'a', cantidad: 2 },
        ],
      },
      renglones,
    ),
    ['El renglón 1 está dos veces.'],
  );
  assert.deepEqual(faltasDelRecibo({ fecha, recibos: [{ renglonId: 'z', cantidad: 1 }] }, renglones), [
    'Uno de los renglones no es de esta solicitud.',
  ]);
});

prueba('036/RF-3, RF-26, RF-27: buscar y filtrar la bandeja, y quién ve el gasto', () => {
  const s = {
    numero: 5,
    estado: 'aprobada' as const,
    urgente: true,
    lugar: { id: 'obra-1' },
    pedidaEl: '2026-10-20',
    renglones: [{ descripcion: 'Cemento gris Argos' }],
    proveedorSugerido: 'Ferretería El Tornillo',
    proveedores: ['Dotaciones Andinas'],
    pedidaPor: { nombre: 'María Pérez' },
  };
  // RF-26: número, renglones, proveedores y quien pidió, sin tildes ni mayúsculas.
  for (const texto of ['SC-0005', 'sc5', '5', '0005', 'cemento', 'ARGOS', 'ferreteria', 'andinas', 'maria perez', '']) {
    assert.ok(coincideLaSolicitud(s, texto), texto);
  }
  for (const texto of ['SC-0006', '6', 'arena', 'Gómez']) assert.equal(coincideLaSolicitud(s, texto), false, texto);

  // RF-3: lugar, estado, urgencia y fechas del pedido, las dos puntas incluidas.
  const sin: FiltrosDeLaBandeja = { lugar: null, estado: null, soloUrgentes: false, desde: null, hasta: null, texto: '' };
  assert.ok(pasaLosFiltros(s, sin));
  assert.ok(pasaLosFiltros(s, { ...sin, lugar: 'obra-1', estado: 'aprobada', soloUrgentes: true }));
  assert.equal(pasaLosFiltros(s, { ...sin, lugar: 'occ' }), false);
  assert.equal(pasaLosFiltros(s, { ...sin, estado: 'enviada' }), false);
  assert.equal(pasaLosFiltros({ ...s, urgente: false }, { ...sin, soloUrgentes: true }), false);
  assert.ok(pasaLosFiltros(s, { ...sin, desde: '2026-10-20', hasta: '2026-10-20' }));
  assert.equal(pasaLosFiltros(s, { ...sin, desde: '2026-10-21' }), false);
  assert.equal(pasaLosFiltros(s, { ...sin, hasta: '2026-10-19' }), false);
  assert.equal(pasaLosFiltros(s, { ...sin, texto: 'arena' }), false);

  // RF-27: el gasto, solo la gerencia.
  assert.deepEqual(ROLES.filter(veElGasto), ['admin']);
});

prueba('036/RF-9, RF-10: cada falta de la solicitud, junto a su campo', () => {
  const hoy = '2026-10-29';
  const datos: DatosDeLaSolicitud = {
    renglones: [
      { descripcion: 'Cemento', cantidad: 20, unidad: 'bulto', materialId: null },
      { descripcion: ' ', cantidad: 0, unidad: '', materialId: null },
    ],
    paraCuando: '2026-10-28',
    urgente: false,
    paraQue: '',
    proveedorSugerido: '',
    valorEstimado: 0,
  };
  assert.deepEqual(faltasPorCampo(datos, hoy), {
    renglones: null,
    porRenglon: [
      { descripcion: null, cantidad: null, unidad: null },
      {
        descripcion: 'El renglón 2 no dice qué se necesita.',
        cantidad: 'La cantidad del renglón 2 debe ser mayor que cero, con dos decimales a lo más.',
        unidad: 'El renglón 2 no tiene unidad.',
      },
    ],
    paraCuando: 'La fecha «para cuándo» no puede ser anterior a hoy.',
    valorEstimado: 'El valor estimado va en pesos, sin decimales y mayor que cero.',
  });
  // La lista del servidor es la misma, en el orden del formulario.
  assert.deepEqual(faltasDeLaSolicitud(datos, hoy), [
    'El renglón 2 no dice qué se necesita.',
    'La cantidad del renglón 2 debe ser mayor que cero, con dos decimales a lo más.',
    'El renglón 2 no tiene unidad.',
    'La fecha «para cuándo» no puede ser anterior a hoy.',
    'El valor estimado va en pesos, sin decimales y mayor que cero.',
  ]);
});

verificarFirmaS3()
  .then(verificarFormulario)
  .then(verificarChoques)
  .then(verificarCripto)
  .then(verificarIntegracion)
  .then(() => console.log(`\n${pruebas} verificaciones correctas.\n`))
  .catch((error) => {
    console.error('\nFalló una verificación:', error);
    process.exit(1);
  });
