/**
 * Prepara la base local antes de dejar entrar a la app: aplica migraciones y
 * siembra lo que falte. Es lo único que puede mostrar un spinner en el arranque
 * — de aquí en adelante ninguna pantalla espera.
 */
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import migraciones from '../../../drizzle/local/migrations';
import { Colors, Marca, Spacing, Texto } from '@/constants/theme';

import { db } from './client';
import { sembrarBaseLocal } from './seed';

type Estado = 'migrando' | 'sembrando' | 'listo' | 'error';

export function ProveedorBaseLocal({ children }: { children: ReactNode }) {
  const { success: migrado, error: errorMigracion } = useMigrations(db, migraciones);
  const [sembrado, setSembrado] = useState(false);
  const [errorSiembra, setErrorSiembra] = useState<Error | null>(null);

  useEffect(() => {
    if (!migrado) return;

    let cancelado = false;
    sembrarBaseLocal()
      .then(() => {
        if (!cancelado) setSembrado(true);
      })
      .catch((e: Error) => {
        if (!cancelado) setErrorSiembra(e);
      });

    return () => {
      cancelado = true;
    };
  }, [migrado]);

  // El estado se deriva en vez de guardarse: así el efecto solo escribe cuando
  // la siembra termina, y no hay un `setState` en el cuerpo que dispare un
  // render en cascada.
  const error = errorMigracion ?? errorSiembra;
  const estado: Estado = error
    ? 'error'
    : !migrado
      ? 'migrando'
      : sembrado
        ? 'listo'
        : 'sembrando';

  if (estado === 'error') {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>No se pudo preparar la aplicación</Text>
        <Text style={estilos.detalle}>{error?.message ?? 'Error desconocido'}</Text>
        <Text style={estilos.ayuda}>
          Informe a su supervisor. Sus registros guardados no se han perdido.
        </Text>
      </View>
    );
  }

  if (estado !== 'listo') {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={Marca.primario} />
        <Text style={estilos.detalle}>
          {estado === 'migrando' ? 'Preparando la base de datos…' : 'Cargando los formatos…'}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    backgroundColor: Colors.light.background,
  },
  titulo: {
    fontSize: Texto.titulo,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
  },
  detalle: {
    fontSize: Texto.base,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  ayuda: {
    fontSize: Texto.pie,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
