import { useEffect, useState } from 'react';

export function useTelegram() {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [initData, setInitData] = useState('');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg && tg.initDataUnsafe?.user) {
      // Telegram WebApp доступен — используем реальные данные
      tg.ready();
      tg.expand();

      const tgUser = tg.initDataUnsafe.user;
      setUser({
        id: tgUser.id,
        first_name: tgUser.first_name || '',
        last_name: tgUser.last_name || '',
        username: tgUser.username || '',
        photo_url: tgUser.photo_url || null,
      });
      setInitData(tg.initData);
      setIsReady(true);
    } else {
      // НЕ в Telegram — НЕ создаём mock данные!
      // Это предотвращает смешивание данных между пользователями
      console.error('❌ Telegram WebApp недоступен — приложение должно открываться только через Telegram бота');
      setUser(null);
      setInitData('');
      setIsReady(true);
    }
  }, []);

  const showMainButton = (text, onClick) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.MainButton) {
      tg.MainButton.text = text;
      tg.MainButton.onClick(onClick);
      tg.MainButton.show();
    }
  };

  const hideMainButton = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.MainButton) {
      tg.MainButton.hide();
    }
  };

  const showBackButton = (onClick) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.BackButton) {
      tg.BackButton.onClick(onClick);
      tg.BackButton.show();
    }
  };

  const hideBackButton = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.BackButton) {
      tg.BackButton.hide();
    }
  };

  const hapticFeedback = (type = 'impact') => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      if (type === 'success') {
        tg.HapticFeedback.notificationOccurred('success');
      } else if (type === 'error') {
        tg.HapticFeedback.notificationOccurred('error');
      } else {
        tg.HapticFeedback.impactOccurred('medium');
      }
    }
  };

  const close = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.close) {
      tg.close();
    }
  };

  return {
    user,
    isReady,
    initData, // Для отправки на бэкенд в заголовке x-telegram-init-data
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    hapticFeedback,
    close,
    tg: window.Telegram?.WebApp || null,
  };
}
