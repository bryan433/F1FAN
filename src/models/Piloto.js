/**
 * Entidad Piloto - Modelo del Dominio F1Fan
 * Representa a un piloto de Fórmula 1 mostrado en la aplicación.
 * Atributos: idPiloto, numero, nombre, apellido, codigo, pais, urlFoto, esFavorito
 */
export class Piloto {
  constructor({
    idPiloto,
    numero,
    nombre,
    apellido,
    codigo,
    pais,
    urlFoto,
    esFavorito = false,
    escuderiaId = null,
    nombreEscuderia = '',
    colorHex = '#FFFFFF',
    puntos = 0,
    victorias = 0,
    podios = 0,
    poles = 0,
    posicionCampeonato = 0
  }) {
    this.idPiloto = idPiloto;
    this.numero = numero;
    this.nombre = nombre;
    this.apellido = apellido;
    this.codigo = codigo;
    this.pais = pais;
    this.urlFoto = urlFoto;
    this.esFavorito = Boolean(esFavorito);
    this.escuderiaId = escuderiaId;
    this.nombreEscuderia = nombreEscuderia;
    this.colorHex = colorHex;
    this.puntos = puntos;
    this.victorias = victorias;
    this.podios = podios;
    this.poles = poles;
    this.posicionCampeonato = posicionCampeonato;
  }

  obtenerNombreCompleto() {
    return `${this.nombre} ${this.apellido}`.trim();
  }

  toggleFavorito() {
    this.esFavorito = !this.esFavorito;
    return this.esFavorito;
  }
}

