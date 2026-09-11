/**
 * Los festivos de Colombia, calculados y no listados.
 *
 * Se calculan porque una lista escrita a mano caduca cada 31 de diciembre, y el
 * día que caduca nadie se entera: la bitácora simplemente deja de marcar los
 * domingos y festivos, y las horas de ese día se cuentan como cualquier otra.
 *
 * Tres familias, y cada una se comporta distinto:
 *
 *  1. **Fijos.** Caen donde caen: 1 de enero, 1 de mayo, 20 de julio…
 *  2. **De la ley Emiliani** (Ley 51 de 1983): se corren al lunes siguiente si
 *     no caen en lunes. Son los que hacen los puentes.
 *  3. **De Semana Santa.** Jueves y Viernes Santo se quedan donde caen; la
 *     Ascensión, el Corpus Christi y el Sagrado Corazón se corren al lunes.
 *
 * Todo en fecha local de Colombia y como texto `YYYY-MM-DD`: son días del
 * calendario, no instantes, y tratarlos como instantes es como se termina
 * marcando el festivo un día antes para quien mira desde otro huso.
 */

/** Domingo de Pascua del año, en `YYYY-MM-DD`. Algoritmo de Meeus/Butcher. */
export function domingoDePascua(anio: number): string {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return fecha(anio, mes, dia);
}

/** `YYYY-MM-DD` sin pasar por husos horarios. */
function fecha(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Suma días a una fecha `YYYY-MM-DD`. Usa mediodía UTC para no cruzar el día. */
function sumarDias(iso: string, dias: number): string {
  const base = new Date(`${iso}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** Día de la semana de una fecha `YYYY-MM-DD`. 0 domingo … 6 sábado. */
export function diaDeLaSemana(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/** El lunes siguiente, o la misma fecha si ya es lunes. La regla Emiliani. */
function alLunes(iso: string): string {
  const dia = diaDeLaSemana(iso);
  return dia === 1 ? iso : sumarDias(iso, (8 - dia) % 7);
}

/**
 * Los festivos de un año, ordenados y **sin repetir**.
 *
 * Sin repetir no es una precaución teórica: dos celebraciones pueden caer en el
 * mismo lunes. Pasó en 2025, cuando el Sagrado Corazón y San Pedro y San Pablo
 * coincidieron el 30 de junio, y ese año tuvo diecisiete días festivos en vez de
 * dieciocho. Un día es festivo o no lo es; contarlo dos veces no da un día libre
 * más.
 */
export function festivosDe(anio: number): string[] {
  const pascua = domingoDePascua(anio);

  const fijos = [
    fecha(anio, 1, 1), // Año nuevo
    fecha(anio, 5, 1), // Día del trabajo
    fecha(anio, 7, 20), // Independencia
    fecha(anio, 8, 7), // Batalla de Boyacá
    fecha(anio, 12, 8), // Inmaculada Concepción
    fecha(anio, 12, 25), // Navidad
  ];

  const emiliani = [
    fecha(anio, 1, 6), // Reyes Magos
    fecha(anio, 3, 19), // San José
    fecha(anio, 6, 29), // San Pedro y San Pablo
    fecha(anio, 8, 15), // Asunción de la Virgen
    fecha(anio, 10, 12), // Día de la Raza
    fecha(anio, 11, 1), // Todos los Santos
    fecha(anio, 11, 11), // Independencia de Cartagena
  ].map(alLunes);

  // Jueves y Viernes Santo no se corren: son los dos únicos de Semana Santa que
  // se quedan donde caen.
  const semanaSanta = [sumarDias(pascua, -3), sumarDias(pascua, -2)];

  // Ascensión (Pascua + 39), Corpus Christi (+60) y Sagrado Corazón (+68) sí se
  // corren al lunes, que es donde caen sumando 43, 64 y 71.
  const movibles = [sumarDias(pascua, 43), sumarDias(pascua, 64), sumarDias(pascua, 71)];

  return [...new Set([...fijos, ...emiliani, ...semanaSanta, ...movibles])].sort();
}

const CACHE = new Map<number, Set<string>>();

/** ¿Es festivo esta fecha `YYYY-MM-DD`? */
export function esFestivo(iso: string): boolean {
  const anio = Number(iso.slice(0, 4));
  if (!CACHE.has(anio)) CACHE.set(anio, new Set(festivosDe(anio)));
  return CACHE.get(anio)!.has(iso);
}

/**
 * ¿Se paga con recargo dominical o festivo?
 *
 * Domingo y festivo se tratan igual, y por eso van juntos: al calcular horas de
 * obra la diferencia no existe.
 */
export function esDominicalOFestivo(iso: string): boolean {
  return diaDeLaSemana(iso) === 0 || esFestivo(iso);
}
