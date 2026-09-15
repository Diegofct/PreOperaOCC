/**
 * Corregir un material del almacén sin darlo de baja (spec 009, RF-4 y RF-5).
 *
 * El nombre se corrige siempre: los movimientos apuntan al material por su id y
 * no por su nombre, así que no se alteran (RF-4).
 *
 * **La unidad solo mientras no tenga movimientos** (RF-5). Con alguno, aunque esté
 * anulado, «100 bultos» pasaría a decir «100 kg». En ese caso la ventana no ofrece
 * el selector y dice por qué con el mismo texto que respondería el servidor: una
 * opción que se puede elegir y luego se rechaza es peor que no ofrecerla.
 *
 * Se manda **solo lo que cambió**, como en la corrección de vehículos.
 */
import { useState } from 'react';

import { nombreDeUnidad, UNIDADES_ALMACEN, type UnidadAlmacen } from '@/shared/catalogos/almacen';
import { rechazoDeCambioDeUnidad } from '@/shared/rules/almacen';

import { api, ErrorApi } from './cliente-api';
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
import type { MaterialDeAlmacenFila, MaterialEditado } from './contratos';
import { mensajeDe } from './marco';

export const OPCIONES_DE_UNIDAD = UNIDADES_ALMACEN.map((u) => ({
  valor: u.id,
  etiqueta: u.nombre,
  detalle: u.abreviatura,
}));

export function VentanaCorregirMaterial({
  material,
  onCerrar,
  onGuardado,
  onFallo,
}: {
  material: MaterialDeAlmacenFila;
  onCerrar: () => void;
  onGuardado: (nombre: string) => void;
  onFallo: (mensaje: string) => void;
}) {
  const [nombre, setNombre] = useState(material.nombre);
  const [unidad, setUnidad] = useState<UnidadAlmacen>(material.unidad);
  const [guardando, setGuardando] = useState(false);
  /** Lo que el servidor diga de un campo se lee debajo de él (spec 007, RF-18). */
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Con movimientos, la regla ya sabe que cualquier otra unidad se rechaza; se
  // le pregunta por una unidad distinta cualquiera para obtener su texto.
  const unidadBloqueada =
    material.movimientos > 0
      ? rechazoDeCambioDeUnidad(material.movimientos, material.unidad, '')
      : null;

  const faltaNombre = nombre.trim().length === 0;

  async function guardar() {
    if (faltaNombre) return;
    setGuardando(true);
    setErrores({});
    try {
      const cambios: MaterialEditado = {};
      if (nombre.trim() !== material.nombre) cambios.nombre = nombre;
      if (!unidadBloqueada && unidad !== material.unidad) cambios.unidad = unidad;

      if (Object.keys(cambios).length === 0) {
        onCerrar();
        return;
      }

      await api.almacen.materiales.corregir(material.id, cambios);
      onGuardado(nombre.trim());
    } catch (fallo) {
      // Nombre repetido o unidad rechazada se quedan en la ventana, bajo su campo:
      // el aviso de la página queda detrás del telón y no se vería.
      const campos = fallo instanceof ErrorApi ? fallo.campos : undefined;
      if (campos && (campos.nombre || campos.unidad)) setErrores(campos);
      else onFallo(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={`Corregir ${material.nombre}`} onCerrar={onCerrar}>
      {/* Fuera del formulario, como en la ventana de vehículos: dentro, la fila de
          campos lo encoge al ancho de su texto y el aviso se sale de la ventana. */}
      {unidadBloqueada ? <Aviso tono="info">{unidadBloqueada}</Aviso> : null}
      <Formulario>
        <Campo
          etiqueta="Nombre del material"
          obligatorio
          valor={nombre}
          onChange={setNombre}
          error={faltaNombre ? 'El nombre no puede quedar vacío.' : errores.nombre}
          ancho={280}
        />
        {unidadBloqueada ? (
          <Campo
            etiqueta="Unidad"
            valor={nombreDeUnidad(material.unidad)}
            onChange={() => {}}
            soloLectura
            ancho={200}
          />
        ) : (
          <Selector
            etiqueta="Unidad"
            obligatorio
            valor={unidad}
            opciones={OPCIONES_DE_UNIDAD}
            onChange={(v) => setUnidad((v as UnidadAlmacen | null) ?? material.unidad)}
            error={errores.unidad}
            ancho={220}
          />
        )}
        <AccionesFormulario>
          <Acciones>
            <Boton
              titulo={guardando ? 'Guardando…' : 'Guardar cambios'}
              onPress={guardar}
              deshabilitado={guardando || faltaNombre}
            />
            <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
          </Acciones>
        </AccionesFormulario>
      </Formulario>
    </Modal>
  );
}
