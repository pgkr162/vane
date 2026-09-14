'use client';

import { useEffect, useState } from 'react';
import EmptyChatMessageInput from './EmptyChatMessageInput';
import WeatherWidget from './WeatherWidget';
import NewsArticleWidget from './NewsArticleWidget';
import { useI18n } from '@/i18n/provider';
import {
  getShowNewsWidget,
  getShowWeatherWidget,
} from '@/lib/config/clientRegistry';

const EmptyChat = () => {
  const { t } = useI18n();
  const [showWeather, setShowWeather] = useState(() =>
    typeof window !== 'undefined' ? getShowWeatherWidget() : true,
  );
  const [showNews, setShowNews] = useState(() =>
    typeof window !== 'undefined' ? getShowNewsWidget() : true,
  );

  useEffect(() => {
    const updateWidgetVisibility = () => {
      setShowWeather(getShowWeatherWidget());
      setShowNews(getShowNewsWidget());
    };

    updateWidgetVisibility();

    window.addEventListener('client-config-changed', updateWidgetVisibility);
    window.addEventListener('storage', updateWidgetVisibility);

    return () => {
      window.removeEventListener(
        'client-config-changed',
        updateWidgetVisibility,
      );
      window.removeEventListener('storage', updateWidgetVisibility);
    };
  }, []);

  return (
    <div className="relative">
      <div className="flex flex-col items-center justify-center min-h-screen max-w-screen-sm mx-auto p-2 space-y-4">
        <div className="flex flex-col items-center justify-center w-full space-y-8">
          <h2 className="text-black/70 dark:text-white/70 text-3xl font-medium -mt-8">
            {t('researchBegins')}
          </h2>
          <EmptyChatMessageInput />
        </div>
        {(showWeather || showNews) && (
          <div className="flex flex-col w-full gap-4 mt-2 sm:flex-row sm:justify-center">
            {showWeather && (
              <div className="flex-1 w-full">
                <WeatherWidget />
              </div>
            )}
            {showNews && (
              <div className="flex-1 w-full">
                <NewsArticleWidget />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyChat;
