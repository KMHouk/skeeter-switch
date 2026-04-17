import { useEffect, useState } from 'react';

interface DryRunBannerProps {
  isDryRun: boolean;
}

export const DryRunBanner = ({ isDryRun }: DryRunBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('skeeter-dryrun-dismissed');
    setDismissed(stored === 'true');
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('skeeter-dryrun-dismissed', 'true');
    setDismissed(true);
  };

  if (!isDryRun || dismissed) {
    return null;
  }

  return (
    <div className="banner">
      <span>⚠️ DRY RUN MODE — No webhooks will be called. Toggle off in config to enable live control.</span>
      <button className="button" onClick={handleDismiss}>
        Dismiss
      </button>
    </div>
  );
};
