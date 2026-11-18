/**
 * El ícono de la pestaña del navegador: una «K» de Kontrola, amarilla sobre grafito
 * (spec 049, RF-14; decisión D6 de Diego). Son los colores de la barra superior.
 *
 * Es un SVG en línea y no un archivo de imagen: dibujar la K en PNG pediría una
 * herramienta de imágenes nueva (constitución, principio 8), y un archivo nuevo
 * obligaría a tocar `app.json`, que lleva el ícono de la app del celular. El panel lo
 * pone en el `<head>` al montar (`_layout.tsx`); antes de eso, en la primera carga,
 * puede verse un instante la flecha de siempre (plan, decisiones).
 *
 * La letra es la de rótulo del panel, con respaldo del sistema: si la fuente aún no
 * cargó, la K sale igual. Puro y sin React Native: lo prueba la verificación en Node.
 */
import { Panel } from '@/constants/paleta';
import { FuentePanel } from '@/constants/medidas';
import { MARCA } from '@/shared/catalogos/marca';

export function iconoDeLaPestana(): string {
  const letra = MARCA.sistema.charAt(0).toUpperCase();
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    `<rect width="32" height="32" rx="7" fill="${Panel.barra}"/>` +
    `<text x="16" y="23.5" text-anchor="middle" font-family="${FuentePanel.rotulo.replace(/"/g, '')}" ` +
    `font-size="22" font-weight="700" fill="${Panel.acento}">${letra}</text>` +
    '</svg>';
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
