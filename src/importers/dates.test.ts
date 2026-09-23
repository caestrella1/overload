import { detectDateOrder, parseFlexibleDate } from './dates';

describe('parseFlexibleDate', () => {
  it('reads ISO dates with and without time', () => {
    expect(parseFlexibleDate('2019-01-28 12:24:23')).toBe('2019-01-28T12:24:23');
    expect(parseFlexibleDate('2019-01-28T12:24')).toBe('2019-01-28T12:24:00');
    expect(parseFlexibleDate('2019-01-28')).toBe('2019-01-28T00:00:00');
  });

  it('respects the chosen day/month order', () => {
    expect(parseFlexibleDate('03/04/2024', 'dmy')).toBe('2024-04-03T00:00:00');
    expect(parseFlexibleDate('03/04/2024', 'mdy')).toBe('2024-03-04T00:00:00');
  });

  it('reads 12-hour times', () => {
    expect(parseFlexibleDate('3/4/2024 7:05 PM', 'mdy')).toBe('2024-03-04T19:05:00');
    expect(parseFlexibleDate('3/4/2024 12:30 AM', 'mdy')).toBe('2024-03-04T00:30:00');
  });

  it('reads named months and two-digit years', () => {
    expect(parseFlexibleDate('28 Jan 2019 06:00')).toBe('2019-01-28T06:00:00');
    expect(parseFlexibleDate('Jan 28, 2019')).toBe('2019-01-28T00:00:00');
    expect(parseFlexibleDate('05/06/24', 'dmy')).toBe('2024-06-05T00:00:00');
  });

  it('reads unix timestamps', () => {
    const seconds = Math.floor(new Date(2024, 4, 6, 9, 30, 0).getTime() / 1000);
    expect(parseFlexibleDate(String(seconds))).toBe('2024-05-06T09:30:00');
  });

  it('rejects what it cannot read', () => {
    expect(parseFlexibleDate('')).toBeNull();
    expect(parseFlexibleDate('last tuesday')).toBeNull();
    expect(parseFlexibleDate('2019-13-45')).toBeNull();
  });
});

describe('detectDateOrder', () => {
  it('uses a day above 12 to settle the order', () => {
    expect(detectDateOrder(['03/04/2024', '25/04/2024'])).toEqual({
      order: 'dmy',
      ambiguous: false,
    });
    expect(detectDateOrder(['04/25/2024', '04/03/2024'])).toEqual({
      order: 'mdy',
      ambiguous: false,
    });
  });

  it('recognises year-first dates', () => {
    expect(detectDateOrder(['2024-04-03'])).toEqual({ order: 'ymd', ambiguous: false });
  });

  it('flags a sample that reads both ways', () => {
    expect(detectDateOrder(['03/04/2024', '05/06/2024'])).toEqual({
      order: 'mdy',
      ambiguous: true,
    });
  });
});
