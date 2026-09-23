/**
 * Registrar un ingreso o una salida de un material (spec 009, RF-8 a RF-15).
 *
 * Se abre desde la fila del material y no desde un formulario suelto con un
 * selector de materiales: quien registra una salida está mirando el stock de ese
 * material en la tabla, y elegirlo otra vez en una lista de cincuenta es la forma
 * de sacar cemento gris cuando se quería blanco.
 *
 * ── Avisar antes de enviar, con las mismas reglas ──
 *
 * Mientras se escribe, la cantidad se compara con el stock que muestra la tabla y
 * se dice ahí mismo si no alcanza (RF-15), con el texto que respondería el
 * servidor. Las demás faltas —fecha futura, salida sin «para qué»— se señalan al
 * intentar guardar: pintarlas en rojo sobre un formulario recién abierto sería
 * regañar a alguien que todavía no ha escrito nada.
 *
 * **El servidor decide igual.** El stock de la tabla puede estar viejo si otra
 * persona registró algo mientras tanto; entonces el servidor rechaza con el stock
 * real y el mensaje se lee bajo la cantidad.
 *
 * Quién registra no se pide: es quien tiene la sesión (RF-30). Lo que sí se pide,
 * desde el 2026-09-22, es la persona del otro lado del mostrador: quién entregó lo
 * que ingresa o quién recibió lo que sale, escrito a mano (RF-40 a RF-42).
 */
import { useState } from 'react';

import { abreviaturaDeUnidad } from '@/shared/catalogos/almacen';
import {
  aCentesimas,
  formatearCantidad,
  rechazoDeSalida,
  validarMovimiento,
  type TipoMovimiento,
} from '@/shared/rules/almacen';
import { fechaDeJornada } from '@/shared/rules/jornada';

import { api } from './cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  Formulario,
  Modal,
} from './componentes';
import type { MaterialDeAlmacenFila } from './contratos';
import { useAccionDeVentana } from './usar-accion-de-ventana';

export function VentanaMovimiento({
  material,
  tipo,
  onCerrar,
  onGuardado,
}: {
  material: MaterialDeAlmacenFila;
  tipo: TipoMovimiento;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}) {
  const hoy = fechaDeJornada();
  const [fecha, setFecha] = useState(hoy);
  const [cantidad, setCantidad] = useState('');
  const [paraQue, setParaQue] = useState('');
  const [observacion, setObservacion] = useState('');
  const [responsable, setResponsable] = useState('');
  const [intentado, setIntentado] = useState(false);
  /*
   * Lo que el servidor diga de un campo, bajo ese campo, y lo demás arriba de la
   * ventana (spec 015, RF-25 y RF-27). Antes se elegían a mano los cuatro campos
   * que se quedaban aquí y cualquier otro se iba al aviso de la página, detrás
   * del telón; ahora el hook los trata todos igual.
   */
  const accion = useAccionDeVentana();

  const centesimas = cantidad.trim() === '' ? null : aCentesimas(cantidad);
  const faltas = validarMovimiento(
    { tipo, fecha, cantidad: centesimas, paraQue, responsable },
    hoy,
  );
  const faltaDe = (campo: string) =>
    accion.campoConError(campo) ??
    (intentado ? faltas.find((f) => f.campo === campo)?.mensaje : undefined);

  // RF-15 en vivo: solo con una cantidad legible y mayor que cero, que es cuando
  // compararla con el stock dice algo.
  const noAlcanza =
    tipo === 'salida' && centesimas !== null && centesimas > 0
      ? rechazoDeSalida(material.stock, centesimas, material.unidad)
      : null;

  const esSalida = tipo === 'salida';
  const unidad = abreviaturaDeUnidad(material.unidad);

  async function guardar() {
    setIntentado(true);
    accion.limpiar();
    if (faltas.length > 0 || noAlcanza) return;

    const bien = await accion.ejecutar(() =>
      api.almacen.movimientos.registrar(
        esSalida
          ? { tipo: 'salida', materialId: material.id, fecha, cantidad, paraQue, responsable }
          : { tipo: 'ingreso', materialId: material.id, fecha, cantidad, observacion, responsable },
      ),
    );
    if (!bien) return;

    const cuanto = formatearCantidad(centesimas ?? 0, material.unidad);
    onGuardado(
      esSalida
        ? `Salida de ${cuanto} de ${material.nombre} registrada.`
        : `Ingreso de ${cuanto} de ${material.nombre} registrado.`,
    );
  }

  return (
    <Modal
      titulo={`${esSalida ? 'Salida' : 'Ingreso'} de ${material.nombre}`}
      onCerrar={onCerrar}
    >
      <Aviso tono="info">
        {`Stock actual: ${formatearCantidad(material.stock, material.unidad)}.`}
        {esSalida
          ? ' La salida queda a su nombre, con la fecha y para qué se usará.'
          : ' El ingreso queda a su nombre y suma al stock.'}
      </Aviso>
      {accion.error ? <Aviso tono="error">{accion.error}</Aviso> : null}
      <Formulario>
        <Campo
          etiqueta="Fecha"
          obligatorio
          valor={fecha}
          onChange={setFecha}
          ayuda="AAAA-MM-DD. Hoy, o un día pasado."
          error={faltaDe('fecha')}
          ancho={170}
        />
        <Campo
          etiqueta={`Cantidad (${unidad})`}
          obligatorio
          valor={cantidad}
          onChange={setCantidad}
          ayuda="Hasta dos decimales, con coma o punto."
          error={faltaDe('cantidad') ?? noAlcanza ?? undefined}
          ancho={200}
        />
        {esSalida ? (
          <Campo
            etiqueta="Para qué se usará"
            obligatorio
            valor={paraQue}
            onChange={setParaQue}
            ayuda="Ej. Cuneta del PR 3"
            error={faltaDe('paraQue')}
            ancho={360}
          />
        ) : (
          <Campo
            etiqueta="Observación"
            valor={observacion}
            onChange={setObservacion}
            multilinea
          />
        )}
        <Campo
          etiqueta={esSalida ? 'Recibido por' : 'Entregado por'}
          obligatorio
          valor={responsable}
          onChange={setResponsable}
          ayuda={esSalida ? 'Quién se llevó el material.' : 'Quién trajo el material.'}
          error={faltaDe('responsable')}
          ancho={300}
        />
        <AccionesFormulario>
          <Acciones>
            <Boton
              titulo={
                accion.ejecutando
                  ? 'Guardando…'
                  : esSalida
                    ? 'Registrar salida'
                    : 'Registrar ingreso'
              }
              onPress={guardar}
              deshabilitado={accion.ejecutando || noAlcanza !== null}
            />
            <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
          </Acciones>
        </AccionesFormulario>
      </Formulario>
    </Modal>
  );
}
