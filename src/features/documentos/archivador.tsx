/**
 * Documentos de una empresa o de una obra como archivador (spec 051).
 *
 * La lista de la spec 034 escondía lo que faltaba: una clase sin ningún documento no aparecía por
 * ningún lado. Aquí se ven primero **todas** las carpetas, una por clase y en el orden del catálogo
 * (RF-4, RF-5), con las vacías en gris, y al entrar a una se ven sus documentos.
 *
 * Es un componente aparte y no un modo de `CarpetaDeDocumentos`: esa la montan también la ficha de
 * una persona, la requisición y el pago, con sus variantes, y la spec pide que esas tres no
 * cambien (RF-2). Lo que se comparte —las ventanas de subir y de anular, y las reglas— se importa.
 *
 * Las cifras de arriba son las de la spec 034 y se quedan como información: pulsarlas no filtra
 * (RF-56). Filtrar ya lo hace la casilla de vencidos, y dos maneras de hacer lo mismo confunden.
 *
 * Qué carpeta está abierta no lo decide este componente: lo lee la pantalla de la dirección
 * (`?carpeta=`, T4 de la 051) y lo pasa ya resuelto, porque el título, la ruta y la pestaña también
 * lo necesitan, y viven en el marco.
 *
 * El buscador busca en **todas** las carpetas aunque haya una abierta (RF-38, D6): quien busca «cámara
 * de comercio» no sabe, o no debería tener que saber, en qué carpeta la guardaron. Mientras hay texto
 * mandan los resultados, cada uno con el nombre de su carpeta; al borrarlo se vuelve a donde se estaba
 * (RF-41), porque la carpeta sigue en la dirección. La búsqueda va con `replace` en la dirección —no
 * llena el historial de letras— y la carpeta con `push`, que es lo que deshace «atrás». El texto lo
 * lee la pantalla y llega por props, porque mientras se busca el título dice «Documentos» (RF-80).
 */
import { useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AnchoMinimoCarpeta, AnchoMinimoTarjetaDeDocumento, Spacing } from '@/constants/theme';
import { VentanaDeAnular } from '@/features/contratos/polizas-y-documentos';
// Solo el tipo: `import type` no queda en el paquete, así que no vuelve a crear el ciclo con la pantalla.
import type { DocumentosCargados } from '@/features/documentos/pantalla-documentos';
import { TarjetaDeCarpeta, TarjetaDeDocumento } from '@/features/documentos/tarjetas';
import { VentanaDeSubir } from '@/features/documentos/ventana-de-subir';
import { useAvisos } from '@/features/panel/avisos';
import { api, type LugarDeLosDocumentos } from '@/features/panel/cliente-api';
import {
  Acciones,
  BarraDeListado,
  Boton,
  Casilla,
  Cifra,
  Cifras,
  ListaVacia,
  Paginacion,
} from '@/features/panel/componentes';
import type { DocumentoDelLugar } from '@/features/panel/contratos';
import { POR_PAGINA } from '@/features/panel/paginas';
import { useEsAngosto } from '@/features/panel/usar-ancho';
import { carpetasDe, coincideBusqueda, type CarpetaDelArchivador, type LugarDeDocumentos } from '@/shared/rules/documentos';

export function ArchivadorDeDocumentos({
  cargados,
  pedido,
  deQuien,
  carpetas,
  abierta,
  busqueda,
  buscar,
  alAbrir,
  alVolver,
  puedeSubir,
  puedeAnular,
  subida,
}: {
  cargados: DocumentosCargados;
  pedido: LugarDeLosDocumentos;
  deQuien: LugarDeDocumentos;
  /** `carpetasDe` sobre lo cargado; la pantalla ya las arma para saber el nombre de la abierta. */
  carpetas: CarpetaDelArchivador[];
  /** La carpeta de la dirección, si existe en este lugar (RF-21, RF-22). */
  abierta: CarpetaDelArchivador | null;
  /** El texto del buscador, que vive en la dirección (`?buscar=`) y lo lee la pantalla (RF-80). */
  busqueda: string;
  buscar: (texto: string) => void;
  alAbrir: (carpeta: string) => void;
  alVolver: () => void;
  puedeSubir: boolean;
  puedeAnular: boolean;
  /** «Subir documento» va en el encabezado de la pantalla (050/RF-30); desde ahí se abre la ventana. */
  subida: { abierta: boolean; alCambiar: (abierta: boolean) => void };
}) {
  const datos = cargados.datos[0];
  const documentos = datos?.documentos ?? [];
  const resumen = datos?.resumen ?? { vencidos: 0, porVencer: 0 };
  const vigentes = documentos.filter((d) => d.anulado === null).length;
  const anulados = documentos.length - vigentes;
  const avisos = useAvisos();
  const [anulando, setAnulando] = useState<DocumentoDelLugar | null>(null);

  // RF-43, RF-45: las dos casillas de la 034 aplican dentro de una carpeta y en la búsqueda; en las
  // carpetas, la de vencidos esconde las que no tienen nada que atender (RF-44) y la de anulados no
  // cambia los números (RF-67: las carpetas nunca cuentan anulados).
  const [soloConAviso, setSoloConAviso] = useState(false);
  const [verAnulados, setVerAnulados] = useState(false);
  const buscando = busqueda.trim().length > 0;
  const pasa = (d: DocumentoDelLugar) => (verAnulados || d.anulado === null) && (!soloConAviso || d.aviso !== null);
  const limpiar = () => {
    buscar('');
    setSoloConAviso(false);
    setVerAnulados(false);
  };

  const deLaCarpeta = abierta ? documentos.filter((d) => d.clase === abierta.id) : [];
  const enLaCarpeta = deLaCarpeta.filter(pasa);
  const resultados = buscando ? documentos.filter((d) => pasa(d) && coincideBusqueda(d, busqueda)) : [];
  // RF-9, RF-67, RF-76: con «Ver anulados» aparecen también las que solo tienen anulados.
  const delLugar = verAnulados ? carpetasDe(deQuien, documentos, { conAnulados: true }) : carpetas;
  const carpetasVisibles = soloConAviso ? delLugar.filter((c) => c.vencidos + c.porVencer > 0) : delLugar;
  const nombreDeCarpeta = new Map(carpetas.map((c) => [c.id, c.nombre]));

  // Lo que hay detrás de cada vista, para la cuenta de la barra: «3 de 12».
  const cuenta = buscando
    ? { total: verAnulados ? documentos.length : vigentes, mostradas: resultados.length }
    : abierta
      ? {
          total: verAnulados ? deLaCarpeta.length : deLaCarpeta.filter((d) => d.anulado === null).length,
          mostradas: enLaCarpeta.length,
        }
      : {
          total: vigentes,
          mostradas: soloConAviso ? documentos.filter((d) => d.anulado === null && d.aviso !== null).length : vigentes,
        };

  // RF-49 a RF-51: desde una carpeta —vacía, o la abierta— la ventana trae su clase; desde el
  // encabezado sin carpeta, ninguna. La clase se puede cambiar en la ventana (RF-50).
  const [claseParaSubir, setClaseParaSubir] = useState<string | undefined>(undefined);
  const subirEn = (clase: string) => {
    setClaseParaSubir(clase);
    subida.alCambiar(true);
  };
  const cerrarSubida = () => {
    setClaseParaSubir(undefined);
    subida.alCambiar(false);
  };
  const subirElPrimero =
    puedeSubir && abierta ? <Boton titulo="Subir documento" onPress={() => subirEn(abierta.id)} /> : undefined;

  return (
    <>
      {/* RF-12, RF-56: lo que hay que renovar, arriba de todo, sin pulsarse. */}
      <Cifras>
        <Cifra titulo="Vencidos" valor={String(resumen.vencidos)} tono={resumen.vencidos > 0 ? 'malo' : 'neutro'} />
        <Cifra
          titulo="Vencen en 30 días"
          valor={String(resumen.porVencer)}
          tono={resumen.porVencer > 0 ? 'atencion' : 'neutro'}
        />
        <Cifra titulo="Vigentes" valor={String(vigentes)} pie={anulados ? `y ${anulados} anulados` : undefined} />
      </Cifras>

      {/* RF-46: sin selector de clase; cada carpeta es una. */}
      <BarraDeListado
        busqueda={busqueda}
        onBuscar={buscar}
        total={cuenta.total}
        mostradas={cuenta.mostradas}
        onLimpiar={limpiar}
      />
      <Acciones>
        <Casilla etiqueta="Solo vencidos o por vencer" marcada={soloConAviso} onChange={setSoloConAviso} />
        <Casilla etiqueta="Ver anulados" marcada={verAnulados} onChange={setVerAnulados} />
      </Acciones>

      {buscando ? (
        // RF-38 a RF-42, RF-59, RF-66: aunque la dirección traiga carpeta, mandan los resultados.
        <ListaDeDocumentos
          key={`buscar:${busqueda}`}
          documentos={resultados}
          carpetaDe={(d) => nombreDeCarpeta.get(d.clase) ?? d.claseNombre}
          vacio={<ListaVacia vacio="" sinResultados={{ alQuitar: limpiar }} />}
          alAnular={puedeAnular ? setAnulando : undefined}
        />
      ) : abierta ? (
        <>
          {/* RF-18 */}
          <Acciones>
            <Boton titulo="← Todas las carpetas" tono="secundario" onPress={alVolver} />
          </Acciones>
          <ListaDeDocumentos
            key={`carpeta:${abierta.id}`}
            documentos={enLaCarpeta}
            // RF-60, D16: una carpeta sin nada que mostrar enseña el vacío de las listas, con su botón.
            vacio={
              <ListaVacia
                vacio={{ icono: '🗀', texto: 'No hay documentos que mostrar en esta carpeta.', accion: subirElPrimero }}
              />
            }
            alAnular={puedeAnular ? setAnulando : undefined}
          />
        </>
      ) : carpetasVisibles.length === 0 ? (
        // RF-70: sin documentos, el vacío de las listas con «Subir documento». Si lo que esconde las
        // carpetas es la casilla de vencidos, se dice así y se ofrece quitarla (050/RF-54).
        <ListaVacia
          vacio={{
            icono: '🗀',
            texto: 'Todavía no hay documentos aquí. Al subir el primero se crea su carpeta.',
            accion: puedeSubir ? <Boton titulo="Subir documento" onPress={() => subida.alCambiar(true)} /> : undefined,
          }}
          sinResultados={soloConAviso && delLugar.length > 0 ? { alQuitar: limpiar } : undefined}
        />
      ) : (
        <Cuadricula minimo={AnchoMinimoCarpeta} etiqueta="Carpetas de documentos">
          {(ancho) =>
            carpetasVisibles.map((c) => (
              <View key={c.id} style={{ width: ancho }}>
                <TarjetaDeCarpeta carpeta={c} alAbrir={() => alAbrir(c.id)} />
              </View>
            ))
          }
        </Cuadricula>
      )}

      {subida.abierta ? (
        <VentanaDeSubir
          pedido={pedido}
          lugar={deQuien}
          sinPrecio={false}
          // Spec 051, RF-71: con las carpetas del lugar se ofrece también «＋ Nueva carpeta…».
          carpetas={carpetas}
          claseInicial={claseParaSubir ?? abierta?.id}
          alCerrar={cerrarSubida}
          alGuardar={(clase) => {
            // RF-52, RF-53, D7: se recargan los números y se abre la carpeta donde quedó el
            // documento, sin búsqueda, para verlo. Si ya es la abierta, basta con recargar.
            cerrarSubida();
            avisos.exito('Documento subido.');
            buscar('');
            cargados.recargar();
            if (clase !== abierta?.id) alAbrir(clase);
          }}
        />
      ) : null}
      {anulando ? (
        <VentanaDeAnular
          titulo={`Anular «${anulando.nombre}»`}
          aviso="El documento sigue en su carpeta, marcado como anulado, con el motivo, y se puede seguir abriendo. Si hay que corregirlo, súbalo de nuevo."
          alCerrar={() => setAnulando(null)}
          alAnular={async (motivo) => {
            await api.documentos.anular(anulando.id, motivo);
            setAnulando(null);
            avisos.exito('Documento anulado.');
            cargados.recargar();
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Documentos en tarjetas, del más reciente al más antiguo por la fecha del documento (RF-23, RF-66) y en
 * páginas como las demás listas (RF-24). Sirve a la carpeta abierta y a la búsqueda; en la búsqueda cada
 * tarjeta dice su carpeta (RF-40). Quien la monta le pone una `key` por carpeta o por texto, y así la
 * página vuelve a la primera cuando cambia lo que se está viendo.
 */
function ListaDeDocumentos({
  documentos,
  carpetaDe,
  vacio,
  alAnular,
}: {
  documentos: DocumentoDelLugar[];
  carpetaDe?: (documento: DocumentoDelLugar) => string;
  vacio: ReactNode;
  alAnular?: (documento: DocumentoDelLugar) => void;
}) {
  const [pagina, setPagina] = useState(1);
  if (documentos.length === 0) return <>{vacio}</>;
  const ordenados = [...documentos].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || b.subidoEn.localeCompare(a.subidoEn),
  );
  // Si una casilla deja menos páginas que la que se veía, la última que queda.
  const paginas = Math.max(1, Math.ceil(ordenados.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  const enLaPagina = ordenados.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);

  return (
    <>
      <Cuadricula minimo={AnchoMinimoTarjetaDeDocumento} etiqueta="Documentos">
        {(ancho) =>
          enLaPagina.map((d) => (
            <View key={d.id} style={{ width: ancho }}>
              <TarjetaDeDocumento
                documento={d}
                carpeta={carpetaDe?.(d)}
                alAbrir={(descargar) => abrir(api.documentos.urlDelArchivo(d.mediaId, descargar))}
                alAnular={alAnular ? () => alAnular(d) : undefined}
              />
            </View>
          ))
        }
      </Cuadricula>
      <Paginacion pagina={actual} porPagina={POR_PAGINA} total={ordenados.length} onCambiar={setPagina} />
    </>
  );
}

function abrir(url: string) {
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
}

/**
 * Una cuadrícula de tarjetas del mismo ancho: tantas columnas como quepan sin bajar de `minimo`, y una
 * sola en el celular (RF-14, RF-37). Se mide el marco y no la ventana, porque el menú abierto o
 * plegado cambia lo que queda. Hasta medir no se pinta nada: con un ancho supuesto, las tarjetas
 * saltarían de sitio en el primer cuadro.
 */
function Cuadricula({
  minimo,
  etiqueta,
  children,
}: {
  minimo: number;
  etiqueta: string;
  children: (anchoDeCelda: number) => ReactNode;
}) {
  const angosto = useEsAngosto();
  const [ancho, setAncho] = useState(0);
  const columnas = angosto ? 1 : Math.max(1, Math.floor((ancho + Spacing.three) / (minimo + Spacing.three)));
  // Hacia abajo: el marco mide con decimales, y la última de la fila, medio píxel más ancha, se iba a
  // la siguiente.
  const anchoDeCelda = Math.floor((ancho - Spacing.three * (columnas - 1)) / columnas);
  return (
    <View style={estilos.cuadricula} onLayout={(e) => setAncho(e.nativeEvent.layout.width)} aria-label={etiqueta}>
      {ancho > 0 ? children(anchoDeCelda) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  cuadricula: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
});
