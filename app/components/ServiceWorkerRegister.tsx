'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Silent fail: app should still work without SW.
        });
    }, []);

    return null;
}
