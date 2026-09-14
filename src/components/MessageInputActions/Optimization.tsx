import { ChevronDown, FileText, Sliders, Sparkles, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useChat } from '@/lib/hooks/useChat';
import { AnimatePresence, motion } from 'motion/react';
import { useI18n } from '@/i18n/provider';
import { SearchPresetKey } from '@/lib/search/presets';
import type { MessageKey } from '@/i18n/messages';
import type { ReactNode } from 'react';

const PRESET_ITEMS: {
  key: Exclude<SearchPresetKey, 'custom'>;
  title: MessageKey;
  description: MessageKey;
  icon: ReactNode;
}[] = [
  {
    key: 'auto',
    title: 'presetAuto',
    description: 'presetAutoDesc',
    icon: <Sparkles size={16} className="text-[#9C27B0]" />,
  },
  {
    key: 'fast',
    title: 'speed',
    description: 'speedDesc',
    icon: <Zap size={16} className="text-[#FF9800]" />,
  },
  {
    key: 'balanced',
    title: 'balanced',
    description: 'balancedDesc',
    icon: <Sliders size={16} className="text-[#4CAF50]" />,
  },
  {
    key: 'deep',
    title: 'quality',
    description: 'qualityDesc',
    icon: <Star size={16} className="text-[#2196F3]" />,
  },
  {
    key: 'long',
    title: 'presetLong',
    description: 'presetLongDesc',
    icon: <FileText size={16} className="text-[#795548]" />,
  },
];

const Optimization = () => {
  const { searchPreset, applySearchPreset, optimizationMode } = useChat();
  const { t } = useI18n();

  const current =
    PRESET_ITEMS.find((item) => item.key === searchPreset) ??
    PRESET_ITEMS.find((item) =>
      searchPreset === 'custom' && optimizationMode === 'speed'
        ? item.key === 'fast'
        : searchPreset === 'custom' && optimizationMode === 'quality'
          ? item.key === 'deep'
          : item.key === 'balanced',
    );

  return (
    <Popover className="relative w-full max-w-[15rem] md:max-w-md lg:max-w-lg">
      {({ open }) => (
        <>
          <PopoverButton
            type="button"
            className="p-2 text-black/50 dark:text-white/50 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary active:scale-95 transition duration-200 hover:text-black dark:hover:text-white focus:outline-none"
          >
            <div className="flex flex-row items-center space-x-1">
              {current?.icon}
              <ChevronDown
                size={16}
                className={cn(
                  open ? 'rotate-180' : 'rotate-0',
                  'transition duration-200',
                )}
              />
            </div>
          </PopoverButton>
          <AnimatePresence>
            {open && (
              <PopoverPanel
                className="absolute z-10 w-72 md:w-[280px] left-0"
                static
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                  className="origin-top-left flex flex-col space-y-1 bg-light-primary dark:bg-dark-primary border rounded-lg border-light-200 dark:border-dark-200 w-full p-2 max-h-[min(24rem,70vh)] overflow-y-auto"
                >
                  {PRESET_ITEMS.map((item) => (
                    <PopoverButton
                      onClick={() => applySearchPreset(item.key)}
                      key={item.key}
                      className={cn(
                        'p-2 rounded-lg flex flex-col items-start justify-start text-start space-y-1 duration-200 cursor-pointer transition focus:outline-none',
                        searchPreset === item.key
                          ? 'bg-light-secondary dark:bg-dark-secondary'
                          : 'hover:bg-light-secondary dark:hover:bg-dark-secondary',
                      )}
                    >
                      <div className="flex flex-row space-x-1 text-black dark:text-white">
                        {item.icon}
                        <p className="text-xs font-medium">{t(item.title)}</p>
                      </div>
                      <p className="text-black/70 dark:text-white/70 text-xs">
                        {t(item.description)}
                      </p>
                    </PopoverButton>
                  ))}
                </motion.div>
              </PopoverPanel>
            )}
          </AnimatePresence>
        </>
      )}
    </Popover>
  );
};

export default Optimization;
