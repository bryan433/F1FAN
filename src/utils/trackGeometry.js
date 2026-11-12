/**
 * Utilidades geométricas puras para dibujar trazados de circuitos en un lienzo 2D.
 * No dependen de React ni de la red: reciben coordenadas y devuelven coordenadas.
 */

// Lienzo de referencia de TrackMap (pt). Cabe en pantallas de 344 pt de ancho o más.
export const TRACK_CANVAS = { width: 280, height: 200, padding: 10 };

// Cantidad máxima de segmentos que TrackMap dibuja para un trazado real.
export const MAX_TRACK_SEGMENTS = 150;

const esNumeroFinito = valor => typeof valor === 'number' && Number.isFinite(valor);
const redondear = valor => Math.round(valor * 10) / 10;

export const esPuntoValido = punto => Boolean(punto) && esNumeroFinito(punto.x) && esNumeroFinito(punto.y);

/**
 * Lleva coordenadas x/y arbitrarias a coordenadas del lienzo conservando la proporción
 * (misma escala en ambos ejes) y centrando el trazado dentro del margen interior.
 * Por defecto invierte el eje Y: en los datos de pista Y crece hacia arriba y en pantalla hacia abajo.
 * @param {Array<{x:number,y:number}>} puntos
 * @param {{width?:number,height?:number,padding?:number,invertY?:boolean}} opciones
 * @returns {Array<{x:number,y:number}>}
 */
export function normalizeTrackPoints(puntos, opciones = {}) {
  const {
    width = TRACK_CANVAS.width,
    height = TRACK_CANVAS.height,
    padding = TRACK_CANVAS.padding,
    invertY = true,
  } = opciones;
  const validos = (Array.isArray(puntos) ? puntos : []).filter(esPuntoValido);
  if (validos.length === 0) return [];

  const xs = validos.map(p => p.x);
  const ys = validos.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangoX = maxX - minX;
  const rangoY = maxY - minY;
  const anchoInterior = Math.max(0, width - 2 * padding);
  const altoInterior = Math.max(0, height - 2 * padding);

  const escalas = [];
  if (rangoX > 0) escalas.push(anchoInterior / rangoX);
  if (rangoY > 0) escalas.push(altoInterior / rangoY);
  const escala = escalas.length ? Math.min(...escalas) : 0;

  const desplazamientoX = padding + (anchoInterior - rangoX * escala) / 2;
  const desplazamientoY = padding + (altoInterior - rangoY * escala) / 2;

  return validos.map(p => ({
    x: redondear(desplazamientoX + (p.x - minX) * escala),
    y: redondear(desplazamientoY + (invertY ? maxY - p.y : p.y - minY) * escala),
  }));
}

/**
 * Reduce una polilínea a como máximo `maxSegmentos` segmentos tomando puntos equiespaciados.
 * Conserva siempre el primer y el último punto.
 */
export function samplePoints(puntos, maxSegmentos = MAX_TRACK_SEGMENTS) {
  const lista = Array.isArray(puntos) ? puntos : [];
  const limite = Math.max(1, Math.floor(maxSegmentos));
  if (lista.length <= limite + 1) return lista.slice();
  const paso = (lista.length - 1) / limite;
  const muestra = [];
  for (let i = 0; i <= limite; i += 1) muestra.push(lista[Math.round(i * paso)]);
  return muestra;
}

/**
 * Cierra la vuelta uniendo el último punto con el primero solo si ya están cerca
 * (distancia menor a `proporcionMaxima` del mayor lado del trazado). Si el hueco es grande
 * se deja abierto para no inventar un tramo de pista inexistente.
 */
export function closeLoopIfNear(puntos, proporcionMaxima = 0.1) {
  const lista = Array.isArray(puntos) ? puntos.slice() : [];
  if (lista.length < 3) return lista;
  const primero = lista[0];
  const ultimo = lista[lista.length - 1];
  const hueco = Math.hypot(ultimo.x - primero.x, ultimo.y - primero.y);
  if (hueco === 0) return lista;
  const xs = lista.map(p => p.x);
  const ys = lista.map(p => p.y);
  const lado = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  if (lado > 0 && hueco <= lado * proporcionMaxima) lista.push({ ...primero });
  return lista;
}
