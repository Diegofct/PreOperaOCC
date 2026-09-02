/**
 * Lo que falta para que el servidor pueda arrancar.
 *
 * Existe para distinguir "el proyecto no está configurado" de "algo se rompió".
 * Los dos casos acaban en un error, pero se arreglan de forma opuesta: el
 * primero se soluciona creando un archivo, y el segundo mirando el log. Sin esta
 * distinción, una `.env` que falta se presenta como un fallo interno del
 * servidor y manda a buscar el problema donde no está.
 *
 * Su mensaje **sí** se muestra hacia afuera, al revés que el de un fallo
 * inesperado: no revela nada —dice qué variable falta, nunca su valor— y es la
 * única forma de que quien monta el proyecto sepa qué hacer.
 */
export class ErrorDeConfiguracion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDeConfiguracion';
    // Sin esto, `instanceof` falla cuando el empaquetador rebaja la clase a
    // ES5: heredar de un tipo nativo pierde la cadena de prototipos y el
    // `catch` de arriba trataría este error como uno cualquiera. Es un fallo
    // silencioso —el código compila y corre— que solo se nota porque el
    // mensaje bueno no aparece.
    Object.setPrototypeOf(this, ErrorDeConfiguracion.prototype);
  }
}
