import { useEffect, useMemo, useState } from "react";
import {
  getPaymentApprovalStatus,
  requestPaymentApproval,
} from "../subscriptionService";
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
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
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

  useEffect(() => {
    let isMounted = true;

    const syncPaymentStatus = async () => {
      try {
        setIsLoadingStatus(true);
        const response = await getPaymentApprovalStatus();

        if (!isMounted) {
          return;
        }

        const currentStatus = response.paymentRequest?.status;

        if (currentStatus === "pending") {
          setSuccessMessage(t("renewal.pendingStatus"));
          setErrorMessage("");
          return;
        }

        if (currentStatus === "approved") {
          setSuccessMessage(t("renewal.approvedStatus"));
          setErrorMessage("");
          return;
        }

        if (currentStatus === "rejected") {
          setSuccessMessage("");
          setErrorMessage(t("renewal.rejectedStatus"));
          return;
        }

        setErrorMessage("");
        setSuccessMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Failed to load payment request status", error);
      } finally {
        if (isMounted) {
          setIsLoadingStatus(false);
        }
      }
    };

    void syncPaymentStatus();

    const handleSync = () => {
      void syncPaymentStatus();
    };

    window.addEventListener("focus", handleSync);
    window.addEventListener("auth-changed", handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("auth-changed", handleSync);
    };
  }, [t]);

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
    isLoadingStatus,
    isSubmitting,
    openUpi,
    successMessage,
    upiId,
    upiUrl,
  };
}
