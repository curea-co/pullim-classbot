'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ServiceIcon } from '@/components/ui/service-icon';
import {
  classbotSwitcherServices,
  type ClassbotServiceIconName,
  type ClassbotSwitcherService,
} from './pullim-services';
import styles from './classbot-service-switcher.module.css';

function JuniorServiceIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <circle cx="50" cy="50" r="21" fill="#E6FF4C" />
    </svg>
  );
}

function ArcadeServiceIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <rect x="24" y="62" width="34" height="9" rx="4.5" fill="#FFFFFF" />
      <rect x="37" y="40" width="8" height="24" fill="#FFFFFF" />
      <circle cx="41" cy="36" r="9" fill="#E6FF4C" />
      <circle cx="66" cy="40" r="6" fill="#FFFFFF" />
      <circle cx="70" cy="58" r="6" fill="#FFFFFF" />
    </svg>
  );
}

function ServiceGlyph({ name, size }: { name: ClassbotServiceIconName; size: number }) {
  if (name === 'home') return <span className={styles.homeGlyph}>⌂</span>;
  if (name === 'junior') return <JuniorServiceIcon size={size} />;
  if (name === 'arcade') return <ArcadeServiceIcon size={size} />;
  return <ServiceIcon name={name} size={size} aria-hidden="true" />;
}

function ServiceItemBody({ service }: { service: ClassbotSwitcherService }) {
  return (
    <>
      <span
        className={styles.glyph}
        data-service-icon={service.icon}
        aria-hidden="true"
      >
        <ServiceGlyph name={service.icon} size={34} />
      </span>
      <span className={styles.itemCopy}>
        <span className={styles.itemName}>{service.name}</span>
        <span className={styles.itemDescription}>{service.description}</span>
      </span>
    </>
  );
}

/** 플래너의 OS 전용 카탈로그형 서비스 전환 UI를 클래스봇 목록에 맞춘 어댑터. */
export function ClassbotServiceSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const services = classbotSwitcherServices();
  const active = services.find((service) => service.active);

  useEffect(() => {
    if (!open) return;

    const closeOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  if (!active) return null;

  return (
    <div ref={ref} className={`${styles.switcher} ${open ? styles.open : ''}`}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="서비스 전환"
        aria-haspopup="menu"
        aria-controls="classbot-service-menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.triggerGlyph} aria-hidden="true">
          <ServiceGlyph name={active.icon} size={30} />
        </span>
        <span className={styles.triggerName}>{active.name}</span>
        <ChevronDown className={styles.chevron} width={16} height={16} aria-hidden="true" />
      </button>

      <div id="classbot-service-menu" className={styles.menu} role="menu">
        <div className={styles.menuHeading}>서비스 전환</div>
        {services.map((service) =>
          service.active ? (
            <div
              key={service.slug}
              role="menuitem"
              aria-current="page"
              data-service-name={service.name}
              className={`${styles.item} ${styles.currentItem}`}
            >
              <ServiceItemBody service={service} />
            </div>
          ) : (
            <a
              key={service.slug}
              href={service.href}
              role="menuitem"
              data-service-name={service.name}
              className={styles.item}
            >
              <ServiceItemBody service={service} />
            </a>
          ),
        )}
      </div>
    </div>
  );
}
