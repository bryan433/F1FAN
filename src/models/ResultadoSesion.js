/**
 * Entidad ResultadoSesion - Modelo del Dominio F1Fan
 * Representa el resultado obtenido por un piloto en una sesión.
 * Atributos: posicionFinal, tiempoDiferencia, puntosObtenidos, idSesion, idPiloto
 */
export class ResultadoSesion {
  constructor({
    posicionFinal,
    tiempoDiferencia = '',
    puntosObtenidos = 0,
    idSesion = null,
    idPiloto = null,
    piloto = null,
    vueltas = 0,
    tiempoVueltaRapida = '',
    neumatico = 'M'
  }) {
    this.posicionFinal = posicionFinal;
    this.tiempoDiferencia = tiempoDiferencia;
    this.puntosObtenidos = puntosObtenidos;
    this.idSesion = idSesion;
    this.idPiloto = idPiloto;
    this.piloto = piloto;
    this.vueltas = vueltas;
    this.tiempoVueltaRapida = tiempoVueltaRapida;
    this.neumatico = neumatico;
  }
}

/**
 * Entidad PosicionPiloto - Tabla de Campeonato de Pilotos
 * Atributos: posicion, puntos, piloto
 */
export class PosicionPiloto {
  constructor({
    posicion,
    puntos,
    piloto,
    diferenciaLider = 0
  }) {
    this.posicion = posicion;
    this.puntos = puntos;
    this.piloto = piloto;
    this.diferenciaLider = diferenciaLider;
  }
}

/**
 * Entidad PosicionEquipo - Tabla de Campeonato de Constructores
 * Atributos: posicion, puntos, escuderia
 */
export class PosicionEquipo {
  constructor({
    posicion,
    puntos,
    escuderia,
    diferenciaLider = 0
  }) {
    this.posicion = posicion;
    this.puntos = puntos;
    this.escuderia = escuderia;
    this.diferenciaLider = diferenciaLider;
  }
}

