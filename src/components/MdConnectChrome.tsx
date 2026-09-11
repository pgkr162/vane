'use client';

import { useEffect, useState } from 'react';

import SettingsButton from './Settings/SettingsButton';

const HOME = 'https://connect.medalsports.us/home';

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
      {canConfigure ? <SettingsButton /> : null}
      <a
        href={HOME}
        className="text-[10px] text-black/60 dark:text-white/60 hover:opacity-70"
      >
        MD Connect
      </a>
    </div>
  );
}
