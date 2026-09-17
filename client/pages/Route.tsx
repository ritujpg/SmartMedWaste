import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { PageHeading } from "@/components/dashboard/primitives";

maplibregl.setWorkerUrl(workerUrl);
function RouteMap() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const currentMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destinationMarkerRef = useRef<maplibregl.Marker | null>(null);

  const currentLocationRef = useRef<[number, number] | null>(null);
  const destinationLocationRef = useRef<[number, number] | null>(null);

  const [destination, setDestination] = useState("");
  const [status, setStatus] = useState("");
  const [distance, setDistance] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,

      style: {
        version: 8,

        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "OpenStreetMap contributors",
          },
        },

        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },

      center: [73.8567, 18.5204],
      zoom: 12,
    });

    map.addControl(
      new maplibregl.NavigationControl(),
      "top-right",
    );

    mapRef.current = map;

    map.on("load", () => {
      console.log("MAP LOADED");

      requestAnimationFrame(() => {
        map.resize();

        setTimeout(() => {
          map.resize();
        }, 300);
      });
    });

    map.on("error", (event) => {
      console.error("MAP ERROR:", event);
    });

    window.addEventListener("resize", () => {
      map.resize();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const drawRoute = async () => {
    const map = mapRef.current;

    const start = currentLocationRef.current;
    const end = destinationLocationRef.current;

    if (!map || !start || !end) {
      return;
    }

    setStatus("Calculating best driving route...");

    try {
      const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`;

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
      );

      if (!response.ok) {
        throw new Error(`OSRM request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== "Ok" || !data.routes?.length) {
        setStatus("No driving route found.");
        return;
      }

      const route = data.routes[0];

      const routeGeoJSON = {
        type: "Feature",
        properties: {},
        geometry: route.geometry,
      };

      const existingSource = map.getSource("route");

      if (existingSource) {
        (
          existingSource as maplibregl.GeoJSONSource
        ).setData(routeGeoJSON as any);
      } else {
        map.addSource("route", {
          type: "geojson",
          data: routeGeoJSON as any,
        });

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#0f766e",
            "line-width": 6,
            "line-opacity": 0.9,
          },
        });
      }

      const distanceKm = route.distance / 1000;
      const durationMinutes = Math.round(route.duration / 60);

      setDistance(`${distanceKm.toFixed(1)} km`);

      if (durationMinutes < 60) {
        setDuration(`${durationMinutes} min`);
      } else {
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        setDuration(
          minutes === 0
            ? `${hours}h`
            : `${hours}h ${minutes}m`,
        );
      }

      setStatus("Route calculated.");

      const bounds = new maplibregl.LngLatBounds();

      bounds.extend(start);
      bounds.extend(end);

      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: 15,
      });
    } catch (error) {
      console.error("Routing error:", error);
      setStatus("Unable to calculate route.");
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus(
        "Location is not supported by this browser.",
      );
      return;
    }

    setStatus("Getting your current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const coordinates: [number, number] = [
          longitude,
          latitude,
        ];

        currentLocationRef.current = coordinates;

        const map = mapRef.current;

        if (!map) return;

        currentMarkerRef.current?.remove();

        currentMarkerRef.current =
          new maplibregl.Marker()
            .setLngLat(coordinates)
            .addTo(map);

        map.flyTo({
          center: coordinates,
          zoom: 14,
        });

        setStatus("Current location detected.");

        if (destinationLocationRef.current) {
          drawRoute();
        }
      },

      (error) => {
        console.error(
          "Geolocation error:",
          error,
        );

        setStatus(
          "Unable to access your location. Please allow location access.",
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  };

  const findDestination = async () => {
    if (!destination.trim()) {
      setStatus("Enter a destination first.");
      return;
    }

    setStatus("Finding destination...");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          destination,
        )}`,
      );

      const results = await response.json();

      if (!results.length) {
        setStatus("Destination not found.");
        return;
      }

      const latitude = Number(results[0].lat);
      const longitude = Number(results[0].lon);

      const coordinates: [number, number] = [
        longitude,
        latitude,
      ];

      destinationLocationRef.current = coordinates;

      const map = mapRef.current;

      if (!map) return;

      destinationMarkerRef.current?.remove();

      destinationMarkerRef.current =
        new maplibregl.Marker()
          .setLngLat(coordinates)
          .addTo(map);

      map.flyTo({
        center: coordinates,
        zoom: 14,
      });

      setStatus("Destination found.");

      setDistance(null);
      setDuration(null);

      if (currentLocationRef.current) {
        drawRoute();
      }
    } catch (error) {
      console.error(
        "Destination search error:",
        error,
      );

      setStatus(
        "Unable to find destination.",
      );
    }
  };

  return (
    <div className="relative z-0 h-[420px] w-full overflow-hidden rounded-xl">
      <div
        ref={mapContainer}
        className="absolute inset-0 z-0 h-full w-full"
      />

      <div className="absolute left-4 top-4 z-10 w-[390px] rounded-xl bg-white p-4 shadow-lg">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-900">
            Route planning
          </p>

          <p className="text-xs text-slate-500">
            Set your current location and destination
          </p>
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          className="mb-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Use my current location
        </button>

        <div className="flex gap-2">
          <input
            value={destination}
            onChange={(event) =>
              setDestination(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                findDestination();
              }
            }}
            placeholder="Enter destination"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
          />

          <button
            type="button"
            onClick={findDestination}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white"
          >
            Go
          </button>
        </div>

        {status && (
          <p className="mt-2 text-xs text-slate-500">
            {status}
          </p>
        )}

        {(distance || duration) && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <div>
              <p className="text-[11px] text-slate-500">
                Distance
              </p>

              <p className="text-sm font-bold text-slate-900">
                {distance}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-slate-500">
                Estimated time
              </p>

              <p className="text-sm font-bold text-slate-900">
                {duration}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default function RoutePage() {
  return <RouteMap />;
}
