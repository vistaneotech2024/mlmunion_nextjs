import React, { useEffect, useRef } from 'react';

interface VelocityRange {
  min: number;
  max: number;
}

interface FairyDustCursorProps {
  colors: string[];
  characterSet: string[];
  particleSize: number;
  particleCount: number;
  gravity: number;
  fadeSpeed: number;
  initialVelocity: VelocityRange;
}

interface Particle {
  element: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const FairyDustCursor: React.FC<FairyDustCursorProps> = ({
  colors,
  characterSet,
  particleSize,
  particleCount,
  gravity,
  fadeSpeed,
  initialVelocity,
}) => {
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const createParticle = (x: number, y: number) => {
      const span = document.createElement('span');
      span.style.position = 'fixed';
      span.style.left = '0px';
      span.style.top = '0px';
      span.style.pointerEvents = 'none';
      span.style.zIndex = '9999';
      span.style.fontSize = `${particleSize}px`;
      span.style.willChange = 'transform, opacity';

      const char =
        characterSet[Math.floor(Math.random() * characterSet.length)] ?? '✨';
      const color = colors[Math.floor(Math.random() * colors.length)] ?? '#FFD700';

      span.textContent = char;
      span.style.color = color;

      document.body.appendChild(span);

      const angle = Math.random() * Math.PI * 2;
      const speed =
        initialVelocity.min +
        Math.random() * (initialVelocity.max - initialVelocity.min);

      const particle: Particle = {
        element: span,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
      };

      particlesRef.current.push(particle);
    };

    const onMouseMove = (e: MouseEvent) => {
      for (let i = 0; i < particleCount; i++) {
        createParticle(e.clientX, e.clientY);
      }
    };

    const animate = () => {
      particlesRef.current = particlesRef.current.filter((p) => {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.life *= fadeSpeed;

        p.element.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        p.element.style.opacity = String(p.life);

        if (p.life < 0.05) {
          p.element.remove();
          return false;
        }

        return true;
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMouseMove);
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      particlesRef.current.forEach((p) => p.element.remove());
      particlesRef.current = [];
    };
  }, [characterSet, colors, fadeSpeed, gravity, initialVelocity.max, initialVelocity.min, particleCount, particleSize]);

  return null;
};

export default FairyDustCursor;

