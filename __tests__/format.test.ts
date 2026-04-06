import {
  fixImageUrl,
  formatPrice,
  formatDate,
  getDistanceM,
  formatDistance,
  formatRelativeTime,
} from '../src/utils/format';

describe('format utils', () => {
  it('formats price safely', () => {
    expect(formatPrice(1200)).toBe('1,200원');
    expect(formatPrice(null)).toBe('-');
    expect(formatPrice(-1)).toBe('-');
  });

  it('fixes relative and local image urls', () => {
    expect(fixImageUrl('/uploads/a.jpg')).toBe('http://localhost:3000/uploads/a.jpg');
    expect(fixImageUrl('http://localhost:3000/uploads/a.jpg')).toBe('http://localhost:3000/uploads/a.jpg');
    expect(fixImageUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
  });

  it('formats date and distance values', () => {
    expect(formatDate('2026-04-03T00:00:00.000Z')).toMatch(/2026\./);
    expect(formatDistance(532)).toBe('532m');
    expect(formatDistance(1500)).toBe('1.5km');
    expect(formatDistance(NaN)).toBe('-');
  });

  it('calculates distance and relative time', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-03T12:00:00.000Z'));

    const meters = getDistanceM(37.5665, 126.978, 37.5665, 126.978);
    expect(Math.round(meters)).toBe(0);
    expect(formatRelativeTime('2026-04-03T11:30:00.000Z')).toBe('30분 전');

    jest.useRealTimers();
  });
});
