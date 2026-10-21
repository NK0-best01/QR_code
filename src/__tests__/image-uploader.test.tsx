import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { ImageUploader } from '../components/ImageUploader';
import messages from '../lib/messages';

// Mock Next.js useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Phase 7: Image Uploader QR Scanner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders initial state with title, dropzone, file input, and fallback buttons', () => {
    const handleClose = vi.fn();
    const handleManual = vi.fn();

    render(
      <ImageUploader onClose={handleClose} onSwitchToManual={handleManual} />
    );

    expect(screen.getByTestId('image-uploader-card')).toBeInTheDocument();
    expect(screen.getByText(messages.scan.uploadTitle)).toBeInTheDocument();
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
    expect(screen.getByTestId('image-file-input')).toBeInTheDocument();
    expect(screen.getByTestId('btn-choose-file')).toHaveTextContent(
      messages.scan.scanQrUpload
    );
    expect(screen.getByTestId('btn-close-uploader')).toBeInTheDocument();
    expect(screen.getByTestId('btn-uploader-manual')).toHaveTextContent(
      messages.scan.manualInput
    );
  });

  it('clicking close button or pressing Escape triggers onClose', () => {
    const handleClose = vi.fn();
    render(<ImageUploader onClose={handleClose} />);

    // Click close button
    fireEvent.click(screen.getByTestId('btn-close-uploader'));
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Press Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('clicking manual input button triggers onSwitchToManual', () => {
    const handleManual = vi.fn();
    render(<ImageUploader onSwitchToManual={handleManual} />);

    fireEvent.click(screen.getByTestId('btn-uploader-manual'));
    expect(handleManual).toHaveBeenCalledTimes(1);
  });

  it('rejects non-image files with invalidImageType error', async () => {
    render(<ImageUploader />);

    const file = new File(['dummy content'], 'document.pdf', {
      type: 'application/pdf',
    });
    const fileInput = screen.getByTestId('image-file-input');

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByTestId('upload-error')).toBeInTheDocument();
    expect(screen.getByText(messages.scan.invalidImageType)).toBeInTheDocument();
  });

  it('processes valid image with customDecoder and redirects to /register?uid=... when UID is new', async () => {
    // Mock /api/uids/KSK-9999/exists -> not existing
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: false }),
    });

    const onQrDetected = vi.fn();
    const mockDecoder = vi.fn().mockResolvedValue('KSK-9999');

    render(
      <ImageUploader
        onQrDetected={onQrDetected}
        customDecoder={mockDecoder}
      />
    );

    const file = new File(['fake-png-binary'], 'qr-test.png', {
      type: 'image/png',
    });
    const fileInput = screen.getByTestId('image-file-input');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockDecoder).toHaveBeenCalledWith(file);
    });

    await waitFor(() => {
      expect(onQrDetected).toHaveBeenCalledWith('KSK-9999');
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/register?uid=KSK-9999');
    });
  });

  it('shows error message when no QR code is detected in image', async () => {
    const mockDecoder = vi.fn().mockResolvedValue(null);

    render(<ImageUploader customDecoder={mockDecoder} />);

    const file = new File(['landscape-bytes'], 'landscape.jpg', {
      type: 'image/jpeg',
    });
    const fileInput = screen.getByTestId('image-file-input');

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByTestId('upload-error')).toBeInTheDocument();
    expect(screen.getByText(messages.scan.qrNotFoundInImage)).toBeInTheDocument();
    expect(screen.getByTestId('btn-retry-upload')).toHaveTextContent(
      messages.scan.chooseNewImage
    );
  });

  it('shows duplicate error when QR contains already registered UID', async () => {
    // Mock /api/uids/DUP-1234/exists -> exists: true
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: true }),
    });

    const mockDecoder = vi.fn().mockResolvedValue('DUP-1234');

    render(<ImageUploader customDecoder={mockDecoder} />);

    const file = new File(['fake-qr'], 'duplicate.png', {
      type: 'image/png',
    });
    const fileInput = screen.getByTestId('image-file-input');

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByTestId('upload-error')).toBeInTheDocument();
    expect(
      screen.getByText(messages.register.uidAlreadyRegistered)
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handles Drag and Drop events properly', async () => {
    const mockDecoder = vi.fn().mockResolvedValue('DROP-QR-555');
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: false }),
    });

    render(<ImageUploader customDecoder={mockDecoder} />);

    const dropZone = screen.getByTestId('drop-zone');

    // Drag over
    fireEvent.dragOver(dropZone);
    expect(screen.getByText(messages.scan.dropImageHere)).toBeInTheDocument();

    // Drag leave
    fireEvent.dragLeave(dropZone);
    expect(screen.getByText(messages.scan.uploadInstructions)).toBeInTheDocument();

    // Drop file
    const file = new File(['image-bytes'], 'drop.png', { type: 'image/png' });
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(mockDecoder).toHaveBeenCalledWith(file);
      expect(mockPush).toHaveBeenCalledWith('/register?uid=DROP-QR-555');
    });
  });

  it('handles Clipboard Paste (Ctrl + V) event with image', async () => {
    const mockDecoder = vi.fn().mockResolvedValue('CLIPBOARD-UID-888');
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: false }),
    });

    render(<ImageUploader customDecoder={mockDecoder} />);

    const file = new File(['pasted-data'], 'clipboard.png', {
      type: 'image/png',
    });

    const pasteEvent = new Event('paste') as any;
    pasteEvent.clipboardData = {
      items: [
        {
          type: 'image/png',
          getAsFile: () => file,
        },
      ],
    };

    act(() => {
      window.dispatchEvent(pasteEvent);
    });

    await waitFor(() => {
      expect(mockDecoder).toHaveBeenCalledWith(file);
      expect(mockPush).toHaveBeenCalledWith('/register?uid=CLIPBOARD-UID-888');
    });
  });
});
