'use client';

import BackToConnect from './BackToConnect';
import LanguageSwitcher from './LanguageSwitcher';
import SettingsButtonMobile from './Settings/SettingsButtonMobile';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="min-h-screen bg-light-primary dark:bg-dark-primary lg:pl-20">
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-light-200/60 bg-light-primary/95 px-4 py-3 backdrop-blur-sm dark:border-dark-200/40 dark:bg-dark-primary/95 lg:hidden">
        <BackToConnect variant="labeled" />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <SettingsButtonMobile />
        </div>
      </div>
      <div className="mx-4 max-w-screen-lg lg:mx-auto">{children}</div>
    </main>
  );
};

export default Layout;
