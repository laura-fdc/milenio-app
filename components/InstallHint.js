'use client';
import { useEffect, useState } from 'react';

// Muestra cómo añadir la app a la pantalla de inicio (o el botón de instalar en Android/Chrome).
export default function InstallHint() {
  const [prompt, setPrompt] = useState(null);
  const [mode, setMode] = useState(null);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) return;
    const ua = navigator.userAgent;
    setMode(/iphone|ipad|ipod/i.test(ua) ? 'ios' : 'other');
    const h = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  if (!mode) return null;
  if (prompt)
    return (
      <button className="btn ghost block" style={{ marginTop: 16 }}
        onClick={async () => { prompt.prompt(); await prompt.userChoice; setPrompt(null); }}>
        📲 Instalar app en el móvil
      </button>
    );
  return (
    <div className="install">
      📲 <b>Úsala como app:</b>{' '}
      {mode === 'ios'
        ? <>en Safari pulsa <b>Compartir</b> ⬆️ y luego <b>“Añadir a pantalla de inicio”</b>.</>
        : <>en el menú del navegador ⋮ elige <b>“Añadir a pantalla de inicio”</b> o <b>“Instalar app”</b>.</>}
    </div>
  );
}
