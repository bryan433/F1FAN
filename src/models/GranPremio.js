import { calculateTimeRemaining } from '../utils/timezone';

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
    temporada = 2024,
    round = 1,
    totalRounds = 24,
    esProximo = false,
    estado = 'Programado', // 'Programado', 'Próximo', 'En curso', 'Finalizado', 'Cancelado'
    fechaInicio,
    fechaFin,
    circuito = null,
    sesiones = []
  }) {
    this.idMeeting = idMeeting;
    this.nombreOficial = nombreOficial;
    this.nombreCorto = nombreCorto || nombreOficial;
    this.pais = pais;
    this.bandera = bandera;
    this.temporada = temporada;
    this.round = round;
    this.totalRounds = totalRounds;
    this.esProximo = Boolean(esProximo);
    this.estado = estado;
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin;
    this.circuito = circuito;
    this.sesiones = sesiones;
  }

  calcularTiempoRestante() {
    // Si tiene fecha de carrera (última sesión o fechaFin), calculamos cuenta regresiva
    const raceSession = this.sesiones.find(s => s.tipo.toLowerCase().includes('race') || s.tipo.toLowerCase().includes('carrera'));
    const targetDate = raceSession ? raceSession.fechaHoraUTC : this.fechaInicio;
    return calculateTimeRemaining(targetDate);
  }
}

