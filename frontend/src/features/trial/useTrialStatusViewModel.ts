import { useMemo } from "react";
import { useLocalization } from "../../localization/LocalizationProvider";

interface TrialStatusViewModelInput {
  isOwner?: boolean;
  trialDaysRemaining: number | null;
}

export function useTrialStatusViewModel({
  isOwner = false,
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

    return {
      isVisible: true,
      isExpired: false,
      isWarning: trialDaysRemaining <= 5,
      message: t("trialToast.daysLeft", {
        count: trialDaysRemaining,
        suffix: trialDaysRemaining === 1 ? "" : "s",
      }),
    };
  }, [isOwner, t, trialDaysRemaining]);
}
