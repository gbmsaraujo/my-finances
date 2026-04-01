'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        if (process.env.NODE_ENV !== 'production') {
            navigator.serviceWorker
                .getRegistrations()
                .then((registrations) =>
                    Promise.all(
                        registrations.map((registration) =>
                            registration.unregister(),
                        ),
                    ),
                )
                .catch(() => {
                    // Silent fail: local development should still run.
                });

            if ('caches' in window) {
                caches
                    .keys()
                    .then((keys) =>
                        Promise.all(
                            keys
                                .filter((key) => key.startsWith('my-finances-'))
                                .map((key) => caches.delete(key)),
                        ),
                    )
                    .catch(() => {
                        // Silent fail: cache cleanup is best-effort.
                    });
            }

            return;
        }

        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
            // Silent fail: app should still work without SW.
        });
    }, []);

    return null;
}
