import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { getChileDateTimeParts } from '../utils/timezone';
import { USE_NATIVE_DRIVER } from '../utils/motion';
import useReduceMotion from '../hooks/useReduceMotion';
import PressableScale from '../components/PressableScale';
import SegmentedControl from '../components/SegmentedControl';
import BottomSheet from '../components/BottomSheet';
import { filterMeetings, getMeetingsForYear, getSearchableSeasons, parseOpenF1Date } from '../services/OpenF1TrackService';

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const FILAS_ESQUELETO = 5;
// Aparición escalonada de los resultados: corta y con tope, para no hacer esperar.
const APARICION_MS = 260;
const ESCALON_MS = 30;
const ESCALONES_MAXIMOS = 8;
// Alto aproximado del título grande antes de medirlo (para el título compacto y el borde).
const ALTO_TITULO_ESTIMADO = 84;

const fechaChile = valor => getChileDateTimeParts(parseOpenF1Date(valor));
const lugarDe = meeting => [meeting.location, meeting.country_name].filter(Boolean).join(', ');

function avisoDeDisponibilidad(meeting, ahora) {
  if (meeting.is_cancelled) return 'Este Gran Premio fue cancelado: OpenF1 no tiene datos de pista para mostrar.';
  const inicio = parseOpenF1Date(meeting.date_start);
  if (inicio != null && inicio > ahora) return 'Aún no se disputa: el trazado real estará disponible cuando OpenF1 registre vueltas.';
  return null;
}

function insigniaDeFecha(fecha) {
  if (!fecha?.fechaChile) return null;
  const [, mes, dia] = fecha.fechaChile.split('-');
  return { dia: String(Number(dia)), mes: MESES[Number(mes) - 1] ?? '' };
}

function etiquetaDeSeccion({ estado, temporada, cantidad, buscando }) {
  if (estado === 'loading') return `Temporada ${temporada} · Cargando…`;
  if (estado !== 'ready' || cantidad === 0) return `Temporada ${temporada}`;
  if (buscando) return `Temporada ${temporada} · ${cantidad} ${cantidad === 1 ? 'resultado' : 'resultados'}`;
  return `Temporada ${temporada} · ${cantidad} ${cantidad === 1 ? 'Gran Premio' : 'Grandes Premios'}`;
}

/**
 * Busca Grandes Premios en OpenF1 por temporada y texto, y abre el seleccionado
 * en la vista de realidad aumentada simulada con su trazado real.
 */
export default function BuscarCarreraScreen({ navigation }) {
  const temporadas = useMemo(() => getSearchableSeasons(Date.now()), []);
  const [temporada, setTemporada] = useState(temporadas[temporadas.length - 1]);
  const [busqueda, setBusqueda] = useState('');
  const [meetings, setMeetings] = useState([]);
  const [estado, setEstado] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [intento, setIntento] = useState(0);
  const [seleccionado, setSeleccionado] = useState(null);
  const [altoTitulo, setAltoTitulo] = useState(ALTO_TITULO_ESTIMADO);
  const [enfocada, setEnfocada] = useState(() => navigation.isFocused?.() ?? true);
  const reducir = useReduceMotion();
  const desplazamientoY = useRef(new Animated.Value(0)).current;

  // La pila mantiene esta pantalla montada bajo la de realidad aumentada con el detalle abierto:
  // sin el foco, la hoja no debe consumir el botón Atrás de Android destinado a esa pantalla.
  useEffect(() => {
    if (typeof navigation.addListener !== 'function') return undefined;
    const quitarFoco = navigation.addListener('focus', () => setEnfocada(true));
    const quitarDesenfoque = navigation.addListener('blur', () => setEnfocada(false));
    return () => {
      quitarFoco?.();
      quitarDesenfoque?.();
    };
  }, [navigation]);

  useEffect(() => {
    let activo = true;
    setEstado('loading');
    setMeetings([]);
    setSeleccionado(null);
    getMeetingsForYear(temporada)
      .then(datos => {
        if (!activo) return;
        setMeetings(datos);
        setEstado('ready');
      })
      .catch(() => {
        if (activo) setEstado('error');
      });
    // Una respuesta de otra temporada no debe reemplazar la seleccionada después.
    return () => { activo = false; };
  }, [temporada, intento]);

  const resultados = useMemo(() => filterMeetings(meetings, busqueda), [meetings, busqueda]);
  const detalleAbierto = Boolean(seleccionado);

  const seleccionar = meeting => {
    Keyboard.dismiss();
    setSeleccionado(meeting);
  };

  const verEnRealidadAumentada = () => {
    if (seleccionado) navigation.navigate('RealidadAumentada', { meeting: seleccionado });
  };

  // Título compacto y borde de la barra fija aparecen cuando el contenido pasa por debajo.
  const opacidadTituloCompacto = desplazamientoY.interpolate({
    inputRange: [altoTitulo - 28, altoTitulo - 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const opacidadBorde = desplazamientoY.interpolate({
    inputRange: [altoTitulo - 1, altoTitulo + 8],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const alDesplazar = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: desplazamientoY } } }], { useNativeDriver: USE_NATIVE_DRIVER }),
    [desplazamientoY],
  );

  const opcionesTemporada = useMemo(
    () => temporadas.map(anio => ({ value: anio, label: String(anio), accessibilityLabel: `Temporada ${anio}` })),
    [temporadas],
  );

  return (
    <View style={styles.container}>
      {/* Con el detalle abierto, el fondo queda oculto a los lectores de pantalla (iOS, Android y web). */}
      <View
        style={styles.contenido}
        importantForAccessibility={detalleAbierto ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={detalleAbierto}
        aria-hidden={detalleAbierto}
      >
        <View style={styles.navBar}>
          <PressableScale accessibilityRole="button" accessibilityLabel="Volver" style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={Colors.textPrimary} />
          </PressableScale>
          <Animated.Text
            style={[styles.navTitle, { opacity: opacidadTituloCompacto }]}
            numberOfLines={1}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            aria-hidden
          >
            Buscar carrera
          </Animated.Text>
          <View style={styles.navSpacer} />
        </View>

        <Animated.ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          stickyHeaderIndices={[1]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          onScroll={alDesplazar}
        >
          <View style={styles.largeTitleBlock} onLayout={evento => setAltoTitulo(evento.nativeEvent.layout.height)}>
            <Text accessibilityRole="header" style={styles.largeTitle}>Buscar carrera</Text>
            <Text style={styles.subtitle}>{`Calendario de OpenF1 · ${temporadas[0]}–${temporadas[temporadas.length - 1]}`}</Text>
          </View>

          {/* Barra fija translúcida: el listado se desplaza por debajo. */}
          <View style={styles.stickyBar}>
            <CampoBusqueda valor={busqueda} onCambiar={setBusqueda} />
            <SegmentedControl
              options={opcionesTemporada}
              value={temporada}
              onChange={setTemporada}
              style={styles.segmented}
            />
            <Animated.View pointerEvents="none" style={[styles.stickyEdge, { opacity: opacidadBorde }]} />
          </View>

          <Text style={styles.sectionLabel} accessibilityLiveRegion="polite">
            {etiquetaDeSeccion({ estado, temporada, cantidad: resultados.length, buscando: Boolean(busqueda.trim()) })}
          </Text>

          {estado === 'loading' && <FilasEsqueleto temporada={temporada} reducir={reducir} />}

          {estado === 'error' && (
            <View style={styles.stateBox}>
              <View style={[styles.stateIcon, styles.stateIconError]}>
                <Ionicons name="cloud-offline-outline" size={28} color={Colors.accentOrange} />
              </View>
              <Text accessibilityRole="alert" style={styles.stateTitle}>{`No se pudieron cargar las carreras de ${temporada} desde OpenF1.`}</Text>
              <Text style={styles.stateText}>Revisa tu conexión e inténtalo de nuevo.</Text>
              <PressableScale accessibilityRole="button" accessibilityLabel="Reintentar" style={styles.retryButton} onPress={() => setIntento(valor => valor + 1)}>
                <Ionicons name="refresh" size={17} color="#000000" style={styles.retryIcon} />
                <Text style={styles.retryText}>Reintentar</Text>
              </PressableScale>
            </View>
          )}

          {estado === 'ready' && resultados.length === 0 && (
            <View style={styles.stateBox}>
              <View style={styles.stateIcon}>
                <Ionicons name="search" size={26} color={Colors.textSecondary} />
              </View>
              <Text style={styles.stateTitle}>No se encontraron carreras</Text>
              <Text style={styles.stateText}>
                {meetings.length === 0
                  ? `OpenF1 no tiene Grandes Premios registrados para ${temporada}.`
                  : 'Prueba con otro nombre, país, ciudad o circuito.'}
              </Text>
              <Text style={styles.stateHint}>También puedes elegir otra temporada.</Text>
            </View>
          )}

          {estado === 'ready' && resultados.map((meeting, indice) => (
            <FilaCarrera
              key={meeting.meeting_key}
              meeting={meeting}
              indice={indice}
              activo={seleccionado?.meeting_key === meeting.meeting_key}
              reducir={reducir}
              onSeleccionar={() => seleccionar(meeting)}
            />
          ))}
        </Animated.ScrollView>
      </View>

      <BottomSheet
        visible={detalleAbierto}
        onDismiss={() => setSeleccionado(null)}
        title={seleccionado?.meeting_name}
        closeLabel="Cerrar detalle"
        testID="detalle-carrera"
        capturarAtras={enfocada}
      >
        {seleccionado && <DetalleCarrera meeting={seleccionado} onVerAR={verEnRealidadAumentada} />}
      </BottomSheet>
    </View>
  );
}

/** Campo de búsqueda: filtra en vivo, sin esperas, y se borra con un botón de 44 pt. */
function CampoBusqueda({ valor, onCambiar }) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search" size={17} color={Colors.textSecondary} style={styles.searchIcon} />
      <TextInput
        accessibilityLabel="Buscar carrera"
        style={styles.searchInput}
        placeholder="Nombre, país, ciudad o circuito"
        placeholderTextColor={Colors.textSecondary}
        value={valor}
        onChangeText={onCambiar}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {valor ? (
        <PressableScale accessibilityRole="button" accessibilityLabel="Borrar búsqueda" style={styles.clearButton} onPress={() => onCambiar('')}>
          <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
        </PressableScale>
      ) : null}
    </View>
  );
}

/** Marcadores de posición mientras llegan los datos; laten suavemente salvo con movimiento reducido. */
function FilasEsqueleto({ temporada, reducir }) {
  const pulso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducir) return undefined;
    const ida = { duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER };
    const animacion = Animated.loop(Animated.sequence([
      Animated.timing(pulso, { toValue: 1, ...ida }),
      Animated.timing(pulso, { toValue: 0, ...ida }),
    ]));
    animacion.start();
    return () => animacion.stop();
  }, [pulso, reducir]);

  const opacidad = reducir ? 0.7 : pulso.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Cargando carreras de ${temporada}`}
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: FILAS_ESQUELETO }, (_, indice) => (
        <Animated.View key={indice} style={[styles.row, { opacity: opacidad }]}>
          <View style={[styles.badge, styles.skeletonBlock]} />
          <View style={styles.rowInfo}>
            <View style={[styles.skeletonLine, { width: `${70 - indice * 6}%` }]} />
            <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

function FilaCarrera({ meeting, indice, activo, reducir, onSeleccionar }) {
  const aparicion = useRef(new Animated.Value(reducir ? 1 : 0)).current;

  useEffect(() => {
    if (reducir) {
      aparicion.setValue(1);
      return undefined;
    }
    const animacion = Animated.timing(aparicion, {
      toValue: 1,
      duration: APARICION_MS,
      delay: Math.min(indice, ESCALONES_MAXIMOS) * ESCALON_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    animacion.start();
    return () => animacion.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fecha = fechaChile(meeting.date_start);
  const insignia = insigniaDeFecha(fecha);
  const estiloAparicion = reducir
    ? null
    : { opacity: aparicion, transform: [{ translateY: aparicion.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] };

  return (
    <Animated.View style={estiloAparicion}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={[meeting.meeting_name, lugarDe(meeting), fecha?.fechaChile, meeting.is_cancelled ? 'cancelado' : null].filter(Boolean).join(', ')}
        accessibilityState={{ selected: activo }}
        style={[styles.row, activo && styles.rowActive]}
        onPress={onSeleccionar}
      >
        <View style={[styles.badge, activo && styles.badgeActive]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden aria-hidden>
          <Text style={styles.badgeDay}>{insignia?.dia ?? '—'}</Text>
          {insignia ? <Text style={styles.badgeMonth}>{insignia.mes}</Text> : null}
        </View>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowTitle, meeting.is_cancelled && styles.rowTitleCancelled]} numberOfLines={1}>{meeting.meeting_name}</Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>{[meeting.circuit_short_name, meeting.country_name].filter(Boolean).join(' · ')}</Text>
          {meeting.is_cancelled ? <Text style={styles.rowCancelled}>Cancelado</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={activo ? Colors.accentCyan : Colors.textSecondary} />
      </PressableScale>
    </Animated.View>
  );
}

function DatoDetalle({ icono, texto }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icono} size={17} color={Colors.textSecondary} style={styles.detailIcon} />
      <Text style={styles.detailLine}>{texto}</Text>
    </View>
  );
}

function DetalleCarrera({ meeting, onVerAR }) {
  const fecha = fechaChile(meeting.date_start);
  const aviso = avisoDeDisponibilidad(meeting, Date.now());
  return (
    <View>
      {meeting.meeting_official_name ? <Text style={styles.detailOfficial}>{meeting.meeting_official_name}</Text> : null}
      <View style={styles.detailGroup}>
        <DatoDetalle icono="flag-outline" texto={`Circuito: ${meeting.circuit_short_name || 'no informado'}`} />
        <DatoDetalle icono="location-outline" texto={`Lugar: ${lugarDe(meeting) || 'no informado'}`} />
        <DatoDetalle
          icono="time-outline"
          texto={fecha ? `Inicio: ${fecha.dia} ${fecha.fechaChile}, ${fecha.horaChile} (hora de Chile)` : 'Inicio: fecha no disponible'}
        />
      </View>
      {aviso ? (
        <View style={styles.detailNote}>
          <Ionicons name="warning-outline" size={17} color={Colors.accentYellow} style={styles.detailIcon} />
          <Text style={styles.detailNoteText}>{aviso}</Text>
        </View>
      ) : null}
      <PressableScale accessibilityRole="button" accessibilityLabel="Ver en realidad aumentada" style={styles.arButton} onPress={onVerAR}>
        <Ionicons name="cube" size={18} color="#000000" style={styles.arButtonIcon} />
        <Text style={styles.arButtonText}>Ver en realidad aumentada</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contenido: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  navSpacer: {
    width: 44,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  largeTitleBlock: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 10,
  },
  largeTitle: {
    color: Colors.textPrimary,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  stickyBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    // Material translúcido: el listado se adivina por debajo sin perder legibilidad.
    backgroundColor: 'rgba(13, 15, 18, 0.86)',
    ...Platform.select({ web: { backdropFilter: 'blur(20px) saturate(180%)' }, default: {} }),
  },
  stickyEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingLeft: 12,
    borderRadius: 12,
    backgroundColor: Colors.backgroundInput,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingVertical: 10,
  },
  clearButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    marginTop: 10,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  stateBox: {
    paddingHorizontal: 32,
    paddingVertical: 36,
    alignItems: 'center',
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  stateIconError: {
    backgroundColor: 'rgba(255, 128, 0, 0.12)',
  },
  stateTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  stateText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },
  stateHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
  },
  retryButton: {
    flexDirection: 'row',
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: Colors.accentCyan,
  },
  retryIcon: {
    marginRight: 6,
  },
  retryText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    marginHorizontal: 12,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
  },
  rowActive: {
    backgroundColor: Colors.backgroundCardElevated,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  badgeActive: {
    backgroundColor: 'rgba(0, 210, 190, 0.18)',
  },
  badgeDay: {
    color: Colors.textPrimary,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  badgeMonth: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  rowInfo: {
    flex: 1,
    marginRight: 8,
  },
  rowTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  rowTitleCancelled: {
    color: Colors.textSecondary,
  },
  rowSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  rowCancelled: {
    color: Colors.accentOrange,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  skeletonBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonLineShort: {
    width: '40%',
    marginTop: 8,
  },
  detailOfficial: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  detailGroup: {
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  detailIcon: {
    marginRight: 10,
  },
  detailLine: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 19,
  },
  detailNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  detailNoteText: {
    flex: 1,
    color: Colors.accentYellow,
    fontSize: 13,
    lineHeight: 18,
  },
  arButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: Colors.accentCyan,
  },
  arButtonIcon: {
    marginRight: 8,
  },
  arButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
});
