import { useLocalization } from "../../../localization/LocalizationProvider";
import { PaymentQrCode } from "./PaymentQrCode";
import { useRenewSubscription } from "../hooks/useRenewSubscription";

interface RenewAccessActionsProps {
  userEmail?: string;
  onRenewed?: () => void;
  compact?: boolean;
  startExpanded?: boolean;
}

export function RenewAccessActions({
  userEmail = "",
  onRenewed,
  compact = false,
  startExpanded = false,
}: RenewAccessActionsProps) {
  const { t } = useLocalization();
  const {
    amount,
    awaitingConfirmation,
    confirmRenewal,
    errorMessage,
    isSubmitting,
    openUpi,
    successMessage,
    upiId,
    upiUrl,
  } = useRenewSubscription({
    userEmail,
    onRenewed,
    startExpanded,
  });

  return (
    <div className={`renew-actions${compact ? " renew-actions--compact" : ""}`}>
      <button
        type="button"
        className="renew-actions__button renew-actions__button--primary"
        onClick={openUpi}
      >
        {t("renewal.pay", { amount })}
      </button>

      {awaitingConfirmation ? (
        <>
          <PaymentQrCode paymentUrl={upiUrl} />
          <div className="renew-actions__details">
            <div className="renew-actions__upi-id">
              {t("renewal.upiId", { upiId })}
            </div>
            <button
              type="button"
              className="renew-actions__button renew-actions__button--secondary"
              onClick={confirmRenewal}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("renewal.processing") : t("renewal.alreadyPaid")}
            </button>
          </div>
        </>
      ) : (
        <span className="renew-actions__hint">
          {t("renewal.hint", { amount })}
        </span>
      )}

      {successMessage ? (
        <div className="renew-actions__success">{successMessage}</div>
      ) : null}

      {errorMessage ? (
        <div className="renew-actions__error">{errorMessage}</div>
      ) : null}
    </div>
  );
}
