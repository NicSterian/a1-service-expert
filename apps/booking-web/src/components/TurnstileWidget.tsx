import { useEffect, useRef, useState } from 'react';

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

type TurnstileInstance = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileInstance;
  }
}

export interface TurnstileWidgetProps {
  onChange: (token: string | null) => void;
  className?: string;
  fallbackLabel?: string;
}

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const loadTurnstileScript = (): Promise<void> => {
  if (window.turnstile) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);
  if (existing && existing.dataset.loaded === 'true') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Turnstile script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.loaded = 'false';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Turnstile script'));
    document.head.appendChild(script);
  });
};

export function TurnstileWidget({ onChange, className, fallbackLabel = 'I confirm I am not a robot.' }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const checkboxRef = useRef<HTMLInputElement | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);

  useEffect(() => {
    if (!siteKey) {
      const checkbox = checkboxRef.current;
      if (!checkbox) {
        return () => undefined;
      }

      const handler = () => onChange(checkbox.checked ? 'dev-captcha-token' : null);
      checkbox.addEventListener('change', handler);
      return () => checkbox.removeEventListener('change', handler);
    }

    let cancelled = false;
    let currentWidgetId: string | null = null;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) {
          return;
        }

        currentWidgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onChange(token),
          'error-callback': () => onChange(null),
          'expired-callback': () => onChange(null),
        });
        setWidgetId(currentWidgetId);
      })
      .catch(() => {
        onChange(null);
      });

    return () => {
      cancelled = true;
      if (currentWidgetId && window.turnstile) {
        window.turnstile.remove(currentWidgetId);
      }
    };
  }, [onChange]);

  useEffect(() => {
    return () => {
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [widgetId]);

  if (!siteKey) {
    return (
      <label className={`${className ?? ''} flex items-center gap-2 text-sm text-slate-700`}>
        <input ref={checkboxRef} type="checkbox" className="h-4 w-4" />
        <span>{fallbackLabel}</span>
      </label>
    );
  }

  return <div ref={containerRef} className={className} />;
}
