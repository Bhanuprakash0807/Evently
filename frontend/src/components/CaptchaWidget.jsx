import React, { useEffect, useRef } from 'react';

/**
 * hCaptcha widget.
 *
 * Uses VITE_HCAPTCHA_SITE_KEY env var.
 * Falls back to the official hCaptcha test site key so the widget renders
 * and can be completed without any account setup.
 *
 * Test site key: 10000000-ffff-ffff-ffff-000000000001
 *   - Always renders the checkbox widget
 *   - Always passes after the user clicks it
 */
const HCAPTCHA_SITE_KEY =
  import.meta.env.VITE_HCAPTCHA_SITE_KEY ||
  '10000000-ffff-ffff-ffff-000000000001';

const CaptchaWidget = ({ onVerify }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    const renderWidget = () => {
      if (!containerRef.current || widgetIdRef.current !== null) return;
      widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
        sitekey: HCAPTCHA_SITE_KEY,
        callback: (token) => onVerify(token),
        'expired-callback': () => onVerify(''),
        'error-callback': () => onVerify(''),
      });
    };

    if (window.hcaptcha) {
      renderWidget();
      return;
    }

    // Load hCaptcha script if not already present
    const existing = document.getElementById('hcaptcha-script');
    if (existing) {
      existing.addEventListener('load', renderWidget);
      return;
    }

    const script = document.createElement('script');
    script.id = 'hcaptcha-script';
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.head.appendChild(script);

    return () => {
      // Cleanup: reset widget on unmount
      if (widgetIdRef.current !== null && window.hcaptcha) {
        try { window.hcaptcha.reset(widgetIdRef.current); } catch (_) {}
        widgetIdRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ margin: '0.5rem 0' }}
    />
  );
};

export default CaptchaWidget;
