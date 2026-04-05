import { useEffect, useMemo, useState } from "react";
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
  startExpanded?: boolean;
}

export function useRenewSubscription({
  userEmail = "",
  onRenewed,
  startExpanded = false,
}: UseRenewSubscriptionOptions) {
  const { t } = useLocalization();
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(startExpanded);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const amount = getMonthlyRenewalAmount();
  const upiUrl = useMemo(() => buildRenewalUpiUrl(userEmail), [userEmail]);
  const upiId = useMemo(() => getRenewalUpiId(), []);

  useEffect(() => {
    if (!startExpanded) {
      return;
    }

    setAwaitingConfirmation(true);
    setErrorMessage("");
    setSuccessMessage("");
  }, [startExpanded]);

  const openUpi = () => {
    if (!upiUrl) {
      setErrorMessage(t("renewal.configMissing"));
      return;
    }

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
