import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThailandMap, RegisteredPin } from '@/components/ThailandMap';
import { PinHistoryList, PinLogItem } from '@/components/PinHistoryList';
import messages from '@/lib/messages';

describe('Phase 16: Portal Map Components', () => {
  describe('ThailandMap Component', () => {
    it('เรนเดอร์แผนที่สำเร็จ และไม่มี pin เมื่อไม่มี registeredPins', () => {
      render(<ThailandMap registeredPins={[]} />);
      const container = screen.getByTestId('thailand-map-container');
      expect(container).toBeInTheDocument();

      // No pin registered should be present
      expect(screen.queryByTestId(/^pin-registered-/)).toBeNull();
    });

    it('แสดงหมุดของอุปกรณ์ REGISTERED ครบทุกตัวตามที่ส่งมา', () => {
      const pins: RegisteredPin[] = [
        { id: 101, deviceId: 'DEV-CM-001', latitude: 18.7883, longitude: 98.9853 },
        { id: 102, deviceId: 'DEV-BKK-002', latitude: 13.7563, longitude: 100.5018 },
        { id: 103, deviceId: 'DEV-PK-003', latitude: 7.8804, longitude: 98.3923 },
      ];

      render(<ThailandMap registeredPins={pins} />);

      expect(screen.getByTestId('pin-registered-101')).toBeInTheDocument();
      expect(screen.getByTestId('pin-registered-102')).toBeInTheDocument();
      expect(screen.getByTestId('pin-registered-103')).toBeInTheDocument();
      expect(screen.getByLabelText('DEV-CM-001')).toBeInTheDocument();
      expect(screen.getByLabelText('DEV-BKK-002')).toBeInTheDocument();
      expect(screen.getByLabelText('DEV-PK-003')).toBeInTheDocument();
    });

    it('คลิกที่หมุดอุปกรณ์ → เรียก onPinSelect พร้อม id ที่ถูกต้อง', () => {
      const onPinSelect = vi.fn();
      const pins: RegisteredPin[] = [
        { id: 201, deviceId: 'DEV-KK-001', latitude: 16.4322, longitude: 102.8236 },
      ];

      render(<ThailandMap registeredPins={pins} onPinSelect={onPinSelect} />);

      const pinElement = screen.getByTestId('pin-registered-201');
      fireEvent.click(pinElement);

      expect(onPinSelect).toHaveBeenCalledTimes(1);
      expect(onPinSelect).toHaveBeenCalledWith(201);
    });

    it('โหมดปักหมุด/แก้หมุด: แสดง Marker ตำแหน่งใหม่ (previewCoords)', () => {
      render(
        <ThailandMap
          registeredPins={[]}
          previewCoords={[13.7563, 100.5018]}
        />
      );

      expect(screen.getByTestId('marker-preview-position')).toBeInTheDocument();
      expect(screen.getByText('ตำแหน่งใหม่')).toBeInTheDocument();
    });

    it('โหมดแก้หมุด: แสดงทั้งตำแหน่งเดิม (originalCoords) และตำแหน่งใหม่ (previewCoords)', () => {
      render(
        <ThailandMap
          registeredPins={[]}
          originalCoords={[18.7883, 98.9853]}
          previewCoords={[18.7900, 98.9900]}
        />
      );

      expect(screen.getByTestId('marker-original-position')).toBeInTheDocument();
      expect(screen.getByText('ตำแหน่งเดิม')).toBeInTheDocument();
      expect(screen.getByTestId('marker-preview-position')).toBeInTheDocument();
      expect(screen.getByText('ตำแหน่งใหม่')).toBeInTheDocument();
    });

    it('ไฮไลต์จังหวัดที่กำหนด (highlightedProvince)', () => {
      render(<ThailandMap highlightedProvince="เชียงใหม่" />);
      const cmGeo = screen.getByTestId('province-เชียงใหม่');
      expect(cmGeo).toBeInTheDocument();
      expect(cmGeo).toHaveAttribute('data-highlighted', 'true');
      expect(cmGeo).toHaveAttribute('fill', '#93c5fd');
    });
  });

  describe('PinHistoryList Component', () => {
    it('แสดงข้อความว่างเมื่อไม่มีประวัติ (empty state)', () => {
      render(<PinHistoryList logs={[]} />);
      expect(screen.getByTestId('no-pin-history')).toHaveTextContent(
        messages.map.noPinHistory
      );
    });

    it('แสดงรายการประวัติถูกต้องพร้อม action, actorUsername และพิกัด', () => {
      const logs: PinLogItem[] = [
        {
          id: 1,
          action: 'UPDATE',
          oldLatitude: 13.7563,
          oldLongitude: 100.5018,
          newLatitude: 13.7600,
          newLongitude: 100.5100,
          actorUsername: 'admin1',
          createdAt: '2026-10-30T09:00:00.000Z',
        },
        {
          id: 2,
          action: 'CONFIRM',
          oldLatitude: null,
          oldLongitude: null,
          newLatitude: 13.7563,
          newLongitude: 100.5018,
          actorUsername: 'admin1',
          createdAt: '2026-10-29T10:00:00.000Z',
        },
      ];

      render(<PinHistoryList logs={logs} />);

      expect(screen.getByTestId('pin-history-list')).toBeInTheDocument();
      expect(screen.getByTestId('pin-log-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('pin-log-item-2')).toBeInTheDocument();

      expect(screen.getByText(messages.map.actionUpdate)).toBeInTheDocument();
      expect(screen.getByText(messages.map.actionConfirm)).toBeInTheDocument();
      expect(screen.getAllByText('admin1').length).toBe(2);
      expect(screen.getByText(/13.760000, 100.510000/)).toBeInTheDocument();
    });
  });
});
