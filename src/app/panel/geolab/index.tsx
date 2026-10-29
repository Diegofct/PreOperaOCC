import { PortadaDeEmpresa } from '@/features/empresas/paginas-de-empresa';

/** Spec 033, RF-5: al entrar a la empresa, la primera página de su menú. */
export default function Portada() {
  return <PortadaDeEmpresa empresa="geolab" />;
}
