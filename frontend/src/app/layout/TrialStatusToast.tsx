import { useEffect, useState } from "react";
import { useLocalization } from "../../localization/LocalizationProvider";
import { RenewAccessActions } from "../../features/subscription/components/RenewAccessActions";
import { useTrialStatusViewModel } from "../../features/trial/useTrialStatusViewModel";

interface TrialStatusToastProps {
  trialDaysRemaining: number | null;
  isOwner?: boolean;
  renewalCount?: number;
  userEmail?: string;
}

export function TrialStatusToast({
  trialDaysRemaining,
  isOwner = false,
  renewalCount = 0,
  userEmail = "",
}: TrialStatusToastProps) {
  const { t } = useLocalization();
  const [isDismissed, setIsDismissed] = useState(false);
  const trialStatus = useTrialStatusViewModel({
    isOwner,
    renewalCount,
    trialDaysRemaining,
  });

  useEffect(() => {
    setIsDismissed(false);
  }, [trialDaysRemaining, isOwner]);

  if (!trialStatus.isVisible || isDismissed) {
    return null;
  }

  return (
    <div
      className={`trial-toast${trialStatus.isWarning ? " trial-toast--warn" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="trial-toast__content">
        <span className="trial-toast__label">{t("trialToast.label")}</span>
        <div className="trial-toast__body">
          <span className="trial-toast__message">{trialStatus.message}</span>
          <RenewAccessActions compact userEmail={userEmail} />
        </div>
      </div>
      <button
        type="button"
        className="trial-toast__close"
        onClick={() => setIsDismissed(true)}
        aria-label={t("trialToast.dismiss")}
      >
        ×
      </button>
    </div>
  );
}
