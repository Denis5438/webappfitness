import { useCallback } from 'react';

const tg = window.Telegram?.WebApp;

export const useCloudStorage = () => {
    const getItem = useCallback(async (key) => {
        return new Promise((resolve) => {
            // 1. Пытаемся получить из CloudStorage
            if (tg?.CloudStorage) {
                tg.CloudStorage.getItem(key, (err, value) => {
                    if (!err && value) {
                        try {
                            resolve(JSON.parse(value));
                        } catch (e) {
                            resolve(value);
                        }
                    } else {
                        // Fallback to localStorage
                        const local = localStorage.getItem(key);
                        try {
                            resolve(JSON.parse(local));
                        } catch {
                            resolve(local);
                        }
                    }
                });
            } else {
                // Fallback если нет Telegram
                const local = localStorage.getItem(key);
                try {
                    resolve(JSON.parse(local));
                } catch {
                    resolve(local);
                }
            }
        });
    }, []);

    const setItem = useCallback(async (key, value) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;

        // Save to localStorage immediately
        localStorage.setItem(key, stringValue);

        return new Promise((resolve) => {
            if (tg?.CloudStorage) {
                tg.CloudStorage.setItem(key, stringValue, (err, stored) => {
                    resolve(!err && stored);
                });
            } else {
                resolve(true);
            }
        });
    }, []);

    const removeItem = useCallback(async (key) => {
        localStorage.removeItem(key);
        return new Promise((resolve) => {
            if (tg?.CloudStorage) {
                tg.CloudStorage.removeItem(key, (err, deleted) => {
                    resolve(!err && deleted);
                })
            } else {
                resolve(true);
            }
        })
    }, []);

    return { getItem, setItem, removeItem };
};
