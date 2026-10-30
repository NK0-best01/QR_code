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

    it('แสดงปุ่มควบคุมการซูม (Zoom In, Zoom Out, Reset, Zoom Level) ครบถ้วน', () => {
      render(<ThailandMap registeredPins={[]} />);

      const zoomControls = screen.getByTestId('map-zoom-controls');
      expect(zoomControls).toBeInTheDocument();

      const btnZoomIn = screen.getByTestId('btn-map-zoom-in');
      const btnZoomOut = screen.getByTestId('btn-map-zoom-out');
      const btnReset = screen.getByTestId('btn-map-zoom-reset');
      const zoomLevel = screen.getByTestId('map-zoom-level');

      expect(btnZoomIn).toBeInTheDocument();
      expect(btnZoomOut).toBeInTheDocument();
      expect(btnReset).toBeInTheDocument();
      expect(zoomLevel).toHaveTextContent('100%');

      // ที่สเกลเริ่มต้น 100%: ปุ่มลดสเกลและปุ่มรีเซ็ตจะถูก disabled
      expect(btnZoomOut).toBeDisabled();
      expect(btnReset).toBeDisabled();
      expect(btnZoomIn).not.toBeDisabled();
    });

    it('คลิกปุ่ม Zoom In (+) → ขยายสเกล และระดับเปอร์เซ็นต์เพิ่มขึ้น', () => {
      render(<ThailandMap registeredPins={[]} />);

      const btnZoomIn = screen.getByTestId('btn-map-zoom-in');
      const btnZoomOut = screen.getByTestId('btn-map-zoom-out');
      const btnReset = screen.getByTestId('btn-map-zoom-reset');
      const zoomLevel = screen.getByTestId('map-zoom-level');

      // Zoom In ครั้งที่ 1
      fireEvent.click(btnZoomIn);
      expect(zoomLevel).toHaveTextContent('140%');
      expect(btnZoomOut).not.toBeDisabled();
      expect(btnReset).not.toBeDisabled();
      expect(screen.getByTestId('map-drag-hint')).toHaveTextContent(
        messages.map.dragToPanHint
      );

      // Zoom In ครั้งที่ 2
      fireEvent.click(btnZoomIn);
      expect(zoomLevel).toHaveTextContent('200%');
    });

    it('คลิกปุ่ม Zoom Out (-) และ Reset (↺) → ลดสเกลและรีเซ็ตกลับเป็น 100%', () => {
      render(<ThailandMap registeredPins={[]} />);

      const btnZoomIn = screen.getByTestId('btn-map-zoom-in');
      const btnZoomOut = screen.getByTestId('btn-map-zoom-out');
      const btnReset = screen.getByTestId('btn-map-zoom-reset');
      const zoomLevel = screen.getByTestId('map-zoom-level');

      // ซูมเข้า 2 ครั้ง (100% -> 140% -> 200%)
      fireEvent.click(btnZoomIn);
      fireEvent.click(btnZoomIn);
      expect(zoomLevel).toHaveTextContent('200%');

      // ซูมออก 1 ครั้ง (200% -> 140%)
      fireEvent.click(btnZoomOut);
      expect(zoomLevel).toHaveTextContent('140%');

      // กดปุ่มรีเซ็ต (Reset)
      fireEvent.click(btnReset);
      expect(zoomLevel).toHaveTextContent('100%');
      expect(btnZoomOut).toBeDisabled();
      expect(btnReset).toBeDisabled();
      expect(screen.queryByTestId('map-drag-hint')).toBeNull();
    });

    it('จำกัดการซูมสูงสุดที่ 400% และปุ่ม Zoom In จะถูก disabled เมื่อถึงขีดจำกัด', () => {
      render(<ThailandMap registeredPins={[]} />);

      const btnZoomIn = screen.getByTestId('btn-map-zoom-in');
      const zoomLevel = screen.getByTestId('map-zoom-level');

      // กด Zoom In หลายครั้งจนถึงขีดจำกัด 400%
      for (let i = 0; i < 6; i++) {
        if (!btnZoomIn.hasAttribute('disabled')) {
          fireEvent.click(btnZoomIn);
        }
      }

      expect(zoomLevel).toHaveTextContent('400%');
      expect(btnZoomIn).toBeDisabled();
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
