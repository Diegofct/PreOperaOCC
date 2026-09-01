/**
 * Siembra local de arranque.
 *
 * Hace dos cosas distintas y conviene no confundirlas:
 *
 *  1. **Plantillas** — se siembran siempre. Son los formatos reales de OCC
 *     importados de `docs/*.xlsx`. Hasta que el servidor exista (Fase 2), el
 *     dispositivo las lee de aquí; después llegarán por sincronización y esta
 *     siembra solo servirá como respaldo del primer arranque.
 *
 *  2. **Flota, operadores y asignaciones de demostración** — datos de mentira
 *     para poder probar la app sin servidor. Llevan el prefijo `demo-` para que
 *     se distingan a simple vista. La flota solo se crea una vez; los operadores
 *     y sus asignaciones se refrescan en cada arranque, para que agregar un caso
 *     de prueba no obligue a borrar los datos de la app. En cuanto entre el
 *     primer pull real, toda esta siembra se apaga sola.
 */
import * as Crypto from 'expo-crypto';
import { count, eq } from 'drizzle-orm';

import { PLANTILLAS } from '@/features/checklists/plantillas';
import type { PlantillaChecklist } from '@/features/checklists/types';

import { db } from './client';
import { asignaciones, obras, plantillas, tiposVehiculo, usuarios, vehiculos } from './schema';

/** SHA-256 del JSON canónico: detecta que una plantilla fue alterada. */
export async function hashDePlantilla(plantilla: PlantillaChecklist): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify(plantilla.secciones),
  );
}

const TIPOS: { id: string; nombre: string; claseMedidor: 'odometro' | 'horometro' | 'ambos' }[] = [
  { id: 'camioneta', nombre: 'Camioneta', claseMedidor: 'ambos' },
  { id: 'volqueta', nombre: 'Volqueta', claseMedidor: 'ambos' },
  { id: 'retroexcavadora', nombre: 'Retroexcavadora', claseMedidor: 'horometro' },
  { id: 'retrocargador', nombre: 'Retrocargador', claseMedidor: 'horometro' },
  { id: 'motoniveladora', nombre: 'Motoniveladora', claseMedidor: 'horometro' },
];

async function sembrarTipos() {
  for (const tipo of TIPOS) {
    await db.insert(tiposVehiculo).values(tipo).onConflictDoNothing();
  }
}

async function sembrarPlantillas() {
  for (const plantilla of PLANTILLAS) {
    const hash = await hashDePlantilla(plantilla);
    const id = `${plantilla.tipoVehiculo}-v${plantilla.version}`;
    await db
      .insert(plantillas)
      .values({
        id,
        tipoVehiculoId: plantilla.tipoVehiculo,
        version: plantilla.version,
        hash,
        esquema: plantilla,
        publicadaEn: Date.now(),
      })
      .onConflictDoNothing();
  }
}

/* ------------------------------------------------------------------------ */
/* Demostración                                                              */
/* ------------------------------------------------------------------------ */

const OBRA_DEMO = {
  id: 'demo-obra-01',
  codigo: 'OBR-001',
  nombre: 'Vía terciaria — tramo 1',
  municipio: 'Demostración',
  activa: true,
};

/**
 * Usuarios de prueba: tres operadores, uno por cada caso de asignación que la
 * app tiene que resolver, y el jefe que lleva las bitácoras.
 *
 *   usuario    PIN       rol         caso
 *   ────────── ───────── ─────────── ──────────────────────────────────────
 *   operador   111111    operador    una asignación → entra a la volqueta
 *   ayudante   222222    operador    ninguna        → tiene que autoasignarse
 *   maquinista 333333    operador    tres           → ve el selector
 *   residente  444444    supervisor  lleva las bitácoras de toda la obra
 *
 * Los PIN viven aquí y solo aquí. En la Fase 2 los valida el servidor y este
 * mapa se borra; `servicio.ts` es el único que lo consulta.
 */
const OPERADORES_DEMO = [
  {
    id: 'demo-usuario-01',
    usuario: 'operador',
    nombreCompleto: 'Luis Ramírez',
    documento: '10000001',
    rol: 'operador' as const,
    obraId: OBRA_DEMO.id,
    activo: true,
  },
  {
    id: 'demo-usuario-02',
    usuario: 'ayudante',
    nombreCompleto: 'Carlos Bermúdez',
    documento: '10000002',
    rol: 'operador' as const,
    obraId: OBRA_DEMO.id,
    activo: true,
  },
  {
    id: 'demo-usuario-03',
    usuario: 'maquinista',
    nombreCompleto: 'Jhon Ospina',
    documento: '10000003',
    rol: 'operador' as const,
    obraId: OBRA_DEMO.id,
    activo: true,
  },
  {
    id: 'demo-usuario-04',
    usuario: 'residente',
    nombreCompleto: 'Marcela Torres',
    documento: '10000004',
    rol: 'supervisor' as const,
    obraId: OBRA_DEMO.id,
    activo: true,
  },
];

const PINES_DEMO: Record<string, string> = {
  operador: '111111',
  ayudante: '222222',
  maquinista: '333333',
  residente: '444444',
};

/** El PIN de prueba de un usuario, mientras no exista el servidor. */
export function pinDemostracionDe(usuario: string): string | null {
  return PINES_DEMO[usuario] ?? null;
}

const FLOTA_DEMO = [
  { codigo: 'CAM-01', tipo: 'camioneta', placa: 'ABC123', marca: 'Toyota', modelo: 'Hilux', km: 84_300, h: 3_120 },
  { codigo: 'VOL-01', tipo: 'volqueta', placa: 'SXY456', marca: 'Kenworth', modelo: 'T370', km: 210_450, h: 9_840 },
  { codigo: 'VOL-02', tipo: 'volqueta', placa: 'TQR789', marca: 'International', modelo: '7600', km: 176_200, h: 8_115 },
  { codigo: 'RET-01', tipo: 'retroexcavadora', placa: null, marca: 'Case', modelo: 'CX210', km: null, h: 6_430 },
  { codigo: 'RCG-01', tipo: 'retrocargador', placa: null, marca: 'JCB', modelo: '3CX', km: null, h: 4_275 },
  { codigo: 'MOT-01', tipo: 'motoniveladora', placa: null, marca: 'Caterpillar', modelo: '120K', km: null, h: 7_690 },
];

/**
 * Asignaciones de prueba. El operador de la volqueta no es casualidad: es el
 * formato más largo (87 ítems) y por lo tanto el que peor aguanta una interfaz
 * mediocre.
 */
const ASIGNACIONES_DEMO = [
  { id: 'demo-asignacion-01', usuarioId: 'demo-usuario-01', vehiculoId: 'demo-vol-01' },
  { id: 'demo-asignacion-03', usuarioId: 'demo-usuario-03', vehiculoId: 'demo-cam-01' },
  { id: 'demo-asignacion-04', usuarioId: 'demo-usuario-03', vehiculoId: 'demo-ret-01' },
  { id: 'demo-asignacion-05', usuarioId: 'demo-usuario-03', vehiculoId: 'demo-mot-01' },
  // 'ayudante' (demo-usuario-02) no lleva ninguna: es el caso de autoasignación.
];

/** La flota de demostración ya está sembrada en este equipo. */
async function hayFlotaDemostracion(): Promise<boolean> {
  const filas = await db
    .select({ id: vehiculos.id })
    .from(vehiculos)
    .where(eq(vehiculos.id, 'demo-vol-01'))
    .limit(1);
  return filas.length > 0;
}

async function sembrarDemostracion() {
  const [{ total }] = await db.select({ total: count() }).from(vehiculos);
  const flotaVacia = total === 0;

  // Si el equipo ya tiene vehículos y ninguno es de demostración, es que entró
  // un pull real: aquí no hay nada que hacer.
  if (!flotaVacia && !(await hayFlotaDemostracion())) return;

  await db.insert(obras).values(OBRA_DEMO).onConflictDoNothing();

  // Los operadores y sus asignaciones se vuelven a sembrar en cada arranque, no
  // solo cuando la base está vacía. Agregar un caso de prueba no debería
  // obligar a borrar los datos de la app — que es justo lo que pasaba antes.
  for (const operador of OPERADORES_DEMO) {
    await db
      .insert(usuarios)
      .values(operador)
      .onConflictDoUpdate({
        target: usuarios.id,
        set: {
          usuario: operador.usuario,
          nombreCompleto: operador.nombreCompleto,
          rol: operador.rol,
          obraId: operador.obraId,
        },
      });
  }

  for (const v of flotaVacia ? FLOTA_DEMO : []) {
    await db
      .insert(vehiculos)
      .values({
        id: `demo-${v.codigo.toLowerCase()}`,
        codigoInterno: v.codigo,
        placa: v.placa,
        tipoVehiculoId: v.tipo,
        marca: v.marca,
        modelo: v.modelo,
        obraId: OBRA_DEMO.id,
        odometroKm: v.km,
        horometroH: v.h,
        medidorActualizadoEn: Date.now(),
        estado: 'operativo',
      })
      .onConflictDoNothing();
  }

  for (const asignacion of ASIGNACIONES_DEMO) {
    await db
      .insert(asignaciones)
      .values({
        ...asignacion,
        obraId: OBRA_DEMO.id,
        desde: Date.now(),
        hasta: null,
        origen: 'supervisor',
      })
      .onConflictDoNothing();
  }
}

export async function sembrarBaseLocal() {
  await sembrarTipos();
  await sembrarPlantillas();
  await sembrarDemostracion();
}
