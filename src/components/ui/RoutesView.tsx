'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Map24Regular, Delete24Regular, MyLocation24Regular } from '@fluentui/react-icons';
import { useAppStore, type RouteRec } from '@/store/useHabitStore';
import { Flame } from '@/components/ui/Flame';
import { confettiBurst, haptic } from '@/lib/feedback';

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

const km = (m: number) => (m / 1000).toFixed(2);
const dur = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}:${String(sec).padStart(2, '0')}`;
};

// Ritmo en min/km (segundos por km → "m:ss"). "--:--" si aún no hay datos fiables.
const pace = (distanceM: number, durationS: number) => {
  if (distanceM < 20 || durationS < 5) return '--:--';
  const spk = durationS / (distanceM / 1000);
  if (!isFinite(spk) || spk > 60 * 60) return '--:--';
  const m = Math.floor(spk / 60), s = Math.round(spk % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Velocidad media en km/h
const speedKmh = (distanceM: number, durationS: number) =>
  durationS > 0 ? (distanceM / 1000) / (durationS / 3600) : 0;

// MET (equivalente metabólico) según la velocidad: paseo → carrera.
const metForSpeed = (kmh: number) => {
  if (kmh < 4) return 2.8;       // paseo lento
  if (kmh < 5.5) return 3.5;     // caminar
  if (kmh < 6.5) return 5.0;     // caminar rápido
  if (kmh < 8) return 8.3;       // trote suave
  if (kmh < 9.7) return 9.8;     // carrera ligera
  if (kmh < 11.3) return 11.0;
  if (kmh < 12.9) return 11.8;
  return 12.8;                   // ritmo alto
};

// Calorías estimadas (kcal) = MET × peso(kg) × horas. Estimación, no medición médica.
const calories = (distanceM: number, durationS: number, weightKg: number) => {
  if (distanceM < 20 || durationS < 10) return 0;
  return Math.round(metForSpeed(speedKmh(distanceM, durationS)) * weightKg * (durationS / 3600));
};

// Calidad mínima de GPS y filtros anti-ruido.
const MAX_ACCURACY_M = 35;   // descartamos lecturas peores que esto
const MIN_STEP_M = 3;        // movimientos menores se consideran jitter
const MAX_SPEED_MS = 12;     // >43 km/h entre lecturas = salto/glitch del GPS, se ignora

// Mapa estilo Strava. Usamos los "canvas" de Esri: son sobrios (edificios visibles,
// sin saturar), tienen version clara y oscura y NO piden API key — CartoDB pasó a
// exigirla y devolvía un tile con el aviso "API key required" pintado encima.
const stravaTiles = () => {
  const light = typeof document !== 'undefined' && document.documentElement.classList.contains('light');
  return light
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
};

export function RoutesView() {
  const { saveRoute, getRoutes, deleteRoute, userId } = useAppStore();
  const themeSetting = useAppStore((s) => s.settings.theme);
  const weight = useAppStore((s) => s.settings.bodyWeightKg ?? 70);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [routes, setRoutes] = useState<RouteRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [gpsReady, setGpsReady] = useState(false);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const lRef = useRef<any>(null);
  const savedLayer = useRef<any>(null);
  const tileRef = useRef<any>(null);
  const livePoly = useRef<any>(null);
  const meMarker = useRef<any>(null);
  const coordsRef = useRef<[number, number][]>([]);
  const distRef = useRef(0);
  const lastTs = useRef(0); // timestamp de la última lectura aceptada (para el guard de velocidad)
  const watchId = useRef<number | null>(null);
  const liveWatch = useRef<number | null>(null);   // seguimiento continuo del punto azul
  const accCircle = useRef<any>(null);             // circulo de precision del GPS
  const durTimer = useRef<any>(null);
  const startTime = useRef(0);
  const wakeLock = useRef<any>(null);

  const reload = () => {
    if (!userId) { setRoutes([]); setLoading(false); return; }
    getRoutes().then((r) => { setRoutes(r); setLoading(false); });
  };

  // (Re)aplica los tiles según el tema actual, manteniéndolos al fondo
  const applyTiles = () => {
    const L = lRef.current, map = mapRef.current;
    if (!L || !map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    // Esri sirve hasta z16; maxNativeZoom deja que Leaflet reescale por encima
    // en vez de dejar el mapa en gris al acercarte del todo.
    tileRef.current = L.tileLayer(stravaTiles(), { maxZoom: 20, maxNativeZoom: 16 }).addTo(map);
    tileRef.current.bringToBack();
  };

  // Punto azul de "estás aquí", con halo latiendo (como Google Maps).
  // Es un divIcon con HTML: así podemos animarlo por CSS. `accuracy` dibuja
  // además el círculo translúcido con el margen de error del GPS.
  const placeMe = (c: [number, number], accuracy?: number) => {
    const L = lRef.current;
    if (!L || !mapRef.current) return;

    if (!meMarker.current) {
      meMarker.current = L.marker(c, {
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
        icon: L.divIcon({
          className: 'gr-locate',
          html: '<span class="gr-locate-pulse"></span><span class="gr-locate-dot"></span>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      }).addTo(mapRef.current);
    } else {
      meMarker.current.setLatLng(c);
    }

    if (accuracy && accuracy < 200) {
      if (!accCircle.current) {
        accCircle.current = L.circle(c, {
          radius: accuracy, color: '#3b82f6', weight: 1,
          opacity: 0.35, fillColor: '#3b82f6', fillOpacity: 0.1, interactive: false,
        }).addTo(mapRef.current);
      } else {
        accCircle.current.setLatLng(c);
        accCircle.current.setRadius(accuracy);
      }
    }
  };

  // Centra el mapa en ti (suave). `follow` evita pelear con el usuario si ha
  // movido el mapa a mano: solo recentra cuando el punto se sale de la vista.
  const centerOnMe = (c: [number, number], follow = false) => {
    const map = mapRef.current;
    if (!map) return;
    if (follow && map.getBounds().pad(-0.25).contains(c)) return;
    map.panTo(c, { animate: true, duration: 0.6 });
  };

  // Init mapa (Leaflet dinámico, solo cliente)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      const map = L.map(mapEl.current, { zoomControl: false, attributionControl: false }).setView([40.4168, -3.7038], 13);
      mapRef.current = map;
      lRef.current = L;
      applyTiles();
      savedLayer.current = L.layerGroup().addTo(map);
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 250);
      navigator.geolocation?.getCurrentPosition(
        (p) => {
          const c: [number, number] = [p.coords.latitude, p.coords.longitude];
          map.setView(c, 17);
          placeMe(c, p.coords.accuracy);
          setGpsReady(true);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );

      // Seguimiento continuo aunque no estés grabando: así el punto azul se
      // mueve contigo en cuanto abres la pestaña. El watch de la grabación va
      // aparte, porque ese además acumula distancia.
      liveWatch.current = navigator.geolocation?.watchPosition(
        (p) => {
          const c: [number, number] = [p.coords.latitude, p.coords.longitude];
          placeMe(c, p.coords.accuracy);
          setGpsReady(true);
          centerOnMe(c, true);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000 },
      ) ?? null;
    })();
    return () => {
      cancelled = true;
      if (watchId.current != null) navigator.geolocation?.clearWatch(watchId.current);
      if (liveWatch.current != null) navigator.geolocation?.clearWatch(liveWatch.current);
      if (durTimer.current) clearInterval(durTimer.current);
      releaseWake();
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  useEffect(() => { reload(); }, [userId]);

  // Cambiar tiles al vuelo si cambias el tema en Ajustes
  useEffect(() => { if (mapReady) applyTiles(); }, [themeSetting, mapReady]);

  // Dibujar rutas guardadas (la más reciente en verde y resaltada)
  useEffect(() => {
    if (!mapReady || !savedLayer.current || !lRef.current) return;
    const L = lRef.current;
    savedLayer.current.clearLayers();
    routes.forEach((r, i) => {
      if (!r.coords || r.coords.length < 2) return;
      const color = i === 0 ? '#10b981' : '#6366f1';
      L.polyline(r.coords, { color, weight: 4, opacity: i === 0 ? 1 : 0.5 }).addTo(savedLayer.current);
    });
    if (!recording && routes[0]?.coords?.length) {
      try { mapRef.current.fitBounds(L.polyline(routes[0].coords).getBounds(), { padding: [30, 30] }); } catch {}
    }
  }, [routes, mapReady]);

  // Mantener la pantalla encendida mientras se graba
  const requestWake = async () => {
    try { wakeLock.current = await (navigator as any).wakeLock?.request('screen'); } catch { /* no soportado */ }
  };
  const releaseWake = () => {
    try { wakeLock.current?.release?.(); } catch { /* noop */ }
    wakeLock.current = null;
  };
  useEffect(() => {
    if (!recording) return;
    const onVis = () => { if (document.visibilityState === 'visible' && recording && !wakeLock.current) requestWake(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [recording]);

  const start = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setError('Tu dispositivo no tiene GPS disponible.'); return; }
    setError('');
    coordsRef.current = [];
    distRef.current = 0;
    lastTs.current = 0;
    setDistance(0); setDuration(0);
    setRecording(true);
    startTime.current = Date.now();
    haptic([30, 50, 30]);
    requestWake();
    if (lRef.current && mapRef.current) {
      livePoly.current = lRef.current.polyline([], { color: '#f43f5e', weight: 6, lineJoin: 'round', lineCap: 'round' }).addTo(mapRef.current);
    }
    // Mientras grabamos basta con un watch: paramos el ligero para no duplicar GPS.
    if (liveWatch.current != null) { navigator.geolocation.clearWatch(liveWatch.current); liveWatch.current = null; }
    watchId.current = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 });
    durTimer.current = setInterval(() => setDuration(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
  };

  const onPos = (p: GeolocationPosition) => {
    const acc = p.coords.accuracy ?? 999;
    const c: [number, number] = [p.coords.latitude, p.coords.longitude];
    setGpsReady(true);
    placeMe(c, acc);
    centerOnMe(c, true);
    // Descarta lecturas imprecisas: añaden km fantasma estando quieto.
    if (acc > MAX_ACCURACY_M) return;
    const prev = coordsRef.current[coordsRef.current.length - 1];
    if (prev) {
      const d = haversine(prev, c);
      if (d < MIN_STEP_M) return; // jitter del GPS estando parado
      // Guard anti-salto: descarta "teletransportes" imposibles (glitch de GPS).
      const dt = (p.timestamp - lastTs.current) / 1000;
      if (dt > 0 && d / dt > MAX_SPEED_MS) return;
      distRef.current += d;
    }
    lastTs.current = p.timestamp;
    coordsRef.current.push(c);
    setDistance(distRef.current);
    if (livePoly.current) livePoly.current.addLatLng(c);
    if (mapRef.current) mapRef.current.panTo(c, { animate: true, duration: 0.5 });
  };

  const onErr = () => setError('No podemos acceder a tu ubicación. Activa el permiso de GPS.');

  const stop = async () => {
    if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
    if (durTimer.current) clearInterval(durTimer.current);
    releaseWake();
    setRecording(false);
    // Volvemos al seguimiento ligero para que el punto azul siga vivo
    if (liveWatch.current == null) {
      liveWatch.current = navigator.geolocation?.watchPosition(
        (p) => {
          const c: [number, number] = [p.coords.latitude, p.coords.longitude];
          placeMe(c, p.coords.accuracy);
          centerOnMe(c, true);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000 },
      ) ?? null;
    }
    haptic([60, 80, 60]);
    const secs = (Date.now() - startTime.current) / 1000;
    if (coordsRef.current.length >= 2 && distRef.current >= 10) {
      await saveRoute(coordsRef.current, distRef.current, secs);
      if (useAppStore.getState().settings.confetti !== false) confettiBurst('indigo');
      reload();
    } else {
      setError('Ruta demasiado corta para guardar. ¡Muévete un poco más!');
    }
    if (livePoly.current && mapRef.current) { mapRef.current.removeLayer(livePoly.current); livePoly.current = null; }
  };

  const totalKm = routes.reduce((a, r) => a + r.distance_m, 0) / 1000;
  const totalKcal = routes.reduce((a, r) => a + calories(r.distance_m, r.duration_s, weight), 0);
  const livePace = pace(distance, duration);
  const liveSpeed = speedKmh(distance, duration);
  const liveKcal = calories(distance, duration, weight);

  return (
    <div className="pb-4">
      {/* Mapa (isolate + z-0: contiene el z-index de Leaflet para que no tape el botón de descanso) */}
      <div className="relative isolate z-0 rounded-[28px] overflow-hidden border border-line/10 shadow-2xl mb-4">
        <div ref={mapEl} className="w-full h-72 bg-surface-2" />
        {!mapReady && <div className="absolute inset-0 flex items-center justify-center text-muted font-medium text-[10px] tracking-tight">Cargando mapa…</div>}

        {/* HUD de grabación */}
        {recording && (
          <div className="absolute top-3 left-3 right-3 flex justify-between items-center bg-app/70 backdrop-blur rounded-2xl px-4 py-2.5 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-white font-medium text-base tabular-nums">{km(distance)}<span className="text-white/50 text-xs"> km</span></span>
            </div>
            <span className="text-white font-medium text-base tabular-nums">{livePace}<span className="text-white/50 text-xs"> /km</span></span>
            <span className="text-white/70 font-medium text-base tabular-nums">{dur(duration)}</span>
          </div>
        )}

        {/* Recentrar en mi posición */}
        {mapReady && (
          <button
            onClick={() => {
              const ll = meMarker.current?.getLatLng?.();
              if (ll) { mapRef.current?.setView([ll.lat, ll.lng], 17, { animate: true }); haptic(15); }
            }}
            aria-label="Centrar en mi posición"
            className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-app/70 backdrop-blur border border-white/10 text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform"
          >
            <MyLocation24Regular style={{ fontSize: 20 }} />
          </button>
        )}

        {/* Aviso buscando GPS */}
        {recording && !gpsReady && (
          <div className="absolute bottom-3 left-3 right-3 text-center bg-amber-500/90 text-black rounded-xl py-1.5 font-medium text-[10px] tracking-tight pointer-events-none">
            Buscando señal GPS…
          </div>
        )}
      </div>

      {/* Stats: en vivo mientras grabas, totales en reposo */}
      {recording ? (
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-surface border border-line/5 rounded-2xl p-3 text-center">
            <p className="text-lg font-medium text-content tabular-nums">{livePace}</p>
            <p className="text-[11px] font-medium text-muted tracking-tight">ritmo /km</p>
          </div>
          <div className="flex-1 bg-surface border border-line/5 rounded-2xl p-3 text-center">
            <p className="text-lg font-medium text-content tabular-nums">{liveSpeed.toFixed(1)}</p>
            <p className="text-[11px] font-medium text-muted tracking-tight">km/h</p>
          </div>
          <div className="flex-1 bg-surface border border-line/5 rounded-2xl p-3 text-center">
            <p className="text-lg font-medium text-content tabular-nums">{liveKcal}</p>
            <p className="text-[11px] font-medium text-muted tracking-tight flex items-center justify-center gap-1">kcal <Flame size={11} /></p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-surface border border-line/5 rounded-2xl p-3 text-center">
            <p className="text-lg font-medium text-content tabular-nums">{totalKm.toFixed(1)}</p>
            <p className="text-[11px] font-medium text-muted tracking-tight">km totales</p>
          </div>
          <div className="flex-1 bg-surface border border-line/5 rounded-2xl p-3 text-center">
            <p className="text-lg font-medium text-content tabular-nums">{routes.length}</p>
            <p className="text-[11px] font-medium text-muted tracking-tight">rutas</p>
          </div>
          <div className="flex-1 bg-surface border border-line/5 rounded-2xl p-3 text-center">
            <p className="text-lg font-medium text-content tabular-nums">{totalKcal}</p>
            <p className="text-[11px] font-medium text-muted tracking-tight flex items-center justify-center gap-1">kcal <Flame size={11} /></p>
          </div>
        </div>
      )}

      {/* Peso para estimar calorías */}
      {!recording && (
        <div className="flex items-center justify-center gap-2 mb-5 text-[11px] font-medium text-muted">
          <span className="flex items-center gap-1.5"><Flame size={13} /> Calorías según tu peso:</span>
          <input
            type="number" inputMode="numeric" min={30} max={250} value={weight}
            onChange={(e) => updateSettings({ bodyWeightKg: Math.max(30, Math.min(250, Number(e.target.value) || 0)) })}
            className="w-14 bg-surface border border-line/10 rounded-lg px-2 py-1 text-center text-content font-medium tabular-nums focus:outline-none focus:border-line/30"
          />
          <span>kg</span>
        </div>
      )}

      {error && <p className="text-rose-500 text-[11px] font-medium text-center mb-3">{error}</p>}

      {/* Disparador principal: botón circular tipo Strava.
          En reposo es un círculo rojo; grabando, el interior se vuelve un
          cuadrado de stop y un anillo late alrededor. */}
      <div className="flex flex-col items-center justify-center py-2">
        <button
          onClick={recording ? stop : start}
          aria-label={recording ? 'Detener y guardar' : 'Grabar ruta'}
          className="relative w-[88px] h-[88px] rounded-full flex items-center justify-center active:scale-95 transition-transform"
        >
          {/* anillo exterior */}
          <span
            className={`absolute inset-0 rounded-full border-[3px] transition-colors ${
              recording ? 'border-rose-500/40' : 'border-line/15'
            }`}
          />
          {/* latido mientras graba */}
          {recording && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border-[3px] border-rose-500"
              animate={{ scale: [1, 1.18], opacity: [0.7, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut' }}
            />
          )}
          {/* núcleo: círculo → cuadrado */}
          <motion.span
            className="bg-rose-500 shadow-[0_6px_28px_rgba(244,63,94,0.5)]"
            animate={
              recording
                ? { width: 30, height: 30, borderRadius: 8 }
                : { width: 66, height: 66, borderRadius: 999 }
            }
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          />
        </button>
        <p className="mt-3 text-[10px] font-medium text-muted tracking-tight">
          {recording ? 'Tocar para terminar' : 'Grabar ruta'}
        </p>
      </div>

      {/* Lista de rutas */}
      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-muted text-center text-[11px] font-medium tracking-tight py-6">Cargando rutas…</p>
        ) : routes.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-surface-2 border border-line/10 flex items-center justify-center text-muted"><Map24Regular style={{ fontSize: 26 }} /></div>
            <p className="text-content font-medium text-sm">Aún no has grabado rutas</p>
            <p className="text-muted text-[11px] font-medium mt-1">Pulsa «Grabar ruta» y sal a correr.</p>
          </div>
        ) : (
          routes.map((r) => (
            <div key={r.id} className="bg-surface border border-line/5 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-content font-medium text-sm">{km(r.distance_m)} km · {dur(r.duration_s)}</p>
                <p className="text-muted text-[10px] font-medium tracking-tight truncate">
                  {pace(r.distance_m, r.duration_s)} /km · {calories(r.distance_m, r.duration_s, weight)} kcal · {new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {confirmId === r.id ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={async () => { await deleteRoute(r.id); setConfirmId(null); reload(); }}
                    className="bg-rose-500 text-white font-medium text-[10px] tracking-tight px-3 py-2 rounded-xl active:scale-95 transition-transform"
                  >Borrar</button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-muted font-medium text-[10px] tracking-tight px-2 py-2"
                  >No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmId(r.id)} className="text-muted hover:text-rose-500 transition-colors p-2 shrink-0"><Delete24Regular style={{ fontSize: 17 }} /></button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
