/**
 * Ajustar un renglón de la propuesta antes de confirmar (spec 042, RF-21, RF-23 a RF-27, RF-29 a
 * RF-31, RF-58, RF-76, RF-77).
 *
 * Va en una ventana y no en la fila, como las actividades del plan semanal: la tabla de la propuesta
 * no da para campos editables dentro del ancho del panel.
 *
 * ── El material ──
 *
 * Se escoge entre los vigentes de la obra, la lista de materiales de OCC o «Otro» con su nombre
 * (RF-21, 009/RF-32, RF-33). Uno nuevo pide su unidad de la lista cerrada (RF-23, RF-77). El nombre
 * como lo trae el documento queda arriba, a la vista, para comparar (RF-76).
 *
 * ── La cantidad ──
 *
 * Se recalcula con `cantidadEnElMaterial`, la misma regla que usó el servidor al proponer, cada vez
 * que cambia el material o el factor: con la unidad del material nueva, la cantidad del documento se
 * vuelve a convertir (RF-24 a RF-27). Se puede escribir a mano en la unidad del material (RF-27,
 * RF-30); escrita así, se lee con la regla del ingreso a mano (`aCentesimas`: coma o punto, hasta dos
 * decimales, sin separador de miles), igual que en el formulario del Almacén.
 *
 * El valor unitario no se convierte (RF-29): se corrige tal cual, con la unidad del documento a la que
 * corresponde (RF-58). Se lee con el lector de cifras del presupuesto, que entiende «$ 30.000».
 *
 * ── La cifra por revisar ──
 *
 * Si la IA citó una cifra que no estaba en su fila, el servidor la descartó y dejó el motivo (RF-16).
 * La ventana lo muestra arriba, y la marca se quita en cuanto se escribe la cantidad o el valor:
 * escribirla es corregirla, que es lo que pide RF-83 además de quitar el renglón. Mientras no se
 * toque, el renglón sigue sin poderse confirmar.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import type { MaterialParaImportar } from '@/features/panel/almacen-importacion';
import { Acciones, Aviso, Boton, Campo, Modal, Selector } from '@/features/panel/componentes';
import { OPCIONES_DE_UNIDAD } from '@/features/panel/ventana-material';
import { abreviaturaDeUnidad, nombreDeUnidad, type UnidadAlmacen } from '@/shared/catalogos/almacen';
import { CLAVE_OTRO_MATERIAL, MATERIALES_DE_OCC } from '@/shared/catalogos/materiales';
import { aCentesimas, unidadDeTexto } from '@/shared/rules/almacen';
import {
  cantidadEnElMaterial,
  valorConSuUnidad,
  type MaterialDelRenglon,
  type RenglonDeLaImportacion,
} from '@/shared/rules/almacen-importacion';
import { numero } from '@/shared/rules/formulario-presupuesto';

/** El valor del selector de material: un vigente, uno de la lista de OCC u «Otro». */
const deExistente = (id: string) => `existente:${id}`;
const deLaLista = (nombre: string) => `lista:${nombre}`;

const aTexto = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

/** La unidad del material del renglón: la de uno vigente, o la escogida para uno nuevo. */
export function unidadDelMaterial(material: MaterialDelRenglon, materiales: readonly MaterialParaImportar[]): UnidadAlmacen | null {
  if (!material) return null;
  if (material.tipo === 'nuevo') return material.unidad;
  return materiales.find((m) => m.id === material.id)?.unidad ?? null;
}

export function VentanaDeRenglon({
  renglon,
  materiales,
  alAceptar,
  alQuitar,
  alCerrar,
}: {
  renglon: RenglonDeLaImportacion;
  materiales: readonly MaterialParaImportar[];
  alAceptar: (renglon: RenglonDeLaImportacion) => void;
  alQuitar: () => void;
  alCerrar: () => void;
}) {
  const [r, setR] = useState(renglon);
  const [textoCantidad, setTextoCantidad] = useState(aTexto(renglon.cantidad));
  const [textoFactor, setTextoFactor] = useState(aTexto(renglon.conversion?.factor ?? null));
  const [textoValor, setTextoValor] = useState(aTexto(renglon.valorUnitario));
  const [nombreOtro, setNombreOtro] = useState(renglon.material?.tipo === 'nuevo' && !renglon.material.deLaLista ? renglon.material.nombre : '');

  const unidad = unidadDelMaterial(r.material, materiales);
  const valorSelector = !r.material
    ? null
    : r.material.tipo === 'existente'
      ? deExistente(r.material.id)
      : r.material.deLaLista
        ? deLaLista(r.material.nombre)
        : CLAVE_OTRO_MATERIAL;

  /** RF-24 a RF-27: con otro material u otro factor, la cantidad del documento se convierte de nuevo. */
  function recalcular(material: MaterialDelRenglon, factor: RenglonDeLaImportacion['conversion']) {
    const enElMaterial = cantidadEnElMaterial(
      { cantidad: r.cantidadEnDocumento, unidad: r.unidadEnDocumento, factor },
      unidadDelMaterial(material, materiales),
    );
    setR({ ...r, material, cantidad: enElMaterial.cantidad, conversion: enElMaterial.conversion });
    setTextoCantidad(aTexto(enElMaterial.cantidad));
    setTextoFactor(aTexto(enElMaterial.conversion?.factor ?? null));
  }

  /** El factor que trae el documento se conserva al cambiar de material; el universal, no. */
  const factorDelDocumento = renglon.conversion && !/^\d.* = /.test(renglon.conversion.fuente) ? renglon.conversion : null;

  function escogerMaterial(valor: string | null) {
    if (!valor) return recalcular(null, factorDelDocumento);
    if (valor.startsWith('existente:')) return recalcular({ tipo: 'existente', id: valor.slice('existente:'.length) }, factorDelDocumento);
    const unidadNueva = r.material?.tipo === 'nuevo' ? r.material.unidad : null;
    if (valor === CLAVE_OTRO_MATERIAL) {
      return recalcular({ tipo: 'nuevo', nombre: nombreOtro || r.nombreEnDocumento, deLaLista: false, unidad: unidadNueva }, factorDelDocumento);
    }
    return recalcular({ tipo: 'nuevo', nombre: valor.slice('lista:'.length), deLaLista: true, unidad: unidadNueva }, factorDelDocumento);
  }

  function escogerUnidad(valor: string | null) {
    if (r.material?.tipo !== 'nuevo') return;
    recalcular({ ...r.material, unidad: (valor as UnidadAlmacen | null) ?? null }, factorDelDocumento);
  }

  function escribirFactor(texto: string) {
    setTextoFactor(texto);
    // Un factor es un número con decimales («0,5», «50»), no una cifra en pesos: coma o punto decimal.
    const limpio = texto.trim().replace(',', '.');
    const factor = limpio ? Number(limpio) : NaN;
    const conversion = Number.isFinite(factor) && factor > 0 ? { factor, fuente: 'Escrito por quien importa' } : null;
    const enElMaterial = cantidadEnElMaterial({ cantidad: r.cantidadEnDocumento, unidad: r.unidadEnDocumento, factor: conversion }, unidad);
    setR({ ...r, conversion: enElMaterial.conversion, cantidad: enElMaterial.cantidad });
    setTextoCantidad(aTexto(enElMaterial.cantidad));
  }

  function escribirCantidad(texto: string) {
    setTextoCantidad(texto);
    const centesimas = aCentesimas(texto);
    // RF-27, RF-30: escrita a mano ya no viene de una conversión. RF-83: y queda corregida.
    setR({ ...r, cantidad: centesimas === null ? null : centesimas / 100, conversion: null, revisar: null });
  }

  function escribirValor(texto: string) {
    setTextoValor(texto);
    const valor = numero(texto);
    setR({ ...r, valorUnitario: valor !== null && valor >= 0 ? valor : null, valorCalculadoDelTotal: false, revisar: null });
  }

  const opciones = [
    ...materiales.map((m) => ({ valor: deExistente(m.id), etiqueta: m.nombre, detalle: `En la obra · ${abreviaturaDeUnidad(m.unidad)}` })),
    { valor: CLAVE_OTRO_MATERIAL, etiqueta: 'Otro (nuevo, con su nombre)' },
    ...MATERIALES_DE_OCC.map((m) => ({ valor: deLaLista(m), etiqueta: m, detalle: 'Nuevo, de la lista de OCC' })),
  ];
  // RF-24: la misma comparación de la regla; sin unidad en el documento también cuenta como distinta.
  const unidadDistinta = unidad !== null && unidadDeTexto(r.unidadEnDocumento) !== unidad;

  function aceptar() {
    const material: MaterialDelRenglon =
      r.material?.tipo === 'nuevo' && !r.material.deLaLista ? { ...r.material, nombre: nombreOtro.trim() || r.material.nombre } : r.material;
    alAceptar({ ...r, material });
  }

  return (
    <Modal titulo="Ajustar renglón" onCerrar={alCerrar}>
      <View style={estilos.columna}>
        <View style={estilos.documento}>
          <Text style={estilos.pie}>{`Del documento (${r.cita || 'sin cita'})`}</Text>
          <Text style={estilos.texto}>{r.nombreEnDocumento}</Text>
          <Text style={estilos.pie}>
            {[
              r.cantidadEnDocumento !== null ? `${aTexto(r.cantidadEnDocumento)} ${r.unidadEnDocumento ?? '(sin unidad)'}` : 'Sin cantidad legible',
              valorConSuUnidad(renglon.valorUnitario, renglon.valorUnidad),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        {/* RF-16, RF-83: por qué se descartó una cifra; se corrige escribiéndola. */}
        {r.revisar ? <Aviso tono="error">{`${r.revisar} Escriba la cifra correcta o quite el renglón.`}</Aviso> : null}

        <Selector etiqueta="Material del Almacén" valor={valorSelector} opciones={opciones} onChange={escogerMaterial} vacio="Escoja el material" obligatorio />
        {r.material?.tipo === 'nuevo' && !r.material.deLaLista ? (
          <Campo etiqueta="Nombre del material nuevo" valor={nombreOtro} onChange={setNombreOtro} obligatorio />
        ) : null}
        {r.material?.tipo === 'nuevo' ? (
          <Selector etiqueta="Unidad del material nuevo" valor={r.material.unidad} opciones={OPCIONES_DE_UNIDAD} onChange={escogerUnidad} vacio="Escoja la unidad" obligatorio />
        ) : null}

        <View style={estilos.fila}>
          {unidadDistinta ? (
            <Campo
              etiqueta={`Factor: ${abreviaturaDeUnidad(unidad)} por cada ${r.unidadEnDocumento}`}
              valor={textoFactor}
              onChange={escribirFactor}
              ancho={240}
              ayuda={r.conversion ? `De: ${r.conversion.fuente}` : 'Vacío si el documento no dice cuánto trae cada una.'}
            />
          ) : null}
          <Campo
            etiqueta={unidad ? `Cantidad en ${nombreDeUnidad(unidad).toLowerCase()}` : 'Cantidad'}
            valor={textoCantidad}
            onChange={escribirCantidad}
            ancho={200}
            ayuda="Hasta dos decimales."
          />
        </View>

        <View style={estilos.fila}>
          <Campo etiqueta="Valor unitario" valor={textoValor} onChange={escribirValor} ancho={200} ayuda="Como lo trae el documento." />
          <Campo
            etiqueta="Por cada"
            valor={r.valorUnidad ?? ''}
            onChange={(valorUnidad) => setR({ ...r, valorUnidad: valorUnidad || null })}
            ancho={160}
            ayuda="La unidad del documento."
          />
        </View>

        <Acciones>
          <Boton titulo="Aceptar" tono="primario" onPress={aceptar} />
          <Boton titulo="Quitar del documento" tono="peligro" onPress={alQuitar} />
          <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
        </Acciones>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  fila: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  documento: { gap: 2, paddingBottom: 4 },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  pie: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
