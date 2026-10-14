import { formatToChileTime } from '../utils/timezone';

/**
 * Entidad Sesion - Modelo del Dominio F1Fan
 * Representa una sesión de carrera, clasificación o práctica.
 * Atributos: idSesion, tipo, fechaHoraUTC, estado
 */
export class Sesion {
  constructor({
    idSesion,
    idMeeting = null,
    tipo, // 'Practice 1', 'Practice 2', 'Practice 3', 'Qualifying', 'Sprint', 'Race'
    fechaHoraUTC,
    estado = 'Programada', // 'Programada', 'En curso', 'Finalizada', 'Cancelada', 'Resultados disponibles'
    vueltaActual = null,
    totalVueltas = null
  }) {
    this.idSesion = idSesion;
    this.idMeeting = idMeeting;
    this.tipo = tipo;
    this.fechaHoraUTC = fechaHoraUTC;
    this.estado = estado;
    this.vueltaActual = vueltaActual;
    this.totalVueltas = totalVueltas;
  }

  obtenerHoraLocal() {
    return formatToChileTime(this.fechaHoraUTC);
  }
}

