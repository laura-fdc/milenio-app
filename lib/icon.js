import { ImageResponse } from 'next/og';

export function iconResponse(size, { maskable = false } = {}) {
  const star = Math.round(size * (maskable ? 0.5 : 0.64));
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg,#FFC72C,#F28C28 70%)', borderRadius: maskable ? 0 : size * 0.22 }}>
        <svg width={star} height={star} viewBox="0 0 24 24">
          <path fill="#fff" d="M12 1.8l3.1 6.5 7.1.9-5.2 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7L1.8 9.2l7.1-.9z" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
