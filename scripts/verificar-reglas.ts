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
import { leerLectura, mostrarLectura, tieneDecimalesDeLectura } from '../src/shared/rules/lecturas';
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
  MODULOS_DE_EMPRESA,
  motivoDeRechazo,
  motivoParaNoDarDeBajaObra,
  motivoParaNoDarRol,
  motivoParaNoAprobar,
  sinObraAsignada,
  modulosVisibles,
  puedeCambiarRol,
  puedeGenerarClave,
  rolesQuePuedeDar,
  rolDeVariasObras,
  rolVeTodasLasObras,
  type Modulo,
  type ModuloConPermiso,
  type Rol,
  TODOS_LOS_MODULOS,
} from '../src/shared/rules/permisos';
import {
  diasDeReparto,
  ejecucionDelPeriodo,
  informeDeCumplimiento,
  informeSegunRol,
  llaveDeItemPlanificado,
  periodoDelInforme,
  sinPlata,
  mesesAnterioresPorMarcar,
  metaDelPeriodo,
  tramosDelPeriodo,
  valoresDelPeriodo,
  versionMedible,
  ultimoDiaQueRige,
  versionQueRige,
  pendientesPorLlave,
  etiquetaDeEstimada,
} from '../src/shared/rules/cumplimiento-de-obra';
import {
  armarItemDePlanificacion,
  cantidadDelMes,
  cruzarConPresupuesto,
  ESTADOS_DE_LECTURA_DE_PLANIFICACION,
  ESTADOS_DE_PLANIFICACION,
  hallazgosDe,
  llaveDelItem,
  notasEnTexto,
  sinPrecioDeCosto,
  programacionDeRubros,
  resumenDeLaPlanificacion,
  rubrosDelMes,
  valoresPorMes,
} from '../src/shared/rules/planificacion';
import {
  anulacionDePlanificacion,
  aprobacionDePlanificacion,
  pedidoDeInformeDeCumplimiento,
  seleccionDeHojasPedida,
} from '../src/features/panel/planificacion';
import {
  anulacionDePlanSemanal,
  aprobacionDePlanSemanal,
  creacionDePlanSemanal,
  guardadoDePlanSemanal,
  pedidoDeLecturaDePlan,
} from '../src/features/panel/plan-semanal';
import {
  estructuraDeLaLectura,
  limpiarPropuesta,
  muestraParaProponer,
  observacionesValidas,
  armarSeleccion,
  repasarSeleccion,
  textoParaLeer,
  type LecturaDePlanificacion,
} from '../src/shared/rules/planificacion-ia';
import {
  avisosDelPlan,
  contienePesos,
  metasPorDiaDelPlan,
  cruzarActividad,
  conservarLoQueNoVeElResidente,
  planSinPlata,
  type EstructuraDelPlan,
  type VistaDelPlan,
  planQueRige,
  puedeAprobarPlan,
  quienApruebaElPlan,
  rigeDesdeAlAprobar,
  rigeHastaAlAnular,
  descuadreDeLaActividad,
  preciosDeCosto,
  valoresDelPlan,
  diasDeLaSemana,
  diasPorDefecto,
  faltaDeSemana,
  metaDiaria,
  repartir,
  totalProgramado,
  lunesDe,
  semanaTerminada,
  semanasPermitidas,
  sePuedeMarcar,
} from '../src/shared/rules/plan-semanal';
import {
  INSTRUCCIONES_PARA_PROPONER,
  planDeLaLectura,
  textoParaProponer,
  type ActividadLeidaPorLaIa,
  type PedidoDePropuesta,
  type PlanLeidoPorLaIa,
} from '../src/shared/rules/plan-semanal-ia';
import {
  accesoTrasLaMigracion,
  campoDeObras,
  etiquetaDeAccesoHistorico,
  etiquetaDelAccesoEn,
  firmaConAcceso,
  motivoParaNoAsignarObras,
  obraEnUso,
  obrasAlCambiarDeAcceso,
  puedeMarcarRevisado,
} from '../src/shared/rules/cargos-de-obra';
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
  HORARIO_ANTERIOR,
  HORARIO_PROPUESTO,
  HORAS_DEL_DIA,
  MAXIMO_MINUTOS_SEMANALES,
  mensajeDeHorarioDeObra,
  minutosCubiertos,
  minutosDeHora,
  minutosOfrecidos,
  minutosSemanales,
  partirHora,
  unirHora,
  validarFranjas,
  validarHorario,
  validarHorarioDeObra,
  type HorarioDeObra,
} from '../src/shared/rules/horas';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '../src/shared/rules/rango';
import { POR_PAGINA, recortarPagina } from '../src/features/panel/paginas';
import {
  horasDeLaPersona,
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
  placaParecida,
  duenoDelGrupo,
  reconocerEquipoDeEmpresa,
  EMPRESAS_CON_BITACORA_PROPIA,
  origenDeLaBandeja,
  limpiarNombresEnWhatsapp,
  destinoEnGrupoDeEmpresa,
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
  anotarCambio,
  BITACORA_OCC_VACIA,
  conteoDelDia,
  diaDeEmpresa,
  agregarEstadoAlDia,
  estadoActual,
  estadoDelDiaDeEmpresa,
  faltaDeLaCorreccion,
  filtrarDia,
  cambioDeEstadoDeTexto,
  estadoDeEquipoDeTexto,
  lecturaVacia,
  leerMensajeDeEmpresa,
  llevarAlDia,
  mantenimientosDelMensaje,
  tipoDeTrabajoDeTexto,
  mantenimientoDelCambio,
  mantenimientosDelTrabajo,
  mezclarRenglones,
  reemplazarLista,
  type ActividadDeMantenimiento,
  type CambioDelDia,
  type EquipoDelRenglon,
  type EstadoDelEquipo,
  type TrabajoDeMantenimiento,
} from '../src/shared/rules/bitacora-occ';
import {
  completarIniciales,
  respetarInicialesEscritas,
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
  tipoDeReporteDeEmpresa,
  TIPOS_DE_REPORTE,
  TIPOS_DE_REPORTE_DE_EMPRESA,
  TIPOS_DE_REPORTE_DE_OBRA,
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
import { bloquesDelInforme, hojasDelInforme } from '../src/features/planificacion/exportar';
import { hojasDelPlan, nombreDelPlan } from '../src/features/plan-semanal/exportar';
import type { ReporteDe } from '../src/features/reportes/servidor/reportes';
import {
  calidadPorEnsayo,
  cantidadesPorItem,
  climaDelPeriodo,
  horasDelPersonal,
  sinHorasEnElPeriodo,
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
  reparoDeObrasDelAcceso,
  empresaDelLugar,
  lugarDeLaRuta,
  menuDeEmpresa,
  menuDelLugar,
  pestanasDeBitacora,
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
  porQueNoPuedeTocarElCorte,
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
  yaLaDecidioOtro,
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
  aprobacionDelPago,
  camposDelPagoCorregidos,
  coincideElPago,
  CONCEPTOS_DE_PAGO,
  ESTADOS_DE_PAGO,
  estadoTrasPagos,
  estaVencidoElPago,
  faltaDelMotivoDePago,
  faltasDelPago,
  faltasDeLaSolicitudDePago,
  faltasDelPagoPorCampo,
  marcasDelPago,
  MEDIOS_DE_PAGO,
  NOMBRE_DEL_PAGO_DE_LA_COMPRA,
  nombreDeConcepto,
  nombreDeEstadoDePago,
  nombreDeMedio,
  numeroDePago,
  ordenDeLaBandejaDePagos,
  ordenDelLugarDePagos,
  pagoAbierto,
  pagoDeLaCompra,
  PASOS_DE_PAGO,
  pasaLosFiltrosDePago,
  porQueNoPuedeDarPaso,
  puedeDarPaso,
  resumenDeLaBandejaDePagos,
  veElValorDelPago,
  veLosPagos,
  type DatosDeLaSolicitudDePago,
  type DatosDelPago,
  type EstadoDePago,
  type FiltrosDeLaBandejaDePagos,
  type SolicitudDePagoParaPaso,
} from '../src/shared/rules/pagos';
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
  empresaAlAlcance,
  costoEstimado,
  diaDelConteo,
  faltaDelPeriodo,
  faltasDeLosAdjuntos,
  limiteDelDia,
  agruparPorFecha,
  conversacionesQueCoinciden,
  ejemplosDePregunta,
  aclaracionDe,
  aclaracionEnElHistorial,
  descripcionDeLaConsulta,
  loQueConsulta,
  ambitoDelAsistente,
  resumenDeLoQueConsulta,
  grupoDeFecha,
  MODULOS_CONSULTABLES,
  modulosDeAnulados,
  indicacionDeObraPorDefecto,
  obraAlAlcance,
  obrasAlcanzadasEnTexto,
  preguntasQueQuedan,
  resumenDeRegistrados,
  ROLES_DEL_ASISTENTE,
  tituloDeConversacion,
} from '../src/shared/rules/asistente';
import {
  aTabla,
  celdaEnTexto,
  encabezadoDelArchivo,
  faltasDelPedido,
  FILAS_MAXIMAS_POR_ARCHIVO,
  LEYENDA_DEL_ARCHIVO,
  nombreDelArchivoDelAsistente,
  parrafosDeMarkdown,
  tablaDe,
  textoParaPdf,
  venceEl,
  vigente,
} from '../src/shared/rules/archivos-del-asistente';
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
import { alcanzaLaImagen, alcanzaLaObra, esDeSusObras, filtroDeObra, obraParaEscribir } from '../src/features/servidor/alcance';
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
  lecturaAnterior,
  cambiosDeFinales,
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
  conMarcaDeSeccion,
  marcaDeSeccion,
  mensajeDeSeccionConRegistros,
  seccionesDelParte,
  textosSinRegistro,
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
  vehiculoEditado,
  anulacionDeBitacoraDeEmpresa,
  correccionDeBitacoraDeEmpresa,
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
  // Con punto decimal y sin miles desde la 039 (RF-17): «1240 h», «812.5 h».
  assert.match(v.mensaje, /fue 1240 h y usted escribió 1180 h/);
  const conDecimales = validarMedidor('horometro', 812.5, 812.75);
  assert.ok(conDecimales.estado === 'retrocede');
  assert.match(conDecimales.mensaje, /fue 812\.75 h y usted escribió 812\.5 h/);
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

/** Foto del día subida (desde la 039 las actividades no llevan foto propia). */
const FOTOS_COMPLETAS: FotosDelParte = { delDia: 1 };

const SIN_FOTOS: FotosDelParte = { delDia: 0 };

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

prueba('039/RF-1, RF-2: las actividades ya no piden foto; basta la fotografía del día', () => {
  // Hasta la 039 se pedía la foto de al menos una actividad (004/RF-52).
  assert.deepEqual(bloqueosDelCierre(PARTE_COMPLETO, { delDia: 1 }), []);
  assert.deepEqual(bloqueosDelCierre(PARTE_COMPLETO, { delDia: 0 }), ['Falta llenar: Fotografía del día.']);
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
    { delDia: 1 },
  );
  assert.deepEqual(bloqueos, [
    'Falta llenar: Clima.',
    'RET-02: Falta la lectura inicial (h).',
    'A Ana Ruiz le falta la hora de entrada o de salida.',
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
  assert.deepEqual(bloqueosDelCierre(DIA_SIN_TRABAJO, { delDia: 1 }), []);
  assert.deepEqual(bloqueosDelCierre(DIA_SIN_TRABAJO, SIN_FOTOS), [
    'Falta llenar: Fotografía del día.',
  ]);
  assert.deepEqual(
    bloqueosDelCierre({ ...DIA_SIN_TRABAJO, clima: [], notas: '' }, { delDia: 1 }),
    ['Falta llenar: Clima y Notas.'],
  );
});

prueba('un día sin trabajo exige el motivo', () => {
  // Spec 004 / RF-53.
  const sinMotivo = { ...DIA_SIN_TRABAJO, motivoSinTrabajo: '  ' };
  assert.equal(validarDiaSinTrabajo(sinMotivo), 'sin_motivo');
  assert.equal(validarDiaSinTrabajo({ ...DIA_SIN_TRABAJO, motivoSinTrabajo: null }), 'sin_motivo');
  assert.deepEqual(bloqueosDelCierre(sinMotivo, { delDia: 1 }), [
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
  assert.deepEqual(bloqueosDelCierre(conMaquina, { delDia: 1 })[0],
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
  // (el asistente). Desde la 041 son dos accesos, residente y director de obra, y los dos
  // entran además a Personas para dar accesos de obra (RF-26, RF-38).
  for (const rol of ['residente', 'director_obra'] as const) assert.deepEqual(modulosVisibles(rol), [
    'inicio',
    'personas',
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
  ], rol);
});

prueba('la bandeja de WhatsApp es de la gerencia y del residente, y nada más (021/RF-14, RF-15)', () => {
  // Desde la 041, los tres cargos de obra: aprobar en la bandeja es registrar (041/RF-37).
  for (const rol of ['admin', 'residente', 'director_obra', 'director_proyectos'] as const) {
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
    'No puede aprobar ni descartar este reporte: lo hacen la gerencia, el residente, el director de proyectos y el director de obra.',
  );
  assert.equal(
    motivoDeRechazo('laboratorio', 'aprobar'),
    'No puede aprobar ni devolver este ensayo: lo hacen la gerencia, el director de proyectos y el director de obra.',
  );
});

prueba('aprobar viajes desde la bandeja no le da Control Cantera al residente (021/RF-84, RF-85)', () => {
  // Ni al residente ni al director de obra: registrar viajes sigue siendo del encargado de planta.
  // Anular sí lo puede el director de obra desde la 041 (RF-60); el residente no.
  for (const rol of ['residente', 'director_obra'] as const) {
    assert.equal(alcanza(rol, 'cantera', 'escribir'), false, rol);
    assert.ok(alcanza(rol, 'cantera', 'listar'), rol);
  }
  assert.equal(alcanza('residente', 'cantera', 'anular'), false);
});

prueba('el residente no escribe en el maestro de la empresa', () => {
  // Esto es lo que hoy sí puede hacer, y es el motivo de la spec 001. Desde la 041 entra a
  // Personas a dar accesos de obra (RF-26, RF-38), pero Obras y Vehículos siguen cerrados.
  for (const rol of ['residente', 'director_obra'] as const) {
    for (const modulo of ['obras', 'vehiculos'] as const) {
      assert.equal(alcanza(rol, modulo, 'escribir'), false, `${rol} ${modulo}`);
      assert.equal(alcanza(rol, modulo, 'ver'), false, `${rol} ${modulo}`);
    }
  }
});

prueba('pero sí puede listar personas y vehículos', () => {
  // El caso que evita que alguien "arregle" el permiso de más y deje sin datos
  // a los selectores de Asignaciones y Bitácoras.
  assert.ok(alcanza('director_obra', 'personas', 'listar'));
  assert.ok(alcanza('director_obra', 'vehiculos', 'listar'));
});

prueba('el residente trabaja en asignaciones y bitácoras; desde la 041 la anula el director de obra', () => {
  for (const rol of ['residente', 'director_obra'] as const) {
    assert.ok(alcanza(rol, 'asignaciones', 'escribir'), rol);
    assert.ok(alcanza(rol, 'bitacoras', 'escribir'), rol);
  }
  assert.ok(alcanza('director_obra', 'bitacoras', 'anular'));
  assert.equal(alcanza('residente', 'bitacoras', 'anular'), false);
});

prueba('anular un preoperacional: la gerencia, los directores y el encargado de OCC; el residente no (041/RF-9, RF-60)', () => {
  assert.ok(alcanza('residente', 'preoperacionales', 'ver'));
  assert.equal(alcanza('residente', 'preoperacionales', 'anular'), false);
  for (const rol of ['admin', 'director_obra', 'director_proyectos', 'encargado_occ'] as const) {
    assert.ok(alcanza(rol, 'preoperacionales', 'anular'), rol);
  }
});

prueba('emitir códigos de activación: la gerencia y los directores, no el residente (041/RF-72)', () => {
  assert.ok(alcanza('admin', 'personas', 'activar'));
  assert.equal(alcanza('residente', 'personas', 'activar'), false);
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
  assert.equal(puedeCambiarRol('director_obra', 'admin'), false);
  // Desde la 041 el director de obra no da su propio acceso (RF-27), y el residente solo da operador (RF-38).
  assert.equal(puedeCambiarRol('director_obra', 'director_obra'), false);
  assert.ok(puedeCambiarRol('director_obra', 'operador'));
  assert.equal(puedeCambiarRol('residente', 'residente'), false);
  assert.ok(puedeCambiarRol('residente', 'operador'));
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

prueba('en el almacén anulan la gerencia y, desde la 041, los directores; el almacenista y el residente no', () => {
  // Spec 009 / RF-38 y RF-39: lo pidió gerencia el 2026-09-17. Escribir no cambia. La 041
  // (RF-9, RF-60) lo abrió a los directores, que responden por la obra.
  assert.ok(alcanza('almacenista', 'almacen', 'escribir'));
  assert.equal(alcanza('almacenista', 'almacen', 'anular'), false);
  assert.ok(alcanza('admin', 'almacen', 'anular'));
  assert.equal(alcanza('residente', 'almacen', 'anular'), false);
  // Y el 403 de la guardia nombra a quien sí puede (spec 008, RF-13).
  assert.equal(
    motivoDeRechazo('almacen', 'anular'),
    'No puede anular este registro: lo hacen la gerencia, el director de proyectos y el director de obra.',
  );
});

prueba('la gerencia registra en almacén y cantera; el residente solo consulta', () => {
  // Spec 008 / RF-11, RF-12, RF-13.
  for (const modulo of ['almacen', 'cantera'] as const) {
    for (const accion of ['ver', 'listar', 'escribir', 'anular'] as const) {
      assert.ok(alcanza('admin', modulo, accion), `admin ${modulo}/${accion}`);
    }
    assert.ok(alcanza('residente', modulo, 'ver'), `residente ${modulo}/ver`);
    assert.ok(alcanza('residente', modulo, 'listar'), `residente ${modulo}/listar`);
    assert.equal(alcanza('residente', modulo, 'escribir'), false, `residente ${modulo}/escribir`);
    assert.equal(alcanza('residente', modulo, 'anular'), false, `residente ${modulo}/anular`);
  }
  assert.deepEqual(modulosVisibles('residente'), [
    'inicio',
    'personas',
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
  // Desde la 041 también los directores (RF-12, RF-26); el residente no (RF-39).
  for (const destino of ['almacenista', 'encargado_planta'] as const) {
    assert.ok(puedeCambiarRol('admin', destino), destino);
    assert.equal(puedeCambiarRol('residente', destino), false, destino);
    assert.equal(puedeCambiarRol('almacenista', destino), false, destino);
    assert.equal(puedeCambiarRol('encargado_planta', destino), false, destino);
  }
  // Y ellos no reparten acceso a nadie.
  assert.equal(puedeCambiarRol('almacenista', 'operador'), false);
  assert.equal(puedeCambiarRol('encargado_planta', 'director_obra'), false);
});

prueba('el rechazo de dar un acceso dice quién puede darlo', () => {
  // Spec 008 / RF-17 y el requisito no funcional de 001: qué no se puede y quién sí.
  // Desde la 041 «quién sí» sale de la regla: también los directores (RF-27, RF-39).
  assert.equal(
    motivoParaNoDarRol('residente', 'almacenista'),
    'Solo la gerencia, el director de proyectos o el director de obra pueden dar el acceso de Almacenista.',
  );
  assert.equal(
    motivoParaNoDarRol('residente', 'encargado_planta'),
    'Solo la gerencia, el director de proyectos o el director de obra pueden dar el acceso de Encargado de Planta.',
  );
  assert.equal(
    motivoParaNoDarRol('director_obra', 'admin'),
    'Solo la gerencia puede dar el acceso de Gerencia.',
  );
  // Si se puede, no hay motivo.
  assert.equal(motivoParaNoDarRol('admin', 'almacenista'), null);
  assert.equal(motivoParaNoDarRol('director_obra', 'almacenista'), null);
  assert.equal(motivoParaNoDarRol('residente', 'operador'), null);
});

prueba('el rechazo del servidor dice quién sí puede hacerlo', () => {
  // Spec 008 / RF-13: al residente no se le dice que registrar en el almacén «es
  // de la gerencia», porque también lo hace el almacenista.
  assert.equal(
    motivoDeRechazo('almacen', 'escribir'),
    'No puede crear o modificar este registro: lo hacen la gerencia, el almacenista y el director de proyectos.',
  );
  assert.equal(
    motivoDeRechazo('cantera', 'anular'),
    'No puede anular este registro: lo hacen la gerencia, el encargado de planta, el director de proyectos y el director de obra.',
  );
  // Donde solo escribe la gerencia, el texto dice lo mismo que antes, con otras palabras.
  assert.equal(
    motivoDeRechazo('obras', 'escribir'),
    'No puede crear o modificar este registro: lo hacen la gerencia y el director de proyectos.',
  );
  // Al almacenista que abre Bitácoras se le dice quién la lleva. Desde la spec 034 el
  // Encargado de OCC también la consulta (la de maquinaria de OCC).
  assert.equal(
    motivoDeRechazo('bitacoras', 'listar'),
    'No puede consultar este listado: lo hacen la gerencia, el residente, el encargado de OCC, el director de proyectos y el director de obra.',
  );
});

prueba('una cuenta sin obra se detecta para todo el que no es gerencia', () => {
  // Spec 008 / RF-6: el almacenista sin obra no ve nada y se le dice por qué.
  assert.equal(sinObraAsignada('almacenista', null), true);
  assert.equal(sinObraAsignada('encargado_planta', null), true);
  assert.equal(sinObraAsignada('director_obra', null), true);
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
  const residenteA = sesionDe('director_obra', 'obra-a');
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
  assert.equal(moduloDeEntrada('director_obra'), 'inicio');
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
    assert.ok(alcanza('director_obra', 'laboratorio', accion), accion);
  }
  assert.equal(alcanza('director_obra', 'laboratorio', 'escribir'), false);
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
  // Desde la 041 también los directores (RF-12, RF-26); el residente sigue sin darlo.
  for (const rol of ['residente', 'almacenista', 'encargado_planta', 'laboratorista', 'operador'] as const) {
    assert.equal(puedeCambiarRol(rol, 'laboratorista'), false, rol);
  }
  assert.equal(puedeCambiarRol('laboratorista', 'operador'), false);
  assert.equal(
    motivoParaNoDarRol('residente', 'laboratorista'),
    'Solo la gerencia, el director de proyectos o el director de obra pueden dar el acceso de Laboratorista.',
  );
});

prueba('el rechazo en el laboratorio dice quién sí puede', () => {
  // Spec 018 / RF-10.
  assert.equal(
    motivoDeRechazo('laboratorio', 'aprobar'),
    'No puede aprobar ni devolver este ensayo: lo hacen la gerencia, el director de proyectos y el director de obra.',
  );
  assert.equal(
    motivoDeRechazo('laboratorio', 'escribir'),
    'No puede crear o modificar este registro: lo hacen la gerencia, el laboratorista y el director de proyectos.',
  );
  assert.equal(
    motivoDeRechazo('laboratorio', 'anular'),
    'No puede anular este registro: lo hacen la gerencia, el director de proyectos y el director de obra.',
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
  const residente = modulosVisibles('director_obra', sinNada);
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
  assert.ok(modulosVisibles('director_obra', TODOS_LOS_MODULOS).includes('laboratorio'));
  assert.ok(!modulosVisibles('director_obra', sinLaboratorio).includes('laboratorio'));
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
    avisoDeModuloAjeno('director_obra', 'obras'),
    'Este módulo es de la gerencia. Si necesita registrar o corregir algo aquí, pídaselo a quien lleve la administración.',
  );
  // Si sí lo alcanza, no hay aviso.
  assert.equal(avisoDeModuloAjeno('almacenista', 'almacen'), null);
});

/**
 * Una sesión de mentira, con lo justo para preguntarle al alcance. Desde la 041 lleva también
 * `obras`: por omisión, la única de `obraId`, que es lo que trae la sesión a quien tiene una.
 */
function sesionDe(rol: Rol, obraId: string | null, obras: string[] = obraId ? [obraId] : []): PersonaEnSesion {
  return {
    id: 'u1',
    usuario: 'prueba',
    nombreCompleto: 'Persona de prueba',
    rol,
    cargo: null,
    obraId,
    obras,
    obrasConNombre: obras.map((id) => ({ id, nombre: `Obra ${id}`, modulos: TODOS_LOS_MODULOS })),
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
  const residente = sesionDe('director_obra', 'obra-a');
  assert.notEqual(filtroDeObra(residente, vehiculos.obraId), undefined);
  assert.ok(alcanzaLaObra(residente, 'obra-a'));
  assert.ok(alcanzaLaObra(residente, null));
  assert.equal(alcanzaLaObra(residente, 'obra-b'), false);
});

prueba('un residente sin obra asignada no alcanza nada', () => {
  // Antes de la spec 001 esto devolvía «sin filtro» y `true`: una cuenta a
  // medio configurar veía más que una bien puesta. Si alguien vuelve a
  // ponerlo así, esta comprobación es lo único que lo va a decir.
  const suelto = sesionDe('director_obra', null);
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

prueba('un horario imposible se rechaza', () => {
  assert.equal(validarHorario(null, '17:00'), 'falta_entrada');
  assert.equal(validarHorario('07:30', null), 'falta_salida');
  assert.equal(validarHorario('07:30', '07:30'), 'salida_antes');
  assert.equal(validarHorario('07:30', '01:00'), 'jornada_imposible');
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

prueba('están los veinticuatro cargos, con slug y rótulo únicos', () => {
  // Quince de la spec 002, más Almacenista y Encargado de Planta (008/RF-14),
  // más Gerente (002/RF-13, añadido el 2026-09-19), más Controlador(a) Vial y
  // Control de Calidad (pedidos por OCC el 2026-09-23), más Laboratorista
  // (018/RF-3), más Encargado de OCC (034/RF-12), más Auxiliar Administrativa
  // (035/RF-8, renombrada en la 040), más Director de Proyectos (041/RF-3).
  assert.equal(CARGOS.length, 24);
  assert.equal(new Set(CARGOS.map((c) => c.id)).size, 24);
  assert.equal(new Set(CARGOS.map((c) => c.nombre)).size, 24);
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

prueba('solo las residencias entran al panel como residente; la dirección, con su acceso (041/RF-3, RF-4)', () => {
  const alPanel = CARGOS.filter((c) => c.rolSugerido === 'residente').map((c) => c.id);
  assert.deepEqual(alPanel, ['residente_1', 'residente_2']);
  assert.deepEqual(
    CARGOS.filter((c) => c.rolSugerido === 'director_obra' || c.rolSugerido === 'director_proyectos').map((c) => c.id),
    ['director_proyectos', 'director'],
  );
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

prueba('039/RF-22: un reporte con solo la final conserva la inicial que ya tenía la máquina', () => {
  type Maquina = { id: string; vehiculoId: string; medidorInicial: number | null; medidorFinal: number | null };
  const parte = {
    maquinaria: [{ id: 'm-1', vehiculoId: 'llq375', medidorInicial: 32600, medidorFinal: null }] as Maquina[],
    personal: [],
    actividades: [],
    clima: [],
    laboratorio: [],
    notas: null,
  };
  const soloFinal = { ...parte, maquinaria: [{ id: 'm-2', vehiculoId: 'llq375', medidorInicial: null, medidorFinal: 32700 }] as Maquina[] };
  assert.deepEqual(fusionarReporteEnParte(parte, soloFinal).maquinaria, [
    { id: 'm-2', vehiculoId: 'llq375', medidorInicial: 32600, medidorFinal: 32700 },
  ]);
  // Si el reporte trae la inicial, manda la del reporte; y una final ya puesta no se borra.
  const conInicial = { ...parte, maquinaria: [{ id: 'm-3', vehiculoId: 'llq375', medidorInicial: 32610, medidorFinal: null }] as Maquina[] };
  const conFinal = { ...parte, maquinaria: [{ id: 'm-1', vehiculoId: 'llq375', medidorInicial: 32600, medidorFinal: 32700 }] as Maquina[] };
  assert.equal(fusionarReporteEnParte(parte, conInicial).maquinaria[0].medidorInicial, 32610);
  assert.equal(fusionarReporteEnParte(conFinal, conInicial).maquinaria[0].medidorFinal, 32700);
});

prueba('039/RF-22: la inicial que puso completarIniciales no pisa la que ya estaba escrita', () => {
  const antes = [
    { vehiculoId: 'llq375', medidorInicial: 32600 },
    { vehiculoId: 'llq376', medidorInicial: null },
  ];
  const fusionadas = [
    { vehiculoId: 'llq375', medidorInicial: 32590, medidorFinal: 32700 },
    { vehiculoId: 'llq376', medidorInicial: 1000, medidorFinal: 1010 },
    { vehiculoId: 'llq377', medidorInicial: 50, medidorFinal: 60 },
  ];
  const resultado = respetarInicialesEscritas(antes, fusionadas, new Set(['llq375', 'llq376', 'llq377']));
  assert.deepEqual(resultado.map((m) => m.medidorInicial), [32600, 1000, 50]);
  // Si la inicial vino escrita en el reporte (no completada), manda la del reporte.
  assert.equal(respetarInicialesEscritas(antes, fusionadas, new Set())[0].medidorInicial, 32590);
  // completarIniciales deja la marca.
  const reporte = {
    maquinaria: [{ vehiculoId: 'llq375', medidorInicial: null, medidorFinal: 32700 }],
  } as unknown as ReporteDelDia;
  const completado = completarIniciales(reporte, { llq375: { valor: 32590, fecha: '2026-10-18', origen: 'bitacora' } });
  assert.deepEqual(
    [completado.maquinaria[0].medidorInicial, completado.maquinaria[0].inicialCompletada],
    [32590, true],
  );
});

prueba('039/RF-21: cambiosDeFinales nombra las finales escritas o corregidas', () => {
  const antes = [
    { vehiculoId: 'a', medidorFinal: 100 },
    { vehiculoId: 'b', medidorFinal: 200 },
    { vehiculoId: 'c', medidorFinal: 300 },
  ];
  const despues = [
    { vehiculoId: 'a', medidorFinal: 100 }, // igual: nada
    { vehiculoId: 'b', medidorFinal: 205.5 }, // corregida
    { vehiculoId: 'c', medidorFinal: null }, // borrada: no se propaga
    { vehiculoId: 'd', medidorFinal: 40 }, // nueva
  ];
  assert.deepEqual(cambiosDeFinales(antes, despues), [
    { vehiculoId: 'b', finalViejo: 200, finalNuevo: 205.5 },
    { vehiculoId: 'd', finalViejo: null, finalNuevo: 40 },
  ]);
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
  assert.deepEqual(aprobada.fotos, { delDia: [] });
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

prueba('las fotos de WhatsApp se eligen solo para «Fotografía del día», sin actividad (039/RF-4)', () => {
  const propuesta = reporteCompleto();
  const conFotos = aprobacion.parse({
    version: 0,
    propuesta,
    fotos: { delDia: ['foto-1', 'foto-2'], porActividad: { '0': 'foto-3' } },
  });
  // La foto por actividad ya no existe: el contrato la descarta.
  assert.deepEqual(conFotos.fotos, { delDia: ['foto-1', 'foto-2'] });
  assert.equal(aprobacion.safeParse({ version: 0, propuesta, fotos: { delDia: 'foto-1' } }).success, false);
  assert.equal(aprobacion.safeParse({ version: 0, propuesta, fotos: { delDia: ['  '] } }).success, false);
});

prueba('asociar un grupo exige la obra o la empresa (021/RF-8, 038/RF-1)', () => {
  // Desde la spec 038 el pedido trae una obra o una empresa, y quién es el dueño lo decide
  // `duenoDelGrupo`; sin ninguno, el servidor responde «Elija la obra o la empresa del grupo».
  assert.deepEqual(duenoDelGrupo(grupoAsociado.parse({})), { tipo: 'ninguno' });
  assert.deepEqual(duenoDelGrupo(grupoAsociado.parse({ obraId: '  ' })), { tipo: 'ninguno' });
  assert.deepEqual(duenoDelGrupo(grupoAsociado.parse({ obraId: 'obra-a' })), { tipo: 'obra', obraId: 'obra-a' });
  assert.deepEqual(duenoDelGrupo(grupoAsociado.parse({ empresaId: 'occ' })), { tipo: 'empresa', empresaId: 'occ' });
  assert.ok('error' in duenoDelGrupo(grupoAsociado.parse({ obraId: 'obra-a', empresaId: 'occ' })));
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

prueba('039/RF-6: horasDeLaPersona devuelve solo lo reportado', () => {
  const h = horasDeLaPersona({ horasLaboradas: 13, extraDiurnas: 3, extraNocturnas: 1, entrada: '07:30', salida: '17:00' });
  assert.deepEqual(h, { trabajados: 13 * 60, extraDiurna: 180, extraNocturna: 60, extra: 240 });
  // Las extra que falten cuentan 0 (025/RF-12).
  assert.deepEqual(horasDeLaPersona({ horasLaboradas: 8 }), { trabajados: 480, extraDiurna: 0, extraNocturna: 0, extra: 0 });
});

prueba('039/RF-7, RF-8: con solo entrada y salida, o solo novedad, no hay horas', () => {
  assert.equal(horasDeLaPersona({ entrada: '07:30', salida: '17:00' }), null);
  assert.equal(horasDeLaPersona({ novedad: 'incapacitado' }), null);
  // Se sigue pudiendo guardar: validarPersonaDelParte no cambia (RF-7).
  assert.equal(validarPersonaDelParte({ entrada: '07:30', salida: '17:00' }), null);
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
    { delDia: 1 },
  );
  assert.deepEqual(bloqueos, []);
});

prueba('025/RF-8: una persona sin nada no deja cerrar, con el mensaje de la regla', () => {
  const bloqueos = bloqueosDelCierre(
    { ...PARTE_COMPLETO, personal: [{ nombre: 'Ana Ruiz', entrada: null, salida: null }] },
    { delDia: 1 },
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

prueba('039/RF-15: el punto es decimal y ya no se sugiere quitarlo', () => {
  // TAY076: «18740.7» se lee tal cual; el aviso de que retrocede queda, sin «¿Quiso decir…?».
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
  assert.match(falta.mensaje, /no puede ser menor que la inicial/);
  assert.doesNotMatch(falta.mensaje, /Quiso decir/);
  assert.equal(reporte.maquinaria[0].medidorFinal, 18740.7, 'la lectura no se toca');
  // Como texto, con coma o con los dos signos (RF-15).
  const comoTexto = resolverPropuesta(
    { fecha_evento: '2026-10-08', maquinaria: [{ equipo: 'Volqueta Kentworth TAY 076', unidad_medidor: 'km', medidor_inicial: '4.250,32', medidor_final: '4260,5 km' }] },
    catalogos,
    { diaDelMensaje: '2026-10-08', destino: 'reporte' },
  );
  assert.deepEqual(
    [comoTexto.reporte.maquinaria[0].medidorInicial, comoTexto.reporte.maquinaria[0].medidorFinal],
    [4250.32, 4260.5],
  );
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
    bloqueosDelCierre(PARTE_COMPLETO, { delDia: soloWhatsapp.fotos.length }),
    [],
  );
  // Todas quitadas: vuelve a faltar.
  const todasQuitadas = unificarFotosDelDia([fotoDeSeccion({ mediaId: 'wa', quitada: true })], []);
  assert.equal(todasQuitadas.fotos.length, 0);
  assert.ok(
    bloqueosDelCierre(PARTE_COMPLETO, { delDia: todasQuitadas.fotos.length }).some((b) =>
      b.includes('Fotografía del día'),
    ),
  );
});

// ---------------------------------------------------------------------------
// Spec 029: medidores encadenados y día por venir
// ---------------------------------------------------------------------------

prueba('039/RF-19: gana la lectura anterior más reciente; si empatan, la de la bitácora', () => {
  // La del vehículo es más nueva que la última bitácora: gana la del vehículo.
  assert.deepEqual(
    lecturaAnterior({ valor: 1250.5, fecha: '2026-10-16' }, { valor: 1300, fecha: '2026-10-18' }, '2026-10-19'),
    { valor: 1300, fecha: '2026-10-18', origen: 'vehiculo' },
  );
  // La bitácora es más nueva: gana la bitácora.
  assert.deepEqual(
    lecturaAnterior({ valor: 1310, fecha: '2026-10-18' }, { valor: 1300, fecha: '2026-10-16' }, '2026-10-19'),
    { valor: 1310, fecha: '2026-10-18', origen: 'bitacora' },
  );
  // Mismo día: la bitácora.
  assert.deepEqual(
    lecturaAnterior({ valor: 1310, fecha: '2026-10-18' }, { valor: 1300, fecha: '2026-10-18' }, '2026-10-19'),
    { valor: 1310, fecha: '2026-10-18', origen: 'bitacora' },
  );
  // Una del vehículo de hoy no cuenta: vale la bitácora de antes.
  assert.deepEqual(
    lecturaAnterior({ valor: 1250.5, fecha: '2026-10-16' }, { valor: 1300, fecha: '2026-10-19' }, '2026-10-19'),
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
  assert.ok(avisoDeLecturaInicial(187500, delVehiculo).aviso?.startsWith('No coincide con la última lectura del vehículo'));
  // 039/RF-18: por debajo de la anterior se avisa distinto, sin bloquear.
  assert.equal(
    avisoDeLecturaInicial(187000, delVehiculo).aviso,
    'Queda por debajo de la última lectura del vehículo (187407, 9-oct). Revise la lectura; se puede guardar igual.',
  );
  assert.equal(
    avisoDeLecturaInicial(4250.3, { valor: 4250.32, fecha: '2026-11-03', origen: 'bitacora' }).aviso,
    'Queda por debajo de la final del día anterior (4250.32, 3-nov). Revise la lectura; se puede guardar igual.',
  );
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
    personal: [
      { usuarioId: 'ana', nombre: 'Ana Ruiz', cargo: 'operador', horasLaboradas: 11, extraDiurnas: 2.5, extraNocturnas: 0 },
      // Una fila vieja: solo entrada y salida. Desde la 039 no tiene horas.
      { usuarioId: 'luis', nombre: 'Luis Peña', cargo: 'ayudante', entrada: '07:00', salida: '18:00' },
    ],
  },
  {
    fecha: '2026-10-06',
    abierta: true,
    personal: [
      { usuarioId: 'ana', nombre: 'Ana Ruiz', cargo: 'conductor', horasLaboradas: 12, extraDiurnas: 2, extraNocturnas: 2 },
      { usuarioId: 'luis', nombre: 'Luis Peña', cargo: 'ayudante', novedad: 'incapacitado' },
    ],
  },
  {
    fecha: '2026-10-07',
    abierta: false,
    personal: [
      { usuarioId: 'ana', nombre: 'Ana Ruiz', cargo: 'conductor', horasLaboradas: 12, extraDiurnas: 4, extraNocturnas: 0 },
      { usuarioId: 'luis', nombre: 'Luis Peña', cargo: 'ayudante', novedad: 'incapacitado' },
    ],
  },
  {
    fecha: '2026-10-08',
    abierta: false,
    personal: [{ usuarioId: 'ana', nombre: 'Ana Ruiz', cargo: 'conductor', horasLaboradas: 12, extraDiurnas: 3, extraNocturnas: 0 }],
  },
];

prueba('030/RF-44, 039/RF-9: horas reportadas por persona y día; sin horas, en blanco', () => {
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
    sinHoras: false,
    abierta: false,
  });
  // La fila vieja, con solo entrada y salida: registrada, sin horas (039/D4).
  assert.deepEqual([luis.dias[0].estado, luis.dias[0].sinHoras, luis.dias[0].laboradas], ['registrada', true, 0]);
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
  assert.equal(luis.diasTrabajados, 0);
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
  for (const rol of ['admin', 'director_obra'] as const) {
    for (const accion of ['ver', 'listar', 'escribir'] as const) {
      assert.ok(alcanza(rol, 'reportes', accion), `${rol} reportes/${accion}`);
    }
    // Desde la 041 anular va aparte de escribir, para que el Residente no anule (RF-33, RF-35).
    assert.ok(alcanza(rol, 'reportes', 'anular'), `${rol} reportes/anular`);
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

prueba('039/RF-17, D4: las exportaciones con lecturas sin miles y las horas no reportadas en blanco', () => {
  const dia = (fecha: string, sinHoras: boolean) => ({
    fecha, estado: 'registrada' as const, laboradas: sinHoras ? 0 : 480, extraDiurna: 0, extraNocturna: 0, novedad: null, sinHoras, abierta: false,
  });
  const datos = {
    obraId: 'obra',
    periodo: { ...periodoDe('semana', '2026-10-07'), dias: SEMANA_DE_PRUEBA },
    abiertas: [],
    cifras: { laboradas: 480, extraDiurna: 0, extraNocturna: 0, personas: 1 },
    obra: { codigo: 'PRUEBA', nombre: 'Obra de prueba' },
    personas: [{
      usuarioId: 'u1', nombre: 'Ana Ruiz', cargo: null, laboradas: 480, extraDiurna: 0, extraNocturna: 0, diasTrabajados: 1,
      novedades: {}, diasConExtraDeMas: [], semanasConExtraDeMas: [],
      dias: [dia('2026-10-05', false), dia('2026-10-06', true)],
    }],
  } as unknown as ReporteDe<'personal'>;
  const [, porDia] = hojasDelReporte('personal', datos);
  assert.deepEqual(porDia.filas[0].slice(2, 6), ['En la bitácora', 8, 0, 0]);
  // Sin horas reportadas: en blanco, no en cero.
  assert.deepEqual(porDia.filas[1].slice(2, 6), ['Horas no reportadas', '', '', '']);
  // Con algún día con horas, el total es lo reportado; sin ninguno, en blanco.
  assert.equal(sinHorasEnElPeriodo(datos.personas[0]), false);
  const soloSinHoras = { ...datos.personas[0], laboradas: 0, dias: [dia('2026-10-06', true)] };
  assert.equal(sinHorasEnElPeriodo(soloSinHoras), true);
  assert.equal(sinHorasEnElPeriodo({ dias: [{ ...dia('2026-10-06', true), novedad: 'incapacidad' }] }), false);
  const [resumenEnBlanco] = hojasDelReporte('personal', { ...datos, personas: [soloSinHoras] } as ReporteDe<'personal'>);
  assert.deepEqual(resumenEnBlanco.filas[0].slice(2, 5), ['', '', '']);

  const hojas = [{ nombre: 'Por día', encabezados: ['Máquina', 'Lectura final'], formatos: { 'Lectura final': 'lectura' as const }, filas: [['LLQ376', 43700.25], ['REC', 1234.5]] }];
  const pagina = paginaParaImprimir({ titulo: 'Máquinas', subtitulo: '', hojas, esMes: false });
  assert.match(pagina, /<td class="numero">43700\.25<\/td>/);
  assert.match(pagina, /<td class="numero">1234\.5<\/td>/);
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

prueba('039/RF-15: la lectura del mantenimiento llega como texto y se lee con punto decimal', () => {
  const propuesta = propuestaDeIa.parse({
    categoria: 'reporte_diario',
    fecha_evento: '2026-10-07',
    mantenimientos: [
      { equipo: 'TFO427', clase: 'aceite', lectura: '5.830 horas', descripcion: 'Aceite' },
      { equipo: 'TFO420', clase: 'preventivo', lectura: '45.210,5', descripcion: 'Revisión' },
      { equipo: 'TFO427', clase: 'correctivo', lectura: '', descripcion: 'Manguera' },
    ],
  });
  const { reporte } = resolverPropuesta(propuesta, CATALOGOS_DEL_MANTENIMIENTO, {
    diaDelMensaje: '2026-10-07',
    destino: 'reporte',
  });
  assert.deepEqual(reporte.mantenimientos?.map((m) => m.lectura), [5.83, 45210.5, null]);
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
  for (const rol of ['admin', 'director_obra'] as const) {
    for (const accion of ['ver', 'listar', 'escribir'] as const) {
      assert.ok(alcanza(rol, 'contrato', accion), `${rol} contrato/${accion}`);
    }
    assert.ok(modulosVisibles(rol).includes('contrato'), rol);
  }
  assert.equal(alcanza('admin', 'contrato', 'aprobar'), true);
  assert.equal(alcanza('director_obra', 'contrato', 'aprobar'), false);
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
  // Desde la 040 (RF-15) el residente, el almacenista y el laboratorista también consultan las
  // solicitudes, y el laboratorista la Bitácora de Geolab: su prueba es la de 040/RF-15.
  assert.deepEqual(de('director_obra'), {
    usa: true,
    obras: ['obra-a'],
    modulos: [
      'bitacoras', 'preoperacionales', 'almacen', 'cantera', 'laboratorio', 'whatsapp', 'reportes', 'contrato', 'cumplimiento',
      'vehiculos', 'personas', 'solicitudes',
    ],
    empresas: [],
    bitacorasDeEmpresa: [],
  });
  assert.deepEqual(de('almacenista').modulos, ['almacen', 'solicitudes']);
  assert.deepEqual(de('encargado_planta').modulos, ['cantera']);
  assert.deepEqual(de('laboratorista').modulos, ['laboratorio', 'solicitudes', 'bitacora_empresa']);
  // RF-2: el operador no lo usa.
  assert.deepEqual(de('operador'), { usa: false, obras: [], modulos: [], empresas: [], bitacorasDeEmpresa: [] });
  // Solo gerencia alcanza todas las obras; los demás, la suya.
  assert.deepEqual(de('almacenista').obras, ['obra-a']);
});

prueba('043/RF-89, RF-94, RF-95: el cumplimiento lo consultan quienes lo ven en el panel, y nadie más', () => {
  const de = (rol: Rol, obraId: string | null = 'obra-a', obras?: string[]) => alcanceDelAsistente({ rol, obraId, obras, modulosDeObra: TODOS_LOS_MODULOS });
  for (const rol of ['admin', 'director_proyectos'] as const) {
    assert.ok(de(rol, null).modulos.includes('cumplimiento'), rol);
    assert.equal(de(rol, null).obras, 'todas');
  }
  // El Residente sí lo consulta (en cantidades, lo quita la consulta) y el Director de Obra también.
  for (const rol of ['residente', 'director_obra'] as const) assert.ok(de(rol).modulos.includes('cumplimiento'), rol);
  for (const rol of ['almacenista', 'encargado_planta', 'laboratorista', 'encargado_occ', 'auxiliar_administrativa', 'operador'] as const) {
    assert.ok(!de(rol, rol === 'encargado_occ' || rol === 'auxiliar_administrativa' ? null : 'obra-a').modulos.includes('cumplimiento'), rol);
  }
  // RF-95: el Director de Obra con dos obras responde solo de la que tiene en uso.
  const director = de('director_obra', 'obra-a', ['obra-a', 'obra-b']);
  assert.deepEqual(director.obras, ['obra-a']);
  assert.equal(obraAlAlcance(director, 'obra-b'), false);
  // Sin obra no hay cumplimiento que consultar.
  assert.ok(!de('residente', null).modulos.includes('cumplimiento'));
  assert.ok(!de('director_obra', null, ['obra-a', 'obra-b']).modulos.includes('cumplimiento'));
});

prueba('028/RF-5, RF-10: un módulo apagado en la obra queda fuera, y sin obra no hay nada', () => {
  const sinAlmacen = { ...TODOS_LOS_MODULOS, almacen: false };
  const residente = alcanceDelAsistente({ rol: 'director_obra', obraId: 'obra-a', modulosDeObra: sinAlmacen });
  assert.ok(!residente.modulos.includes('almacen'));
  assert.ok(residente.modulos.includes('cantera'));
  // El almacenista de una obra sin almacén no alcanza el almacén; desde la 040, sí sus solicitudes.
  assert.deepEqual(alcanceDelAsistente({ rol: 'almacenista', obraId: 'obra-a', modulosDeObra: sinAlmacen }).modulos, ['solicitudes']);
  // La gerencia no se filtra por los módulos de una obra (017/RF-10).
  assert.ok(alcanceDelAsistente({ rol: 'admin', obraId: null, modulosDeObra: sinAlmacen }).modulos.includes('almacen'));
  // RF-10: residente sin obra.
  assert.deepEqual(alcanceDelAsistente({ rol: 'director_obra', obraId: null, modulosDeObra: TODOS_LOS_MODULOS }), {
    usa: true,
    obras: [],
    modulos: [],
    empresas: [],
    bitacorasDeEmpresa: [],
  });
});

prueba('028/RF-4, RF-6: la obra se decide por quién pregunta', () => {
  const residente = alcanceDelAsistente({ rol: 'director_obra', obraId: 'obra-a', modulosDeObra: TODOS_LOS_MODULOS });
  assert.equal(obraAlAlcance(residente, 'obra-a'), true);
  assert.equal(obraAlAlcance(residente, 'obra-b'), false);
  assert.equal(obraAlAlcance(alcanceDelAsistente({ rol: 'admin', obraId: null, modulosDeObra: TODOS_LOS_MODULOS }), 'obra-b'), true);
});

prueba('028/RF-9, RF-49: una conversación se muestra entera solo si todavía se alcanza lo que consultó', () => {
  const residenteA = alcanceDelAsistente({ rol: 'director_obra', obraId: 'obra-a', modulosDeObra: TODOS_LOS_MODULOS });
  const deCantera = { obras: ['obra-a'], modulos: ['cantera' as const] };
  assert.equal(conversacionVisible(deCantera, residenteA), true);
  // Le cambiaron la obra: lo de la obra A ya no.
  const residenteB = alcanceDelAsistente({ rol: 'director_obra', obraId: 'obra-b', modulosDeObra: TODOS_LOS_MODULOS });
  assert.equal(conversacionVisible(deCantera, residenteB), false);
  // Le apagaron Cantera en su obra.
  const sinCantera = alcanceDelAsistente({ rol: 'director_obra', obraId: 'obra-a', modulosDeObra: { ...TODOS_LOS_MODULOS, cantera: false } });
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
  const residente = alcanceDelAsistente({ rol: 'director_obra', obraId: 'obra-a', modulosDeObra: sinAlmacen });
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
  const alcanceDe = (rol: Rol, modulosDeObra = TODOS_LOS_MODULOS) => alcanceDelAsistente({ rol, obraId: 'obra-a', modulosDeObra });
  const gerencia = ejemplosDePregunta(alcanceDe('admin'));
  assert.equal(gerencia.length, 3);
  assert.ok(gerencia.some((p) => p.includes('reporte')));
  for (const rol of ROLES_DEL_ASISTENTE) {
    const ejemplos = ejemplosDePregunta(alcanceDe(rol));
    assert.ok(ejemplos.length >= 1 && ejemplos.length <= 3, rol);
  }
  assert.ok(ejemplosDePregunta(alcanceDe('almacenista')).every((p) => /almac|stock/i.test(p)));
  assert.ok(ejemplosDePregunta(alcanceDe('encargado_planta')).every((p) => /cantera/i.test(p)));
  assert.ok(ejemplosDePregunta(alcanceDe('laboratorista')).every((p) => /ensayo|granulometr/i.test(p)));
  // Módulo apagado: al almacenista le quedan solo sus solicitudes (040), y al residente ninguno de almacén.
  assert.ok(ejemplosDePregunta(alcanceDe('almacenista', sinAlmacen)).every((p) => /solicitudes/i.test(p)));
  assert.ok(ejemplosDePregunta(alcanceDe('director_obra', sinAlmacen)).every((p) => !/almac|stock/i.test(p)));
  // Sin nada a su alcance, ningún ejemplo.
  assert.deepEqual(ejemplosDePregunta(alcanceDe('encargado_planta', { ...TODOS_LOS_MODULOS, cantera: false })), []);
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
const FOTO_DEL_DIA_032 = { delDia: 1 };

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
  assert.deepEqual(bloqueosDelCierre({ ...PARTE_SIN_ACTIVIDADES_032, actividades: [{ id: 'a' }] }, { delDia: 1 }), [
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
  // Con Planificación y Cumplimiento después de Documentos desde la spec 043 (RF-86, RF-88), y el
  // Plan semanal detrás desde la 044 (RF-78).
  assert.deepEqual(paginas(menuDeObra('admin')), [
    'bitacoras', 'whatsapp', 'reportes', 'recursos-humanos', 'calidad', 'almacen',
    'preoperacionales', 'asignaciones', 'cantera', 'contrato', 'documentos', 'planificacion', 'cumplimiento',
    'plan-semanal', 'solicitudes-compra', 'solicitudes-pago', 'asistente',
  ]);
  assert.equal(menuDeObra('admin')[2].titulo, 'Reportes e informes');
  // Calidad es el laboratorio de la obra: se apaga con él.
  const sinCanteraNiLaboratorio = { almacen: true, cantera: false, laboratorio: false };
  assert.deepEqual(paginas(menuDeObra('admin', sinCanteraNiLaboratorio)), [
    'bitacoras', 'whatsapp', 'reportes', 'recursos-humanos', 'almacen', 'preoperacionales',
    'asignaciones', 'contrato', 'documentos', 'planificacion', 'cumplimiento', 'plan-semanal', 'solicitudes-compra', 'solicitudes-pago', 'asistente',
  ]);
});

prueba('043/RF-86, RF-88, RF-90: Planificación y Cumplimiento en el menú de la obra, según el acceso', () => {
  const tiene = (rol: Rol) => paginas(menuDeObra(rol)).filter((p) => p === 'planificacion' || p === 'cumplimiento');
  for (const rol of ['admin', 'director_proyectos', 'director_obra'] as const) assert.deepEqual(tiene(rol), ['planificacion', 'cumplimiento'], rol);
  assert.deepEqual(tiene('residente'), ['cumplimiento']);
  for (const rol of ['almacenista', 'encargado_planta', 'laboratorista', 'operador'] as const) assert.deepEqual(tiene(rol), [], rol);
  const planificacion = menuDeObra('admin').find((m) => m.pagina === 'planificacion');
  assert.equal(planificacion?.titulo, 'Planificación');
  assert.equal(menuDeObra('admin').find((m) => m.pagina === 'cumplimiento')?.titulo, 'Cumplimiento');
  // No dependen de los módulos que la obra apaga.
  assert.deepEqual(paginas(menuDeObra('residente', { almacen: false, cantera: false, laboratorio: false })).filter((p) => p === 'cumplimiento'), ['cumplimiento']);
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
    // Desde la 041, los tres cargos de obra (RF-59).
    ['admin', 'residente', 'almacenista', 'laboratorista', 'encargado_occ', 'director_proyectos', 'director_obra'],
  );
  // Documentos dejó de ser solo de la gerencia con la spec 034: su prueba es la de 034/RF-4.
  // La Auxiliar Administrativa ve todo lo de Elemental desde la spec 035 (RF-10).
  for (const modulo of ['compras', 'tesoreria', 'licitaciones'] as const) {
    assert.deepEqual(ROLES.filter((r) => alcanza(r, modulo, 'ver')), ['admin', 'auxiliar_administrativa'], modulo);
  }
  // Desde la spec 040 (RF-4, RF-6) aprueba también la Auxiliar Administrativa.
  for (const modulo of ['compras', 'tesoreria'] as const) {
    assert.deepEqual(ROLES.filter((r) => alcanza(r, modulo, 'aprobar')), ['admin', 'auxiliar_administrativa'], modulo);
  }
  assert.equal(
    motivoDeRechazo('compras', 'aprobar'),
    'No puede aprobar ni rechazar solicitudes de compra: lo hacen la gerencia y la auxiliar administrativa.',
  );
  // Recursos Humanos: lo llevan gerencia y la Auxiliar Administrativa (035); el residente consulta el de su obra.
  // El Encargado de OCC y el laboratorista consultan el de su empresa (035/RF-4).
  assert.deepEqual(ROLES.filter((r) => alcanza(r, 'rrhh', 'ver')), [
    'admin',
    'residente',
    'laboratorista',
    'encargado_occ',
    'auxiliar_administrativa',
    'director_proyectos',
    'director_obra',
  ]);
  assert.equal(alcanza('residente', 'rrhh', 'escribir'), false);
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
  const residente = { rol: 'director_obra' as const, obraId: 'o1' };
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
  // La Auxiliar Administrativa sí entra a Recursos Humanos; a Tesorería también la ve.
  const auxiliar = { rol: 'auxiliar_administrativa' as const, obraId: null };
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
  assert.deepEqual(paginas(menuDeObra('director_obra')), [
    'bitacoras', 'whatsapp', 'reportes', 'recursos-humanos', 'calidad', 'almacen',
    'preoperacionales', 'asignaciones', 'cantera', 'contrato', 'documentos', 'planificacion', 'cumplimiento',
    'plan-semanal', 'solicitudes-compra', 'solicitudes-pago', 'asistente',
  ]);
  // Todo lo que el residente veía antes sigue en algún menú suyo (RF-21). Personas, que la
  // 041 le abrió para dar accesos de obra, no es una entrada del menú de la obra: es la pestaña
  // Accesos de Recursos Humanos.
  for (const rol of ['residente', 'director_obra'] as const) {
    const antes = modulosVisibles(rol).filter((m) => m !== 'inicio' && m !== 'personas');
    const ahora = new Set(menuDeObra(rol).map((m) => m.permiso));
    assert.deepEqual(antes.filter((m) => !ahora.has(m)), [], rol);
  }
  assert.deepEqual(paginas(menuDeObra('almacenista')), [
    'almacen', 'solicitudes-compra', 'solicitudes-pago', 'asistente',
  ]);
  assert.deepEqual(paginas(menuDeObra('encargado_planta')), ['cantera', 'asistente']);
  assert.deepEqual(paginas(menuDeObra('almacenista', { almacen: false, cantera: true, laboratorio: true })), [
    'solicitudes-compra', 'solicitudes-pago', 'asistente',
  ]);
  // Con los documentos de Geolab desde la spec 034 (RF-7), y su Bitácora y sus Reportes de
  // WhatsApp desde la 038 (RF-27 a RF-29).
  assert.deepEqual(paginas(menuDeEmpresa('geolab', 'laboratorista')), [
    'bitacora', 'whatsapp', 'laboratorio', 'documentos', 'recursos-humanos', 'solicitudes-compra', 'solicitudes-pago', 'asistente',
  ]);
  for (const rol of ROLES.filter((r) => r !== 'admin')) {
    for (const accion of ['ver', 'listar', 'escribir', 'anular'] as const) {
      // La auxiliar consulta los cortes desde la 037 (D9) y desde la 040 registra y anula los de
      // Elemental (D3): su prueba es la de 040/RF-7.
      const auxiliar = rol === 'auxiliar_administrativa';
      assert.equal(alcanza(rol, 'finanzas', accion), auxiliar, `${rol} finanzas/${accion}`);
      assert.equal(alcanza(rol, 'empresa', accion), false, `${rol} empresa/${accion}`);
    }
  }
  assert.ok(alcanza('admin', 'finanzas', 'anular'));
  assert.equal(alcanza('admin', 'finanzas', 'aprobar'), false);
  assert.equal(
    motivoDeRechazo('finanzas', 'escribir'),
    'No puede registrar cortes financieros: lo hacen la gerencia y la auxiliar administrativa.',
  );
  assert.equal(motivoDeRechazo('empresa', 'escribir'), 'No puede cambiar los datos de la empresa: lo hace la gerencia.');
});

prueba('033/RF-12: cada rol entra a su empresa, y a Proyectos solo con su obra', () => {
  for (const e of EMPRESAS) assert.ok(alcanzaLaEmpresa('admin', e.id), e.id);
  assert.deepEqual(
    EMPRESAS.filter((e) => alcanzaLaEmpresa('director_obra', e.id)).map((e) => e.id),
    ['proyectos'],
  );
  assert.deepEqual(
    EMPRESAS.filter((e) => alcanzaLaEmpresa('laboratorista', e.id)).map((e) => e.id),
    ['geolab'],
  );
  assert.deepEqual(EMPRESAS.filter((e) => alcanzaLaEmpresa('operador', e.id)), []);

  assert.ok(alcanzaLaObraDeLaRuta({ rol: 'admin', obraId: null }, 'cualquiera'));
  assert.ok(alcanzaLaObraDeLaRuta({ rol: 'director_obra', obraId: 'o1' }, 'o1'));
  assert.equal(alcanzaLaObraDeLaRuta({ rol: 'director_obra', obraId: 'o1' }, 'o2'), false);
  assert.equal(alcanzaLaObraDeLaRuta({ rol: 'director_obra', obraId: null }, 'o1'), false);
  assert.ok(alcanzaLaObraDeLaRuta({ rol: 'almacenista', obraId: 'o1' }, 'o1'));
  // El laboratorista no entra a Proyectos aunque tenga obra: su lugar es Geolab.
  assert.equal(alcanzaLaObraDeLaRuta({ rol: 'laboratorista', obraId: 'o1' }, 'o1'), false);
});

prueba('033/RF-45, RF-46: la empresa de la persona, o la de su rol si no tiene', () => {
  assert.equal(empresaDeLaPersona(null, 'operador'), 'occ');
  assert.equal(empresaDeLaPersona(null, 'laboratorista'), 'geolab');
  assert.equal(empresaDeLaPersona(null, 'director_obra'), 'proyectos');
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
  assert.equal(destinoAlEntrar({ rol: 'director_obra', obras: ['o1'] }), '/panel/proyectos/o1');
  // Con varias obras o sin ninguna, la lista de Proyectos (RF-7 y caso límite).
  assert.equal(destinoAlEntrar({ rol: 'director_obra', obras: ['o1', 'o2'] }), '/panel/proyectos');
  assert.equal(destinoAlEntrar({ rol: 'director_obra', obras: [] }), '/panel/proyectos');
  assert.equal(destinoAlEntrar({ rol: 'laboratorista', obras: ['o1'] }), '/panel/geolab/laboratorio');
  // Almacenista y encargado de planta, a su módulo como hoy (008/RF-4).
  assert.equal(destinoAlEntrar({ rol: 'almacenista', obras: ['o1'] }), '/panel/proyectos/o1/almacen');
  assert.equal(destinoAlEntrar({ rol: 'encargado_planta', obras: ['o1'] }), '/panel/proyectos/o1/cantera');
  assert.equal(destinoAlEntrar({ rol: 'operador', obras: ['o1'] }), null);
});

prueba('033/RF-47: las direcciones de antes llevan a su pantalla dentro de la empresa', () => {
  const gerencia = { rol: 'admin' as const, obraId: null };
  const residente = { rol: 'director_obra' as const, obraId: 'o1' };
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
    rutaNueva('/panel/personas', { rol: 'auxiliar_administrativa', obraId: null }),
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
  assert.deepEqual(menuDelLugar(null, 'director_obra'), { navegacion: [], entradas: [] });

  // Dentro de una empresa: «← Empresas» y su menú, con sus rutas.
  const occ = menuDelLugar({ tipo: 'empresa', empresa: 'occ', pagina: 'vehiculos' }, 'admin');
  assert.deepEqual(occ.navegacion, [{ clave: 'empresas', titulo: '← Empresas', ruta: '/panel' }]);
  assert.equal(occ.entradas.length, 11);
  assert.deepEqual(occ.entradas[7], { clave: 'asignaciones', titulo: 'Asignaciones', ruta: '/panel/occ/asignaciones' });

  // El laboratorista en Geolab: sin «← Empresas», que no tiene a dónde ir.
  const geolab = menuDelLugar({ tipo: 'empresa', empresa: 'geolab', pagina: null }, 'laboratorista');
  assert.deepEqual(geolab.navegacion, []);
  // Con su Bitácora y sus Reportes de WhatsApp desde la spec 038 (RF-27 a RF-29).
  assert.deepEqual(titulos(geolab.entradas), [
    'Bitácora', 'Reportes de WhatsApp', 'Laboratorio', 'Documentos', 'Recursos Humanos', 'Solicitudes de compra', 'Solicitudes de pago', 'Asistente',
  ]);

  // En una obra: «Cambiar de obra» para la gerencia, y sin los módulos apagados.
  const obra = menuDelLugar({ tipo: 'obra', obraId: 'o1', pagina: 'bitacoras' }, 'admin', {
    almacen: false, cantera: true, laboratorio: false,
  });
  assert.deepEqual(titulos(obra.navegacion), ['← Empresas', 'Cambiar de obra']);
  // Desde la 041 (RF-67) la lista lleva la página de ahora, para abrir la misma en la otra obra.
  assert.equal(obra.navegacion[1].ruta, '/panel/proyectos?ir=bitacoras');
  assert.ok(!obra.entradas.some((e) => e.clave === 'almacen' || e.clave === 'calidad'));
  assert.equal(obra.entradas.find((e) => e.clave === 'bitacoras')?.ruta, '/panel/proyectos/o1/bitacoras');
  // El residente en su obra: su menú, sin ir y venir.
  assert.deepEqual(menuDelLugar({ tipo: 'obra', obraId: 'o1', pagina: null }, 'director_obra').navegacion, []);
  // La lista de obras: solo volver.
  assert.deepEqual(menuDelLugar({ tipo: 'proyectos' }, 'admin').entradas, []);

  // Con la persona, donde no entra el menú sale vacío (RF-12; visto en la demo de la T22).
  const laResidente = { rol: 'director_obra' as const, obraId: 'o1' };
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
  assert.equal(puedeCambiarRol('director_obra', 'encargado_occ'), false);
  // El asistente: todas las obras, con los módulos de OCC que alcanza.
  const alcance = alcanceDelAsistente({ ...encargado, modulosDeObra: TODOS_LOS_MODULOS });
  assert.equal(alcance.obras, 'todas');
  // Desde la 040 (RF-15), también las solicitudes de OCC y la Bitácora de OCC.
  assert.deepEqual(alcance.modulos, ['bitacoras', 'preoperacionales', 'whatsapp', 'reportes', 'vehiculos', 'solicitudes', 'bitacora_empresa']);
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
    menuDeObra('director_obra', { almacen: false, cantera: false, laboratorio: false }).some((m) => m.pagina === 'documentos'),
  );
  // RF-4 a RF-8: ven y suben gerencia, residente, laboratorista y Encargado de OCC; desde la
  // spec 035, también la Auxiliar Administrativa en los de Elemental (035/RF-10). Nadie más.
  assert.deepEqual(
    ROLES.filter((r) => alcanza(r, 'documentos', 'ver')),
    // Desde la 041, los tres cargos de obra (RF-59).
    ['admin', 'residente', 'laboratorista', 'encargado_occ', 'auxiliar_administrativa', 'director_proyectos', 'director_obra'],
  );
  assert.deepEqual(
    ROLES.filter((r) => alcanza(r, 'documentos', 'escribir')),
    ['admin', 'residente', 'laboratorista', 'encargado_occ', 'auxiliar_administrativa', 'director_proyectos', 'director_obra'],
  );
  // RF-10: anula la gerencia y, desde la spec 040 (RF-8), la Auxiliar Administrativa en lo
  // de Elemental (el lugar lo cierra `alcanzaLaEmpresa`).
  assert.deepEqual(ROLES.filter((r) => alcanza(r, 'documentos', 'anular')), ['admin', 'auxiliar_administrativa']);
  const tiene = (menu: { pagina: string }[]) => menu.some((m) => m.pagina === 'documentos');
  // RF-5: el residente, en su obra.
  assert.ok(tiene(menuDeObra('director_obra')));
  // RF-6, RF-7: cada uno en su empresa, y a las demás no entra.
  assert.ok(tiene(menuDeEmpresa('geolab', 'laboratorista')));
  assert.ok(tiene(menuDeEmpresa('occ', 'encargado_occ')));
  assert.equal(alcanzaLaEmpresa('laboratorista', 'occ'), false);
  assert.equal(alcanzaLaEmpresa('director_obra', 'occ'), false);
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
  const residente = sesionDe('director_obra', 'obra-a');
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
  assert.equal(reparoDelAccesoSinObra({ rol: 'director_obra', obraId: 'o1', empresa: 'proyectos' }), null);
  assert.equal(reparoDelAccesoSinObra({ rol: 'operador', obraId: 'o1', empresa: 'occ' }), null);
});

prueba('035/RF-8: la Auxiliar Administrativa es de Elemental y no lleva obra', () => {
  assert.equal(empresaDelAccesoSinObra('auxiliar_administrativa'), 'elemental');
  assert.equal(empresaDelAccesoSinObra('encargado_occ'), 'occ');
  assert.equal(empresaDelAccesoSinObra('director_obra'), null);
  assert.equal(reparoDelAccesoSinObra({ rol: 'auxiliar_administrativa', obraId: null, empresa: 'elemental' }), null);
  assert.equal(reparoDelAccesoSinObra({ rol: 'auxiliar_administrativa', obraId: null, empresa: null }), null);
  const conObra = reparoDelAccesoSinObra({ rol: 'auxiliar_administrativa', obraId: 'o1', empresa: 'elemental' });
  assert.equal(conObra?.campo, 'obraId');
  assert.match(conObra?.mensaje ?? '', /no lleva obra/);
  assert.deepEqual(reparoDelAccesoSinObra({ rol: 'auxiliar_administrativa', obraId: null, empresa: 'occ' }), {
    campo: 'empresa',
    mensaje: 'La Auxiliar Administrativa es de Elemental.',
  });
});

prueba('035/RF-11: el selector de Acceso ofrece solo lo que cada rol puede dar', () => {
  assert.deepEqual(rolesQuePuedeDar('auxiliar_administrativa'), ['operador']);
  assert.deepEqual(rolesQuePuedeDar('admin'), [...ROLES]);
  // Desde la 041 (RF-26, RF-38).
  assert.deepEqual(rolesQuePuedeDar('residente'), ['operador']);
  assert.deepEqual(rolesQuePuedeDar('director_obra'), ['residente', 'operador', 'almacenista', 'encargado_planta', 'laboratorista']);
  for (const rol of ['operador', 'almacenista', 'encargado_planta', 'laboratorista', 'encargado_occ'] as const) {
    assert.deepEqual(rolesQuePuedeDar(rol), [], rol);
  }
});

prueba('035/RF-8 a RF-11: la Auxiliar Administrativa entra a Elemental y solo a Elemental', () => {
  const auxiliar = { rol: 'auxiliar_administrativa' as const, obraId: null };
  // RF-9: sin tarjetas. Desde la 040 entra a Compras (su prueba es la de 040/RF-3).
  assert.equal(destinoAlEntrar({ rol: 'auxiliar_administrativa', obras: [] }), '/panel/elemental/compras');
  assert.ok(alcanzaLaEmpresa('auxiliar_administrativa', 'elemental'));
  for (const empresa of ['occ', 'geolab', 'proyectos'] as const) {
    assert.equal(alcanzaLaEmpresa('auxiliar_administrativa', empresa), false, empresa);
  }
  assert.equal(alcanzaLaObraDeLaRuta(auxiliar, 'o1'), false);
  // RF-10: el menú de Elemental sin «← Empresas». Desde la 040 (RF-12) con el Asistente.
  const menu = menuDelLugar({ tipo: 'empresa', empresa: 'elemental', pagina: null }, 'auxiliar_administrativa');
  assert.deepEqual(menu.navegacion, []);
  assert.deepEqual(
    menu.entradas.map((m) => m.clave),
    ['recursos-humanos', 'compras', 'tesoreria', 'documentos', 'licitaciones', 'asistente'],
  );
  // La dirección de antes del asistente la lleva al suyo, en Elemental.
  assert.equal(rutaNueva('/panel/asistente', auxiliar), '/panel/elemental/asistente');
  // Recursos Humanos entero; las pestañas Personas (escribe) y Obras (consulta).
  for (const accion of ['ver', 'listar', 'escribir', 'anular'] as const) assert.ok(alcanza('auxiliar_administrativa', 'rrhh', accion), accion);
  assert.ok(alcanza('auxiliar_administrativa', 'personas', 'escribir') && !alcanza('auxiliar_administrativa', 'personas', 'activar'));
  assert.ok(alcanza('auxiliar_administrativa', 'obras', 'ver') && !alcanza('auxiliar_administrativa', 'obras', 'escribir'));
  // Documentos, Compras y Tesorería: desde la 040 los lleva enteros (su prueba es la de 040/RF-4 a RF-8).
  // Nada de las obras. El Asistente sí, desde la 040 (RF-12).
  for (const modulo of ['bitacoras', 'preoperacionales', 'contrato', 'almacen', 'laboratorio', 'whatsapp', 'vehiculos'] as const) {
    assert.equal(alcanza('auxiliar_administrativa', modulo, 'ver'), false, modulo);
  }
  // RF-11: solo da el acceso de operador (una persona sin panel); los demás, la gerencia.
  assert.ok(puedeCambiarRol('auxiliar_administrativa', 'operador'));
  for (const rol of ['admin', 'director_obra', 'auxiliar_administrativa', 'encargado_occ', 'laboratorista'] as const) {
    assert.equal(puedeCambiarRol('auxiliar_administrativa', rol), false, rol);
  }
  assert.ok(puedeCambiarRol('admin', 'auxiliar_administrativa'));
  // RF-8: el cargo y su empresa.
  assert.equal(cargoPorId('auxiliar_administrativa')?.rolSugerido, 'auxiliar_administrativa');
  assert.equal(empresaDeLaPersona(null, 'auxiliar_administrativa'), 'elemental');
  // Lleva el personal de todas las obras: no es una cuenta «sin obra».
  assert.equal(sinObraAsignada('auxiliar_administrativa', null), false);
  // Y las fotos de las obras no las alcanza: no tiene sus módulos.
  assert.equal(alcanzaLaImagen(sesionDe('auxiliar_administrativa', null), { existe: true, obraId: 'o1' }, 'bitacoras'), false);
  // Lo de antes la lleva a su entrada (Compras desde la 040), nunca a una obra.
  assert.equal(rutaNueva('/panel/bitacoras?obraId=o1', auxiliar), '/panel/elemental/compras');
});

prueba('040/RF-1, RF-2: el acceso se llama «Auxiliar Administrativa», y el cargo también', () => {
  assert.ok(ROLES.includes('auxiliar_administrativa'));
  assert.equal((ROLES as readonly string[]).includes('auxiliar_rrhh'), false);
  assert.equal(ETIQUETA_ROL.auxiliar_administrativa, 'Auxiliar Administrativa');
  assert.equal(nombreDeCargo('auxiliar_administrativa'), 'Auxiliar Administrativa');
  assert.equal(cargoPorId('auxiliar_rrhh'), undefined);
  // Ningún rótulo de acceso ni de cargo nombra ya Recursos Humanos como acceso.
  assert.equal(Object.values(ETIQUETA_ROL).some((e) => /recursos humanos/i.test(e)), false);
  assert.equal(CARGOS.some((c) => /recursos humanos/i.test(c.nombre)), false);
});

prueba('040/RF-3: entra solo a Elemental, y directo a Compras', () => {
  assert.equal(destinoAlEntrar({ rol: 'auxiliar_administrativa', obras: [] }), '/panel/elemental/compras');
  for (const empresa of ['occ', 'geolab', 'proyectos'] as const) {
    assert.equal(alcanzaLaEmpresa('auxiliar_administrativa', empresa), false, empresa);
  }
  const menu = menuDelLugar({ tipo: 'empresa', empresa: 'elemental', pagina: null }, 'auxiliar_administrativa');
  assert.ok(menu.entradas.some((m) => m.clave === 'compras'));
});

prueba('040/RF-4 a RF-6, D2: aprueba, registra y anula compras y pagos como la gerencia', () => {
  for (const modulo of ['compras', 'tesoreria'] as const) {
    for (const accion of ['ver', 'listar', 'escribir', 'anular', 'aprobar'] as const) {
      assert.equal(alcanza('auxiliar_administrativa', modulo, accion), alcanza('admin', modulo, accion), `${modulo}/${accion}`);
      assert.ok(alcanza('auxiliar_administrativa', modulo, accion), `${modulo}/${accion}`);
    }
  }
  // No pide compras ni pagos: no es un lugar que compre (plan, decisión de `recibir`).
  assert.equal(alcanza('auxiliar_administrativa', 'solicitudes', 'escribir'), false);
});

prueba('040/RF-8, RF-10: Recursos Humanos y Documentos con anular; Licitaciones', () => {
  for (const accion of ['ver', 'listar', 'escribir', 'anular'] as const) {
    assert.ok(alcanza('auxiliar_administrativa', 'rrhh', accion), `rrhh/${accion}`);
    assert.ok(alcanza('auxiliar_administrativa', 'documentos', accion), `documentos/${accion}`);
  }
  assert.ok(alcanza('auxiliar_administrativa', 'licitaciones', 'ver'));
  // D4: ve el salario.
  assert.ok(veElSalario('auxiliar_administrativa'));
  // Nada de las obras.
  for (const modulo of ['bitacoras', 'preoperacionales', 'contrato', 'almacen', 'cantera', 'laboratorio', 'whatsapp', 'vehiculos'] as const) {
    assert.equal(alcanza('auxiliar_administrativa', modulo, 'ver'), false, modulo);
  }
});

prueba('040/RF-7, D3: registra y anula los cortes de Elemental; los demás, solo los consulta', () => {
  for (const accion of ['ver', 'listar', 'escribir', 'anular'] as const) {
    assert.ok(alcanza('auxiliar_administrativa', 'finanzas', accion), accion);
  }
  const auxiliar = 'auxiliar_administrativa' as const;
  assert.equal(porQueNoPuedeTocarElCorte(auxiliar, { empresaId: 'elemental' }), null);
  for (const empresaId of ['occ', 'geolab'] as const) {
    assert.equal(
      porQueNoPuedeTocarElCorte(auxiliar, { empresaId }),
      'Solo la gerencia registra o anula los cortes de ' + (empresaId === 'occ' ? 'OCC' : 'Geolab') + '.',
      empresaId,
    );
  }
  assert.equal(porQueNoPuedeTocarElCorte(auxiliar, { obraId: 'o1' }), 'Solo la gerencia registra o anula los cortes de las obras.');
  // La gerencia, en cualquier lugar.
  for (const lugar of [{ empresaId: 'elemental' }, { empresaId: 'occ' }, { empresaId: 'geolab' }, { obraId: 'o1' }] as const) {
    assert.equal(porQueNoPuedeTocarElCorte('admin', lugar), null);
  }
  // Quien no tiene el permiso tampoco pasa por aquí: lo dice la tabla.
  assert.equal(alcanza('director_obra', 'finanzas', 'escribir'), false);
});

prueba('040/RF-5, RF-6: recibe desde Compras sin poder pedir, y ve el gasto y los pagos', () => {
  const auxiliar = { id: 'x1', rol: 'auxiliar_administrativa' as const };
  const comprada = { estado: 'comprada' as const, pedidaPor: 'r1', tieneCompraVigente: true };
  assert.ok(puedeDar('recibir', auxiliar, comprada));
  assert.ok(puedeDar('anular_compra', auxiliar, comprada));
  // Corregir y cancelar siguen siendo de quien la pidió, y ella no pide.
  assert.equal(puedeDar('cancelar', auxiliar, { ...comprada, estado: 'enviada' }), false);
  assert.ok(veElGasto('auxiliar_administrativa'));
  assert.ok(veLosPagos('auxiliar_administrativa'));
  assert.equal(veLosPagos('encargado_occ'), false);
});

prueba('040/RF-9, caso límite: dos personas deciden la misma solicitud; la segunda sabe quién fue', () => {
  const ana = { paso: 'aprobar', porId: 'g1', nombre: 'Ana Gerente' };
  // La auxiliar llega tarde a aprobar o a devolver: se le dice quién la aprobó.
  assert.equal(yaLaDecidioOtro('aprobar', ana, 'x1'), 'Esta solicitud ya fue aprobada por Ana Gerente.');
  assert.equal(yaLaDecidioOtro('devolver', ana, 'x1'), 'Esta solicitud ya fue aprobada por Ana Gerente.');
  assert.equal(
    yaLaDecidioOtro('aprobar', { paso: 'rechazar', porId: 'g1', nombre: 'Ana Gerente' }, 'x1'),
    'Esta solicitud ya fue rechazada por Ana Gerente.',
  );
  assert.equal(
    yaLaDecidioOtro('rechazar', { paso: 'devolver', porId: 'g1', nombre: 'Ana Gerente' }, 'x1'),
    'Esta solicitud ya fue devuelta por Ana Gerente.',
  );
  // Si la decidió ella misma, o lo último no fue una decisión, no hay a quién nombrar.
  assert.equal(yaLaDecidioOtro('aprobar', ana, 'g1'), null);
  assert.equal(yaLaDecidioOtro('aprobar', { paso: 'corregir', porId: 'r1', nombre: 'Rosa' }, 'x1'), null);
  assert.equal(yaLaDecidioOtro('aprobar', null, 'x1'), null);
  // Solo cuando lo que se intentaba también era decidir.
  assert.equal(yaLaDecidioOtro('registrar_compra', ana, 'x1'), null);
});

prueba('040/RF-12 a RF-15: lo que consulta cada cargo con el asistente, y de qué empresas', () => {
  const de = (rol: Rol, obraId: string | null = 'obra-a') => alcanceDelAsistente({ rol, obraId, modulosDeObra: TODOS_LOS_MODULOS });
  const deEmpresa = ['solicitudes', 'compras', 'tesoreria', 'finanzas', 'rrhh', 'documentos', 'bitacora_empresa'] as const;
  // RF-13: la gerencia, todo, de las tres empresas, con la Bitácora de OCC y la de Geolab.
  const gerencia = de('admin', null);
  for (const m of deEmpresa) assert.ok(gerencia.modulos.includes(m), m);
  assert.deepEqual(gerencia.empresas, ['elemental', 'occ', 'geolab']);
  assert.deepEqual(gerencia.bitacorasDeEmpresa, ['occ', 'geolab']);
  // RF-12, RF-14: la auxiliar usa el asistente; lo de Elemental, y las personas de las obras
  // (Recursos Humanos), en todas las obras, como en su pantalla.
  const auxiliar = de('auxiliar_administrativa', null);
  assert.equal(auxiliar.usa, true);
  assert.ok(ROLES_DEL_ASISTENTE.includes('auxiliar_administrativa'));
  assert.equal(alcanza('auxiliar_administrativa', 'asistente', 'ver'), true);
  assert.equal(alcanza('auxiliar_administrativa', 'asistente', 'escribir'), false);
  assert.equal(auxiliar.obras, 'todas');
  assert.deepEqual(auxiliar.modulos, ['personas', 'compras', 'tesoreria', 'finanzas', 'rrhh', 'documentos']);
  assert.deepEqual(auxiliar.empresas, ['elemental']);
  assert.deepEqual(auxiliar.bitacorasDeEmpresa, []);
  // Ni bitácoras, ni almacén, ni nada de las obras más allá de su personal.
  for (const m of ['bitacoras', 'almacen', 'cantera', 'laboratorio', 'whatsapp', 'reportes', 'contrato', 'preoperacionales', 'bitacora_empresa'] as const) {
    assert.equal(auxiliar.modulos.includes(m), false, m);
  }
  // RF-15: cada cargo, lo de sus pantallas.
  assert.ok(de('director_obra').modulos.includes('solicitudes'));
  assert.equal(de('director_obra').modulos.includes('compras'), false);
  assert.deepEqual(de('director_obra').empresas, []);
  assert.ok(de('almacenista').modulos.includes('solicitudes'));
  assert.deepEqual(de('encargado_planta').modulos, ['cantera']);
  const laboratorista = de('laboratorista');
  assert.deepEqual(laboratorista.empresas, ['geolab']);
  assert.deepEqual(laboratorista.bitacorasDeEmpresa, ['geolab']);
  const encargado = de('encargado_occ', null);
  assert.deepEqual(encargado.empresas, ['occ']);
  assert.deepEqual(encargado.bitacorasDeEmpresa, ['occ']);
  // El laboratorista sin obra sigue con lo de Geolab, que no depende de la obra; el residente
  // sin obra, con nada (028/RF-10).
  assert.deepEqual(de('laboratorista', null).modulos, ['solicitudes', 'bitacora_empresa']);
  assert.deepEqual(de('director_obra', null).modulos, []);
  // La tabla manda: lo que el asistente da de una empresa, el cargo lo lista en el panel.
  for (const rol of ROLES_DEL_ASISTENTE) {
    for (const m of de(rol).modulos.filter((x) => (deEmpresa as readonly string[]).includes(x))) {
      assert.ok(alcanza(rol, m as (typeof deEmpresa)[number], 'listar'), `${rol} ${m}`);
    }
  }
});

prueba('040/RF-16: una empresa que no se alcanza queda fuera, también en una conversación guardada', () => {
  const de = (rol: Rol, obraId: string | null = null) => alcanceDelAsistente({ rol, obraId, modulosDeObra: TODOS_LOS_MODULOS });
  const auxiliar = de('auxiliar_administrativa');
  assert.equal(empresaAlAlcance(auxiliar, 'elemental'), true);
  assert.equal(empresaAlAlcance(auxiliar, 'occ'), false);
  assert.equal(empresaAlAlcance(de('laboratorista', 'o1'), 'occ'), false);
  // Una conversación que consultó la Bitácora de OCC: la ve el Encargado; el laboratorista no.
  const deOcc = { obras: [], modulos: ['bitacora_empresa' as const], empresas: ['occ' as const] };
  assert.equal(conversacionVisible(deOcc, de('encargado_occ')), true);
  assert.equal(conversacionVisible(deOcc, de('laboratorista', 'o1')), false);
  // Las conversaciones de antes de la 040 no traen empresas: se deciden como antes.
  assert.equal(conversacionVisible({ obras: [], modulos: [] }, auxiliar), true);
  // Una de compras de la auxiliar, si la pasan a residente, ya no se ve.
  const deCompras = { obras: [], modulos: ['compras' as const], empresas: ['elemental' as const] };
  assert.equal(conversacionVisible(deCompras, auxiliar), true);
  assert.equal(conversacionVisible(deCompras, de('director_obra', 'o1')), false);
});

prueba('040/RF-18, RF-23: lo que impide generar un archivo', () => {
  const tabla = (filas: number) => ({ titulo: 'Compras', encabezados: ['A'], formatos: ['texto' as const], filas: Array.from({ length: filas }, (_, i) => [`f${i}`]) });
  const pedido = (formato: string, bloques: Parameters<typeof faltasDelPedido>[0]['bloques'], titulo = 'Compras por aprobar') => ({ formato, titulo, bloques });
  assert.deepEqual(faltasDelPedido(pedido('xlsx', [{ tipo: 'tabla', tabla: tabla(3) }])), []);
  // T18: un PDF solo de texto ya no: lo escribía la IA (archivo «casi vacío», cifras sin consulta).
  assert.match(faltasDelPedido(pedido('pdf', [{ tipo: 'texto', markdown: 'Resumen' }]))[0], /al menos una tabla/);
  assert.match(faltasDelPedido(pedido('docx', [{ tipo: 'texto', markdown: 'Resumen' }]))[0], /no genere el archivo/);
  assert.deepEqual(faltasDelPedido(pedido('pdf', [{ tipo: 'texto', markdown: 'Resumen' }, { tipo: 'tabla', tabla: tabla(1) }])), []);
  // RF-18, D9: solo PDF, Excel y Word.
  assert.match(faltasDelPedido(pedido('csv', [{ tipo: 'tabla', tabla: tabla(3) }]))[0], /PDF, Excel o Word/);
  assert.match(faltasDelPedido(pedido('xlsx', [{ tipo: 'tabla', tabla: tabla(3) }], '  '))[0], /título/);
  assert.match(faltasDelPedido(pedido('docx', []))[0], /no tiene contenido/);
  // Caso límite: sin datos no se genera un archivo vacío.
  assert.match(faltasDelPedido(pedido('xlsx', [{ tipo: 'tabla', tabla: tabla(0) }]))[0], /no tiene filas/);
  // Un Excel necesita al menos una tabla.
  assert.match(faltasDelPedido(pedido('xlsx', [{ tipo: 'texto', markdown: 'Hola' }]))[0], /tabla/);
  // RF-23: hasta 5000 filas, sumando todas las tablas.
  assert.equal(FILAS_MAXIMAS_POR_ARCHIVO, 5000);
  assert.deepEqual(faltasDelPedido(pedido('xlsx', [{ tipo: 'tabla', tabla: tabla(2500) }, { tipo: 'tabla', tabla: tabla(2500) }])), []);
  const demasiado = faltasDelPedido(pedido('xlsx', [{ tipo: 'tabla', tabla: tabla(2500) }, { tipo: 'tabla', tabla: tabla(2501) }]));
  assert.match(demasiado[0], /5001 filas/);
  assert.match(demasiado[0], /acot/);
});

prueba('040/RF-20, RF-21: una tabla del archivo sale de los datos de la consulta, con números y fechas', () => {
  const datos = {
    total: 2,
    solicitudes: [
      { codigo: 'SC-0001', lugar: { tipo: 'obra', nombre: 'Obra A' }, valorEstimado: 1850000, paraCuando: '2026-11-12', urgente: true, renglones: [{ descripcion: 'Cemento', cantidad: 40, unidad: 'bulto' }], proveedores: ['Arenas SAS', 'Ferretería'], nota: null },
      { codigo: 'SC-0002', lugar: { tipo: 'empresa', nombre: 'OCC' }, valorEstimado: 320500, paraCuando: '2026-11-20', urgente: false, renglones: [], proveedores: [], nota: 'sin prisa' },
    ],
  };
  // La tabla se busca por su nombre; sin nombre, la única lista que haya.
  assert.equal(tablaDe(datos, 'solicitudes')?.length, 2);
  assert.equal(tablaDe(datos, '')?.length, 2);
  assert.equal(tablaDe(datos, 'no_existe'), null);
  assert.equal(tablaDe([{ a: 1 }], '')?.length, 1);
  assert.equal(tablaDe({ a: [1], b: [2] }, ''), null);
  // T18: rutas con punto, para las listas anidadas (la bitácora del día).
  const bitacora = { obra: 'OBR-001', bitacora: { actividades: [{ x: 1 }, { x: 2 }], clima: 'sol' } };
  assert.equal(tablaDe(bitacora, 'bitacora.actividades')?.length, 2);
  assert.equal(tablaDe(bitacora, 'bitacora.clima'), null);
  assert.equal(tablaDe(bitacora, 'bitacora.no_existe.mas'), null);
  assert.equal(tablaDe({ bitacora: null }, 'bitacora.actividades'), null);

  const t = aTabla('Solicitudes', tablaDe(datos, 'solicitudes')!);
  assert.deepEqual(t.encabezados, ['Codigo', 'Lugar', 'Valor estimado', 'Para cuando', 'Urgente', 'Renglones', 'Proveedores', 'Nota']);
  // Los números siguen siendo números; los pesos y las fechas, con su formato.
  assert.deepEqual(t.formatos, ['texto', 'texto', 'pesos', 'fecha', 'texto', 'texto', 'texto', 'texto']);
  assert.deepEqual(t.filas[0], ['SC-0001', 'Obra A', 1850000, '2026-11-12', 'Sí', 'Cemento (40 bulto)', 'Arenas SAS; Ferretería', null]);
  assert.deepEqual(t.filas[1].slice(0, 6), ['SC-0002', 'OCC', 320500, '2026-11-20', 'No', '']);
  // Con columnas pedidas, solo esas y en ese orden.
  const corta = aTabla('Corta', tablaDe(datos, 'solicitudes')!, ['valorEstimado', 'codigo']);
  assert.deepEqual(corta.encabezados, ['Valor estimado', 'Codigo']);
  assert.deepEqual(corta.filas, [[1850000, 'SC-0001'], [320500, 'SC-0002']]);
  // Lo anidado se pide con punto (T14: «Lugar» salía vacío con «lugar.nombre»).
  const anidada = aTabla('Anidada', tablaDe(datos, 'solicitudes')!, ['codigo', 'lugar.nombre', 'lugar.no_existe']);
  assert.deepEqual(anidada.filas, [['SC-0001', 'Obra A', null], ['SC-0002', 'OCC', null]]);
  assert.deepEqual(anidada.encabezados, ['Codigo', 'Lugar', 'Lugar']);
  // Enteros y decimales que no son plata.
  const medidas = aTabla('Medidas', [{ cantidad: 3, horas: 7.5 }, { cantidad: 4, horas: 8 }]);
  assert.deepEqual(medidas.formatos, ['entero', 'numero']);
  // T18: el «total» de Reportes › Máquinas son horas o km, no pesos; los de plata se reconocen por otra palabra.
  const maquinas = aTabla('Máquinas', [{ total: 0, valorTotal: 1200, totalPagado: 500 }]);
  assert.deepEqual(maquinas.formatos, ['lectura', 'pesos', 'pesos']);
  // RNF: las lecturas de medidor como en la 039 (punto decimal, sin miles), en el PDF y el Word.
  const lecturas = aTabla('Lecturas', [{ medidorInicial: 4250.5, medidorFinal: 4262.75, avance: 12.25, valorFinal: 300000, cantidad: 1500 }]);
  assert.deepEqual(lecturas.formatos, ['lectura', 'lectura', 'lectura', 'pesos', 'entero']);
  assert.equal(celdaEnTexto(4262.75, 'lectura'), '4262.75');
  assert.equal(celdaEnTexto(12000, 'lectura'), '12000');
  assert.equal(celdaEnTexto(1500, 'entero'), '1.500');
  // Una lista de valores sueltos es una columna.
  assert.deepEqual(aTabla('Sueltos', ['a', 'b']).filas, [['a'], ['b']]);
});

prueba('040/RF-22: el nombre y el encabezado del archivo', () => {
  assert.equal(nombreDelArchivoDelAsistente('Compras por aprobar', '2026-11-05', 'xlsx'), 'Compras por aprobar 2026-11-05.xlsx');
  assert.equal(nombreDelArchivoDelAsistente('Bitácora: semana 1/2 "obra"?', '2026-11-05', 'pdf'), 'Bitácora semana 12 obra 2026-11-05.pdf');
  assert.equal(nombreDelArchivoDelAsistente('   ', '2026-11-05', 'docx'), 'Asistente 2026-11-05.docx');
  assert.ok(nombreDelArchivoDelAsistente('x'.repeat(200), '2026-11-05', 'pdf').length <= 100);
  const encabezado = encabezadoDelArchivo({
    quien: 'Ana Pérez, auxiliar administrativa',
    generadoEn: '2026-11-05T14:10:00.000Z',
    fuentes: [
      { modulo: 'compras', etiqueta: 'Compras de Elemental', fecha: null, ruta: '/panel/elemental/compras' },
      { modulo: 'compras', etiqueta: 'Compras de Elemental', fecha: null, ruta: '/panel/elemental/compras' },
      { modulo: 'bitacoras', etiqueta: 'Bitácora del 4-nov', fecha: '2026-11-04', ruta: '/x', obra: 'OBR-001 · Obra A', desde: '2026-11-01', hasta: '2026-11-04' },
    ],
  });
  assert.equal(encabezado.grupo, 'Grupo OCC · Control de Obra');
  assert.equal(encabezado.pedidoPor, 'Ana Pérez, auxiliar administrativa');
  // La hora de Colombia: 14:10 UTC son las 9:10 a. m.
  assert.equal(encabezado.generado, '5-nov-2026, 9:10 a. m.');
  // Las fuentes sin repetir, con la obra y el periodo si los tuvo.
  assert.deepEqual(encabezado.fuentes, ['Compras de Elemental', 'Bitácora del 4-nov (OBR-001 · Obra A, 1-nov-2026 a 4-nov-2026)']);
  assert.match(LEYENDA_DEL_ARCHIVO, /No es evidencia firmada/);
});

prueba('040/RF-24, D7: el archivo se descarga 30 días y vence el 31', () => {
  const creado = '2026-11-05T14:10:00.000Z';
  assert.equal(venceEl(creado), '2026-12-05');
  assert.equal(vigente(creado, Date.parse('2026-11-05T20:00:00Z')), true);
  // El día 30 todavía se descarga, hasta el final del día en Colombia.
  assert.equal(vigente(creado, Date.parse('2026-12-06T04:59:00Z')), true);
  // El día 31, ya no.
  assert.equal(vigente(creado, Date.parse('2026-12-06T05:00:00Z')), false);
  assert.equal(vigente(creado, Date.parse('2027-01-10T12:00:00Z')), false);
});

prueba('040/RF-22, RNF: el texto del PDF solo lleva lo que la fuente sabe dibujar', () => {
  // Español, pesos, m³, grados, más o menos, comillas y rayas: se quedan.
  const espanol = 'Año: ¿Cuántos m³? Señal ±2 °C — «listo» “sí” $ 1.234.567 ½ é Ñ ü';
  assert.equal(textoParaPdf(espanol), espanol);
  // Lo demás se cambia por un equivalente o se marca.
  assert.equal(textoParaPdf('a ≤ b ≥ c − d → e ✓'), 'a <= b >= c - d -> e v');
  assert.equal(textoParaPdf('Listo 👍 ya'), 'Listo ? ya');
  assert.equal(textoParaPdf('línea 1\nlínea 2\tfin'), 'línea 1\nlínea 2 fin');
});

prueba('040/RF-22, RNF: las celdas y el texto del PDF y del Word', () => {
  assert.equal(celdaEnTexto(1850000, 'pesos'), '$ 1.850.000');
  assert.equal(celdaEnTexto(12500, 'entero'), '12.500');
  assert.equal(celdaEnTexto(7.25, 'numero'), '7,25');
  assert.equal(celdaEnTexto('2026-11-12', 'fecha'), '12-nov-2026');
  assert.equal(celdaEnTexto(null, 'pesos'), '');
  assert.equal(celdaEnTexto('Cemento', 'texto'), 'Cemento');
  assert.deepEqual(parrafosDeMarkdown('## Resumen\n\nHay **1** por aprobar.\n- Urgente: `SC-0554`\n'), [
    { tipo: 'titulo', trozos: [{ texto: 'Resumen', negrita: false }] },
    { tipo: 'parrafo', trozos: [{ texto: 'Hay ', negrita: false }, { texto: '1', negrita: true }, { texto: ' por aprobar.', negrita: false }] },
    { tipo: 'vineta', trozos: [{ texto: 'Urgente: SC-0554', negrita: false }] },
  ]);
});

prueba('040/RF-26: cada cargo tiene ejemplos de su trabajo, el último pide un archivo', () => {
  const alcanceDe = (rol: Rol) => alcanceDelAsistente({ rol, obraId: 'obra-a', modulosDeObra: TODOS_LOS_MODULOS });
  for (const rol of ROLES_DEL_ASISTENTE) {
    const ejemplos = ejemplosDePregunta(alcanceDe(rol));
    const deArchivo = ejemplos.filter((p) => /\b(PDF|Excel|Word)\b/.test(p));
    assert.equal(deArchivo.length, 1, rol);
    assert.equal(ejemplos[ejemplos.length - 1], deArchivo[0], rol);
  }
  assert.deepEqual(ejemplosDePregunta(alcanceDe('auxiliar_administrativa')), [
    '¿Qué compras están por aprobar?',
    '¿Qué solicitudes de pago están aprobadas y sin pagar?',
    'Hágame un Excel de las compras por aprobar',
  ]);
  assert.equal(ejemplosDePregunta(alcanceDe('admin'))[0], '¿Qué compras están por aprobar?');
  // El residente no lleva la bandeja de Compras: ni la nombra.
  assert.ok(ejemplosDePregunta(alcanceDe('director_obra')).every((p) => !/compras por aprobar/i.test(p)));
  // El Encargado de OCC sin módulos de obra: lo de su Bitácora y sus solicitudes.
  const occ = alcanceDelAsistente({ rol: 'encargado_occ', obraId: null, modulosDeObra: TODOS_LOS_MODULOS });
  const soloEmpresa = { ...occ, modulos: occ.modulos.filter((m) => m === 'bitacora_empresa' || m === 'solicitudes') };
  assert.deepEqual(ejemplosDePregunta(soloEmpresa), [
    '¿Qué se hizo ayer según la Bitácora de OCC?',
    '¿En qué van las solicitudes de compra de este mes?',
    'Hágame un PDF de la Bitácora de OCC de ayer',
  ]);
  // La de OCC no se le ofrece a quien solo alcanza la de Geolab.
  const geolab = alcanceDelAsistente({ rol: 'laboratorista', obraId: null, modulosDeObra: TODOS_LOS_MODULOS });
  assert.ok(ejemplosDePregunta(geolab).every((p) => !/OCC/.test(p)));
});

prueba('040/RF-25: lo que puede consultar, en frases cortas y según su alcance', () => {
  const alcanceDe = (rol: Rol, modulosDeObra = TODOS_LOS_MODULOS) => alcanceDelAsistente({ rol, obraId: 'obra-a', modulosDeObra });
  const gerencia = loQueConsulta(alcanceDe('admin'));
  assert.match(gerencia[0], /^De las obras: bitácoras, preoperacionales, almacén, .* y personas\.$/);
  assert.ok(gerencia.includes('Las compras del grupo: qué falta aprobar, comprar o recibir.'));
  assert.ok(gerencia.includes('La Bitácora de OCC y la Bitácora de Geolab.'));
  assert.ok(!gerencia.some((f) => f.startsWith('Sus solicitudes')));
  const auxiliar = loQueConsulta(alcanceDe('auxiliar_administrativa'));
  for (const frase of ['Las solicitudes de pago y los pagos del grupo.', 'El personal: fichas, contratos y documentos por vencer.']) {
    assert.ok(auxiliar.includes(frase), frase);
  }
  assert.ok(auxiliar.every((f) => !/Bitácora/.test(f)));
  const residente = loQueConsulta(alcanceDe('director_obra', { ...TODOS_LOS_MODULOS, almacen: false }));
  assert.match(residente[0], /^De su obra: /);
  assert.ok(!residente[0].includes('almacén'));
  assert.ok(residente.includes('Sus solicitudes de compra y de pago, y en qué van.'));
  assert.ok(residente.every((f) => !/compras del grupo|cortes|personal:/.test(f)));
  assert.deepEqual(loQueConsulta(alcanceDe('laboratorista')).slice(-1), ['La Bitácora de Geolab.']);
  assert.ok(residente.every((f) => f.length <= 160));
  assert.deepEqual(loQueConsulta(alcanceDe('operador')), []);
});

prueba('040/RF-25: de qué responde cada cargo, en el saludo y en el recuadro del Inicio', () => {
  const alcanceDe = (rol: Rol, obraId: string | null = 'obra-a') =>
    alcanceDelAsistente({ rol, obraId, modulosDeObra: TODOS_LOS_MODULOS });
  assert.equal(ambitoDelAsistente(alcanceDe('admin')), 'del grupo');
  assert.equal(ambitoDelAsistente(alcanceDe('auxiliar_administrativa')), 'del grupo');
  assert.equal(ambitoDelAsistente(alcanceDe('director_obra')), 'de su obra');
  assert.equal(ambitoDelAsistente(alcanceDe('encargado_occ')), 'de OCC y las obras');
  assert.equal(ambitoDelAsistente(alcanceDe('laboratorista')), 'de Geolab y su obra');
  assert.equal(ambitoDelAsistente(alcanceDe('laboratorista', null)), 'de Geolab');
  assert.equal(ambitoDelAsistente(alcanceDe('operador')), '');
  // La auxiliar no abre con «De las obras: personas.»: las personas van al final.
  const auxiliar = loQueConsulta(alcanceDe('auxiliar_administrativa'));
  assert.ok(auxiliar[0].startsWith('Las compras del grupo'));
  assert.equal(auxiliar[auxiliar.length - 1], 'Las personas registradas en las obras.');
  assert.ok(auxiliar.every((f) => !f.startsWith('De las obras')));
  assert.equal(
    resumenDeLoQueConsulta(alcanceDe('auxiliar_administrativa')),
    'Pregunte en español sobre el grupo: compras, pagos, cortes financieros, personal, documentos… La respuesta dice de dónde sale cada cifra.',
  );
  assert.equal(
    resumenDeLoQueConsulta(alcanceDe('almacenista')),
    'Pregunte en español sobre su obra: almacén y solicitudes. La respuesta dice de dónde sale cada cifra.',
  );
  assert.match(resumenDeLoQueConsulta(alcanceDe('director_obra')), /^Pregunte en español sobre su obra: bitácoras, preoperacionales, /);
  assert.equal(resumenDeLoQueConsulta(alcanceDe('operador')), '');
});

prueba('040/RF-29: lo que dice mientras consulta', () => {
  const hoy = '2026-11-05';
  const d = (nombre: string, entrada: unknown) => descripcionDeLaConsulta(nombre, entrada, hoy);
  assert.equal(
    d('solicitudes_de_compra', { lugar: '', estado: '', solo_urgentes: false, desde: '2026-10-01', hasta: '2026-10-31', texto: '', numero: '' }),
    'Leyendo las solicitudes de compra de octubre…',
  );
  assert.equal(d('solicitudes_de_pago', { desde: '', hasta: '', numero: '' }), 'Leyendo las solicitudes de pago…');
  assert.equal(d('solicitudes_de_compra', { numero: 'SC-0549' }), 'Leyendo la solicitud SC-0549…');
  assert.equal(d('bitacora_del_dia', { obraId: 'x', fecha: '2026-11-04' }), 'Leyendo la bitácora de ayer…');
  assert.equal(d('bitacora_de_empresa', { empresa: 'occ', fecha: '2026-11-05', desde: '', hasta: '' }), 'Leyendo la Bitácora de OCC de hoy…');
  assert.equal(d('viajes_de_cantera', { obraId: 'x', desde: '2026-10-27', hasta: '2026-11-02' }), 'Leyendo los viajes de cantera del 27-oct al 2-nov…');
  assert.equal(d('reporte', { obraId: 'x', pestana: 'personal', desde: '2025-12-01', hasta: '2025-12-31' }), 'Leyendo el reporte del personal de diciembre de 2025…');
  assert.equal(d('ensayos', { obraId: 'x', desde: '2026-10-14', hasta: '2026-10-14' }), 'Leyendo los ensayos del 14-oct…');
  assert.equal(d('recursos_humanos', { persona: 'Ana Ruiz' }), 'Leyendo la ficha de Ana Ruiz…');
  assert.equal(d('generar_archivo', { formato: 'xlsx', titulo: 'Compras por aprobar', bloques: [] }), 'Armando el Excel «Compras por aprobar»…');
  assert.equal(d('generar_archivo', { formato: 'pdf', titulo: '' }), 'Armando el PDF…');
  assert.equal(d('consulta_nueva', {}), 'Consultando…');
  assert.equal(d('almacen', null), 'Leyendo el almacén…');
  // Spec 043: se nombra la semana o el mes que se lee, no el día que se pidió.
  assert.equal(d('cumplimiento_de_obra', { obraId: 'x', tipo: 'mes', fecha: '2026-11-10' }), 'Leyendo el cumplimiento de la planificación de noviembre…');
  assert.equal(d('cumplimiento_de_obra', { obraId: 'x', tipo: 'semana', fecha: '2026-11-10' }), 'Leyendo el cumplimiento de la planificación del 9-nov al 15-nov…');
  // Cada consulta del asistente tiene su frase: ninguna se queda en «Consultando…».
  const fuente = readFileSync(path.join(__dirname, '../src/features/asistente/servidor/herramientas.ts'), 'utf8');
  const nombres = [...fuente.matchAll(/^  nombre: '(\w+)',$/gm)].map((m) => m[1]);
  assert.ok(nombres.length >= 19);
  for (const nombre of nombres) assert.notEqual(d(nombre, {}), 'Consultando…', nombre);
});

prueba('040/RF-27: la aclaración trae de 2 a 6 opciones limpias', () => {
  const obras = ['Consorcio Antioquia', '  Pruebas   spec 018 ', 'consorcio antióquia', ''];
  assert.deepEqual(aclaracionDe({ pregunta: ' ¿De qué obra? ', opciones: obras }), {
    ok: true,
    aclaracion: { pregunta: '¿De qué obra?', opciones: ['Consorcio Antioquia', 'Pruebas spec 018'] },
  });
  // Una sola posible no se pregunta: se usa.
  const una = aclaracionDe({ pregunta: '¿De qué obra?', opciones: ['Consorcio Antioquia', 'CONSORCIO ANTIOQUIA'] });
  assert.ok(!una.ok && /al menos 2/.test(una.error));
  const siete = aclaracionDe({ pregunta: '¿De qué obra?', opciones: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] });
  assert.ok(!siete.ok && /7 opciones y caben 6/.test(siete.error));
  assert.ok(aclaracionDe({ pregunta: '¿Cuál?', opciones: ['a', 'b', 'c', 'd', 'e', 'f'] }).ok);
  assert.equal(aclaracionDe({ pregunta: '  ', opciones: ['a', 'b'] }).ok, false);
  assert.equal(aclaracionDe({ pregunta: '¿Cuál?', opciones: ['a', 'x'.repeat(81)] }).ok, false);
  assert.equal(aclaracionDe({ pregunta: 'x'.repeat(301), opciones: ['a', 'b'] }).ok, false);
  // En el historial va con sus opciones, para que la IA entienda la que se tocó.
  assert.equal(
    aclaracionEnElHistorial('¿De qué obra?', { pregunta: '¿De qué obra?', opciones: ['A', 'B'] }),
    '¿De qué obra?\n\nOpciones: «A», «B».',
  );
  assert.equal(aclaracionEnElHistorial('Hubo 12 viajes.', null), 'Hubo 12 viajes.');
});

prueba('040/RF-11, D5: sigue dando solo el acceso de operador', () => {
  assert.deepEqual(rolesQuePuedeDar('auxiliar_administrativa'), ['operador']);
  assert.equal(
    motivoParaNoDarRol('auxiliar_administrativa', 'residente'),
    'Solo la gerencia, el director de proyectos o el director de obra pueden dar el acceso de Residente.',
  );
  assert.equal(
    motivoParaNoDarRol('director_obra', 'auxiliar_administrativa'),
    'Solo la gerencia puede dar el acceso de Auxiliar Administrativa.',
  );
});

prueba('035/RF-2 a RF-7: quién ve Recursos Humanos y dónde', () => {
  const tiene = (menu: { pagina: string }[]) => menu.some((m) => m.pagina === 'recursos-humanos');
  // RF-3: en OCC y en Geolab, después de Documentos.
  for (const empresa of ['occ', 'geolab'] as const) {
    const paginas = menuDeEmpresa(empresa, 'admin').map((m) => m.pagina);
    assert.equal(paginas.indexOf('recursos-humanos'), paginas.indexOf('documentos') + 1, empresa);
  }
  // RF-2, RF-4, RF-5: Elemental (gerencia y auxiliar), OCC (Encargado), Geolab (laboratorista), obra (residente).
  assert.ok(tiene(menuDeEmpresa('elemental', 'auxiliar_administrativa')));
  assert.ok(tiene(menuDeEmpresa('occ', 'encargado_occ')));
  assert.ok(tiene(menuDeEmpresa('geolab', 'laboratorista')));
  assert.ok(tiene(menuDeObra('director_obra')));
  // Cada uno solo entra a lo suyo (lo decide el lugar, no la fila).
  assert.equal(alcanzaLaEmpresa('encargado_occ', 'geolab'), false);
  assert.equal(alcanzaLaEmpresa('laboratorista', 'occ'), false);
  // RF-6: escriben y anulan solo gerencia y la auxiliar.
  assert.deepEqual(ROLES.filter((r) => alcanza(r, 'rrhh', 'escribir')), ['admin', 'auxiliar_administrativa']);
  assert.deepEqual(ROLES.filter((r) => alcanza(r, 'rrhh', 'anular')), ['admin', 'auxiliar_administrativa']);
  // RF-4, RF-5: los que consultan.
  for (const rol of ['director_obra', 'encargado_occ', 'laboratorista'] as const) {
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

prueba('035/RF-13: el salario lo ven la gerencia y la Auxiliar Administrativa, y nadie más', () => {
  assert.deepEqual(ROLES.filter(veElSalario), ['admin', 'auxiliar_administrativa']);
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

  for (const rol of ['admin', 'auxiliar_administrativa'] as const) {
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

  const residente = { rol: 'director_obra' as const, obraId: obraA };
  assert.equal(alcanzaLaPersona(residente, operadorOcc), true);
  assert.equal(alcanzaLaPersona(residente, deProyectos), true);
  assert.equal(alcanzaLaPersona(residente, operadorDeOtra), false);
  assert.equal(alcanzaLaPersona(residente, elemental), false);
  assert.equal(alcanzaLaPersona({ rol: 'director_obra', obraId: null }, operadorOcc), false);

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
  const residente = { id: 'r1', rol: 'director_obra' as const };
  const gerencia = { id: 'g1', rol: 'admin' as const };
  const almacenista = { id: 'a1', rol: 'almacenista' as const };
  const enviada: SolicitudParaPaso = { estado: 'enviada', pedidaPor: 'r1', tieneCompraVigente: false };
  const aprobada: SolicitudParaPaso = { ...enviada, estado: 'aprobada' };
  const comprada: SolicitudParaPaso = { ...enviada, estado: 'comprada', tieneCompraVigente: true };

  // RF-11: corregir y cancelar, solo quien la pidió y solo antes de aprobarla.
  assert.equal(porQueNoPuedeDar('corregir', residente, enviada), null);
  assert.equal(porQueNoPuedeDar('cancelar', residente, { ...enviada, estado: 'devuelta' }), null);
  assert.deepEqual(porQueNoPuedeDar('corregir', { id: 'r2', rol: 'director_obra' }, enviada), {
    estado: 403,
    mensaje: 'Solo quien pidió la solicitud puede corregirla.',
  });
  assert.equal(puedeDar('cancelar', gerencia, enviada), false);
  assert.ok(puedeDar('cancelar', gerencia, { ...enviada, pedidaPor: 'g1' }));
  assert.deepEqual(porQueNoPuedeDar('corregir', residente, aprobada), {
    estado: 409,
    mensaje: 'Esta solicitud está aprobada: no se puede corregir.',
  });

  // RF-5, RF-13 a RF-15: aprobar, rechazar y devolver, la gerencia y, desde la 040 (RF-4), la
  // Auxiliar Administrativa.
  for (const paso of ['aprobar', 'rechazar', 'devolver'] as const) {
    assert.ok(puedeDar(paso, gerencia, enviada), paso);
    assert.ok(puedeDar(paso, { id: 'x1', rol: 'auxiliar_administrativa' }, enviada), paso);
    for (const rol of ROLES.filter((r) => r !== 'admin' && r !== 'auxiliar_administrativa')) {
      assert.equal(puedeDar(paso, { id: 'r1', rol }, enviada), false, `${paso} ${rol}`);
    }
  }
  assert.deepEqual(porQueNoPuedeDar('aprobar', { id: 'e1', rol: 'encargado_occ' }, enviada), {
    estado: 403,
    mensaje: 'No puede aprobar ni rechazar solicitudes de compra: lo hacen la gerencia y la auxiliar administrativa.',
  });
  // Una devuelta está en manos de quien la pidió: se rechaza, pero no se aprueba ni se vuelve a devolver.
  assert.ok(puedeDar('rechazar', gerencia, { ...enviada, estado: 'devuelta' }));
  assert.equal(puedeDar('aprobar', gerencia, { ...enviada, estado: 'devuelta' }), false);
  assert.equal(puedeDar('devolver', gerencia, { ...enviada, estado: 'devuelta' }), false);

  // RF-16, RF-19: registrar y anular compras, la gerencia y, desde la 040 (RF-5), la auxiliar.
  assert.ok(puedeDar('registrar_compra', gerencia, aprobada));
  assert.ok(puedeDar('registrar_compra', gerencia, { ...comprada, estado: 'recibida_en_parte' }));
  assert.equal(puedeDar('registrar_compra', gerencia, enviada), false);
  assert.ok(puedeDar('registrar_compra', { id: 'x1', rol: 'auxiliar_administrativa' }, aprobada));
  assert.deepEqual(porQueNoPuedeDar('registrar_compra', { id: 'e1', rol: 'encargado_occ' }, aprobada), {
    estado: 403,
    mensaje: 'No puede registrar compras: lo hacen la gerencia y la auxiliar administrativa.',
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
  // Desde la 040 (RF-5) recibe también la Auxiliar Administrativa, desde Compras.
  for (const rol of ['director_obra', 'laboratorista', 'encargado_occ', 'admin', 'auxiliar_administrativa'] as const) {
    assert.ok(puedeDar('recibir', { id: 'z', rol }, comprada), rol);
  }
  for (const rol of ['operador', 'encargado_planta'] as const) {
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

  // La tabla de permisos: registrar y anular compras es de la gerencia y de la auxiliar (040).
  assert.deepEqual(ROLES.filter((r) => alcanza(r, 'compras', 'escribir')), ['admin', 'auxiliar_administrativa']);
  assert.deepEqual(ROLES.filter((r) => alcanza(r, 'compras', 'anular')), ['admin', 'auxiliar_administrativa']);
  assert.equal(motivoDeRechazo('compras', 'anular'), 'No puede anular compras: lo hacen la gerencia y la auxiliar administrativa.');
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
  for (const rol of ['admin', 'director_obra', 'laboratorista', 'encargado_occ', 'auxiliar_administrativa'] as const) {
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
  // «Comprobante de pago» llega con la spec 037 (RF-18).
  assert.deepEqual(ids, ['cotizacion', 'orden_de_compra', 'factura', 'remision', 'foto', 'ficha_tecnica', 'comprobante_de_pago', 'otro']);
  // Solo en la solicitud: ni las empresas, ni la obra, ni la persona las ofrecen.
  const otros: LugarDeDocumentos[] = ['elemental', 'occ', 'geolab', 'obra', 'persona'];
  for (const id of ids.filter((x) => x !== 'otro' && x !== 'comprobante_de_pago')) {
    assert.deepEqual(otros.filter((l) => esClaseDe(l, id)), [], id);
  }
  // Ni las comunes de empresa ni las de la persona son de una solicitud.
  assert.ok(!esClaseDe('solicitud', 'camara_de_comercio') && !esClaseDe('solicitud', 'liquidacion'));
  assert.equal(nombreDeClase('solicitud', 'orden_de_compra'), 'Orden de compra');

  // RF-31: cotización, orden de compra y factura llevan precio; las demás, no.
  assert.deepEqual(ids.filter(llevaPrecio), ['cotizacion', 'orden_de_compra', 'factura', 'comprobante_de_pago']);
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

  // RF-27: el gasto, la gerencia y, desde la 040, la Auxiliar Administrativa.
  assert.deepEqual(ROLES.filter(veElGasto), ['admin', 'auxiliar_administrativa']);
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

prueba('037/RF-7: el número SP, los estados, los conceptos y los medios', () => {
  assert.equal(numeroDePago(1), 'SP-0001');
  assert.equal(numeroDePago(12345), 'SP-12345');
  assert.equal(nombreDeEstadoDePago('pagada_en_parte'), 'Pagada en parte');
  // RF-21: abiertas arriba; pagada, rechazada y cancelada, cerradas.
  assert.deepEqual(
    ESTADOS_DE_PAGO.filter((e) => !pagoAbierto(e.id)).map((e) => e.id),
    ['pagada', 'rechazada', 'cancelada'],
  );
  // D2 y D6: los ocho conceptos y los cuatro medios acordados.
  assert.equal(CONCEPTOS_DE_PAGO.length, 8);
  assert.equal(nombreDeConcepto('caja_menor'), 'Reembolso de caja menor');
  assert.deepEqual(MEDIOS_DE_PAGO.map((m) => m.id), ['transferencia', 'consignacion', 'cheque', 'efectivo']);
  assert.equal(nombreDeMedio('consignacion'), 'Consignación');
});

prueba('037/RF-6, RF-8: lo que impide enviar una solicitud de pago', () => {
  const hoy = '2026-10-29';
  const buena: DatosDeLaSolicitudDePago = {
    beneficiario: 'Transportes La Sabana',
    beneficiarioDocumento: '',
    concepto: 'transporte',
    paraQue: 'Acarreo de material de la cantera',
    valor: 1_500_000,
    paraCuando: hoy,
    urgente: true,
  };
  assert.deepEqual(faltasDeLaSolicitudDePago(buena, hoy), []);
  assert.deepEqual(faltasDeLaSolicitudDePago({ ...buena, beneficiarioDocumento: '900123456-7', paraCuando: '2026-11-20' }, hoy), []);

  // Cada falta, junto a su campo.
  assert.deepEqual(
    faltasDelPagoPorCampo({ ...buena, beneficiario: ' ', concepto: '', paraQue: '', valor: 0, paraCuando: '2026-10-28' }, hoy),
    {
      beneficiario: 'Diga a quién se le paga.',
      concepto: 'Elija el concepto.',
      paraQue: 'Diga para qué es el pago.',
      valor: 'El valor va en pesos, sin decimales y mayor que cero.',
      paraCuando: 'La fecha «para cuándo» no puede ser anterior a hoy.',
    },
  );
  // La lista del servidor, en el orden del formulario.
  assert.deepEqual(faltasDeLaSolicitudDePago({ ...buena, concepto: 'nomina', paraCuando: '' }, hoy), [
    'Ese concepto no existe.',
    'Diga para cuándo se necesita.',
  ]);
  for (const valor of [-1, 1500.5, Number.NaN, 2 ** 60]) {
    assert.deepEqual(faltasDeLaSolicitudDePago({ ...buena, valor }, hoy), [
      'El valor va en pesos, sin decimales y mayor que cero.',
    ]);
  }
  assert.deepEqual(faltasDeLaSolicitudDePago({ ...buena, paraCuando: '2026-02-30' }, hoy), ['Diga para cuándo se necesita.']);
});

prueba('037/RF-5, RF-9, RF-11, RF-12, RF-16: quién da cada paso de un pago y desde qué estado', () => {
  const residente = { id: 'r1', rol: 'director_obra' as const };
  const gerencia = { id: 'g1', rol: 'admin' as const };
  const enviada: SolicitudDePagoParaPaso = { estado: 'enviada', pedidaPor: 'r1' };

  // RF-9: corregir y cancelar, solo quien la pidió, enviada o devuelta.
  assert.equal(porQueNoPuedeDarPaso('corregir', residente, enviada), null);
  assert.ok(puedeDarPaso('cancelar', residente, { ...enviada, estado: 'devuelta' }));
  assert.deepEqual(porQueNoPuedeDarPaso('cancelar', { id: 'r2', rol: 'director_obra' }, enviada), {
    estado: 403,
    mensaje: 'Solo quien pidió la solicitud puede cancelarla.',
  });
  assert.deepEqual(porQueNoPuedeDarPaso('corregir', residente, { ...enviada, estado: 'aprobada' }), {
    estado: 409,
    mensaje: 'Esta solicitud está aprobada: no se puede corregir.',
  });

  // RF-5: aprobar, rechazar, devolver, pagar y anular, la gerencia y, desde la 040 (RF-6), la
  // Auxiliar Administrativa; el Encargado no.
  for (const paso of ['aprobar', 'rechazar', 'devolver'] as const) {
    assert.ok(puedeDarPaso(paso, gerencia, enviada), paso);
    assert.ok(puedeDarPaso(paso, { id: 'x', rol: 'auxiliar_administrativa' }, enviada), paso);
    for (const rol of ROLES.filter((r) => r !== 'admin' && r !== 'auxiliar_administrativa')) {
      assert.equal(puedeDarPaso(paso, { id: 'r1', rol }, enviada), false, `${paso} ${rol}`);
    }
  }
  assert.deepEqual(porQueNoPuedeDarPaso('aprobar', { id: 'e1', rol: 'encargado_occ' }, enviada), {
    estado: 403,
    mensaje: 'No puede aprobar ni rechazar solicitudes de pago: lo hacen la gerencia y la auxiliar administrativa.',
  });
  const aprobada: SolicitudDePagoParaPaso = { ...enviada, estado: 'aprobada' };
  assert.ok(puedeDarPaso('registrar_pago', gerencia, aprobada));
  assert.ok(puedeDarPaso('registrar_pago', gerencia, { ...enviada, estado: 'pagada_en_parte' }));
  assert.equal(puedeDarPaso('registrar_pago', gerencia, enviada), false);
  assert.ok(puedeDarPaso('registrar_pago', { id: 'x', rol: 'auxiliar_administrativa' }, aprobada));
  assert.deepEqual(porQueNoPuedeDarPaso('registrar_pago', { id: 'e1', rol: 'encargado_occ' }, aprobada), {
    estado: 403,
    mensaje: 'No puede registrar pagos: lo hacen la gerencia y la auxiliar administrativa.',
  });
  // RF-16: anular un pago, solo con pagos (pagada en parte o pagada).
  assert.equal(puedeDarPaso('anular_pago', gerencia, aprobada), false);
  assert.ok(puedeDarPaso('anular_pago', gerencia, { ...enviada, estado: 'pagada' }));
  assert.equal(puedeDarPaso('anular_pago', residente, { ...enviada, estado: 'pagada' }), false);

  // Una pagada solo admite anular un pago; rechazada y cancelada, nada.
  assert.deepEqual(
    PASOS_DE_PAGO.filter((p) => puedeDarPaso(p, gerencia, { estado: 'pagada', pedidaPor: 'g1' })),
    ['anular_pago'],
  );
  for (const estado of ['rechazada', 'cancelada'] as const) {
    assert.deepEqual(PASOS_DE_PAGO.filter((p) => puedeDarPaso(p, gerencia, { estado, pedidaPor: 'g1' })), [], estado);
  }

  // Los motivos.
  assert.equal(faltaDelMotivoDePago('devolver', ' '), 'Diga qué debe corregirse.');
  assert.equal(faltaDelMotivoDePago('anular_pago', ''), 'Diga por qué se anula el pago.');
  assert.equal(faltaDelMotivoDePago('aprobar', ''), null);
  assert.equal(motivoDeRechazo('tesoreria', 'anular'), 'No puede anular pagos: lo hacen la gerencia y la auxiliar administrativa.');
});

prueba('037/RF-11: aprobar un pago por lo pedido o por menos', () => {
  assert.deepEqual(aprobacionDelPago(1_500_000, null), { falta: null, aprobado: 1_500_000 });
  assert.deepEqual(aprobacionDelPago(1_500_000, 1_200_000), { falta: null, aprobado: 1_200_000 });
  for (const valor of [0, 1_600_000, 1000.5, -5]) {
    assert.deepEqual(aprobacionDelPago(1_500_000, valor), {
      falta: 'El valor aprobado va de $ 1 a $ 1.500.000.',
      aprobado: 1_500_000,
    });
  }
});

prueba('037/RF-13, RF-15: lo que impide registrar un pago', () => {
  const pago: DatosDelPago = { fecha: '2026-10-29', valor: 500_000, medio: 'transferencia', referencia: '' };
  assert.deepEqual(faltasDelPago(pago, 1_200_000), []);
  // Justo lo que falta, sí.
  assert.deepEqual(faltasDelPago({ ...pago, valor: 1_200_000 }, 1_200_000), []);
  // RF-15: de más no, y dice cuánto falta.
  assert.deepEqual(faltasDelPago({ ...pago, valor: 1_200_001 }, 1_200_000), [
    'Ese pago pasa de lo que falta: faltan $ 1.200.000.',
  ]);
  assert.deepEqual(faltasDelPago(pago, 0), ['Ya está pagado todo.']);
  for (const valor of [0, -1, 500_000.5]) {
    assert.deepEqual(faltasDelPago({ ...pago, valor }, 1_200_000), [
      'El valor del pago va en pesos, sin decimales y mayor que cero.',
    ]);
  }
  assert.deepEqual(faltasDelPago({ ...pago, fecha: '', medio: '' }, 1_200_000), [
    'Diga la fecha del pago.',
    'Elija el medio de pago.',
  ]);
  assert.deepEqual(faltasDelPago({ ...pago, medio: 'bitcoin' }, 1_200_000), ['Ese medio de pago no existe.']);
});

prueba('037/RF-14, RF-16, RF-19: el estado después de pagar o anular, y el pago de una compra', () => {
  // Anticipo y saldo.
  assert.equal(estadoTrasPagos(1_200_000, 500_000), 'pagada_en_parte');
  assert.equal(estadoTrasPagos(1_200_000, 1_200_000), 'pagada');
  // Anular el saldo la devuelve a pagada en parte; anular todo, a aprobada.
  assert.equal(estadoTrasPagos(1_200_000, 500_000), 'pagada_en_parte');
  assert.equal(estadoTrasPagos(1_200_000, 0), 'aprobada');
  // Una compra: sin pagar, en parte y pagada.
  assert.equal(pagoDeLaCompra(870_000, 0), 'sin_pagar');
  assert.equal(pagoDeLaCompra(870_000, 400_000), 'en_parte');
  assert.equal(pagoDeLaCompra(870_000, 870_000), 'pagada');
  assert.equal(NOMBRE_DEL_PAGO_DE_LA_COMPRA.en_parte, 'Pagada en parte');
});

prueba('037/RF-5a, RF-23: quién ve el valor de un pago y quién ve Pagos', () => {
  // D1: el almacenista ve el valor solo de las que pidió él.
  assert.ok(veElValorDelPago('almacenista', 'a1', 'a1'));
  assert.equal(veElValorDelPago('almacenista', 'r1', 'a1'), false);
  for (const rol of ['admin', 'director_obra', 'laboratorista', 'encargado_occ', 'auxiliar_administrativa'] as const) {
    assert.ok(veElValorDelPago(rol, 'otro', 'yo'), rol);
  }
  // D9: Pagos, la gerencia y, desde la 040 (RF-6), la Auxiliar Administrativa.
  assert.deepEqual(ROLES.filter(veLosPagos), ['admin', 'auxiliar_administrativa']);
});

prueba('037/RF-10, RF-21, RF-22: vencidas, marcas, orden, resumen y búsqueda de los pagos', () => {
  const hoy = '2026-10-29';
  assert.equal(estaVencidoElPago({ estado: 'aprobada', paraCuando: hoy }, hoy), false);
  assert.equal(estaVencidoElPago({ estado: 'pagada_en_parte', paraCuando: '2026-10-28' }, hoy), true);
  assert.equal(estaVencidoElPago({ estado: 'pagada', paraCuando: '2026-10-01' }, hoy), false);
  assert.deepEqual(marcasDelPago({ estado: 'devuelta', paraCuando: '2026-10-28' }, hoy), ['Devuelta: corrígela', 'Vencida']);

  const s = (numero: number, estado: EstadoDePago, urgente: boolean, paraCuando: string, valorAprobado: number | null = null, pagado = 0) => ({
    numero,
    estado,
    urgente,
    paraCuando,
    valorAprobado,
    pagado,
  });
  const lista = [
    s(1, 'pagada', true, '2026-10-01', 500_000, 500_000),
    s(2, 'aprobada', false, '2026-11-02', 1_000_000),
    s(3, 'enviada', false, '2026-11-01'),
    s(4, 'cancelada', false, '2026-10-20'),
    s(5, 'enviada', true, '2026-11-10'),
    s(6, 'pagada_en_parte', true, '2026-10-25', 1_200_000, 500_000),
    s(7, 'devuelta', false, '2026-10-30'),
  ];
  assert.deepEqual(ordenDeLaBandejaDePagos(lista).map((x) => x.numero), [5, 3, 6, 7, 2, 4, 1]);
  assert.deepEqual(ordenDelLugarDePagos(lista).map((x) => x.numero), [6, 5, 7, 3, 2, 4, 1]);
  // Por pagar: la aprobada (1 000 000) y lo que le falta a la pagada en parte (700 000).
  assert.deepEqual(resumenDeLaBandejaDePagos(lista, hoy), { porAprobar: 2, porPagar: 2, valorPorPagar: 1_700_000, vencidas: 1 });

  const pago = {
    numero: 5,
    beneficiario: 'Transportes La Sabana',
    beneficiarioDocumento: '900123456-7',
    paraQue: 'Acarreo de material',
    pedidaPor: { nombre: 'María Pérez' },
  };
  for (const texto of ['SP-0005', 'sp5', '5', 'sabana', '900123456', 'acarreo', 'maria perez', '']) {
    assert.ok(coincideElPago(pago, texto), texto);
  }
  for (const texto of ['SP-0006', 'cemento']) assert.equal(coincideElPago(pago, texto), false, texto);

  const conLugar = { ...pago, estado: 'enviada' as const, urgente: true, lugar: { id: 'occ' }, pedidaEl: '2026-10-20' };
  const sin: FiltrosDeLaBandejaDePagos = { lugar: null, estado: null, soloUrgentes: false, desde: null, hasta: null, texto: '' };
  assert.ok(pasaLosFiltrosDePago(conLugar, { ...sin, lugar: 'occ', estado: 'enviada', soloUrgentes: true, desde: '2026-10-20', hasta: '2026-10-20' }));
  assert.equal(pasaLosFiltrosDePago(conLugar, { ...sin, lugar: 'geolab' }), false);
  assert.equal(pasaLosFiltrosDePago(conLugar, { ...sin, estado: 'aprobada' }), false);
  assert.equal(pasaLosFiltrosDePago(conLugar, { ...sin, desde: '2026-10-21' }), false);
  assert.equal(pasaLosFiltrosDePago(conLugar, { ...sin, texto: 'cemento' }), false);
});

prueba('037/RF-6, RF-13, RF-18, RF-24: los adjuntos de un pago, el comprobante de una compra y los cortes de la auxiliar', () => {
  // RF-6, D5: los soportes de una solicitud de pago, sin las clases de empresa.
  assert.deepEqual(clasesDe('pago').map((c) => c.id), [
    'cuenta_de_cobro', 'factura', 'cotizacion', 'rut', 'certificacion_bancaria', 'comprobante_de_pago', 'otro',
  ]);
  assert.ok(!esClaseDe('pago', 'camara_de_comercio') && !esClaseDe('pago', 'remision'));
  assert.equal(nombreDeClase('pago', 'cuenta_de_cobro'), 'Cuenta de cobro');
  // La cuenta de cobro es solo de los pagos.
  const lugares: LugarDeDocumentos[] = ['elemental', 'occ', 'geolab', 'obra', 'persona', 'solicitud'];
  assert.deepEqual(lugares.filter((l) => esClaseDe(l, 'cuenta_de_cobro')), []);
  // RF-18: el comprobante de pago de una compra va con su solicitud de compra, y lleva precio.
  assert.ok(esClaseDe('solicitud', 'comprobante_de_pago') && llevaPrecio('comprobante_de_pago'));
  // RF-24, D9: la auxiliar consulta los cortes. Desde la 040 (D3) también registra y anula los
  // de Elemental: el lugar lo cierra `porQueNoPuedeTocarElCorte` (su prueba es la de 040/RF-7).
  for (const accion of ['ver', 'escribir', 'anular'] as const) {
    assert.deepEqual(ROLES.filter((r) => alcanza(r, 'finanzas', accion)), ['admin', 'auxiliar_administrativa'], accion);
  }
});

prueba('037/RF-9, RF-20: qué cambió al corregir una solicitud de pago', () => {
  const antes: DatosDeLaSolicitudDePago = {
    beneficiario: 'Transportes La Sabana',
    beneficiarioDocumento: '',
    concepto: 'transporte',
    paraQue: 'Acarreo',
    valor: 1_000_000,
    paraCuando: '2026-11-01',
    urgente: false,
  };
  assert.deepEqual(camposDelPagoCorregidos(antes, { ...antes, paraQue: ' Acarreo ' }), []);
  assert.deepEqual(
    camposDelPagoCorregidos(antes, { ...antes, beneficiarioDocumento: '900123456', valor: 1_200_000, urgente: true }),
    ['NIT o cédula', 'valor', 'urgencia'],
  );
});

/* ── Spec 038: grupos de empresa y placas mal escritas ─────────────────── */

const EQUIPOS_DE_OCC: VehiculoConocido[] = [
  { id: 'lvy498', codigoInterno: 'LVY498', placa: 'LVY498', obraId: 'obra-a' },
  { id: 'lvy002', codigoInterno: 'LVY002', placa: 'LVY 002', obraId: 'obra-b' },
  { id: 'zcw128', codigoInterno: 'ZCW128', placa: 'ZCW-128', obraId: null },
  { id: 'tfo427', codigoInterno: 'TFO427', placa: 'TFO427', obraId: 'obra-a' },
  { id: 'tfo429', codigoInterno: 'TFO429', placa: 'TFO429', obraId: 'obra-a' },
  { id: 'pajarita', codigoInterno: 'MC762962', placa: null, obraId: 'obra-a' },
];

prueba('038/RF-1, RF-2: un grupo es de una obra o de una empresa, nunca de las dos', () => {
  assert.deepEqual(duenoDelGrupo({ obraId: 'obra-a' }), { tipo: 'obra', obraId: 'obra-a' });
  assert.deepEqual(duenoDelGrupo({ empresaId: 'occ' }), { tipo: 'empresa', empresaId: 'occ' });
  assert.deepEqual(duenoDelGrupo({ empresaId: 'geolab', obraId: '  ' }), { tipo: 'empresa', empresaId: 'geolab' });
  assert.deepEqual(duenoDelGrupo({ obraId: null, empresaId: null }), { tipo: 'ninguno' });
  assert.deepEqual(duenoDelGrupo({}), { tipo: 'ninguno' });
  assert.ok('error' in duenoDelGrupo({ obraId: 'obra-a', empresaId: 'occ' }));
  // Elemental es lo administrativo y Proyectos son sus obras: ninguna tiene grupo.
  assert.ok('error' in duenoDelGrupo({ empresaId: 'elemental' }));
  assert.ok('error' in duenoDelGrupo({ empresaId: 'proyectos' }));
  assert.ok('error' in duenoDelGrupo({ empresaId: 'otra' }));
});

prueba('038/RF-12a, D5: una placa mal escrita sugiere la registrada, sin ligarla', () => {
  // Los tres errores reales del grupo de OCC (16-oct a 3-nov).
  assert.deepEqual(placaParecida('1 camión fotón LVY 499', EQUIPOS_DE_OCC), { vehiculoId: 'lvy498', placa: 'LVY498' });
  assert.deepEqual(placaParecida('1 Carrotanque Ford CZW 128', EQUIPOS_DE_OCC), { vehiculoId: 'zcw128', placa: 'ZCW128' });
  assert.deepEqual(placaParecida('Km final 74609 29/10/2026 LUY002', EQUIPOS_DE_OCC), {
    vehiculoId: 'lvy002',
    placa: 'LVY002',
  });
  // Busca en todas las obras: OCC lleva la maquinaria de todas.
  assert.equal(placaParecida('LVY 003', EQUIPOS_DE_OCC)?.vehiculoId, 'lvy002');
});

prueba('038/RF-12a: una placa bien escrita o sin parecida no sugiere nada', () => {
  // Bien escrita, con o sin espacio, o con caracteres que se confunden en una foto: se reconoce por su placa.
  assert.equal(placaParecida('TFO 427', EQUIPOS_DE_OCC), null);
  assert.equal(placaParecida('volqueta tfo427', EQUIPOS_DE_OCC), null);
  assert.equal(placaParecida('TFO 42O', EQUIPOS_DE_OCC), null);
  // A un error de dos registradas (TFO427 y TFO429): sería adivinar.
  assert.equal(placaParecida('TFO 428', EQUIPOS_DE_OCC), null);
  // A dos errores de cualquiera.
  assert.equal(placaParecida('LVY 477', EQUIPOS_DE_OCC), null);
  // Sin forma de placa: la maquinaria por nombre y los códigos no son placas.
  assert.equal(placaParecida('Pajarita Case cantera', EQUIPOS_DE_OCC), null);
  assert.equal(placaParecida('MC762963', EQUIPOS_DE_OCC), null);
  assert.equal(placaParecida('Km 74609', EQUIPOS_DE_OCC), null);
  assert.equal(placaParecida('', EQUIPOS_DE_OCC), null);
  assert.equal(placaParecida(null, EQUIPOS_DE_OCC), null);
});

const MAQUINARIA_DE_OCC: VehiculoConocido[] = [
  ...EQUIPOS_DE_OCC,
  {
    id: 'pajarita-cantera',
    codigoInterno: 'MC762956',
    placa: null,
    obraId: 'obra-a',
    tipoId: 'retrocargador',
    marca: 'Case',
    nombresWhatsapp: ['Pajarita Case cantera'],
  },
  {
    id: 'pajarita-campamento',
    codigoInterno: 'MC762962',
    placa: null,
    obraId: 'obra-b',
    tipoId: 'retrocargador',
    marca: 'Case',
    nombresWhatsapp: ['Pajarita Case campamento', 'Pajarita Case'],
  },
  { id: 'vibro-dynapac', codigoInterno: 'VIB-01', placa: null, obraId: 'obra-a', tipoId: 'vibrocompactadora', marca: 'Dynapac' },
  { id: 'vibro-volvo', codigoInterno: 'VIB-02', placa: null, obraId: 'obra-b', tipoId: 'vibrocompactadora', marca: 'Volvo' },
  {
    id: 'moto-12h',
    codigoInterno: 'MOTONV-03',
    placa: null,
    obraId: null,
    tipoId: 'motoniveladora',
    marca: 'Caterpillar',
    nombresWhatsapp: ['Motoniveladora alquilada 12 H'],
  },
];

prueba('038/RF-12: el grupo de OCC reconoce el equipo por placa, nombre en WhatsApp o tipo y marca', () => {
  const r = (texto: string) => reconocerEquipoDeEmpresa(texto, MAQUINARIA_DE_OCC);
  // Por placa, de cualquier obra: OCC lleva la maquinaria de todas.
  assert.deepEqual([r('TFO 427').vehiculoId, r('TFO 427').como], ['tfo427', 'placa']);
  assert.deepEqual([r('1 Camioneta LVY 002').vehiculoId, r('1 Camioneta LVY 002').como], ['lvy002', 'placa']);
  // Por su nombre en WhatsApp: el más largo contenido gana.
  assert.deepEqual([r('1 Pajarita Case cantera').vehiculoId, r('1 Pajarita Case cantera').como], [
    'pajarita-cantera',
    'nombre_whatsapp',
  ]);
  assert.equal(r('Engrase pajarita case campamento').vehiculoId, 'pajarita-campamento');
  assert.equal(r('Pajarita Case').vehiculoId, 'pajarita-campamento');
  assert.equal(r('1 motoniveladora alquilada 12 H ').vehiculoId, 'moto-12h');
  // Por tipo y marca (spec 026), sin nombre en WhatsApp.
  assert.deepEqual([r('1 Vibrocompactador dynapac').vehiculoId, r('1 Vibrocompactador dynapac').como], [
    'vibro-dynapac',
    'tipo_marca',
  ]);
  assert.equal(r('1 Vibrocompactador volvo INGENIUM').vehiculoId, 'vibro-volvo');
  // Ligado: no lleva nota de placa.
  assert.equal(r('TFO 427').posiblePlaca, null);
});

prueba('038/RF-12a, RF-12c: placa mal escrita sin ligar, desconocido y dudas', () => {
  const r = (texto: string | null) => reconocerEquipoDeEmpresa(texto, MAQUINARIA_DE_OCC);
  // RF-12a: se guarda tal cual, sin equipo, con la placa probable.
  assert.deepEqual(r('1 camión fotón LVY 499'), {
    vehiculoId: null,
    como: 'parecida',
    posiblePlaca: { vehiculoId: 'lvy498', placa: 'LVY498' },
    candidatos: [],
    tipoId: 'camion',
  });
  // RF-12c: no se parece a nada.
  const grua = r('Grúa XYZ');
  assert.deepEqual([grua.vehiculoId, grua.como, grua.posiblePlaca, grua.candidatos], [null, null, null, []]);
  // Un vibro sin marca: con dos en el grupo no se sabe cuál, y no se adivina (026: el tipo solo no basta).
  const vibro = r('vibrocompactador');
  assert.deepEqual([vibro.vehiculoId, vibro.como, vibro.tipoId], [null, null, 'vibrocompactadora']);
  // Dos equipos con el mismo nombre en WhatsApp: tampoco se elige.
  const repetidos: VehiculoConocido[] = [
    { id: 'a', codigoInterno: 'A-1', placa: null, obraId: null, nombresWhatsapp: ['Planta estadio'] },
    { id: 'b', codigoInterno: 'B-1', placa: null, obraId: null, nombresWhatsapp: ['planta  estadio'] },
  ];
  assert.deepEqual(reconocerEquipoDeEmpresa('Planta estadio', repetidos).candidatos, ['a', 'b']);
  assert.equal(r('').como, null);
  assert.equal(r(null).vehiculoId, null);
});

/** Un instante en hora de Colombia (UTC-5), como lo manda la integración. */
const enColombia = (fechaHora: string) => Date.parse(`${fechaHora}:00-05:00`);

prueba('038/RF-9a, D12: la lista cuenta para el día que dice, y la de la noche para el mismo día es dudosa', () => {
  // La lista del 27-oct a las 20:30 «para el día 28»: lo normal, sin marca.
  assert.deepEqual(
    diaDeEmpresa({ clase: 'lista_equipos', fechaQueDice: '2026-10-28', enviadoEn: enColombia('2026-10-27T20:30') }),
    { fecha: '2026-10-28', dudosa: false },
  );
  // La del 28-oct a las 22:59 que también dijo «para el día 28» (era para el 29): queda en el 28, marcada.
  assert.deepEqual(
    diaDeEmpresa({ clase: 'lista_equipos', fechaQueDice: '2026-10-28', enviadoEn: enColombia('2026-10-28T22:59') }),
    { fecha: '2026-10-28', dudosa: true },
  );
  // Un día que ya pasó: dudosa a cualquier hora.
  assert.deepEqual(
    diaDeEmpresa({ clase: 'lista_equipos', fechaQueDice: '2026-10-27', enviadoEn: enColombia('2026-10-28T09:00') }),
    { fecha: '2026-10-27', dudosa: true },
  );
  // La del mismo día por la mañana describe ese día; la del sábado para el lunes tampoco es dudosa.
  assert.equal(
    diaDeEmpresa({ clase: 'lista_equipos', fechaQueDice: '2026-10-28', enviadoEn: enColombia('2026-10-28T06:30') }).dudosa,
    false,
  );
  assert.equal(
    diaDeEmpresa({ clase: 'lista_equipos', fechaQueDice: '2026-10-26', enviadoEn: enColombia('2026-10-24T19:59') }).dudosa,
    false,
  );
  // Sin fecha, una lista de la noche cae en el día de envío y queda dudosa.
  assert.deepEqual(
    diaDeEmpresa({ clase: 'lista_equipos', fechaQueDice: null, enviadoEn: enColombia('2026-10-29T20:11') }),
    { fecha: '2026-10-29', dudosa: true },
  );
});

prueba('038/RF-9e: el informe cuenta para su fecha; lo demás, para la que dice o la de envío', () => {
  // «Fecha 19/10/2026» enviado el 20 a las 12:19.
  assert.deepEqual(
    diaDeEmpresa({ clase: 'informe_mantenimiento', fechaQueDice: '2026-10-19', enviadoEn: enColombia('2026-10-20T12:19') }),
    { fecha: '2026-10-19', dudosa: false },
  );
  // «fecha 30/10/2026» enviado pasada la medianoche, el 31 a las 00:44.
  assert.equal(
    diaDeEmpresa({ clase: 'informe_mantenimiento', fechaQueDice: '2026-10-30', enviadoEn: enColombia('2026-10-31T00:44') }).fecha,
    '2026-10-30',
  );
  // Una foto sin fecha: el día de envío en Colombia, aunque en UTC ya sea el siguiente.
  assert.deepEqual(diaDeEmpresa({ clase: 'otro', fechaQueDice: '', enviadoEn: enColombia('2026-10-27T20:30') }), {
    fecha: '2026-10-27',
    dudosa: false,
  });
  // Una fecha que no existe no se toma: vale la de envío.
  assert.equal(
    diaDeEmpresa({ clase: 'otro', fechaQueDice: '2026-02-30', enviadoEn: enColombia('2026-10-22T09:37') }).fecha,
    '2026-10-22',
  );
  // La bitácora de un día empieza vacía y sin marca.
  assert.deepEqual(BITACORA_OCC_VACIA, {
    estadoEquipos: [],
    trabajos: [],
    actividades: [],
    pendientes: [],
    lista: null,
    listas: [],
    fechaDudosa: false,
  });
});

/* ── Spec 038, T4: llevar los mensajes del grupo de OCC al día ─────────── */

const milena = (mensajeId: string, hora: string) => ({ mensajeId, reportadoPor: 'Milena Ariza', hora });
const equipoOcc = (vehiculoId: string | null, escrito: string): EquipoDelRenglon => ({
  vehiculoId,
  escrito,
  posiblePlaca: null,
});
const renglonDeLista = (
  id: string,
  equipo: EquipoDelRenglon,
  estado: 'operativo' | 'inoperativo',
  motivo = '',
): EstadoDelEquipo => ({ ...equipo, id, estado, motivo, origen: null, cambios: [] });
const cambioOcc = (mensajeId: string, hora: string, estado: CambioDelDia['estado'], texto: string): CambioDelDia => ({
  mensajeId,
  reportadoPor: 'Luis Javier',
  hora,
  estado,
  texto,
});
const TFO429 = equipoOcc('tfo429', 'TFO 429');
const TFO420 = equipoOcc('tfo420', 'TFO 420');
const KOMATSU = equipoOcc('komatsu', 'motoniveladora komatsu');

prueba('038/RF-9b, RF-9f: la segunda lista del día reemplaza a la primera, que queda en el historial', () => {
  const primera = reemplazarLista(
    BITACORA_OCC_VACIA,
    {
      origen: milena('lista-1', '20:30'),
      estadoEquipos: [
        renglonDeLista('r1', TFO429, 'operativo'),
        renglonDeLista('r2', KOMATSU, 'inoperativo', 'cilindros de dirección'),
      ],
      pendientes: [
        {
          ...milena('lista-1', '20:30'),
          id: 'p1',
          texto: 'LLQ 379 pendiente instalar plumillas',
          equipo: equipoOcc('llq379', 'LLQ 379'),
        },
      ],
      dudosa: false,
    },
    '2026-10-27T20:30:00-05:00',
  );
  assert.equal(primera.lista?.mensajeId, 'lista-1');
  assert.equal(primera.estadoEquipos[0].origen?.reportadoPor, 'Milena Ariza');
  // RF-9f: la nota queda en Pendientes, ligada a su equipo.
  assert.equal(primera.pendientes[0].equipo?.vehiculoId, 'llq379');
  assert.deepEqual(primera.listas, []);

  const segunda = reemplazarLista(
    primera,
    {
      origen: milena('lista-2', '22:59'),
      estadoEquipos: [
        renglonDeLista('s1', TFO429, 'operativo'),
        renglonDeLista('s2', TFO420, 'inoperativo', 'bomba de dirección'),
      ],
      pendientes: [],
      dudosa: true,
    },
    '2026-10-28T22:59:00-05:00',
  );
  assert.deepEqual(
    segunda.estadoEquipos.map((r) => [r.id, r.estado]),
    [
      ['s1', 'operativo'],
      ['s2', 'inoperativo'],
    ],
  );
  assert.deepEqual(segunda.pendientes, []);
  assert.equal(segunda.fechaDudosa, true);
  // La primera no se borra: queda con sus equipos y sus pendientes.
  assert.equal(segunda.listas.length, 1);
  assert.deepEqual(
    [segunda.listas[0].mensajeId, segunda.listas[0].estadoEquipos.length, segunda.listas[0].pendientes.length],
    ['lista-1', 2, 1],
  );
  // RF-15: la misma lista otra vez, o la ya reemplazada, no cambia nada.
  const vacia = { estadoEquipos: [], pendientes: [], dudosa: false };
  assert.equal(reemplazarLista(segunda, { ...vacia, origen: milena('lista-2', '22:59') }, 'x'), segunda);
  assert.equal(reemplazarLista(segunda, { ...vacia, origen: milena('lista-1', '20:30') }, 'x'), segunda);
});

prueba('038/RF-9c, RF-24: los cambios del día se anotan sin borrar la lista, y cuentan al final', () => {
  let dia = reemplazarLista(
    BITACORA_OCC_VACIA,
    {
      origen: milena('lista-27', '20:30'),
      estadoEquipos: [renglonDeLista('r1', TFO429, 'operativo'), renglonDeLista('r2', KOMATSU, 'inoperativo')],
      pendientes: [],
      dudosa: false,
    },
    'x',
  );
  assert.deepEqual(conteoDelDia(dia), { operativos: 1, inoperativos: 1 });
  // La TFO 429 entra varada a las 08:48 y queda disponible a las 14:45 (27-oct). El de las 14:45 llega primero.
  dia = anotarCambio(dia, TFO429, cambioOcc('m2', '14:45', 'operativo', 'Vehículo disponible'), 'nuevo-1');
  dia = anotarCambio(
    dia,
    equipoOcc('tfo429', 'TFO429'),
    cambioOcc('m1', '08:48', 'varado', 'ingresa varado por cápsula'),
    'nuevo-2',
  );
  const tfo = dia.estadoEquipos.find((r) => r.vehiculoId === 'tfo429')!;
  assert.deepEqual([tfo.id, tfo.estado], ['r1', 'operativo']);
  assert.deepEqual(
    tfo.cambios.map((c) => [c.hora, c.estado]),
    [
      ['08:48', 'varado'],
      ['14:45', 'operativo'],
    ],
  );
  assert.equal(estadoActual(tfo), 'operativo');
  // Repetir el mismo mensaje no repite el cambio (RF-15).
  const otraVez = anotarCambio(dia, TFO429, cambioOcc('m1', '08:48', 'varado', 'ingresa varado por cápsula'), 'nuevo-3');
  assert.equal(otraVez.estadoEquipos.find((r) => r.vehiculoId === 'tfo429')!.cambios.length, 2);
  // Un equipo que se vara sin estar en la lista cuenta como inoperativo al final del día.
  dia = anotarCambio(dia, TFO420, cambioOcc('m3', '14:43', 'varado', 'daño bomba hidráulica'), 'nuevo-4');
  assert.deepEqual(conteoDelDia(dia), { operativos: 1, inoperativos: 2 });
});

prueba('038/RF-9c, RF-15: un cambio antes de la lista crea el renglón, y la lista lo conserva', () => {
  // La placa mal escrita se agrupa por lo escrito, sin importar espacios ni mayúsculas.
  const lvy499 = { ...equipoOcc(null, 'LVY 499'), posiblePlaca: { vehiculoId: 'lvy498', placa: 'LVY498' } };
  let dia = anotarCambio(BITACORA_OCC_VACIA, TFO420, cambioOcc('m1', '09:52', 'operativo', 'TFO 420 OPERATIVO'), 'c-1');
  dia = anotarCambio(dia, lvy499, cambioOcc('m2', '10:00', 'en_mantenimiento', 'cambio de cárter'), 'c-2');
  dia = anotarCambio(dia, { ...lvy499, escrito: 'lvy499' }, cambioOcc('m3', '15:00', 'operativo', 'listo'), 'c-3');
  assert.deepEqual(
    dia.estadoEquipos.map((r) => [r.id, r.estado, r.cambios.length]),
    [
      ['c-1', null, 1],
      ['c-2', null, 2],
    ],
  );
  assert.equal(dia.estadoEquipos[1].posiblePlaca?.placa, 'LVY498');
  // Llega la lista sin la TFO 420: su renglón se queda, sin estado de lista.
  dia = reemplazarLista(
    dia,
    {
      origen: milena('lista', '20:11'),
      estadoEquipos: [renglonDeLista('l1', equipoOcc(null, 'LVY499'), 'inoperativo', 'cárter')],
      pendientes: [],
      dudosa: false,
    },
    'x',
  );
  assert.deepEqual(
    dia.estadoEquipos.map((r) => [r.id, r.estado, r.cambios.length]),
    [
      ['l1', 'inoperativo', 2],
      ['c-1', null, 1],
    ],
  );
  // No había lista antes: nada al historial.
  assert.deepEqual(dia.listas, []);
});

prueba('038/RF-9d, RF-9e, RF-15: repetir un mensaje no duplica trabajos ni actividades', () => {
  const trabajo = (id: string, descripcion: string): TrabajoDeMantenimiento => ({
    ...TFO420,
    ...milena('m', '09:35'),
    id,
    tipo: 'preventivo',
    descripcion,
  });
  const dia = mezclarRenglones([], [trabajo('m-0', 'Engrase TFO420'), trabajo('m-1', 'Postura de racor')]);
  // El mismo mensaje otra vez, con la descripción corregida: reemplaza, no suma.
  const otraVez = mezclarRenglones(dia, [trabajo('m-0', 'Engrase housing TFO420'), trabajo('m-1', 'Postura de racor')]);
  assert.deepEqual(
    otraVez.map((t) => [t.id, t.descripcion]),
    [
      ['m-0', 'Engrase housing TFO420'],
      ['m-1', 'Postura de racor'],
    ],
  );
  // Otro mensaje del mismo día y la misma máquina: se suma.
  assert.equal(mezclarRenglones(otraVez, [trabajo('n-0', 'Llenado housing')]).length, 3);
  const actividad = (id: string): ActividadDeMantenimiento => ({
    ...milena('informe', '21:20'),
    reportadoPor: 'pedro cartagena',
    id,
    persona: 'Pedro Luis Cartagena',
    descripcion: 'se ajusta cápsula de bastidor de TFO429',
    equipo: TFO429,
  });
  assert.equal(mezclarRenglones([actividad('i-0')], [actividad('i-0')]).length, 1);
});

prueba('038/RF-9h: los trabajos del grupo de OCC que van también a Mantenimientos', () => {
  const trabajo = (equipo: EquipoDelRenglon, tipo: TrabajoDeMantenimiento['tipo'], descripcion: string) =>
    mantenimientosDelTrabajo({ ...equipo, ...milena('m', '14:40'), id: 'm-0', tipo, descripcion });
  const NPX602 = equipoOcc('npx602', 'NPX 602');
  // 28-oct: el cambio de aceite y filtros de la JMC.
  assert.deepEqual(
    trabajo(NPX602, 'preventivo', 'Cambio de aceite motor, cambio filtro aire, combustible y aceite motor'),
    [
      {
        vehiculoId: 'npx602',
        escrito: 'NPX 602',
        clase: 'aceite',
        resuelto: false,
        lectura: null,
        descripcion: 'Cambio de aceite motor, cambio filtro aire, combustible y aceite motor',
      },
    ],
  );
  assert.equal(trabajo(TFO420, 'preventivo', 'Engrase TFO420')[0].clase, 'preventivo');
  // 29-oct: «TFO 420 presenta daño bomba hidráulica de dirección»; y una reparación.
  assert.equal(trabajo(TFO420, 'dano', 'presenta daño bomba hidráulica de dirección (bomba Viker)')[0].clase, 'correctivo');
  assert.equal(trabajo(TFO429, 'reparacion', 'cambio de tornillo central del muelle')[0].clase, 'correctivo');
  // Llantas, repuestos y suministros se quedan solo en la bitácora.
  assert.deepEqual(trabajo(equipoOcc('tfo427', 'TFO 427'), 'llantas', '4 llantas nuevas en posición #3 a #6'), []);
  assert.deepEqual(trabajo(TFO420, 'repuesto_o_compra', 'Factura de valvulina 5 galones'), []);
  assert.deepEqual(trabajo(TFO420, 'suministro', 'se adiciona 1/2 galón de hidráulico'), []);
  // Sin equipo ligado, o con la placa mal escrita, no va: no se sabe a qué máquina.
  const lvy499 = { ...equipoOcc(null, 'LVY 499'), posiblePlaca: { vehiculoId: 'lvy498', placa: 'LVY498' } };
  assert.deepEqual(trabajo(lvy499, 'preventivo', 'cambio de aceite y cárter'), []);
  assert.deepEqual(trabajo(equipoOcc(null, 'Grúa XYZ'), 'dano', 'fuga'), []);
});

prueba('038/RF-9h: «operativo» resuelve los correctivos del equipo; varado no registra nada', () => {
  assert.deepEqual(mantenimientoDelCambio(TFO420, { estado: 'operativo', texto: 'Vehículo TFO 420 OPERATIVO' }), [
    {
      vehiculoId: 'tfo420',
      escrito: 'TFO 420',
      clase: null,
      resuelto: true,
      lectura: null,
      descripcion: 'Vehículo TFO 420 OPERATIVO',
    },
  ]);
  assert.deepEqual(mantenimientoDelCambio(TFO429, { estado: 'varado', texto: 'ingresa varado' }), []);
  assert.deepEqual(mantenimientoDelCambio(TFO429, { estado: 'en_mantenimiento', texto: 'En Mantenimiento' }), []);
  const lvy499 = { ...equipoOcc(null, 'LVY 499'), posiblePlaca: { vehiculoId: 'lvy498', placa: 'LVY498' } };
  assert.deepEqual(mantenimientoDelCambio(lvy499, { estado: 'operativo', texto: 'listo' }), []);
});

prueba('038/RF-9, RF-9g, RF-10: a dónde va cada mensaje del grupo de una empresa', () => {
  for (const c of ['lista_equipos', 'trabajo_mantenimiento', 'informe_mantenimiento', 'vehiculo_maquinaria', 'incidente']) {
    assert.equal(destinoEnGrupoDeEmpresa(c), 'bitacora_empresa', c);
  }
  // RF-9g: autorizaciones, preguntas de las obras y saludos no arman renglones.
  for (const c of ['administrativo', 'seguimiento', 'ignorar', 'reporte_diario', 'suministro_cantera', null, 'inventada']) {
    assert.equal(destinoEnGrupoDeEmpresa(c), 'ninguno', String(c));
  }
  // En el grupo de una obra, las categorías nuevas no tienen a dónde ir, y las de siempre siguen igual.
  for (const c of ['lista_equipos', 'trabajo_mantenimiento', 'informe_mantenimiento']) {
    assert.equal(destinoDeCategoria(c), 'ninguno', c);
  }
  assert.equal(destinoDeCategoria('vehiculo_maquinaria'), 'notas');
  assert.equal(destinoDeCategoria('reporte_diario'), 'reporte');
  assert.equal(destinoDeCategoria('suministro_cantera'), 'cantera');
  assert.equal(etiquetaDeCategoria('lista_equipos'), 'Lista de equipos operativos');
  // Entran pendientes a la bandeja, como cualquier reporte.
  assert.equal(estadoInicialDeCategoria('trabajo_mantenimiento'), 'pendiente');
});

prueba('038/RF-16: los reportes que espera una empresa, aparte de los de una obra', () => {
  assert.deepEqual([...TIPOS_DE_REPORTE_DE_EMPRESA], ['lista_equipos', 'informe_mantenimiento']);
  // La base tiene todos; cada lugar ofrece los suyos, sin cruzarse.
  assert.deepEqual([...TIPOS_DE_REPORTE], [...TIPOS_DE_REPORTE_DE_OBRA, ...TIPOS_DE_REPORTE_DE_EMPRESA]);
  assert.ok(!(TIPOS_DE_REPORTE_DE_OBRA as readonly string[]).includes('lista_equipos'));
  assert.equal(tipoDeReporteDeEmpresa('lista_equipos'), 'lista_equipos');
  assert.equal(tipoDeReporteDeEmpresa('informe_mantenimiento'), 'informe_mantenimiento');
  // Una foto de un trabajo o una varada no completan la bitácora del día.
  assert.equal(tipoDeReporteDeEmpresa('trabajo_mantenimiento'), null);
  assert.equal(tipoDeReporteDeEmpresa('vehiculo_maquinaria'), null);
});

prueba('038/RF-22, RF-27, RF-29: pestañas de la Bitácora de OCC, y quién entra a cada una', () => {
  assert.deepEqual(pestanasDeBitacora('occ'), [
    { clave: 'propia', titulo: 'Bitácora de OCC' },
    { clave: 'obras', titulo: 'En las obras' },
  ]);
  assert.deepEqual(pestanasDeBitacora('geolab'), []);
  const entraA = (rol: Rol, empresa: 'occ' | 'geolab') =>
    alcanzaLaEmpresa(rol, empresa) && menuDeEmpresa(empresa, rol).some((e) => e.pagina === 'bitacora');
  // RF-29: los permisos de hoy. Gerencia y el Encargado de OCC en OCC; gerencia y el laboratorista en Geolab.
  assert.ok(entraA('admin', 'occ') && entraA('encargado_occ', 'occ'));
  assert.ok(!entraA('laboratorista', 'occ') && !entraA('director_obra', 'occ'));
  assert.ok(entraA('admin', 'geolab') && entraA('laboratorista', 'geolab'));
  assert.ok(!entraA('encargado_occ', 'geolab') && !entraA('operador', 'geolab'));
});

prueba('038/D11: los nombres en WhatsApp de un equipo, limpios y sin repetir', () => {
  assert.deepEqual(
    limpiarNombresEnWhatsapp(['  Pajarita Case   cantera ', 'pajarita case-cantera', '', '   ', 'Pajarita cantera']),
    ['Pajarita Case cantera', 'Pajarita cantera'],
  );
  assert.deepEqual(limpiarNombresEnWhatsapp([]), []);
  // El contrato los limpia al llegar, y sin el campo no los toca.
  assert.deepEqual(vehiculoEditado.parse({ nombresWhatsapp: [' Vibro Volvo ', 'VIBRO volvo'] }).nombresWhatsapp, ['Vibro Volvo']);
  assert.equal(vehiculoEditado.parse({ marca: 'Case' }).nombresWhatsapp, undefined);
  assert.equal(vehiculoEditado.safeParse({ nombresWhatsapp: ['x'.repeat(61)] }).success, false);
  assert.equal(vehiculoEditado.safeParse({ nombresWhatsapp: Array.from({ length: 11 }, (_, i) => `Equipo ${i}`) }).success, false);
  // Los escriben gerencia y el Encargado de OCC, con el permiso de Vehículos; el residente no.
  // Desde la 041 también el Director de Proyectos (RF-11).
  assert.deepEqual(ROLES.filter((r) => alcanza(r, 'vehiculos', 'escribir')), ['admin', 'encargado_occ', 'director_proyectos']);
  // Lo guardado es lo que reconoce el grupo de OCC (RF-12).
  const equipo: VehiculoConocido = {
    id: 'pajarita',
    codigoInterno: 'MC762956',
    placa: null,
    obraId: null,
    nombresWhatsapp: limpiarNombresEnWhatsapp([' Pajarita  Case cantera ']),
  };
  assert.equal(reconocerEquipoDeEmpresa('1 Pajarita Case cantera', [equipo]).vehiculoId, 'pajarita');
});

/* ── Spec 038, T10: leer un mensaje del grupo de OCC ──────────────────── */

const ORIGEN_OCC = { mensajeId: 'm-lista', reportadoPor: 'Milena Ariza', hora: '20:11' };

prueba('038/RF-9, RF-9c, RF-9d: las palabras del grupo de OCC', () => {
  assert.equal(estadoDeEquipoDeTexto('Operativo'), 'operativo');
  assert.equal(estadoDeEquipoDeTexto('Disponible'), 'operativo');
  assert.equal(estadoDeEquipoDeTexto('INOPERATIVO'), 'inoperativo');
  assert.equal(estadoDeEquipoDeTexto('fisura de housing, varada'), 'inoperativo');
  assert.equal(estadoDeEquipoDeTexto('pendiente'), null);
  assert.equal(cambioDeEstadoDeTexto('ingresa varado'), 'varado');
  assert.equal(cambioDeEstadoDeTexto('En Mantenimiento'), 'en_mantenimiento');
  assert.equal(cambioDeEstadoDeTexto('Vehículo disponible'), 'operativo');
  assert.equal(cambioDeEstadoDeTexto('en_mantenimiento'), 'en_mantenimiento');
  assert.equal(cambioDeEstadoDeTexto('quedó bien'), null);
  assert.equal(tipoDeTrabajoDeTexto('preventivo'), 'preventivo');
  assert.equal(tipoDeTrabajoDeTexto('Daño'), 'dano');
  assert.equal(tipoDeTrabajoDeTexto('cambio de llantas'), 'llantas');
  assert.equal(tipoDeTrabajoDeTexto('compra de repuesto'), 'repuesto_o_compra');
  assert.equal(tipoDeTrabajoDeTexto('suministro de ACPM'), 'suministro');
  assert.equal(tipoDeTrabajoDeTexto('algo'), null);
});

prueba('038/RF-9, RF-9f, RF-12a, RF-12c: la lista del 29-oct, leída contra los equipos', () => {
  const lectura = leerMensajeDeEmpresa(
    {
      lista: {
        fecha: '2026-10-30',
        equipos: [
          { equipo: 'TFO 429', estado: 'operativo' },
          { equipo: 'Pajarita Case cantera', estado: 'operativo' },
          { equipo: 'camión fotón LVY 499', estado: 'operativo' },
          { equipo: 'Grúa XYZ', estado: 'operativo' },
          { equipo: 'Vibrocompactador volvo', estado: 'inoperativo', motivo: 'se recalienta' },
          { equipo: 'TFO 427', estado: '' },
          // Nombrado otra vez abajo, en INOPERATIVOS: queda lo último.
          { equipo: 'TFO429', estado: 'inoperativo', motivo: 'automático auxiliar' },
        ],
        notas: [{ texto: 'LLQ 379 pendiente instalar brazos y plumillas', equipo: 'LLQ 379' }, { texto: '  ' }],
      },
    },
    [...MAQUINARIA_DE_OCC, { id: 'llq379', codigoInterno: 'LLQ379', placa: 'LLQ379', obraId: 'obra-a' }],
    ORIGEN_OCC,
  );
  assert.deepEqual(
    lectura.lista!.estadoEquipos.map((r) => [r.id, r.vehiculoId, r.escrito, r.estado, r.posiblePlaca?.placa ?? null]),
    [
      ['m-lista#estado-6', 'tfo429', 'TFO429', 'inoperativo', null],
      ['m-lista#estado-1', 'pajarita-cantera', 'Pajarita Case cantera', 'operativo', null],
      ['m-lista#estado-2', null, 'camión fotón LVY 499', 'operativo', 'LVY498'],
      ['m-lista#estado-4', 'vibro-volvo', 'Vibrocompactador volvo', 'inoperativo', null],
    ],
  );
  assert.equal(lectura.lista!.estadoEquipos[0].motivo, 'automático auxiliar');
  // RF-9f: las notas, a Pendientes, con su equipo; las vacías no.
  assert.deepEqual(
    lectura.lista!.pendientes.map((p) => [p.id, p.equipo?.vehiculoId, p.reportadoPor]),
    [['m-lista#pendiente-0', 'llq379', 'Milena Ariza']],
  );
  // RF-12c y el estado que no se entendió: a «No se pudo guardar», con su motivo.
  assert.deepEqual(
    lectura.apartados.map((a) => [a.seccion, a.renglon]),
    [
      ['estado_equipos', 3],
      ['estado_equipos', 5],
    ],
  );
  assert.match(lectura.apartados[0].motivo, /No se reconoció el equipo «Grúa XYZ»/);
  assert.match(lectura.apartados[1].motivo, /operativo o inoperativo/);
});

prueba('038/RF-9c, RF-9d, RF-9e: cambios, trabajos y el informe de Pedro', () => {
  const origen = { mensajeId: 'm-foto', reportadoPor: 'Luis Javier', hora: '14:43' };
  const lectura = leerMensajeDeEmpresa(
    {
      cambios: [
        { equipo: 'TFO 429', estado: 'varado', texto: 'ingresa varado por cápsula de bastidor' },
        { equipo: 'Grúa XYZ', estado: 'operativo' },
      ],
      trabajos: [
        { equipo: 'TFO 427', tipo_trabajo: 'dano', descripcion: 'presenta daño bomba hidráulica de dirección' },
        { equipo: 'TFO 427', tipo_trabajo: 'cosa rara', descripcion: 'algo' },
        { equipo: 'TFO 427', tipo_trabajo: 'reparacion', descripcion: '' },
        { equipo: '', tipo_trabajo: 'llantas', descripcion: '4 llantas nuevas' },
      ],
      informe: {
        fecha: '2026-10-29',
        persona: 'Pedro Luis Cartagena',
        actividades: [
          { descripcion: 'se recoge personal a la obra' },
          { descripcion: 'se cambia espejo izquierdo de JMC NPX 602', equipo: 'NPX 602' },
          { descripcion: 'se lleva arranque a pto berrio', equipo: 'Grúa XYZ' },
          { descripcion: ' ' },
        ],
      },
    },
    MAQUINARIA_DE_OCC,
    origen,
  );
  assert.deepEqual(
    lectura.cambios.map((c) => [c.id, c.equipo.vehiculoId, c.cambio.estado, c.cambio.hora]),
    [['m-foto#cambio-0', 'tfo429', 'varado', '14:43']],
  );
  assert.deepEqual(
    lectura.trabajos.map((t) => [t.id, t.vehiculoId, t.tipo, t.reportadoPor]),
    [['m-foto#trabajo-0', 'tfo427', 'dano', 'Luis Javier']],
  );
  // En las actividades el equipo es un dato más: sin reconocer, la viñeta se guarda igual.
  assert.deepEqual(
    lectura.actividades.map((a) => [a.id, a.persona, a.equipo?.vehiculoId ?? null, a.equipo?.escrito ?? null]),
    [
      ['m-foto#actividad-0', 'Pedro Luis Cartagena', null, null],
      ['m-foto#actividad-1', 'Pedro Luis Cartagena', null, 'NPX 602'],
      ['m-foto#actividad-2', 'Pedro Luis Cartagena', null, 'Grúa XYZ'],
    ],
  );
  assert.deepEqual(
    lectura.apartados.map((a) => [a.seccion, a.renglon, a.motivo]),
    [
      ['cambios', 1, 'No se reconoció el equipo «Grúa XYZ»: no está registrado.'],
      ['trabajos', 1, 'No se entendió qué tipo de trabajo fue.'],
      ['trabajos', 2, 'Falta qué se hizo.'],
      ['trabajos', 3, 'Falta a qué equipo se le hizo el trabajo.'],
    ],
  );
});

prueba('038/RF-10, RF-15: llevar al día, y otra vez el mismo mensaje no duplica', () => {
  const lista = leerMensajeDeEmpresa(
    { lista: { equipos: [{ equipo: 'TFO 429', estado: 'operativo' }], notas: [{ texto: 'LVY 498 cambio de cárter' }] } },
    MAQUINARIA_DE_OCC,
    ORIGEN_OCC,
  );
  const foto = leerMensajeDeEmpresa(
    {
      cambios: [{ equipo: 'TFO 429', estado: 'varado', texto: 'varada' }],
      trabajos: [{ equipo: 'TFO 429', tipo_trabajo: 'reparacion', descripcion: 'cambio de tornillo central' }],
    },
    MAQUINARIA_DE_OCC,
    { mensajeId: 'm-foto', reportadoPor: 'Luis Javier', hora: '08:48' },
  );
  const datos = { origen: ORIGEN_OCC, dudosa: true, ahora: '2026-10-29T20:11:00-05:00' };
  let dia = llevarAlDia(BITACORA_OCC_VACIA, lista, datos);
  dia = llevarAlDia(dia, foto, { ...datos, origen: { mensajeId: 'm-foto', reportadoPor: 'Luis Javier', hora: '08:48' } });
  const otraVez = llevarAlDia(llevarAlDia(dia, lista, datos), foto, datos);
  for (const d of [dia, otraVez]) {
    assert.deepEqual(
      [d.estadoEquipos.length, d.estadoEquipos[0].cambios.length, d.trabajos.length, d.pendientes.length, d.listas.length],
      [1, 1, 1, 1, 0],
    );
  }
  assert.equal(dia.fechaDudosa, true);
  assert.equal(dia.lista?.mensajeId, 'm-lista');
  assert.equal(estadoActual(dia.estadoEquipos[0]), 'inoperativo');
});

prueba('038/RF-14, RF-12b: las lecturas del grupo de OCC, solo de un equipo ligado', () => {
  const lectura = leerMensajeDeEmpresa(
    {
      lecturas: [
        { equipo: 'LVY 002', valor: '74609', unidad: 'Km final' },
        { equipo: 'LUY002', valor: 74609, unidad: 'km' },
        { equipo: 'TFO 427', valor: 5828.4, unidad: 'horas' },
        { equipo: 'TFO 429', valor: 1200, unidad: '' },
        { equipo: 'Grúa XYZ', valor: 10, unidad: 'km' },
        { equipo: 'TFO 429', valor: null, unidad: 'km' },
      ],
    },
    MAQUINARIA_DE_OCC,
    { mensajeId: 'm-km', reportadoPor: 'pedro cartagena', hora: '20:31' },
  );
  assert.deepEqual(lectura.lecturas, [
    { vehiculoId: 'lvy002', clase: 'odometro', valor: 74609 },
    { vehiculoId: 'tfo427', clase: 'horometro', valor: 5828.4 },
  ]);
  // La placa mal escrita no va a ningún medidor, pero se avisa; sin unidad, tampoco.
  assert.deepEqual(
    lectura.apartados.map((a) => [a.seccion, a.renglon]),
    [
      ['lecturas', 1],
      ['lecturas', 3],
      ['lecturas', 4],
    ],
  );
  assert.match(lectura.apartados[0].motivo, /posiblemente sea LVY002/);
  assert.match(lectura.apartados[1].motivo, /kilómetros o de horas/);
  // Una lectura sola no abre la bitácora del día.
  assert.equal(lecturaVacia(lectura), true);
});

prueba('038/RF-9h: los mantenimientos de un mensaje, de sus trabajos y sus cambios', () => {
  const lectura = leerMensajeDeEmpresa(
    {
      trabajos: [
        { equipo: 'TFO 427', tipo_trabajo: 'preventivo', descripcion: 'Cambio de aceite motor y filtros' },
        { equipo: 'TFO 427', tipo_trabajo: 'llantas', descripcion: '4 llantas nuevas' },
      ],
      cambios: [
        { equipo: 'TFO 429', estado: 'operativo', texto: 'Vehículo disponible' },
        { equipo: 'TFO 420', estado: 'varado', texto: 'varado' },
      ],
    },
    [...MAQUINARIA_DE_OCC, { id: 'tfo420', codigoInterno: 'TFO420', placa: 'TFO420', obraId: 'obra-a' }],
    { mensajeId: 'm-t', reportadoPor: 'Luis Javier', hora: '14:45' },
  );
  assert.deepEqual(
    mantenimientosDelMensaje(lectura).map((m) => [m.vehiculoId, m.clase, m.resuelto]),
    [
      ['tfo427', 'aceite', false],
      ['tfo429', null, true],
    ],
  );
});

prueba('038/RF-16, RF-17: el día de OCC con la lista y el informe esperados', () => {
  const esperados = [
    { tipoReporte: 'lista_equipos' as const, autorId: null, autorNombre: null },
    { tipoReporte: 'informe_mantenimiento' as const, autorId: '83618886111404@lid', autorNombre: 'pedro cartagena' },
  ];
  const lista = { tipoReporte: 'lista_equipos' as const, autorId: '195700201640119@lid' };
  const informeDePedro = { tipoReporte: 'informe_mantenimiento' as const, autorId: '83618886111404' };
  const informeDeOtro = { tipoReporte: 'informe_mantenimiento' as const, autorId: '111789543034999@lid' };
  const dia = (recibidos: { tipoReporte: 'lista_equipos' | 'informe_mantenimiento' | null; autorId: string }[], fecha = '2026-10-29') =>
    diaCompleto({ esperados, recibidos, horario: HORARIO_PROPUESTO, fecha });
  // Un jueves: espera los dos, y el informe de quien se dijo.
  assert.deepEqual(dia([]).completo, false);
  assert.deepEqual(dia([lista]).faltan.map((f) => f.tipoReporte), ['informe_mantenimiento']);
  assert.equal(dia([lista, informeDeOtro]).completo, false);
  assert.equal(dia([lista, informeDePedro]).completo, true);
  // Una foto (sin reporte) no completa nada.
  assert.equal(dia([{ tipoReporte: null, autorId: 'x' }]).completo, false);
  // Un domingo basta el primer mensaje, como en una obra que no trabaja ese día.
  assert.equal(dia([lista], '2026-10-25').completo, true);
  // Sin esperados, también.
  assert.equal(diaCompleto({ esperados: [], recibidos: [lista], horario: HORARIO_PROPUESTO, fecha: '2026-10-29' }).completo, true);
});

prueba('038/RF-20, RF-23: el estado de un día de la bitácora de OCC en la lista', () => {
  assert.equal(estadoDelDiaDeEmpresa({ anulada: true, cerrada: true, armado: 'armada' }), 'anulada');
  assert.equal(estadoDelDiaDeEmpresa({ anulada: false, cerrada: true, armado: 'incompleta' }), 'cerrada');
  assert.equal(estadoDelDiaDeEmpresa({ anulada: false, cerrada: false, armado: 'incompleta' }), 'incompleta');
  assert.equal(estadoDelDiaDeEmpresa({ anulada: false, cerrada: false, armado: null }), 'en_espera');
});

prueba('038/RF-24: filtrar el día por equipo y por cómo quedó', () => {
  const lectura = leerMensajeDeEmpresa(
    {
      lista: {
        equipos: [
          { equipo: 'TFO 429', estado: 'operativo' },
          { equipo: 'TFO 427', estado: 'operativo' },
          { equipo: 'Vibrocompactador volvo', estado: 'inoperativo' },
        ],
        notas: [{ texto: 'TFO 427 pendiente plumillas', equipo: 'TFO 427' }],
      },
      cambios: [{ equipo: 'TFO 427', estado: 'varado', texto: 'dirección dura' }],
      trabajos: [
        { equipo: 'TFO 427', tipo_trabajo: 'reparacion', descripcion: 'revisión de dirección' },
        { equipo: 'TFO 429', tipo_trabajo: 'preventivo', descripcion: 'engrase' },
      ],
      informe: { actividades: [{ descripcion: 'se lleva personal' }, { descripcion: 'se revisa TFO 427', equipo: 'TFO 427' }] },
    },
    MAQUINARIA_DE_OCC,
    ORIGEN_OCC,
  );
  const dia = llevarAlDia(BITACORA_OCC_VACIA, lectura, { origen: ORIGEN_OCC, dudosa: false, ahora: 'x' });
  assert.equal(filtrarDia(dia, {}), dia);
  const tfo427 = filtrarDia(dia, { equipo: 'v:tfo427' });
  assert.deepEqual(
    [tfo427.estadoEquipos.length, tfo427.trabajos.length, tfo427.actividades.length, tfo427.pendientes.length],
    [1, 1, 1, 1],
  );
  // La TFO 427 se varó: queda entre las inoperativas con el vibro, y la TFO 429 no.
  const inoperativos = filtrarDia(dia, { estado: 'inoperativo' });
  assert.deepEqual(inoperativos.estadoEquipos.map((r) => r.vehiculoId).sort(), ['tfo427', 'vibro-volvo']);
  assert.deepEqual(inoperativos.trabajos.map((t) => t.vehiculoId), ['tfo427']);
  assert.deepEqual(filtrarDia(dia, { estado: 'operativo' }).estadoEquipos.map((r) => r.vehiculoId), ['tfo429']);
});

prueba('038/RF-18, RF-20: lo que impide corregir o anular la bitácora de OCC', () => {
  const dia = llevarAlDia(
    BITACORA_OCC_VACIA,
    leerMensajeDeEmpresa({ lista: { equipos: [{ equipo: 'TFO 429', estado: 'operativo' }] } }, MAQUINARIA_DE_OCC, ORIGEN_OCC),
    { origen: ORIGEN_OCC, dudosa: false, ahora: 'x' },
  );
  assert.equal(faltaDeLaCorreccion(dia), null);
  assert.match(faltaDeLaCorreccion({ estadoEquipos: [...dia.estadoEquipos, { ...dia.estadoEquipos[0], id: 'otro' }] })!, /dos veces/);
  assert.match(faltaDeLaCorreccion({ estadoEquipos: dia.estadoEquipos, trabajos: [{ ...dia.estadoEquipos[0], ...ORIGEN_OCC, id: dia.estadoEquipos[0].id, tipo: 'preventivo', descripcion: 'x' }] })!, /mismo id/);
  // El contrato: lo leído por el sistema vuelve igual, y lo vacío no pasa.
  assert.equal(correccionDeBitacoraDeEmpresa.safeParse({ version: 3, estadoEquipos: dia.estadoEquipos }).success, true);
  assert.equal(correccionDeBitacoraDeEmpresa.safeParse({ version: 3, trabajos: [{ ...dia.estadoEquipos[0], ...ORIGEN_OCC, tipo: 'preventivo', descripcion: '  ' }] }).success, false);
  assert.equal(correccionDeBitacoraDeEmpresa.safeParse({ estadoEquipos: [] }).success, false);
  assert.equal(anulacionDeBitacoraDeEmpresa.safeParse({ version: 1, motivo: '   ' }).success, false);
  assert.equal(anulacionDeBitacoraDeEmpresa.safeParse({ version: 1, motivo: 'Lista del 28 era del 29' }).success, true);
});

prueba('038/RF-25: el origen de la bandeja de una empresa', () => {
  assert.equal(origenDeLaBandeja('grupo'), 'grupo');
  assert.equal(origenDeLaBandeja('obras'), 'obras');
  assert.equal(origenDeLaBandeja('todos'), 'todos');
  // Sin origen o uno que no existe: todos, para no perder lo que ya se veía.
  assert.equal(origenDeLaBandeja(null), 'todos');
  assert.equal(origenDeLaBandeja('otro'), 'todos');
});

prueba('038/RF-11: un equipo completado en «No se pudo guardar» entra sin reemplazar la lista', () => {
  const dia = llevarAlDia(
    BITACORA_OCC_VACIA,
    leerMensajeDeEmpresa(
      {
        lista: { equipos: [{ equipo: 'TFO 429', estado: 'operativo' }] },
        cambios: [{ equipo: 'TFO 427', estado: 'varado', texto: 'dirección dura' }],
      },
      MAQUINARIA_DE_OCC,
      ORIGEN_OCC,
    ),
    { origen: ORIGEN_OCC, dudosa: false, ahora: 'x' },
  );
  const completado = (equipo: string, vehiculoId: string, estado: 'operativo' | 'inoperativo') => ({
    vehiculoId,
    escrito: equipo,
    posiblePlaca: null,
    id: `m-lista#excepcion-estado_equipos-3#estado-0`,
    estado,
    motivo: 'completado',
    origen: ORIGEN_OCC,
    cambios: [],
  });
  // Un equipo nuevo se suma; la lista sigue igual.
  const conNuevo = agregarEstadoAlDia(dia, completado('LVY 002', 'lvy002', 'operativo'));
  assert.deepEqual(conNuevo.estadoEquipos.map((r) => r.vehiculoId), ['tfo429', 'tfo427', 'lvy002']);
  assert.equal(conNuevo.lista?.mensajeId, 'm-lista');
  // Uno que ya tenía renglón por un cambio del día toma el estado y conserva sus cambios.
  const tfo427 = agregarEstadoAlDia(dia, completado('TFO 427', 'tfo427', 'inoperativo')).estadoEquipos.find(
    (r) => r.vehiculoId === 'tfo427',
  )!;
  assert.deepEqual([tfo427.estado, tfo427.motivo, tfo427.cambios.length], ['inoperativo', 'completado', 1]);
});

prueba('038/RF-28, RF-29, RF-31: Geolab sin bitácora propia; quién alcanza la de OCC y sus reportes', () => {
  // RF-28: el grupo de Geolab se guarda y se ve, sin armar bitácora; OCC sí la arma.
  assert.deepEqual([...EMPRESAS_CON_BITACORA_PROPIA], ['occ']);
  // RF-31: el asistente consulta la bitácora de OCC con los permisos de su pantalla.
  const quien = (rol: Rol, obraId: string | null = null) => ({ rol, obraId, modulosDeObra: TODOS_LOS_MODULOS });
  // Desde la 040 es `bitacorasDeEmpresa` (la de OCC y la de Geolab).
  const deOcc = (rol: Rol, obraId: string | null = null) => alcanceDelAsistente(quien(rol, obraId)).bitacorasDeEmpresa.includes('occ');
  assert.equal(deOcc('admin'), true);
  assert.equal(deOcc('encargado_occ'), true);
  assert.equal(deOcc('director_obra', 'o1'), false);
  assert.equal(deOcc('laboratorista', 'o1'), false);
  // RF-28: el laboratorista ve los Reportes de WhatsApp de Geolab con el permiso de la Bitácora
  // de la empresa, y no el de WhatsApp, que le abriría las bandejas y el asistente de las obras.
  assert.equal(alcanza('laboratorista', 'whatsapp', 'listar'), false);
  assert.equal(alcanza('laboratorista', 'bitacora_empresa', 'listar'), true);
  assert.ok(!alcanceDelAsistente(quien('laboratorista', 'o1')).modulos.includes('whatsapp'));
});

prueba('038/RF-9b: un bloque de lista vacío (como lo manda la IA) no borra la lista del día', () => {
  const dia = llevarAlDia(
    BITACORA_OCC_VACIA,
    leerMensajeDeEmpresa({ lista: { equipos: [{ equipo: 'TFO 429', estado: 'operativo' }] } }, MAQUINARIA_DE_OCC, ORIGEN_OCC),
    { origen: ORIGEN_OCC, dudosa: false, ahora: 'x' },
  );
  const foto = leerMensajeDeEmpresa(
    {
      lista: { fecha: '', equipos: [], notas: [] },
      informe: { fecha: '', persona: '', actividades: [] },
      trabajos: [{ equipo: 'TFO 429', tipo_trabajo: 'preventivo', descripcion: 'engrase' }],
    },
    MAQUINARIA_DE_OCC,
    { mensajeId: 'm-foto', reportadoPor: 'Luis Javier', hora: '09:00' },
  );
  assert.equal(foto.lista, null);
  const despues = llevarAlDia(dia, foto, { origen: ORIGEN_OCC, dudosa: false, ahora: 'x' });
  assert.deepEqual([despues.estadoEquipos.length, despues.lista?.mensajeId, despues.trabajos.length], [1, 'm-lista', 1]);
});

prueba('039/RF-15 a RF-17: las lecturas se leen con coma o punto y se muestran con punto', () => {
  // RF-15: coma o punto decimal; el punto siempre es decimal; con los dos, el último manda.
  assert.equal(leerLectura('4250,32'), 4250.32);
  assert.equal(leerLectura('4250.32'), 4250.32);
  assert.equal(leerLectura('5.830'), 5.83);
  assert.equal(leerLectura('4.250,32'), 4250.32);
  assert.equal(leerLectura('1,234.5'), 1234.5);
  assert.equal(leerLectura(' 812 h '), 812);
  assert.equal(leerLectura('4250,32 km'), 4250.32);
  assert.equal(leerLectura('5828.4 hr'), 5828.4);
  assert.equal(leerLectura('4250,325'), 4250.33);
  assert.equal(leerLectura(4250.321), 4250.32);
  for (const malo of ['abc', '-3', '', '.', '12a', null, undefined, Number.NaN, -1]) {
    assert.equal(leerLectura(malo as string | number | null | undefined), null, String(malo));
  }
  // RF-17: punto decimal, sin miles ni ceros de más.
  assert.equal(mostrarLectura(4250.32, 'km'), '4250.32 km');
  assert.equal(mostrarLectura(812.5, 'h'), '812.5 h');
  assert.equal(mostrarLectura(12000), '12000');
  assert.equal(mostrarLectura(4250.3), '4250.3');
  assert.equal(mostrarLectura(null), '');
  // RF-16: hasta dos decimales.
  assert.equal(tieneDecimalesDeLectura(4250.32), true);
  assert.equal(tieneDecimalesDeLectura(0.1 + 0.2), true);
  assert.equal(tieneDecimalesDeLectura(4250.321), false);
});

prueba('039/RF-16: Vehículos acepta lecturas con hasta dos decimales', () => {
  const editado = vehiculoEditado.parse({ odometroKm: 4250.32, horometroH: 812.5 });
  assert.equal(editado.odometroKm, 4250.32);
  assert.equal(editado.horometroH, 812.5);
  assert.equal(vehiculoEditado.safeParse({ odometroKm: 4250.321 }).success, false);
  assert.equal(vehiculoEditado.safeParse({ horometroH: -1 }).success, false);
  // Lo que escribe el formulario, con coma o con punto, llega al contrato ya leído.
  assert.equal(vehiculoEditado.parse({ odometroKm: leerLectura('4250,32') }).odometroKm, 4250.32);
});

prueba('039/RF-11, RF-12: maquinaria, personal, notas y fotografía se marcan «no aplica»', () => {
  const vacio: ParteEvaluable = { ...PARTE_COMPLETO, maquinaria: [], personal: [], notas: '' };
  // Sin marcas, se piden como siempre.
  assert.deepEqual(bloqueosDelCierre(vacio, SIN_FOTOS), [
    'Falta llenar: Maquinaria, Personal, Notas y Fotografía del día.',
  ]);
  // Con su marca y su motivo cuentan como llenas.
  const marcadas: ParteEvaluable = {
    ...vacio,
    seccionesSinRegistro: {
      maquinaria: { motivo: 'Lluvia' },
      personal: { motivo: 'Paro' },
      notas: { motivo: 'sin novedad' },
      fotografia: { motivo: 'Sin señal' },
    },
  };
  assert.deepEqual(bloqueosDelCierre(marcadas, SIN_FOTOS), []);
  // Marcadas sin motivo: se nombra el motivo, no la sección (RF-12).
  const sinMotivo: ParteEvaluable = {
    ...vacio,
    seccionesSinRegistro: { maquinaria: { motivo: null }, notas: { motivo: '  ' } },
  };
  assert.deepEqual(bloqueosDelCierre(sinMotivo, { delDia: 1 }), [
    'Falta llenar: Personal.',
    'Maquinaria: falta el motivo de «Hoy no trabajó maquinaria».',
    'Notas: falta el motivo de «Sin novedades».',
  ]);
  // Una marca con filas no estorba: la sección tiene lo suyo.
  assert.deepEqual(
    bloqueosDelCierre({ ...PARTE_COMPLETO, seccionesSinRegistro: { maquinaria: { motivo: null } } }, FOTOS_COMPLETAS),
    [],
  );
});

prueba('039/RF-13: no se marca una sección con filas; agregar filas quita la marca', () => {
  const sin = marcaDeSeccion({}, 'personal');
  assert.deepEqual(sin, { marcada: false, motivo: null });
  assert.equal(resolverSeccionSinRegistro(sin, { marcada: true }, 2).error, 'con_registros');
  assert.match(mensajeDeSeccionConRegistros('personal'), /personal registrado/);
  const marcada = marcaDeSeccion({ notas: { motivo: 'sin novedad' } }, 'notas');
  assert.deepEqual(resolverSeccionSinRegistro(marcada, {}, 1), { marcada: false, motivo: null, error: null });
  // Ida y vuelta al conjunto guardado.
  const conjunto = conMarcaDeSeccion({ maquinaria: { motivo: 'x' } }, 'fotografia', { marcada: true, motivo: 'Sin señal' });
  assert.deepEqual(conjunto, { maquinaria: { motivo: 'x' }, fotografia: { motivo: 'Sin señal' } });
  assert.deepEqual(conMarcaDeSeccion(conjunto, 'maquinaria', { marcada: false, motivo: null }), {
    fotografia: { motivo: 'Sin señal' },
  });
});

prueba('039/RF-14: la marca se lee en el índice y en la bitácora cerrada', () => {
  const conMarcas = seccionesDelParte({
    ...PARTE_VACIO,
    fotos: 0,
    noAplican: { maquinaria: true, personal: true, notas: true, fotografia: true },
  });
  for (const id of ['maquinaria', 'personal', 'notas', 'fotografia']) {
    assert.equal(conMarcas.find((s) => s.id === id)?.estado, 'no_aplica', id);
  }
  // Con fotos, se cuentan aunque haya marca vieja.
  assert.equal(
    seccionesDelParte({ ...PARTE_VACIO, fotos: 2, noAplican: { fotografia: true } }).find((s) => s.id === 'fotografia')?.estado,
    'lleno',
  );
  assert.deepEqual(
    textosSinRegistro({
      sinActividades: true,
      motivoSinActividades: 'Lluvia',
      seccionesSinRegistro: { notas: { motivo: 'sin novedad' }, maquinaria: { motivo: null } },
    }),
    ['No trabajó maquinaria — sin motivo escrito', 'No se realizaron actividades — Lluvia', 'Sin novedades — sin novedad'],
  );
  // En el día sin trabajo no se leen (como 032/RF-37).
  assert.deepEqual(textosSinRegistro({ sinTrabajo: true, seccionesSinRegistro: { notas: { motivo: 'x' } } }), []);
});

/* ── Spec 041: Director de Proyectos, Director de Obra y Residente ── */

console.log('\nCargos de obra (spec 041)\n');

/** Lo que cada uno puede en cada módulo, escrito entero: la tabla es el contrato (RF-57). */
const ESPERADO_041: Record<'residente' | 'director_obra' | 'director_proyectos', Partial<Record<ModuloConPermiso, readonly string[]>>> = {
  residente: {
    inicio: ['ver'],
    obras: [],
    personas: ['ver', 'listar', 'escribir'],
    vehiculos: ['listar'],
    asignaciones: ['ver', 'listar', 'escribir'],
    bitacoras: ['ver', 'listar', 'escribir'],
    preoperacionales: ['ver', 'listar'],
    almacen: ['ver', 'listar'],
    cantera: ['ver', 'listar'],
    laboratorio: ['ver', 'listar'],
    whatsapp: ['ver', 'listar', 'escribir', 'aprobar'],
    reportes: ['ver', 'listar', 'escribir'],
    contrato: ['ver', 'listar', 'escribir'],
    asistente: ['ver', 'listar'],
    empresa: [],
    finanzas: [],
    rrhh: ['ver', 'listar'],
    compras: [],
    tesoreria: [],
    documentos: ['ver', 'listar', 'escribir'],
    licitaciones: [],
    solicitudes: ['ver', 'listar', 'escribir'],
    bitacora_empresa: [],
    planificacion: [],
    cumplimiento: ['ver', 'listar'],
    plan_semanal: ['ver', 'listar', 'escribir'],
  },
  director_obra: {
    inicio: ['ver'],
    obras: [],
    personas: ['ver', 'listar', 'escribir', 'activar'],
    vehiculos: ['listar'],
    asignaciones: ['ver', 'listar', 'escribir'],
    bitacoras: ['ver', 'listar', 'escribir', 'anular'],
    preoperacionales: ['ver', 'listar', 'anular'],
    almacen: ['ver', 'listar', 'anular'],
    cantera: ['ver', 'listar', 'anular'],
    laboratorio: ['ver', 'listar', 'aprobar', 'anular'],
    whatsapp: ['ver', 'listar', 'escribir', 'aprobar'],
    reportes: ['ver', 'listar', 'escribir', 'anular'],
    contrato: ['ver', 'listar', 'escribir', 'anular'],
    asistente: ['ver', 'listar'],
    empresa: [],
    finanzas: [],
    rrhh: ['ver', 'listar'],
    compras: [],
    tesoreria: [],
    documentos: ['ver', 'listar', 'escribir'],
    licitaciones: [],
    solicitudes: ['ver', 'listar', 'escribir'],
    bitacora_empresa: [],
    planificacion: ['ver', 'listar'],
    cumplimiento: ['ver', 'listar'],
    plan_semanal: ['ver', 'listar', 'escribir', 'aprobar', 'anular'],
  },
  director_proyectos: {
    inicio: ['ver'],
    obras: ['ver', 'listar', 'escribir'],
    personas: ['ver', 'listar', 'escribir', 'activar'],
    vehiculos: ['ver', 'listar', 'escribir'],
    asignaciones: ['ver', 'listar', 'escribir'],
    bitacoras: ['ver', 'listar', 'escribir', 'anular'],
    preoperacionales: ['ver', 'listar', 'anular'],
    almacen: ['ver', 'listar', 'escribir', 'anular'],
    cantera: ['ver', 'listar', 'escribir', 'anular'],
    laboratorio: ['ver', 'listar', 'escribir', 'aprobar', 'anular'],
    whatsapp: ['ver', 'listar', 'escribir', 'aprobar'],
    reportes: ['ver', 'listar', 'escribir', 'anular'],
    contrato: ['ver', 'listar', 'escribir', 'aprobar', 'anular'],
    asistente: ['ver', 'listar'],
    empresa: [],
    finanzas: [],
    rrhh: ['ver', 'listar'],
    compras: [],
    tesoreria: [],
    documentos: ['ver', 'listar', 'escribir'],
    licitaciones: [],
    solicitudes: ['ver', 'listar', 'escribir'],
    bitacora_empresa: [],
    planificacion: ['ver', 'listar', 'escribir', 'aprobar', 'anular'],
    cumplimiento: ['ver', 'listar'],
    plan_semanal: ['ver', 'listar', 'escribir', 'aprobar', 'anular'],
  },
};

prueba('041/RF-1, RF-2: los tres accesos existen y ninguno se llama «Residente / Director»', () => {
  for (const rol of ['residente', 'director_obra', 'director_proyectos'] as const) assert.ok(ROLES.includes(rol), rol);
  assert.equal((ROLES as readonly string[]).includes('supervisor'), false);
  assert.deepEqual(
    [ETIQUETA_ROL.director_proyectos, ETIQUETA_ROL.director_obra, ETIQUETA_ROL.residente],
    ['Director de Proyectos', 'Director de Obra', 'Residente'],
  );
  assert.equal(Object.values(ETIQUETA_ROL).includes('Residente / Director'), false);
});

prueba('041/RF-57: la tabla completa de los tres accesos, módulo por módulo', () => {
  const acciones = ['ver', 'listar', 'escribir', 'anular', 'activar', 'aprobar'] as const;
  for (const [rol, modulos] of Object.entries(ESPERADO_041) as [keyof typeof ESPERADO_041, Partial<Record<ModuloConPermiso, readonly string[]>>][]) {
    for (const modulo of [...MODULOS, ...MODULOS_DE_EMPRESA]) {
      const esperado = modulos[modulo];
      assert.ok(esperado, `${rol}: falta ${modulo} en lo esperado`);
      const real = acciones.filter((a) => alcanza(rol, modulo, a));
      assert.deepEqual(real, acciones.filter((a) => esperado.includes(a)), `${rol} ${modulo}`);
    }
  }
});

prueba('041/RF-33 a RF-37, RF-61: el Residente registra y cierra el parte, no aprueba ni anula salvo la bandeja', () => {
  for (const modulo of [...MODULOS, ...MODULOS_DE_EMPRESA]) {
    assert.equal(alcanza('residente', modulo, 'anular'), false, modulo);
    if (modulo !== 'whatsapp') assert.equal(alcanza('residente', modulo, 'aprobar'), false, modulo);
  }
  assert.ok(alcanza('residente', 'whatsapp', 'aprobar'));
  // Cerrar el parte es escribir en bitácoras.
  assert.ok(alcanza('residente', 'bitacoras', 'escribir'));
  assert.match(motivoParaNoAprobar('residente', 'anular') ?? '', /Director de Obra, el Director de Proyectos o la Gerencia/);
  assert.match(motivoParaNoAprobar('residente', 'aprobar') ?? '', /Director de Obra, el Director de Proyectos o la Gerencia/);
  assert.equal(motivoParaNoAprobar('director_obra', 'anular'), null);
  assert.equal(motivoParaNoAprobar('residente', 'escribir'), null);
});

prueba('041/RF-58, RF-10: el contrato lo aprueban el Director de Proyectos y la Gerencia, no el Director de Obra', () => {
  assert.equal(alcanza('director_obra', 'contrato', 'aprobar'), false);
  assert.ok(alcanza('director_obra', 'contrato', 'escribir'));
  assert.ok(alcanza('director_proyectos', 'contrato', 'aprobar'));
});

prueba('041/RF-33, RF-35, RF-36: el Residente registra pólizas y mantenimientos, pero no los anula', () => {
  for (const modulo of ['contrato', 'reportes'] as const) {
    assert.ok(alcanza('residente', modulo, 'escribir'), modulo);
    assert.equal(alcanza('residente', modulo, 'anular'), false, modulo);
    assert.ok(alcanza('admin', modulo, 'anular'), modulo);
    assert.ok(alcanza('director_obra', modulo, 'anular'), modulo);
    assert.ok(alcanza('director_proyectos', modulo, 'anular'), modulo);
  }
  // RF-62: el Encargado de OCC conserva anular mantenimientos.
  assert.ok(alcanza('encargado_occ', 'reportes', 'anular'));
});

prueba('041/RF-75, RF-76: quién genera la contraseña temporal de quién', () => {
  // La gerencia, la de cualquiera que entre al panel.
  for (const rol of ['admin', 'director_proyectos', 'director_obra', 'residente', 'almacenista'] as const) {
    assert.ok(puedeGenerarClave('admin', rol), rol);
  }
  // Los directores, la de quienes pueden dar acceso.
  assert.ok(puedeGenerarClave('director_proyectos', 'director_obra'));
  assert.ok(puedeGenerarClave('director_proyectos', 'residente'));
  assert.ok(puedeGenerarClave('director_obra', 'residente'));
  assert.ok(puedeGenerarClave('director_obra', 'laboratorista'));
  // Hacia arriba o entre iguales, no: es entrar con la cuenta de quien responde por lo mismo.
  assert.equal(puedeGenerarClave('director_proyectos', 'director_proyectos'), false);
  assert.equal(puedeGenerarClave('director_proyectos', 'admin'), false);
  assert.equal(puedeGenerarClave('director_obra', 'director_obra'), false);
  assert.equal(puedeGenerarClave('director_obra', 'director_proyectos'), false);
  // El operador entra con su PIN; el Residente y la Auxiliar no generan contraseñas.
  assert.equal(puedeGenerarClave('admin', 'operador'), false);
  assert.equal(puedeGenerarClave('residente', 'operador'), false);
  assert.equal(puedeGenerarClave('residente', 'almacenista'), false);
  assert.equal(puedeGenerarClave('auxiliar_administrativa', 'almacenista'), false);
});

prueba('041/RF-7, RF-8, RF-77: el Director de Proyectos registra y edita obras, y solo la Gerencia las da de baja', () => {
  assert.ok(alcanza('director_proyectos', 'obras', 'escribir'));
  assert.equal(motivoParaNoDarDeBajaObra('admin'), null);
  for (const rol of ['director_proyectos', 'director_obra', 'residente', 'auxiliar_administrativa'] as const) {
    assert.equal(motivoParaNoDarDeBajaObra(rol), 'Dar de baja una obra lo hace la Gerencia.', rol);
  }
});

prueba('041/RF-62 a RF-64, RF-68: los demás cargos conservan lo suyo y los directores no tocan lo de empresa', () => {
  assert.ok(alcanza('encargado_occ', 'preoperacionales', 'anular'));
  assert.ok(alcanza('encargado_occ', 'bitacora_empresa', 'anular'));
  assert.ok(alcanza('encargado_planta', 'cantera', 'anular'));
  for (const modulo of ['compras', 'tesoreria'] as const) {
    assert.ok(alcanza('auxiliar_administrativa', modulo, 'aprobar'), modulo);
    assert.ok(alcanza('auxiliar_administrativa', modulo, 'anular'), modulo);
  }
  for (const rol of ['director_obra', 'director_proyectos'] as const) {
    for (const modulo of ['empresa', 'finanzas', 'compras', 'tesoreria', 'licitaciones', 'bitacora_empresa'] as const) {
      assert.equal(alcanza(rol, modulo, 'ver'), false, `${rol} ${modulo}`);
    }
  }
});

prueba('041/RF-5, RF-15: el Director de Proyectos ve todas las obras; el Director de Obra y el Residente, no', () => {
  assert.ok(rolVeTodasLasObras('director_proyectos'));
  assert.equal(rolVeTodasLasObras('director_obra'), false);
  assert.equal(rolVeTodasLasObras('residente'), false);
  assert.ok(rolDeVariasObras('director_obra'));
  assert.equal(rolDeVariasObras('residente'), false);
  assert.equal(rolDeVariasObras('director_proyectos'), false);
  // Sin obra no se le dice que le falta una: ve todas.
  assert.equal(sinObraAsignada('director_proyectos', null), false);
  assert.ok(sinObraAsignada('director_obra', null));
});

prueba('041/RF-12, RF-14, RF-26, RF-27, RF-38, RF-39: quién da cada acceso, y el mensaje dice quién puede', () => {
  assert.deepEqual(rolesQuePuedeDar('director_proyectos'), [
    'residente',
    'operador',
    'almacenista',
    'encargado_planta',
    'laboratorista',
    'director_obra',
  ]);
  assert.deepEqual(rolesQuePuedeDar('director_obra'), ['residente', 'operador', 'almacenista', 'encargado_planta', 'laboratorista']);
  assert.deepEqual(rolesQuePuedeDar('residente'), ['operador']);
  // RF-14: solo la gerencia da el de Director de Proyectos.
  for (const rol of ROLES) {
    assert.equal(puedeCambiarRol(rol, 'director_proyectos'), rol === 'admin', rol);
  }
  assert.equal(motivoParaNoDarRol('director_proyectos', 'director_proyectos'), 'Solo la gerencia puede dar el acceso de Director de Proyectos.');
  assert.equal(
    motivoParaNoDarRol('director_obra', 'director_obra'),
    'Solo la gerencia o el director de proyectos pueden dar el acceso de Director de Obra.',
  );
  assert.equal(
    motivoParaNoDarRol('residente', 'almacenista'),
    'Solo la gerencia, el director de proyectos o el director de obra pueden dar el acceso de Almacenista.',
  );
  assert.equal(motivoParaNoDarRol('residente', 'operador'), null);
});

prueba('041/RF-72: el Director de Proyectos y el Director de Obra emiten códigos del celular; el Residente no', () => {
  assert.ok(alcanza('director_proyectos', 'personas', 'activar'));
  assert.ok(alcanza('director_obra', 'personas', 'activar'));
  assert.equal(alcanza('residente', 'personas', 'activar'), false);
});

prueba('041/RF-40, RF-41: el rechazo de aprobar y anular nombra a los directores', () => {
  assert.equal(
    motivoDeRechazo('laboratorio', 'aprobar'),
    'No puede aprobar ni devolver este ensayo: lo hacen la gerencia, el director de proyectos y el director de obra.',
  );
  assert.equal(
    motivoDeRechazo('bitacoras', 'anular'),
    'No puede anular este registro: lo hacen la gerencia, el director de proyectos y el director de obra.',
  );
});

prueba('041/RF-3, RF-4, RF-66: los cargos de dirección sugieren su acceso; «Director» se llama «Director de Obra»', () => {
  assert.equal(nombreDeCargo('director_proyectos'), 'Director de Proyectos');
  assert.equal(rolSugerido('director_proyectos'), 'director_proyectos');
  // El slug `director` se conserva: ya hay personas apuntando a él.
  assert.equal(nombreDeCargo('director'), 'Director de Obra');
  assert.equal(rolSugerido('director'), 'director_obra');
  assert.equal(rolSugerido('residente_1'), 'residente');
  assert.equal(rolSugerido('residente_2'), 'residente');
  assert.equal(operaVehiculos('director_proyectos'), false);
});

prueba('041/RF-5, RF-24, RF-25: a dónde entra cada cargo de obra', () => {
  // El Director de Proyectos ve todas: la lista de Proyectos, tenga o no obra.
  assert.equal(destinoAlEntrar({ rol: 'director_proyectos', obras: [] }), '/panel/proyectos');
  // El Director de Obra: con una obra, directo a ella; con varias, la lista.
  assert.equal(destinoAlEntrar({ rol: 'director_obra', obras: ['o1'] }), '/panel/proyectos/o1');
  assert.equal(destinoAlEntrar({ rol: 'director_obra', obras: ['o1', 'o2'] }), '/panel/proyectos');
  // El Residente, a su obra.
  assert.equal(destinoAlEntrar({ rol: 'residente', obras: ['o1'] }), '/panel/proyectos/o1');
});

prueba('041/RF-5, RF-19: qué obras de Proyectos abre cada cargo por la ruta', () => {
  assert.ok(alcanzaLaObraDeLaRuta({ rol: 'director_proyectos', obraId: null, obras: [] }, 'cualquiera'));
  const director = { rol: 'director_obra' as const, obraId: 'o1', obras: ['o1', 'o2'] };
  assert.ok(alcanzaLaObraDeLaRuta(director, 'o1'));
  // La otra suya también, aunque la obra en uso sea la primera.
  assert.ok(alcanzaLaObraDeLaRuta(director, 'o2'));
  assert.equal(alcanzaLaObraDeLaRuta(director, 'o3'), false);
  assert.equal(alcanzaLaObraDeLaRuta({ rol: 'residente', obraId: 'o1', obras: ['o1'] }, 'o2'), false);
  // Quien ve todas sin entrar a Proyectos sigue sin abrir una obra (034, 035).
  assert.equal(alcanzaLaObraDeLaRuta({ rol: 'encargado_occ', obraId: null, obras: [] }, 'o1'), false);
});

prueba('041/RF-22, RF-67: «Cambiar de obra» para quien tiene varias, y vuelve a la misma página', () => {
  const enObra = { tipo: 'obra' as const, obraId: 'o1', pagina: 'almacen' };
  const claves = (quien: Parameters<typeof menuDelLugar>[1]) => menuDelLugar(enObra, quien).navegacion.map((e) => e.clave);
  // El Director de Obra con dos obras cambia de obra; con una sola no tiene a cuál.
  assert.deepEqual(claves({ rol: 'director_obra', obraId: 'o1', obras: ['o1', 'o2'] }), ['cambiar-obra']);
  assert.deepEqual(claves({ rol: 'director_obra', obraId: 'o1', obras: ['o1'] }), []);
  assert.deepEqual(claves({ rol: 'residente', obraId: 'o1', obras: ['o1'] }), []);
  // El Director de Proyectos también, sin «← Empresas»: no entra a las demás empresas.
  assert.deepEqual(claves({ rol: 'director_proyectos', obraId: null, obras: [] }), ['cambiar-obra']);
  assert.deepEqual(claves({ rol: 'admin', obraId: null, obras: [] }), ['empresas', 'cambiar-obra']);
  // La lista abre la misma página en la obra que se escoja.
  const cambiar = menuDelLugar(enObra, { rol: 'director_obra', obraId: 'o1', obras: ['o1', 'o2'] }).navegacion[0];
  assert.equal(cambiar.ruta, '/panel/proyectos?ir=almacen');
  // En la portada de la obra, sin página: la lista sin `ir`.
  const enPortada = menuDelLugar({ tipo: 'obra', obraId: 'o1', pagina: null }, { rol: 'admin', obraId: null, obras: [] });
  assert.equal(enPortada.navegacion[1].ruta, '/panel/proyectos');
});

prueba('041/RF-5, RF-19, RF-24: los enlaces de antes llevan a cada cargo de obra a su sitio', () => {
  // El Director de Proyectos va a la obra del enlace, como la gerencia, y sin ella a la lista.
  assert.equal(rutaNueva('/panel/almacen?obraId=o9', { rol: 'director_proyectos', obraId: null, obras: [] }), '/panel/proyectos/o9/almacen');
  assert.equal(rutaNueva('/panel/almacen', { rol: 'director_proyectos', obraId: null, obras: [] }), '/panel/proyectos?ir=almacen');
  // El Director de Obra, a la del enlace si es suya; si no, a la lista de las suyas.
  const director = { rol: 'director_obra' as const, obraId: null, obras: ['o1', 'o2'] };
  assert.equal(rutaNueva('/panel/almacen?obraId=o2', director), '/panel/proyectos/o2/almacen');
  assert.equal(rutaNueva('/panel/almacen?obraId=o9', director), '/panel/proyectos?ir=almacen');
  assert.equal(rutaNueva('/panel/almacen', director), '/panel/proyectos?ir=almacen');
  // Con una sola obra, a esa, como antes.
  assert.equal(rutaNueva('/panel/almacen', { rol: 'director_obra', obraId: 'o1', obras: ['o1'] }), '/panel/proyectos/o1/almacen');
});

prueba('041/RF-16, RF-18, RF-32: cuántas obras lleva cada acceso', () => {
  assert.equal(reparoDeObrasDelAcceso('director_obra', [])?.mensaje, 'El Director de Obra necesita al menos una obra: escoja una.');
  assert.equal(reparoDeObrasDelAcceso('director_obra', ['o1']), null);
  assert.equal(reparoDeObrasDelAcceso('director_obra', ['o1', 'o2', 'o3']), null);
  assert.equal(reparoDeObrasDelAcceso('residente', [])?.mensaje, 'El Residente necesita su obra: escoja una.');
  assert.equal(reparoDeObrasDelAcceso('residente', ['o1']), null);
  assert.equal(reparoDeObrasDelAcceso('residente', ['o1', 'o2'])?.mensaje, 'El Residente está en una sola obra.');
  assert.equal(
    reparoDeObrasDelAcceso('director_proyectos', ['o1'])?.mensaje,
    'El Director de Proyectos no lleva obra: ve todas las obras.',
  );
  assert.equal(reparoDeObrasDelAcceso('director_proyectos', []), null);
  // Los demás accesos no cambian con esta regla.
  assert.equal(reparoDeObrasDelAcceso('almacenista', []), null);
  assert.equal(reparoDeObrasDelAcceso('admin', []), null);
  // Y el Director de Proyectos es un acceso sin obra, de Proyectos.
  assert.equal(empresaDelAccesoSinObra('director_proyectos'), 'proyectos');
  assert.equal(reparoDelAccesoSinObra({ rol: 'director_proyectos', obraId: 'o1', empresa: 'proyectos' })?.campo, 'obraId');
  assert.equal(reparoDelAccesoSinObra({ rol: 'director_proyectos', obraId: null, empresa: null }), null);
});

prueba('041/RF-46 a RF-48: a qué acceso pasa cada persona que tenía «Residente / Director»', () => {
  assert.deepEqual(accesoTrasLaMigracion('supervisor', 'director'), { rol: 'director_obra', revisar: false });
  assert.deepEqual(accesoTrasLaMigracion('supervisor', 'residente_1'), { rol: 'residente', revisar: false });
  assert.deepEqual(accesoTrasLaMigracion('supervisor', 'residente_2'), { rol: 'residente', revisar: false });
  // Otro cargo o ninguno: Residente, y a la lista de revisar (RF-48, RF-51).
  assert.deepEqual(accesoTrasLaMigracion('supervisor', 'topografo'), { rol: 'residente', revisar: true });
  assert.deepEqual(accesoTrasLaMigracion('supervisor', null), { rol: 'residente', revisar: true });
  // RF-65: quien queda sin obra también va a la lista de revisar, sea cual sea su cargo.
  assert.deepEqual(accesoTrasLaMigracion('supervisor', 'director', false), { rol: 'director_obra', revisar: true });
  assert.deepEqual(accesoTrasLaMigracion('supervisor', 'residente_1', false), { rol: 'residente', revisar: true });
  assert.deepEqual(accesoTrasLaMigracion('supervisor', 'residente_1', true), { rol: 'residente', revisar: false });
  // A los demás accesos no los toca.
  assert.equal(accesoTrasLaMigracion('admin', 'gerente'), null);
  assert.equal(accesoTrasLaMigracion('almacenista', 'director'), null);
});

prueba('041/RF-70, RF-71: las obras al cambiar de acceso', () => {
  const director = { rol: 'director_obra' as const, obras: ['o1', 'o2'] };
  // Bajar a Residente exige escoger cuál conserva.
  assert.deepEqual(obrasAlCambiarDeAcceso(director, 'residente', null), {
    ok: false,
    mensaje: 'Escoja cuál de sus obras conserva como Residente.',
  });
  assert.deepEqual(obrasAlCambiarDeAcceso(director, 'residente', 'o9'), {
    ok: false,
    mensaje: 'Esa obra no es de este Director de Obra.',
  });
  assert.deepEqual(obrasAlCambiarDeAcceso(director, 'residente', 'o2'), { ok: true, obras: ['o2'] });
  // Con una sola obra no hay qué escoger.
  assert.deepEqual(obrasAlCambiarDeAcceso({ rol: 'director_obra', obras: ['o1'] }, 'residente', null), { ok: true, obras: ['o1'] });
  // Subir a Director de Obra conserva la obra que tenía.
  assert.deepEqual(obrasAlCambiarDeAcceso({ rol: 'residente', obras: ['o1'] }, 'director_obra', null), { ok: true, obras: ['o1'] });
  // Al Director de Proyectos no le queda ninguna: ve todas.
  assert.deepEqual(obrasAlCambiarDeAcceso(director, 'director_proyectos', null), { ok: true, obras: [] });
  // Sin cambio de acceso, sus obras siguen igual.
  assert.deepEqual(obrasAlCambiarDeAcceso(director, 'director_obra', null), { ok: true, obras: ['o1', 'o2'] });
  // A cualquier acceso de una sola obra (T10): el almacenista también escoge cuál conserva.
  assert.deepEqual(obrasAlCambiarDeAcceso(director, 'almacenista', null), {
    ok: false,
    mensaje: 'Escoja cuál de sus obras conserva como Almacenista.',
  });
  assert.deepEqual(obrasAlCambiarDeAcceso(director, 'operador', 'o1'), { ok: true, obras: ['o1'] });
  // Entre accesos de una obra, la obra no cambia aquí.
  assert.deepEqual(obrasAlCambiarDeAcceso({ rol: 'operador', obras: ['o1'] }, 'almacenista', null), { ok: true, obras: ['o1'] });
  // A un acceso sin obra no se le pregunta cuál: no le queda ninguna.
  assert.deepEqual(obrasAlCambiarDeAcceso(director, 'admin', null), { ok: true, obras: [] });
  assert.deepEqual(obrasAlCambiarDeAcceso(director, 'encargado_occ', null), { ok: true, obras: [] });
});

prueba('041/RF-17, RF-18, RF-32, RF-70: qué campo de obras pide el formulario de Personas', () => {
  // RF-17: el Director de Obra, varias; también al subir a alguien a ese acceso.
  assert.equal(campoDeObras('director_obra'), 'varias');
  assert.equal(campoDeObras('director_obra', 'residente'), 'varias');
  assert.equal(campoDeObras('director_obra', 'director_obra'), 'varias');
  // RF-32: el Residente, una y obligatoria.
  assert.equal(campoDeObras('residente'), 'una-obligatoria');
  assert.equal(campoDeObras('residente', 'operador'), 'una-obligatoria');
  // RF-16: el Director de Proyectos y los demás accesos sin obra, ninguna.
  for (const rol of ['director_proyectos', 'encargado_occ', 'auxiliar_administrativa'] as const) {
    assert.equal(campoDeObras(rol), 'ninguna', rol);
  }
  // RF-70: bajar a un Director de Obra pregunta cuál conserva, a cualquier acceso de una obra.
  assert.equal(campoDeObras('residente', 'director_obra'), 'conservada');
  assert.equal(campoDeObras('almacenista', 'director_obra'), 'conservada');
  // Pero a un acceso que ve todas no le queda ninguna: no hay nada que preguntar.
  assert.equal(campoDeObras('admin', 'director_obra'), 'ninguna');
  assert.equal(campoDeObras('director_proyectos', 'director_obra'), 'ninguna');
  // Los demás, como siempre: una obra, que puede quedar vacía.
  assert.equal(campoDeObras('operador'), 'una');
  assert.equal(campoDeObras('almacenista', 'operador'), 'una');
  assert.equal(campoDeObras('admin'), 'una');
});

prueba('041/RF-51: apagar «revisar» es de la Gerencia y del Director de Proyectos', () => {
  assert.ok(puedeMarcarRevisado('admin'));
  assert.ok(puedeMarcarRevisado('director_proyectos'));
  for (const rol of ['director_obra', 'residente', 'encargado_occ', 'auxiliar_administrativa', 'operador'] as const) {
    assert.equal(puedeMarcarRevisado(rol), false, rol);
  }
});

prueba('041/RF-13, RF-28: asignar obras a un Director de Obra es del Director de Proyectos y de la Gerencia', () => {
  const directorDeObra = { id: 'd1', rol: 'director_obra' as const };
  assert.equal(motivoParaNoAsignarObras({ id: 'g', rol: 'admin' }, directorDeObra), null);
  assert.equal(motivoParaNoAsignarObras({ id: 'p', rol: 'director_proyectos' }, directorDeObra), null);
  const noPuede = 'Asignar o retirar obras a un Director de Obra lo hacen el Director de Proyectos o la Gerencia.';
  // Ni a otro director ni a sí mismo (RF-28).
  assert.equal(motivoParaNoAsignarObras({ id: 'd2', rol: 'director_obra' }, directorDeObra), noPuede);
  assert.equal(motivoParaNoAsignarObras({ id: 'd1', rol: 'director_obra' }, directorDeObra), noPuede);
  assert.equal(motivoParaNoAsignarObras({ id: 'r', rol: 'residente' }, directorDeObra), noPuede);
  // Varias obras solo las lleva el Director de Obra.
  assert.equal(
    motivoParaNoAsignarObras({ id: 'g', rol: 'admin' }, { id: 'r', rol: 'residente' }),
    'Solo al Director de Obra se le asignan varias obras.',
  );
});

prueba('041/RF-42, RF-52: quien anuló sale con el acceso de esa fecha, no con el de hoy', () => {
  const cambio = new Date('2026-11-06T12:00:00Z');
  const tramos = [
    { rol: 'director_obra', desde: cambio, hasta: null },
    { rol: 'supervisor', desde: new Date('2026-08-01T00:00:00Z'), hasta: cambio },
  ];
  assert.equal(etiquetaDelAccesoEn(tramos, new Date('2026-10-20T00:00:00Z')), 'Residente / Director');
  assert.equal(etiquetaDelAccesoEn(tramos, new Date('2026-11-08T00:00:00Z')), 'Director de Obra');
  // En el instante del cambio ya vale el acceso nuevo: `hasta` no cuenta y `desde` sí.
  assert.equal(etiquetaDelAccesoEn(tramos, cambio), 'Director de Obra');
  // Antes de su primer acceso, o sin historia (las altas por WhatsApp): no se inventa ninguno.
  assert.equal(etiquetaDelAccesoEn(tramos, new Date('2026-07-01T00:00:00Z')), null);
  assert.equal(etiquetaDelAccesoEn([], cambio), null);

  assert.equal(firmaConAcceso('Ana Ruiz', 'Residente / Director'), 'Ana Ruiz (Residente / Director)');
  assert.equal(firmaConAcceso('Ana Ruiz', null), 'Ana Ruiz');
});

prueba('041/RF-42, RF-52: el nombre de un acceso de la historia, también el de antes de la 041', () => {
  assert.equal(etiquetaDeAccesoHistorico('supervisor'), 'Residente / Director');
  assert.equal(etiquetaDeAccesoHistorico('director_obra'), 'Director de Obra');
  assert.equal(etiquetaDeAccesoHistorico('residente'), 'Residente');
  assert.equal(etiquetaDeAccesoHistorico('admin'), 'Gerencia');
  // Un valor que no se conoce no se inventa: se muestra tal cual.
  assert.equal(etiquetaDeAccesoHistorico('otro'), 'otro');
});

prueba('041/RF-19, RF-20: una fila o una imagen concreta, contra todas las obras de la persona', () => {
  // El Director de Obra con la obra A en uso toca una fila de su obra B, no de una C.
  const director = sesionDe('director_obra', 'o1', ['o1', 'o2']);
  assert.ok(alcanzaLaObra(director, 'o1'));
  assert.ok(alcanzaLaObra(director, 'o2'));
  assert.equal(alcanzaLaObra(director, 'o3'), false);
  assert.ok(alcanzaLaObra(director, null));
  assert.ok(alcanzaLaImagen(director, { existe: true, obraId: 'o2' }, 'bitacoras'));
  assert.equal(alcanzaLaImagen(director, { existe: true, obraId: 'o3' }, 'bitacoras'), false);
  // Sin obra en uso (varias y ninguna pedida) sigue alcanzando las suyas, fila por fila.
  const sinEnUso = sesionDe('director_obra', null, ['o1', 'o2']);
  assert.ok(alcanzaLaObra(sinEnUso, 'o2'));
  // El Director de Obra sin ninguna obra no alcanza nada (RF-65).
  assert.equal(alcanzaLaObra(sesionDe('director_obra', null, []), 'o1'), false);
  // El Director de Proyectos, cualquiera; una imagen, con el permiso de su módulo (034).
  const proyectos = sesionDe('director_proyectos', null);
  assert.ok(alcanzaLaObra(proyectos, 'o9'));
  assert.ok(alcanzaLaImagen(proyectos, { existe: true, obraId: 'o9' }, 'bitacoras'));
  assert.equal(alcanzaLaImagen(proyectos, { existe: true, obraId: 'o9' }, 'finanzas'), false);
  // Una imagen huérfana sigue siendo solo de la gerencia, que revisa lo que quedó sin dueño.
  assert.equal(alcanzaLaImagen(proyectos, { existe: false, obraId: null }, 'bitacoras'), false);
});

prueba('041/RF-19: una fila con obra, de cualquiera de las suyas y nunca una sin obra', () => {
  // Los lectores que antes comparaban con `obraId` (la marca de lo creado por WhatsApp,
  // la máquina de un reporte, el día de una obra): el Director de Obra alcanza la B
  // aunque tenga la A en uso, y una fila sin obra sigue sin ser de nadie salvo de quien
  // ve todas, como cuando la comparación era `!==`.
  const director = sesionDe('director_obra', 'o1', ['o1', 'o2']);
  assert.ok(esDeSusObras(director, 'o1'));
  assert.ok(esDeSusObras(director, 'o2'));
  assert.equal(esDeSusObras(director, 'o3'), false);
  assert.equal(esDeSusObras(director, null), false);
  assert.ok(esDeSusObras(sesionDe('residente', 'o1'), 'o1'));
  assert.equal(esDeSusObras(sesionDe('residente', 'o1'), 'o2'), false);
  assert.ok(esDeSusObras(sesionDe('director_proyectos', null), 'o9'));
  assert.ok(esDeSusObras(sesionDe('admin', null), null));
});

prueba('041/RF-23: dónde se escribe lo que registra cada cargo', () => {
  const director = sesionDe('director_obra', 'o1', ['o1', 'o2']);
  // Por omisión, en la obra en uso; si el cuerpo pide otra de las suyas, en esa.
  assert.equal(obraParaEscribir(director, null), 'o1');
  assert.equal(obraParaEscribir(director, 'o2'), 'o2');
  // Una ajena no: queda la obra en uso, como si no la hubiera pedido (RF-20).
  assert.equal(obraParaEscribir(director, 'o3'), 'o1');
  // El residente, siempre la suya.
  assert.equal(obraParaEscribir(sesionDe('residente', 'o1'), 'o2'), 'o1');
  // Quien ve todas escribe donde pide, como hoy la gerencia.
  assert.equal(obraParaEscribir(sesionDe('director_proyectos', null), 'o9'), 'o9');
  assert.equal(obraParaEscribir(sesionDe('admin', null), null), null);
});

prueba('041/RF-20, RF-22, RF-23: la obra en uso', () => {
  assert.equal(obraEnUso('o2', ['o1', 'o2']), 'o2');
  // Una obra ajena no se acepta ni da error: es como si no existiera.
  assert.equal(obraEnUso('o9', ['o1', 'o2']), null);
  assert.equal(obraEnUso('o9', ['o1']), 'o1');
  // Sin pedir: la única, si hay una; con varias, ninguna (va a la lista).
  assert.equal(obraEnUso(null, ['o1']), 'o1');
  assert.equal(obraEnUso(undefined, ['o1', 'o2']), null);
  assert.equal(obraEnUso('', ['o1', 'o2']), null);
  assert.equal(obraEnUso('o1', []), null);
});

prueba('041/RF-53 a RF-55: lo que el asistente le responde a cada cargo de obra', () => {
  const de = (rol: Rol, obras: string[]) =>
    alcanceDelAsistente({ rol, obraId: obras[0] ?? null, obras, modulosDeObra: TODOS_LOS_MODULOS });

  // RF-53: el Director de Proyectos, todas las obras y nada de lo administrativo de empresa.
  const proyectos = de('director_proyectos', []);
  assert.equal(proyectos.usa, true);
  assert.equal(proyectos.obras, 'todas');
  for (const modulo of ['compras', 'tesoreria', 'finanzas', 'bitacora_empresa'] as const) {
    assert.equal(proyectos.modulos.includes(modulo), false, modulo);
  }
  assert.deepEqual(proyectos.empresas, []);
  for (const modulo of ['bitacoras', 'almacen', 'laboratorio', 'contrato', 'vehiculos', 'personas', 'solicitudes'] as const) {
    assert.ok(proyectos.modulos.includes(modulo), modulo);
  }

  // RF-73, RF-74: el Director de Obra, solo su obra en uso; ni siquiera su otra obra.
  const director = de('director_obra', ['o1', 'o2']);
  assert.deepEqual(director.obras, ['o1']);
  assert.equal(obraAlAlcance(director, 'o1'), true);
  assert.equal(obraAlAlcance(director, 'o2'), false);
  assert.equal(obraAlAlcance(director, 'o3'), false);
  assert.ok(director.modulos.includes('vehiculos') && director.modulos.includes('personas'));
  assert.match(obrasAlcanzadasEnTexto(director), /Cambiar de obra/);
  assert.match(obrasAlcanzadasEnTexto(director), /no consulte nada/);

  // RF-73: los módulos son los de la obra en uso.
  const sinAlmacen = alcanceDelAsistente({
    rol: 'director_obra',
    obraId: 'o1',
    obras: ['o1', 'o2'],
    modulosDeObra: { ...TODOS_LOS_MODULOS, almacen: false },
  });
  assert.equal(sinAlmacen.modulos.includes('almacen'), false);

  // Con varias obras y ninguna en uso: nada de ninguna, y se le pide abrir una.
  const sinEscoger = alcanceDelAsistente({ rol: 'director_obra', obraId: null, obras: ['o1', 'o2'], modulosDeObra: TODOS_LOS_MODULOS });
  assert.deepEqual(sinEscoger.obras, []);
  assert.deepEqual(sinEscoger.modulos, []);
  assert.match(obrasAlcanzadasEnTexto(sinEscoger), /abra una/);

  // Los demás siguen diciendo lo de siempre.
  assert.equal(obrasAlcanzadasEnTexto(proyectos), 'todas las obras');
  assert.equal(obrasAlcanzadasEnTexto(de('residente', ['o1'])), 'una sola obra');
  assert.match(obrasAlcanzadasEnTexto(de('director_obra', [])), /no tiene obra asignada/);

  // RF-55: el Residente, lo de antes del Residente / Director, de su obra.
  const residente = de('residente', ['o1']);
  assert.deepEqual(residente.obras, ['o1']);
  assert.deepEqual(residente.modulos, director.modulos);

  // Sin obras, nada de obra (como 028/RF-10).
  assert.deepEqual(de('director_obra', []).obras, []);
  assert.deepEqual(de('director_obra', []).modulos, []);
});

/* ------------------------------------------------------------------------ */
/* Spec 043: planificación de obra y cumplimiento                            */
/* ------------------------------------------------------------------------ */

const ACCIONES_043 = ['ver', 'listar', 'escribir', 'aprobar', 'anular', 'activar'] as const;
const QUE_PUEDE_043 = (rol: Rol, modulo: ModuloConPermiso) => ACCIONES_043.filter((accion) => alcanza(rol, modulo, accion));

prueba('043/RF-1, RF-36, RF-48, RF-49, RF-50, RF-86 a RF-90: la tabla completa, rol por rol', () => {
  const TODO = ['ver', 'listar', 'escribir', 'aprobar', 'anular'];
  const CONSULTA = ['ver', 'listar'];
  const planificacion: Partial<Record<Rol, readonly string[]>> = { admin: TODO, director_proyectos: TODO, director_obra: CONSULTA };
  const cumplimiento: Partial<Record<Rol, readonly string[]>> = {
    admin: CONSULTA,
    director_proyectos: CONSULTA,
    director_obra: CONSULTA,
    residente: CONSULTA,
  };
  for (const rol of ROLES) {
    assert.deepEqual(QUE_PUEDE_043(rol, 'planificacion'), planificacion[rol] ?? [], `planificacion · ${rol}`);
    assert.deepEqual(QUE_PUEDE_043(rol, 'cumplimiento'), cumplimiento[rol] ?? [], `cumplimiento · ${rol}`);
  }
});

const HOY_044 = '2026-11-11'; // un miércoles

prueba('044/RF-1: la semana de un plan es de lunes a domingo y se nombra por su lunes', () => {
  assert.equal(lunesDe('2026-11-11'), '2026-11-09');
  assert.equal(lunesDe('2026-11-09'), '2026-11-09');
  assert.equal(lunesDe('2026-11-15'), '2026-11-09');
  assert.deepEqual(diasDeLaSemana('2026-11-09'), ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14']);
});

prueba('044/RF-2 a RF-4: se planea la semana en curso y hasta 4 siguientes, ni una pasada ni la quinta', () => {
  assert.deepEqual(semanasPermitidas(HOY_044), ['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07']);
  assert.equal(faltaDeSemana('2026-11-09', HOY_044), null);
  assert.equal(faltaDeSemana('2026-12-07', HOY_044), null);
  assert.match(faltaDeSemana('2026-11-02', HOY_044) ?? '', /ya terminó/);
  assert.match(faltaDeSemana('2026-12-14', HOY_044) ?? '', /4 semanas/);
  // Una fecha que no es lunes no es una semana.
  assert.match(faltaDeSemana('2026-11-10', HOY_044) ?? '', /lunes/);
  // El domingo sigue siendo de la semana en curso.
  assert.deepEqual(semanasPermitidas('2026-11-15')[0], '2026-11-09');
});

prueba('044/RF-17 a RF-20, RF-96: lunes a sábado, el festivo desmarcado pero marcable, el domingo nunca', () => {
  // El lunes 16 de noviembre de 2026 es festivo.
  assert.deepEqual(diasPorDefecto('2026-11-16'), ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']);
  assert.equal(sePuedeMarcar('2026-11-16', '2026-11-16'), true);
  assert.equal(sePuedeMarcar('2026-11-22', '2026-11-16'), false);
  // Un día de otra semana no se marca en esta.
  assert.equal(sePuedeMarcar('2026-11-23', '2026-11-16'), false);
  assert.equal(diasPorDefecto('2026-11-09').length, 6);
});

const TRES_DIAS_044 = ['2026-11-17', '2026-11-18', '2026-11-19'];

prueba('044/RF-21: la meta se reparte en partes iguales y el redondeo va al último día', () => {
  assert.deepEqual(repartir(10, TRES_DIAS_044), { '2026-11-17': 3.333, '2026-11-18': 3.333, '2026-11-19': 3.334 });
  assert.deepEqual(repartir(3414, ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']), {
    '2026-11-09': 682.8,
    '2026-11-10': 682.8,
    '2026-11-11': 682.8,
    '2026-11-12': 682.8,
    '2026-11-13': 682.8,
  });
  // La suma da justo la meta, sin el 9,999 de repartir con tres decimales.
  const tercios = repartir(10, TRES_DIAS_044);
  assert.equal(totalProgramado(tercios), 10);
  assert.deepEqual(repartir(0, TRES_DIAS_044), { '2026-11-17': 0, '2026-11-18': 0, '2026-11-19': 0 });
  assert.deepEqual(repartir(10, []), {});
});

prueba('044/RF-22, RF-23: el ajuste por día se acepta si suma la meta, y si no, se dice', () => {
  const ajustada = { metaSemana: 10, cantidades: { '2026-11-17': 5, '2026-11-18': 2, '2026-11-19': 3 } };
  assert.equal(descuadreDeLaActividad(ajustada, TRES_DIAS_044), null);
  const corta = { metaSemana: 10, cantidades: { '2026-11-17': 5, '2026-11-18': 2, '2026-11-19': 2 } };
  assert.match(descuadreDeLaActividad(corta, TRES_DIAS_044) ?? '', /suman 9 y la meta es 10/);
  // Una cantidad en un día que no se trabaja tampoco se acepta (RF-18).
  const enDomingo = { metaSemana: 10, cantidades: { '2026-11-17': 5, '2026-11-22': 5 } };
  assert.match(descuadreDeLaActividad(enDomingo, TRES_DIAS_044) ?? '', /no se trabaja/);
  // Lo que se pierde a tres decimales no es un descuadre.
  assert.equal(descuadreDeLaActividad({ metaSemana: 10, cantidades: repartir(10, TRES_DIAS_044) }, TRES_DIAS_044), null);
  // Un rubro no lleva meta en cantidades: no hay nada que cuadrar.
  assert.equal(descuadreDeLaActividad({ metaSemana: null, cantidades: {} }, TRES_DIAS_044), null);
});

prueba('044/RF-24, RF-25, RF-84: meta diaria y total programado los da la regla', () => {
  assert.equal(metaDiaria(3414, 5), 682.8);
  assert.equal(metaDiaria(10, 3), 3.333);
  assert.equal(metaDiaria(10, 0), null);
  assert.equal(metaDiaria(null, 3), null);
  assert.equal(totalProgramado({ '2026-11-17': 5, '2026-11-18': 2.25, '2026-11-19': 3.1 }), 10.35);
  assert.equal(totalProgramado({}), 0);
});

prueba('044/RF-99: un borrador de una semana que ya terminó no se aprueba', () => {
  assert.equal(semanaTerminada('2026-11-02', HOY_044), true);
  assert.equal(semanaTerminada('2026-11-09', HOY_044), false);
  // El domingo todavía es de la semana.
  assert.equal(semanaTerminada('2026-11-09', '2026-11-15'), false);
  assert.equal(semanaTerminada('2026-11-09', '2026-11-16'), true);
});

prueba('044/RF-29, RF-54, RF-59, RF-82, RF-83: el plan semanal, rol por rol', () => {
  const TODO = ['ver', 'listar', 'escribir', 'aprobar', 'anular'];
  const esperado: Partial<Record<Rol, readonly string[]>> = {
    admin: TODO,
    director_proyectos: TODO,
    director_obra: TODO,
    // RF-54, RF-59: arma y ajusta el borrador, pero no lo aprueba ni lo anula.
    residente: ['ver', 'listar', 'escribir'],
  };
  for (const rol of ROLES) assert.deepEqual(QUE_PUEDE_043(rol, 'plan_semanal'), esperado[rol] ?? [], `plan_semanal · ${rol}`);
});

prueba('044/RF-59, RF-83: el rechazo dice qué no se puede y, al Residente, a quién acudir', () => {
  assert.match(motivoDeRechazo('plan_semanal', 'aprobar'), /^No puede aprobar un plan semanal:/);
  assert.match(motivoDeRechazo('plan_semanal', 'anular'), /^No puede anular un plan semanal:/);
  assert.match(motivoDeRechazo('plan_semanal', 'escribir'), /^No puede armar un plan semanal:/);
  assert.match(motivoDeRechazo('plan_semanal', 'ver'), /^No puede ver el plan semanal de la obra:/);
  // Aquí el Director de Obra sí aprueba, así que al Residente se le nombra.
  assert.match(motivoParaNoAprobar('residente', 'aprobar', 'plan_semanal') ?? '', /Director de Obra/);
});

prueba('044/RF-78, RF-83: «Plan semanal» en el menú de la obra, según el acceso', () => {
  const tiene = (rol: Rol) => paginas(menuDeObra(rol)).includes('plan-semanal');
  for (const rol of ['admin', 'director_proyectos', 'director_obra', 'residente'] as const) assert.ok(tiene(rol), rol);
  for (const rol of ['almacenista', 'encargado_planta', 'laboratorista', 'operador'] as const) assert.ok(!tiene(rol), rol);
  assert.equal(menuDeObra('residente').find((m) => m.pagina === 'plan-semanal')?.titulo, 'Plan semanal');
  // No depende de los módulos que la obra apaga.
  assert.ok(paginas(menuDeObra('residente', { almacen: false, cantera: false, laboratorio: false })).includes('plan-semanal'));
});

prueba('043/RF-136: el Residente sigue viendo el contrato y el presupuesto, con lo que tenía', () => {
  assert.deepEqual(QUE_PUEDE_043('residente', 'contrato'), ['ver', 'listar', 'escribir']);
});

prueba('043/RF-36, RF-48: el rechazo dice quién aprueba y quién anula, sin nombrar al Director de Obra', () => {
  const ESPERADO = /la gerencia y el director de proyectos\.$/;
  assert.match(motivoDeRechazo('planificacion', 'aprobar'), /^No puede aprobar una planificación:/);
  assert.match(motivoDeRechazo('planificacion', 'aprobar'), ESPERADO);
  assert.match(motivoDeRechazo('planificacion', 'anular'), /^No puede anular una planificación:/);
  assert.match(motivoDeRechazo('planificacion', 'anular'), ESPERADO);
  assert.match(motivoDeRechazo('planificacion', 'escribir'), /^No puede subir una planificación:/);
  assert.match(motivoDeRechazo('cumplimiento', 'ver'), /^No puede ver el cumplimiento de la obra:/);

  // La guardia prueba primero el motivo del Residente, que nombra al Director de Obra: en la
  // planificación ese cargo no aprueba ni anula, así que aquí no aplica.
  assert.equal(motivoParaNoAprobar('residente', 'aprobar', 'planificacion'), null);
  assert.equal(motivoParaNoAprobar('residente', 'anular', 'planificacion'), null);
  // En lo demás sigue diciendo lo de la 041.
  assert.match(motivoParaNoAprobar('residente', 'aprobar', 'bitacoras') ?? '', /Director de Obra/);
});

prueba('043: los estados de una planificación y de su lectura', () => {
  assert.deepEqual([...ESTADOS_DE_PLANIFICACION], ['borrador', 'vigente', 'reemplazada', 'anulada', 'descartada']);
  assert.deepEqual([...ESTADOS_DE_LECTURA_DE_PLANIFICACION], ['en_curso', 'lista', 'falta_grupo', 'fallida']);
});

prueba('043/RF-16: la cantidad del mes es el valor programado entre el precio contractual', () => {
  // Ítem 5.1.7 del V5, línea base de enero de 2027.
  assert.equal(cantidadDelMes(18146151, 112153), 161.798);
  assert.equal(cantidadDelMes(0, 112153), 0);
  // Sin precio no se divide: no hay cantidad, ni cero ni infinito.
  assert.equal(cantidadDelMes(18146151, 0), null);
  assert.equal(cantidadDelMes(18146151, null), null);
  assert.equal(cantidadDelMes(18146151, -5), null);
  assert.equal(cantidadDelMes(Number.NaN, 112153), null);
});

prueba('043/RF-11 a RF-15: lo que se guarda de un ítem, con su programación en orden', () => {
  const item = armarItemDePlanificacion({
    renglon: 5,
    item: ' 5.1.7 ',
    descripcion: 'Suministro, colocación y compactación de sub-base',
    unidad: 'm3',
    grupo: 'Circuito Remedios',
    capitulo: 'CONSTRUCCIÓN DE ALCANTARILLAS',
    precioContractual: 112153,
    precioCosto: 40690,
    medidaReal: 2121.42,
    medidaContractual: 236,
    mesInicio: '2026-05',
    tiempoEjecucion: 19,
    programacion: [
      { mes: '2027-01', valor: 18146151.485 },
      { mes: '2026-11', valor: 0 },
    ],
  });
  assert.equal(item.item, '5.1.7');
  assert.equal(item.precioCosto, 40690);
  assert.equal(item.medidaReal, 2121.42);
  assert.equal(item.mesInicio, '2026-05');
  assert.equal(item.tiempoEjecucion, 19);
  assert.equal(item.revisar, false);
  assert.deepEqual(item.programacion, [
    { mes: '2026-11', valor: 0, cantidad: 0 },
    { mes: '2027-01', valor: 18146151, cantidad: 161.798 },
  ]);

  // Un costo de relleno se guarda tal como vino: decidir que no es costo es de los hallazgos.
  const relleno = armarItemDePlanificacion({ ...item, precioCosto: 0.000000001, programacion: [] });
  assert.equal(relleno.precioCosto, 0.000000001);

  // Sin precio contractual el mes conserva su valor y no tiene cantidad.
  const sinPrecio = armarItemDePlanificacion({ ...item, precioContractual: 0, programacion: [{ mes: '2027-01', valor: 100 }] });
  assert.deepEqual(sinPrecio.programacion, [{ mes: '2027-01', valor: 100, cantidad: null }]);
});

prueba('043/RF-17: los indirectos quedan por mes, en pesos y en orden', () => {
  assert.deepEqual(
    valoresPorMes([
      { mes: '2026-03', valor: 244510539.4 },
      { mes: '2026-02', valor: 221042440 },
    ]),
    [
      { mes: '2026-02', valor: 221042440 },
      { mes: '2026-03', valor: 244510539 },
    ],
  );
});

prueba('043/RF-18: supuestos y objetivos quedan como texto, sin renglones vacíos', () => {
  assert.equal(notasEnTexto(['  Distancia vía 25000 m ', '', '   ', 'Viajes diarios 2']), 'Distancia vía 25000 m\nViajes diarios 2');
  assert.equal(notasEnTexto([]), '');
});

prueba('043/RF-108, RF-109: los rubros por mes, y una sola línea cuando el libro los junta', () => {
  const pma = { nombre: 'PMA', valor: 218336960, costo: 196503264, programacion: [{ mes: '2026-11', valor: 1000.4 }] };
  const pmt = { nombre: 'PMT', valor: 223237641, costo: 156266348.7, programacion: [] };

  // Rubro por rubro.
  const separados = programacionDeRubros([pma, pmt], null);
  assert.equal(separados.lineaDeRubros, null);
  assert.deepEqual(separados.rubros[0].programacion, [{ mes: '2026-11', valor: 1000 }]);
  assert.deepEqual(rubrosDelMes(separados, '2026-11'), [{ nombre: 'PMA', valor: 1000 }]);
  assert.deepEqual(rubrosDelMes(separados, '2026-12'), []);

  // En Magdalena la línea base trae una sola línea, «Componentes», con todos.
  const juntos = programacionDeRubros([pma, pmt], {
    nombre: 'Componentes (PMA, PMT, caracterización, primas)',
    valores: [
      { mes: '2026-11', valor: 29161401 },
      { mes: '2026-10', valor: 29161401 },
    ],
  });
  assert.deepEqual(rubrosDelMes(juntos, '2026-11'), [{ nombre: 'Componentes (PMA, PMT, caracterización, primas)', valor: 29161401 }]);
  // Cada rubro conserva su valor total, pero no se cuenta dos veces por mes.
  assert.equal(juntos.rubros.length, 2);
  assert.equal(juntos.rubros[0].valor, 218336960);
  assert.deepEqual(juntos.rubros[0].programacion, []);
  assert.deepEqual(juntos.lineaDeRubros?.valores.map((v) => v.mes), ['2026-10', '2026-11']);
});

/** Un pedazo real del presupuesto de Magdalena: los mismos ítems y capítulos en los dos frentes. */
type ItemDelPresupuesto043 = EstructuraDePresupuesto['grupos'][number]['capitulos'][number]['items'][number];
const item043 = (renglon: number, item: string, cantidad: number, valorUnitario: number): ItemDelPresupuesto043 => ({
  id: `i-${renglon}`,
  renglon,
  item,
  icociv: '',
  especificaciones: '',
  descripcion: '',
  unidad: null,
  unidadEscrita: 'm3',
  cantidad,
  valorUnitario,
  valorTotal: Math.round(cantidad * valorUnitario),
});
const ALCANTARILLAS_043 = 'CONSTRUCCIÓN DE ALCANTARILLAS';
const CUNETA_043 = 'CONSTRUCCIÓN DE CUNETA';
const rubro043 = (id: string, grupoId: string | null, nombre: string): EstructuraDePresupuesto['rubros'][number] => ({
  id,
  grupoId,
  nombre,
  unidad: 'estimado',
  cantidad: null,
  valorUnitario: null,
  valor: 1000,
});
const MAGDALENA_043: EstructuraDePresupuesto = {
  aiu: { administracion: 0, imprevistos: 0, utilidad: 0 },
  grupos: [
    {
      id: 'g-berrio',
      nombre: 'Circuito Remedios - La Y De La Virgen',
      capitulos: [
        { id: 'c-b1', codigo: '01', nombre: ALCANTARILLAS_043, items: [item043(1, '2.8', 42, 242062), item043(3, '4.1.8', 2006, 55525)] },
        { id: 'c-b2', codigo: '02', nombre: CUNETA_043, items: [item043(12, '4.1.8', 4345, 55525)] },
      ],
    },
    {
      id: 'g-yondo',
      nombre: 'VIA LA YE-YONDO',
      capitulos: [
        { id: 'c-y1', codigo: '01', nombre: ALCANTARILLAS_043, items: [item043(39, '2.8', 38, 242062), item043(41, '4.1.8', 4352, 55525)] },
      ],
    },
  ],
  rubros: [
    rubro043('r-b', 'g-berrio', 'CARACTERIZACION VIAL'),
    rubro043('r-y', 'g-yondo', 'CARACTERIZACION VIAL'),
    rubro043('r-t', null, 'ACTUALIZACIÓN DE PRECIOS'),
    rubro043('r-solo-y', 'g-yondo', 'PMA YONDO'),
  ],
};
const planDe043 = (grupo: string, capitulo: string, item: string, medidaContractual: number, renglon: number | null = null) =>
  armarItemDePlanificacion({
    renglon,
    item,
    descripcion: '',
    unidad: 'm3',
    grupo,
    capitulo,
    precioContractual: 55525,
    precioCosto: null,
    medidaReal: medidaContractual,
    medidaContractual,
    mesInicio: null,
    tiempoEjecucion: null,
    programacion: [],
  });
const FRENTE_043 = 'BERRIO';

prueba('043/RF-19, RF-105: Berrio cruza con su grupo, ítem por ítem y dentro de su capítulo', () => {
  const cruce = cruzarConPresupuesto(
    [
      planDe043(FRENTE_043, 'Construcción de  alcantarillas', '2.8', 42),
      planDe043(FRENTE_043, ALCANTARILLAS_043, '4.1.8', 2006),
      planDe043(FRENTE_043, CUNETA_043, '4.1.8', 4345),
    ],
    [],
    MAGDALENA_043,
  );
  assert.ok(cruce.ok);
  assert.deepEqual(cruce.items.map((i) => i.delPresupuesto?.grupoId), ['g-berrio', 'g-berrio', 'g-berrio']);
  assert.deepEqual(cruce.items.map((i) => i.delPresupuesto?.capituloId), ['c-b1', 'c-b1', 'c-b2']);
  assert.equal(cruce.frentes[FRENTE_043], 'g-berrio');
});

prueba('043/RF-19: el mismo ítem y capítulo de Yondo no es el de Berrio', () => {
  assert.notEqual(
    llaveDelItem('Circuito Remedios - La Y De La Virgen', ALCANTARILLAS_043, '2.8'),
    llaveDelItem('VIA LA YE-YONDO', ALCANTARILLAS_043, '2.8'),
  );
  // La llave no distingue tildes, mayúsculas ni espacios de sobra.
  assert.equal(llaveDelItem(' Vía  Uno', 'ALCANTARILLAS', ' 2.8 '), llaveDelItem('via uno', 'Alcantarillas', '2.8'));
  // Las cantidades de Yondo llevan a Yondo, sin tocar a Berrio.
  const cruce = cruzarConPresupuesto([planDe043('YONDO', ALCANTARILLAS_043, '2.8', 38), planDe043('YONDO', ALCANTARILLAS_043, '4.1.8', 4352)], [], MAGDALENA_043);
  assert.ok(cruce.ok);
  assert.deepEqual(cruce.items.map((i) => i.delPresupuesto?.grupoId), ['g-yondo', 'g-yondo']);
});

prueba('043/RF-107: si el frente no se puede asociar a un único grupo, pide escogerlo', () => {
  // Una cantidad que no está en ningún grupo: ninguna coincidencia.
  const ninguna = cruzarConPresupuesto([planDe043(FRENTE_043, ALCANTARILLAS_043, '2.8', 999)], [], MAGDALENA_043);
  assert.equal(ninguna.ok, false);
  assert.ok(!ninguna.ok);
  assert.deepEqual(ninguna.faltaGrupo.map((f) => f.frente), [FRENTE_043]);
  assert.deepEqual(ninguna.faltaGrupo[0].candidatos.map((c) => c.id).sort(), ['g-berrio', 'g-yondo']);

  // Empate: la misma cantidad en los dos grupos.
  const igual: EstructuraDePresupuesto = {
    ...MAGDALENA_043,
    grupos: MAGDALENA_043.grupos.map((g) => ({
      ...g,
      capitulos: [{ id: `${g.id}-c`, codigo: '01', nombre: ALCANTARILLAS_043, items: [item043(1, '2.8', 42, 242062)] }],
    })),
  };
  const empate = cruzarConPresupuesto([planDe043(FRENTE_043, ALCANTARILLAS_043, '2.8', 42)], [], igual);
  assert.ok(!empate.ok);
  assert.deepEqual(empate.faltaGrupo[0].candidatos.map((c) => c.coincidencias), [1, 1]);

  // Con el grupo escogido, cruza contra ese.
  const escogido = cruzarConPresupuesto([planDe043(FRENTE_043, ALCANTARILLAS_043, '2.8', 42)], [], igual, { [FRENTE_043]: 'g-yondo' });
  assert.ok(escogido.ok);
  assert.equal(escogido.items[0].delPresupuesto?.grupoId, 'g-yondo');

  // Un grupo que no existe no vale como escogido.
  assert.equal(cruzarConPresupuesto([planDe043(FRENTE_043, ALCANTARILLAS_043, '2.8', 42)], [], igual, { [FRENTE_043]: 'g-otra' }).ok, false);
});

prueba('043/RF-106: un presupuesto sin grupos cruza por capítulo e ítem', () => {
  const sinGrupos: EstructuraDePresupuesto = {
    ...MAGDALENA_043,
    grupos: [{ id: 'g', nombre: '', capitulos: [{ id: 'c', codigo: '01', nombre: ALCANTARILLAS_043, items: [item043(1, '2.8', 42, 242062)] }] }],
  };
  // Ni la cantidad ni el título del frente hacen falta: no hay entre qué escoger.
  const cruce = cruzarConPresupuesto([planDe043('CUALQUIERA', ALCANTARILLAS_043, '2.8', 7)], [], sinGrupos);
  assert.ok(cruce.ok);
  assert.equal(cruce.items[0].delPresupuesto?.capituloId, 'c');
});

prueba('043/RF-19: un libro con solo «Nº» resuelve el ítem por renglón, sin inventar el cruce', () => {
  const cruce = cruzarConPresupuesto(
    [
      planDe043(FRENTE_043, 'EXPLANACIONES', '3', 2006, 3),
      planDe043(FRENTE_043, 'EXPLANACIONES', '', 42, 1),
      // Trae un ítem de pago propio que no existe: es un hallazgo, no otro ítem por casualidad de renglón.
      planDe043(FRENTE_043, ALCANTARILLAS_043, '9.9.9', 4345, 12),
    ],
    [],
    MAGDALENA_043,
  );
  assert.ok(cruce.ok);
  assert.equal(cruce.items[0].delPresupuesto?.item, '4.1.8');
  assert.equal(cruce.items[1].delPresupuesto?.item, '2.8');
  assert.equal(cruce.items[2].delPresupuesto, null);
});

prueba('043/RF-110: los rubros se cruzan contra los rubros de su frente, no contra los ítems', () => {
  const rubro = (nombre: string) => ({ nombre, valor: 1000, costo: null, programacion: [] });
  const cruce = cruzarConPresupuesto(
    [planDe043(FRENTE_043, ALCANTARILLAS_043, '2.8', 42)],
    [rubro('Caracterización vial'), rubro('Actualización de precios'), rubro('PMA YONDO'), rubro('2.8')],
    MAGDALENA_043,
  );
  assert.ok(cruce.ok);
  assert.deepEqual(cruce.rubros.map((r) => r.delPresupuesto), ['r-b', 'r-t', null, null]);
});

/** Un ítem sin ningún hallazgo; cada prueba le cambia una sola cosa. */
const ITEM_SANO_043 = {
  ...planDe043(FRENTE_043, ALCANTARILLAS_043, '4.1.8', 2006),
  precioContractual: 55525,
  precioCosto: 20000,
  medidaReal: 100,
  programacion: [{ mes: '2026-11', valor: 5552500, cantidad: 100 }],
  delPresupuesto: {
    grupoId: 'g-berrio',
    grupo: 'Circuito',
    capituloId: 'c-b1',
    capitulo: ALCANTARILLAS_043,
    item: '4.1.8',
    unidad: 'M3',
    cantidad: 2006,
    valorUnitario: 55525,
  },
};
const tiposDe043 = (cambio: Partial<typeof ITEM_SANO_043> | object, fechaFin: string | null = null) =>
  hallazgosDe({ items: [{ ...ITEM_SANO_043, ...cambio }], rubros: [] }, fechaFin).map((h) => h.tipo);

prueba('043: un ítem que cuadra no tiene ningún hallazgo', () => {
  assert.deepEqual(tiposDe043({}, '2027-06-30'), []);
});

prueba('043/RF-25: el ítem que no existe en el presupuesto', () => {
  assert.deepEqual(tiposDe043({ delPresupuesto: null }), ['no_existe']);
});

prueba('043/RF-26: la unidad distinta, sin contar mayúsculas', () => {
  const otra = { delPresupuesto: { ...ITEM_SANO_043.delPresupuesto, unidad: 'm2' } };
  assert.deepEqual(tiposDe043(otra), ['unidad_distinta']);
  assert.deepEqual(tiposDe043({ unidad: 'M3' }), []);
});

prueba('043/RF-27: la cantidad contractual distinta; la medida real distinta no lo es', () => {
  assert.deepEqual(tiposDe043({ medidaContractual: 2007 }), ['cantidad_distinta']);
  assert.deepEqual(tiposDe043({ medidaContractual: 2006.0001 }), []);
  // La medida real de Magdalena suele ser otra: eso es normal.
  assert.deepEqual(tiposDe043({ medidaReal: 5000 }), []);
});

prueba('043/RF-28: el costo por encima del precio contractual', () => {
  assert.deepEqual(tiposDe043({ precioCosto: 55526 }), ['costo_mayor']);
  assert.deepEqual(tiposDe043({ precioCosto: 55525 }), []);
});

prueba('043/RF-28, D31: sin precio contractual no hay con qué comparar, y no es «costo mayor»', () => {
  // 35.1 y 35.2 del V5: solo traen costo.
  assert.ok(!tiposDe043({ precioContractual: 0, precioCosto: 1200000000 }).includes('costo_mayor'));
  assert.ok(!tiposDe043({ precioContractual: null, precioCosto: 1200000000 }).includes('costo_mayor'));
});

prueba('043/RF-29: sin programación, solo si tiene medida real', () => {
  assert.deepEqual(tiposDe043({ programacion: [] }), ['sin_programacion']);
  assert.deepEqual(tiposDe043({ programacion: [{ mes: '2026-11', valor: 0, cantidad: 0 }] }), ['sin_programacion']);
  // En el V5, 12 ítems tienen medida real en cero porque no se van a ejecutar.
  assert.deepEqual(tiposDe043({ programacion: [], medidaReal: 0 }), []);
});

prueba('043/RF-30: lo programado después de la fecha de fin del contrato', () => {
  const programacion = [
    { mes: '2027-06', valor: 100, cantidad: 1 },
    { mes: '2027-07', valor: 100, cantidad: 1 },
  ];
  assert.deepEqual(tiposDe043({ programacion }, '2027-06-30'), ['despues_del_plazo']);
  // El mes de la fecha de fin todavía está dentro; un mes posterior en cero no cuenta.
  assert.deepEqual(tiposDe043({ programacion: [programacion[0]] }, '2027-06-01'), []);
  assert.deepEqual(tiposDe043({ programacion: [programacion[0], { mes: '2027-07', valor: 0, cantidad: 0 }] }, '2027-06-30'), []);
  // Sin fecha de fin no hay contra qué comparar.
  assert.deepEqual(tiposDe043({ programacion }, null), []);
});

prueba('043/RF-31, RF-32: sin precio de costo es vacío, cero o menos de un peso', () => {
  assert.deepEqual(tiposDe043({ precioCosto: null }), ['sin_costo']);
  assert.deepEqual(tiposDe043({ precioCosto: 0 }), ['sin_costo']);
  assert.deepEqual(tiposDe043({ precioCosto: 0.000000001 }), ['sin_costo']);
  assert.deepEqual(tiposDe043({ precioCosto: 0.99 }), ['sin_costo']);
  assert.deepEqual(tiposDe043({ precioCosto: 1 }), []);
  assert.equal(sinPrecioDeCosto(0.000000001), true);
  assert.equal(sinPrecioDeCosto(40690), false);
});

prueba('043/RF-115: lo marcado para revisión también es un hallazgo', () => {
  assert.deepEqual(tiposDe043({ revisar: true }), ['para_revisar']);
});

prueba('043/RF-110: un rubro sin par es un hallazgo; con par, no', () => {
  const rubros = [
    { nombre: 'PMA', valor: 1, costo: null, programacion: [], delPresupuesto: 'r-1' },
    { nombre: 'Otro rubro', valor: 1, costo: null, programacion: [], delPresupuesto: null },
  ];
  const hallazgos = hallazgosDe({ items: [], rubros }, null);
  assert.deepEqual(hallazgos.map((h) => h.tipo), ['rubro_sin_par']);
  assert.match(hallazgos[0].detalle, /Otro rubro/);
});

prueba('043: los hallazgos dicen de qué ítem son y por qué, y un ítem puede tener varios', () => {
  const hallazgos = hallazgosDe({ items: [{ ...ITEM_SANO_043, renglon: 3, medidaContractual: 2007, precioCosto: null }], rubros: [] }, null);
  assert.deepEqual(hallazgos.map((h) => h.tipo), ['cantidad_distinta', 'sin_costo']);
  assert.equal(hallazgos[0].item, '4.1.8');
  assert.equal(hallazgos[0].capitulo, ALCANTARILLAS_043);
  assert.equal(hallazgos[0].renglon, 3);
  assert.match(hallazgos[0].detalle, /2007/);
  assert.match(hallazgos[0].detalle, /2006/);
});

const RUBRO_043 = { nombre: 'PMA', valor: 500, costo: 200, programacion: [], delPresupuesto: 'r' };

prueba('043/RF-23, RF-33, RF-111 a RF-113: totales, margen y resultado, con las dos medidas', () => {
  const item = { ...ITEM_SANO_043, medidaReal: 10, medidaContractual: 8, precioContractual: 100, precioCosto: 40 };
  const resumen = resumenDeLaPlanificacion({ items: [item], rubros: [RUBRO_043], indirectos: [{ mes: '2026-11', valor: 60 }, { mes: '2026-12', valor: 40 }] });
  // Medida real: 10 × 100 + 500 de contractual, 10 × 40 + 200 de costo.
  assert.deepEqual(resumen.medidaReal, { contractual: 1500, costo: 600, margen: 900, resultado: 800 });
  // Medida contractual: 8 × 100 + 500 y 8 × 40 + 200.
  assert.deepEqual(resumen.medidaContractual, { contractual: 1300, costo: 520, margen: 780, resultado: 680 });
  assert.equal(resumen.indirectos, 100);
});

prueba('043/RF-111, RF-112: con los totales del V5, el resultado es la utilidad del Excel', () => {
  const item = { ...ITEM_SANO_043, medidaReal: 1, medidaContractual: 1, precioContractual: 39558848104, precioCosto: 10791439267 };
  const resumen = resumenDeLaPlanificacion({ items: [item], rubros: [], indirectos: [{ mes: '2026-11', valor: 20440864487 }] });
  assert.equal(resumen.medidaReal.margen, 28767408837);
  assert.equal(resumen.medidaReal.resultado, 8326544350);
});

prueba('043/RF-139 a RF-141: el costo con medida real usa la «Med. Coste»; el contractual, la real', () => {
  const item = { ...ITEM_SANO_043, medidaReal: 10, medidaCoste: 12, medidaContractual: 8, precioContractual: 100, precioCosto: 40 };
  const resumen = resumenDeLaPlanificacion({ items: [item], rubros: [], indirectos: [] });
  assert.equal(resumen.medidaReal.contractual, 1000);
  assert.equal(resumen.medidaReal.costo, 480);
  // Con medida contractual, la del contrato para los dos totales.
  assert.deepEqual(resumen.medidaContractual, { contractual: 800, costo: 320, margen: 480, resultado: 480 });
});

prueba('043/RF-140: sin «Med. Coste», el costo usa la medida real', () => {
  const item = { ...ITEM_SANO_043, medidaReal: 10, medidaCoste: null, precioContractual: 100, precioCosto: 40 };
  assert.equal(resumenDeLaPlanificacion({ items: [item], rubros: [], indirectos: [] }).medidaReal.costo, 400);
  assert.equal(ITEM_SANO_043.medidaCoste, null);
});

prueba('043/RF-141, D31: con la «Med. Coste», el costo del V5 cuadra con el del Excel', () => {
  // Lo de los demás ítems junto en uno, y un ítem como 35.1: sin precio contractual, sin medida
  // real y con «Med. Coste». Con la medida real, el costo daría 1 200 millones menos.
  const resto = { ...ITEM_SANO_043, medidaReal: 1, medidaCoste: 1, medidaContractual: 1, precioContractual: 39558848104, precioCosto: 9591439267 };
  const sinPrecio = { ...ITEM_SANO_043, medidaReal: 0, medidaCoste: 1, medidaContractual: 0, precioContractual: null, precioCosto: 1200000000 };
  const resumen = resumenDeLaPlanificacion(
    { items: [resto, sinPrecio], rubros: [], indirectos: [{ mes: '2026-11', valor: 20440864487 }] },
    { contractual: 39558848104, costo: 10791439267, indirectos: 20440864487 },
  );
  assert.equal(resumen.medidaReal.costo, 10791439267);
  assert.equal(resumen.medidaReal.resultado, 8326544350);
  assert.deepEqual(resumen.diferenciasConElExcel, []);
});

prueba('043/RF-32: un costo de relleno no suma, y un ítem sin medidas tampoco rompe la cuenta', () => {
  const relleno = { ...ITEM_SANO_043, medidaReal: 1000000000, medidaContractual: 0, precioContractual: 1, precioCosto: 0.5 };
  const vacio = { ...ITEM_SANO_043, medidaReal: null, medidaContractual: null, precioContractual: null, precioCosto: null };
  const resumen = resumenDeLaPlanificacion({ items: [relleno, vacio], rubros: [], indirectos: [] });
  assert.equal(resumen.medidaReal.contractual, 1000000000);
  assert.equal(resumen.medidaReal.costo, 0);
});

prueba('043/RF-114: la diferencia con los totales que trae el Excel', () => {
  const item = { ...ITEM_SANO_043, medidaReal: 10, medidaContractual: 8, precioContractual: 100, precioCosto: 40 };
  const estructura = { items: [item], rubros: [], indirectos: [{ mes: '2026-11', valor: 100 }] };

  const iguales = resumenDeLaPlanificacion(estructura, { contractual: 1000, costo: 400.4, indirectos: 100 });
  assert.deepEqual(iguales.diferenciasConElExcel, []);

  const distintos = resumenDeLaPlanificacion(estructura, { contractual: 1200, costo: 400, indirectos: 287 });
  assert.deepEqual(distintos.diferenciasConElExcel, [
    { concepto: 'contractual', leido: 1000, delExcel: 1200, diferencia: -200 },
    { concepto: 'indirectos', leido: 100, delExcel: 287, diferencia: -187 },
  ]);

  // Lo que el Excel no trae no se compara.
  assert.deepEqual(resumenDeLaPlanificacion(estructura).diferenciasConElExcel, []);
});

prueba('043: el resumen dice de qué mes a qué mes va la programación', () => {
  const item = {
    ...ITEM_SANO_043,
    programacion: [
      { mes: '2026-10', valor: 0, cantidad: 0 },
      { mes: '2026-11', valor: 10, cantidad: 1 },
      { mes: '2027-12', valor: 10, cantidad: 1 },
    ],
  };
  const resumen = resumenDeLaPlanificacion({ items: [item, { ...ITEM_SANO_043, programacion: [] }], rubros: [], indirectos: [] });
  assert.equal(resumen.programacionDesde, '2026-11');
  assert.equal(resumen.programacionHasta, '2027-12');
  assert.equal(resumenDeLaPlanificacion({ items: [], rubros: [], indirectos: [] }).programacionDesde, null);
});

/** v1 rigió del 10 al 19 de noviembre y v2 desde el 20. */
const V1_043 = { id: 'v1', numeroVersion: 1, rigeDesde: '2026-11-10', rigeHasta: '2026-11-19' };
const V2_043 = { id: 'v2', numeroVersion: 2, rigeDesde: '2026-11-20', rigeHasta: null };
const rige043 = (fecha: string, versiones: Parameters<typeof versionQueRige>[1]) => versionQueRige(fecha, versiones)?.id ?? null;

prueba('043/RF-52: cada día se mide con la versión que regía', () => {
  assert.equal(rige043('2026-11-15', [V1_043, V2_043]), 'v1');
  assert.equal(rige043('2026-11-19', [V1_043, V2_043]), 'v1');
  assert.equal(rige043('2027-01-01', [V1_043, V2_043]), 'v2');
});

prueba('043/RF-120: el día de la aprobación ya cuenta con la versión nueva, según la fecha de Colombia', () => {
  assert.equal(rige043('2026-11-20', [V1_043, V2_043]), 'v2');
  // Las 10:30 p. m. del 9 de noviembre en Colombia ya son el 10 en UTC.
  assert.equal(fechaDeJornada(Date.parse('2026-11-10T03:30:00Z')), '2026-11-09');
  assert.equal(fechaDeJornada(Date.parse('2026-11-10T05:30:00Z')), '2026-11-10');
  // Quien deja de regir hoy, rigió hasta ayer.
  assert.equal(ultimoDiaQueRige('2026-11-20'), '2026-11-19');
  assert.equal(ultimoDiaQueRige('2027-01-01'), '2026-12-31');
});

prueba('043/RF-55, RF-56, RF-138: al anular, lo que rigió se conserva y desde ese día queda sin meta', () => {
  // Anulada el 20: `rigeHasta` es el 19.
  const anulada = [{ ...V1_043 }];
  assert.equal(rige043('2026-11-19', anulada), 'v1');
  assert.equal(rige043('2026-11-20', anulada), null);
  assert.equal(rige043('2026-12-05', anulada), null);
  // Sin ninguna versión aprobada, tampoco hay meta.
  assert.equal(rige043('2026-11-15', []), null);
});

prueba('043/RF-57: antes de la primera aprobación se mide con esa versión, aunque se haya anulado', () => {
  assert.equal(rige043('2026-02-01', [V1_043, V2_043]), 'v1');
  assert.equal(rige043('2026-02-01', [{ ...V1_043, rigeHasta: '2026-11-12' }]), 'v1');
  // El orden en que lleguen no importa.
  assert.equal(rige043('2026-02-01', [V2_043, V1_043]), 'v1');
  // Una versión reemplazada el mismo día que se aprobó no rigió ningún día, pero sí fue la primera.
  const v1MismoDia = { id: 'v1', numeroVersion: 1, rigeDesde: '2026-11-10', rigeHasta: '2026-11-09' };
  const v2MismoDia = { id: 'v2', numeroVersion: 2, rigeDesde: '2026-11-10', rigeHasta: null };
  assert.equal(rige043('2026-11-10', [v1MismoDia, v2MismoDia]), 'v2');
  assert.equal(rige043('2026-02-01', [v1MismoDia, v2MismoDia]), 'v1');
});

prueba('043/RF-53: un periodo con cambio de versión se parte por la fecha de aprobación', () => {
  assert.deepEqual(tramosDelPeriodo('2026-11-16', '2026-11-22', [V1_043, V2_043]), [
    { versionId: 'v1', desde: '2026-11-16', hasta: '2026-11-19' },
    { versionId: 'v2', desde: '2026-11-20', hasta: '2026-11-22' },
  ]);
  assert.deepEqual(tramosDelPeriodo('2026-11-11', '2026-11-13', [V1_043, V2_043]), [{ versionId: 'v1', desde: '2026-11-11', hasta: '2026-11-13' }]);
  // Con una anulación el segundo tramo no tiene versión.
  assert.deepEqual(tramosDelPeriodo('2026-11-18', '2026-11-21', [V1_043]), [
    { versionId: 'v1', desde: '2026-11-18', hasta: '2026-11-19' },
    { versionId: null, desde: '2026-11-20', hasta: '2026-11-21' },
  ]);
});

prueba('043/RF-121: los meses por marcar son los anteriores al actual con algo programado', () => {
  const item = {
    ...ITEM_SANO_043,
    programacion: [
      { mes: '2026-09', valor: 0, cantidad: 0 },
      { mes: '2026-10', valor: 100, cantidad: 1 },
      { mes: '2026-11', valor: 100, cantidad: 1 },
      { mes: '2026-12', valor: 100, cantidad: 1 },
    ],
  };
  const otro = { ...ITEM_SANO_043, programacion: [{ mes: '2026-08', valor: 5, cantidad: 1 }, { mes: '2026-10', valor: 5, cantidad: 1 }] };
  assert.deepEqual(mesesAnterioresPorMarcar([item, otro], '2026-11-09'), ['2026-08', '2026-10']);
  assert.deepEqual(mesesAnterioresPorMarcar([], '2026-11-09'), []);
});

/** Noviembre de 2026 tiene 23 días de reparto y diciembre, 25: las cantidades dan números redondos. */
const itemConMeses043 = (meses: Record<string, number>) => ({
  ...ITEM_SANO_043,
  programacion: Object.entries(meses).map(([mes, cantidad]) => ({ mes, valor: cantidad * 100, cantidad })),
});
const LLAVE_043 = llaveDeItemPlanificado(ITEM_SANO_043);
const unaVersion043 = (meses: Record<string, number>, rigeHasta: string | null = null, rigeDesde = '2026-01-01') =>
  versionMedible({ id: 'v1', numeroVersion: 1, rigeDesde, rigeHasta }, [itemConMeses043(meses)]);
const semana043 = (desde: string, hasta: string) => ({ tipo: 'semana' as const, desde, hasta });
const mes043 = (desde: string, hasta: string) => ({ tipo: 'mes' as const, desde, hasta });

prueba('043/RF-65: el reparto va de lunes a sábado, sin festivos', () => {
  const noviembre = diasDeReparto('2026-11');
  assert.equal(noviembre.length, 23);
  assert.ok(!noviembre.includes('2026-11-02'), 'festivo de Todos los Santos');
  assert.ok(!noviembre.includes('2026-11-16'), 'festivo de Cartagena');
  assert.ok(!noviembre.includes('2026-11-08'), 'domingo');
  assert.ok(noviembre.includes('2026-11-07'), 'sábado');
  assert.equal(diasDeReparto('2026-12').length, 25);
});

prueba('043/RF-63: el mes sin cambio de versión da exacto lo programado', () => {
  const v = [unaVersion043({ '2026-11': 230 })];
  assert.deepEqual(metaDelPeriodo(LLAVE_043, mes043('2026-11-01', '2026-11-30'), v), { meta: 230, estimada: false });
  // Una cantidad que no divide exacto tampoco deja residuo.
  assert.equal(metaDelPeriodo(LLAVE_043, mes043('2026-11-01', '2026-11-30'), [unaVersion043({ '2026-11': 100.123 })]).meta, 100.123);
});

prueba('043/RF-65, RF-66: la semana sin plan reparte el mes y se marca estimada', () => {
  const v = [unaVersion043({ '2026-11': 230 })];
  assert.deepEqual(metaDelPeriodo(LLAVE_043, semana043('2026-11-23', '2026-11-29'), v), { meta: 60, estimada: true });
  // La del festivo del lunes 16 tiene un día menos.
  assert.deepEqual(metaDelPeriodo(LLAVE_043, semana043('2026-11-16', '2026-11-22'), v), { meta: 50, estimada: true });
});

prueba('043/RF-67: una semana entre dos meses suma lo de cada uno', () => {
  const v = [unaVersion043({ '2026-11': 230, '2026-12': 500 })];
  // Lunes 30 de noviembre (10) y del martes 1 al sábado 5 de diciembre (5 × 20).
  assert.equal(metaDelPeriodo(LLAVE_043, semana043('2026-11-30', '2026-12-06'), v).meta, 110);
});

prueba('043/RF-119: un periodo partido reparte la meta de cada versión por sus días', () => {
  const v = [
    versionMedible({ id: 'v1', numeroVersion: 1, rigeDesde: '2026-01-01', rigeHasta: '2026-11-19' }, [itemConMeses043({ '2026-11': 230 })]),
    versionMedible({ id: 'v2', numeroVersion: 2, rigeDesde: '2026-11-20', rigeHasta: null }, [itemConMeses043({ '2026-11': 460 })]),
  ];
  // Hasta el 19 hay 14 días de reparto a 10; desde el 20, 9 días a 20.
  assert.equal(metaDelPeriodo(LLAVE_043, mes043('2026-11-01', '2026-11-30'), v).meta, 320);
});

/** Un plan aprobado de la semana del 23 de noviembre, con la meta de cada llave repartida de lunes a viernes. */
const planSemanalDe043 = (metas: Record<string, number>, rigeDesde = '2026-11-23', rigeHasta: string | null = null) => {
  const dias = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'];
  const metasPorDia = new Map(dias.map((dia) => [dia, new Map(Object.entries(metas).map(([llave, meta]) => [llave, meta / dias.length]))]));
  return { id: 'p', semana: '2026-11-23', rigeDesde, rigeHasta, metasPorDia };
};

prueba('043/RF-64: el plan semanal aprobado manda sobre el reparto, y no cambia la meta del mes', () => {
  const v = [unaVersion043({ '2026-11': 230 })];
  const plan = [planSemanalDe043({ [LLAVE_043]: 75 })];
  assert.deepEqual(metaDelPeriodo(LLAVE_043, semana043('2026-11-23', '2026-11-29'), v, plan), { meta: 75, estimada: false, diasDelPlan: 5 });
  assert.deepEqual(metaDelPeriodo(LLAVE_043, mes043('2026-11-01', '2026-11-30'), v, plan), { meta: 230, estimada: false });
  // Un plan que no trae este ítem no le da meta.
  assert.deepEqual(metaDelPeriodo(LLAVE_043, semana043('2026-11-23', '2026-11-29'), v, [planSemanalDe043({})]), { meta: null, estimada: false });
});

prueba('043/RF-130: la meta no depende de lo ejecutado; una semana incumplida no cambia la siguiente', () => {
  const v = [unaVersion043({ '2026-11': 230 })];
  // La regla ni siquiera recibe lo ejecutado: dos semanas iguales dan siempre lo mismo.
  assert.equal(metaDelPeriodo(LLAVE_043, semana043('2026-11-09', '2026-11-15'), v).meta, 60);
  assert.equal(metaDelPeriodo(LLAVE_043, semana043('2026-11-23', '2026-11-29'), v).meta, 60);
});

prueba('043/RF-56, RF-73: sin versión o sin programación no hay meta; una parte sin versión suma cero', () => {
  assert.equal(metaDelPeriodo(LLAVE_043, mes043('2026-11-01', '2026-11-30'), []).meta, null);
  assert.equal(metaDelPeriodo('otra|llave|1', mes043('2026-11-01', '2026-11-30'), [unaVersion043({ '2026-11': 230 })]).meta, null);
  assert.equal(metaDelPeriodo(LLAVE_043, mes043('2026-10-01', '2026-10-31'), [unaVersion043({ '2026-11': 230 })]).meta, null);
  // Anulada el 20: del mes solo cuentan los 14 días hasta el 19.
  assert.equal(metaDelPeriodo(LLAVE_043, mes043('2026-11-01', '2026-11-30'), [unaVersion043({ '2026-11': 230 }, '2026-11-19')]).meta, 140);
  // Un domingo con programación en el mes no tiene meta, sin error.
  assert.equal(metaDelPeriodo(LLAVE_043, semana043('2026-11-29', '2026-11-29'), [unaVersion043({ '2026-11': 230 })]).meta, null);
});

prueba('043/RF-19: la llave de la meta es la del presupuesto; sin cruce, la del libro', () => {
  assert.equal(LLAVE_043, llaveDelItem('Circuito', ALCANTARILLAS_043, '4.1.8'));
  assert.equal(llaveDeItemPlanificado({ ...ITEM_SANO_043, delPresupuesto: null }), llaveDelItem(FRENTE_043, ALCANTARILLAS_043, '4.1.8'));
});

const actividad043 = (cantidad: number | null, cambio: object = {}) => ({
  item: '4.1.8',
  nombre: 'Excavación',
  descripcion: '',
  unidad: 'm3',
  cantidad,
  capituloId: 'c-b1',
  capitulo: ALCANTARILLAS_043,
  grupo: 'Circuito',
  ...cambio,
});
const parte043 = (fecha: string, actividades: ReturnType<typeof actividad043>[], cambio: object = {}) => ({
  fecha,
  cerrado: true,
  anulado: false,
  actividades,
  ...cambio,
});
/** 300 de medida real; 230 en noviembre (60 la semana del 23) y 270 en octubre. */
const ITEM_MEDIDO_043 = { ...itemConMeses043({ '2026-10': 270, '2026-11': 230 }), medidaReal: 300 };
const SEMANA_043 = semana043('2026-11-23', '2026-11-29');
const ejecucion043 = (partes: ReturnType<typeof parte043>[], cambio: object = {}) =>
  ejecucionDelPeriodo({
    periodo: SEMANA_043,
    hoy: '2026-11-30',
    items: [ITEM_MEDIDO_043],
    versiones: [versionMedible({ id: 'v1', numeroVersion: 1, rigeDesde: '2026-01-01', rigeHasta: null }, [ITEM_MEDIDO_043])],
    partesDelPeriodo: partes,
    partesAcumuladas: partes,
    mesesCumplidos: [],
    ...cambio,
  });

prueba('043/RF-60, RF-68 a RF-72: meta, ejecutado, porcentaje y pendiente por ítem', () => {
  const [fila] = ejecucion043([parte043('2026-11-23', [actividad043(10), actividad043(20)])]).filas;
  assert.equal(fila.meta, 60);
  assert.equal(fila.estimada, true);
  assert.equal(fila.ejecutado, 30);
  assert.equal(fila.porcentaje, 50);
  assert.equal(fila.pendientePeriodo, 30);
  assert.equal(fila.estado, 'normal');

  // RF-72: se ve el porcentaje real, y lo pendiente no baja de cero.
  const [demas] = ejecucion043([parte043('2026-11-23', [actividad043(90)])]).filas;
  assert.equal(demas.porcentaje, 150);
  assert.equal(demas.pendientePeriodo, 0);
});

prueba('043/RF-60: un parte anulado no cuenta, y una cantidad sin anotar no suma', () => {
  const [fila] = ejecucion043([parte043('2026-11-23', [actividad043(30)], { anulado: true }), parte043('2026-11-24', [actividad043(null)])]).filas;
  assert.equal(fila.ejecutado, 0);
});

prueba('043/RF-129: el pendiente del total de la obra frente a lo planeado', () => {
  const anteriores = [parte043('2026-10-05', [actividad043(100)]), parte043('2026-11-23', [actividad043(20)])];
  const [fila] = ejecucion043([parte043('2026-11-23', [actividad043(20)])], { partesAcumuladas: anteriores }).filas;
  assert.equal(fila.ejecutado, 20);
  assert.equal(fila.planeada, 300);
  assert.equal(fila.acumulado, 120);
  assert.equal(fila.pendienteTotal, 180);

  // Lo anulado tampoco acumula, y de más no da pendiente negativo.
  const pasado = [parte043('2026-10-05', [actividad043(500)]), parte043('2026-10-06', [actividad043(100)], { anulado: true })];
  const [otra] = ejecucion043([], { partesAcumuladas: pasado }).filas;
  assert.equal(otra.acumulado, 500);
  assert.equal(otra.pendienteTotal, 0);
});

prueba('043/RF-126, RF-74: lo ejecutado en Yondo no suma a Berrio y sale fuera de la planificación', () => {
  const { filas, fuera } = ejecucion043([parte043('2026-11-23', [actividad043(30, { grupo: 'VIA LA YE-YONDO', capituloId: 'c-y1' })])]);
  assert.equal(filas[0].ejecutado, 0);
  assert.equal(fuera.length, 1);
  assert.equal(fuera[0].cantidad, 30);
  assert.equal(fuera[0].marca, null);
});

prueba('043/RF-127, RF-74: una actividad sin capítulo o sin ítem sale fuera, con su marca', () => {
  const { filas, fuera } = ejecucion043([
    parte043('2026-11-23', [actividad043(5, { capituloId: null, capitulo: null, grupo: null }), actividad043(2, { item: null, nombre: 'Otra' })]),
  ]);
  assert.equal(filas[0].ejecutado, 0);
  assert.deepEqual(fuera.map((a) => a.marca), ['sin_capitulo', null]);
  assert.equal(fuera[1].nombre, 'Otra');
});

prueba('043/RF-73: sin meta en el periodo se ve lo ejecutado con «Sin programación» y sin porcentaje', () => {
  const sinMeta = semana043('2026-09-07', '2026-09-13');
  const { filas } = ejecucion043([parte043('2026-09-08', [actividad043(7)])], { periodo: sinMeta });
  assert.equal(filas[0].meta, null);
  assert.equal(filas[0].ejecutado, 7);
  assert.equal(filas[0].porcentaje, null);
  assert.equal(filas[0].estado, 'sin_programacion');
  // Sin meta y sin nada ejecutado no hay nada que mostrar.
  assert.deepEqual(ejecucion043([], { periodo: sinMeta }).filas, []);
});

prueba('043/RF-61, RF-62: los partes abiertos se cuentan y avisan que las cifras pueden cambiar', () => {
  const abiertos = ejecucion043([parte043('2026-11-23', [actividad043(30)], { cerrado: false }), parte043('2026-11-24', [])]);
  assert.equal(abiertos.avisos.diasAbiertos, 1);
  assert.equal(abiertos.avisos.cifrasPuedenCambiar, true);
  assert.equal(abiertos.filas[0].ejecutado, 30);
  const cerrados = ejecucion043([parte043('2026-11-23', [])]);
  assert.equal(cerrados.avisos.diasAbiertos, 0);
  assert.equal(cerrados.avisos.cifrasPuedenCambiar, false);
});

prueba('043/RF-128: los días de reparto sin parte se avisan, sin contar los futuros', () => {
  // El 25 de noviembre, de la semana del 23 van tres días de reparto y hay parte de uno.
  const { avisos } = ejecucion043([parte043('2026-11-23', [])], { hoy: '2026-11-25' });
  assert.equal(avisos.diasSinParte, 2);
  // Un parte anulado no es un parte; la semana completa son seis días de reparto.
  assert.equal(ejecucion043([parte043('2026-11-23', [], { anulado: true })]).avisos.diasSinParte, 6);
});

prueba('043/RF-123 a RF-125: un mes marcado muestra «Meta cumplida», y sus semanas completas también', () => {
  const OCTUBRE = mes043('2026-10-01', '2026-10-31');
  const [mes] = ejecucion043([], { periodo: OCTUBRE, mesesCumplidos: ['2026-10'] }).filas;
  assert.equal(mes.estado, 'meta_cumplida');
  assert.equal(mes.porcentaje, null);
  assert.equal(mes.pendientePeriodo, 0);

  const dentro = semana043('2026-10-12', '2026-10-18');
  assert.equal(ejecucion043([], { periodo: dentro, mesesCumplidos: ['2026-10'] }).filas[0].estado, 'meta_cumplida');
  // La semana que cae entre dos meses no está por completo dentro.
  const entreDos = semana043('2026-10-26', '2026-11-01');
  assert.equal(ejecucion043([], { periodo: entreDos, mesesCumplidos: ['2026-10'] }).filas[0].estado, 'normal');

  // RF-125: sin marcar se mide contra los partes.
  const [sinMarcar] = ejecucion043([parte043('2026-10-05', [actividad043(27)])], { periodo: OCTUBRE }).filas;
  assert.equal(sinMarcar.estado, 'normal');
  assert.equal(sinMarcar.porcentaje, 10);
});

/** 230 unidades en noviembre a 100 de contrato y 40 de costo: 10 por día de reparto. */
const ITEM_CON_PRECIOS_043 = { ...itemConMeses043({ '2026-11': 230 }), precioContractual: 100, precioCosto: 40 };
const NOVIEMBRE_043 = mes043('2026-11-01', '2026-11-30');
const EXTRAS_043 = {
  indirectos: [{ mes: '2026-11', valor: 2300 }],
  rubros: [],
  lineaDeRubros: { nombre: 'Componentes', valores: [{ mes: '2026-11', valor: 500 }] },
};
const version043 = (items: (typeof ITEM_CON_PRECIOS_043)[], rigeHasta: string | null = null) =>
  versionMedible({ id: 'v1', numeroVersion: 1, rigeDesde: '2026-01-01', rigeHasta }, items, EXTRAS_043);
const valores043 = (periodo: ReturnType<typeof mes043> | ReturnType<typeof semana043>, partes: ReturnType<typeof parte043>[], items = [ITEM_CON_PRECIOS_043], versiones = [version043(items)]) =>
  valoresDelPeriodo({ periodo, items, versiones, partesDelPeriodo: partes });
const conTreinta043 = [parte043('2026-11-23', [actividad043(30)])];

prueba('043/RF-75 a RF-79: programado, ejecutado, a cobrar, «Faltó» o «Sobró» y margen', () => {
  const { totales, filas } = valores043(SEMANA_043, conTreinta043);
  // Semana: 60 × 40 programado, 30 × 40 ejecutado, 30 × 100 a cobrar.
  assert.equal(totales.programado, 2400);
  assert.equal(totales.ejecutado, 1200);
  assert.equal(totales.aCobrar, 3000);
  assert.deepEqual(totales.faltoSobro, { tipo: 'falto', valor: 1200 });
  assert.equal(totales.margen, 1800);
  assert.deepEqual(filas[0], { llave: LLAVE_043, programado: 2400, ejecutado: 1200, aCobrar: 3000 });

  const deMas = valores043(SEMANA_043, [parte043('2026-11-23', [actividad043(70)])]).totales;
  assert.deepEqual(deMas.faltoSobro, { tipo: 'sobro', valor: 400 });
  const justo = valores043(SEMANA_043, [parte043('2026-11-23', [actividad043(60)])]).totales;
  assert.deepEqual(justo.faltoSobro, { tipo: null, valor: 0 });
});

prueba('043/RF-75, RF-76: cada día se valora con los precios de la versión que regía', () => {
  const v1 = versionMedible({ id: 'v1', numeroVersion: 1, rigeDesde: '2026-01-01', rigeHasta: '2026-11-19' }, [ITEM_CON_PRECIOS_043]);
  const v2 = versionMedible({ id: 'v2', numeroVersion: 2, rigeDesde: '2026-11-20', rigeHasta: null }, [{ ...ITEM_CON_PRECIOS_043, precioCosto: 50, precioContractual: 200 }]);
  const { totales } = valores043(NOVIEMBRE_043, [parte043('2026-11-19', [actividad043(10)]), parte043('2026-11-20', [actividad043(10)])], [ITEM_CON_PRECIOS_043], [v1, v2]);
  // 14 días × 10 × 40 + 9 días × 10 × 50.
  assert.equal(totales.programado, 10100);
  assert.equal(totales.ejecutado, 900);
  assert.equal(totales.aCobrar, 3000);
});

prueba('043/RF-80 a RF-82: un ítem sin costo sale de todos los totales de plata, se lista aparte y se avisa', () => {
  const sinCosto = { ...ITEM_CON_PRECIOS_043, item: '2.8', precioCosto: 0.000000001, delPresupuesto: { ...ITEM_SANO_043.delPresupuesto, item: '2.8' } };
  const items = [ITEM_CON_PRECIOS_043, sinCosto];
  const { totales, sinPrecioDeCosto: aparte, avisoSinCosto, filas } = valores043(SEMANA_043, [parte043('2026-11-23', [actividad043(30), actividad043(5, { item: '2.8' })])], items);
  assert.equal(totales.ejecutado, 1200);
  assert.equal(totales.aCobrar, 3000);
  assert.equal(totales.margen, 1800);
  assert.equal(totales.programado, 2400);
  assert.deepEqual(aparte.map((a) => [a.item, a.cantidad]), [['2.8', 5]]);
  assert.equal(avisoSinCosto, true);
  assert.deepEqual(filas[1].ejecutado, null);

  // También avisa si solo estaba programado, aunque aún no se ejecute; pero no se lista aparte.
  const soloProgramado = valores043(SEMANA_043, [], items);
  assert.equal(soloProgramado.avisoSinCosto, true);
  assert.deepEqual(soloProgramado.sinPrecioDeCosto, []);

  assert.equal(valores043(SEMANA_043, conTreinta043).avisoSinCosto, false);
});

prueba('043/RF-131, RF-132: el resultado después de indirectos solo sale en el mensual', () => {
  const mes = valores043(NOVIEMBRE_043, conTreinta043).totales;
  assert.equal(mes.margen, 1800);
  assert.equal(mes.resultado, -500);
  assert.equal(valores043(SEMANA_043, conTreinta043).totales.resultado, null);
});

prueba('043/RF-83 a RF-85, RF-133 a RF-135: indirectos y rubros van aparte, en el mensual y sin tocar el «Faltó»', () => {
  const mes = valores043(NOVIEMBRE_043, conTreinta043);
  assert.equal(mes.indirectos, 2300);
  assert.deepEqual(mes.rubros, [{ nombre: 'Componentes', valor: 500 }]);
  // El programado es solo el de los ítems; los rubros no entran al margen.
  assert.equal(mes.totales.programado, 9200);
  assert.deepEqual(mes.totales.faltoSobro, { tipo: 'falto', valor: 8000 });

  const semana = valores043(SEMANA_043, conTreinta043);
  assert.equal(semana.indirectos, null);
  assert.deepEqual(semana.rubros, []);
});

prueba('043/RF-56, RF-119: lo que queda sin versión no tiene plata, e indirectos se parten igual', () => {
  const anulada = [version043([ITEM_CON_PRECIOS_043], '2026-11-19')];
  const { totales, indirectos, rubros } = valores043(NOVIEMBRE_043, [parte043('2026-11-25', [actividad043(10)])], [ITEM_CON_PRECIOS_043], anulada);
  assert.equal(totales.ejecutado, 0);
  assert.equal(totales.programado, 5600);
  // 14 de los 23 días de reparto.
  assert.equal(indirectos, 1400);
  assert.deepEqual(rubros, [{ nombre: 'Componentes', valor: 304 }]);
});

prueba('043/RF-64, RF-75: con plan semanal, lo programado sale de la meta del plan', () => {
  const items = [ITEM_CON_PRECIOS_043];
  const r = valoresDelPeriodo({ periodo: SEMANA_043, items, versiones: [version043(items)], partesDelPeriodo: [], planesSemanales: [planSemanalDe043({ [LLAVE_043]: 75 })] });
  assert.equal(r.totales.programado, 3000);
});

prueba('043/RF-60: un parte anulado tampoco tiene plata', () => {
  assert.equal(valores043(SEMANA_043, [parte043('2026-11-23', [actividad043(30)], { anulado: true })]).totales.ejecutado, 0);
});

const informe043 = (periodo: ReturnType<typeof mes043> | ReturnType<typeof semana043>, partes: ReturnType<typeof parte043>[], versiones = [{ ...version043([ITEM_CON_PRECIOS_043]), items: [ITEM_CON_PRECIOS_043] }]) =>
  informeDeCumplimiento({
    periodo,
    hoy: '2026-11-30',
    versiones,
    partesDelPeriodo: partes,
    partesAcumuladas: partes,
    mesesCumplidos: [],
  });

prueba('043/RF-58, RF-59: el informe es de una semana de lunes a domingo o de un mes del calendario', () => {
  assert.deepEqual(periodoDelInforme('semana', '2026-11-25'), { tipo: 'semana', desde: '2026-11-23', hasta: '2026-11-29' });
  assert.deepEqual(periodoDelInforme('semana', '2026-11-29'), { tipo: 'semana', desde: '2026-11-23', hasta: '2026-11-29' });
  assert.deepEqual(periodoDelInforme('mes', '2026-11-25'), { tipo: 'mes', desde: '2026-11-01', hasta: '2026-11-30' });
});

prueba('043: el informe junta cantidades y plata por ítem, y los totales', () => {
  const informe = informe043(SEMANA_043, conTreinta043);
  const [fila] = informe.filas;
  assert.equal(fila.item, '4.1.8');
  assert.equal(fila.meta, 60);
  assert.equal(fila.ejecutado, 30);
  assert.deepEqual(fila.valores, { programado: 2400, ejecutado: 1200, aCobrar: 3000 });
  assert.equal(informe.totales.margen, 1800);
  assert.equal(informe.periodo.desde, '2026-11-23');
  assert.equal(informe.avisos.diasAbiertos, 0);
});

prueba('043/RF-54, RF-56: el informe dice qué versión o versiones usó, y si hubo días sin planificación', () => {
  assert.deepEqual(informe043(SEMANA_043, []).versiones, [{ numeroVersion: 1, desde: '2026-11-23', hasta: '2026-11-29' }]);
  assert.equal(informe043(SEMANA_043, []).sinPlanificacion, false);

  const items = [ITEM_CON_PRECIOS_043];
  const v1 = { ...versionMedible({ id: 'v1', numeroVersion: 1, rigeDesde: '2026-01-01', rigeHasta: '2026-11-19' }, items), items };
  const v2 = { ...versionMedible({ id: 'v2', numeroVersion: 2, rigeDesde: '2026-11-20', rigeHasta: null }, items), items };
  const partido = informe043(semana043('2026-11-16', '2026-11-22'), [], [v1, v2]);
  assert.deepEqual(partido.versiones.map((v) => [v.numeroVersion, v.desde, v.hasta]), [
    [1, '2026-11-16', '2026-11-19'],
    [2, '2026-11-20', '2026-11-22'],
  ]);

  // Anulada el 20: lo ejecutado después se sigue viendo, sin meta, con el aviso.
  const anulada = informe043(semana043('2026-11-23', '2026-11-29'), conTreinta043, [v1]);
  assert.equal(anulada.sinPlanificacion, true);
  assert.deepEqual(anulada.versiones, []);
  assert.equal(anulada.filas[0].ejecutado, 30);
  assert.equal(anulada.filas[0].estado, 'sin_programacion');

  // Una obra que nunca tuvo planificación muestra lo ejecutado aparte.
  const sinNinguna = informe043(SEMANA_043, conTreinta043, []);
  assert.equal(sinNinguna.sinPlanificacion, true);
  assert.deepEqual(sinNinguna.filas, []);
  assert.equal(sinNinguna.fuera[0].cantidad, 30);
});

prueba('043/RF-88, RF-89: al Residente no le llega ninguna cifra de plata, en ningún rincón del informe', () => {
  const precioUnico = 987654.321;
  const item = { ...ITEM_CON_PRECIOS_043, precioContractual: precioUnico, precioCosto: 123456.789 };
  const completo = informe043(NOVIEMBRE_043, conTreinta043, [{ ...version043([item]), items: [item] }]);
  const prohibidas = /precio|costo|valor|margen|resultado|indirect|rubro|cobrar|falto|sobro|totales|programado/i;

  const claves: string[] = [];
  const recorrer = (nodo: unknown) => {
    if (Array.isArray(nodo)) nodo.forEach(recorrer);
    else if (nodo && typeof nodo === 'object') {
      for (const [clave, valor] of Object.entries(nodo)) {
        claves.push(clave);
        recorrer(valor);
      }
    }
  };
  // Primero: la prueba sí sirve, el informe completo trae esas claves.
  recorrer(completo);
  assert.ok(claves.some((c) => prohibidas.test(c)));

  claves.length = 0;
  const reducido = sinPlata(completo);
  recorrer(reducido);
  assert.ok(claves.length > 0);
  assert.deepEqual(claves.filter((c) => prohibidas.test(c)), []);
  assert.ok(!JSON.stringify(reducido).includes('987654'));
  assert.ok(!JSON.stringify(reducido).includes('123456'));

  // Las cantidades y los porcentajes sí llegan.
  assert.equal(reducido.filas[0].meta, 230);
  assert.equal(reducido.filas[0].ejecutado, 30);
  assert.equal(reducido.filas[0].porcentaje, 13);
  assert.equal(reducido.avisos.diasAbiertos, 0);
});

prueba('043/RF-92, RF-96: el Excel trae las mismas cifras que el informe, con su plata', () => {
  const informe = informe043(SEMANA_043, conTreinta043);
  const hojas = hojasDelInforme(informe);
  const cumplimiento = hojas.find((h) => h.nombre === 'Cumplimiento');
  assert.ok(cumplimiento);
  const columna = (nombre: string) => cumplimiento.encabezados.indexOf(nombre);
  const [fila] = cumplimiento.filas;
  assert.equal(fila[columna('Ítem')], '4.1.8');
  assert.equal(fila[columna('Meta')], 60);
  assert.equal(fila[columna('Ejecutado')], 30);
  assert.equal(fila[columna('Valor programado')], 2400);
  assert.equal(fila[columna('Valor ejecutado')], 1200);
  assert.equal(fila[columna('A cobrar')], 3000);
  const totales = hojas.find((h) => h.nombre === 'Totales');
  assert.ok(totales);
  assert.deepEqual(totales.filas.find((f) => f[0] === 'Margen'), ['Margen', 1800]);
});

prueba('043/RF-89, RF-92: el Excel del Residente no tiene ni una columna ni una cifra de plata', () => {
  const precioUnico = 987654.321;
  const item = { ...ITEM_CON_PRECIOS_043, precioContractual: precioUnico, precioCosto: 123456.789 };
  const completo = informe043(NOVIEMBRE_043, conTreinta043, [{ ...version043([item]), items: [item] }]);
  const prohibidas = /precio|costo|valor|margen|resultado|indirect|rubro|cobrar|falt|sobr|totales|programado/i;

  const conPlata = hojasDelInforme(completo);
  const textos = (hojas: ReturnType<typeof hojasDelInforme>) =>
    hojas.flatMap((h) => [h.nombre, ...h.encabezados, ...h.filas.flat().filter((c): c is string => typeof c === 'string')]);
  // La prueba sí sirve: el Excel con plata trae esas palabras.
  assert.ok(textos(conPlata).some((t) => prohibidas.test(t)));

  const reducido = hojasDelInforme(sinPlata(completo));
  assert.deepEqual(textos(reducido).filter((t) => prohibidas.test(t)), []);
  const numeros = reducido.flatMap((h) => h.filas.flat().filter((c): c is number => typeof c === 'number'));
  const deLaPlata = new Set(conPlata.flatMap((h) => h.filas.flat()).filter((c): c is number => typeof c === 'number' && c > 1000));
  assert.deepEqual(numeros.filter((n) => deLaPlata.has(n)), []);
  // Las cantidades sí están.
  const fila = reducido.find((h) => h.nombre === 'Cumplimiento')?.filas[0];
  assert.ok(fila?.includes(230));
  assert.ok(fila?.includes(30));
});

prueba('043/RF-93, RF-96: el PDF lleva las mismas cifras que el Excel, con la plata en pesos', () => {
  const informe = informe043(SEMANA_043, conTreinta043);
  const bloques = bloquesDelInforme(informe);
  const tablas = bloques.flatMap((b) => (b.tipo === 'tabla' ? [b.tabla] : []));
  const hojas = hojasDelInforme(informe);
  const celda = (t: { encabezados: string[]; filas: unknown[][] }, fila: unknown[], nombre: string) => fila[t.encabezados.indexOf(nombre)];

  // Cada cifra de cada ítem del Excel está en el PDF, en la fila de su capítulo e ítem.
  const excel = hojas.find((h) => h.nombre === 'Cumplimiento');
  assert.ok(excel);
  const cumplimiento = tablas.find((t) => t.titulo === 'Cumplimiento');
  const valores = tablas.find((t) => t.titulo === 'Valores por ítem');
  assert.ok(cumplimiento && valores);
  for (const fila of excel.filas) {
    const llave = (t: { encabezados: string[]; filas: unknown[][] }): unknown[] | undefined =>
      t.filas.find((f) => celda(t, f, 'Capítulo') === celda(excel, fila, 'Capítulo') && celda(t, f, 'Ítem') === celda(excel, fila, 'Ítem'));
    const enCantidades = llave(cumplimiento);
    const enValores = llave(valores);
    assert.ok(enCantidades && enValores);
    for (const nombre of excel.encabezados) {
      if (nombre === 'Grupo') continue;
      const enPdf: unknown = cumplimiento.encabezados.includes(nombre) ? celda(cumplimiento, enCantidades, nombre) : celda(valores, enValores, nombre);
      assert.equal(enPdf, celda(excel, fila, nombre), nombre);
    }
  }
  // Un solo frente va una vez, como texto, y no ocupa una columna.
  assert.ok(!cumplimiento.encabezados.includes('Grupo'));
  assert.ok(bloques.some((b) => b.tipo === 'texto' && b.markdown.includes('Circuito')));
  // Las demás hojas, iguales.
  for (const nombre of ['Fuera de la planificación', 'Totales', 'Sin precio de costo', 'Avisos']) {
    assert.deepEqual(tablas.find((t) => t.titulo === nombre)?.filas, hojas.find((h) => h.nombre === nombre)?.filas, nombre);
  }
  assert.equal(valores.formatos[valores.encabezados.indexOf('A cobrar')], 'pesos');
  assert.equal(cumplimiento.formatos[cumplimiento.encabezados.indexOf('Meta')], 'numero');
  assert.equal(cumplimiento.formatos[cumplimiento.encabezados.indexOf('Ítem')], 'texto');
  assert.equal(tablas.find((t) => t.titulo === 'Totales')?.formatos[1], 'pesos');

  // Sin plata, el PDF del Residente no tiene la tabla de valores ni una sola columna en pesos.
  const reducido = bloquesDelInforme(sinPlata(informe)).flatMap((b) => (b.tipo === 'tabla' ? [b.tabla] : []));
  assert.deepEqual(reducido.flatMap((t) => t.formatos).filter((f) => f === 'pesos'), []);
  assert.deepEqual(reducido.map((t) => t.titulo), ['Cumplimiento', 'Fuera de la planificación', 'Avisos']);
});

prueba('043/RF-87, RF-88: según el acceso se entrega el informe con plata o solo en cantidades', () => {
  const completo = informe043(SEMANA_043, conTreinta043);
  assert.equal('totales' in informeSegunRol(completo, 'residente'), false);
  for (const rol of ['admin', 'director_proyectos', 'director_obra'] as const) {
    assert.equal('totales' in informeSegunRol(completo, rol), true);
  }
});

const LIBRO_043 = [
  { nombre: 'PLANIFIC BERRIO', visible: true, filas: [[null, 'Item', 'Unidad'], [], [1, '2.8', 'm3', 242062, null, null]] },
  { nombre: 'PLANIFIC YONDO', visible: true, filas: [[39, '2.8', 'm3', 242062]] },
  { nombre: 'FLUJO DE CAJA', visible: true, filas: [[1, 'm3', 18387029.52]] },
  { nombre: 'Línea base', visible: true, filas: [[1, 'm3', 970008]] },
  { nombre: 'MAT', visible: false, filas: [['secreto']] },
];
const PROPUESTA_043 = limpiarPropuesta(
  {
    hojas: [
      { nombre: 'PLANIFIC BERRIO', usos: ['planificacion' as const], clase: 'otra' as const },
      { nombre: 'PLANIFIC YONDO', usos: ['planificacion' as const], clase: 'otra' as const },
      { nombre: 'FLUJO DE CAJA', usos: ['tiempos' as const], clase: 'flujo_de_caja' as const },
      { nombre: 'Línea base', usos: ['programacion' as const], clase: 'linea_base' as const },
    ],
  },
  LIBRO_043,
);
const BIEN_043 = [
  { nombre: 'PLANIFIC BERRIO', usos: ['planificacion' as const] },
  { nombre: 'Línea base', usos: ['programacion' as const, 'rubros' as const, 'indirectos' as const] },
];
const tiposDeFalta043 = (hojas: { nombre: string; usos: Parameters<typeof repasarSeleccion>[0]['hojas'][number]['usos'] }[], propuesta = PROPUESTA_043, confirmoProgramacion = false) =>
  repasarSeleccion({ hojas, confirmoProgramacion }, propuesta, LIBRO_043).map((f) => f.tipo);

prueba('043/RF-4, RF-5: para proponer va una muestra de cada hoja visible, y nunca una oculta', () => {
  const muestra = muestraParaProponer(LIBRO_043);
  assert.match(muestra, /«PLANIFIC BERRIO»/);
  assert.match(muestra, /«Línea base»/);
  assert.ok(!muestra.includes('MAT'));
  assert.ok(!muestra.includes('secreto'));
  // Una hoja larga no se manda entera.
  const larga = [{ nombre: 'Larga', visible: true, filas: Array.from({ length: 40 }, (_, i) => [`fila-${i}`]) }];
  assert.match(muestraParaProponer(larga), /fila-0/);
  assert.ok(!muestraParaProponer(larga).includes('fila-30'));
});

prueba('043/RF-5: la propuesta de la IA no conserva hojas ocultas ni inventadas', () => {
  const limpia = limpiarPropuesta(
    {
      hojas: [
        { nombre: 'MAT', usos: ['planificacion'], clase: 'otra' },
        { nombre: 'No existe', usos: ['planificacion'], clase: 'otra' },
        { nombre: 'Línea base', usos: ['programacion'], clase: 'linea_base' },
      ],
    },
    LIBRO_043,
  );
  assert.deepEqual(limpia.hojas.map((h) => h.nombre), ['Línea base']);
});

prueba('043/RF-6, RF-20: solo se manda lo confirmado, cada fila con su hoja y su número real', () => {
  const lectura = textoParaLeer({ hojas: BIEN_043 }, LIBRO_043);
  assert.ok(lectura);
  assert.match(lectura.texto, /H1F3 \| 1 \| 2\.8 \| m3 \| 242062$/m);
  assert.match(lectura.texto, /H2F1 \| 1 \| m3 \| 970008$/m);
  assert.match(lectura.texto, /Hoja 1 · «PLANIFIC BERRIO» · planificacion/);
  assert.ok(!lectura.texto.includes('PLANIFIC YONDO'));
  assert.ok(!lectura.texto.includes('18387029'));
  assert.equal(lectura.filas, 3);
  assert.deepEqual(lectura.hojas.map((h) => h.nombre), ['PLANIFIC BERRIO', 'Línea base']);
});

prueba('043/RF-5, RF-6: una hoja oculta no entra aunque la pidan', () => {
  const lectura = textoParaLeer({ hojas: [{ nombre: 'MAT', usos: ['planificacion'] }] }, LIBRO_043);
  assert.ok(lectura);
  assert.equal(lectura.filas, 0);
  assert.deepEqual(tiposDeFalta043([{ nombre: 'MAT', usos: ['planificacion'] }, ...BIEN_043]), ['hoja_no_disponible', 'escoger_planificacion']);
});

prueba('043: una lectura que pasa de 1 500 filas no se manda', () => {
  const libro = [{ nombre: 'Enorme', visible: true, filas: Array.from({ length: 1501 }, () => ['x']) }];
  assert.equal(textoParaLeer({ hojas: [{ nombre: 'Enorme', usos: ['planificacion'] }] }, libro), null);
});

prueba('043/RF-6, RF-100, RF-103: la selección que se manda sale de la propuesta y lo que se escogió', () => {
  // La propuesta del V5, como la dio la IA en la T17.
  const propuesta = {
    hojas: [
      { nombre: 'PLANIFIC BERRIO', usos: ['planificacion' as const], clase: 'otra' as const },
      { nombre: 'PLANIFIC YONDO', usos: ['planificacion' as const], clase: 'otra' as const },
      { nombre: 'FLUJO DE CAJA', usos: ['tiempos' as const], clase: 'flujo_de_caja' as const },
      { nombre: 'Línea base', usos: ['programacion' as const, 'indirectos' as const, 'rubros' as const], clase: 'linea_base' as const },
      { nombre: 'supuestos', usos: ['supuestos' as const], clase: 'otra' as const },
      { nombre: 'objetivos', usos: ['objetivos' as const], clase: 'otra' as const },
    ],
  };
  const otras = ['FLUJO DE CAJA', 'supuestos', 'objetivos'];
  // Con Berrio y la línea base sale la misma selección, en el mismo orden, que leyó la T19: la
  // lectura guardada sirve y no se paga otra vez.
  assert.deepEqual(armarSeleccion(propuesta, { frente: 'PLANIFIC BERRIO', programacion: 'Línea base', otras, confirmoProgramacion: false }), {
    hojas: [
      { nombre: 'PLANIFIC BERRIO', usos: ['planificacion'] },
      { nombre: 'Línea base', usos: ['programacion', 'indirectos', 'rubros'] },
      { nombre: 'FLUJO DE CAJA', usos: ['tiempos'] },
      { nombre: 'supuestos', usos: ['supuestos'] },
      { nombre: 'objetivos', usos: ['objetivos'] },
    ],
    confirmoProgramacion: false,
  });
  // Yondo no entra aunque esté propuesto: se escogió un frente. Una hoja quitada tampoco.
  const sinFlujo = armarSeleccion(propuesta, { frente: 'PLANIFIC BERRIO', programacion: 'Línea base', otras: ['supuestos', 'PLANIFIC YONDO'], confirmoProgramacion: false });
  assert.deepEqual(sinFlujo.hojas.map((h) => h.nombre), ['PLANIFIC BERRIO', 'Línea base', 'supuestos']);
  // Si la de programación es la misma del frente, va una sola vez con los dos usos.
  const misma = armarSeleccion(propuesta, { frente: 'PLANIFIC BERRIO', programacion: 'PLANIFIC BERRIO', otras: [], confirmoProgramacion: true });
  assert.deepEqual(misma, { hojas: [{ nombre: 'PLANIFIC BERRIO', usos: ['planificacion', 'programacion'] }], confirmoProgramacion: true });
  // Lo que arma pasa el repaso del servidor sin faltas.
  assert.deepEqual(
    repasarSeleccion(armarSeleccion(propuesta, { frente: 'PLANIFIC BERRIO', programacion: 'Línea base', otras, confirmoProgramacion: false }), propuesta, [
      ...propuesta.hojas.map((h) => ({ nombre: h.nombre, visible: true, filas: [] })),
    ]),
    [],
  );
});

prueba('043/RF-100: dos hojas de frente exigen escoger una, y sin hoja de planificación falta', () => {
  const dos = repasarSeleccion(
    {
      hojas: [{ nombre: 'PLANIFIC YONDO', usos: ['planificacion'] }, ...BIEN_043],
    },
    PROPUESTA_043,
    LIBRO_043,
  );
  assert.deepEqual(dos.map((f) => f.tipo), ['escoger_planificacion']);
  assert.deepEqual(dos[0].opciones, ['PLANIFIC YONDO', 'PLANIFIC BERRIO']);
  assert.deepEqual(tiposDeFalta043(BIEN_043), []);
  assert.deepEqual(tiposDeFalta043([BIEN_043[1]]), ['falta_planificacion']);
});

prueba('043/RF-101, RF-102: con línea base, el flujo de caja no vale como programación', () => {
  assert.deepEqual(tiposDeFalta043([BIEN_043[0], { nombre: 'FLUJO DE CAJA', usos: ['programacion'] }]), ['programacion_no_es_linea_base']);
  assert.deepEqual(tiposDeFalta043([BIEN_043[0]]), ['falta_programacion']);
  // Sí vale para el mes de inicio y el tiempo de ejecución, que solo están ahí.
  assert.deepEqual(tiposDeFalta043([...BIEN_043, { nombre: 'FLUJO DE CAJA', usos: ['tiempos'] }]), []);
});

prueba('043/RF-103: sin línea base identificable hay que confirmar la hoja de programación', () => {
  const sinLineaBase = { hojas: PROPUESTA_043.hojas.filter((h) => h.clase !== 'linea_base') };
  const conFlujo = [BIEN_043[0], { nombre: 'FLUJO DE CAJA', usos: ['programacion' as const] }];
  assert.deepEqual(tiposDeFalta043(conFlujo, sinLineaBase), ['confirmar_programacion']);
  assert.deepEqual(tiposDeFalta043(conFlujo, sinLineaBase, true), []);
});

prueba('043/RF-104: los nombres de las hojas no deciden nada', () => {
  const libro = [
    { nombre: 'Hoja rara 7', visible: true, filas: [['a']] },
    { nombre: 'Otra cosa', visible: true, filas: [['b']] },
  ];
  const propuesta = limpiarPropuesta(
    {
      hojas: [
        { nombre: 'Hoja rara 7', usos: ['planificacion'], clase: 'otra' },
        { nombre: 'Otra cosa', usos: ['programacion'], clase: 'linea_base' },
      ],
    },
    libro,
  );
  assert.deepEqual(
    repasarSeleccion(
      { hojas: [{ nombre: 'Hoja rara 7', usos: ['planificacion'] }, { nombre: 'Otra cosa', usos: ['programacion'] }] },
      propuesta,
      libro,
    ),
    [],
  );
});

/** H1 es la planificación y H2 la línea base; las filas son las del V5, recortadas. */
const HOJAS_LEIDAS_043 = [
  {
    nombre: 'PLANIFIC BERRIO',
    visible: true,
    filas: [
      [null],
      [5, '5.1.7', 'm3', 'Sub-base', 112153, 40690, 2121.42, 236, null],
      [38.1, null, null, 'PMA', 218336960, 196503264],
      ['TOTAL', 39558848104, 10791439267, 20440864487],
      [9, '8.27', 'm', 'Sin celdas vacías', 2552782, 721278.04, 103.87, 354],
      [11, '13.1', 'm3-Km', 'Relleno', 1450, 0.000000001, 201534.9, 36816],
    ],
  },
  {
    nombre: 'Línea base',
    visible: true,
    filas: [
      [null],
      [5, 'm3', 112153, 0, 18146151],
      ['C', 'Componentes', 29161401, 29161401],
      ['Egresos costo indirecto', 221042440, 244510539],
    ],
  },
];
const ITEM_LEIDO_043 = {
  hoja: 1,
  fila: 2,
  renglon: '5',
  item: '5.1.7',
  descripcion: 'Sub-base',
  unidad: 'm3',
  grupo: 'BERRIO',
  capitulo: ALCANTARILLAS_043,
  precioContractual: 112153,
  precioCosto: 40690,
  medidaReal: 2121.42,
  medidaContractual: 236,
  traeMedidaCoste: false,
  medidaCoste: 0,
  programacion: { hoja: 2, fila: 2, meses: [{ mes: '2026-12', valor: 0 }, { mes: '2027-01', valor: 18146151 }] },
  tiempos: { hoja: 0, fila: 0, mesInicioDelExcel: 0, mesInicio: '', tiempoEjecucion: 0 },
};
const LECTURA_043: LecturaDePlanificacion = {
  items: [ITEM_LEIDO_043],
  rubros: [
    {
      hoja: 1,
      fila: 3,
      nombre: 'PMA',
      valor: 218336960,
      costo: 196503264,
      programacion: { hoja: 0, fila: 0, meses: [] },
    },
  ],
  lineaDeRubros: { hoja: 2, fila: 3, nombre: 'Componentes', meses: [{ mes: '2026-10', valor: 29161401 }] },
  indirectos: { hoja: 2, fila: 4, meses: [{ mes: '2026-02', valor: 221042440 }] },
  supuestos: ['Distancia 25 km'],
  objetivos: [],
  totalesDelExcel: {
    contractual: { hoja: 1, fila: 4, valor: 39558848104 },
    costo: { hoja: 1, fila: 4, valor: 10791439267 },
    indirectos: { hoja: 1, fila: 4, valor: 20440864487 },
  },
};
const conItem043 = (cambio: object) => ({ ...LECTURA_043, items: [{ ...ITEM_LEIDO_043, ...cambio }] });
const leido043 = (lectura: LecturaDePlanificacion) => {
  const r = estructuraDeLaLectura(lectura, HOJAS_LEIDAS_043);
  assert.ok(r.ok, 'la lectura debía servir');
  return r;
};

prueba('043/RF-20: lo que está en su celda se acepta, con las cantidades calculadas', () => {
  const { estructura, rechazados, totalesDelExcel } = leido043(LECTURA_043);
  assert.deepEqual(rechazados, []);
  const [item] = estructura.items;
  assert.equal(item.renglon, 5);
  assert.equal(item.precioCosto, 40690);
  assert.equal(item.revisar, false);
  assert.deepEqual(item.programacion, [
    { mes: '2026-12', valor: 0, cantidad: 0 },
    { mes: '2027-01', valor: 18146151, cantidad: 161.798 },
  ]);
  assert.equal(estructura.rubros.length, 1);
  assert.deepEqual(estructura.rubros[0].programacion, []);
  assert.equal(estructura.lineaDeRubros?.nombre, 'Componentes');
  assert.deepEqual(estructura.indirectos, [{ mes: '2026-02', valor: 221042440 }]);
  assert.equal(estructura.supuestos, 'Distancia 25 km');
  assert.equal(totalesDelExcel.contractual, 39558848104);
});

prueba('043/RF-139, RF-140: la «Med. Coste» se comprueba contra su fila; si el libro no la trae, queda vacía', () => {
  const sin = leido043(LECTURA_043);
  assert.equal(sin.estructura.items[0].medidaCoste, null);
  assert.deepEqual(sin.rechazados, []);

  // 236 está en la fila 2 de la planificación.
  const con = leido043(conItem043({ traeMedidaCoste: true, medidaCoste: 236 }));
  assert.equal(con.estructura.items[0].medidaCoste, 236);
  assert.equal(con.estructura.items[0].revisar, false);

  const inventada = leido043(conItem043({ traeMedidaCoste: true, medidaCoste: 2500 }));
  assert.equal(inventada.estructura.items[0].medidaCoste, null);
  assert.equal(inventada.estructura.items[0].revisar, true);
  assert.match(inventada.rechazados[0].que, /Med\. Coste/);
});

prueba('043/RF-21, RF-22: una cifra inventada se descarta y marca su ítem, y las demás siguen', () => {
  const { estructura, rechazados } = leido043(conItem043({ precioCosto: 99999 }));
  const [item] = estructura.items;
  assert.equal(item.precioCosto, null);
  assert.equal(item.precioContractual, 112153);
  assert.equal(item.medidaReal, 2121.42);
  assert.equal(item.revisar, true);
  assert.equal(rechazados.length, 1);
  assert.match(rechazados[0].que, /5\.1\.7/);
  assert.equal(rechazados[0].fila, 2);
});

prueba('043/RF-20, RF-21: una cifra sin hoja o fila, o que cita una que no existe, se descarta', () => {
  for (const cita of [{ hoja: 0, fila: 2 }, { hoja: 1, fila: 0 }, { hoja: 9, fila: 2 }, { hoja: 1, fila: 99 }]) {
    const [item] = leido043(conItem043(cita)).estructura.items;
    assert.equal(item.precioContractual, null, JSON.stringify(cita));
    assert.equal(item.precioCosto, null);
    assert.equal(item.medidaReal, null);
    assert.equal(item.medidaContractual, null);
    assert.equal(item.revisar, true);
  }
});

prueba('043/RF-21: un cero solo se acepta si la fila tiene un cero o una celda vacía', () => {
  // La fila 2 tiene una celda vacía: las fórmulas que valen cero llegan así.
  const conVacia = leido043(conItem043({ precioCosto: 0 })).estructura.items[0];
  assert.equal(conVacia.precioCosto, 0);
  assert.equal(conVacia.revisar, false);

  // La fila 5 no tiene ni cero ni vacías.
  const sinVacias = leido043(conItem043({ fila: 5, item: '8.27', precioContractual: 2552782, precioCosto: 0, medidaReal: 103.87, medidaContractual: 354 })).estructura.items[0];
  assert.equal(sinVacias.precioCosto, null);
  assert.equal(sinVacias.revisar, true);
});

prueba('043/RF-21, RF-32: un costo de relleno que sí está en la celda se conserva', () => {
  const [item] = leido043(conItem043({ fila: 6, item: '13.1', precioContractual: 1450, precioCosto: 0.000000001, medidaReal: 201534.9, medidaContractual: 36816 })).estructura.items;
  assert.equal(item.precioCosto, 0.000000001);
  assert.equal(item.revisar, false);
});

prueba('043/RF-21, RF-22: un mes que no está en su fila, o mal escrito, se descarta y marca el ítem', () => {
  const inventado = leido043(conItem043({ programacion: { hoja: 2, fila: 2, meses: [{ mes: '2027-01', valor: 18146151 }, { mes: '2027-02', valor: 7 }] } }));
  assert.deepEqual(inventado.estructura.items[0].programacion.map((p) => p.mes), ['2027-01']);
  assert.equal(inventado.estructura.items[0].revisar, true);

  const malEscrito = leido043(conItem043({ programacion: { hoja: 2, fila: 2, meses: [{ mes: 'enero', valor: 18146151 }] } }));
  assert.deepEqual(malEscrito.estructura.items[0].programacion, []);
  assert.equal(malEscrito.estructura.items[0].revisar, true);

  // Sin programación citada no es un descarte: es que no la trae.
  const sinPrograma = leido043(conItem043({ programacion: { hoja: 0, fila: 0, meses: [] } }));
  assert.deepEqual(sinPrograma.estructura.items[0].programacion, []);
  assert.equal(sinPrograma.estructura.items[0].revisar, false);
});

prueba('043/RF-13, RF-14, RF-21: el mes de inicio y el tiempo se comprueban contra su fila', () => {
  const fila = { ...ITEM_LEIDO_043.tiempos, hoja: 1, fila: 5 };
  // La fila 5 trae un 9: sirve como mes de inicio relativo y como tiempo.
  const bien = leido043(conItem043({ tiempos: { ...fila, mesInicioDelExcel: 9, mesInicio: '2026-10', tiempoEjecucion: 9 } })).estructura.items[0];
  assert.equal(bien.mesInicio, '2026-10');
  assert.equal(bien.tiempoEjecucion, 9);
  assert.equal(bien.revisar, false);

  const mal = leido043(conItem043({ tiempos: { ...fila, mesInicioDelExcel: 77, mesInicio: '2026-10', tiempoEjecucion: 66 } })).estructura.items[0];
  assert.equal(mal.mesInicio, null);
  assert.equal(mal.tiempoEjecucion, null);
  assert.equal(mal.revisar, true);

  // Que el libro no los traiga no es un descarte.
  const sin = leido043(LECTURA_043).estructura.items[0];
  assert.equal(sin.mesInicio, null);
  assert.equal(sin.tiempoEjecucion, null);
  assert.equal(sin.revisar, false);
});

prueba('043/RF-21: un rubro, un indirecto o un total sin su celda se descartan', () => {
  const r = leido043({
    ...LECTURA_043,
    rubros: [{ ...LECTURA_043.rubros[0], valor: 5 }],
    lineaDeRubros: { ...LECTURA_043.lineaDeRubros, meses: [{ mes: '2026-10', valor: 7 }] },
    indirectos: { ...LECTURA_043.indirectos, meses: [{ mes: '2026-02', valor: 221042440 }, { mes: '2026-03', valor: 1 }] },
    totalesDelExcel: { ...LECTURA_043.totalesDelExcel, costo: { hoja: 1, fila: 4, valor: 3 }, indirectos: { hoja: 0, fila: 0, valor: 0 } },
  });
  assert.deepEqual(r.estructura.rubros, []);
  assert.deepEqual(r.estructura.lineaDeRubros?.valores, []);
  assert.deepEqual(r.estructura.indirectos.map((i) => i.mes), ['2026-02']);
  assert.equal(r.totalesDelExcel.contractual, 39558848104);
  assert.equal(r.totalesDelExcel.costo, null);
  assert.equal(r.totalesDelExcel.indirectos, null);
  assert.ok(r.rechazados.length >= 3);
});

prueba('043/RF-109: sin línea de rubros, cada rubro conserva su programación', () => {
  const r = leido043({ ...LECTURA_043, lineaDeRubros: { hoja: 0, fila: 0, nombre: '', meses: [] } });
  assert.equal(r.estructura.lineaDeRubros, null);
});

prueba('043/RF-9: una lectura sin ítems no crea borrador', () => {
  const vacia = estructuraDeLaLectura({ ...LECTURA_043, items: [] }, HOJAS_LEIDAS_043);
  assert.equal(vacia.ok, false);
  const sinNombre = estructuraDeLaLectura(conItem043({ renglon: '', item: '', descripcion: '' }), HOJAS_LEIDAS_043);
  assert.equal(sinNombre.ok, false);
  assert.ok(!sinNombre.ok);
  assert.match(sinNombre.error, /ítem/);
});

prueba('043: un ítem sin ítem de pago se conserva si dice qué es (el 38.6 del V5)', () => {
  const [item] = leido043(conItem043({ renglon: '38.6', item: '', descripcion: 'Disposición de material' })).estructura.items;
  assert.equal(item.item, '');
  assert.equal(item.renglon, null);
  assert.equal(item.descripcion, 'Disposición de material');
});

prueba('043/RF-24: una observación solo sobrevive si habla de un hallazgo listado', () => {
  const hallazgos = [{ tipo: 'sin_costo' as const, renglon: 5, item: '5.1.7', capitulo: ALCANTARILLAS_043, detalle: '' }];
  const validas = observacionesValidas(
    [
      { tipo: 'sin_costo', item: '5.1.7', capitulo: ALCANTARILLAS_043, texto: 'Revisar el costo.' },
      { tipo: 'costo_mayor', item: '5.1.7', capitulo: ALCANTARILLAS_043, texto: 'Inventada.' },
      { tipo: 'sin_costo', item: '9.9', capitulo: ALCANTARILLAS_043, texto: 'De otro ítem.' },
    ],
    hallazgos,
  );
  assert.deepEqual(validas.map((o) => o.texto), ['Revisar el costo.']);
});

prueba('043/RF-35, RF-99, RF-121: aprobar exige la versión y los meses bien escritos', () => {
  assert.equal(aprobacionDePlanificacion.safeParse({ confirmarHallazgos: true }).success, false);
  assert.deepEqual(aprobacionDePlanificacion.parse({ version: 3 }), { version: 3, confirmarHallazgos: false });
  assert.equal(aprobacionDePlanificacion.safeParse({ version: 3, mesesCumplidos: ['octubre'] }).success, false);
  assert.deepEqual(aprobacionDePlanificacion.parse({ version: 3, confirmarHallazgos: true, mesesCumplidos: ['2026-10'] }).mesesCumplidos, ['2026-10']);
});

prueba('043/RF-47: anular exige un motivo escrito', () => {
  assert.equal(anulacionDePlanificacion.safeParse({ motivo: '   ' }).success, false);
  assert.equal(anulacionDePlanificacion.safeParse({}).success, false);
  assert.equal(anulacionDePlanificacion.parse({ motivo: '  Otro plan ' }).motivo, 'Otro plan');
});

prueba('043/RF-6: las hojas confirmadas llegan con un uso conocido', () => {
  const bien = seleccionDeHojasPedida.parse({ hojas: [{ nombre: 'Línea base', usos: ['programacion'] }] });
  assert.equal(bien.hojas[0].nombre, 'Línea base');
  assert.equal(seleccionDeHojasPedida.safeParse({ hojas: [{ nombre: 'X', usos: ['otra_cosa'] }] }).success, false);
  assert.equal(seleccionDeHojasPedida.safeParse({ hojas: [] }).success, false);
});

prueba('043/RF-58, RF-59: el informe se pide por semana o por mes, con una fecha válida', () => {
  assert.equal(pedidoDeInformeDeCumplimiento.safeParse({ tipo: 'semana', fecha: '2026-11-23' }).success, true);
  assert.equal(pedidoDeInformeDeCumplimiento.safeParse({ tipo: 'dia', fecha: '2026-11-23' }).success, false);
  assert.equal(pedidoDeInformeDeCumplimiento.safeParse({ tipo: 'mes', fecha: 'ayer' }).success, false);
});

console.log('\nPlan de trabajo semanal (spec 044), cruce con la planificación\n');

/** Dos ítems de la planificación: el 4.1.8 en Alcantarillas (renglón 5) y en Cuneta (renglón 9). */
const ITEMS_044 = [
  { ...ITEM_SANO_043, renglon: 5 },
  {
    ...ITEM_SANO_043,
    renglon: 9,
    capitulo: CUNETA_043,
    delPresupuesto: { ...ITEM_SANO_043.delPresupuesto, capitulo: CUNETA_043, capituloId: 'c-b2' },
  },
];
const BASE_044 = { frenteDeTrabajo: '1. Transporte', descripcion: 'Excavación', unidad: 'm3', metaSemana: 36, cuadrilla: '3 oficiales', equipo: 'Minicargador' };

prueba('044/RF-6, RF-88: una actividad cruza con su ítem por frente del presupuesto, capítulo e ítem de pago', () => {
  const porNombres = cruzarActividad({ ...BASE_044, grupo: 'Circuito', capitulo: CUNETA_043, item: '4.1.8' }, ITEMS_044);
  assert.equal(porNombres.tipo, 'item');
  assert.equal(porNombres.llave, llaveDeItemPlanificado(ITEMS_044[1]));
  assert.equal(porNombres.item, '4.1.8');
  assert.equal(porNombres.metaSemana, 36);
  assert.equal(porNombres.cuadrilla, '3 oficiales');
  // Por la llave directa, como la entrega la IA (T10).
  const porLlave = cruzarActividad({ ...BASE_044, llave: llaveDeItemPlanificado(ITEMS_044[0]) }, ITEMS_044);
  assert.equal(porLlave.tipo, 'item');
  assert.equal(porLlave.renglon, 5);
});

prueba('044/RF-89: con solo el renglón, se resuelve por el renglón de la planificación', () => {
  const porRenglon = cruzarActividad({ ...BASE_044, renglon: 9 }, ITEMS_044);
  assert.equal(porRenglon.tipo, 'item');
  assert.equal(porRenglon.llave, llaveDeItemPlanificado(ITEMS_044[1]));
  // «38.6» no es un renglón de la planificación.
  assert.equal(cruzarActividad({ ...BASE_044, item: '38.6' }, ITEMS_044).tipo, 'fuera');
});

prueba('044/RF-31, RF-32, RF-41: lo que no cruza queda «fuera», con todo lo que traía', () => {
  const inventada = cruzarActividad({ ...BASE_044, llave: 'circuito|capitulo inventado|99' }, ITEMS_044);
  assert.equal(inventada.tipo, 'fuera');
  assert.equal(inventada.llave, null);
  assert.equal(inventada.metaSemana, 36);
  assert.equal(inventada.descripcion, 'Excavación');
  // El mismo ítem de pago en un capítulo que no es el suyo tampoco cruza.
  assert.equal(cruzarActividad({ ...BASE_044, grupo: 'Circuito', capitulo: 'OTRO CAPÍTULO', item: '4.1.8' }, ITEMS_044).tipo, 'fuera');
});

prueba('044/RF-97: «Componentes» entra como rubro, con su valor y sin meta en cantidades', () => {
  const rubro = cruzarActividad({ ...BASE_044, esRubro: true, descripcion: 'Componentes (PMA, PMT)', valorRubro: 7300000, metaSemana: 99 }, ITEMS_044);
  assert.equal(rubro.tipo, 'rubro');
  assert.equal(rubro.llave, null);
  assert.equal(rubro.metaSemana, null);
  assert.equal(rubro.valorRubro, 7300000);
  assert.deepEqual(rubro.cantidades, {});
});

prueba('044/RF-91: el frente de trabajo es un rótulo libre y no se confunde con el frente del presupuesto', () => {
  // Un rótulo igual al nombre del grupo no hace cruzar nada por sí solo.
  assert.equal(cruzarActividad({ ...BASE_044, frenteDeTrabajo: 'Circuito', item: '4.1.8' }, ITEMS_044).tipo, 'fuera');
  const cruzada = cruzarActividad({ ...BASE_044, grupo: 'Circuito', capitulo: ALCANTARILLAS_043, item: '4.1.8' }, ITEMS_044);
  assert.equal(cruzada.frenteDeTrabajo, '1. Transporte');
});

console.log('\nPlan de trabajo semanal (spec 044), valores y avisos\n');

/** El 4.1.8 de Alcantarillas a $20 000 de costo y el de Cuneta sin costo. */
const ITEMS_CON_COSTO_044 = [ITEMS_044[0], { ...ITEMS_044[1], precioCosto: null }];
const ACTIVIDADES_044 = [
  cruzarActividad({ ...BASE_044, llave: llaveDeItemPlanificado(ITEMS_044[0]), metaSemana: 36 }, ITEMS_044),
  cruzarActividad({ ...BASE_044, llave: llaveDeItemPlanificado(ITEMS_044[1]), metaSemana: 10 }, ITEMS_044),
  cruzarActividad({ ...BASE_044, item: '38.6', metaSemana: 1421 }, ITEMS_044),
  cruzarActividad({ ...BASE_044, esRubro: true, descripcion: 'Componentes', valorRubro: 7300000 }, ITEMS_044),
];

prueba('044/RF-26 a RF-28, RF-94: el valor es la meta por el costo; sin costo, sin valor y con aviso; el rubro suma el suyo', () => {
  const valores = valoresDelPlan(ACTIVIDADES_044, preciosDeCosto(ITEMS_CON_COSTO_044));
  assert.deepEqual(valores.porActividad, [720000, null, null, 7300000]);
  // «Fuera de la planificación» no tiene precio con qué valer: no suma y no es un ítem sin costo.
  assert.equal(valores.total, 8020000);
  assert.deepEqual(valores.sinCosto, [1]);
  // Un costo de relleno, por debajo de un peso, es «sin costo», como en la 043 (RF-32).
  const relleno = valoresDelPlan([ACTIVIDADES_044[0]], preciosDeCosto([{ ...ITEMS_044[0], precioCosto: 0.000000001 }]));
  assert.deepEqual(relleno.sinCosto, [0]);
  assert.equal(relleno.total, 0);
});

prueba('044/RF-33, RF-93: la meta sobre lo pendiente es un aviso; igual o por debajo, no', () => {
  const llave = llaveDeItemPlanificado(ITEMS_044[0]);
  const avisos = avisosDelPlan({ actividades: ACTIVIDADES_044, pendientes: new Map([[llave, 30]]), sinCosto: [], diferenciasConElExcel: [] });
  assert.deepEqual(avisos.map((a) => a.tipo), ['meta_sobre_pendiente']);
  assert.equal(avisos[0].actividad, 0);
  assert.match(avisos[0].detalle, /36/);
  assert.match(avisos[0].detalle, /30/);
  assert.deepEqual(avisosDelPlan({ actividades: ACTIVIDADES_044, pendientes: new Map([[llave, 36]]), sinCosto: [], diferenciasConElExcel: [] }), []);
  // Sin pendiente conocido no se avisa nada.
  assert.deepEqual(avisosDelPlan({ actividades: ACTIVIDADES_044, pendientes: new Map(), sinCosto: [], diferenciasConElExcel: [] }), []);
});

prueba('044/RF-28, RF-48, RF-100: ítems sin costo, diferencias con el Excel y planificación más nueva, como avisos', () => {
  const avisos = avisosDelPlan({
    actividades: ACTIVIDADES_044,
    pendientes: new Map(),
    sinCosto: [1],
    diferenciasConElExcel: [{ actividad: 0, que: 'meta_diaria', delExcel: 853.5, calculado: 682.8 }],
    planificacion: { usada: 'v1', vigente: 'v2', numeroVigente: 2 },
  });
  assert.deepEqual(avisos.map((a) => a.tipo), ['sin_costo', 'diferencia_excel', 'planificacion_mas_nueva']);
  assert.match(avisos[1].detalle, /853,5/);
  assert.match(avisos[1].detalle, /682,8/);
  assert.match(avisos[2].detalle, /v2/);
  // La misma planificación no avisa.
  const iguales = avisosDelPlan({ actividades: ACTIVIDADES_044, pendientes: new Map(), sinCosto: [], diferenciasConElExcel: [], planificacion: { usada: 'v1', vigente: 'v1', numeroVigente: 1 } });
  assert.deepEqual(iguales, []);
});

console.log('\nPlan de trabajo semanal (spec 044), quién aprueba y qué plan rige\n');

prueba('044/RF-56 a RF-59, RF-65: quién aprueba y anula depende de quién creó el plan', () => {
  const pueden = (autor: Rol) => ROLES.filter((rol) => puedeAprobarPlan(rol, autor));
  assert.deepEqual(pueden('director_proyectos'), ['admin', 'director_proyectos']);
  assert.deepEqual(pueden('admin'), ['admin', 'director_proyectos']);
  assert.deepEqual(pueden('director_obra'), ['admin', 'director_proyectos', 'director_obra']);
  assert.deepEqual(pueden('residente'), ['admin', 'director_proyectos', 'director_obra']);
  // El Residente nunca, ni lo que él mismo armó.
  for (const autor of ROLES) assert.equal(puedeAprobarPlan('residente', autor), false, autor);
  assert.match(quienApruebaElPlan('director_proyectos'), /el Director de Proyectos o la Gerencia/);
  assert.match(quienApruebaElPlan('residente'), /el Director de Obra, el Director de Proyectos o la Gerencia/);
});

prueba('044/RF-62: rige desde el día en que se aprueba, o desde el lunes si su semana no ha empezado', () => {
  assert.equal(rigeDesdeAlAprobar('2026-11-16', '2026-11-11'), '2026-11-16');
  assert.equal(rigeDesdeAlAprobar('2026-11-09', '2026-11-11'), '2026-11-11');
  assert.equal(rigeDesdeAlAprobar('2026-11-09', '2026-11-09'), '2026-11-09');
});

prueba('044/RF-67: al anular deja de regir ese día: rige hasta el anterior', () => {
  assert.equal(rigeHastaAlAnular('2026-11-13'), '2026-11-12');
});

prueba('044/RF-62, RF-67, RF-68: cada día lo mide el plan que regía ese día, y solo dentro de su semana', () => {
  const planes = [
    // Aprobado el miércoles 11 y anulado el viernes 13.
    { id: 'a', semana: '2026-11-09', rigeDesde: '2026-11-11', rigeHasta: '2026-11-12' },
    // El nuevo, aprobado el viernes 13.
    { id: 'b', semana: '2026-11-09', rigeDesde: '2026-11-13', rigeHasta: null },
    // Uno de la semana siguiente, aprobado antes de que empiece.
    { id: 'c', semana: '2026-11-16', rigeDesde: '2026-11-16', rigeHasta: null },
  ];
  const que = (dia: string) => planQueRige(dia, planes)?.id ?? null;
  assert.equal(que('2026-11-10'), null);
  assert.equal(que('2026-11-11'), 'a');
  assert.equal(que('2026-11-12'), 'a');
  assert.equal(que('2026-11-13'), 'b');
  assert.equal(que('2026-11-15'), 'b');
  assert.equal(que('2026-11-16'), 'c');
  assert.equal(que('2026-11-23'), null);
  // Aprobado y anulado el mismo día: no rige ninguno.
  assert.equal(planQueRige('2026-11-11', [{ id: 'd', semana: '2026-11-09', rigeDesde: '2026-11-11', rigeHasta: '2026-11-10' }]), null);
});

console.log('\nPlan de trabajo semanal (spec 044), la plata y el Residente\n');

prueba('044/RF-103: un texto contiene pesos si tiene «$» o la palabra «pesos»', () => {
  assert.equal(contienePesos('Cada volqueta parada resta ≈ $3 millones'), true);
  assert.equal(contienePesos('Un sobrecosto de 20 PESOS por m³'), true);
  assert.equal(contienePesos('20 m³ de subbase'), false);
  // «Peso bulto de cemento» es un peso en kilos, no plata.
  assert.equal(contienePesos('Peso bulto de cemento: 50 kg'), false);
  assert.equal(contienePesos(''), false);
});

const ESTRUCTURA_044: EstructuraDelPlan = {
  dias: ['2026-11-17', '2026-11-18', '2026-11-19'],
  actividades: [ACTIVIDADES_044[0], ACTIVIDADES_044[3]],
  personal: [{ cargo: 'Oficiales', porFrente: { '3. Cunetas': 3 } }],
  maquinaria: [{ equipo: 'Volqueta 15 m³', cantidad: 9, propia: false, frenteDeTrabajo: '1. Transporte', vehiculoId: null, referencia: 'A contratar a $450.000 el día' }],
  materiales: [{ material: 'Cemento', cantidadSemana: 19404, unidad: 'kg', baseDeCalculo: 'Concreto × 441 kg/m³' }],
  volquetas: { conceptos: [{ concepto: 'Subbase a calzada', unidad: 'm³', cantidadSemana: 1772, viajesSemana: 118 }], requeridas: 17, propias: 8, externas: 9 },
  supuestos: 'Días de trabajo: 3. Peso bulto de cemento: 50 kg.',
  riesgos: [
    { riesgo: 'Falla de una volqueta', efecto: 'Cada volqueta parada resta ≈ $3 millones', mitigacion: 'Volqueta de reserva' },
    { riesgo: 'Lluvia', efecto: 'Detiene la estabilización', mitigacion: 'Priorizar transporte' },
  ],
  requerimientos: 'Aprobar 20 millones de pesos para alquiler.',
};

const VISTA_044: VistaDelPlan = {
  estructura: ESTRUCTURA_044,
  valores: { porActividad: [720000, 7300000], total: 8020000, sinCosto: [] },
  avisos: [
    { tipo: 'sin_costo', actividad: 0, detalle: 'Sin precio de costo; el total no lo incluye.' },
    { tipo: 'meta_sobre_pendiente', actividad: 0, detalle: 'La meta supera lo pendiente.' },
  ],
};

prueba('044/RF-29, RF-30, RF-102: al Residente le llega el plan sin plata y sin los textos que la tienen', () => {
  const reducido = planSinPlata(VISTA_044);
  const claves: string[] = [];
  const recorrer = (nodo: unknown) => {
    if (Array.isArray(nodo)) nodo.forEach(recorrer);
    else if (nodo && typeof nodo === 'object') {
      for (const [clave, valor] of Object.entries(nodo)) {
        claves.push(clave);
        recorrer(valor);
      }
    }
  };
  recorrer(reducido);
  assert.deepEqual(claves.filter((c) => /valor|precio|costo/i.test(c)), []);
  const texto = JSON.stringify(reducido);
  assert.ok(!texto.includes('7300000') && !texto.includes('720000') && !texto.includes('$'));
  // Los textos con pesos se reemplazan; los demás quedan.
  assert.equal(reducido.estructura.riesgos[0].efecto, 'Contiene valores en pesos');
  assert.equal(reducido.estructura.riesgos[1].efecto, 'Detiene la estabilización');
  assert.equal(reducido.estructura.requerimientos, 'Contiene valores en pesos');
  assert.equal(reducido.estructura.maquinaria[0].referencia, 'Contiene valores en pesos');
  assert.equal(reducido.estructura.supuestos, 'Días de trabajo: 3. Peso bulto de cemento: 50 kg.');
  // El aviso de costo tampoco le llega; los de cantidades, sí.
  assert.deepEqual(reducido.avisos.map((a) => a.tipo), ['meta_sobre_pendiente']);
  // Las cantidades siguen.
  assert.equal(reducido.estructura.actividades[0].metaSemana, 36);
  assert.equal(reducido.estructura.materiales[0].cantidadSemana, 19404);
});

/** Lo que el Residente manda al guardar: lo que recibió, con el valor de los rubros en blanco. */
const loQueMandaElResidente044 = (): EstructuraDelPlan => {
  const { estructura } = planSinPlata(VISTA_044);
  return { ...estructura, actividades: estructura.actividades.map((a) => ({ ...a, valorRubro: null })) };
};

prueba('044/RF-29, RF-102: cuando guarda el Residente, se conserva lo que él no ve', () => {
  const guardado = conservarLoQueNoVeElResidente(ESTRUCTURA_044, loQueMandaElResidente044());
  // Sin tocar nada, queda exactamente lo que había: el valor del rubro y los textos con pesos.
  assert.deepEqual(guardado, ESTRUCTURA_044);

  // Lo que sí cambia, cambia; lo oculto sigue.
  const ajustado = loQueMandaElResidente044();
  ajustado.actividades[0] = { ...ajustado.actividades[0], cuadrilla: '3 oficiales' };
  ajustado.riesgos[1] = { ...ajustado.riesgos[1], mitigacion: 'Recuperar el sábado' };
  const conAjustes = conservarLoQueNoVeElResidente(ESTRUCTURA_044, ajustado);
  assert.equal(conAjustes.actividades[0].cuadrilla, '3 oficiales');
  assert.equal(conAjustes.actividades[1].valorRubro, 7300000);
  assert.equal(conAjustes.riesgos[0].efecto, 'Cada volqueta parada resta ≈ $3 millones');
  assert.equal(conAjustes.riesgos[1].mitigacion, 'Recuperar el sábado');
  assert.equal(conAjustes.requerimientos, 'Aprobar 20 millones de pesos para alquiler.');
  assert.equal(conAjustes.maquinaria[0].referencia, 'A contratar a $450.000 el día');
});

prueba('044/RF-29, RF-102: el Residente no pone valor a un rubro ni se lleva el texto oculto de otro renglón', () => {
  // Un valor que él mande no cuenta, y un rubro nuevo queda sin valor.
  const conRubroNuevo = loQueMandaElResidente044();
  conRubroNuevo.actividades[1] = { ...conRubroNuevo.actividades[1], valorRubro: 999 };
  conRubroNuevo.actividades.push({ ...conRubroNuevo.actividades[1], descripcion: 'Garantías', valorRubro: 5 });
  const r = conservarLoQueNoVeElResidente(ESTRUCTURA_044, conRubroNuevo);
  assert.equal(r.actividades[1].valorRubro, 7300000);
  assert.equal(r.actividades[2].valorRubro, null);

  // Dos riesgos con pesos; él borra el primero: el que queda recupera su propio texto, no el del borrado.
  const dosOcultos: EstructuraDelPlan = {
    ...ESTRUCTURA_044,
    riesgos: [...ESTRUCTURA_044.riesgos, { riesgo: 'Paro de la cantera', efecto: 'Cuesta $9 millones por día', mitigacion: 'Acopio' }],
  };
  const sinElPrimero = planSinPlata({ ...VISTA_044, estructura: dosOcultos }).estructura;
  const mandado: EstructuraDelPlan = {
    ...sinElPrimero,
    actividades: sinElPrimero.actividades.map((a) => ({ ...a, valorRubro: null })),
    riesgos: sinElPrimero.riesgos.filter((x) => x.riesgo !== 'Falla de una volqueta'),
  };
  const guardado = conservarLoQueNoVeElResidente(dosOcultos, mandado);
  assert.deepEqual(guardado.riesgos.map((x) => x.efecto), ['Detiene la estabilización', 'Cuesta $9 millones por día']);
});

console.log('\nPlan de trabajo semanal (spec 044), el plan como meta del cumplimiento\n');

/** Un plan de verdad: actividades cruzadas, días marcados y su reparto. */
const planAprobado044 = (actividades: ReturnType<typeof cruzarActividad>[], dias: string[], rigeDesde = '2026-11-23', rigeHasta: string | null = null) => ({
  id: 'p',
  semana: '2026-11-23',
  rigeDesde,
  rigeHasta,
  metasPorDia: metasPorDiaDelPlan({ dias, actividades }),
});
const LUNES_A_SABADO_044 = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28'];
const conMeta044 = (meta: number, dias = LUNES_A_SABADO_044) =>
  cruzarActividad({ ...BASE_044, llave: LLAVE_043, metaSemana: meta, cantidades: repartir(meta, dias) }, [ITEM_SANO_043]);

prueba('044/RF-70, RF-73: con plan, la meta de la semana sale del plan y no es estimada', () => {
  const v = [unaVersion043({ '2026-11': 230 })];
  const meta = metaDelPeriodo(LLAVE_043, semana043('2026-11-23', '2026-11-29'), v, [planAprobado044([conMeta044(90)], LUNES_A_SABADO_044)]);
  assert.deepEqual(meta, { meta: 90, estimada: false, diasDelPlan: 6 });
});

prueba('044/RF-71: un ítem de la planificación que no está en el plan no tiene meta esa semana', () => {
  const v = [unaVersion043({ '2026-11': 230 })];
  const otro = cruzarActividad({ ...BASE_044, item: '38.6', metaSemana: 50, cantidades: repartir(50, LUNES_A_SABADO_044) }, [ITEM_SANO_043]);
  assert.deepEqual(metaDelPeriodo(LLAVE_043, semana043('2026-11-23', '2026-11-29'), v, [planAprobado044([otro], LUNES_A_SABADO_044)]), { meta: null, estimada: false });
});

prueba('044/RF-90: dos actividades del mismo ítem se suman en la meta', () => {
  const v = [unaVersion043({ '2026-11': 230 })];
  const dos = [conMeta044(60), conMeta044(30)];
  assert.equal(metaDelPeriodo(LLAVE_043, semana043('2026-11-23', '2026-11-29'), v, [planAprobado044(dos, LUNES_A_SABADO_044)]).meta, 90);
});

prueba('044/RF-72, RF-98: las actividades «fuera» y los rubros no dan meta a nadie', () => {
  const fuera = cruzarActividad({ ...BASE_044, item: '38.6', metaSemana: 50, cantidades: repartir(50, LUNES_A_SABADO_044) }, [ITEM_SANO_043]);
  const rubro = cruzarActividad({ ...BASE_044, esRubro: true, valorRubro: 7300000 }, [ITEM_SANO_043]);
  const metas = metasPorDiaDelPlan({ dias: LUNES_A_SABADO_044, actividades: [fuera, rubro] });
  assert.equal([...metas.values()].reduce((n, m) => n + m.size, 0), 0);
});

prueba('044/RF-76, RF-95: un plan aprobado el miércoles deja lunes y martes estimados: «Parcialmente estimada»', () => {
  const v = [unaVersion043({ '2026-11': 230 })];
  // 230 en 23 días de reparto: 10 el lunes y 10 el martes; del miércoles al sábado, 15 por día del plan.
  const meta = metaDelPeriodo(LLAVE_043, semana043('2026-11-23', '2026-11-29'), v, [planAprobado044([conMeta044(90)], LUNES_A_SABADO_044, '2026-11-25')]);
  assert.deepEqual(meta, { meta: 80, estimada: true, diasDelPlan: 4 });
});

prueba('044/RF-77, RF-107: sin planificación que rija, no hay meta aunque haya plan', () => {
  // La planificación se anuló el miércoles 25: rigió hasta el martes 24.
  const v = [unaVersion043({ '2026-11': 230 }, '2026-11-24')];
  const meta = metaDelPeriodo(LLAVE_043, semana043('2026-11-23', '2026-11-29'), v, [planAprobado044([conMeta044(90)], LUNES_A_SABADO_044)]);
  assert.deepEqual(meta, { meta: 30, estimada: false, diasDelPlan: 2 });
});

prueba('044/RF-74: el mes sigue con la planificación aunque haya planes', () => {
  const v = [unaVersion043({ '2026-11': 230 })];
  assert.deepEqual(metaDelPeriodo(LLAVE_043, mes043('2026-11-01', '2026-11-30'), v, [planAprobado044([conMeta044(90)], LUNES_A_SABADO_044)]), { meta: 230, estimada: false });
});

prueba('044/RF-95: el informe lleva los días del plan de cada fila, también al Residente', () => {
  const items = [ITEM_CON_PRECIOS_043];
  const informe = informeDeCumplimiento({
    periodo: semana043('2026-11-23', '2026-11-29'),
    hoy: '2026-11-30',
    versiones: [{ ...version043(items), items }],
    partesDelPeriodo: [],
    partesAcumuladas: [],
    mesesCumplidos: [],
    planesSemanales: [planAprobado044([conMeta044(90)], LUNES_A_SABADO_044, '2026-11-25')],
  });
  assert.equal(informe.filas[0].estimada, true);
  assert.equal(informe.filas[0].diasDelPlan, 4);
  assert.equal(sinPlata(informe).filas[0].diasDelPlan, 4);
});

console.log('\nPlan de trabajo semanal (spec 044), el valor programado con plan\n');

/** El mismo ítem a $40 de costo hasta el miércoles 25 y a $60 desde el jueves 26. */
const DOS_PRECIOS_044 = [
  versionMedible({ id: 'v1', numeroVersion: 1, rigeDesde: '2026-01-01', rigeHasta: '2026-11-25' }, [ITEM_CON_PRECIOS_043], EXTRAS_043),
  versionMedible({ id: 'v2', numeroVersion: 2, rigeDesde: '2026-11-26', rigeHasta: null }, [{ ...ITEM_CON_PRECIOS_043, precioCosto: 60 }], EXTRAS_043),
];

prueba('044/RF-75: cada día con plan vale lo del plan al precio de la planificación que rige ese día', () => {
  const r = valoresDelPeriodo({
    periodo: semana043('2026-11-23', '2026-11-29'),
    items: [ITEM_CON_PRECIOS_043],
    versiones: DOS_PRECIOS_044,
    partesDelPeriodo: [],
    planesSemanales: [planAprobado044([conMeta044(90)], LUNES_A_SABADO_044)],
  });
  // 15 por día: lunes a miércoles a $40 (1 800) y jueves a sábado a $60 (2 700).
  assert.equal(r.totales.programado, 4500);
  assert.equal(r.filas[0].programado, 4500);
});

prueba('044/RF-75, RF-76: en una semana parcial, los días estimados y los del plan valen cada uno a su precio', () => {
  const r = valoresDelPeriodo({
    periodo: semana043('2026-11-23', '2026-11-29'),
    items: [ITEM_CON_PRECIOS_043],
    versiones: [version043([ITEM_CON_PRECIOS_043])],
    partesDelPeriodo: [],
    planesSemanales: [planAprobado044([conMeta044(90)], LUNES_A_SABADO_044, '2026-11-25')],
  });
  // Lunes y martes estimados: 10 + 10 a $40 (800). Miércoles a sábado del plan: 4 × 15 a $40 (2 400).
  assert.equal(r.totales.programado, 3200);
});

prueba('044/RF-75: sin planes, el valor programado de la semana es el de la 043', () => {
  const sinPlanes = valoresDelPeriodo({ periodo: semana043('2026-11-23', '2026-11-29'), items: [ITEM_CON_PRECIOS_043], versiones: DOS_PRECIOS_044, partesDelPeriodo: [] });
  const vacio = valoresDelPeriodo({ periodo: semana043('2026-11-23', '2026-11-29'), items: [ITEM_CON_PRECIOS_043], versiones: DOS_PRECIOS_044, partesDelPeriodo: [], planesSemanales: [] });
  assert.deepEqual(sinPlanes, vacio);
  // 10 por día estimado: 3 días a $40 (1 200) y 3 a $60 (1 800).
  assert.equal(sinPlanes.totales.programado, 3000);
});

console.log('\nPlan de trabajo semanal (spec 044), lo que recibe la IA para proponer\n');

const PROPUESTA_044: PedidoDePropuesta = {
  semana: '2026-11-16',
  dias: ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'],
  items: [
    {
      llave: 'circuito|construccion de cuneta|4.1.8',
      item: '4.1.8',
      grupo: 'Circuito',
      capitulo: 'CONSTRUCCIÓN DE CUNETA',
      descripcion: 'Excavación para estructuras',
      unidad: 'm3',
      cantidadesDelMes: { '2026-11': 230 },
      metaEstimada: 50,
      pendiente: 1800,
    },
  ],
  semanaAnterior: [{ llave: 'circuito|construccion de cuneta|4.1.8', meta: 60, ejecutado: 42 }],
  vehiculos: [{ id: 'v-1', placa: 'LLQ-379', tipo: 'Volqueta' }],
  existencias: [{ material: 'Cemento gris', unidad: 'bulto', saldo: 120 }],
};

prueba('044/RF-35, RF-36, RF-37: la IA recibe lo programado del mes, lo pendiente y la semana anterior, cada ítem con su llave', () => {
  const texto = textoParaProponer(PROPUESTA_044);
  const linea = texto.split('\n').find((l) => l.includes('circuito|construccion de cuneta|4.1.8') && l.includes('Excavación'));
  assert.ok(linea, 'el ítem va con su llave');
  assert.match(linea, /2026-11: 230/);
  assert.match(linea, /semana estimada: 50/);
  assert.match(linea, /pendiente: 1800/);
  assert.match(texto, /Semana anterior/);
  assert.match(texto, /4\.1\.8.*meta 60.*ejecutado 42/);
  assert.match(texto, /2026-11-16/);
  // Los días que salen marcados (lunes festivo 16 fuera), para que la IA no reparta en otros.
  assert.match(texto, /2026-11-17, 2026-11-18, 2026-11-19, 2026-11-20, 2026-11-21/);
});

prueba('044/RF-38, RF-39: también los vehículos de la obra y las existencias del almacén', () => {
  const texto = textoParaProponer(PROPUESTA_044);
  assert.match(texto, /LLQ-379/);
  assert.match(texto, /v-1/);
  assert.match(texto, /Cemento gris.*120.*bulto/);
});

prueba('044/RF-105: si la obra no lleva almacén, no se mandan existencias', () => {
  const texto = textoParaProponer({ ...PROPUESTA_044, existencias: null });
  assert.ok(!texto.includes('Cemento gris'));
  assert.match(texto, /no lleva almacén/);
});

prueba('044/RF-104: las instrucciones piden usar solo esas llaves y no poner pesos en los textos', () => {
  assert.match(INSTRUCCIONES_PARA_PROPONER, /solo las llaves/i);
  assert.match(INSTRUCCIONES_PARA_PROPONER, /pesos/);
  assert.match(INSTRUCCIONES_PARA_PROPONER, /lunes a sábado/);
});

console.log('\nPlan de trabajo semanal (spec 044), lo que se acepta de la IA y del Excel\n');

/** La fila 6 del Excel de referencia: ítem 16, meta 3 414, meta diaria 853,5 y total 4 267,5. */
const HOJAS_044 = [
  {
    nombre: 'Plan semanal',
    visible: true,
    filas: [
      [null, 'Frente', 'Ítem', 'Actividad', 'Und.', 'Meta semana', 'Meta diaria', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Total programado'],
      [null, '1. Transporte', 16, 'Transporte de afirmado', 'm³-km', 3414, 853.5, 853.5, 853.5, 853.5, 853.5, 853.5, 4267.5, 5000000, 'Conductores de volqueta', 'Volquetas 15 m³'],
      [null, 'Componentes', '–', 'Componentes (PMA, PMT)', 'valor', null, null, null, null, null, null, null, null, 7300000, '2 controladoras', 'Señalización'],
    ],
  },
];
const ITEMS_DEL_EXCEL_044 = [{ ...ITEM_SANO_043, renglon: 16 }];
const SEMANA_DEL_EXCEL_044 = '2026-11-02';
// El lunes 2 es festivo, pero el Excel le pone cantidad: se trabaja (RF-20, RF-46).
const DIAS_DEL_EXCEL_044 = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];

const actividadLeida044 = (cambio: Partial<ActividadLeidaPorLaIa> = {}): ActividadLeidaPorLaIa => ({
  hoja: 1,
  fila: 2,
  llave: '',
  renglon: '16',
  item: '16',
  frenteDeTrabajo: '1. Transporte',
  descripcion: 'Transporte de afirmado',
  unidad: 'm³-km',
  esRubro: false,
  metaSemana: 3414,
  valorRubro: 0,
  diasConCantidad: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'],
  metaDiariaDelExcel: 853.5,
  totalDelExcel: 4267.5,
  cuadrilla: 'Conductores de volqueta',
  equipo: 'Volquetas 15 m³',
  ...cambio,
});
const leidoDelExcel044 = (actividades: ActividadLeidaPorLaIa[]): PlanLeidoPorLaIa => ({
  actividades,
  personal: [{ cargo: 'Conductores de volqueta', porFrente: [{ frente: '1. Transporte', cantidad: 8 }] }],
  maquinaria: [{ equipo: 'Volqueta 15 m³', cantidad: 8, propia: true, frenteDeTrabajo: '1. Transporte', vehiculoId: '', referencia: 'LLQ-379' }],
  materiales: [{ material: 'Subbase granular', cantidadSemana: 1808, unidad: 'm³', baseDeCalculo: 'Ítem 32 + ítem 13' }],
  volquetas: { conceptos: [{ concepto: 'Subbase a calzada', unidad: 'm³', cantidadSemana: 1772, viajesSemana: 118 }], requeridas: 17, propias: 8, externas: 9 },
  supuestos: ['Capacidad volqueta 15 m³'],
  riesgos: [{ riesgo: 'Lluvia', efecto: 'Detiene estabilización', mitigacion: 'Priorizar transporte' }],
  requerimientos: [],
});
const delExcel044 = (leido: PlanLeidoPorLaIa) =>
  planDeLaLectura(leido, { items: ITEMS_DEL_EXCEL_044, semana: SEMANA_DEL_EXCEL_044, hojas: HOJAS_044 });

prueba('044/RF-46, RF-47, RF-48: del Excel se toman la meta y los días; el reparto se rehace y la diferencia se avisa', () => {
  const r = delExcel044(leidoDelExcel044([actividadLeida044()]));
  assert.ok(r.ok);
  const [actividad] = r.estructura.actividades;
  assert.equal(actividad.tipo, 'item');
  assert.equal(actividad.metaSemana, 3414);
  assert.deepEqual(r.estructura.dias, DIAS_DEL_EXCEL_044);
  assert.deepEqual(Object.values(actividad.cantidades), [682.8, 682.8, 682.8, 682.8, 682.8]);
  assert.deepEqual(r.diferencias, [
    { actividad: 0, que: 'meta_diaria', delExcel: 853.5, calculado: 682.8 },
    { actividad: 0, que: 'total', delExcel: 4267.5, calculado: 3414 },
  ]);
  assert.deepEqual(r.rechazados, []);
  // Lo demás del libro pasa como renglones.
  assert.equal(r.estructura.materiales[0].cantidadSemana, 1808);
  assert.equal(r.estructura.volquetas.externas, 9);
  assert.equal(r.estructura.supuestos, 'Capacidad volqueta 15 m³');
});

prueba('044/RF-44, RF-45: una cifra que no está en su fila se descarta y marca su renglón', () => {
  const r = delExcel044(leidoDelExcel044([actividadLeida044({ metaSemana: 9999 })]));
  assert.ok(r.ok);
  assert.equal(r.estructura.actividades[0].metaSemana, null);
  assert.equal(r.estructura.actividades[0].revisar, true);
  assert.equal(r.rechazados.length, 1);
  assert.equal(r.rechazados[0].fila, 2);
  // Una cifra sin hoja ni fila tampoco se cree en un Excel.
  const sinCita = delExcel044(leidoDelExcel044([actividadLeida044({ hoja: 0, fila: 0 })]));
  assert.ok(sinCita.ok);
  assert.equal(sinCita.estructura.actividades[0].revisar, true);
});

prueba('044/RF-97, RF-46: el rubro del Excel entra con el valor de su celda', () => {
  const rubro = actividadLeida044({ fila: 3, renglon: '', item: '', esRubro: true, descripcion: 'Componentes (PMA, PMT)', metaSemana: 0, valorRubro: 7300000, diasConCantidad: [], metaDiariaDelExcel: 0, totalDelExcel: 0 });
  const r = delExcel044(leidoDelExcel044([actividadLeida044(), rubro]));
  assert.ok(r.ok);
  assert.equal(r.estructura.actividades[1].tipo, 'rubro');
  assert.equal(r.estructura.actividades[1].valorRubro, 7300000);
});

prueba('044/RF-40, RF-41, RF-96: en una propuesta, la llave inventada queda «fuera» y los días son los de lunes a sábado sin festivos', () => {
  const propuesta = leidoDelExcel044([
    actividadLeida044({ hoja: 0, fila: 0, llave: LLAVE_043, renglon: '', item: '', diasConCantidad: [], metaDiariaDelExcel: 0, totalDelExcel: 0, metaSemana: 90 }),
    actividadLeida044({ hoja: 0, fila: 0, llave: 'inventada|x|1', renglon: '', item: '', diasConCantidad: [], metaDiariaDelExcel: 0, totalDelExcel: 0, metaSemana: 10 }),
  ]);
  const r = planDeLaLectura(propuesta, { items: [ITEM_SANO_043], semana: '2026-11-16', hojas: null });
  assert.ok(r.ok);
  assert.deepEqual(r.estructura.actividades.map((a) => a.tipo), ['item', 'fuera']);
  // El lunes 16 es festivo: cinco días, 18 en cada uno.
  assert.deepEqual(r.estructura.dias, ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']);
  assert.deepEqual(Object.values(r.estructura.actividades[0].cantidades), [18, 18, 18, 18, 18]);
  assert.deepEqual(r.diferencias, []);
});

prueba('044/RF-49: una lectura sin actividades no da borrador, y lo explica', () => {
  const r = delExcel044(leidoDelExcel044([]));
  assert.equal(r.ok, false);
  assert.match(r.ok ? '' : r.error, /ninguna actividad/);
});

console.log('\nPlan de trabajo semanal (spec 044), lo que piden las rutas\n');

prueba('044/RF-86: un guardado sin versión se rechaza; con versión y un plan bien formado, pasa', () => {
  assert.equal(guardadoDePlanSemanal.safeParse({ estructura: ESTRUCTURA_044 }).success, false);
  const bien = guardadoDePlanSemanal.safeParse({ version: 3, estructura: ESTRUCTURA_044 });
  assert.ok(bien.success, bien.success ? '' : JSON.stringify(bien.error.issues));
  // Un día mal escrito o un tipo de actividad que no existe no llegan a la regla.
  assert.equal(guardadoDePlanSemanal.safeParse({ version: 3, estructura: { ...ESTRUCTURA_044, dias: ['17/11/2026'] } }).success, false);
  const actividadRara = { ...ESTRUCTURA_044.actividades[0], tipo: 'otro' };
  assert.equal(guardadoDePlanSemanal.safeParse({ version: 3, estructura: { ...ESTRUCTURA_044, actividades: [actividadRara] } }).success, false);
});

prueba('044/RF-64: una anulación con motivo vacío o en blanco se rechaza', () => {
  assert.equal(anulacionDePlanSemanal.safeParse({ motivo: '' }).success, false);
  assert.equal(anulacionDePlanSemanal.safeParse({ motivo: '   ' }).success, false);
  assert.ok(anulacionDePlanSemanal.safeParse({ motivo: 'Cambió el frente de trabajo' }).success);
});

prueba('044/RF-1, RF-60: crear pide la semana por fecha; aprobar pide versión y confirma avisos una vez', () => {
  assert.ok(creacionDePlanSemanal.safeParse({ obraId: 'o-1', semana: '2026-11-16' }).success);
  assert.equal(creacionDePlanSemanal.safeParse({ obraId: 'o-1', semana: 'semana 47' }).success, false);
  assert.equal(aprobacionDePlanSemanal.safeParse({}).success, false);
  const aprobar = aprobacionDePlanSemanal.parse({ version: 2 });
  assert.equal(aprobar.confirmarAvisos, false);
  const leer = pedidoDeLecturaDePlan.parse({ obraId: 'o-1', semana: '2026-11-16', sustituir: 'true' });
  assert.equal(leer.sustituir, true);
  assert.equal(pedidoDeLecturaDePlan.parse({ obraId: 'o-1', semana: '2026-11-16' }).sustituir, false);
});

console.log('\nPlan de trabajo semanal (spec 044), lo pendiente de cada ítem\n');

prueba('044/RF-33, RF-93: lo pendiente es lo planeado menos lo ejecutado en la obra, sin los partes anulados', () => {
  const llave = llaveDeItemPlanificado(ITEM_MEDIDO_043);
  const partes = [
    parte043('2026-11-03', [actividad043(30)]),
    parte043('2026-11-04', [actividad043(20)], { cerrado: false }),
    parte043('2026-11-05', [actividad043(500)], { anulado: true }),
  ];
  // 300 de medida real, 50 ejecutados: el parte abierto cuenta y el anulado no, como en el informe.
  assert.equal(pendientesPorLlave([ITEM_MEDIDO_043], partes).get(llave), 250);
  // Sin medida planeada no hay pendiente que comparar; si se ejecutó de más, no queda pendiente negativo.
  assert.equal(pendientesPorLlave([{ ...ITEM_MEDIDO_043, medidaReal: null }], partes).has(llave), false);
  assert.equal(pendientesPorLlave([{ ...ITEM_MEDIDO_043, medidaReal: 10 }], partes).get(llave), 0);
});

console.log('\nPlan de trabajo semanal (spec 044), la descarga en Excel\n');

const VISTA_PARA_DESCARGAR_044: VistaDelPlan = {
  ...VISTA_044,
  estructura: {
    ...ESTRUCTURA_044,
    actividades: [{ ...ACTIVIDADES_044[0], cantidades: repartir(36, ESTRUCTURA_044.dias) }, ACTIVIDADES_044[3]],
    maquinaria: [...ESTRUCTURA_044.maquinaria, { equipo: 'Motoniveladora', cantidad: 1, propia: true, frenteDeTrabajo: '2. Conformación', vehiculoId: 'v-1', referencia: 'Liugong' }],
  },
};
const VEHICULOS_044 = new Map([['v-1', 'MNV-001']]);

prueba('044/RF-80, RF-81: el Excel trae las secciones del de la Directora y las cifras de la pantalla', () => {
  const hojas = hojasDelPlan(VISTA_PARA_DESCARGAR_044, VEHICULOS_044);
  assert.deepEqual(
    hojas.map((h) => h.nombre),
    ['Plan semanal', 'Control de volquetas', 'Personal', 'Maquinaria', 'Materiales', 'Supuestos', 'Riesgos', 'Requerimientos'],
  );
  const plan = hojas[0];
  const de = (fila: (string | number | null)[], columna: string) => fila[plan.encabezados.indexOf(columna)];
  // Una columna por día marcado, con la cantidad de la regla: 36 entre tres días.
  assert.deepEqual(plan.encabezados.filter((e) => /^(Lun|Mar|Mié|Jue|Vie|Sáb) /.test(e)), ['Mar 17', 'Mié 18', 'Jue 19']);
  const [actividad, rubro, total] = plan.filas;
  assert.equal(de(actividad, 'Meta semana'), 36);
  assert.equal(de(actividad, 'Meta diaria'), 12);
  assert.equal(de(actividad, 'Mié 18'), 12);
  assert.equal(de(actividad, 'Total programado'), 36);
  assert.equal(de(actividad, 'Valor semana ($)'), 720000);
  assert.equal(de(actividad, 'Tipo'), 'Ítem');
  // El rubro no tiene cantidades, solo su valor.
  assert.equal(de(rubro, 'Meta semana'), null);
  assert.equal(de(rubro, 'Valor semana ($)'), 7300000);
  assert.equal(de(rubro, 'Tipo'), 'Rubro');
  assert.equal(de(total, 'Actividad'), 'TOTAL SEMANA');
  assert.equal(de(total, 'Valor semana ($)'), 8020000);
  // La máquina propia sale con la placa de su vehículo; las volquetas, con sus tres cuentas.
  const maquinaria = hojas[3];
  assert.deepEqual(maquinaria.filas[1], ['Motoniveladora', 1, 'Propia', '2. Conformación', 'MNV-001 · Liugong']);
  assert.deepEqual(hojas[1].filas.slice(-3).map((f) => [f[0], f[2]]), [['Volquetas requeridas', 17], ['Volquetas propias', 8], ['Volquetas externas', 9]]);
  assert.deepEqual(hojas[2].filas[0], ['Oficiales', 3, 3]);
  assert.equal(nombreDelPlan('OBR 001', '2026-11-16'), 'plan-semanal-OBR-001-2026-11-16.xlsx');
});

prueba('044/RF-30, RF-102: el Excel del Residente no tiene columnas de plata ni textos con pesos', () => {
  const hojas = hojasDelPlan(planSinPlata(VISTA_PARA_DESCARGAR_044), VEHICULOS_044);
  const encabezados = hojas.flatMap((h) => h.encabezados);
  assert.deepEqual(encabezados.filter((e) => /valor|costo|precio/i.test(e) || e.includes('$')), []);
  const celdas = hojas.flatMap((h) => h.filas.flat());
  assert.ok(!celdas.some((c) => c === 720000 || c === 7300000 || c === 8020000));
  // El único texto que nombra los pesos es el que reemplaza a los que los traían.
  assert.ok(!celdas.some((c) => typeof c === 'string' && c !== 'Contiene valores en pesos' && contienePesos(c)));
  // Sin plata no hay fila de total: no tendría qué totalizar.
  assert.ok(!hojas[0].filas.some((f) => f.includes('TOTAL SEMANA')));
  // Las mismas secciones y las mismas cantidades.
  assert.equal(hojas.length, 8);
  assert.equal(hojas[0].filas[0][hojas[0].encabezados.indexOf('Meta semana')], 36);
  assert.equal(hojas[6].filas[0][1], 'Contiene valores en pesos');
  assert.equal(hojas[6].filas[1][1], 'Detiene la estabilización');
  assert.deepEqual(hojas[7].filas, [['Contiene valores en pesos']]);
});

prueba('044/RF-95: la meta con días del plan y días estimados es «Parcialmente estimada», igual en pantalla, Excel y PDF', () => {
  // La etiqueta, la misma para las tres salidas.
  assert.equal(etiquetaDeEstimada({ meta: 52.5, estimada: true, diasDelPlan: 4 }), 'Parcialmente estimada (4 días del plan)');
  assert.equal(etiquetaDeEstimada({ meta: 10, estimada: true, diasDelPlan: 1 }), 'Parcialmente estimada (1 día del plan)');
  assert.equal(etiquetaDeEstimada({ meta: 37.5, estimada: true }), 'Estimada');
  // Toda del plan: ni estimada ni parcial. Sin meta, nada que marcar.
  assert.equal(etiquetaDeEstimada({ meta: 30, estimada: false, diasDelPlan: 5 }), null);
  assert.equal(etiquetaDeEstimada({ meta: 60, estimada: false }), null);
  assert.equal(etiquetaDeEstimada({ meta: null, estimada: false }), null);

  // En el Excel y el PDF, la columna «Estimada» lo dice con sus días; la estimada entera sigue en «Sí».
  const base = informe043(SEMANA_043, conTreinta043);
  const informe = {
    ...base,
    filas: [{ ...base.filas[0], estimada: true, diasDelPlan: 4 }, { ...base.filas[0], item: '9.9', estimada: true }, { ...base.filas[0], item: '9.8', estimada: false, diasDelPlan: 6 }],
  };
  const cumplimiento = hojasDelInforme(informe).find((h) => h.nombre === 'Cumplimiento');
  assert.ok(cumplimiento);
  const estimada = cumplimiento.encabezados.indexOf('Estimada');
  assert.deepEqual(
    cumplimiento.filas.map((f) => f[estimada]),
    ['Parcialmente estimada (4 días del plan)', 'Sí', 'No'],
  );
  // En el PDF la columna es angosta: va «Parcial» con sus días, y una nota debajo dice qué es.
  const bloques = bloquesDelInforme(informe);
  const [tabla] = bloques.flatMap((b) => (b.tipo === 'tabla' ? [b.tabla] : []));
  assert.deepEqual(
    tabla.filas.map((f) => f[tabla.encabezados.indexOf('Estimada')]),
    ['Parcial (4 días del plan)', 'Sí', 'No'],
  );
  const indice = bloques.findIndex((b) => b.tipo === 'tabla');
  const nota = bloques[indice + 1];
  assert.ok(nota.tipo === 'texto' && nota.markdown.includes('Parcialmente estimada'));
  // Sin filas parciales, ni la nota.
  const sinParciales = bloquesDelInforme(base);
  assert.ok(!sinParciales.some((b) => b.tipo === 'texto' && b.markdown.includes('Parcial')));
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
