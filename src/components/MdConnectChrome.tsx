'use client';

import { useEffect, useState } from 'react';

import SettingsButton from './Settings/SettingsButton';
import LanguageSwitcher from './LanguageSwitcher';
import BackToConnect from './BackToConnect';

export default function MdConnectChrome() {
  const [canConfigure, setCanConfigure] = useState(false);

  useEffect(() => {
    fetch('/api/md-connect/me', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setCanConfigure(Boolean(data?.canConfigure)))
      .catch(() => setCanConfigure(false));
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <LanguageSwitcher placement="sidebar" />
      {canConfigure ? <SettingsButton /> : null}
      <BackToConnect />
    </div>
  );
}
