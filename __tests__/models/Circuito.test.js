import { Circuito } from '../../src/models/Circuito';

describe('Modelo Circuito', () => {
  test('crea una instancia con valores por defecto cuando solo se proveen campos requeridos', () => {
    const circuito = new Circuito({
      nombreCircuito: 'Circuito de Mónaco',
      ciudad: 'Montecarlo',
      pais: 'Mónaco',
    });

    expect(circuito.idCircuito).toBeNull();
    expect(circuito.nombreCircuito).toBe('Circuito de Mónaco');
    expect(circuito.ciudad).toBe('Montecarlo');
    expect(circuito.pais).toBe('Mónaco');
    expect(circuito.longitudKm).toBe(0);
    expect(circuito.numeroVueltas).toBe(0);
    expect(circuito.numeroCurvas).toBe(0);
    expect(circuito.recordVuelta).toBe('');
    expect(circuito.recordAutor).toBe('');
    expect(circuito.temperaturaAire).toBe('29°C');
    expect(circuito.temperaturaPista).toBe('38°C');
    expect(circuito.mapaUrl).toBeNull();
  });

  test('crea una instancia completa con datos específicos de pista', () => {
    const circuito = new Circuito({
      idCircuito: 'monza',
      nombreCircuito: 'Autodromo Nazionale Monza',
      ciudad: 'Monza',
      pais: 'Italia',
      longitudKm: 5.793,
      numeroVueltas: 53,
      numeroCurvas: 11,
      recordVuelta: '1:21.046',
      recordAutor: 'Rubens Barrichello',
      temperaturaAire: '24°C',
      temperaturaPista: '32°C',
      mapaUrl: 'https://example.com/monza.png',
    });

    expect(circuito.idCircuito).toBe('monza');
    expect(circuito.nombreCircuito).toBe('Autodromo Nazionale Monza');
    expect(circuito.longitudKm).toBe(5.793);
    expect(circuito.numeroVueltas).toBe(53);
    expect(circuito.numeroCurvas).toBe(11);
    expect(circuito.recordVuelta).toBe('1:21.046');
    expect(circuito.recordAutor).toBe('Rubens Barrichello');
    expect(circuito.temperaturaAire).toBe('24°C');
    expect(circuito.temperaturaPista).toBe('32°C');
    expect(circuito.mapaUrl).toBe('https://example.com/monza.png');
  });
});

