import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ManualInput } from '../components/ManualInput';
import {
  validateUidLocally,
  buildRegisterUrl,
} from '../lib/uid-navigation';
import messages from '../lib/messages';

// Mock next/navigation
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
}));

describe('Phase 3: ManualInput & UID Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  describe('Local UID Validation', () => {
    it('ค่าว่าง หรือช่องว่างล้วน ไม่ผ่าน', () => {
      const empty1 = validateUidLocally('');
      expect(empty1.isValid).toBe(false);
      expect(empty1.error).toBe(messages.validation.uidRequired);

      const empty2 = validateUidLocally('    ');
      expect(empty2.isValid).toBe(false);
      expect(empty2.error).toBe(messages.validation.uidRequired);
    });

    it('ค่าที่มี & = # % และภาษาไทย ตรวจสอบผ่าน และ buildRegisterUrl เข้ารหัส URI ถูกต้อง', () => {
      const complexUid = 'SN#001/A&B=C%99_ภาษาไทย';
      const result = validateUidLocally(complexUid);
      expect(result.isValid).toBe(true);
      expect(result.trimmedUid).toBe(complexUid);

      const url = buildRegisterUrl(complexUid);
      expect(url).toBe(`/register?uid=${encodeURIComponent(complexUid)}`);

      // Verify roundtrip decoding
      const paramIndex = url.indexOf('uid=');
      const paramVal = url.substring(paramIndex + 4);
      expect(decodeURIComponent(paramVal)).toBe(complexUid);
    });

    it('UID ที่ยาวเกิน 128 ตัวอักษร ไม่ผ่าน', () => {
      const longUid = 'A'.repeat(129);
      const result = validateUidLocally(longUid);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(messages.manualInput.tooLongError);
    });

    it('UID ที่มีอักขระควบคุม ไม่ผ่าน', () => {
      const badUid = 'ABC\x00123';
      const result = validateUidLocally(badUid);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(messages.manualInput.invalidCharsError);
    });
  });

  describe('ManualInput Component Flow', () => {
    it('เมื่อ UID ซ้ำ → แจ้งเตือน UID นี้ลงทะเบียนแล้ว และไม่ไปหน้าสมัคร', async () => {
      // Mock fetch /api/uids/.../exists to return exists: true
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ exists: true }),
      } as Response);

      render(<ManualInput />);

      const input = screen.getByTestId('input-manual-uid');
      const submitBtn = screen.getByTestId('btn-submit-manual-uid');

      fireEvent.change(input, { target: { value: 'EXISTING-UID-001' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('manual-uid-error')).toHaveTextContent(
          messages.register.uidAlreadyRegistered
        );
      });

      // Verify router.push was not called
      expect(pushMock).not.toHaveBeenCalled();
    });

    it('เมื่อ UID ยังไม่ซ้ำ → นำทางไปหน้าสมัครพร้อม UID ใน URL', async () => {
      // Mock fetch to return exists: false
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ exists: false }),
      } as Response);

      render(<ManualInput />);

      const input = screen.getByTestId('input-manual-uid');
      const submitBtn = screen.getByTestId('btn-submit-manual-uid');

      fireEvent.change(input, { target: { value: 'FRESH-UID-999' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith(
          `/register?uid=${encodeURIComponent('FRESH-UID-999')}`
        );
      });
    });
  });
});
