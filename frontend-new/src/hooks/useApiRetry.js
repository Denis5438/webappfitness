import { useCallback } from 'react';

export const useApiRetry = () => {
    const fetchWithRetry = useCallback(async (url, options = {}, retries = 3, delay = 2000) => {
        let lastError;

        for (let i = 0; i < retries; i++) {
            try {
                // Get fresh tg reference on each attempt (may not be available at module load time)
                const tg = window.Telegram?.WebApp;

                // Add auth header automatically if available
                const headers = { ...options.headers };

                // Debug logging
                console.log('🔐 Auth check:', { hasTg: !!tg, hasInitData: !!tg?.initData, userId: tg?.initDataUnsafe?.user?.id });

                if (tg?.initData) {
                    headers['x-telegram-init-data'] = tg.initData;
                } else {
                    // Fallback: try to get user from localStorage or generate mock data for testing
                    const tgUser = tg?.initDataUnsafe?.user;
                    if (tgUser?.id) {
                        headers['x-telegram-init-data'] = `user=${encodeURIComponent(JSON.stringify({
                            id: tgUser.id,
                            first_name: tgUser.first_name || 'User'
                        }))}`;
                    } else {
                        console.warn('Telegram initData not available for auth header');
                    }
                }

                const res = await fetch(url, { ...options, headers });

                if (!res.ok) {
                    // Если 4xx ошибка (клиентская), не ретраим (кроме 429)
                    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                        throw new Error(`Client Error: ${res.status}`);
                    }
                    throw new Error(`Server Error: ${res.status}`);
                }

                return res; // Success
            } catch (err) {
                lastError = err;
                console.warn(`Fetch attempt ${i + 1} failed: ${err.message}`);
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // Exponential backoff
                }
            }
        }
        throw lastError;
    }, []);

    return { fetchWithRetry };
};
