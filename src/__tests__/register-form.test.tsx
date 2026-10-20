import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RegisterForm } from '../components/RegisterForm';
import { THAI_REGIONS } from '../data/thai-regions';
import messages from '../lib/messages';

// Mock router
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe('Phase 4B: RegisterForm Unit & Component Tests', () => {
  const defaultUid = 'TEST-UID-4B';

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it('ฟอร์มแสดง 6 ภาค และเลือกแต่ละภาคแล้วจังหวัดกรองถูกต้อง', async () => {
    render(<RegisterForm uid={defaultUid} />);

    const regionSelect = screen.getByTestId('reg-region') as HTMLSelectElement;
    expect(regionSelect).toBeInTheDocument();

    // Check all 6 regions are in options
    THAI_REGIONS.forEach((r) => {
      const opt = Array.from(regionSelect.options).find((o) => o.value === r.regionName);
      expect(opt).toBeDefined();
    });

    // Select "เหนือ" -> Provinces should be the 9 northern provinces
    fireEvent.change(regionSelect, { target: { value: 'เหนือ' } });

    const provinceSelect = screen.getByTestId('reg-province') as HTMLSelectElement;
    expect(provinceSelect).not.toBeDisabled();
    expect(screen.getByText('เชียงใหม่')).toBeInTheDocument();
    expect(screen.queryByText('กรุงเทพมหานคร')).not.toBeInTheDocument();

    // Select "กลาง" -> Provinces should contain กรุงเทพมหานคร
    fireEvent.change(regionSelect, { target: { value: 'กลาง' } });
    expect(screen.getByText('กรุงเทพมหานคร')).toBeInTheDocument();
    expect(screen.queryByText('เชียงใหม่')).not.toBeInTheDocument();
  });

  it('เลือกจังหวัดแล้วเปลี่ยนภาค → จังหวัดถูกรีเซ็ต', () => {
    render(<RegisterForm uid={defaultUid} />);

    const regionSelect = screen.getByTestId('reg-region');
    const provinceSelect = screen.getByTestId('reg-province') as HTMLSelectElement;

    // 1. Select เหนือ -> เชียงใหม่
    fireEvent.change(regionSelect, { target: { value: 'เหนือ' } });
    fireEvent.change(provinceSelect, { target: { value: 'เชียงใหม่' } });
    expect(provinceSelect.value).toBe('เชียงใหม่');

    // 2. Change region to ใต้
    fireEvent.change(regionSelect, { target: { value: 'ใต้' } });

    // Province should be reset to empty ""
    expect(provinceSelect.value).toBe('');
  });

  it('dropdown ประเภทมี 3 ตัวเลือก ค่า code = KSK / KPD / MNU', () => {
    render(<RegisterForm uid={defaultUid} />);

    const typeSelect = screen.getByTestId('reg-device-type') as HTMLSelectElement;
    const options = Array.from(typeSelect.options).map((o) => o.value);

    expect(options).toContain('KSK');
    expect(options).toContain('KPD');
    expect(options).toContain('MNU');
    expect(options.filter((v) => !!v)).toHaveLength(3);
  });

  it('ช่อง UID เป็น readOnly พิมพ์แล้วค่าไม่เปลี่ยน', () => {
    render(<RegisterForm uid={defaultUid} />);

    const uidInput = screen.getByTestId('reg-uid') as HTMLInputElement;
    expect(uidInput).toHaveAttribute('readonly');
    expect(uidInput.value).toBe(defaultUid);

    // Attempting to type should not change its controlled/readOnly value
    fireEvent.change(uidInput, { target: { value: 'HACKED-UID' } });
    expect(uidInput.value).toBe(defaultUid);
  });

  it('ปุ่มบันทึก disabled เมื่อขาดอย่างใดอย่างหนึ่ง และ enabled เมื่อครบ', () => {
    render(<RegisterForm uid={defaultUid} />);

    const submitBtn = screen.getByTestId('btn-submit-registration');
    const regionSelect = screen.getByTestId('reg-region');
    const provinceSelect = screen.getByTestId('reg-province');
    const typeSelect = screen.getByTestId('reg-device-type');

    // Initially disabled
    expect(submitBtn).toBeDisabled();

    // Select region only
    fireEvent.change(regionSelect, { target: { value: 'กลาง' } });
    expect(submitBtn).toBeDisabled();

    // Select province
    fireEvent.change(provinceSelect, { target: { value: 'กรุงเทพมหานคร' } });
    expect(submitBtn).toBeDisabled();

    // Select device type -> All complete
    fireEvent.change(typeSelect, { target: { value: 'KSK' } });
    expect(submitBtn).not.toBeDisabled();
  });

  it('เปลี่ยนประเภท → เรียก next ใหม่ ช่อง Device ID อัปเดต', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ deviceId: 'KSK-0005' }),
    } as Response);

    render(<RegisterForm uid={defaultUid} />);

    const typeSelect = screen.getByTestId('reg-device-type');
    const sampleInput = screen.getByTestId('reg-sample-device-id') as HTMLInputElement;

    // Initially empty
    expect(sampleInput.value).toBe('');

    // Select KSK
    fireEvent.change(typeSelect, { target: { value: 'KSK' } });

    await waitFor(() => {
      expect(sampleInput.value).toBe('KSK-0005');
    });

    expect(fetch).toHaveBeenCalledWith('/api/device-types/KSK/next');

    // Change to KPD
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ deviceId: 'KPD-0012' }),
    } as Response);

    fireEvent.change(typeSelect, { target: { value: 'KPD' } });

    await waitFor(() => {
      expect(sampleInput.value).toBe('KPD-0012');
    });

    expect(fetch).toHaveBeenCalledWith('/api/device-types/KPD/next');
  });

  it('เลือก dropdown อย่างเดียว → ไม่มีการเรียก POST', () => {
    render(<RegisterForm uid={defaultUid} />);

    fireEvent.change(screen.getByTestId('reg-region'), { target: { value: 'เหนือ' } });
    fireEvent.change(screen.getByTestId('reg-province'), { target: { value: 'เชียงใหม่' } });
    fireEvent.change(screen.getByTestId('reg-device-type'), { target: { value: 'KSK' } });

    // Ensure fetch was not called with POST /api/registrations
    const postCalls = vi.mocked(fetch).mock.calls.filter(
      (call) => (call[1] as RequestInit)?.method === 'POST'
    );
    expect(postCalls).toHaveLength(0);
  });

  it('กดบันทึกรัว → ส่ง POST ครั้งเดียว (Double submit protection)', async () => {
    let resolvePost: (value: Response | PromiseLike<Response>) => void;
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });

    vi.mocked(fetch).mockImplementation((url, init) => {
      if ((init as RequestInit)?.method === 'POST') {
        return postPromise as Promise<Response>;
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ deviceId: 'KSK-0001' }),
      } as Response);
    });

    render(<RegisterForm uid={defaultUid} />);

    fireEvent.change(screen.getByTestId('reg-region'), { target: { value: 'กลาง' } });
    fireEvent.change(screen.getByTestId('reg-province'), { target: { value: 'กรุงเทพมหานคร' } });
    fireEvent.change(screen.getByTestId('reg-device-type'), { target: { value: 'KSK' } });

    const submitBtn = screen.getByTestId('btn-submit-registration');

    // Click submit multiple times in rapid succession
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    // Verify button is disabled upon click
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    // Resolve POST request
    resolvePost!({
      status: 201,
      ok: true,
      json: async () => ({
        id: 1,
        uid: defaultUid,
        region: 'กลาง',
        province: 'กรุงเทพมหานคร',
        deviceType: 'KSK',
        seq: 1,
        deviceId: 'KSK-0001',
        createdAt: new Date().toISOString(),
      }),
    } as unknown as Response);

    await waitFor(() => {
      expect(screen.getByTestId('registration-success-card')).toBeInTheDocument();
    });

    // Check total POST calls
    const postCalls = vi.mocked(fetch).mock.calls.filter(
      (call) => (call[1] as RequestInit)?.method === 'POST'
    );
    expect(postCalls).toHaveLength(1);
  });

  it('409 UID ซ้ำ → ข้อความถูกต้อง และไม่มีปุ่มลองใหม่ แต่มีปุ่มกลับหน้าแรก', async () => {
    vi.mocked(fetch).mockImplementation((url, init) => {
      if ((init as RequestInit)?.method === 'POST') {
        return Promise.resolve({
          status: 409,
          ok: false,
          json: async () => ({ error: messages.register.uidAlreadyRegistered }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ deviceId: 'KSK-0001' }),
      } as Response);
    });

    render(<RegisterForm uid={defaultUid} />);

    fireEvent.change(screen.getByTestId('reg-region'), { target: { value: 'กลาง' } });
    fireEvent.change(screen.getByTestId('reg-province'), { target: { value: 'กรุงเทพมหานคร' } });
    fireEvent.change(screen.getByTestId('reg-device-type'), { target: { value: 'KSK' } });

    fireEvent.click(screen.getByTestId('btn-submit-registration'));

    await waitFor(() => {
      expect(screen.getByTestId('register-error-banner')).toBeInTheDocument();
    });

    expect(screen.getByTestId('register-error-banner')).toHaveTextContent(
      messages.register.uidAlreadyRegistered
    );
    // Button to home exists
    expect(screen.getByTestId('btn-error-home')).toBeInTheDocument();
    // No retry button
    expect(screen.queryByTestId('btn-retry-submit')).not.toBeInTheDocument();
  });

  it('500 Server Error → ฟอร์มคงข้อมูลเดิม และมีปุ่มลองใหม่', async () => {
    vi.mocked(fetch).mockImplementation((url, init) => {
      if ((init as RequestInit)?.method === 'POST') {
        return Promise.resolve({
          status: 500,
          ok: false,
          json: async () => ({ error: messages.register.unknownError }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ deviceId: 'KSK-0001' }),
      } as Response);
    });

    render(<RegisterForm uid={defaultUid} />);

    const regionSelect = screen.getByTestId('reg-region') as HTMLSelectElement;
    const provinceSelect = screen.getByTestId('reg-province') as HTMLSelectElement;
    const typeSelect = screen.getByTestId('reg-device-type') as HTMLSelectElement;

    fireEvent.change(regionSelect, { target: { value: 'กลาง' } });
    fireEvent.change(provinceSelect, { target: { value: 'กรุงเทพมหานคร' } });
    fireEvent.change(typeSelect, { target: { value: 'KSK' } });

    fireEvent.click(screen.getByTestId('btn-submit-registration'));

    await waitFor(() => {
      expect(screen.getByTestId('register-error-banner')).toBeInTheDocument();
    });

    // Form inputs should preserve values
    expect(regionSelect.value).toBe('กลาง');
    expect(provinceSelect.value).toBe('กรุงเทพมหานคร');
    expect(typeSelect.value).toBe('KSK');

    // Has retry button
    expect(screen.getByTestId('btn-retry-submit')).toBeInTheDocument();
  });
});
