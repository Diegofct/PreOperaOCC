/**
 * Corregir una obra sin darla de baja.
 *
 * **El código no se corrige aquí.** Es la llave con la que se reconoce la obra
 * en los partes y en los listados, y hay un índice único sobre él: cambiarlo con
 * preoperacionales y bitácoras ya colgando de esa obra es reescribir a qué se
 * refería lo que ya se firmó. Si el código está mal desde el principio, la
 * salida es dar de baja y registrar otra, que es lo que preserva el histórico.
 *
 * Se manda solo lo que cambió, igual que en las otras dos ventanas.
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
import type { ObraFila, ObraNueva } from './contratos';
import { mensajeDe } from './marco';

export function VentanaCorregirObra({
  obra,
  onCerrar,
  onGuardado,
  onFallo,
}: {
  obra: ObraFila;
  onCerrar: () => void;
  onGuardado: (nombre: string) => void;
  onFallo: (mensaje: string) => void;
}) {
  const [nombre, setNombre] = useState(obra.nombre);
  const [municipio, setMunicipio] = useState(obra.municipio ?? '');
  const [activa, setActiva] = useState(obra.activa);
  const [guardando, setGuardando] = useState(false);

  const faltaNombre = nombre.trim().length === 0;

  async function guardar() {
    if (faltaNombre) return;
    setGuardando(true);
    try {
      const cambios: Partial<ObraNueva> = {};
      if (nombre !== obra.nombre) cambios.nombre = nombre;
      if (municipio !== (obra.municipio ?? '')) cambios.municipio = municipio;
      if (activa !== obra.activa) cambios.activa = activa;

      if (Object.keys(cambios).length === 0) {
        onCerrar();
        return;
      }

      await api.obras.editar(obra.id, cambios);
      onGuardado(nombre);
    } catch (fallo) {
      onFallo(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={`Corregir ${obra.codigo}`} onCerrar={onCerrar}>
      <Aviso tono="info">
        El código de la obra no se corrige: es con lo que se la reconoce en los preoperacionales
        y las bitácoras que ya cuelgan de ella.
      </Aviso>
      <Formulario>
        <Campo
          etiqueta="Nombre"
          valor={nombre}
          onChange={setNombre}
          error={faltaNombre ? 'El nombre no puede quedar vacío.' : undefined}
          ancho={300}
        />
        <Campo etiqueta="Municipio" valor={municipio} onChange={setMunicipio} ancho={220} />
        <Selector
          etiqueta="Estado"
          valor={activa ? 'activa' : 'inactiva'}
          opciones={[
            { valor: 'activa', etiqueta: 'Activa' },
            { valor: 'inactiva', etiqueta: 'Inactiva', detalle: 'Deja de recibir registros' },
          ]}
          onChange={(v) => setActiva(v !== 'inactiva')}
          ancho={220}
        />
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
