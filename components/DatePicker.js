'use client';
import { useRouter } from 'next/navigation';

export default function DatePicker({ value, base }) {
  const router = useRouter();
  return (
    <input type="date" value={value} onChange={(e) => e.target.value && router.push(`${base}?fecha=${e.target.value}`)} />
  );
}
