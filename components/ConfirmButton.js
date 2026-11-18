'use client';

export default function ConfirmButton({ message, children, ...props }) {
  return (
    <button {...props} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
