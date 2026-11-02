import { ResultadoSesion, PosicionPiloto, PosicionEquipo } from '../../src/models/ResultadoSesion';
import * as ModelsIndex from '../../src/models/index';

describe('Modelo ResultadoSesion y Posiciones', () => {
  describe('ResultadoSesion', () => {
    test('crea instancia con valores por defecto', () => {
      const resultado = new ResultadoSesion({
        posicionFinal: 1,
      });

      expect(resultado.posicionFinal).toBe(1);
      expect(resultado.tiempoDiferencia).toBe('');
      expect(resultado.puntosObtenidos).toBe(0);
      expect(resultado.idSesion).toBeNull();
      expect(resultado.idPiloto).toBeNull();
      expect(resultado.piloto).toBeNull();
      expect(resultado.vueltas).toBe(0);
      expect(resultado.tiempoVueltaRapida).toBe('');
      expect(resultado.neumatico).toBe('M');
    });

    test('crea instancia con todos los atributos definidos', () => {
      const pilotoMock = { idPiloto: 44, nombre: 'Lewis Hamilton' };
      const resultado = new ResultadoSesion({
        posicionFinal: 2,
        tiempoDiferencia: '+2.415s',
        puntosObtenidos: 18,
        idSesion: 'gp-silverstone-race',
        idPiloto: 44,
        piloto: pilotoMock,
        vueltas: 52,
        tiempoVueltaRapida: '1:30.550',
        neumatico: 'S',
      });

      expect(resultado.posicionFinal).toBe(2);
      expect(resultado.tiempoDiferencia).toBe('+2.415s');
      expect(resultado.puntosObtenidos).toBe(18);
      expect(resultado.idSesion).toBe('gp-silverstone-race');
      expect(resultado.idPiloto).toBe(44);
      expect(resultado.piloto).toEqual(pilotoMock);
      expect(resultado.vueltas).toBe(52);
      expect(resultado.tiempoVueltaRapida).toBe('1:30.550');
      expect(resultado.neumatico).toBe('S');
    });
  });

  describe('PosicionPiloto', () => {
    test('crea una posición de campeonato para piloto con valores por defecto', () => {
      const pilotoMock = { nombre: 'Max Verstappen' };
      const posicion = new PosicionPiloto({
        posicion: 1,
        puntos: 393,
        piloto: pilotoMock,
      });

      expect(posicion.posicion).toBe(1);
      expect(posicion.puntos).toBe(393);
      expect(posicion.piloto).toEqual(pilotoMock);
      expect(posicion.diferenciaLider).toBe(0);
    });

    test('crea una posición con diferencia del líder especificada', () => {
      const pilotoMock = { nombre: 'Lando Norris' };
      const posicion = new PosicionPiloto({
        posicion: 2,
        puntos: 331,
        piloto: pilotoMock,
        diferenciaLider: 62,
      });

      expect(posicion.posicion).toBe(2);
      expect(posicion.puntos).toBe(331);
      expect(posicion.diferenciaLider).toBe(62);
    });
  });

  describe('PosicionEquipo', () => {
    test('crea una posición de constructores con valores por defecto', () => {
      const escuderiaMock = { nombre: 'McLaren' };
      const posicion = new PosicionEquipo({
        posicion: 1,
        puntos: 593,
        escuderia: escuderiaMock,
      });

      expect(posicion.posicion).toBe(1);
      expect(posicion.puntos).toBe(593);
      expect(posicion.escuderia).toEqual(escuderiaMock);
      expect(posicion.diferenciaLider).toBe(0);
    });

    test('crea una posición de constructores con diferencia respecto al líder', () => {
      const escuderiaMock = { nombre: 'Ferrari' };
      const posicion = new PosicionEquipo({
        posicion: 2,
        puntos: 557,
        escuderia: escuderiaMock,
        diferenciaLider: 36,
      });

      expect(posicion.posicion).toBe(2);
      expect(posicion.puntos).toBe(557);
      expect(posicion.diferenciaLider).toBe(36);
    });
  });

  describe('Exportaciones del índice de modelos (models/index)', () => {
    test('exporta adecuadamente todas las clases de entidades de dominio', () => {
      expect(ModelsIndex.Circuito).toBeDefined();
      expect(ModelsIndex.Piloto).toBeDefined();
      expect(ModelsIndex.Escuderia).toBeDefined();
      expect(ModelsIndex.GranPremio).toBeDefined();
      expect(ModelsIndex.Sesion).toBeDefined();
      expect(ModelsIndex.ResultadoSesion).toBeDefined();
      expect(ModelsIndex.PosicionPiloto).toBeDefined();
      expect(ModelsIndex.PosicionEquipo).toBeDefined();
    });
  });
});

