import { useEffect, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export interface RecaptchaWidgetProps {
  onChange: (token: string | null) => void;
  className?: string;
  fallbackLabel?: string;
}

export function RecaptchaWidget({ onChange, className, fallbackLabel = 'I am not a robot' }: RecaptchaWidgetProps) {
  const checkboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!siteKey && checkboxRef.current) {
      const checkbox = checkboxRef.current;
      const handler = () => onChange(checkbox.checked ? 'dev-captcha-token' : null);
      checkbox.addEventListener('change', handler);
      return () => checkbox.removeEventListener('change', handler);
    }
    return () => undefined;
  }, [onChange]);

  if (!siteKey) {
    return (
      <label className={`${className ?? ''} flex items-center gap-2 text-sm text-slate-700`}>
        <input ref={checkboxRef} type="checkbox" className="h-4 w-4" />
        <span>{fallbackLabel}</span>
      </label>
    );
  }

  return (
    <div className={className}>
      <ReCAPTCHA sitekey={siteKey} onChange={onChange} onExpired={() => onChange(null)} />
    </div>
  );
}
