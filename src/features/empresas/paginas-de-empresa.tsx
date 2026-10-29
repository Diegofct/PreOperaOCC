/**
 * Qué pantalla abre cada página de cada empresa y de cada obra (spec 033, RF-13 a
 * RF-17), y la comprobación de acceso antes de abrirla (RF-12, RF-21).
 *
 * Las pantallas son las de siempre, montadas en su ruta nueva, más las que nacen con esta
 * spec. Con los menús definitivos (cambio del 2026-10-27) los módulos nuevos de Elemental
 * y las solicitudes muestran «en construcción» hasta que llegue su spec (034 a 038), y
 * las páginas que cambiaron de nombre llevan a la nueva (RF-52).
 */

import { Redirect, useLocalSearchParams, usePathname, type Href } from 'expo-router';
import type { ComponentType } from 'react';

import PantallaAsistente from '@/features/asistente/pantalla-asistente';
import PantallaCompras from '@/features/compras/pantalla-compras';
import PantallaSolicitudes from '@/features/compras/pantalla-solicitudes';
import PantallaContrato from '@/features/contratos/pantalla-contrato';
import PantallaDocumentos from '@/features/documentos/pantalla-documentos';
import PantallaLaboratorio from '@/features/laboratorio/pantalla-laboratorio';
import PantallaAlmacen from '@/features/panel/pantalla-almacen';
import PantallaAsignaciones from '@/features/panel/pantalla-asignaciones';
import PantallaCantera from '@/features/panel/pantalla-cantera';
import PantallaPartes from '@/features/panel/pantalla-partes';
import PantallaPreoperacionales from '@/features/panel/pantalla-preoperacionales';
import PantallaVehiculos from '@/features/panel/pantalla-vehiculos';
import PantallaBandeja from '@/features/panel/whatsapp/pantalla-bandeja';
import { usePersona } from '@/features/panel/sesion';
import PantallaReportes from '@/features/reportes/pantalla-reportes';
import PantallaPersonal from '@/features/rrhh/pantalla-personal';
import {
  alcanzaLaEmpresa,
  alcanzaLaObraDeLaRuta,
  lugarDeLaRuta,
  menuDeEmpresa,
  menuDeObra,
  rutaDeEmpresa,
  rutaRenombradaPara,
  type EmpresaId,
} from '@/shared/rules/empresas';
import { TODOS_LOS_MODULOS } from '@/shared/rules/permisos';

import { useObraDelLugar } from './contexto-empresa';
import { PantallaBitacoraDeMaquinaria } from './pantalla-maquinaria';
import { PantallaRecursosHumanos } from './pantalla-recursos-humanos';
import { PantallaEnConstruccion, PantallaQueNoExiste, PantallaSinAcceso } from './pantallas-de-aviso';

type EmpresaConMenu = Exclude<EmpresaId, 'proyectos'>;

/** Un módulo que llega con su propia spec: el aviso, con el título y la descripción que tendrá. */
const enConstruccion = (titulo: string, descripcion: string) =>
  function Pantalla() {
    return <PantallaEnConstruccion titulo={titulo} descripcion={descripcion} />;
  };

const SOLICITUDES_DE_PAGO = enConstruccion(
  'Solicitudes de pago',
  'Los pagos y anticipos que se piden, para que Tesorería de Elemental los apruebe y los pague.',
);

const PANTALLAS_DE_EMPRESA: Record<EmpresaConMenu, Record<string, ComponentType>> = {
  elemental: {
    'recursos-humanos': PantallaRecursosHumanos,
    // Spec 036, RF-3.
    compras: PantallaCompras,
    tesoreria: enConstruccion(
      'Tesorería',
      'Las solicitudes de pago del grupo y los cortes financieros de cada empresa y cada obra.',
    ),
    documentos: PantallaDocumentos,
    asistente: PantallaAsistente,
  },
  occ: {
    whatsapp: PantallaBandeja,
    // Mientras no llegue su grupo de WhatsApp propio (spec 038), la maquinaria de las
    // bitácoras de todas las obras (RF-22).
    bitacora: PantallaBitacoraDeMaquinaria,
    documentos: PantallaDocumentos,
    // Spec 035, RF-3: el personal de OCC, de consulta.
    'recursos-humanos': PantallaPersonal,
    reportes: PantallaReportes,
    vehiculos: PantallaVehiculos,
    preoperacionales: PantallaPreoperacionales,
    asignaciones: PantallaAsignaciones,
    // Spec 036, RF-1.
    'solicitudes-compra': PantallaSolicitudes,
    'solicitudes-pago': SOLICITUDES_DE_PAGO,
    asistente: PantallaAsistente,
  },
  geolab: {
    bitacora: enConstruccion('Bitácora', 'Los ensayos y el laboratorio de las bitácoras de todas las obras.'),
    whatsapp: PantallaBandeja,
    laboratorio: PantallaLaboratorio,
    reportes: PantallaReportes,
    documentos: PantallaDocumentos,
    'recursos-humanos': PantallaPersonal,
    // Spec 036, RF-1.
    'solicitudes-compra': PantallaSolicitudes,
    'solicitudes-pago': SOLICITUDES_DE_PAGO,
    asistente: PantallaAsistente,
  },
};

const PANTALLAS_DE_OBRA: Record<string, ComponentType> = {
  bitacoras: PantallaPartes,
  whatsapp: PantallaBandeja,
  reportes: PantallaReportes,
  // Spec 035, RF-5: el personal de la obra, de consulta para el residente.
  'recursos-humanos': PantallaPersonal,
  calidad: PantallaLaboratorio,
  almacen: PantallaAlmacen,
  preoperacionales: PantallaPreoperacionales,
  asignaciones: PantallaAsignaciones,
  cantera: PantallaCantera,
  contrato: PantallaContrato,
  documentos: PantallaDocumentos,
  // Spec 036, RF-1.
    'solicitudes-compra': PantallaSolicitudes,
  'solicitudes-pago': SOLICITUDES_DE_PAGO,
  asistente: PantallaAsistente,
};

/** RF-52: si la página de la dirección cambió de nombre, a dónde va ahora quien entra. */
function useRutaRenombrada(): string | null {
  const persona = usePersona();
  const lugar = lugarDeLaRuta(usePathname());
  return lugar ? rutaRenombradaPara(lugar, persona) : null;
}

/** `/panel/<empresa>/<pagina>`: la pantalla, si la empresa y la página son de quien entra. */
export function PaginaDeEmpresa({ empresa }: { empresa: EmpresaConMenu }) {
  const persona = usePersona();
  const { pagina } = useLocalSearchParams<{ pagina: string }>();
  const renombrada = useRutaRenombrada();
  if (renombrada) return <Redirect href={renombrada as Href} />;
  const Pantalla = PANTALLAS_DE_EMPRESA[empresa][pagina];
  if (!Pantalla) return <PantallaQueNoExiste />;
  if (!alcanzaLaEmpresa(persona.rol, empresa)) return <PantallaSinAcceso />;
  // La página existe, pero su menú no se la da a este rol: tampoco es suya (RF-21).
  if (!menuDeEmpresa(empresa, persona.rol).some((e) => e.pagina === pagina)) return <PantallaSinAcceso />;
  return <Pantalla />;
}

/** `/panel/<empresa>`: la primera página de su menú (RF-5). */
export function PortadaDeEmpresa({ empresa }: { empresa: EmpresaConMenu }) {
  const persona = usePersona();
  const primera = alcanzaLaEmpresa(persona.rol, empresa) ? menuDeEmpresa(empresa, persona.rol)[0] : undefined;
  if (!primera) return <PantallaSinAcceso />;
  return <Redirect href={rutaDeEmpresa(empresa, primera.pagina) as Href} />;
}

/**
 * `/panel/proyectos/<obra>/<pagina>`: la pantalla, si la obra es de quien entra y la
 * obra lleva ese módulo (RF-17, RF-18). Mientras se leen los módulos de la obra se
 * suponen encendidos: la pantalla igual filtra sus datos por obra.
 */
export function PaginaDeObra() {
  const persona = usePersona();
  const { obra, pagina } = useLocalSearchParams<{ obra: string; pagina: string }>();
  const obraDelLugar = useObraDelLugar();
  const renombrada = useRutaRenombrada();
  if (renombrada) return <Redirect href={renombrada as Href} />;
  const Pantalla = PANTALLAS_DE_OBRA[pagina];
  if (!Pantalla) return <PantallaQueNoExiste />;
  if (!alcanzaLaObraDeLaRuta(persona, obra)) return <PantallaSinAcceso />;
  const modulos = obraDelLugar?.modulos ?? TODOS_LOS_MODULOS;
  if (!menuDeObra(persona.rol, modulos).some((e) => e.pagina === pagina)) return <PantallaSinAcceso />;
  return <Pantalla />;
}
