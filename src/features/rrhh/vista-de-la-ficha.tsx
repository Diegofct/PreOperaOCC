/**
 * La ficha laboral de una persona (spec 035, RF-12 a RF-17).
 *
 * Una sola vista para los dos usos: quien lleva las fichas —gerencia y la auxiliar, con
 * `escribir` en RR. HH.— la ve como formulario y la guarda; quien consulta —el residente,
 * el Encargado de OCC, el laboratorista— ve los mismos campos sin poder escribir. El
 * salario solo aparece para quien lo ve (RF-13): a los demás el servidor no lo manda.
 *
 * Lo que impide guardar se revisa aquí con la misma regla del servidor (`faltasDeLaFicha`)
 * para decirlo antes de enviar; el servidor lo vuelve a revisar. Si otra persona la guardó
 * mientras tanto, el servidor responde con el aviso y hay que volver a cargarla.
 *
 * Debajo, su carpeta de documentos (RF-23 a RF-25): la de Documentos (spec 034) con
 * `{ personaId }`, donde suben y anulan quienes llevan RR. HH. Y «Retirar» (RF-19, RF-20),
 * que dice qué documentos de retiro faltan antes de dejar confirmar.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { CarpetaDeDocumentos, useDocumentosDelLugar } from '@/features/documentos/pantalla-documentos';
import { api, mensajeDe } from '@/features/panel/cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  CampoDeFecha,
  Celda,
  Formulario,
  Modal,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { EventoDeLaFicha, FichaDeLaPersona } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';
import { nombreDeCargo } from '@/shared/catalogos/cargos';
import { fechaDelCorte, pesosDeTexto } from '@/shared/rules/cortes';
import { nombreDeEmpresa } from '@/shared/rules/empresas';
import {
  CAMPOS_DE_LA_FICHA,
  ESTADOS_LABORALES,
  faltasDeLaFicha,
  faltasDelRetiro,
  faltasDeLaRetirada,
  faltasParaRetirar,
  nombreDeEstadoLaboral,
  TIPOS_DE_CONTRATO,
  TIPOS_DE_DOCUMENTO,
  veElSalario,
  type CampoDeLaFicha,
  type DatosDeLaFicha,
} from '@/shared/rules/ficha';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { alcanza } from '@/shared/rules/permisos';
import { enPesos } from '@/shared/rules/pesos';

/** Los campos de texto del formulario: todo es texto mientras se escribe. */
type Textos = Record<Exclude<keyof DatosDeLaFicha, 'salario'> | 'salario' | 'estado', string>;

function textosDe(ficha: FichaDeLaPersona['ficha']): Textos {
  return {
    tipoDocumento: ficha.tipoDocumento ?? '',
    fechaNacimiento: ficha.fechaNacimiento ?? '',
    telefono: ficha.telefono ?? '',
    correo: ficha.correo ?? '',
    direccion: ficha.direccion ?? '',
    ciudad: ficha.ciudad ?? '',
    emergenciaNombre: ficha.emergenciaNombre ?? '',
    emergenciaParentesco: ficha.emergenciaParentesco ?? '',
    emergenciaTelefono: ficha.emergenciaTelefono ?? '',
    fechaIngreso: ficha.fechaIngreso ?? '',
    tipoContrato: ficha.tipoContrato ?? '',
    finContrato: ficha.finContrato ?? '',
    salario: ficha.salario ? enPesos(ficha.salario) : '',
    eps: ficha.eps ?? '',
    arl: ficha.arl ?? '',
    pension: ficha.pension ?? '',
    caja: ficha.caja ?? '',
    notas: ficha.notas ?? '',
    estado: ficha.estado,
  };
}

const vacioANulo = (texto: string) => (texto.trim() ? texto.trim() : null);

export function VistaDeLaFicha({ id, alVolver }: { id: string; alVolver: () => void }) {
  const { rol } = usePersona();
  const puedeEditar = alcanza(rol, 'rrhh', 'escribir');
  const conSalario = veElSalario(rol);

  const cargada = useListado<FichaDeLaPersona>(useCallback(() => api.rrhh.ficha(id).then((f) => [f]), [id]));
  const historial = useListado<EventoDeLaFicha>(
    useCallback(() => (puedeEditar ? api.rrhh.historial(id) : Promise.resolve([])), [id, puedeEditar]),
  );
  const datos = cargada.datos[0] ?? null;
  const documentos = useDocumentosDelLugar({ personaId: id });
  const [retirando, setRetirando] = useState(false);

  const [textos, setTextos] = useState<Textos | null>(null);
  const [aviso, setAviso] = useState<{ tono: 'exito' | 'error'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  // Al pintar y no con un efecto, como en Finanzas: cuando llega otra versión de la
  // ficha —la primera carga o después de guardar—, el formulario la toma.
  const [versionVista, setVersionVista] = useState<number | null>(null);
  if (datos && datos.ficha.version !== versionVista) {
    setVersionVista(datos.ficha.version);
    setTextos(textosDe(datos.ficha));
  }

  if (!datos || !textos) {
    return (
      <MarcoPantalla titulo="Ficha" descripcion="La ficha laboral de la persona." error={cargada.error} cargando={cargada.cargando}>
        <Acciones>
          <Boton titulo="← Volver al personal" tono="secundario" onPress={alVolver} />
        </Acciones>
      </MarcoPantalla>
    );
  }

  const { persona, ficha } = datos;
  const retirada = ficha.estado === 'retirado';
  // Las clases de sus documentos sin anular: las usan el aviso de abajo y «Retirar».
  const clasesVigentes = (documentos.datos[0]?.documentos ?? []).filter((d) => d.anulado === null).map((d) => d.clase);
  // Caso límite: retirada, pero después se anuló un documento de retiro.
  const faltanDespuesDelRetiro = documentos.datos.length
    ? faltasDeLaRetirada(ficha.estado, ficha.tipoContrato, clasesVigentes)
    : [];
  const contrato = TIPOS_DE_CONTRATO.find((t) => t.id === textos.tipoContrato);
  const salario = pesosDeTexto(textos.salario);
  const salarioMalEscrito = conSalario && textos.salario.trim() !== '' && salario === null;

  const pedido: DatosDeLaFicha = {
    tipoDocumento: vacioANulo(textos.tipoDocumento),
    fechaNacimiento: vacioANulo(textos.fechaNacimiento),
    telefono: vacioANulo(textos.telefono),
    correo: vacioANulo(textos.correo),
    direccion: vacioANulo(textos.direccion),
    ciudad: vacioANulo(textos.ciudad),
    emergenciaNombre: vacioANulo(textos.emergenciaNombre),
    emergenciaParentesco: vacioANulo(textos.emergenciaParentesco),
    emergenciaTelefono: vacioANulo(textos.emergenciaTelefono),
    fechaIngreso: vacioANulo(textos.fechaIngreso),
    tipoContrato: vacioANulo(textos.tipoContrato),
    // Solo los contratos con fin la llevan: al cambiar a uno sin fin, se va.
    finContrato: contrato?.conFin ? vacioANulo(textos.finContrato) : null,
    salario: conSalario ? salario : null,
    eps: vacioANulo(textos.eps),
    arl: vacioANulo(textos.arl),
    pension: vacioANulo(textos.pension),
    caja: vacioANulo(textos.caja),
    notas: vacioANulo(textos.notas),
  };
  const faltas = faltasDeLaFicha(pedido);
  const falta = salarioMalEscrito ? 'Escriba el salario en pesos, sin decimales.' : (faltas[0] ?? null);

  const cambiar = (campo: keyof Textos) => (valor: string | null) => {
    setAviso(null);
    setTextos({ ...textos, [campo]: valor ?? '' });
  };

  async function guardar() {
    if (falta) return;
    setGuardando(true);
    try {
      await api.rrhh.guardarFicha(id, { ...pedido, estado: textos?.estado ?? 'activo', version: ficha.version });
      setAviso({ tono: 'exito', texto: 'Ficha guardada.' });
      cargada.recargar();
      historial.recargar();
    } catch (fallo) {
      setAviso({ tono: 'error', texto: mensajeDe(fallo) });
    } finally {
      setGuardando(false);
    }
  }

  /** Un campo de texto: se escribe si puede editar; si no, se lee. */
  const texto = (campo: keyof Textos, etiqueta: string, extra: { ancho?: number; ayuda?: string } = {}) => (
    <Campo
      etiqueta={etiqueta}
      valor={puedeEditar ? textos[campo] : textos[campo] || '—'}
      onChange={cambiar(campo)}
      soloLectura={!puedeEditar}
      ancho={extra.ancho ?? 220}
      ayuda={puedeEditar ? extra.ayuda : undefined}
    />
  );
  const fecha = (campo: keyof Textos, etiqueta: string, extra: { min?: string } = {}) =>
    puedeEditar ? (
      <CampoDeFecha etiqueta={etiqueta} valor={textos[campo]} onChange={cambiar(campo)} min={extra.min} />
    ) : (
      <Campo etiqueta={etiqueta} valor={textos[campo] ? fechaDelCorte(textos[campo]) : '—'} onChange={() => {}} soloLectura ancho={170} />
    );
  const lista = (
    campo: keyof Textos,
    etiqueta: string,
    opciones: readonly { id: string; nombre: string }[],
    ancho = 240,
  ) =>
    puedeEditar ? (
      <Selector
        etiqueta={etiqueta}
        valor={textos[campo] || null}
        opciones={opciones.map((o) => ({ valor: o.id, etiqueta: o.nombre }))}
        onChange={cambiar(campo)}
        permiteVacio
        vacio="Sin registrar"
        ancho={ancho}
      />
    ) : (
      <Campo
        etiqueta={etiqueta}
        valor={opciones.find((o) => o.id === textos[campo])?.nombre ?? '—'}
        onChange={() => {}}
        soloLectura
        ancho={ancho}
      />
    );

  const columnasDelHistorial: Columna<EventoDeLaFicha>[] = [
    {
      clave: 'en',
      titulo: 'Cuándo',
      ancho: 170,
      pintar: (e) => <Celda>{new Date(e.en).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</Celda>,
    },
    { clave: 'por', titulo: 'Quién', ancho: 200, pintar: (e) => <Celda>{e.por}</Celda> },
    {
      clave: 'campos',
      titulo: 'Qué cambió',
      ancho: 420,
      pintar: (e) => (
        <Celda lineas={4}>
          {e.accion === 'retirado'
            ? 'Retiró a la persona.'
            : e.campos.map((c) => CAMPOS_DE_LA_FICHA[c as CampoDeLaFicha] ?? c).join(', ')}
        </Celda>
      ),
    },
  ];

  const dondeTrabaja = [nombreDeEmpresa(persona.empresa), persona.obraNombre].filter(Boolean).join(' · ');

  return (
    <MarcoPantalla
      titulo={persona.nombreCompleto}
      descripcion={
        puedeEditar
          ? 'Su ficha laboral. Lo que falte se puede dejar vacío y completar después: la ficha queda marcada como incompleta mientras le falten el ingreso, el contrato, la EPS o la ARL.'
          : 'Su ficha laboral, de consulta. La llevan la gerencia y Recursos Humanos de Elemental.'
      }
      error={cargada.error}
      cargando={cargada.cargando}
    >
      <Acciones>
        <Boton titulo="← Volver al personal" tono="secundario" onPress={alVolver} />
      </Acciones>

      {retirada ? (
        <Aviso tono="info">
          {`Retirada el ${ficha.retiroFecha ? fechaDelCorte(ficha.retiroFecha) : '—'}: ${ficha.retiroMotivo ?? ''}. Sin acceso al panel ni al celular; su historia se conserva.`}
        </Aviso>
      ) : null}
      {faltanDespuesDelRetiro.length ? (
        <Aviso tono="error">
          {`Le falta un documento de retiro que se anuló después de retirarla: ${faltanDespuesDelRetiro.join('; ')}. Sigue retirada; súbalo de nuevo a su carpeta.`}
        </Aviso>
      ) : null}

      <Seccion titulo="Persona">
        <Formulario>
          <Campo etiqueta="Documento" valor={persona.documento ?? '—'} onChange={() => {}} soloLectura ancho={180} />
          <Campo etiqueta="Cargo" valor={persona.cargo ? nombreDeCargo(persona.cargo) : '—'} onChange={() => {}} soloLectura ancho={200} />
          <Campo etiqueta="Empresa y obra" valor={dondeTrabaja || '—'} onChange={() => {}} soloLectura ancho={280} />
          <Campo etiqueta="Usuario" valor={persona.usuario} onChange={() => {}} soloLectura ancho={200} />
        </Formulario>
        {puedeEditar ? (
          <Text style={estilos.apoyo}>El nombre, el documento, el cargo, la obra y el acceso se cambian en «Personas y accesos».</Text>
        ) : null}
      </Seccion>

      <Seccion titulo="Datos personales">
        <Formulario>
          {lista('tipoDocumento', 'Tipo de documento', TIPOS_DE_DOCUMENTO)}
          {fecha('fechaNacimiento', 'Fecha de nacimiento')}
          {texto('telefono', 'Teléfono', { ancho: 180 })}
          {texto('correo', 'Correo', { ancho: 260 })}
          {texto('direccion', 'Dirección', { ancho: 280 })}
          {texto('ciudad', 'Ciudad', { ancho: 180 })}
        </Formulario>
      </Seccion>

      <Seccion titulo="Contacto de emergencia">
        <Formulario>
          {texto('emergenciaNombre', 'Nombre', { ancho: 260 })}
          {texto('emergenciaParentesco', 'Parentesco', { ancho: 180 })}
          {texto('emergenciaTelefono', 'Teléfono', { ancho: 180 })}
        </Formulario>
      </Seccion>

      <Seccion titulo="Vinculación">
        <Formulario>
          {fecha('fechaIngreso', 'Fecha de ingreso')}
          {lista('tipoContrato', 'Tipo de contrato', TIPOS_DE_CONTRATO)}
          {contrato?.conFin ? fecha('finContrato', 'Terminación del contrato', { min: textos.fechaIngreso || undefined }) : null}
          {retirada || !puedeEditar ? (
            <Campo
              etiqueta="Estado laboral"
              valor={nombreDeEstadoLaboral(textos.estado) ?? textos.estado}
              onChange={() => {}}
              soloLectura
              ancho={200}
            />
          ) : (
            <Selector
              etiqueta="Estado laboral"
              valor={textos.estado}
              // Retirar tiene sus documentos y su botón (RF-19): aquí no se ofrece.
              opciones={ESTADOS_LABORALES.filter((e) => e.id !== 'retirado').map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
              onChange={(v) => cambiar('estado')(v ?? 'activo')}
              ancho={200}
            />
          )}
          {conSalario
            ? texto('salario', 'Salario mensual', { ancho: 200, ayuda: 'En pesos, sin decimales. Solo lo ven la gerencia y Recursos Humanos.' })
            : null}
        </Formulario>
      </Seccion>

      <Seccion titulo="Seguridad social">
        <Formulario>
          {texto('eps', 'EPS')}
          {texto('arl', 'ARL')}
          {texto('pension', 'Fondo de pensiones')}
          {texto('caja', 'Caja de compensación')}
        </Formulario>
      </Seccion>

      <Seccion titulo="Notas">
        <Campo
          etiqueta="Notas"
          valor={puedeEditar ? textos.notas : textos.notas || '—'}
          onChange={cambiar('notas')}
          soloLectura={!puedeEditar}
          multilinea
          compacto
        />
      </Seccion>

      {/* RF-23 a RF-25: su carpeta. Consultan todos los que ven la ficha. */}
      {documentos.error ? <Aviso tono="error">{documentos.error}</Aviso> : null}
      <CarpetaDeDocumentos
        cargados={documentos}
        pedido={{ personaId: id }}
        deQuien="persona"
        puedeSubir={puedeEditar}
        puedeAnular={alcanza(rol, 'rrhh', 'anular')}
        // La búsqueda del listado del personal sigue en la dirección: esta va aparte.
        claveDeBusqueda="buscarDocumento"
      />

      {puedeEditar ? (
        <>
          {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : falta ? <Text style={estilos.falta}>{falta}</Text> : null}
          <Acciones>
            <Boton titulo={guardando ? 'Guardando…' : 'Guardar ficha'} onPress={guardar} deshabilitado={guardando || falta !== null} />
            {retirada ? null : <Boton titulo="Retirar" tono="peligro" onPress={() => setRetirando(true)} />}
          </Acciones>
          {ficha.actualizadoEn ? (
            <Text style={estilos.apoyo}>
              {`Última vez guardada por ${ficha.actualizadoPor ?? '—'} el ${new Date(ficha.actualizadoEn).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}.`}
            </Text>
          ) : (
            <Text style={estilos.apoyo}>Esta persona todavía no tiene ficha: se crea al guardar.</Text>
          )}

          {/* RF-15: quién, cuándo y qué campos; los valores no se guardan. */}
          <Seccion titulo="Historial">
            <Tabla
              columnas={columnasDelHistorial}
              filas={historial.datos}
              vacio="Todavía nadie ha guardado esta ficha."
            />
          </Seccion>
        </>
      ) : null}

      {retirando ? (
        <VentanaDeRetirar
          nombre={persona.nombreCompleto}
          faltan={faltasParaRetirar(ficha.tipoContrato, clasesVigentes)}
          fechaIngreso={ficha.fechaIngreso}
          alCerrar={() => setRetirando(false)}
          alRetirar={async (fecha, motivo) => {
            await api.rrhh.retirar(id, { version: ficha.version, fecha, motivo });
            setRetirando(false);
            setAviso({ tono: 'exito', texto: 'Persona retirada. Ya no puede entrar al panel ni al celular.' });
            cargada.recargar();
            historial.recargar();
          }}
        />
      ) : null}
    </MarcoPantalla>
  );
}

/**
 * Retirar a una persona (RF-19, RF-20). Lo que falta se dice antes de dejar confirmar, con
 * la misma regla del servidor y los documentos sin anular de su carpeta; el servidor lo
 * vuelve a revisar todo.
 */
function VentanaDeRetirar({
  nombre,
  faltan,
  fechaIngreso,
  alCerrar,
  alRetirar,
}: {
  nombre: string;
  faltan: string[];
  fechaIngreso: string | null;
  alCerrar: () => void;
  alRetirar: (fecha: string, motivo: string) => Promise<void>;
}) {
  const [fecha, setFecha] = useState(fechaDeJornada());
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const faltasDeDatos = faltasDelRetiro({ fecha, motivo }, fechaIngreso);

  async function retirar() {
    setEnviando(true);
    setError(null);
    try {
      await alRetirar(fecha, motivo.trim());
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={`Retirar a ${nombre}`} onCerrar={alCerrar}>
      {faltan.length ? (
        <Aviso tono="error">
          {`Para retirarla faltan sus documentos de retiro: ${faltan.join('; ')}. Súbalos a su carpeta y vuelva a intentarlo.`}
        </Aviso>
      ) : (
        <Text style={estilos.apoyo}>
          Queda retirada con su fecha y su motivo: sin acceso al panel ni al celular y fuera de los selectores. Su ficha, sus
          documentos y sus registros se conservan.
        </Text>
      )}
      <CampoDeFecha etiqueta="Fecha del retiro" valor={fecha} onChange={setFecha} min={fechaIngreso ?? undefined} />
      <Campo etiqueta="Motivo" obligatorio valor={motivo} onChange={setMotivo} multilinea compacto />
      {error ? <Aviso tono="error">{error}</Aviso> : faltasDeDatos.length ? <Text style={estilos.falta}>{faltasDeDatos[0]}</Text> : null}
      <AccionesFormulario>
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
        <Boton
          titulo={enviando ? 'Retirando…' : 'Retirar'}
          tono="peligro"
          onPress={retirar}
          deshabilitado={enviando || faltan.length > 0 || faltasDeDatos.length > 0}
        />
      </AccionesFormulario>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo, marginTop: Spacing.one },
  falta: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
