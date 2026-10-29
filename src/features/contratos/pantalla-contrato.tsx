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

import { PestanaContrato } from './pestana-contrato';
import { PestanaPresupuesto } from './pestana-presupuesto';

const PESTANAS = [
  { valor: 'contrato', titulo: 'Contrato' },
  { valor: 'presupuesto', titulo: 'Presupuesto' },
] as const;

export default function PantallaContrato() {
  const { rol } = usePersona();
  const esGerencia = rol === 'admin';

  const obras = useListado<ObraFila>(
    useCallback(() => (esGerencia ? api.obras.listar() : Promise.resolve([])), [esGerencia]),
  );
  const activas = obras.datos.filter((o) => o.activa);
  const [obraDelParametro, setObraElegida] = useParametroDeDireccion('obra', '');
  // Spec 033, RF-19: dentro de una obra de Proyectos, esa obra, sin selector.
  const obraDeLaRuta = useObraDeLaRuta();
  const obraElegida = obraDeLaRuta ?? obraDelParametro;
  const primeraActiva = activas[0]?.id;
  useEffect(() => {
    if (esGerencia && !obraElegida && primeraActiva) setObraElegida(primeraActiva);
  }, [esGerencia, obraElegida, primeraActiva, setObraElegida]);
  const [pestana, setPestana] = useParametroDeDireccion('pestana', 'contrato');
  const faltaObra = esGerencia && !obraElegida;
  const obraId = esGerencia ? obraElegida || null : null;

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
        {esGerencia && !obraDeLaRuta ? (
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
        <PestanaPresupuesto key={obraId ?? 'propia'} obraId={obraId} esGerencia={esGerencia} />
      ) : (
        // La llave reinicia el formulario al cambiar de obra: no se arrastra lo escrito de otra.
        <PestanaContrato key={obraId ?? 'propia'} obraId={obraId} esGerencia={esGerencia} />
      )}
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  encabezado: { gap: 12 },
});
