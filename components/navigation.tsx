'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Sun } from './sun';
const links = [
  { href: '/', label: 'Inicio' },
  { href: '/about', label: 'Nosotros' },
  { href: '/blog', label: 'Nuestro blog' },
  { href: '/contact', label: 'Contacto' },
];
export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const close = () => {
    setOpen(false);
    toggle.current?.focus();
  };
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Fundación Son Luz, inicio">
        <Sun className="brand-sun" />
        <span>
          <small>FUNDACIÓN</small>
          <strong>
            son luz<span className="brand-dot">.</span>
          </strong>
        </span>
      </Link>
      <nav className="desktop-nav" aria-label="Navegación principal">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <Link href="/donate" className="button button-green header-donate">
        Haz tu donación <ArrowUpRight size={16} />
      </Link>
      <button
        className="menu-toggle"
        ref={toggle}
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={open}
        aria-controls="mobile-navigation"
      >
        <Menu />
      </button>
      <dialog
        id="mobile-navigation"
        className="mobile-menu"
        ref={dialog}
        onCancel={close}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <button className="menu-close" onClick={close} aria-label="Cerrar menú">
          <X />
        </button>
        <Sun className="mobile-sun" />
        <nav aria-label="Navegación móvil">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              aria-current={pathname === link.href ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/donate" onClick={close}>
            Haz tu donación <ArrowUpRight size={24} />
          </Link>
        </nav>
        <p>Fundación Son Luz · Niños del mañana</p>
      </dialog>
    </header>
  );
}
