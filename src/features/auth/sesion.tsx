/**
 * Estado de sesión del operador.
 *
 * Cuatro estados y nada más:
 *   · cargando     — leyendo el almacén seguro al arrancar
 *   · sin_enrolar  — este equipo todavía no tiene dueño: usuario + PIN
 *   · bloqueada    — hay dueño; solo falta el PIN. Funciona sin red.
 *   · abierta      — se puede trabajar
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { guardarEnrolamiento, guardarTokens, leerEnrolamiento, olvidarEquipo } from './almacen';
import {
  esperaRestante,
  intentosRestantes,
  leerIntentos,
  limpiarIntentos,
  mensajeDeEspera,
  registrarFallo,
  type EstadoIntentos,
} from './intentos';
import { derivarVerificador, esPinValido, generarSalt, verificarPin } from './pin';
import { autenticar, MENSAJES_AUTH, usuarioPorId, type UsuarioAutenticado } from './servicio';

export type EstadoSesion = 'cargando' | 'sin_enrolar' | 'bloqueada' | 'abierta';

export interface Respuesta {
  ok: boolean;
  mensaje?: string;
}

interface ValorSesion {
  estado: EstadoSesion;
  usuario: UsuarioAutenticado | null;
  /** Nombre de usuario enrolado, para saludarlo en la pantalla de desbloqueo. */
  usuarioEnrolado: string | null;
  esperaMs: number;
  intentosQueQuedan: number;
  ocupado: boolean;
  enrolar: (usuario: string, pin: string) => Promise<Respuesta>;
  desbloquear: (pin: string) => Promise<Respuesta>;
  bloquear: () => void;
  desenrolar: () => Promise<void>;
}

const SIN_INTENTOS: EstadoIntentos = { fallidos: 0, bloqueadoHasta: 0 };

const ContextoSesion = createContext<ValorSesion | null>(null);

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error('useSesion() fuera de <ProveedorSesion>.');
  return valor;
}

/** El usuario de la sesión abierta. Para pantallas que solo se ven con sesión. */
export function useUsuario(): UsuarioAutenticado {
  const { usuario } = useSesion();
  if (!usuario) throw new Error('useUsuario() sin sesión abierta.');
  return usuario;
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando');
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [usuarioEnrolado, setUsuarioEnrolado] = useState<string | null>(null);
  const [intentos, setIntentos] = useState<EstadoIntentos>(SIN_INTENTOS);
  const [ahora, setAhora] = useState(() => Date.now());
  const [ocupado, setOcupado] = useState(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const [enrolamiento, guardados] = await Promise.all([leerEnrolamiento(), leerIntentos()]);
      if (!montado.current) return;
      setIntentos(guardados);
      setUsuarioEnrolado(enrolamiento?.usuario ?? null);
      setEstado(enrolamiento ? 'bloqueada' : 'sin_enrolar');
    })();
  }, []);

  const esperaMs = esperaRestante(intentos, ahora);

  // Solo corre mientras hay una espera activa: un intervalo permanente
  // despertaría el hilo de JS cada segundo sin ninguna razón.
  useEffect(() => {
    if (esperaMs <= 0) return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [esperaMs]);

  const enrolar = useCallback(async (nombreUsuario: string, pin: string): Promise<Respuesta> => {
    if (!esPinValido(pin)) return { ok: false, mensaje: 'El PIN son 6 dígitos.' };
    setOcupado(true);
    try {
      const resultado = await autenticar(nombreUsuario, pin);
      if (!resultado.ok) return { ok: false, mensaje: MENSAJES_AUTH[resultado.error] };

      const salt = generarSalt();
      const verificador = await derivarVerificador(pin, salt);
      await guardarEnrolamiento({
        usuarioId: resultado.usuario.id,
        usuario: resultado.usuario.usuario,
        salt,
        verificador,
      });
      if (resultado.accessToken && resultado.refreshToken) {
        await guardarTokens(resultado.accessToken, resultado.refreshToken);
      }
      await limpiarIntentos();

      if (!montado.current) return { ok: true };
      setIntentos(SIN_INTENTOS);
      setUsuarioEnrolado(resultado.usuario.usuario);
      setUsuario(resultado.usuario);
      setEstado('abierta');
      return { ok: true };
    } finally {
      if (montado.current) setOcupado(false);
    }
  }, []);

  const desbloquear = useCallback(async (pin: string): Promise<Respuesta> => {
    const guardados = await leerIntentos();
    const restante = esperaRestante(guardados);
    if (restante > 0) {
      setIntentos(guardados);
      setAhora(Date.now());
      return { ok: false, mensaje: mensajeDeEspera(restante) };
    }
    if (!esPinValido(pin)) return { ok: false, mensaje: 'El PIN son 6 dígitos.' };

    const enrolamiento = await leerEnrolamiento();
    if (!enrolamiento) {
      if (montado.current) setEstado('sin_enrolar');
      return { ok: false, mensaje: 'Este equipo no está activado.' };
    }

    setOcupado(true);
    try {
      const correcto = await verificarPin(pin, enrolamiento.salt, enrolamiento.verificador);

      if (!correcto) {
        const fallo = await registrarFallo();

        if (fallo.debeOlvidarEquipo) {
          // Se borran las credenciales. Los registros de trabajo NO se tocan.
          await olvidarEquipo();
          await limpiarIntentos();
          if (montado.current) {
            setIntentos(SIN_INTENTOS);
            setUsuarioEnrolado(null);
            setEstado('sin_enrolar');
          }
          return {
            ok: false,
            mensaje:
              'Demasiados intentos. Debe activar el equipo otra vez con su usuario y PIN. Sus registros siguen guardados.',
          };
        }

        if (montado.current) {
          setIntentos(fallo);
          setAhora(Date.now());
        }
        const espera = esperaRestante(fallo);
        return {
          ok: false,
          mensaje:
            espera > 0
              ? mensajeDeEspera(espera)
              : `PIN incorrecto. Le quedan ${intentosRestantes(fallo.fallidos)} intentos.`,
        };
      }

      const encontrado = await usuarioPorId(enrolamiento.usuarioId);
      await limpiarIntentos();
      if (!montado.current) return { ok: true };
      setIntentos(SIN_INTENTOS);
      if (!encontrado) {
        return { ok: false, mensaje: 'No encontramos su usuario en este equipo.' };
      }
      setUsuario(encontrado);
      setEstado('abierta');
      return { ok: true };
    } finally {
      if (montado.current) setOcupado(false);
    }
  }, []);

  const bloquear = useCallback(() => {
    setUsuario(null);
    setEstado('bloqueada');
  }, []);

  const desenrolar = useCallback(async () => {
    await olvidarEquipo();
    await limpiarIntentos();
    if (!montado.current) return;
    setUsuario(null);
    setUsuarioEnrolado(null);
    setIntentos(SIN_INTENTOS);
    setEstado('sin_enrolar');
  }, []);

  const valor = useMemo<ValorSesion>(
    () => ({
      estado,
      usuario,
      usuarioEnrolado,
      esperaMs,
      intentosQueQuedan: intentosRestantes(intentos.fallidos),
      ocupado,
      enrolar,
      desbloquear,
      bloquear,
      desenrolar,
    }),
    [
      estado,
      usuario,
      usuarioEnrolado,
      esperaMs,
      intentos.fallidos,
      ocupado,
      enrolar,
      desbloquear,
      bloquear,
      desenrolar,
    ],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}
