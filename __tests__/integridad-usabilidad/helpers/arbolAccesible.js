// Utilidades para recorrer el árbol renderizado y evaluar criterios de accesibilidad.
// Se trabaja sobre instancias de react-test-renderer (screen.UNSAFE_root o un nodo host).
import { StyleSheet } from 'react-native';
import { isHiddenFromAccessibility } from '@testing-library/react-native';

export const ROLES_INTERACTIVOS = [
  'button', 'link', 'tab', 'switch', 'checkbox', 'radio', 'menuitem',
  'togglebutton', 'imagebutton', 'adjustable', 'combobox', 'search',
];
export const OBJETIVO_TACTIL_MINIMO = 44;
export const FUENTE_MINIMA = 12;
// Cota superior del alto de línea por defecto (iOS ≈ 1.19, Android ≈ 1.17 × fontSize) cuando no
// se define lineHeight: así solo se informan objetivos que con seguridad miden menos del mínimo.
const FACTOR_ALTO_LINEA = 1.35;
const FUENTE_POR_DEFECTO = 14;

export const esHost = nodo => Boolean(nodo) && typeof nodo === 'object' && typeof nodo.type === 'string';
export const estiloPlano = nodo => StyleSheet.flatten(nodo?.props?.style) || {};
const numero = valor => (typeof valor === 'number' && Number.isFinite(valor) ? valor : null);

export function primerHost(nodo) {
  if (esHost(nodo)) return nodo;
  for (const hijo of nodo?.children ?? []) {
    if (typeof hijo === 'object') {
      const encontrado = primerHost(hijo);
      if (encontrado) return encontrado;
    }
  }
  return null;
}

export function hijosHost(nodo) {
  const resultado = [];
  for (const hijo of nodo?.children ?? []) {
    if (typeof hijo !== 'object') continue;
    if (esHost(hijo)) resultado.push(hijo);
    else resultado.push(...hijosHost(hijo));
  }
  return resultado;
}

export function hostPadre(nodo) {
  let actual = nodo?.parent;
  while (actual && !esHost(actual)) actual = actual.parent;
  return actual || null;
}

const ocultoLocalmente = nodo => Boolean(nodo?.props?.accessibilityElementsHidden
  || nodo?.props?.['aria-hidden'] || nodo?.props?.importantForAccessibility === 'no-hide-descendants');

/** Texto visible de un subárbol (lo que un lector de pantalla leería como contenido). */
export function textoAccesible(nodo) {
  const partes = [];
  const visitar = actual => {
    if (typeof actual === 'string' || typeof actual === 'number') { partes.push(String(actual)); return; }
    if (!actual || typeof actual !== 'object' || ocultoLocalmente(actual)) return;
    (actual.children ?? []).forEach(visitar);
  };
  visitar(nodo);
  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

export const rolDe = host => host?.props?.role ?? host?.props?.accessibilityRole;
export const nombreAccesible = host => String(host?.props?.accessibilityLabel
  ?? host?.props?.['aria-label'] ?? textoAccesible(host)).trim();

export function describir(host) {
  const iconos = host.findAll(n => esHost(n) && /^icon-/.test(n.props.testID ?? '')).map(n => n.props.testID);
  const texto = textoAccesible(host).slice(0, 50);
  const partes = [];
  if (host.props.testID) partes.push(`testID=${host.props.testID}`);
  if (host.props.accessibilityLabel) partes.push(`label="${host.props.accessibilityLabel}"`);
  if (texto) partes.push(`texto="${texto}"`);
  if (iconos.length) partes.push(`iconos=[${iconos.join(', ')}]`);
  return partes.length ? partes.join(' ') : `<${host.type}>`;
}

/** Controles interactivos visibles: pulsables (onPress) e interruptores (onValueChange). */
export function controlesInteractivos(raiz) {
  const vistos = new Set();
  const controles = [];
  const candidatos = raiz.findAll(nodo => !esHost(nodo) && nodo.props
    && (typeof nodo.props.onPress === 'function' || typeof nodo.props.onValueChange === 'function'));
  for (const candidato of candidatos) {
    const host = primerHost(candidato);
    if (!host || vistos.has(host) || isHiddenFromAccessibility(host)) continue;
    vistos.add(host);
    controles.push({ host, tipo: typeof candidato.props.onValueChange === 'function' ? 'interruptor' : 'pulsable' });
  }
  return controles;
}

/** Lista legible de controles sin rol interactivo o sin nombre accesible. */
export function problemasDeControles(raiz) {
  return controlesInteractivos(raiz).flatMap(({ host, tipo }) => {
    const problemas = [];
    const rol = rolDe(host);
    if (!ROLES_INTERACTIVOS.includes(rol)) problemas.push(`sin rol accesible (${rol ?? 'ninguno'})`);
    const nombre = tipo === 'interruptor'
      ? String(host.props.accessibilityLabel ?? host.props['aria-label'] ?? '').trim()
      : nombreAccesible(host);
    if (!nombre) problemas.push('sin nombre accesible');
    return problemas.length ? [`${tipo} ${describir(host)} → ${problemas.join(', ')}`] : [];
  });
}

export function tamanoFuente(nodoTexto) {
  let actual = nodoTexto;
  while (actual) {
    if (actual.type === 'Text') {
      const tamano = numero(estiloPlano(actual).fontSize);
      if (tamano != null) return tamano;
    }
    actual = actual.parent;
  }
  return FUENTE_POR_DEFECTO;
}

/** Textos visibles con tamaño efectivo menor al mínimo. */
export function textosPequenos(raiz, minimo = FUENTE_MINIMA) {
  const encontrados = new Map();
  for (const nodo of raiz.findAll(n => n.type === 'Text')) {
    if (isHiddenFromAccessibility(nodo)) continue;
    const texto = textoAccesible(nodo);
    if (!texto) continue;
    const tamano = tamanoFuente(nodo);
    if (tamano < minimo) encontrados.set(`"${texto.slice(0, 50)}" (${tamano}px)`, true);
  }
  return [...encontrados.keys()];
}

// ---- Estimación de objetivos táctiles -------------------------------------------------
// Solo se informa una dimensión cuando puede deducirse de estilos numéricos; si depende del
// ancho del texto, de porcentajes, de flex o del estiramiento del contenedor se omite.

function lado(estilo, prefijo, ladoNombre, eje) {
  const valor = estilo[`${prefijo}${ladoNombre}`] ?? estilo[`${prefijo}${eje}`] ?? estilo[prefijo];
  if (valor == null || valor === 'auto') return 0;
  return numero(valor);
}
const padding = (e, l, eje) => lado(e, 'padding', l, eje);
const margen = (e, l, eje) => lado(e, 'margin', l, eje);
function borde(e, l) {
  const valor = e[`border${l}Width`] ?? e.borderWidth;
  return valor == null ? 0 : numero(valor);
}
const suma = valores => (valores.some(v => v == null) ? null : valores.reduce((a, b) => a + b, 0));
const esFila = estilo => String(estilo.flexDirection || 'column').startsWith('row');
const fuera = estilo => estilo.position === 'absolute' || estilo.display === 'none';

export function medirAlto(nodo) {
  const e = estiloPlano(nodo);
  if (e.display === 'none') return 0;
  if (typeof e.height === 'number') return e.height;
  if (e.height != null || nodo.type === 'Image') return null;
  let contenido;
  if (nodo.type === 'Text') {
    contenido = numero(e.lineHeight) ?? tamanoFuente(nodo) * FACTOR_ALTO_LINEA;
  } else {
    contenido = 0;
    for (const hijo of hijosHost(nodo)) {
      const eh = estiloPlano(hijo);
      if (fuera(eh)) continue;
      const alto = suma([medirAlto(hijo), margen(eh, 'Top', 'Vertical'), margen(eh, 'Bottom', 'Vertical')]);
      if (alto == null) return null;
      contenido = esFila(e) ? Math.max(contenido, alto) : contenido + alto;
    }
  }
  const total = suma([contenido, padding(e, 'Top', 'Vertical'), padding(e, 'Bottom', 'Vertical'), borde(e, 'Top'), borde(e, 'Bottom')]);
  if (total == null) return null;
  return typeof e.minHeight === 'number' ? Math.max(total, e.minHeight) : total;
}

export function medirAncho(nodo) {
  const e = estiloPlano(nodo);
  if (e.display === 'none') return 0;
  if (typeof e.width === 'number') return e.width;
  if (e.width != null || ['Text', 'Image', 'TextInput'].includes(nodo.type)) return null;
  let contenido = 0;
  for (const hijo of hijosHost(nodo)) {
    const eh = estiloPlano(hijo);
    if (fuera(eh)) continue;
    const ancho = suma([medirAncho(hijo), margen(eh, 'Left', 'Horizontal'), margen(eh, 'Right', 'Horizontal')]);
    if (ancho == null) return null;
    contenido = esFila(e) ? contenido + ancho : Math.max(contenido, ancho);
  }
  const total = suma([contenido, padding(e, 'Left', 'Horizontal'), padding(e, 'Right', 'Horizontal'), borde(e, 'Left'), borde(e, 'Right')]);
  if (total == null) return null;
  return typeof e.minWidth === 'number' ? Math.max(total, e.minWidth) : total;
}

function holgura(hitSlop, a, b) {
  if (typeof hitSlop === 'number') return hitSlop * 2;
  if (!hitSlop) return 0;
  return (numero(hitSlop[a]) ?? 0) + (numero(hitSlop[b]) ?? 0);
}

const creceConFlex = estilo => (numero(estilo.flex) ?? 0) > 0 || (numero(estilo.flexGrow) ?? 0) > 0;

/** Alto interior de una fila contenedora; null si depende de su propio contenedor (flex o estiramiento). */
function altoInteriorDeFila(fila) {
  const e = estiloPlano(fila);
  const bordes = suma([padding(e, 'Top', 'Vertical'), padding(e, 'Bottom', 'Vertical'), borde(e, 'Top'), borde(e, 'Bottom')]);
  if (typeof e.height === 'number') return bordes == null ? null : e.height - bordes;
  if (e.height != null || creceConFlex(e) || typeof e.minHeight === 'number') return null;
  const abuelo = hostPadre(fila);
  const ea = estiloPlano(abuelo);
  if (abuelo && esFila(ea) && (e.alignSelf ?? ea.alignItems ?? 'stretch') === 'stretch') return null;
  const altos = hijosHost(fila).filter(h => !fuera(estiloPlano(h))).map(h => {
    const eh = estiloPlano(h);
    return suma([medirAlto(h), margen(eh, 'Top', 'Vertical'), margen(eh, 'Bottom', 'Vertical')]);
  });
  return altos.some(v => v == null) ? null : Math.max(0, ...altos);
}

/** Dimensiones táctiles determinables (incluye hitSlop); null cuando dependen del contexto. */
export function objetivoTactil(host) {
  const e = estiloPlano(host);
  const padre = hostPadre(host);
  const ep = estiloPlano(padre);
  const enFila = Boolean(padre) && esFila(ep);
  const crece = creceConFlex(e);
  const estirado = (e.alignSelf ?? ep.alignItems ?? 'stretch') === 'stretch';

  let alto = !enFila && crece ? null : medirAlto(host);
  if (alto != null && enFila && estirado && typeof e.height !== 'number') {
    // En una fila estirada el alto lo fija la propia fila.
    const interior = altoInteriorDeFila(padre);
    alto = interior == null ? null : Math.max(alto, interior - margen(e, 'Top', 'Vertical') - margen(e, 'Bottom', 'Vertical'));
  }
  let ancho = (enFila && crece) || (padre && !enFila && estirado && typeof e.width !== 'number') ? null : medirAncho(host);

  if (alto != null) alto += holgura(host.props.hitSlop, 'top', 'bottom');
  if (ancho != null) ancho += holgura(host.props.hitSlop, 'left', 'right');
  return { alto, ancho };
}

export function objetivosPequenos(raiz, minimo = OBJETIVO_TACTIL_MINIMO) {
  return controlesInteractivos(raiz).flatMap(({ host, tipo }) => {
    if (tipo === 'interruptor') return []; // El Switch nativo define su propio tamaño.
    const { alto, ancho } = objetivoTactil(host);
    const pequeno = (alto != null && alto < minimo) || (ancho != null && ancho < minimo);
    const fmt = v => (v == null ? '?' : Math.round(v * 10) / 10);
    // "?" = dimensión no determinable; los altos con texto son una cota superior.
    return pequeno ? [`${describir(host)} → ${fmt(ancho)}×${fmt(alto)} pt (ancho×alto, con hitSlop)`] : [];
  });
}

export function encabezados(raiz) {
  return raiz.findAll(n => esHost(n) && ['header', 'heading'].includes(rolDe(n)))
    .filter(n => !isHiddenFromAccessibility(n))
    .map(textoAccesible);
}

/** Verdadero si el nodo o un ancestro anuncia cambios (rol alert o región dinámica). */
export function seAnuncia(nodo) {
  let actual = nodo;
  while (actual) {
    const props = actual.props ?? {};
    if (rolDe(actual) === 'alert' || ['polite', 'assertive'].includes(props.accessibilityLiveRegion)
      || ['polite', 'assertive'].includes(props['aria-live'])) return true;
    actual = actual.parent;
  }
  return false;
}

/** Ancestro común más cercano de varios nodos (para acotar una zona, p. ej. la barra de pestañas). */
export function ancestroComun(nodos) {
  const cadena = nodo => { const lista = []; for (let n = nodo; n; n = n.parent) lista.push(n); return lista; };
  const [primera, ...resto] = nodos.map(cadena);
  return primera.find(candidato => resto.every(lista => lista.includes(candidato))) ?? null;
}
