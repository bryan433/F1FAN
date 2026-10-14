/**
 * Entidad Circuito - Modelo del Dominio F1Fan
 * Representa el circuito donde se corre un Gran Premio.
 * Atributos: nombreCircuito, ciudad, pais, longitudKm, numeroVueltas, numeroCurvas, recordVuelta
 */
export class Circuito {
  constructor({
    idCircuito = null,
    nombreCircuito,
    ciudad,
    pais,
    longitudKm = 0,
    numeroVueltas = 0,
    numeroCurvas = 0,
    recordVuelta = '',
    recordAutor = '',
    temperaturaAire = '29°C',
    temperaturaPista = '38°C',
    mapaUrl = null
  }) {
    this.idCircuito = idCircuito;
    this.nombreCircuito = nombreCircuito;
    this.ciudad = ciudad;
    this.pais = pais;
    this.longitudKm = longitudKm;
    this.numeroVueltas = numeroVueltas;
    this.numeroCurvas = numeroCurvas;
    this.recordVuelta = recordVuelta;
    this.recordAutor = recordAutor;
    this.temperaturaAire = temperaturaAire;
    this.temperaturaPista = temperaturaPista;
    this.mapaUrl = mapaUrl;
  }
}

