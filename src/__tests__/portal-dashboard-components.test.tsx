import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PortalSidebar from '@/components/PortalSidebar';
import StatusFilterButtons from '@/components/StatusFilterButtons';
import RegistrationCard, { RegistrationItem } from '@/components/RegistrationCard';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('Phase 15: PortalSidebar Component Tests', () => {
  it('ผู้ใช้บทบาท user เห็นเฉพาะเมนู "แดชบอร์ด" และไม่มี "แผนที่" ใน DOM เลย', () => {
    render(<PortalSidebar username="user1" role="user" />);

    // Check username and role
    expect(screen.getByTestId('sidebar-username')).toHaveTextContent('user1');
    expect(screen.getByTestId('sidebar-role')).toHaveTextContent('เจ้าหน้าที่ (User)');

    // "แดชบอร์ด" is present and active
    const dashboardLinks = screen.getAllByRole('link', { name: /แดชบอร์ด/i });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    expect(dashboardLinks[0]).toHaveAttribute('aria-current', 'page');

    // "แผนที่" must NOT exist in the document
    expect(screen.queryByRole('link', { name: /แผนที่/i })).toBeNull();
  });

  it('ผู้ดูแลระบบบทบาท admin เห็นทั้งเมนู "แดชบอร์ด" และ "แผนที่"', () => {
    render(<PortalSidebar username="admin1" role="admin" />);

    expect(screen.getByTestId('sidebar-username')).toHaveTextContent('admin1');
    expect(screen.getByTestId('sidebar-role')).toHaveTextContent('ผู้ดูแลระบบ (Admin)');

    // Both menus must exist
    expect(screen.getAllByRole('link', { name: /แดชบอร์ด/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /แผนที่/i }).length).toBeGreaterThan(0);
  });

  it('บนหน้าจอมือถือ ปุ่มเมนูสลับ aria-expanded และปิดด้วยปุ่ม Esc ได้', () => {
    render(<PortalSidebar username="admin1" role="admin" />);

    const menuButton = screen.getByTestId('btn-mobile-menu');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    // Click to open drawer
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    // Press Escape to close drawer
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Phase 15: StatusFilterButtons Component Tests', () => {
  it('แสดงจำนวนถูกต้อง และเริ่มต้นไม่มีปุ่มใด aria-pressed="true"', () => {
    const onStatusChange = vi.fn();
    render(
      <StatusFilterButtons
        currentStatus={null}
        counts={{ UNREGISTERED: 5, REGISTERED: 12 }}
        onStatusChange={onStatusChange}
      />
    );

    const btnUnregistered = screen.getByTestId('filter-unregistered');
    const btnRegistered = screen.getByTestId('filter-registered');

    expect(btnUnregistered).toHaveAttribute('aria-pressed', 'false');
    expect(btnRegistered).toHaveAttribute('aria-pressed', 'false');

    expect(screen.getByTestId('count-unregistered')).toHaveTextContent('5');
    expect(screen.getByTestId('count-registered')).toHaveTextContent('12');
  });

  it('กดปุ่มแล้วเรียก onStatusChange พร้อมค่าสถานะนั้น และกดซ้ำเรียก null (กลับเป็นทั้งหมด)', () => {
    const onStatusChange = vi.fn();
    const { rerender } = render(
      <StatusFilterButtons
        currentStatus={null}
        counts={{ UNREGISTERED: 5, REGISTERED: 12 }}
        onStatusChange={onStatusChange}
      />
    );

    // 1. Click UNREGISTERED -> Selects UNREGISTERED
    fireEvent.click(screen.getByTestId('filter-unregistered'));
    expect(onStatusChange).toHaveBeenCalledWith('UNREGISTERED');

    // Re-render as active
    rerender(
      <StatusFilterButtons
        currentStatus="UNREGISTERED"
        counts={{ UNREGISTERED: 5, REGISTERED: 12 }}
        onStatusChange={onStatusChange}
      />
    );
    expect(screen.getByTestId('filter-unregistered')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('filter-registered')).toHaveAttribute('aria-pressed', 'false');

    // 2. Click UNREGISTERED again -> Deselects to null
    fireEvent.click(screen.getByTestId('filter-unregistered'));
    expect(onStatusChange).toHaveBeenCalledWith(null);
  });
});

describe('Phase 15: RegistrationCard Component Tests', () => {
  const sampleUnregistered: RegistrationItem = {
    id: 1,
    uid: 'DEVICE-ABC-123',
    region: 'ภาคกลาง',
    province: 'กรุงเทพมหานคร',
    deviceType: 'KSK',
    deviceId: 'KSK-0001',
    status: 'UNREGISTERED',
    latitude: null,
    longitude: null,
    createdAt: '2026-10-29T10:00:00.000Z',
  };

  const sampleRegistered: RegistrationItem = {
    id: 2,
    uid: 'DEVICE-XYZ-999',
    region: 'ภาคเหนือ',
    province: 'เชียงใหม่',
    deviceType: 'KPD',
    deviceId: 'KPD-0001',
    status: 'REGISTERED',
    latitude: 18.7883,
    longitude: 98.9853,
    createdAt: '2026-10-29T11:00:00.000Z',
  };

  it('การ์ด UNREGISTERED ไม่มี pin: แสดง "ยังไม่มี pin" และ admin เห็นปุ่ม "เพิ่ม pin" แต่ user ไม่เห็น (เห็น "รอผู้ดูแลเพิ่ม pin")', () => {
    // 1. View as Admin
    const { rerender } = render(
      <RegistrationCard item={sampleUnregistered} userRole="admin" />
    );

    expect(screen.getByTestId('card-status-badge-1')).toHaveTextContent('ยังไม่ลงทะเบียน');
    expect(screen.getByText(/ยังไม่มี pin/i)).toBeInTheDocument();
    expect(screen.getByTestId('btn-add-pin-1')).toHaveTextContent('เพิ่ม pin');
    expect(screen.getByTestId('btn-add-pin-1')).toHaveAttribute('href', '/admin/map?registrationId=1');

    // 2. View as User
    rerender(<RegistrationCard item={sampleUnregistered} userRole="user" />);
    expect(screen.queryByTestId('btn-add-pin-1')).toBeNull();
    expect(screen.getByText(/รอผู้ดูแลเพิ่ม pin/i)).toBeInTheDocument();
  });

  it('การ์ด REGISTERED มี pin: แสดงพิกัด + ลิงก์ Google Maps ถูกต้อง และ admin เห็นปุ่ม "แก้ไข pin" แต่ user ไม่เห็น', () => {
    // 1. View as Admin
    const { rerender } = render(
      <RegistrationCard item={sampleRegistered} userRole="admin" />
    );

    expect(screen.getByTestId('card-status-badge-2')).toHaveTextContent('ลงทะเบียน');
    expect(screen.getByText(/18.788300, 98.985300/i)).toBeInTheDocument();

    const gmapsLink = screen.getByTestId('link-google-maps-2');
    expect(gmapsLink).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=18.7883,98.9853');
    expect(gmapsLink).toHaveAttribute('target', '_blank');
    expect(gmapsLink).toHaveAttribute('rel', 'noopener noreferrer');

    expect(screen.getByTestId('btn-edit-pin-2')).toHaveTextContent('แก้ไข pin');
    expect(screen.getByTestId('btn-edit-pin-2')).toHaveAttribute('href', '/admin/map?registrationId=2');

    // 2. View as User
    rerender(<RegistrationCard item={sampleRegistered} userRole="user" />);
    // User sees Google Maps link, but NOT "แก้ไข pin"
    expect(screen.getByTestId('link-google-maps-2')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-edit-pin-2')).toBeNull();
  });
});

describe('Phase 15: DashboardClient Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('แสดง loading และเมื่อข้อมูลว่างแสดง "ไม่มีข้อมูล"', async () => {
    const mockResponse = {
      counts: { UNREGISTERED: 0, REGISTERED: 0 },
      items: [],
      total: 0,
      page: 1,
      pageSize: 12,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { default: DashboardClient } = await import('@/components/DashboardClient');
    render(<DashboardClient userRole="user" />);

    // Initially loading
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();

    // After fetch completes -> Empty state
    expect(await screen.findByTestId('dashboard-empty')).toBeInTheDocument();
    expect(screen.getByText(/^ไม่มีข้อมูล$/i)).toBeInTheDocument();
  });

  it('เมื่อโหลดสำเร็จ แสดงรายการการ์ดและข้อมูลนับจำนวน', async () => {
    const mockResponse = {
      counts: { UNREGISTERED: 1, REGISTERED: 1 },
      items: [
        {
          id: 10,
          uid: 'UID-TEST-10',
          region: 'ภาคกลาง',
          province: 'กรุงเทพมหานคร',
          deviceType: 'KSK',
          deviceId: 'KSK-0010',
          status: 'UNREGISTERED',
          latitude: null,
          longitude: null,
          createdAt: '2026-10-29T12:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 12,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { default: DashboardClient } = await import('@/components/DashboardClient');
    render(<DashboardClient userRole="admin" />);

    expect(await screen.findByTestId('card-registration-10')).toBeInTheDocument();
    expect(screen.getByTestId('card-device-id-10')).toHaveTextContent('KSK-0010');
    expect(screen.getByTestId('count-unregistered')).toHaveTextContent('1');
    expect(screen.getByTestId('count-registered')).toHaveTextContent('1');
  });

  it('เมื่อ API error แสดงข้อความข้อผิดพลาดและปุ่มลองใหม่อีกครั้ง', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล' }),
    });

    const { default: DashboardClient } = await import('@/components/DashboardClient');
    render(<DashboardClient userRole="admin" />);

    expect(await screen.findByTestId('dashboard-error')).toBeInTheDocument();
    expect(screen.getByTestId('btn-dashboard-retry')).toBeInTheDocument();
  });
});
