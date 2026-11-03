// Razón de contraste WCAG 2.1 (criterios 1.4.3 y 1.4.11).
// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance

export function hexARgb(hex) {
  const limpio = String(hex).trim().replace(/^#/, '');
  const completo = limpio.length === 3 ? limpio.split('').map(c => c + c).join('') : limpio;
  if (!/^[0-9a-f]{6}$/i.test(completo)) throw new Error(`Color hexadecimal no válido: ${hex}`);
  return [0, 2, 4].map(i => parseInt(completo.slice(i, i + 2), 16));
}

function canalLineal(valor) {
  const s = valor / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminanciaRelativa(hex) {
  const [r, g, b] = hexARgb(hex).map(canalLineal);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function razonContraste(primerPlano, fondo) {
  const a = luminanciaRelativa(primerPlano);
  const b = luminanciaRelativa(fondo);
  const [claro, oscuro] = a >= b ? [a, b] : [b, a];
  return (claro + 0.05) / (oscuro + 0.05);
}

// Umbrales AA: texto normal 4.5:1; texto grande y componentes de interfaz 3:1.
export const MINIMO_TEXTO_NORMAL = 4.5;
export const MINIMO_TEXTO_GRANDE_O_UI = 3;
