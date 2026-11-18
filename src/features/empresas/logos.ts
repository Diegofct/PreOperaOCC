/**
 * El logo de cada empresa del grupo (spec 049, RF-16 a RF-19, RF-27, RF-51, RF-52).
 *
 * Es el **único** catálogo: lo leen la card del inicio de Gerencia y la cabecera del menú,
 * y por eso las dos muestran siempre el mismo logo. Si cambia un logo, se pone el archivo en
 * `assets/` y se cambia su línea aquí; ninguna pantalla nombra la imagen por su cuenta (RNF).
 *
 * Los de Elemental y OCC son copias **recortadas** de los que entregó Diego (RF-57): los
 * originales traían hasta un 10 % de blanco alrededor y el dibujo se veía pequeño en su caja.
 * Los originales siguen en `assets/` sin tocar. El de GeoLab va tal cual: su fondo oscuro es
 * parte de la insignia, y en las cajas se muestra igual o más pequeño que su archivo (85×84),
 * así que no se ve borroso (D15, D17).
 *
 * `null` es «sin logo»: se muestra el nombre como logotipo de texto (RF-17), lo que queda para
 * una empresa nueva. Proyectos no es una empresa con logo: va con su ícono (RF-19, RF-53).
 *
 * Vive aquí y no junto a `EMPRESAS` en `shared/rules/empresas.ts`: esa regla es pura y la
 * usa el servidor, y un `require` de imagen la arrastraría al servidor y a la verificación.
 */
import type { ImageSourcePropType } from 'react-native';

import type { EmpresaId } from '@/shared/rules/empresas';

/**
 * La imagen con su tamaño de archivo, en píxeles. El tamaño va escrito y no se le pregunta a la
 * imagen: en el navegador no siempre lo informa, y sin él no se puede garantizar que un logo
 * pequeño (GeoLab, 85×84) nunca se agrande (D17).
 */
export interface LogoDeEmpresa {
  fuente: ImageSourcePropType;
  ancho: number;
  alto: number;
}

const LOGOS: Record<EmpresaId, LogoDeEmpresa | null> = {
  elemental: { fuente: require('@/../assets/elemental-recortado.jpg'), ancho: 1200, alto: 424 },
  occ: { fuente: require('@/../assets/occ-recortado.png'), ancho: 1200, alto: 675 },
  geolab: { fuente: require('@/../assets/logo-geolab.jpeg'), ancho: 85, alto: 84 },
  proyectos: null,
};

export function logoDeEmpresa(id: EmpresaId): LogoDeEmpresa | null {
  return LOGOS[id];
}
