import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/*
 * Preferencia "Reducir movimiento" del sistema, compartida por todos los componentes montados:
 * un solo oyente del sistema y un valor en memoria, para que un componente que aparece tarde
 * (una fila, una hoja, un trazado) la conozca desde su primer cuadro y no anime por error.
 */
let preferencia = null; // null = aún no consultada
const suscriptores = new Set();
let suscripcionSistema = null;

function publicar(valor) {
  const nueva = valor === true;
  // Los componentes parten de `false` mientras no se conoce: solo se avisa si cambia.
  const cambio = nueva !== (preferencia === true);
  preferencia = nueva;
  if (cambio) suscriptores.forEach(notificar => notificar(nueva));
}

function iniciarConsulta() {
  try {
    suscripcionSistema = AccessibilityInfo.addEventListener?.('reduceMotionChanged', publicar) ?? null;
  } catch (error) {
    suscripcionSistema = null;
  }
  Promise.resolve()
    .then(() => AccessibilityInfo.isReduceMotionEnabled?.())
    .then(valor => { if (suscriptores.size > 0) publicar(valor); }, () => {});
}

function detenerConsulta() {
  suscripcionSistema?.remove?.();
  suscripcionSistema = null;
  // Sin componentes montados se vuelve a consultar la próxima vez: la preferencia pudo cambiar.
  preferencia = null;
}

/** Devuelve true cuando la persona pidió reducir el movimiento (iOS, Android y web). */
export default function useReduceMotion() {
  const [reducir, setReducir] = useState(preferencia === true);

  useEffect(() => {
    suscriptores.add(setReducir);
    if (suscriptores.size === 1) iniciarConsulta();
    else if (preferencia != null) setReducir(preferencia);
    return () => {
      suscriptores.delete(setReducir);
      if (suscriptores.size === 0) detenerConsulta();
    };
  }, []);

  return reducir;
}
