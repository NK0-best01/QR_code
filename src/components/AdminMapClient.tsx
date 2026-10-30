'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import Link from 'next/link';
import messages from '@/lib/messages';
import { ThailandMap, RegisteredPin } from '@/components/ThailandMap';
import { PinHistoryList, PinLogItem } from '@/components/PinHistoryList';
import { isPointInProvince } from '@/lib/province-geo';
import { buildGoogleMapsUrl, parseGoogleMapsUrl } from '@/lib/google-maps';

export interface RegistrationItem {
  id: number;
  deviceId: string;
  uid: string;
  deviceType: string;
  region: string;
  province: string;
  status: 'UNREGISTERED' | 'REGISTERED';
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

interface AdminMapClientProps {
  initialRegistrationId?: number | null;
}

export default function AdminMapClient({
  initialRegistrationId = null,
}: AdminMapClientProps) {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected item for Pinning / Editing
  const [activeItem, setActiveItem] = useState<RegistrationItem | null>(null);

  // Form Coordinates & Google Maps URL State
  const [previewLat, setPreviewLat] = useState<number | null>(null);
  const [previewLng, setPreviewLng] = useState<number | null>(null);
  const [googleMapsUrlInput, setGoogleMapsUrlInput] = useState<string>('');
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Selected Pin in View Mode (for viewing details & history)
  const [viewPinId, setViewPinId] = useState<number | null>(null);
  const [pinLogs, setPinLogs] = useState<PinLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Submission State
  const [isSubmitting, startTransition] = useTransition();

  // Helper to activate pin mode
  const selectItemForPinning = (item: RegistrationItem) => {
    setActiveItem(item);
    setViewPinId(null);
    setPinLogs([]);
    setSuccessMessage(null);
    setError(null);
    setUrlError(null);

    if (item.latitude !== null && item.longitude !== null) {
      setPreviewLat(item.latitude);
      setPreviewLng(item.longitude);
      setGoogleMapsUrlInput(buildGoogleMapsUrl(item.latitude, item.longitude));
    } else {
      setPreviewLat(null);
      setPreviewLng(null);
      setGoogleMapsUrlInput('');
    }
  };

  // Load initial registrations
  const fetchRegistrations = async () => {
    try {
      const res = await fetch('/api/registrations?pageSize=100');
      if (!res.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลรายการอุปกรณ์ได้');
      }
      const data = await res.json();
      const items: RegistrationItem[] = data.items || [];
      setRegistrations(items);
      setLoading(false);
      return items;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setLoading(false);
      return [];
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch('/api/registrations?pageSize=100');
        if (!isMounted) return;
        if (!res.ok) {
          setError('ไม่สามารถดึงข้อมูลรายการอุปกรณ์ได้');
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!isMounted) return;
        const items: RegistrationItem[] = data.items || [];
        setRegistrations(items);
        setLoading(false);

        if (initialRegistrationId) {
          const found = items.find((i) => i.id === initialRegistrationId);
          if (found) {
            selectItemForPinning(found);
          } else {
            setError(messages.map.deviceNotFound);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [initialRegistrationId]);

  // Load logs when viewPinId changes
  useEffect(() => {
    if (!viewPinId) {
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/registrations/${viewPinId}/logs`);
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setPinLogs(data.items || data.logs || []);
        } else {
          setPinLogs([]);
        }
      } catch {
        if (!isMounted) return;
        setPinLogs([]);
      } finally {
        if (isMounted) setLogsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [viewPinId]);

  // Registered Pins for Map rendering
  const registeredPins: RegisteredPin[] = useMemo(() => {
    return registrations
      .filter((r) => r.status === 'REGISTERED' && r.latitude !== null && r.longitude !== null)
      .map((r) => ({
        id: r.id,
        deviceId: r.deviceId,
        latitude: r.latitude!,
        longitude: r.longitude!,
        province: r.province,
        deviceType: r.deviceType,
      }));
  }, [registrations]);

  // Handle URL change from user input
  const handleUrlChange = async (val: string) => {
    setGoogleMapsUrlInput(val);
    setUrlError(null);

    const trimmed = val.trim();
    if (!trimmed) {
      setPreviewLat(null);
      setPreviewLng(null);
      setIsResolvingUrl(false);
      return;
    }

    const parseResult = parseGoogleMapsUrl(trimmed);

    if (parseResult.type === 'COORDINATES') {
      setPreviewLat(parseResult.latitude);
      setPreviewLng(parseResult.longitude);
      setIsResolvingUrl(false);
    } else if (parseResult.type === 'SHORT_LINK') {
      setIsResolvingUrl(true);
      try {
        const res = await fetch('/api/maps/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: parseResult.url }),
        });
        const data = await res.json();
        if (!res.ok) {
          setUrlError(data.error || messages.map.invalidGoogleMapsUrl);
          setPreviewLat(null);
          setPreviewLng(null);
        } else {
          setPreviewLat(data.latitude);
          setPreviewLng(data.longitude);
        }
      } catch {
        setUrlError(messages.map.invalidGoogleMapsUrl);
        setPreviewLat(null);
        setPreviewLng(null);
      } finally {
        setIsResolvingUrl(false);
      }
    } else {
      setUrlError(messages.map.invalidGoogleMapsUrl);
      setPreviewLat(null);
      setPreviewLng(null);
      setIsResolvingUrl(false);
    }
  };

  const hasValidNumbers =
    previewLat !== null &&
    previewLng !== null &&
    Number.isFinite(previewLat) &&
    Number.isFinite(previewLng);

  // Validate province boundary if an item is active
  const isInsideProvince = useMemo(() => {
    if (!activeItem || !hasValidNumbers) return false;
    try {
      return isPointInProvince(activeItem.province, previewLat!, previewLng!);
    } catch {
      return false;
    }
  }, [activeItem, hasValidNumbers, previewLat, previewLng]);

  // Check if coordinates changed in edit mode
  const isCoordsChanged = useMemo(() => {
    if (!activeItem || activeItem.status !== 'REGISTERED') return true;
    if (!hasValidNumbers || activeItem.latitude === null || activeItem.longitude === null)
      return false;
    return (
      Math.abs(previewLat! - activeItem.latitude) > 0.000001 ||
      Math.abs(previewLng! - activeItem.longitude) > 0.000001
    );
  }, [activeItem, hasValidNumbers, previewLat, previewLng]);

  // Enable/disable submit button
  const canSubmit =
    hasValidNumbers &&
    isInsideProvince &&
    isCoordsChanged &&
    !isSubmitting &&
    !isResolvingUrl;

  const handleCancel = () => {
    setActiveItem(null);
    setPreviewLat(null);
    setPreviewLng(null);
    setGoogleMapsUrlInput('');
    setUrlError(null);
    setSuccessMessage(null);
    setError(null);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!activeItem) return;
    setPreviewLat(lat);
    setPreviewLng(lng);
    setGoogleMapsUrlInput(buildGoogleMapsUrl(lat, lng));
    setUrlError(null);
    setError(null);
  };

  const handlePinSelect = (pinId: number) => {
    // If not in active pin mode, select pin for viewing details
    if (!activeItem) {
      setViewPinId(pinId);
      setSuccessMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem || !canSubmit || previewLat === null || previewLng === null) return;

    startTransition(async () => {
      try {
        setError(null);
        setSuccessMessage(null);

        const isConfirm = activeItem.status === 'UNREGISTERED';
        const url = isConfirm
          ? `/api/registrations/${activeItem.id}/confirm`
          : `/api/registrations/${activeItem.id}/pin`;
        const method = isConfirm ? 'POST' : 'PATCH';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: previewLat,
            longitude: previewLng,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 409) {
            setError(messages.map.alreadyConfirmed);
            await fetchRegistrations();
            return;
          }
          if (data.code === 'PIN_OUTSIDE_PROVINCE') {
            setError(messages.map.pinOutsideProvince);
            return;
          }
          throw new Error(data.error || 'การบันทึกตำแหน่งหมุดล้มเหลว');
        }

        // Success
        setSuccessMessage(
          isConfirm ? messages.map.pinConfirmedSuccess : messages.map.pinUpdatedSuccess
        );

        // Refresh data
        await fetchRegistrations();
        setViewPinId(activeItem.id);
        setActiveItem(null);
        setPreviewLat(null);
        setPreviewLng(null);
        setGoogleMapsUrlInput('');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    });
  };

  const selectedViewItem = useMemo(() => {
    return registrations.find((r) => r.id === viewPinId) || null;
  }, [registrations, viewPinId]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1
            data-testid="admin-map-heading"
            className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            {messages.map.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {messages.map.subtitle}
          </p>
        </div>

        <Link
          href="/dashboard"
          id="link-back-dashboard"
          data-testid="link-back-dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{messages.map.backToDashboard}</span>
        </Link>
      </div>

      {/* Alert Banners */}
      {error && (
        <div
          role="alert"
          data-testid="map-error-banner"
          className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-start gap-3"
        >
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          data-testid="map-success-banner"
          className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-3"
        >
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div className="flex-1 font-medium">{successMessage}</div>
        </div>
      )}

      {/* Main Grid: Map on Left (or Top), Control & Details Panel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Map Container (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                {activeItem
                  ? activeItem.status === 'UNREGISTERED'
                    ? `${messages.map.pinMode} (${activeItem.province})`
                    : `${messages.map.editPinMode} (${activeItem.province})`
                  : messages.map.allRegisteredPins}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {registeredPins.length} หมุด
              </span>
            </div>

            <ThailandMap
              registeredPins={registeredPins}
              selectedPinId={viewPinId}
              onPinSelect={handlePinSelect}
              highlightedProvince={activeItem?.province || null}
              previewCoords={hasValidNumbers ? [previewLat!, previewLng!] : null}
              originalCoords={
                activeItem?.status === 'REGISTERED' &&
                activeItem.latitude !== null &&
                activeItem.longitude !== null
                  ? [activeItem.latitude, activeItem.longitude]
                  : null
              }
              onMapClick={handleMapClick}
              interactive={!!activeItem}
            />

            {activeItem && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center mt-3">
                {messages.map.clickToPlacePin}
              </p>
            )}
          </div>
        </div>

        {/* Right: Management & Detail Panel (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Device Selection Dropdown */}
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
            <label
              htmlFor="select-registration"
              className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {messages.map.selectDevicePrompt}
            </label>
            <select
              id="select-registration"
              data-testid="select-registration"
              value={activeItem ? activeItem.id : ''}
              onChange={(e) => {
                const id = parseInt(e.target.value, 10);
                if (id) {
                  const item = registrations.find((r) => r.id === id);
                  if (item) selectItemForPinning(item);
                } else {
                  handleCancel();
                }
              }}
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- เลือกอุปกรณ์ในระบบ --</option>
              {registrations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.deviceId} ({item.province}) -{' '}
                  {item.status === 'REGISTERED' ? 'ลงทะเบียนแล้ว' : 'ยังไม่ลงทะเบียน'}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Pin Placement / Edit Form Panel */}
          {activeItem ? (
            <div
              data-testid="pin-form-panel"
              className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {activeItem.status === 'UNREGISTERED'
                    ? messages.map.pinMode
                    : messages.map.editPinMode}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    activeItem.status === 'REGISTERED'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {activeItem.status === 'REGISTERED'
                    ? messages.dashboard.registered
                    : messages.dashboard.unregistered}
                </span>
              </div>

              {/* Active Item Info Summary */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-xs space-y-1">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">รหัสอุปกรณ์: </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {activeItem.deviceId}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">จังหวัดที่ระบุ: </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {activeItem.province} ({activeItem.region})
                  </span>
                </div>
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="input-google-maps-url"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    {messages.map.googleMapsUrlLabel}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="input-google-maps-url"
                      data-testid="input-google-maps-url"
                      placeholder={messages.map.googleMapsUrlPlaceholder}
                      value={googleMapsUrlInput}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      className="w-full pl-3.5 pr-28 py-2.5 rounded-xl text-xs border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    {isResolvingUrl && (
                      <div className="absolute right-3 top-2.5 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                        <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[11px] font-medium">กำลังตรวจสอบ...</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {messages.map.googleMapsUrlHelp}
                  </p>
                </div>

                {/* Validation message if invalid URL */}
                {urlError && (
                  <div
                    data-testid="validation-error-invalid-url"
                    className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-medium"
                  >
                    ⚠️ {urlError}
                  </div>
                )}

                {/* Validation message if outside province */}
                {hasValidNumbers && !isInsideProvince && (
                  <div
                    data-testid="validation-error-outside-province"
                    className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 font-medium"
                  >
                    ⚠️ {messages.map.pinOutsideProvince} (ต้องอยู่ในจังหวัด {activeItem.province})
                  </div>
                )}

                {/* Success badge if valid & inside province */}
                {hasValidNumbers && isInsideProvince && (
                  <div
                    data-testid="badge-inside-province"
                    className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5"
                  >
                    <span>✓</span>
                    <span>
                      {messages.map.coordsFoundInProvince} {activeItem.province} เรียบร้อยแล้ว
                    </span>
                  </div>
                )}

                {/* Submit & Cancel Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    id="btn-submit-pin"
                    data-testid="btn-submit-pin"
                    disabled={!canSubmit}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 dark:disabled:text-zinc-600 transition cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  >
                    {isSubmitting
                      ? messages.map.saving
                      : activeItem.status === 'UNREGISTERED'
                      ? messages.map.confirmRegistrationBtn
                      : messages.map.savePinUpdateBtn}
                  </button>

                  <button
                    type="button"
                    id="btn-cancel-pin"
                    data-testid="btn-cancel-pin"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="py-2.5 px-4 rounded-xl text-sm font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    {messages.map.cancelBtn}
                  </button>
                </div>
              </form>
            </div>
          ) : selectedViewItem ? (
            /* 3. Detail View of Selected Pin */
            <div
              data-testid="pin-detail-panel"
              className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {messages.map.deviceDetails}
                </span>
                <button
                  type="button"
                  onClick={() => selectItemForPinning(selectedViewItem)}
                  id="btn-edit-pin-from-detail"
                  data-testid="btn-edit-pin-from-detail"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 transition cursor-pointer"
                >
                  ✏️ {messages.map.editPin}
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-800/60">
                  <span className="text-zinc-500 dark:text-zinc-400">รหัสอุปกรณ์:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                    {selectedViewItem.deviceId}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-800/60">
                  <span className="text-zinc-500 dark:text-zinc-400">UID:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {selectedViewItem.uid}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-800/60">
                  <span className="text-zinc-500 dark:text-zinc-400">ประเภท:</span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {selectedViewItem.deviceType}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-800/60">
                  <span className="text-zinc-500 dark:text-zinc-400">จังหวัด:</span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {selectedViewItem.province} ({selectedViewItem.region})
                  </span>
                </div>
                {selectedViewItem.latitude !== null && selectedViewItem.longitude !== null && (
                  <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-800/60">
                    <span className="text-zinc-500 dark:text-zinc-400">สถานะหมุด:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      ปักหมุดใน {selectedViewItem.province} แล้ว
                    </span>
                  </div>
                )}
              </div>

              {/* Link to Google Maps */}
              {selectedViewItem.latitude !== null && selectedViewItem.longitude !== null && (
                <a
                  href={buildGoogleMapsUrl(
                    selectedViewItem.latitude,
                    selectedViewItem.longitude
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-google-maps"
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>{messages.map.openGoogleMaps}</span>
                </a>
              )}

              {/* Audit History Log */}
              <PinHistoryList logs={pinLogs} loading={logsLoading} />
            </div>
          ) : (
            /* 4. Empty placeholder when nothing selected */
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-500 dark:text-zinc-400">
              คลิกหมุดบนแผนที่เพื่อดูข้อมูล หรือเลือกอุปกรณ์จากเมนูด้านบนเพื่อปัก/แก้ไขตำแหน่ง
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
