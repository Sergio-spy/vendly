// Helpers de formato para la UI.

const eurFmt = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',  // siempre con separador de miles (1.284,40 en lugar de 1284,40)
});

const intFmt = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
  useGrouping: 'always',
});

// Devuelve "1.234,56 €" (locale es-ES con €). Acepta null/undefined → "0,00 €".
export const eur = (n) => `${eurFmt.format(Number(n) || 0)} €`;

// Devuelve "1.234" (entero con separador de miles).
export const num = (n) => intFmt.format(Number(n) || 0);
