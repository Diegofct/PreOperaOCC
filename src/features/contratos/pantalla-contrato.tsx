/**
 * Contrato y Presupuesto de la obra (spec 031, RF-1 a RF-5). La gerencia elige la obra;
 * el residente ve la suya (RF-4). Dos pestañas: Contrato y Presupuesto (RF-5).
 *
 * La obra y la pestaña van en la dirección, como en Reportes: recargar o compartir el
 * enlace deja a quien lo abre en el mismo sitio.
 */
import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { useObraDeLaRuta } from '@/features/empresas/contexto-empresa';
import { api } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, Selector } from '@/features/panel/componentes';
import type { ObraFila } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { alcanza, rolVeTodasLasObras } from '@/shared/rules/permisos';

import { PestanaContrato } from './pestana-contrato';
import { PestanaPresupuesto } from './pestana-presupuesto';

const PESTANAS = [
  { valor: 'contrato', titulo: 'Contrato' },
  { valor: 'presupuesto', titulo: 'Presupuesto' },
] as const;

export default function PantallaContrato() {
  const { rol } = usePersona();
  // De la tabla y no del rol: la gerencia y el Director de Proyectos (041/RF-58, RF-10).
  const puedeAprobar = alcanza(rol, 'contrato', 'aprobar');
  // Escoger la obra fuera de una obra de Proyectos: quien ve todas (041/RF-10). Antes era la
  // misma condición que aprobar; el Director de Proyectos ve todas y no es gerencia.
  const veTodas = rolVeTodasLasObras(rol);

  const obras = useListado<ObraFila>(
    useCallback(() => (veTodas ? api.obras.listar() : Promise.resolve([])), [veTodas]),
  );
  const activas = obras.datos.filter((o) => o.activa);
  const [obraDelParametro, setObraElegida] = useParametroDeDireccion('obra', '');
  // Spec 033, RF-19: dentro de una obra de Proyectos, esa obra, sin selector.
  const obraDeLaRuta = useObraDeLaRuta();
  const obraElegida = obraDeLaRuta ?? obraDelParametro;
  const primeraActiva = activas[0]?.id;
  useEffect(() => {
    if (veTodas && !obraElegida && primeraActiva) setObraElegida(primeraActiva);
  }, [veTodas, obraElegida, primeraActiva, setObraElegida]);
  const [pestana, setPestana] = useParametroDeDireccion('pestana', 'contrato');
  const faltaObra = veTodas && !obraElegida;
  const obraId = veTodas ? obraElegida || null : null;

  return (
    <MarcoPantalla
      modulo="contrato"
      exigeObra
      titulo="Contrato y Presupuesto"
      descripcion="El contrato de la obra con su cliente —partes, condiciones, impuestos, pólizas y documentos— y su presupuesto, con versiones."
      error={obras.error}
      cargando={obras.cargando}
    >
      <View style={estilos.encabezado}>
        {veTodas && !obraDeLaRuta ? (
          <Selector
            etiqueta="Obra"
            valor={obraElegida || null}
            opciones={activas.map((o) => ({ valor: o.id, etiqueta: `${o.codigo} · ${o.nombre}` }))}
            onChange={(v) => setObraElegida(v ?? '')}
            vacio="Elija la obra"
            ancho={300}
          />
        ) : null}
        <Acciones>
          {PESTANAS.map((p) => (
            <Boton
              key={p.valor}
              titulo={p.titulo}
              tono={pestana === p.valor ? 'primario' : 'secundario'}
              onPress={() => setPestana(p.valor)}
            />
          ))}
        </Acciones>
      </View>

      {faltaObra ? (
        <Aviso tono="info">Elija arriba la obra.</Aviso>
      ) : pestana === 'presupuesto' ? (
        <PestanaPresupuesto key={obraId ?? 'propia'} obraId={obraId} puedeAprobar={puedeAprobar} />
      ) : (
        // La llave reinicia el formulario al cambiar de obra: no se arrastra lo escrito de otra.
        <PestanaContrato key={obraId ?? 'propia'} obraId={obraId} puedeAprobar={puedeAprobar} />
      )}
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  encabezado: { gap: 12 },
});
