export const colors = {
  primary: '#3d6b5e',
  navy: '#1C3A4A',
  rosyPink: '#C4768A',
  cream: '#F8F4EE',
  white: '#FFFFFF',
  muted: '#6B7280',
  error: '#B91C1C',
} as const;

export type ColorName = keyof typeof colors;
