'use client';
import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
export function Animations() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('[data-hero-reveal]', {
        y: 30,
        opacity: 0,
        duration: 1.1,
        stagger: 0.12,
        ease: 'power3.out',
        clearProps: 'all',
      });
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) =>
        gsap.from(element, {
          y: 38,
          opacity: 0,
          duration: 0.9,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: { trigger: element, start: 'top 92%', once: true },
        })
      );
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((element) =>
        gsap.fromTo(
          element,
          { yPercent: -4 },
          {
            yPercent: 4,
            ease: 'none',
            scrollTrigger: {
              trigger: element.parentElement,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.2,
            },
          }
        )
      );
      if (document.querySelector('.hero-sun'))
        gsap.to('.hero-sun', {
          rotation: 40,
          ease: 'none',
          scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 1.5,
          },
        });
    });
    return () => media.revert();
  }, [pathname]);
  return null;
}
