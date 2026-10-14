/**
 * Entidad Escuderia - Modelo del Dominio F1Fan
 * Representa al equipo al que pertenece un piloto.
 * Atributos: idEscuderia, nombre, colorHex, logoUrl
 */
export class Escuderia {
  constructor({
    idEscuderia,
    nombre,
    colorHex = '#FFFFFF',
    logoUrl = null,
    puntos = 0,
    posicionCampeonato = 0,
    pilotos = []
  }) {
    this.idEscuderia = idEscuderia;
    this.nombre = nombre;
    this.colorHex = colorHex;
    this.logoUrl = logoUrl;
    this.puntos = puntos;
    this.posicionCampeonato = posicionCampeonato;
    this.pilotos = pilotos;
  }
}

