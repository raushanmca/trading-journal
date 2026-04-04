import { useMemo, useState } from "react";
import { requestPaymentApproval } from "../subscriptionService";
import {
  buildRenewalUpiUrl,
  getMonthlyRenewalAmount,
  getRenewalUpiId,
} from "../upi";
import { useLocalization } from "../../../localization/LocalizationProvider";

interface UseRenewSubscriptionOptions {
  userEmail?: string;
  onRenewed?: () => void;
}

export function useRenewSubscription({
  userEmail = "",
  onRenewed,
}: UseRenewSubscriptionOptions) {
  const { t } = useLocalization();
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const amount = getMonthlyRenewalAmount();
  const upiUrl = useMemo(() => buildRenewalUpiUrl(userEmail), [userEmail]);
  const upiId = useMemo(() => getRenewalUpiId(), []);

  const openUpi = () => {
    if (!upiUrl) {
      setErrorMessage(t("renewal.configMissing"));
      return;
    }

    window.location.assign(upiUrl);
    setAwaitingConfirmation(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const confirmRenewal = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      const response = await requestPaymentApproval("upi-manual-confirmation");
      setSuccessMessage(response.message || t("renewal.requestSubmitted"));
      setAwaitingConfirmation(false);
      onRenewed?.();
    } catch (error) {
      console.error("Renewal failed", error);
      if (
        typeof error === "object" &&
        error &&
        "response" in error &&
        (error as any).response?.data?.message
      ) {
        setErrorMessage((error as any).response.data.message);
      } else {
        setErrorMessage(t("renewal.failed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    amount,
    awaitingConfirmation,
    confirmRenewal,
    errorMessage,
    isSubmitting,
    openUpi,
    successMessage,
    upiId,
    upiUrl,
  };
}
