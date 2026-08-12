"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { updateDriverGpsLocationAction } from "@/app/actions/trip-actions";
import {
  Navigation,
  MapPin,
  Wifi,
  WifiOff,
  Radio,
  Clock,
  Gauge,
  Compass,
  AlertCircle,
  CheckCircle2,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import { Card, Badge, Button } from "@/components/ui";

type Props = {
  tripId: string;
  sourceName: string;
  destName: string;
  initialLat?: number | null;
  initialLong?: number | null;
  lastLocationUpdate?: string | null;
  status: string;
  isDriver?: boolean;
  driverName?: string | null;
  vehicleModel?: string | null;
  regNumber?: string | null;
};

export function RealtimeGpsTracker({
  tripId,
  sourceName,
  destName,
  initialLat,
  initialLong,
  lastLocationUpdate,
  status,
  isDriver = false,
  driverName,
  vehicleModel,
  regNumber,
}: Props) {
  const [lat, setLat] = useState<number | null>(initialLat ?? null);
  const [lng, setLng] = useState<number | null>(initialLong ?? null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(lastLocationUpdate ?? null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [speed, setSpeed] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(status === "IN_PROGRESS");
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Driver GPS Broadcasting (Android / Mobile Phone Browser HTML5 Geolocation API)
  const startGpsBroadcast = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation API is not supported by your mobile browser.");
      return;
    }

    setGpsError(null);
    setIsBroadcasting(true);

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed: mpsSpeed, heading: posHeading, accuracy: acc } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setAccuracy(acc ? Math.round(acc) : null);
        setSpeed(mpsSpeed ? Math.round(mpsSpeed * 3.6) : 0); // convert m/s to km/h
        setHeading(posHeading ? Math.round(posHeading) : null);
        setLastUpdate(new Date().toISOString());

        // Send to server action
        const res = await updateDriverGpsLocationAction(tripId, latitude, longitude);
        if (!res.success && res.error) {
          setGpsError(res.error);
        }
      },
      (err) => {
        let msg = "Failed to access mobile phone GPS.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "GPS permission denied. Please allow Location access on your phone settings.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "GPS signal lost or position unavailable.";
        } else if (err.code === err.TIMEOUT) {
          msg = "GPS request timed out.";
        }
        setGpsError(msg);
        setIsBroadcasting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      }
    );

    watchIdRef.current = id;
  }, [tripId]);

  const stopGpsBroadcast = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsBroadcasting(false);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Poll for location updates if not driver
  useEffect(() => {
    if (isDriver || status !== "IN_PROGRESS") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}/location`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.currentLat && data.currentLong) {
            setLat(data.currentLat);
            setLng(data.currentLong);
            setLastUpdate(data.lastLocationUpdate);
          }
        }
      } catch {
        // Ignore background polling errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [tripId, isDriver, status]);

  const hasLocation = lat !== null && lng !== null;
  const timeDiffMinutes = lastUpdate
    ? Math.floor((currentTime - new Date(lastUpdate).getTime()) / 60000)
    : null;

  return (
    <Card variant="glass" className="overflow-hidden border-slate-800 p-0 shadow-2xl space-y-0">
      {/* Top Telemetry Map Viewport */}
      <div className="relative h-64 sm:h-72 bg-slate-950 flex flex-col justify-between overflow-hidden border-b border-slate-800 p-4">
        {/* Synthetic Radar / Grid Backdrop */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(245,158,11,0.2) 1px, transparent 1px), linear-gradient(rgba(245,158,11,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.15) 1px, transparent 1px)",
            backgroundSize: "40px 40px, 20px 20px, 20px 20px",
          }}
        />

        {/* Dynamic OpenStreetMap Tile iframe or Leaflet Fallback View */}
        {hasLocation ? (
          <iframe
            title="Realtime GPS Shuttle Location Map"
            width="100%"
            height="100%"
            className="absolute inset-0 border-0 opacity-80 filter brightness-90 contrast-125"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng! - 0.02}%2C${lat! - 0.02}%2C${lng! + 0.02}%2C${lat! + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-950/90 z-0">
            <Radio className="h-10 w-10 text-amber-500/40 animate-ping mb-2" />
            <p className="text-white font-extrabold text-sm">Awaiting Driver Phone GPS Stream</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              {isDriver
                ? "Click 'Broadcast Live GPS' below on your Android or Mobile Phone to send live coordinates to passengers."
                : "Driver position will appear live on map as soon as the shuttle departs."}
            </p>
          </div>
        )}

        {/* Map Header Overlay Bar */}
        <div className="relative z-10 flex items-center justify-between gap-2 bg-slate-950/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-black text-white tracking-tight">
              {sourceName} → {destName}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {isBroadcasting ? (
              <Badge variant="success" className="gap-1 font-mono animate-pulse">
                <Radio className="h-3 w-3" /> Live Phone Broadcast
              </Badge>
            ) : hasLocation ? (
              <Badge variant="info" className="gap-1 font-mono">
                <Wifi className="h-3 w-3 text-emerald-400" /> GPS Synced
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1 font-mono">
                <WifiOff className="h-3 w-3" /> Offline / Standby
              </Badge>
            )}
          </div>
        </div>

        {/* Map Center Marker Details Bar Overlay */}
        {hasLocation && (
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-500/30 text-xs font-semibold shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md glow-amber">
                <Navigation className="h-4 w-4" />
              </div>
              <div>
                <p className="text-white font-mono font-bold text-xs">
                  Lat: {lat?.toFixed(5)} · Lng: {lng?.toFixed(5)}
                </p>
                <p className="text-[10px] text-slate-400">
                  {lastUpdate
                    ? `Updated ${new Date(lastUpdate).toLocaleTimeString("en-IN")} (${timeDiffMinutes === 0 ? "just now" : `${timeDiffMinutes}m ago`})`
                    : "Live stream"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              {speed !== null && (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Gauge className="h-3.5 w-3.5" />
                  {speed} km/h
                </span>
              )}
              {heading !== null && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Compass className="h-3.5 w-3.5" />
                  {heading}°
                </span>
              )}
              {accuracy !== null && (
                <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  ±{accuracy}m acc
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Driver GPS Controls Panel */}
      {isDriver && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-amber-500" />
                Driver Mobile Phone GPS Live Stream
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Stream real-time location from your Android / Phone device to passenger tickets &amp; admin dispatch.
              </p>
            </div>

            <div>
              {!isBroadcasting ? (
                <Button
                  onClick={startGpsBroadcast}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs gap-2 shadow-md glow-amber cursor-pointer"
                >
                  <Radio className="h-4 w-4" />
                  Broadcast Live GPS Now
                </Button>
              ) : (
                <Button
                  onClick={stopGpsBroadcast}
                  variant="destructive"
                  className="w-full sm:w-auto text-xs font-bold gap-2"
                >
                  <WifiOff className="h-4 w-4" />
                  Stop GPS Broadcast
                </Button>
              )}
            </div>
          </div>

          {gpsError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}
        </div>
      )}
    </Card>

  );
}
