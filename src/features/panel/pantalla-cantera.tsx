/**
 * El control de los viajes de cantera (spec 010). **Por ahora, provisional.**
 *
 * Existe antes que su contenido por la spec 008: el encargado de planta tiene que
 * tener a dónde entrar, y la gerencia y el residente tienen que ver el módulo en
 * su menú (RF-3, RF-11, RF-12). La ruta y el `modulo` son los definitivos: la
 * spec 010 llena la pantalla sin mover nada más.
 */
import { MarcoPantalla } from './marco';
import { Aviso } from './componentes';

export default function PantallaCantera() {
  return (
    <MarcoPantalla
      modulo="cantera"
      exigeObra
      titulo="Control Cantera"
      descripcion="Los viajes de las volquetas: qué material, de dónde a dónde y dónde se descargó."
    >
      <Aviso tono="info">
        Este módulo todavía no tiene contenido: el registro de sitios, materiales y viajes llega
        con la próxima entrega.
      </Aviso>
    </MarcoPantalla>
  );
}
