import { getChileDateTimeParts } from '../utils/timezone';

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
    estado = 'Estado no confirmado',
    vueltaActual = null,
    totalVueltas = null,
    date = null,
    time = null,
    sourceKey = null,
    esLive = false,
  }) {
    this.idSesion = idSesion;
    this.idMeeting = idMeeting;
    this.tipo = tipo;
    this.fechaHoraUTC = fechaHoraUTC;
    this.estado = estado;
    this.vueltaActual = vueltaActual;
    this.totalVueltas = totalVueltas;
    this.date = date;
    this.time = time;
    this.sourceKey = sourceKey;
    this.esLive = esLive;
    const local = fechaHoraUTC ? getChileDateTimeParts(fechaHoraUTC) : null;
    this.dia = local?.dia ?? null;
    this.horaChile = local?.horaChile ?? null;
    this.fechaChile = local?.fechaChile ?? null;
  }

  obtenerHoraLocal() {
    return this.horaChile;
  }
}

