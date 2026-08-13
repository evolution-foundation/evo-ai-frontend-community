import { describe, it, expect } from 'vitest';
import {
  timeSlotParse,
  timeSlotTransform,
  validateBreakSlot,
  calculateTotalHours,
  BusinessHourSlot,
  TimeSlot,
} from './businessHours';

describe('businessHours — lunch break', () => {
  describe('timeSlotParse', () => {
    it('parses a day without a second slot as having no break', () => {
      const slots: BusinessHourSlot[] = [
        {
          day_of_week: 1,
          closed_all_day: false,
          open_hour: 9,
          open_minutes: 0,
          close_hour: 17,
          close_minutes: 0,
          open_all_day: false,
        },
      ];

      const [monday] = timeSlotParse(slots);

      expect(monday.hasBreak).toBe(false);
      expect(monday.from).toBe('09:00');
      expect(monday.to).toBe('17:00');
    });

    it('parses a day with a second slot into a break window', () => {
      const slots: BusinessHourSlot[] = [
        {
          day_of_week: 1,
          closed_all_day: false,
          open_hour: 9,
          open_minutes: 0,
          close_hour: 12,
          close_minutes: 0,
          open_all_day: false,
          open_hour_2: 13,
          open_minutes_2: 0,
          close_hour_2: 18,
          close_minutes_2: 0,
        },
      ];

      const [monday] = timeSlotParse(slots);

      expect(monday.hasBreak).toBe(true);
      expect(monday.from).toBe('09:00');
      expect(monday.to).toBe('18:00');
      expect(monday.breakFrom).toBe('12:00');
      expect(monday.breakTo).toBe('13:00');
      expect(monday.breakValid).toBe(true);
    });
  });

  describe('timeSlotTransform', () => {
    it('sends null for the second slot when there is no break', () => {
      const slots: TimeSlot[] = [{ day: 1, from: '09:00', to: '17:00', valid: true }];

      const [monday] = timeSlotTransform(slots);

      expect(monday.open_hour_2).toBeNull();
      expect(monday.close_hour_2).toBeNull();
      expect(monday.open_hour).toBe(9);
      expect(monday.close_hour).toBe(17);
    });

    it('splits into two ranges when a break is set', () => {
      const slots: TimeSlot[] = [
        {
          day: 1,
          from: '09:00',
          to: '18:00',
          valid: true,
          hasBreak: true,
          breakFrom: '12:00',
          breakTo: '13:00',
          breakValid: true,
        },
      ];

      const [monday] = timeSlotTransform(slots);

      expect(monday.open_hour).toBe(9);
      expect(monday.close_hour).toBe(12);
      expect(monday.open_hour_2).toBe(13);
      expect(monday.close_hour_2).toBe(18);
    });

    it('round-trips through parse -> transform unchanged', () => {
      const original: BusinessHourSlot[] = [
        {
          day_of_week: 1,
          closed_all_day: false,
          open_hour: 9,
          open_minutes: 30,
          close_hour: 12,
          close_minutes: 0,
          open_all_day: false,
          open_hour_2: 13,
          open_minutes_2: 0,
          close_hour_2: 18,
          close_minutes_2: 30,
        },
      ];

      const roundTripped = timeSlotTransform(timeSlotParse(original));

      expect(roundTripped[0]).toMatchObject(original[0]);
    });

    it('clears a previously-set break when the toggle is turned off', () => {
      const slots: TimeSlot[] = [
        {
          day: 1,
          from: '09:00',
          to: '18:00',
          valid: true,
          hasBreak: false,
        },
      ];

      const [monday] = timeSlotTransform(slots);

      expect(monday.open_hour_2).toBeNull();
      expect(monday.close_hour_2).toBeNull();
      expect(monday.open_hour).toBe(9);
      expect(monday.close_hour).toBe(18);
    });
  });

  describe('validateBreakSlot', () => {
    it('accepts a break fully inside the day, in order', () => {
      expect(validateBreakSlot('09:00', '12:00', '13:00', '18:00')).toBe(true);
    });

    it('rejects a break starting before the day starts', () => {
      expect(validateBreakSlot('09:00', '08:00', '13:00', '18:00')).toBe(false);
    });

    it('rejects a break ending after the day ends', () => {
      expect(validateBreakSlot('09:00', '17:00', '19:00', '18:00')).toBe(false);
    });

    it('rejects a break where the end is before the start', () => {
      expect(validateBreakSlot('09:00', '13:00', '12:00', '18:00')).toBe(false);
    });

    it('rejects an incomplete break', () => {
      expect(validateBreakSlot('09:00', '12:00', undefined, '18:00')).toBe(false);
    });
  });

  describe('calculateTotalHours', () => {
    it('subtracts the break duration from the total', () => {
      const slot: TimeSlot = {
        day: 1,
        from: '09:00',
        to: '18:00',
        valid: true,
        hasBreak: true,
        breakFrom: '12:00',
        breakTo: '13:00',
        breakValid: true,
      };

      // 09:00-18:00 = 9h, minus a 1h break = 8h
      expect(calculateTotalHours(slot)).toBe(8);
    });

    it('does not subtract an invalid break', () => {
      const slot: TimeSlot = {
        day: 1,
        from: '09:00',
        to: '18:00',
        valid: true,
        hasBreak: true,
        breakFrom: '12:00',
        breakTo: '13:00',
        breakValid: false,
      };

      expect(calculateTotalHours(slot)).toBe(9);
    });
  });
});
