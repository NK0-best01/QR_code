'use client';

import React, { useRef } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps';
import thailandGeoData from '@/data/thailand-provinces.json';
import {
  DEFAULT_MAP_WIDTH,
  DEFAULT_MAP_HEIGHT,
  MAP_CENTER_LNG,
  MAP_CENTER_LAT,
  MAP_SCALE,
  clientToSvgCoordinates,
  svgPointToCoords,
} from '@/lib/map-coords';

export interface RegisteredPin {
  id: number;
  deviceId: string;
  latitude: number;
  longitude: number;
  province?: string;
  deviceType?: string;
}

interface ThailandMapProps {
  registeredPins?: RegisteredPin[];
  selectedPinId?: number | null;
  onPinSelect?: (id: number) => void;
  highlightedProvince?: string | null;
  previewCoords?: [number, number] | null; // [latitude, longitude]
  originalCoords?: [number, number] | null; // [latitude, longitude]
  onMapClick?: (latitude: number, longitude: number) => void;
  interactive?: boolean;
}

export function ThailandMap({
  registeredPins = [],
  selectedPinId = null,
  onPinSelect,
  highlightedProvince = null,
  previewCoords = null,
  originalCoords = null,
  onMapClick,
  interactive = true,
}: ThailandMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onMapClick || !interactive) return;

    const svgElement = e.currentTarget;
    const svgPoint = clientToSvgCoordinates(e.clientX, e.clientY, svgElement);
    if (!svgPoint) return;

    const coords = svgPointToCoords(
      svgPoint[0],
      svgPoint[1],
      DEFAULT_MAP_WIDTH,
      DEFAULT_MAP_HEIGHT
    );
    if (coords) {
      onMapClick(coords[0], coords[1]);
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="thailand-map-container"
      className="relative w-full max-w-2xl mx-auto aspect-[4/5] bg-sky-50/50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-2 sm:p-4 overflow-hidden select-none"
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [MAP_CENTER_LNG, MAP_CENTER_LAT],
          scale: MAP_SCALE,
        }}
        width={DEFAULT_MAP_WIDTH}
        height={DEFAULT_MAP_HEIGHT}
        className="w-full h-full"
        onClick={handleSvgClick}
      >
        <Geographies
          geography={thailandGeoData as unknown as import('geojson').GeoJsonObject}
        >
          {({ geographies }) =>
            geographies.map((geo) => {
              const provinceName =
                (geo.properties?.name_th as string) ||
                (geo.properties?.name as string) ||
                '';
              const isHighlighted =
                highlightedProvince && provinceName === highlightedProvince;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  data-testid={`province-${provinceName}`}
                  data-highlighted={isHighlighted ? 'true' : 'false'}
                  fill={isHighlighted ? '#93c5fd' : '#e4e4e7'}
                  stroke={isHighlighted ? '#1d4ed8' : '#a1a1aa'}
                  strokeWidth={isHighlighted ? 2.5 : 0.75}
                  className={`transition-colors outline-none ${
                    interactive ? 'hover:brightness-95 cursor-crosshair' : ''
                  }`}
                />
              );
            })
          }
        </Geographies>

        {/* 1. Original Position Marker (in edit mode) */}
        {originalCoords && (
          <Marker
            coordinates={[originalCoords[1], originalCoords[0]]}
            data-testid="marker-original-position"
          >
            <circle
              r={6}
              className="fill-zinc-400/80 stroke-white dark:stroke-zinc-900 stroke-2"
            />
            <text
              textAnchor="middle"
              y={-12}
              className="text-[11px] font-medium fill-zinc-600 dark:fill-zinc-300 pointer-events-none"
            >
              ตำแหน่งเดิม
            </text>
          </Marker>
        )}

        {/* 2. Registered Pins */}
        {registeredPins.map((pin) => {
          const isSelected = selectedPinId === pin.id;
          return (
            <Marker
              key={pin.id}
              coordinates={[pin.longitude, pin.latitude]}
              data-testid={`pin-registered-${pin.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onPinSelect?.(pin.id);
              }}
            >
              <g
                transform="translate(0, -14)"
                onClick={(e) => {
                  e.stopPropagation();
                  onPinSelect?.(pin.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPinSelect?.(pin.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={pin.deviceId}
                className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {/* Pin shadow */}
                <ellipse cx={0} cy={14} rx={4} ry={2} className="fill-black/20" />
                {/* Pin icon */}
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  transform="scale(0.9) translate(-12, -18)"
                  className={`${
                    isSelected
                      ? 'fill-blue-600 stroke-white dark:stroke-zinc-900 stroke-2'
                      : 'fill-red-600 stroke-white dark:stroke-zinc-900 stroke-1 hover:fill-red-700'
                  } transition-colors`}
                />
              </g>
            </Marker>
          );
        })}

        {/* 3. Preview Placement Pin (new position marker) */}
        {previewCoords && (
          <Marker
            coordinates={[previewCoords[1], previewCoords[0]]}
            data-testid="marker-preview-position"
          >
            <g transform="translate(0, -16)">
              {/* Pulsing ring */}
              <circle
                r={10}
                className="fill-orange-400/30 animate-ping"
              />
              {/* Pin icon */}
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                transform="scale(1.1) translate(-12, -18)"
                className="fill-orange-500 stroke-white dark:stroke-zinc-900 stroke-2"
              />
              <text
                textAnchor="middle"
                y={-22}
                className="text-[12px] font-bold fill-orange-700 dark:fill-orange-300 pointer-events-none"
              >
                ตำแหน่งใหม่
              </text>
            </g>
          </Marker>
        )}
      </ComposableMap>
    </div>
  );
}
