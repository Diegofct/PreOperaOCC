/**
 * La pestaña Contrato (spec 031, RF-6 a RF-30): el contratante, el contratista o
 * consorcio, el contrato con sus condiciones y sus impuestos y retenciones, que se guardan
 * con el formulario; y debajo, aparte, sus pólizas y documentos (`polizas-y-documentos.tsx`).
 *
 * El formulario se guarda entero con la versión que se leyó: si otra persona lo cambió
 * mientras tanto, el servidor responde «Otra persona cambió el contrato…» y se vuelve a
 * cargar. Lo que falta para aprobar se calcula aquí con la misma regla que el servidor
 * (`faltasParaAprobarContrato`), para verlo mientras se escribe.
 *
 * Aprobado, se ve en solo lectura (RF-18). «Aprobar» y «Volver a borrador» son de la
 * gerencia (RF-3): al residente no se le muestran.
 */
import { useCallback, useState } from 'react';
import { uuidv7 } from 'uuidv7';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import {
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  CampoDeFecha,
  Casilla,
  Etiqueta,
  Formulario,
  Modal,
  Acciones,
  Seccion,
  Selector,
  Tarjeta,
} from '@/features/panel/componentes';
import type { ContratoDeObra, ContratoEditado } from '@/features/panel/contratos';
import { useListado } from '@/features/panel/marco';
import {
  BASES_DE_IMPUESTO,
  diferenciaConPresupuesto,
  faltasParaAprobarContrato,
  faltasParaGuardarContrato,
  GRUPOS_DE_TIPO_DE_CONTRATO,
  IMPUESTOS_SUGERIDOS,
  NOMBRE_DE_BASE,
  nombreDeTipoDeContrato,
  plazoEnDias,
  sumaDeParticipaciones,
  type BaseDeImpuesto,
  type TipoDeContrato,
} from '@/shared/rules/contrato';
import { enPesos } from '@/shared/rules/pesos';

import { PolizasYDocumentos } from './polizas-y-documentos';

/** Lo que se edita: los números como texto, tal como se escriben. */
interface Edicion {
  contratanteNombre: string;
  contratanteNit: string;
  contratanteDireccion: string;
  contratanteCiudad: string;
  contratanteCorreo: string;
  contratanteTelefono: string;
  representanteNombre: string;
  representanteIdentificacion: string;
  esConsorcio: boolean;
  nombreConsorcio: string;
  integrantes: { nombre: string; nit: string; porcentaje: string }[];
  tipo: TipoDeContrato | null;
  numero: string;
  objeto: string;
  fechaInicio: string;
  fechaFin: string;
  valor: string;
  anticipoPorcentaje: string;
  retencionPorcentaje: string;
  /** El porcentaje como texto, como los demás números del formulario. */
  impuestos: { id: string; nombre: string; porcentaje: string; base: BaseDeImpuesto }[];
}

const VACIO: Edicion = {
  contratanteNombre: '',
  contratanteNit: '',
  contratanteDireccion: '',
  contratanteCiudad: '',
  contratanteCorreo: '',
  contratanteTelefono: '',
  representanteNombre: '',
  representanteIdentificacion: '',
  esConsorcio: false,
  nombreConsorcio: '',
  integrantes: [],
  tipo: null,
  numero: '',
  objeto: '',
  fechaInicio: '',
  fechaFin: '',
  valor: '',
  anticipoPorcentaje: '',
  retencionPorcentaje: '',
  impuestos: [],
};

const OPCIONES_DE_TIPO = GRUPOS_DE_TIPO_DE_CONTRATO.flatMap((g) =>
  g.tipos.map((t) => ({ valor: t.id, etiqueta: t.nombre, detalle: g.grupo })),
);

const NOMBRE_DE_ACCION = {
  guardado: 'Guardado',
  aprobado: 'Aprobado',
  a_borrador: 'Vuelto a borrador',
} as const;

/** «1.500,5» o «1500.5» → 1500.5; vacío → null. */
function numeroDe(texto: string): number | null {
  const limpio = texto.trim().replace(/\s|\$/g, '');
  if (!limpio) return null;
  const normal = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/** Los pesos sin separadores: «54.441.800.920» → 54441800920. */
function pesosDe(texto: string): number | null {
  const limpio = texto.replace(/\D/g, '');
  return limpio ? Number(limpio) : null;
}

const texto = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','));

function edicionDe(c: ContratoDeObra['contrato'], valorDelPresupuesto: number | null): Edicion {
  // Sin contrato, el valor que se propone es el del presupuesto vigente (RF-15).
  if (!c)
    return {
      ...VACIO,
      valor: valorDelPresupuesto ? String(valorDelPresupuesto) : '',
    };
  return {
    contratanteNombre: c.contratanteNombre ?? '',
    contratanteNit: c.contratanteNit ?? '',
    contratanteDireccion: c.contratanteDireccion ?? '',
    contratanteCiudad: c.contratanteCiudad ?? '',
    contratanteCorreo: c.contratanteCorreo ?? '',
    contratanteTelefono: c.contratanteTelefono ?? '',
    representanteNombre: c.representanteNombre ?? '',
    representanteIdentificacion: c.representanteIdentificacion ?? '',
    esConsorcio: c.esConsorcio ?? false,
    nombreConsorcio: c.nombreConsorcio ?? '',
    integrantes: (c.integrantes ?? []).map((i) => ({
      nombre: i.nombre ?? '',
      nit: i.nit ?? '',
      porcentaje: texto(i.porcentaje),
    })),
    tipo: c.tipo ?? null,
    numero: c.numero ?? '',
    objeto: c.objeto ?? '',
    fechaInicio: c.fechaInicio ?? '',
    fechaFin: c.fechaFin ?? '',
    valor:
      c.valor === null || c.valor === undefined
        ? valorDelPresupuesto
          ? String(valorDelPresupuesto)
          : ''
        : String(c.valor),
    anticipoPorcentaje: texto(c.anticipoPorcentaje),
    retencionPorcentaje: texto(c.retencionPorcentaje),
    impuestos: (c.impuestos ?? []).map((i) => ({
      id: i.id,
      nombre: i.nombre ?? '',
      porcentaje: texto(i.porcentaje),
      base: i.base,
    })),
  };
}

/** Lo que se manda y lo que revisan las reglas. */
function datosDe(e: Edicion) {
  return {
    contratanteNombre: e.contratanteNombre,
    contratanteNit: e.contratanteNit,
    contratanteDireccion: e.contratanteDireccion,
    contratanteCiudad: e.contratanteCiudad,
    contratanteCorreo: e.contratanteCorreo,
    contratanteTelefono: e.contratanteTelefono,
    representanteNombre: e.representanteNombre,
    representanteIdentificacion: e.representanteIdentificacion,
    esConsorcio: e.esConsorcio,
    nombreConsorcio: e.nombreConsorcio,
    integrantes: e.integrantes.map((i) => ({
      nombre: i.nombre,
      nit: i.nit,
      porcentaje: numeroDe(i.porcentaje),
    })),
    tipo: e.tipo,
    numero: e.numero,
    objeto: e.objeto,
    fechaInicio: e.fechaInicio || null,
    fechaFin: e.fechaFin || null,
    valor: pesosDe(e.valor),
    anticipoPorcentaje: numeroDe(e.anticipoPorcentaje),
    retencionPorcentaje: numeroDe(e.retencionPorcentaje),
    impuestos: e.impuestos.map((i) => ({ ...i, porcentaje: numeroDe(i.porcentaje) })),
  };
}

type AvisoDeContrato = {
  tono: 'error' | 'exito';
  texto: string;
  faltas?: string[];
} | null;

export function PestanaContrato({ obraId, esGerencia }: { obraId: string | null; esGerencia: boolean }) {
  const lectura = useListado<ContratoDeObra>(useCallback(async () => [await api.contrato.de(obraId)], [obraId]));
  // El aviso vive aquí y no en el formulario: sobrevive a la recarga que sigue a guardar.
  const [aviso, setAviso] = useState<AvisoDeContrato>(null);
  const leido = lectura.datos[0];

  if (lectura.cargando && !leido) return <Text style={estilos.nota}>Cargando el contrato…</Text>;
  if (lectura.error || !leido) return <Aviso tono="error">{lectura.error ?? 'No se pudo leer el contrato.'}</Aviso>;

  return (
    <FormularioDeContrato
      // Cada versión arranca el formulario de lo guardado: tras guardar, aprobar o recargar.
      key={`${leido.obraId}-${leido.contrato?.version ?? 0}`}
      leido={leido}
      esGerencia={esGerencia}
      aviso={aviso}
      setAviso={setAviso}
      recargar={lectura.recargar}
    />
  );
}

function FormularioDeContrato({
  leido,
  esGerencia,
  aviso,
  setAviso,
  recargar,
}: {
  leido: ContratoDeObra;
  esGerencia: boolean;
  aviso: AvisoDeContrato;
  setAviso: (a: AvisoDeContrato) => void;
  recargar: () => void;
}) {
  const [edicion, setEdicion] = useState<Edicion>(() => edicionDe(leido.contrato, leido.valorDelPresupuesto));
  /** Qué se está mandando: cada botón dice lo suyo mientras espera. */
  const [enviando, setEnviando] = useState<'guardar' | 'aprobar' | 'borrador' | null>(null);
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);
  const [motivo, setMotivo] = useState('');

  const contrato = leido.contrato;
  const aprobado = contrato?.estado === 'aprobado';
  const editable = !aprobado;
  const datos = datosDe(edicion);
  const faltasDeGuardar = faltasParaGuardarContrato(datos);
  const faltasDeAprobar = faltasParaAprobarContrato(datos);
  const plazo = plazoEnDias(datos.fechaInicio, datos.fechaFin);
  const diferencia = diferenciaConPresupuesto(datos.valor, leido.valorDelPresupuesto);
  const suma = sumaDeParticipaciones(datos.integrantes);
  const cambiar = (cambio: Partial<Edicion>) => setEdicion((e) => ({ ...e, ...cambio }));

  async function hacer(cual: 'guardar' | 'aprobar' | 'borrador', accion: () => Promise<unknown>, exito: string) {
    setEnviando(cual);
    setAviso(null);
    try {
      await accion();
      setAviso({ tono: 'exito', texto: exito });
      recargar();
    } catch (fallo) {
      const faltas =
        fallo instanceof ErrorApi ? (fallo.cuerpo as { faltas?: string[] } | undefined)?.faltas : undefined;
      setAviso({ tono: 'error', texto: mensajeDe(fallo), faltas });
      // Si otra persona lo cambió, lo último se vuelve a leer para no seguir sobre lo viejo.
      if (fallo instanceof ErrorApi && fallo.estado === 409) recargar();
    } finally {
      setEnviando(null);
    }
  }

  const guardar = () =>
    hacer(
      'guardar',
      () =>
        api.contrato.guardar({
          obraId: leido.obraId,
          version: contrato?.version ?? 0,
          ...datos,
        } satisfies ContratoEditado),
      'Contrato guardado.',
    );
  const aprobar = () =>
    hacer('aprobar', () => api.contrato.aprobar(leido.obraId, contrato!.version), 'Contrato aprobado.');
  const aBorrador = () =>
    hacer(
      'borrador',
      async () => {
        await api.contrato.aBorrador(leido.obraId, contrato!.version, motivo);
        setPidiendoMotivo(false);
        setMotivo('');
      },
      'El contrato volvió a borrador.',
    );

  return (
    <View style={estilos.columna}>
      <View style={estilos.estado}>
        <Etiqueta tono={aprobado ? 'bueno' : contrato ? 'atencion' : 'neutro'}>
          {aprobado ? 'Aprobado' : contrato ? 'Borrador' : 'Sin registrar'}
        </Etiqueta>
        {aprobado ? (
          <Text style={estilos.nota}>Aprobado: para cambiarlo, la gerencia lo vuelve a borrador con un motivo.</Text>
        ) : null}
      </View>

      <Seccion titulo="Contratante">
        <Formulario>
          <Campo
            etiqueta="Nombre"
            obligatorio
            valor={edicion.contratanteNombre}
            onChange={(v) => cambiar({ contratanteNombre: v })}
            soloLectura={!editable}
          />
          <Campo
            etiqueta="NIT"
            valor={edicion.contratanteNit}
            onChange={(v) => cambiar({ contratanteNit: v })}
            ancho={180}
            soloLectura={!editable}
          />
          <Campo
            etiqueta="Dirección"
            valor={edicion.contratanteDireccion}
            onChange={(v) => cambiar({ contratanteDireccion: v })}
            soloLectura={!editable}
          />
          <Campo
            etiqueta="Ciudad"
            valor={edicion.contratanteCiudad}
            onChange={(v) => cambiar({ contratanteCiudad: v })}
            ancho={200}
            soloLectura={!editable}
          />
          <Campo
            etiqueta="Correo"
            valor={edicion.contratanteCorreo}
            onChange={(v) => cambiar({ contratanteCorreo: v })}
            ancho={260}
            soloLectura={!editable}
          />
          <Campo
            etiqueta="Teléfono"
            valor={edicion.contratanteTelefono}
            onChange={(v) => cambiar({ contratanteTelefono: v })}
            ancho={180}
            soloLectura={!editable}
          />
          <Campo
            etiqueta="Representante legal"
            valor={edicion.representanteNombre}
            onChange={(v) => cambiar({ representanteNombre: v })}
            soloLectura={!editable}
          />
          <Campo
            etiqueta="Identificación del representante"
            valor={edicion.representanteIdentificacion}
            onChange={(v) => cambiar({ representanteIdentificacion: v })}
            ancho={220}
            soloLectura={!editable}
          />
        </Formulario>
      </Seccion>

      <Seccion titulo="Contratista">
        <Formulario>
          <View style={estilos.renglon}>
            <Casilla
              etiqueta="Este contrato se ejecuta como consorcio o unión temporal"
              marcada={edicion.esConsorcio}
              onChange={(v) => cambiar({ esConsorcio: v })}
              deshabilitada={!editable}
            />
          </View>
          {edicion.esConsorcio ? (
            <>
              <Campo
                etiqueta="Nombre del consorcio o unión temporal"
                obligatorio
                valor={edicion.nombreConsorcio}
                onChange={(v) => cambiar({ nombreConsorcio: v })}
                soloLectura={!editable}
              />
              {edicion.integrantes.map((integrante, i) => (
                <View key={i} style={estilos.integrante}>
                  <Campo
                    etiqueta={`Integrante ${i + 1}`}
                    valor={integrante.nombre}
                    onChange={(v) =>
                      cambiar({
                        integrantes: edicion.integrantes.map((x, j) => (j === i ? { ...x, nombre: v } : x)),
                      })
                    }
                    ancho={320}
                    soloLectura={!editable}
                  />
                  <Campo
                    etiqueta="NIT"
                    valor={integrante.nit}
                    onChange={(v) =>
                      cambiar({
                        integrantes: edicion.integrantes.map((x, j) => (j === i ? { ...x, nit: v } : x)),
                      })
                    }
                    ancho={170}
                    soloLectura={!editable}
                  />
                  <Campo
                    etiqueta="Participación (%)"
                    valor={integrante.porcentaje}
                    onChange={(v) =>
                      cambiar({
                        integrantes: edicion.integrantes.map((x, j) => (j === i ? { ...x, porcentaje: v } : x)),
                      })
                    }
                    ancho={150}
                    soloLectura={!editable}
                  />
                  {editable ? (
                    <Boton
                      titulo="Quitar"
                      tono="secundario"
                      onPress={() =>
                        cambiar({
                          integrantes: edicion.integrantes.filter((_, j) => j !== i),
                        })
                      }
                    />
                  ) : null}
                </View>
              ))}
              <View style={[estilos.renglon, estilos.estado]}>
                {editable && edicion.integrantes.length < 10 ? (
                  <Boton
                    titulo="Agregar integrante"
                    tono="secundario"
                    onPress={() =>
                      cambiar({
                        integrantes: [...edicion.integrantes, { nombre: '', nit: '', porcentaje: '' }],
                      })
                    }
                  />
                ) : null}
                <Etiqueta
                  tono={suma === 100 ? 'bueno' : 'atencion'}
                >{`Suman ${suma.toLocaleString('es-CO')} %`}</Etiqueta>
              </View>
            </>
          ) : null}
        </Formulario>
      </Seccion>

      <Seccion titulo="Contrato y condiciones">
        <Formulario>
          {editable ? (
            <Selector
              etiqueta="Tipo de contrato"
              valor={edicion.tipo}
              opciones={OPCIONES_DE_TIPO}
              onChange={(v) => cambiar({ tipo: (v as TipoDeContrato | null) ?? null })}
              vacio="Elija el tipo"
              ancho={300}
            />
          ) : (
            <Campo
              etiqueta="Tipo de contrato"
              valor={edicion.tipo ? nombreDeTipoDeContrato(edicion.tipo) : ''}
              onChange={() => {}}
              ancho={300}
              soloLectura
            />
          )}
          <Campo
            etiqueta="Número del contrato"
            obligatorio
            valor={edicion.numero}
            onChange={(v) => cambiar({ numero: v })}
            ancho={220}
            soloLectura={!editable}
          />
          <Campo
            etiqueta="Objeto del contrato"
            valor={edicion.objeto}
            onChange={(v) => cambiar({ objeto: v })}
            multilinea
            soloLectura={!editable}
          />
          {editable ? (
            <>
              <CampoDeFecha
                etiqueta="Fecha de inicio"
                valor={edicion.fechaInicio}
                onChange={(v) => cambiar({ fechaInicio: v })}
              />
              <CampoDeFecha
                etiqueta="Fecha de fin"
                valor={edicion.fechaFin}
                onChange={(v) => cambiar({ fechaFin: v })}
                min={edicion.fechaInicio || undefined}
              />
            </>
          ) : (
            <>
              <Campo
                etiqueta="Fecha de inicio"
                valor={edicion.fechaInicio}
                onChange={() => {}}
                ancho={170}
                soloLectura
              />
              <Campo etiqueta="Fecha de fin" valor={edicion.fechaFin} onChange={() => {}} ancho={170} soloLectura />
            </>
          )}
          <Campo
            etiqueta="Plazo"
            valor={plazo === null ? '' : `${plazo} días`}
            onChange={() => {}}
            ancho={130}
            soloLectura
            ayuda="Se calcula con las fechas."
          />
          <Campo
            etiqueta="Valor del contrato"
            obligatorio
            valor={edicion.valor}
            onChange={(v) => cambiar({ valor: v })}
            ancho={240}
            soloLectura={!editable}
            ayuda={
              datos.valor !== null
                ? enPesos(datos.valor)
                : leido.valorDelPresupuesto
                  ? `Presupuesto vigente: ${enPesos(leido.valorDelPresupuesto)}`
                  : 'En pesos, sin decimales.'
            }
          />
          <Campo
            etiqueta="Anticipo (%)"
            valor={edicion.anticipoPorcentaje}
            onChange={(v) => cambiar({ anticipoPorcentaje: v })}
            ancho={150}
            soloLectura={!editable}
          />
          <Campo
            etiqueta="Retención en garantía (%)"
            valor={edicion.retencionPorcentaje}
            onChange={(v) => cambiar({ retencionPorcentaje: v })}
            ancho={200}
            soloLectura={!editable}
          />
          {diferencia ? (
            <View style={estilos.renglon}>
              <Aviso tono="info">{diferencia.texto}</Aviso>
            </View>
          ) : null}

          <View style={[estilos.renglon, estilos.impuestos]}>
            <Text style={estilos.faltasTitulo}>Impuestos y retenciones</Text>
            {edicion.impuestos.length === 0 ? (
              <Text style={estilos.nota}>Sin impuestos ni retenciones registrados.</Text>
            ) : null}
            {edicion.impuestos.map((imp, i) => {
              const cambiarImpuesto = (cambio: Partial<Edicion['impuestos'][number]>) =>
                cambiar({ impuestos: edicion.impuestos.map((x, j) => (j === i ? { ...x, ...cambio } : x)) });
              return (
                <View key={imp.id} style={estilos.integrante}>
                  <Campo
                    etiqueta="Concepto"
                    valor={imp.nombre}
                    onChange={(v) => cambiarImpuesto({ nombre: v })}
                    ancho={300}
                    soloLectura={!editable}
                  />
                  <Campo
                    etiqueta="%"
                    valor={imp.porcentaje}
                    onChange={(v) => cambiarImpuesto({ porcentaje: v })}
                    ancho={100}
                    soloLectura={!editable}
                  />
                  {editable ? (
                    <Selector
                      etiqueta="Sobre"
                      valor={imp.base}
                      opciones={BASES_DE_IMPUESTO.map((b) => ({ valor: b, etiqueta: NOMBRE_DE_BASE[b] }))}
                      onChange={(v) => v && cambiarImpuesto({ base: v as BaseDeImpuesto })}
                      ancho={200}
                    />
                  ) : (
                    <Campo
                      etiqueta="Sobre"
                      valor={NOMBRE_DE_BASE[imp.base]}
                      onChange={() => {}}
                      ancho={200}
                      soloLectura
                    />
                  )}
                  {editable ? (
                    <Boton
                      titulo="Quitar"
                      tono="secundario"
                      onPress={() => cambiar({ impuestos: edicion.impuestos.filter((_, j) => j !== i) })}
                    />
                  ) : null}
                </View>
              );
            })}
            {editable ? (
              <Acciones>
                {/* RF-21: los de uso común, sin repetir los que ya están; se pueden cambiar o quitar. */}
                {IMPUESTOS_SUGERIDOS.some((s) => !edicion.impuestos.some((i) => i.nombre === s.nombre)) ? (
                  <Boton
                    titulo="Agregar los de uso común"
                    tono="secundario"
                    onPress={() =>
                      cambiar({
                        impuestos: [
                          ...edicion.impuestos,
                          ...IMPUESTOS_SUGERIDOS.filter(
                            (s) => !edicion.impuestos.some((i) => i.nombre === s.nombre),
                          ).map((s) => ({
                            id: uuidv7(),
                            nombre: s.nombre,
                            porcentaje: texto(s.porcentaje),
                            base: s.base,
                          })),
                        ],
                      })
                    }
                  />
                ) : null}
                <Boton
                  titulo="Agregar otro"
                  tono="secundario"
                  onPress={() =>
                    cambiar({
                      impuestos: [...edicion.impuestos, { id: uuidv7(), nombre: '', porcentaje: '', base: 'corte' }],
                    })
                  }
                />
              </Acciones>
            ) : null}
          </View>

          {editable && (faltasDeGuardar.length > 0 || faltasDeAprobar.length > 0) ? (
            <View style={[estilos.renglon, estilos.faltas]}>
              <Text style={estilos.faltasTitulo}>
                {faltasDeGuardar.length > 0 ? 'Corrija antes de guardar:' : 'Para aprobarlo falta:'}
              </Text>
              {(faltasDeGuardar.length > 0 ? faltasDeGuardar : faltasDeAprobar).map((f) => (
                <Text key={f} style={estilos.nota}>{`· ${f}`}</Text>
              ))}
            </View>
          ) : null}

          {/* Junto a los botones y no arriba: es la respuesta a lo que se acaba de pulsar. */}
          {aviso ? (
            <View style={estilos.renglon}>
              <Aviso tono={aviso.tono}>
                {aviso.faltas && aviso.faltas.length > 1
                  ? `${aviso.texto}\n· ${aviso.faltas.join('\n· ')}`
                  : aviso.texto}
              </Aviso>
            </View>
          ) : null}

          <AccionesFormulario>
            {editable ? (
              <Boton
                titulo={enviando === 'guardar' ? 'Guardando…' : 'Guardar'}
                onPress={guardar}
                deshabilitado={enviando !== null || faltasDeGuardar.length > 0}
              />
            ) : null}
            {esGerencia && contrato && !aprobado ? (
              <Boton
                titulo={enviando === 'aprobar' ? 'Aprobando…' : 'Aprobar contrato'}
                tono="secundario"
                onPress={aprobar}
                deshabilitado={enviando !== null}
              />
            ) : null}
            {esGerencia && aprobado ? (
              <Boton
                titulo="Volver a borrador"
                tono="peligro"
                onPress={() => setPidiendoMotivo(true)}
                deshabilitado={enviando !== null}
              />
            ) : null}
          </AccionesFormulario>
          {contrato && !aprobado && esGerencia ? (
            <View style={estilos.renglon}>
              <Text style={estilos.nota}>Aprobar usa lo último guardado: guarde antes los cambios.</Text>
            </View>
          ) : null}
        </Formulario>
      </Seccion>

      {/* Fuera del formulario: cada póliza y documento se guarda al momento, también con el contrato aprobado. */}
      <PolizasYDocumentos leido={leido} recargar={recargar} />

      {leido.eventos.length > 0 ? (
        <Tarjeta>
          <Seccion titulo="Historial">
            {leido.eventos.slice(0, 10).map((e, i) => (
              <Text key={i} style={estilos.nota}>
                {`${NOMBRE_DE_ACCION[e.accion]} por ${e.quien} · ${new Date(e.en).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })}${e.motivo ? ` · «${e.motivo}»` : ''}`}
              </Text>
            ))}
          </Seccion>
        </Tarjeta>
      ) : null}

      {pidiendoMotivo ? (
        <Modal titulo="Volver a borrador" onCerrar={() => setPidiendoMotivo(false)}>
          <Text style={estilos.nota}>El contrato se podrá editar otra vez. El motivo queda en el historial.</Text>
          <Campo etiqueta="Motivo" obligatorio valor={motivo} onChange={setMotivo} multilinea />
          <AccionesFormulario>
            <Boton titulo="Cancelar" tono="secundario" onPress={() => setPidiendoMotivo(false)} />
            <Boton
              titulo="Volver a borrador"
              tono="peligro"
              onPress={aBorrador}
              deshabilitado={!motivo.trim() || enviando !== null}
            />
          </AccionesFormulario>
        </Modal>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 16 },
  /** Ocupa el renglón entero dentro del formulario, que acomoda sus campos en fila. */
  renglon: { width: '100%' },
  impuestos: { gap: 8, paddingTop: 8 },
  integrante: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 12,
  },
  estado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  nota: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    color: Panel.textoApoyo,
  },
  faltas: { gap: 4, paddingTop: 8 },
  faltasTitulo: {
    fontFamily: FuentePanel.texto,
    fontWeight: '700',
    fontSize: TextoPanel.cuerpo,
    color: Panel.texto,
  },
});
