import { calculateTimeRemaining, unknownTimeRemaining } from '../utils/timezone';

/**
 * Entidad GranPremio - Modelo del Dominio F1Fan
 * Representa un evento o meeting de la temporada.
 * Atributos: idMeeting, nombreOficial, temporada, esProximo, circuito, sesiones
 */
export class GranPremio {
  constructor({
    idMeeting,
    nombreOficial,
    nombreCorto = '',
    pais = '',
    bandera = '',
    temporada = null,
    season = temporada,
    round = null,
    totalRounds = null,
    esProximo = false,
    estado = 'Programado', // 'Programado', 'Próximo', 'En curso', 'Finalizado', 'Cancelado'
    fechaInicio,
    fechaFin,
    circuito = null,
    sesiones = [],
    fechaCarreraUTC = null,
    date = null,
    time = null,
    warning = null,
  }) {
    this.idMeeting = idMeeting;
    this.nombreOficial = nombreOficial;
    this.nombreCorto = nombreCorto || nombreOficial;
    this.pais = pais;
    this.bandera = bandera;
    this.temporada = temporada;
    this.season = season;
    this.round = round;
    this.totalRounds = totalRounds;
    this.esProximo = Boolean(esProximo);
    this.estado = estado;
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin;
    this.circuito = circuito;
    this.sesiones = sesiones;
    this.fechaCarreraUTC = fechaCarreraUTC;
    this.date = date;
    this.time = time;
    this.warning = warning;
    this.disponible = true;
  }

  calcularTiempoRestante() {
    const raceSession = this.sesiones.find(s => ['race', 'carrera'].includes(s.tipo?.toLowerCase()));
    const targetDate = this.fechaCarreraUTC || (raceSession ? raceSession.fechaHoraUTC : this.fechaInicio);
    if (!targetDate) return unknownTimeRemaining();
    return calculateTimeRemaining(targetDate);
  }
}

