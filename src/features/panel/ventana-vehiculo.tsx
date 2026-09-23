/**
 * Corregir la ficha de un equipo sin darlo de baja.
 *
 * **El tipo de equipo no se corrige aquí.** Decide qué formato de preoperacional
 * le sale al operador y con qué medidor se controla; cambiarlo con actas ya
 * firmadas contra el formato anterior dejaría un histórico que no se puede leer.
 * Si de verdad se registró con el tipo equivocado, la salida es dar de baja y
 * volver a registrar, que es lo que preserva lo firmado.
 *
 * Las lecturas de medidor tampoco se tocan desde aquí: las mueven el
 * preoperacional del operador y el cierre del parte diario, y el servidor
 * rechaza que retrocedan.
 *
 * Se manda **solo lo que cambió**. Mandarlo todo convertiría cada corrección en
 * un riesgo de pisar un dato que otro acaba de escribir desde el otro
 * computador.
 */
import { useState } from 'react';

import { api } from './cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  Formulario,
  Modal,
  Selector,
} from './componentes';
import {
  ESTADOS_VEHICULO,
  ETIQUETA_ESTADO_VEHICULO,
  type EstadoVehiculo,
  type ObraFila,
  type VehiculoFila,
  type VehiculoNuevo,
} from './contratos';
import { useAccionDeVentana } from './usar-accion-de-ventana';

export function VentanaCorregirVehiculo({
  vehiculo,
  obras,
  onCerrar,
  onGuardado,
}: {
  vehiculo: VehiculoFila;
  obras: ObraFila[];
  onCerrar: () => void;
  onGuardado: (codigo: string) => void;
}) {
  const [codigoInterno, setCodigoInterno] = useState(vehiculo.codigoInterno);
  const [placa, setPlaca] = useState(vehiculo.placa ?? '');
  const [marca, setMarca] = useState(vehiculo.marca ?? '');
  const [modelo, setModelo] = useState(vehiculo.modelo ?? '');
  const [obraId, setObraId] = useState<string | null>(vehiculo.obraId);
  const [estado, setEstado] = useState<EstadoVehiculo>(vehiculo.estado);
  /*
   * Un choque en el código se queda en la ventana, bajo su campo, y cualquier
   * otro fallo arriba de ella: el aviso de la página queda detrás del telón y no
   * se vería (spec 015, RF-25 y RF-27). Antes esto se resolvía aquí, leyendo
   * `ErrorApi.campos.codigoInterno` a mano; ahora lo hace el hook para todos los
   * campos, que es lo mismo sin tener que acordarse en cada ventana.
   */
  const accion = useAccionDeVentana();

  const faltaCodigo = codigoInterno.trim().length === 0;

  async function guardar() {
    if (faltaCodigo) return;

    const cambios: Partial<VehiculoNuevo> = {};
    if (codigoInterno !== vehiculo.codigoInterno) cambios.codigoInterno = codigoInterno;
    if (placa !== (vehiculo.placa ?? '')) cambios.placa = placa;
    if (marca !== (vehiculo.marca ?? '')) cambios.marca = marca;
    if (modelo !== (vehiculo.modelo ?? '')) cambios.modelo = modelo;
    if (obraId !== vehiculo.obraId) cambios.obraId = obraId;
    if (estado !== vehiculo.estado) cambios.estado = estado;

    // Nada que mandar es un cierre, no una petición: pulsar «guardar» sin
    // haber tocado nada no tiene por qué escribir en la base.
    if (Object.keys(cambios).length === 0) {
      onCerrar();
      return;
    }

    const bien = await accion.ejecutar(() => api.vehiculos.editar(vehiculo.id, cambios));
    if (bien) onGuardado(codigoInterno);
  }

  return (
    <Modal titulo={`Corregir ${vehiculo.codigoInterno}`} onCerrar={onCerrar}>
      <Aviso tono="info">
        El tipo de equipo no se corrige: decide el formato del preoperacional y el medidor, y
        cambiarlo dejaría sin sentido las actas ya firmadas de esta máquina.
      </Aviso>
      {accion.error ? <Aviso tono="error">{accion.error}</Aviso> : null}
      <Formulario>
        <Campo
          etiqueta="Código interno"
          obligatorio
          valor={codigoInterno}
          onChange={setCodigoInterno}
          error={faltaCodigo ? 'El código no puede quedar vacío.' : accion.campoConError('codigoInterno')}
          ancho={180}
        />
        <Campo etiqueta="Placa" valor={placa} onChange={setPlaca} ancho={140} />
        <Campo etiqueta="Marca" valor={marca} onChange={setMarca} ancho={160} />
        <Campo etiqueta="Modelo" valor={modelo} onChange={setModelo} ancho={160} />
        <Selector
          etiqueta="Obra"
          valor={obraId}
          opciones={obras.map((o) => ({ valor: o.id, etiqueta: o.nombre, detalle: o.codigo }))}
          onChange={setObraId}
          permiteVacio
          vacio="Sin asignar"
          ancho={240}
        />
        <Selector
          etiqueta="Estado"
          valor={estado}
          opciones={ESTADOS_VEHICULO.map((e) => ({
            valor: e,
            etiqueta: ETIQUETA_ESTADO_VEHICULO[e],
          }))}
          onChange={(v) => setEstado((v as EstadoVehiculo) ?? 'operativo')}
          ancho={200}
        />
        <AccionesFormulario>
          <Acciones>
            <Boton
              titulo={accion.ejecutando ? 'Guardando…' : 'Guardar cambios'}
              onPress={guardar}
              deshabilitado={accion.ejecutando || faltaCodigo}
            />
            <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
          </Acciones>
        </AccionesFormulario>
      </Formulario>
    </Modal>
  );
}
