'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const startProgress = useCallback(() => {
    setLoading(true);
    setProgress(20);
  }, []);

  const finishProgress = useCallback(() => {
    setProgress(100);
    const timer = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Complete progress on pathname or searchParams change
  useEffect(() => {
    if (loading) {
      finishProgress();
    }
  }, [pathname, searchParams, finishProgress, loading]);

  // Listen for custom navigation events and global link clicks
  useEffect(() => {
    const handleNavStart = () => startProgress();

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (anchor && anchor.href && anchor.target !== '_blank') {
        const url = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // If navigating internally to a different pathname or query string
        if (
          url.origin === currentUrl.origin &&
          (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search)
        ) {
          startProgress();
        }
      }
    };

    window.addEventListener('refly-nav-start', handleNavStart);
    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('refly-nav-start', handleNavStart);
      document.removeEventListener('click', handleClick, true);
    };
  }, [startProgress]);

  // Increment progress while loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + Math.random() * 15 : prev));
    }, 150);
    return () => clearInterval(interval);
  }, [loading]);

  if (!loading && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-busy={loading}
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-zinc-200/50 overflow-hidden pointer-events-none"
    >
      <div
        className="h-full bg-zinc-950 transition-all duration-200 ease-out shadow-[0_0_8px_rgba(9,9,11,0.5)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// Helper to trigger navigation progress manually from client code
export function triggerNavigationProgress() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refly-nav-start'));
  }
}
