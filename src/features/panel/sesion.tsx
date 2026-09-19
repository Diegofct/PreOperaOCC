/**
 * Quién está dentro del panel.
 *
 * Su trabajo es reducir todo lo que puede pasar al arrancar a **cuatro estados**,
 * porque el layout tiene que decidir qué pintar y no puede hacerlo sobre un
 * "quizá":
 *
 *   · comprobando  — preguntándole al servidor quién es
 *   · fuera        — no hay sesión: pantalla de ingreso
 *   · debe_cambiar — hay sesión, pero con contraseña temporal
 *   · dentro       — se puede trabajar
 *
 * **La cookie no se toca desde aquí, ni se puede.** Es `HttpOnly`, así que este
 * código no la ve: el navegador la adjunta solo en cada petición. La única forma
 * de saber si hay sesión es preguntar al servidor, y eso es justamente lo que la
 * protege de que un fallo de XSS se la lleve.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { api, mensajeDe } from './cliente-api';
import type { ClaveNueva, CredencialesIngreso, PersonaEnSesionFila } from './contratos';

export type EstadoSesionPanel = 'comprobando' | 'fuera' | 'debe_cambiar' | 'dentro';

interface ValorSesionPanel {
  estado: EstadoSesionPanel;
  persona: PersonaEnSesionFila | null;
  /**
   * Si alguien pidió cambiar su contraseña por su cuenta.
   *
   * Vive aquí y no en la barra de navegación porque quien la pinta es
   * `MarcoSesion`, que está por encima de todo. Cuando el estado estaba dentro
   * de la barra, la tarjeta sustituía **solo a la barra** y el panel seguía
   * asomando debajo, como si la página se hubiera partido en dos.
   */
  cambiandoClave: boolean;
  pedirCambioDeClave: (quiere: boolean) => void;
  ingresar: (datos: CredencialesIngreso) => Promise<string | null>;
  cambiarClave: (datos: ClaveNueva) => Promise<string | null>;
  salir: () => Promise<void>;
}

const Contexto = createContext<ValorSesionPanel | null>(null);

export function useSesionPanel(): ValorSesionPanel {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useSesionPanel() fuera de <ProveedorSesionPanel>.');
  return valor;
}

/** La persona que está dentro. Para pantallas que solo existen con sesión. */
export function usePersona(): PersonaEnSesionFila {
  const { persona } = useSesionPanel();
  if (!persona) throw new Error('usePersona() sin sesión.');
  return persona;
}

function estadoDe(persona: PersonaEnSesionFila | null): EstadoSesionPanel {
  if (!persona) return 'fuera';
  return persona.debeCambiarClave ? 'debe_cambiar' : 'dentro';
}

export function ProveedorSesionPanel({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<PersonaEnSesionFila | null>(null);
  const [comprobando, setComprobando] = useState(true);
  const [cambiandoClave, setCambiandoClave] = useState(false);

  useEffect(() => {
    let vigente = true;

    api.sesion
      .quienSoy()
      // Un 401 aquí no es un error que haya que enseñar: es la respuesta normal
      // de alguien que todavía no ha entrado.
      .then((quien) => vigente && setPersona(quien))
      .catch(() => vigente && setPersona(null))
      .finally(() => vigente && setComprobando(false));

    return () => {
      vigente = false;
    };
  }, []);

  const ingresar = useCallback(async (datos: CredencialesIngreso) => {
    try {
      setPersona(await api.sesion.ingresar(datos));
      return null;
    } catch (fallo) {
      return mensajeDe(fallo);
    }
  }, []);

  const cambiarClave = useCallback(async (datos: ClaveNueva) => {
    try {
      await api.sesion.cambiarClave(datos);
      // Se vuelve a preguntar en vez de apagar la bandera a mano: quien manda
      // sobre el estado de la cuenta es el servidor, y darlo por hecho aquí es
      // como se acaba con un panel que cree que todo está bien cuando no.
      setPersona(await api.sesion.quienSoy());
      setCambiandoClave(false);
      return null;
    } catch (fallo) {
      return mensajeDe(fallo);
    }
  }, []);

  const salir = useCallback(async () => {
    // Si la petición falla —sin red, sesión ya caducada— se sale igual. Dejar a
    // alguien dentro porque el botón de salir no funcionó es el peor resultado
    // posible de pulsarlo.
    try {
      await api.sesion.salir();
    } finally {
      setPersona(null);
    }
  }, []);

  const valor: ValorSesionPanel = {
    estado: comprobando ? 'comprobando' : estadoDe(persona),
    persona,
    cambiandoClave,
    pedirCambioDeClave: setCambiandoClave,
    ingresar,
    cambiarClave,
    salir,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
