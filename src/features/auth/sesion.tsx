/**
 * Estado de sesión del operador.
 *
 * Seis estados, y el orden en que se recorren es el recorrido real de un equipo:
 *
 *   · cargando       — leyendo el almacén seguro al arrancar
 *   · sin_enrolar    — este equipo no tiene dueño: usuario + código de activación
 *   · recuperando    — olvidó el PIN: código de respaldo. **Funciona sin red**
 *   · definiendo_pin — activado (o recuperado): ahora elige su PIN
 *   · bloqueada      — hay dueño; solo falta el PIN. Sin red
 *   · abierta        — se puede trabajar
 *
 * De todos ellos, **solo `sin_enrolar` necesita señal**. Todo lo demás se
 * resuelve contra este mismo teléfono, que es lo que permite trabajar en un
 * frente sin cobertura — incluida la recuperación del PIN olvidado.
 *
 * El PIN se deriva aquí y no sale nunca: el servidor no tiene dónde guardarlo ni
 * forma de consultarlo, y esa es exactamente la propiedad que hace que la firma
 * de un preoperacional signifique algo.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import {
  guardarEnrolamiento,
  guardarHashRespaldo,
  guardarTokens,
  leerEnrolamiento,
  leerHashRespaldo,
  olvidarEquipo,
  olvidarHashRespaldo,
} from './almacen';
import {
  esperaRestante,
  intentosRestantes,
  leerIntentos,
  limpiarIntentos,
  mensajeDeEspera,
  registrarFallo,
  type EstadoIntentos,
} from './intentos';
import {
  derivarVerificador,
  esPinValido,
  generarSalt,
  verificarContraHashDelServidor,
  verificarPin,
} from './pin';
import { canjearActivacion, MENSAJES_AUTH, type UsuarioAutenticado } from './servicio';
import { usuarioPorId } from './usuario-local';

export type EstadoSesion =
  | 'cargando'
  | 'sin_enrolar'
  | 'recuperando'
  | 'definiendo_pin'
  | 'bloqueada'
  | 'abierta';

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
  /** Este equipo puede recuperar el PIN sin señal. */
  hayRespaldo: boolean;
  activar: (usuario: string, codigo: string) => Promise<Respuesta>;
  definirPin: (pin: string) => Promise<Respuesta>;
  desbloquear: (pin: string) => Promise<Respuesta>;
  iniciarRecuperacion: () => void;
  cancelarRecuperacion: () => void;
  comprobarRespaldo: (codigo: string) => Promise<Respuesta>;
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
  const [hayRespaldo, setHayRespaldo] = useState(false);
  /**
   * Quién quedó a medio enrolar entre activar (o recuperar) y definir el PIN.
   *
   * Vive en memoria y no en el almacén seguro a propósito: si la app se cierra
   * en ese punto, el equipo vuelve a pedir el código. Guardar a medias dejaría
   * un teléfono con dueño y sin llave.
   */
  const aMedias = useRef<{ usuarioId: string; usuario: string } | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const [enrolamiento, guardados, respaldo] = await Promise.all([
        leerEnrolamiento(),
        leerIntentos(),
        leerHashRespaldo(),
      ]);
      if (!montado.current) return;
      setIntentos(guardados);
      setUsuarioEnrolado(enrolamiento?.usuario ?? null);
      setHayRespaldo(respaldo !== null);
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

  /**
   * Canjea el código de activación. **Lo único que necesita señal.**
   *
   * No abre la sesión: deja el equipo en `definiendo_pin`, porque el PIN todavía
   * no existe. Los tokens y el hash del respaldo sí se guardan ya — si la app
   * muere entre un paso y otro, lo que se pierde es un código de activación, no
   * el acceso.
   */
  const activar = useCallback(
    async (nombreUsuario: string, codigo: string): Promise<Respuesta> => {
      setOcupado(true);
      try {
        const resultado = await canjearActivacion(nombreUsuario, codigo);
        if (!resultado.ok) {
          return { ok: false, mensaje: resultado.mensaje ?? MENSAJES_AUTH[resultado.error] };
        }

        await guardarTokens(resultado.accessToken, resultado.refreshToken);
        if (resultado.hashRespaldo) await guardarHashRespaldo(resultado.hashRespaldo);
        await limpiarIntentos();

        aMedias.current = {
          usuarioId: resultado.usuario.id,
          usuario: resultado.usuario.usuario,
        };

        if (!montado.current) return { ok: true };
        setIntentos(SIN_INTENTOS);
        setHayRespaldo(resultado.hashRespaldo !== null);
        setEstado('definiendo_pin');
        return { ok: true };
      } finally {
        if (montado.current) setOcupado(false);
      }
    },
    [],
  );

  /**
   * El operador elige su PIN. Aquí se deriva el verificador y **aquí se queda**.
   *
   * Sirve para los dos caminos que llevan a este punto: acabar de activar el
   * equipo, y recuperarlo tras olvidar el PIN. En los dos casos la sal es nueva,
   * así que el verificador viejo deja de servir aunque alguien lo hubiera leído.
   */
  const definirPin = useCallback(async (pin: string): Promise<Respuesta> => {
    if (!esPinValido(pin)) return { ok: false, mensaje: 'El PIN son 6 dígitos.' };

    const pendiente = aMedias.current;
    if (!pendiente) {
      if (montado.current) setEstado('sin_enrolar');
      return { ok: false, mensaje: 'Vuelva a activar el equipo.' };
    }

    setOcupado(true);
    try {
      const salt = generarSalt();
      const verificador = await derivarVerificador(pin, salt);
      await guardarEnrolamiento({
        usuarioId: pendiente.usuarioId,
        usuario: pendiente.usuario,
        salt,
        verificador,
      });
      await limpiarIntentos();

      const encontrado = await usuarioPorId(pendiente.usuarioId);
      aMedias.current = null;

      if (!montado.current) return { ok: true };
      setIntentos(SIN_INTENTOS);
      setUsuarioEnrolado(pendiente.usuario);
      // `encontrado` puede ser null la primera vez: la réplica local todavía no
      // tiene a esta persona porque el pull no ha corrido. La sesión se abre
      // igual con lo que sabemos, y el pull la completa enseguida.
      setUsuario(
        encontrado ?? {
          id: pendiente.usuarioId,
          usuario: pendiente.usuario,
          nombreCompleto: pendiente.usuario,
          rol: 'operador',
        },
      );
      setEstado('abierta');
      return { ok: true };
    } finally {
      if (montado.current) setOcupado(false);
    }
  }, []);

  const iniciarRecuperacion = useCallback(() => setEstado('recuperando'), []);
  const cancelarRecuperacion = useCallback(() => setEstado('bloqueada'), []);

  /**
   * Comprueba el código de respaldo **sin red**.
   *
   * El residente lo dicta de la carpeta de la obra y esto lo verifica contra el
   * hash que el equipo se guardó al activarse. Al acertar, el respaldo se quema:
   * ese papel deja de abrir el teléfono, y el equipo recogerá uno nuevo en la
   * siguiente sincronización.
   *
   * Los fallos cuentan en la misma escalera que el PIN. Si no contaran, el
   * código de respaldo sería una puerta sin cerrojo al lado de una con cerrojo.
   */
  const comprobarRespaldo = useCallback(async (codigo: string): Promise<Respuesta> => {
    const guardados = await leerIntentos();
    const restante = esperaRestante(guardados);
    if (restante > 0) {
      if (montado.current) {
        setIntentos(guardados);
        setAhora(Date.now());
      }
      return { ok: false, mensaje: mensajeDeEspera(restante) };
    }

    const enrolamiento = await leerEnrolamiento();
    const hash = await leerHashRespaldo();
    if (!enrolamiento || !hash) {
      return {
        ok: false,
        mensaje:
          'Este equipo no tiene código de respaldo. Pida uno de activación a la administración.',
      };
    }

    setOcupado(true);
    try {
      if (!(await verificarContraHashDelServidor(codigo, hash))) {
        const fallo = await registrarFallo();
        if (montado.current) {
          setIntentos(fallo);
          setAhora(Date.now());
        }
        const espera = esperaRestante(fallo);
        return {
          ok: false,
          mensaje: espera > 0 ? mensajeDeEspera(espera) : 'Ese código no es correcto.',
        };
      }

      await olvidarHashRespaldo();
      await limpiarIntentos();
      aMedias.current = { usuarioId: enrolamiento.usuarioId, usuario: enrolamiento.usuario };

      if (!montado.current) return { ok: true };
      setIntentos(SIN_INTENTOS);
      setHayRespaldo(false);
      setEstado('definiendo_pin');
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
    // `olvidarEquipo` borra todas las claves del almacén, respaldo incluido: el
    // equipo vuelve a no tener dueño, y el respaldo era del dueño anterior.
    await olvidarEquipo();
    await limpiarIntentos();
    aMedias.current = null;
    if (!montado.current) return;
    setHayRespaldo(false);
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
      hayRespaldo,
      activar,
      definirPin,
      desbloquear,
      iniciarRecuperacion,
      cancelarRecuperacion,
      comprobarRespaldo,
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
      hayRespaldo,
      activar,
      definirPin,
      desbloquear,
      iniciarRecuperacion,
      cancelarRecuperacion,
      comprobarRespaldo,
      bloquear,
      desenrolar,
    ],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}
