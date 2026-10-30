'use client';

import React, { useRef, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
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
import messages from '@/lib/messages';

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
  const contentGroupRef = useRef<SVGGElement>(null);

  const [position, setPosition] = useState<{
    coordinates: [number, number];
    zoom: number;
  }>({
    coordinates: [MAP_CENTER_LNG, MAP_CENTER_LAT],
    zoom: 1,
  });

  const handleZoomIn = () => {
    setPosition((prev) => {
      if (prev.zoom >= 4) return prev;
      const nextZoom = Math.min(4, Math.round(prev.zoom * 1.4 * 10) / 10);
      return { ...prev, zoom: nextZoom };
    });
  };

  const handleZoomOut = () => {
    setPosition((prev) => {
      if (prev.zoom <= 1) return prev;
      const nextZoom = Math.max(1, Math.round((prev.zoom / 1.4) * 10) / 10);
      return { ...prev, zoom: nextZoom };
    });
  };

  const handleResetZoom = () => {
    setPosition({
      coordinates: [MAP_CENTER_LNG, MAP_CENTER_LAT],
      zoom: 1,
    });
  };

  const handleMoveEnd = (pos: { coordinates?: [number, number]; zoom?: number }) => {
    if (pos.coordinates && typeof pos.zoom === 'number') {
      setPosition({
        coordinates: pos.coordinates,
        zoom: Math.max(1, Math.min(4, Math.round(pos.zoom * 100) / 100)),
      });
    }
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onMapClick || !interactive) return;

    // Use contentGroup's CTM if available to accurately invert any zoom or pan transform
    if (contentGroupRef.current && contentGroupRef.current.ownerSVGElement) {
      const ctm = contentGroupRef.current.getScreenCTM();
      if (ctm) {
        const svg = contentGroupRef.current.ownerSVGElement;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const transformed = pt.matrixTransform(ctm.inverse());
        const coords = svgPointToCoords(
          transformed.x,
          transformed.y,
          DEFAULT_MAP_WIDTH,
          DEFAULT_MAP_HEIGHT
        );
        if (coords) {
          onMapClick(coords[0], coords[1]);
          return;
        }
      }
    }

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
      {/* Zoom and Scale Controls */}
      <div
        data-testid="map-zoom-controls"
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex flex-col items-center bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl shadow-md border border-zinc-200/90 dark:border-zinc-800/90 p-1 divide-y divide-zinc-200 dark:divide-zinc-800"
      >
        {/* Zoom In */}
        <button
          type="button"
          id="btn-map-zoom-in"
          data-testid="btn-map-zoom-in"
          onClick={handleZoomIn}
          disabled={position.zoom >= 4}
          aria-label={messages.map.zoomIn}
          title={messages.map.zoomIn}
          className="p-2 sm:p-2.5 text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Zoom Percentage Indicator */}
        <div
          data-testid="map-zoom-level"
          aria-label={messages.map.zoomLevel}
          title={`${messages.map.zoomLevel}: ${Math.round(position.zoom * 100)}%`}
          className="py-1 px-1.5 text-[10px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-400 text-center select-none min-w-[42px]"
        >
          {Math.round(position.zoom * 100)}%
        </div>

        {/* Zoom Out */}
        <button
          type="button"
          id="btn-map-zoom-out"
          data-testid="btn-map-zoom-out"
          onClick={handleZoomOut}
          disabled={position.zoom <= 1}
          aria-label={messages.map.zoomOut}
          title={messages.map.zoomOut}
          className="p-2 sm:p-2.5 text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Reset Zoom & Center */}
        <button
          type="button"
          id="btn-map-zoom-reset"
          data-testid="btn-map-zoom-reset"
          onClick={handleResetZoom}
          disabled={
            position.zoom === 1 &&
            position.coordinates[0] === MAP_CENTER_LNG &&
            position.coordinates[1] === MAP_CENTER_LAT
          }
          aria-label={messages.map.resetZoom}
          title={messages.map.resetZoom}
          className="p-2 sm:p-2.5 text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      {/* Pan & Drag hint when zoomed */}
      {position.zoom > 1 && (
        <div
          data-testid="map-drag-hint"
          className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10 bg-zinc-900/80 text-white text-[11px] sm:text-xs py-1 px-2.5 rounded-full shadow backdrop-blur pointer-events-none transition-opacity"
        >
          {messages.map.dragToPanHint}
        </div>
      )}

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
        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          minZoom={1}
          maxZoom={4}
          onMoveEnd={handleMoveEnd}
        >
          <g ref={contentGroupRef}>
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
          </g>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
