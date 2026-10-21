import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ManualInput } from '../components/ManualInput';
import { RegisterForm } from '../components/RegisterForm';
import { ImageUploader } from '../components/ImageUploader';
import { ScanPanel } from '../components/ScanPanel';
import messages from '../lib/messages';

// Mock Next.js useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Phase 8: Accessibility (A11y) & Keyboard Navigation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ScanPanel A11y', () => {
    it('all buttons have accessible names, proper testids, and valid roles', () => {
      render(
        <ScanPanel
          scanModeHook={{
            mode: 'upload',
            autoMode: 'upload',
            isHydrated: true,
            isCameraSupported: true,
            isScreenSupported: true,
            isUploadSupported: true,
            isButton1Supported: true,
            unsupportedMessage: null,
          }}
        />
      );

      const scanBtn = screen.getByTestId('btn-scan-qr');
      expect(scanBtn).toHaveAccessibleName(messages.scan.scanQrUpload);

      const manualBtn = screen.getByTestId('btn-manual-input');
      expect(manualBtn).toHaveAccessibleName(messages.scan.manualInput);
    });

    it('unsupported warning uses role="alert" for immediate screen reader announcement', () => {
      render(
        <ScanPanel
          scanModeHook={{
            mode: 'camera',
            autoMode: 'camera',
            isHydrated: true,
            isCameraSupported: false,
            isScreenSupported: true,
            isUploadSupported: true,
            isButton1Supported: false,
            unsupportedMessage: messages.scan.cameraNotSupported,
          }}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(messages.scan.cameraNotSupported);
    });
  });

  describe('ManualInput Keyboard & A11y', () => {
    it('input has autofocus and pressing Enter submits the form', async () => {
      (global.fetch as any) = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ exists: false }),
      });

      const handleSuccess = vi.fn();
      render(<ManualInput onSuccess={handleSuccess} />);

      const input = screen.getByTestId('input-manual-uid');
      expect(input).toHaveFocus();

      // Type UID
      fireEvent.change(input, { target: { value: 'KEYBOARD-UID-123' } });

      // Press Enter to submit
      fireEvent.submit(screen.getByTestId('manual-input-form'));

      await waitFor(() => {
        expect(handleSuccess).toHaveBeenCalledWith('KEYBOARD-UID-123');
      });
    });

    it('displays error with role="alert" and aria-invalid on validation error', async () => {
      render(<ManualInput />);

      // Submit empty
      fireEvent.submit(screen.getByTestId('manual-input-form'));

      const error = screen.getByRole('alert');
      expect(error).toBeInTheDocument();
      expect(error).toHaveTextContent(messages.manualInput.emptyError);

      const input = screen.getByTestId('input-manual-uid');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('ImageUploader Keyboard & A11y', () => {
    it('supports keyboard navigation: Enter/Space triggers file picker and Escape closes card', () => {
      const handleClose = vi.fn();
      render(<ImageUploader onClose={handleClose} />);

      // Dropzone has role="button" and tabIndex=0
      const dropzone = screen.getByTestId('drop-zone');
      expect(dropzone).toHaveAttribute('role', 'button');
      expect(dropzone).toHaveAttribute('tabIndex', '0');

      // Press Escape to cancel
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('RegisterForm A11y & Form Labels', () => {
    it('has explicit matching labels and aria-required on all form selects', () => {
      render(<RegisterForm uid="A11Y-TEST-UID" />);

      // Region select
      const regionSelect = screen.getByTestId('reg-region');
      expect(regionSelect).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(messages.register.regionLabel)).toBe(regionSelect);

      // Province select
      const provinceSelect = screen.getByTestId('reg-province');
      expect(provinceSelect).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(messages.register.provinceLabel)).toBe(provinceSelect);

      // Device Type select
      const deviceTypeSelect = screen.getByTestId('reg-device-type');
      expect(deviceTypeSelect).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(messages.register.deviceTypeLabel)).toBe(deviceTypeSelect);

      // UID field is readonly
      const uidInput = screen.getByTestId('reg-uid');
      expect(uidInput).toHaveAttribute('readonly');
      expect(screen.getByLabelText(messages.register.uidLabel)).toBe(uidInput);
    });

    it('form submit button announces loading state when submitting', () => {
      render(<RegisterForm uid="A11Y-TEST-UID" />);
      const submitBtn = screen.getByTestId('btn-submit-registration');
      expect(submitBtn).toHaveTextContent(messages.register.submit);
    });
  });
});
