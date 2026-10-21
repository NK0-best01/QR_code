'use client';

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { registrationSchema, RegistrationInput } from '@/lib/schemas';
import { REGION_NAMES, THAI_REGIONS, getProvincesByRegion } from '@/data/thai-regions';
import { DEVICE_TYPE_CODES, DEVICE_TYPES, isValidDeviceType } from '@/data/device-types';
import messages from '@/lib/messages';

type RegionName = (typeof REGION_NAMES)[number];
type DeviceTypeCode = (typeof DEVICE_TYPE_CODES)[number];

const zod4Resolver =
  <T extends z.ZodTypeAny>(schema: T) =>
  async (values: unknown) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues || []) {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = { type: issue.code, message: issue.message };
      }
    }
    return { values: {}, errors };
  };

export interface RegistrationRecord {
  id: number;
  uid: string;
  region: string;
  province: string;
  deviceType: string;
  seq: number;
  deviceId: string;
  createdAt: string;
}

interface RegisterFormProps {
  uid: string;
  onSuccess?: (record: RegistrationRecord) => void;
  onBackHome?: () => void;
}

export function RegisterForm({ uid, onSuccess, onBackHome }: RegisterFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [sampleDeviceId, setSampleDeviceId] = useState('');
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [submissionError, setSubmissionError] = useState<{
    status: number;
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [successRecord, setSuccessRecord] = useState<RegistrationRecord | null>(null);
  const [countdown, setCountdown] = useState<number>(3);

  // Return to home page cleanly, wiping residual sessionStorage
  const handleReturnHome = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('register_uid');
      } catch {
        // ignore
      }
    }
    if (onBackHome) {
      onBackHome();
    } else {
      router.replace('/');
    }
  }, [onBackHome, router]);

  // Auto-redirect countdown on success view
  useEffect(() => {
    if (!successRecord) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      handleReturnHome();
    }, 0);
    return () => clearTimeout(timer);
  }, [successRecord, countdown, handleReturnHome]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<RegistrationInput>({
    resolver: zod4Resolver(registrationSchema),
    defaultValues: {
      uid,
      region: '' as RegionName,
      province: '',
      deviceType: '' as DeviceTypeCode,
    },
    mode: 'onChange',
  });

  const selectedRegion = useWatch({ control, name: 'region' });
  const selectedProvince = useWatch({ control, name: 'province' });
  const selectedDeviceType = useWatch({ control, name: 'deviceType' });

  // Fetch preview sample device ID when deviceType changes
  const fetchSampleId = useCallback(async (code: string) => {
    if (!isValidDeviceType(code)) {
      setSampleDeviceId('');
      return;
    }

    setIsLoadingSample(true);
    try {
      const res = await fetch(`/api/device-types/${code}/next`);
      if (res.ok) {
        const data = await res.json();
        setSampleDeviceId(data.deviceId || '');
      } else {
        setSampleDeviceId('');
      }
    } catch {
      setSampleDeviceId('');
    } finally {
      setIsLoadingSample(false);
    }
  }, []);

  // Handle region change to reset province
  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRegion = e.target.value as RegionName;
    setValue('region', newRegion, { shouldValidate: true });
    setValue('province', '', { shouldValidate: true });
  };

  // Handle device type change to fetch sample ID
  const handleDeviceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value as DeviceTypeCode;
    setValue('deviceType', code, { shouldValidate: true });
    void fetchSampleId(code);
  };

  const isFormComplete = Boolean(
    uid &&
    selectedRegion &&
    selectedProvince &&
    selectedDeviceType &&
    isValidDeviceType(selectedDeviceType)
  );

  const onSubmit = async (data: RegistrationInput) => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (res.status === 201) {
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem('register_uid');
          } catch {
            // ignore
          }
        }
        setSuccessRecord(json);
        if (onSuccess) {
          onSuccess(json);
        }
      } else if (res.status === 409) {
        setSubmissionError({
          status: 409,
          message: json.error || messages.register.uidAlreadyRegistered,
        });
      } else if (res.status === 400) {
        setSubmissionError({
          status: 400,
          message: json.error || 'ข้อมูลที่กรอกไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
        });
      } else {
        setSubmissionError({
          status: res.status,
          message: json.error || messages.register.unknownError,
        });
      }
    } catch {
      setSubmissionError({
        status: 500,
        message: messages.register.unknownError,
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    void handleSubmit(onSubmit)(e);
  };

  const provinces = selectedRegion ? getProvincesByRegion(selectedRegion) : [];

  // Success view
  if (successRecord) {
    return (
      <div
        data-testid="registration-success-card"
        className="space-y-6 text-center py-4 animate-fade-in"
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {messages.register.registrationSuccess}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            ระบบได้บันทึกข้อมูลและจองรหัสอุปกรณ์เรียบร้อยแล้ว
          </p>
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 pt-1">
            กำลังกลับสู่หน้าหลักอัตโนมัติใน {countdown} วินาที...
          </p>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700/80 text-left space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b border-zinc-200/60 dark:border-zinc-800">
            <span className="text-zinc-500">{messages.register.deviceIdActualLabel}:</span>
            <span
              id="display-actual-device-id"
              data-testid="display-actual-device-id"
              className="font-mono font-bold text-blue-600 dark:text-blue-400 text-base"
            >
              {successRecord.deviceId}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-200/60 dark:border-zinc-800">
            <span className="text-zinc-500">{messages.register.uidLabel}:</span>
            <span className="font-mono">{successRecord.uid}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-200/60 dark:border-zinc-800">
            <span className="text-zinc-500">{messages.register.regionLabel}:</span>
            <span>{successRecord.region}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-200/60 dark:border-zinc-800">
            <span className="text-zinc-500">{messages.register.provinceLabel}:</span>
            <span>{successRecord.province}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-zinc-500">{messages.register.deviceTypeLabel}:</span>
            <span>{successRecord.deviceType}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            id="btn-success-home"
            data-testid="btn-success-home"
            onClick={handleReturnHome}
            className="w-full py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{messages.register.backToHome}</span>
            <span className="text-xs opacity-80">({countdown}s)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      data-testid="register-form"
      onSubmit={handleFormSubmit}
      className="space-y-5"
    >
      {/* Error Banners */}
      {submissionError && (
        <div
          role="alert"
          data-testid="register-error-banner"
          className="p-4 rounded-xl border bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 space-y-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 flex-shrink-0 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">{submissionError.message}</span>
          </div>

          {/* If 409 (duplicate UID): return to home button only, NO retry button */}
          {submissionError.status === 409 ? (
            <button
              type="button"
              id="btn-error-home"
              data-testid="btn-error-home"
              onClick={() => startTransition(() => router.push('/'))}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition cursor-pointer"
            >
              {messages.register.backToHome}
            </button>
          ) : (
            /* If 500: allow retry with same form data preserved */
            <button
              type="submit"
              id="btn-retry-submit"
              data-testid="btn-retry-submit"
              disabled={isSubmitting}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition cursor-pointer"
            >
              {messages.register.retry}
            </button>
          )}
        </div>
      )}

      {/* 1. UID Field (Read Only) */}
      <div className="space-y-1.5">
        <label
          htmlFor="display-uid"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {messages.register.uidLabel}
        </label>
        <input
          id="display-uid"
          data-testid="reg-uid"
          type="text"
          readOnly
          {...register('uid')}
          value={uid}
          className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 font-mono text-sm text-zinc-600 dark:text-zinc-300 cursor-not-allowed select-all focus:outline-none"
        />
        {errors.uid && (
          <p className="text-xs text-red-500">{errors.uid.message}</p>
        )}
      </div>

      {/* 2. ภาค (Region Dropdown) */}
      <div className="space-y-1.5">
        <label
          htmlFor="reg-region"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {messages.register.regionLabel}
        </label>
        <select
          id="reg-region"
          data-testid="reg-region"
          value={selectedRegion || ''}
          onChange={handleRegionChange}
          disabled={isSubmitting}
          aria-required="true"
          aria-invalid={!!errors.region}
          aria-describedby={errors.region ? 'reg-region-error' : undefined}
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer text-sm"
        >
          <option value="" disabled>
            {messages.register.selectRegionPlaceholder}
          </option>
          {THAI_REGIONS.map((r) => (
            <option key={r.regionId} value={r.regionName}>
              {r.regionName} ({r.provinces.length} จังหวัด)
            </option>
          ))}
        </select>
        {errors.region && (
          <p id="reg-region-error" role="alert" className="text-xs text-red-500">
            {errors.region.message}
          </p>
        )}
      </div>

      {/* 3. จังหวัด (Province Dropdown) */}
      <div className="space-y-1.5">
        <label
          htmlFor="reg-province"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {messages.register.provinceLabel}
        </label>
        <select
          id="reg-province"
          data-testid="reg-province"
          {...register('province')}
          disabled={!selectedRegion || isSubmitting}
          aria-required="true"
          aria-invalid={!!errors.province}
          aria-describedby={errors.province ? 'reg-province-error' : undefined}
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 disabled:bg-zinc-100 disabled:dark:bg-zinc-800 disabled:text-zinc-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer text-sm"
        >
          <option value="" disabled>
            {!selectedRegion
              ? messages.register.selectRegionFirst
              : messages.register.selectProvincePlaceholder}
          </option>
          {provinces.map((prov) => (
            <option key={prov} value={prov}>
              {prov}
            </option>
          ))}
        </select>
        {errors.province && (
          <p id="reg-province-error" role="alert" className="text-xs text-red-500">
            {errors.province.message}
          </p>
        )}
      </div>

      {/* 4. ประเภทอุปกรณ์ (Device Type Dropdown) */}
      <div className="space-y-1.5">
        <label
          htmlFor="reg-device-type"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {messages.register.deviceTypeLabel}
        </label>
        <select
          id="reg-device-type"
          data-testid="reg-device-type"
          {...register('deviceType')}
          onChange={handleDeviceTypeChange}
          disabled={isSubmitting}
          aria-required="true"
          aria-invalid={!!errors.deviceType}
          aria-describedby={errors.deviceType ? 'reg-device-type-error' : undefined}
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer text-sm"
        >
          <option value="" disabled>
            {messages.register.selectDeviceTypePlaceholder}
          </option>
          {DEVICE_TYPES.map((dt) => (
            <option key={dt.code} value={dt.code}>
              {dt.label}
            </option>
          ))}
        </select>
        {errors.deviceType && (
          <p id="reg-device-type-error" role="alert" className="text-xs text-red-500">
            {errors.deviceType.message}
          </p>
        )}
      </div>

      {/* 5. Device ID (Preview Sample) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="reg-sample-device-id"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {messages.register.deviceIdLabel}
          </label>
          {isLoadingSample && (
            <span role="status" aria-live="polite" className="text-xs text-zinc-400 animate-pulse">
              กำลังดึงเลขตัวอย่าง...
            </span>
          )}
        </div>
        <input
          id="reg-sample-device-id"
          data-testid="reg-sample-device-id"
          type="text"
          readOnly
          value={sampleDeviceId}
          placeholder="-- รอเลือกประเภทอุปกรณ์ --"
          className="w-full px-4 py-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 font-mono text-sm text-zinc-600 dark:text-zinc-400 cursor-not-allowed select-all focus:outline-none"
        />
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          * รหัสที่แสดงข้างต้นเป็นเพียงตัวอย่าง รหัสจริงจะถูกกำหนดตอนกดบันทึกข้อมูล
        </p>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          id="btn-submit-registration"
          data-testid="btn-submit-registration"
          disabled={!isFormComplete || isSubmitting}
          className="w-full py-3.5 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>{messages.register.submitting}</span>
            </>
          ) : (
            <span>{messages.register.submit}</span>
          )}
        </button>
      </div>
    </form>
  );
}

export default RegisterForm;
