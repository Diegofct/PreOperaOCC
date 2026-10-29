/**
 * «Información financiera» de una empresa o de una obra (spec 033, RF-34 a RF-40).
 *
 * Arriba el último corte con su diferencia frente al anterior; debajo, registrar uno
 * nuevo y el historial, del más reciente al más antiguo, con los anulados. Un corte no se
 * corrige: se anula con motivo y se registra otro (RF-40). Solo la gerencia entra.
 */

import { useCallback, useMemo, useState } from 'react';

import { api, mensajeDe } from '@/features/panel/cliente-api';
import {
  Acciones,
  Aviso,
  Ayuda,
  Boton,
  Campo,
  CampoDeFecha,
  Celda,
  Cifra,
  Cifras,
  Formulario,
  Modal,
  Seccion,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { CorteFila, CortesDe } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import {
  fechaDelCorte,
  pesosDeTexto,
  SIN_INFORMACION_FINANCIERA,
  textoDeDiferencia,
  ultimoCorte,
} from '@/shared/rules/cortes';
import type { EmpresaId } from '@/shared/rules/empresas';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { enPesos } from '@/shared/rules/pesos';

/** De quién son los cortes: una empresa con corte propio o una obra. */
export type DuenoDeLaPantalla = { empresa: Exclude<EmpresaId, 'proyectos'> } | { obraId: string };

export function PantallaInformacionFinanciera({
  empresa,
  obraId,
  nombre,
}: {
  /** Una de las dos: la empresa con corte propio o la obra. */
  empresa?: Exclude<EmpresaId, 'proyectos'>;
  obraId?: string;
  nombre: string;
}) {
  // Con `useMemo` sobre los dos valores: un objeto nuevo en cada pintada haría que el
  // listado se pidiera una y otra vez.
  const dueno = useMemo<DuenoDeLaPantalla>(() => (empresa ? { empresa } : { obraId: obraId ?? '' }), [empresa, obraId]);
  const cortes = useListado<CortesDe>(useCallback(() => api.cortes.de(dueno).then((c) => [c]), [dueno]));
  const datos = cortes.datos[0];
  const [porAnular, setPorAnular] = useState<CorteFila | null>(null);
  // Cuántos se han anulado aquí: anular puede dejar libre la fecha que el formulario
  // acaba de rechazar, y ese aviso ya no sería verdad.
  const [anulados, setAnulados] = useState(0);

  return (
    <MarcoPantalla
      titulo="Información financiera"
      descripcion={`${nombre}: los cortes que registra la gerencia. Un corte no se corrige: se anula con su motivo y se registra otro.`}
      error={cortes.error}
      cargando={cortes.cargando}
    >
      {datos ? <UltimoCorte datos={datos} /> : null}
      <RegistrarCorte dueno={dueno} alRegistrar={cortes.recargar} anulados={anulados} />
      {datos ? <Historial cortes={datos.cortes} alAnular={setPorAnular} /> : null}
      {porAnular ? (
        <VentanaAnular
          corte={porAnular}
          alCerrar={() => setPorAnular(null)}
          alAnular={() => {
            setPorAnular(null);
            setAnulados((n) => n + 1);
            cortes.recargar();
          }}
        />
      ) : null}
    </MarcoPantalla>
  );
}

/** RF-37, RF-38: el último vigente y cuánto cambió cada valor frente al anterior. */
function UltimoCorte({ datos }: { datos: CortesDe }) {
  const ultimo = ultimoCorte(datos.cortes);
  if (!ultimo) {
    return (
      <Seccion titulo="Último corte">
        <Aviso tono="info">{SIN_INFORMACION_FINANCIERA}. Registre el primer corte abajo.</Aviso>
      </Seccion>
    );
  }
  // El anterior vigente: con él se dice contra qué fecha es la diferencia.
  const anterior = datos.cortes.filter((c) => c.anuladoEn === null && c.id !== ultimo.id)[0];
  const pie = (diferencia: number | undefined) =>
    diferencia === undefined || !anterior
      ? 'Primer corte registrado'
      : `${textoDeDiferencia(diferencia)} frente al ${fechaDelCorte(anterior.fechaCorte)}`;

  return (
    <Seccion titulo={`Último corte: ${fechaDelCorte(ultimo.fechaCorte)}`}>
      <Cifras>
        <Cifra titulo="Saldo a la fecha" valor={enPesos(ultimo.saldo)} pie={pie(datos.diferencia?.saldo)} />
        <Cifra
          titulo="Cuentas por pagar"
          valor={enPesos(ultimo.cuentasPorPagar)}
          pie={pie(datos.diferencia?.cuentasPorPagar)}
        />
        <Cifra
          titulo="Cuentas por cobrar"
          valor={enPesos(ultimo.cuentasPorCobrar)}
          pie={pie(datos.diferencia?.cuentasPorCobrar)}
        />
      </Cifras>
      {ultimo.notas ? <Ayuda>{`Notas: ${ultimo.notas}`}</Ayuda> : null}
    </Seccion>
  );
}

/** RF-34 a RF-36. La fecha y los valores los valida el servidor con la regla; aquí, la forma. */
function RegistrarCorte({
  dueno,
  alRegistrar,
  anulados,
}: {
  dueno: DuenoDeLaPantalla;
  alRegistrar: () => void;
  anulados: number;
}) {
  const hoy = fechaDeJornada();
  const vacio = { fecha: hoy, saldo: '', porPagar: '', porCobrar: '', notas: '' };
  const [campos, setCampos] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tono: 'exito' | 'error'; texto: string } | null>(null);
  // Al pintar y no con un efecto, como `SelectorDeHora`: si se anuló un corte, el
  // aviso de antes se quita.
  const [anuladosVistos, setAnuladosVistos] = useState(anulados);
  if (anulados !== anuladosVistos) {
    setAnuladosVistos(anulados);
    setAviso(null);
  }

  const saldo = pesosDeTexto(campos.saldo);
  const porPagar = pesosDeTexto(campos.porPagar);
  const porCobrar = pesosDeTexto(campos.porCobrar);
  const malEscrito = (texto: string, valor: number | null) =>
    texto.trim() !== '' && valor === null ? 'Escriba el valor en pesos, sin decimales.' : undefined;
  const completo = saldo !== null && porPagar !== null && porCobrar !== null && campos.fecha !== '';

  const cambiar = (clave: keyof typeof vacio) => (v: string) => {
    setAviso(null);
    setCampos({ ...campos, [clave]: v });
  };

  async function registrar() {
    if (!completo) return;
    setGuardando(true);
    try {
      await api.cortes.registrar({
        ...('empresa' in dueno ? { empresaId: dueno.empresa } : { obraId: dueno.obraId }),
        fechaCorte: campos.fecha,
        saldo,
        cuentasPorPagar: porPagar,
        cuentasPorCobrar: porCobrar,
        notas: campos.notas,
      });
      setCampos(vacio);
      setAviso({ tono: 'exito', texto: `Corte del ${fechaDelCorte(campos.fecha)} registrado.` });
      alRegistrar();
    } catch (fallo) {
      setAviso({ tono: 'error', texto: mensajeDe(fallo) });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Seccion titulo="Registrar un corte">
      <Formulario>
        <CampoDeFecha etiqueta="Fecha de corte" valor={campos.fecha} onChange={cambiar('fecha')} max={hoy} />
        <Campo
          etiqueta="Saldo a la fecha"
          valor={campos.saldo}
          onChange={cambiar('saldo')}
          ayuda={malEscrito(campos.saldo, saldo) ? undefined : 'En pesos. Puede ser negativo.'}
          error={malEscrito(campos.saldo, saldo)}
          obligatorio
          ancho={200}
        />
        <Campo
          etiqueta="Cuentas por pagar"
          valor={campos.porPagar}
          onChange={cambiar('porPagar')}
          error={malEscrito(campos.porPagar, porPagar)}
          obligatorio
          ancho={200}
        />
        <Campo
          etiqueta="Cuentas por cobrar"
          valor={campos.porCobrar}
          onChange={cambiar('porCobrar')}
          error={malEscrito(campos.porCobrar, porCobrar)}
          obligatorio
          ancho={200}
        />
      </Formulario>
      <Campo etiqueta="Notas" valor={campos.notas} onChange={cambiar('notas')} multilinea compacto />
      {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
      <Acciones>
        <Boton
          titulo={guardando ? 'Registrando…' : 'Registrar corte'}
          onPress={registrar}
          deshabilitado={!completo || guardando}
        />
      </Acciones>
    </Seccion>
  );
}

/** RF-37, RF-39: todos, del más reciente al más antiguo; los anulados, con su motivo. */
function Historial({ cortes, alAnular }: { cortes: CorteFila[]; alAnular: (corte: CorteFila) => void }) {
  const columnas: Columna<CorteFila>[] = [
    { clave: 'fecha', titulo: 'Fecha de corte', ancho: 120, pintar: (c) => <Celda>{fechaDelCorte(c.fechaCorte)}</Celda> },
    { clave: 'saldo', titulo: 'Saldo', ancho: 150, pintar: (c) => <Celda>{enPesos(c.saldo)}</Celda> },
    { clave: 'pagar', titulo: 'Por pagar', ancho: 150, pintar: (c) => <Celda>{enPesos(c.cuentasPorPagar)}</Celda> },
    { clave: 'cobrar', titulo: 'Por cobrar', ancho: 150, pintar: (c) => <Celda>{enPesos(c.cuentasPorCobrar)}</Celda> },
    { clave: 'notas', titulo: 'Notas', ancho: 200, pintar: (c) => <Celda>{c.notas || '—'}</Celda> },
    { clave: 'registro', titulo: 'Registró', ancho: 140, pintar: (c) => <Celda>{c.registradoPor}</Celda> },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 220,
      // El motivo entero: cortado no dice por qué se anuló.
      pintar: (c) => (
        <Celda lineas={4}>
          {c.anuladoEn ? `Anulado por ${c.anuladoPor ?? '—'}: ${c.motivoAnulacion ?? ''}` : 'Vigente'}
        </Celda>
      ),
    },
    {
      clave: 'anular',
      titulo: '',
      ancho: 110,
      anchoMinimo: 110,
      pintar: (c) =>
        c.anuladoEn ? null : <Boton titulo="Anular" tono="peligro" onPress={() => alAnular(c)} />,
    },
  ];
  return (
    <Seccion titulo="Historial de cortes">
      <Tabla columnas={columnas} filas={cortes} vacio="Todavía no hay cortes registrados." />
    </Seccion>
  );
}

/** RF-39: anular pide el motivo, siempre. */
function VentanaAnular({ corte, alCerrar, alAnular }: { corte: CorteFila; alCerrar: () => void; alAnular: () => void }) {
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function anular() {
    setOcupado(true);
    try {
      await api.cortes.anular(corte.id, motivo);
      alAnular();
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setOcupado(false);
    }
  }

  return (
    <Modal titulo={`Anular el corte del ${fechaDelCorte(corte.fechaCorte)}`} onCerrar={alCerrar}>
      <Campo
        etiqueta="Motivo"
        valor={motivo}
        onChange={setMotivo}
        obligatorio
        ayuda="Queda en el historial con su nombre. Después puede registrar el corte correcto."
      />
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <Acciones>
        <Boton
          titulo="Confirmar anulación"
          tono="peligro"
          onPress={anular}
          deshabilitado={motivo.trim().length === 0 || ocupado}
        />
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
      </Acciones>
    </Modal>
  );
}
