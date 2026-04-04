import { useMemo } from "react";
import { useLocalization } from "../../localization/LocalizationProvider";

interface TrialStatusViewModelInput {
  isOwner?: boolean;
  renewalCount?: number;
  trialDaysRemaining: number | null;
}

export function useTrialStatusViewModel({
  isOwner = false,
  renewalCount = 0,
  trialDaysRemaining,
}: TrialStatusViewModelInput) {
  const { t } = useLocalization();

  return useMemo(() => {
    if (isOwner || trialDaysRemaining === null) {
      return {
        isVisible: false,
        isExpired: false,
        isWarning: false,
        message: "",
      };
    }

    if (trialDaysRemaining === 0) {
      return {
        isVisible: true,
        isExpired: true,
        isWarning: true,
        message: t("trialToast.expired"),
      };
    }

    if (renewalCount > 0 && trialDaysRemaining > 15) {
      return {
        isVisible: false,
        isExpired: false,
        isWarning: false,
        message: "",
      };
    }

    return {
      isVisible: true,
      isExpired: false,
      isWarning: trialDaysRemaining <= 5,
      message: t("trialToast.daysLeft", {
        count: trialDaysRemaining,
        suffix: trialDaysRemaining === 1 ? "" : "s",
      }),
    };
  }, [isOwner, renewalCount, t, trialDaysRemaining]);
}
