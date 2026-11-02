import { DRIVERS, TEAMS } from '../data/teamsAndDrivers';

const same = (a, b) => a !== undefined && a !== null && b !== undefined && b !== null
  && String(a).toLowerCase() === String(b).toLowerCase();

/** Resuelve identidades, nunca puntuaciones ni posiciones del catálogo local. */
export function resolveDriverFavorites(records, drivers) {
  const result = [];
  for (const record of records) {
    const local = !record.driverId && DRIVERS.find(driver => same(driver.idPiloto, record.idPiloto) || same(driver.codigo, record.idPiloto));
    // Si se guardó driverId, es la identidad estable aunque cambie el dorsal.
    const current = record.driverId
      ? drivers.find(driver => same(driver.driverId, record.driverId))
      : drivers.find(driver => same(driver.driverId, record.idPiloto))
        || drivers.find(driver => same(driver.idPiloto, record.idPiloto) || same(driver.numero, record.idPiloto))
        || drivers.find(driver => same(driver.codigo, record.idPiloto))
        || drivers.find(driver => same(driver.codigo, local?.codigo));
    const identity = current || (record.nombre || record.apellido ? record : local) || record;
    const key = current?.driverId ?? current?.idPiloto ?? record.driverId ?? record.idPiloto;
    const previous = result.find(entry => same(entry.key, key));
    if (previous) { previous.savedIds.push(record.driverId ?? record.idPiloto); continue; }
    result.push({
      key, savedIds: [record.driverId ?? record.idPiloto], current,
      name: [identity.nombre, identity.apellido].filter(Boolean).join(' ') || `Piloto guardado (${record.idPiloto})`,
      number: identity.numero ?? '—', color: identity.colorHex || '#FFFFFF',
      subtitle: current?.nombreEscuderia || 'Guardado; información actual no disponible',
    });
  }
  return result;
}

export function resolveTeamFavorites(ids, teams) {
  return ids.map(id => {
    const current = teams.find(team => same(team.idEscuderia, id));
    const local = TEAMS.find(team => same(team.id, id));
    return { id, name: current?.nombre || local?.name || `Escudería guardada (${id})`,
      color: current?.colorHex || local?.colorHex || '#FFFFFF' };
  });
}
