"use client";

import MapLibreGL, { type LngLatLike, type MarkerOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X, Minus, Plus, Locate, Maximize2 } from "lucide-react";

import { cn } from "@/lib/utils";

const defaultStyles = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

type Theme = "light" | "dark";

interface MapContextValue {
  map: MapLibreGL.Map | null;
  theme: Theme;
}

const MapContext = createContext<MapContextValue | null>(null);

export function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMap must be used within a Map component");
  }
  return context;
}

interface MapProps {
  center?: LngLatLike;
  zoom?: number;
  theme?: Theme;
  style?: string;
  className?: string;
  children?: ReactNode;
  onLoad?: (map: MapLibreGL.Map) => void;
}

export const Map = forwardRef<MapLibreGL.Map, MapProps>(
  (
    {
      center = [36.8219, -1.2921],
      zoom = 12,
      theme = "light",
      style,
      className,
      children,
      onLoad,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<MapLibreGL.Map | null>(null);

    useImperativeHandle(ref, () => map as MapLibreGL.Map, [map]);

    useEffect(() => {
      if (!containerRef.current) return;

      const mapInstance = new MapLibreGL.Map({
        container: containerRef.current,
        style: style || defaultStyles[theme],
        center: center as [number, number],
        zoom,
      });

      mapInstance.on("load", () => {
        setMap(mapInstance);
        onLoad?.(mapInstance);
      });

      return () => {
        mapInstance.remove();
      };
    }, []);

    useEffect(() => {
      if (!map) return;

      map.flyTo({
        center: center as [number, number],
        zoom,
        essential: true,
      });
    }, [map, center, zoom]);

    const contextValue = useMemo(
      () => ({ map, theme }),
      [map, theme]
    );

    return (
      <MapContext.Provider value={contextValue}>
        <div className={cn("relative w-full h-full", className)}>
          <div ref={containerRef} className="w-full h-full" />
          {map && children}
        </div>
      </MapContext.Provider>
    );
  }
);
Map.displayName = "Map";

interface MarkerProps {
  longitude: number;
  latitude: number;
  options?: MarkerOptions;
  children?: ReactNode;
  onClick?: () => void;
  onDragEnd?: (coordinates: { longitude: number; latitude: number }) => void;
}

export function Marker({
  longitude,
  latitude,
  options,
  children,
  onClick,
  onDragEnd,
}: MarkerProps) {
  const { map } = useMap();
  const markerRef = useRef<MapLibreGL.Marker | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map) return;

    const element = document.createElement("div");
    elementRef.current = element;

    const marker = new MapLibreGL.Marker({ element, ...options })
      .setLngLat([longitude, latitude])
      .addTo(map);

    if (onClick) {
      element.addEventListener("click", onClick);
    }

    if (onDragEnd) {
      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        onDragEnd({
          longitude: lngLat.lng,
          latitude: lngLat.lat,
        });
      });
    }

    markerRef.current = marker;

    return () => {
      if (onClick && element) {
        element.removeEventListener("click", onClick);
      }
      marker.remove();
    };
  }, [map, longitude, latitude, onClick, onDragEnd, options]);

  if (!elementRef.current) return null;

  return createPortal(children, elementRef.current);
}

interface PopupProps {
  longitude: number;
  latitude: number;
  closeButton?: boolean;
  closeOnClick?: boolean;
  onClose?: () => void;
  children: ReactNode;
}

export function Popup({
  longitude,
  latitude,
  closeButton = true,
  closeOnClick = true,
  onClose,
  children,
}: PopupProps) {
  const { map } = useMap();
  const popupRef = useRef<MapLibreGL.Popup | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map) return;

    const element = document.createElement("div");
    elementRef.current = element;

    const popup = new MapLibreGL.Popup({
      closeButton,
      closeOnClick,
    })
      .setLngLat([longitude, latitude])
      .setDOMContent(element)
      .addTo(map);

    if (onClose) {
      popup.on("close", onClose);
    }

    popupRef.current = popup;

    return () => {
      popup.remove();
    };
  }, [map, longitude, latitude, closeButton, closeOnClick, onClose]);

  if (!elementRef.current) return null;

  return createPortal(children, elementRef.current);
}

interface NavigationControlProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export function NavigationControl({ position = "top-right" }: NavigationControlProps) {
  const { map } = useMap();

  useEffect(() => {
    if (!map) return;

    const nav = new MapLibreGL.NavigationControl();
    map.addControl(nav, position);

    return () => {
      map.removeControl(nav);
    };
  }, [map, position]);

  return null;
}

interface RouteProps {
  coordinates: [number, number][];
  color?: string;
  width?: number;
}

export function Route({ coordinates, color = "#3b82f6", width = 3 }: RouteProps) {
  const { map } = useMap();
  const id = useId();
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;

  useEffect(() => {
    if (!map || coordinates.length < 2) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        },
      });

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": color,
          "line-width": width,
        },
      });
    } else {
      const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      });
    }

    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [map, coordinates, color, width, sourceId, layerId]);

  return null;
}
