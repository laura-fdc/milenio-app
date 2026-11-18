'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav({ tabs }) {
  const path = usePathname();
  const active = (href) => {
    if (href === '/') return path === '/';
    if (href === '/secciones') return path.startsWith('/secciones') || path.startsWith('/grupo');
    return path.startsWith(href);
  };
  if (tabs.length < 2) return null;
  return (
    <nav className="bottomnav">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={active(t.href) ? 'active' : ''}>
          <span className="i">{t.i}</span>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
