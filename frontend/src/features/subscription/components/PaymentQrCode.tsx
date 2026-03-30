import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useLocalization } from "../../../localization/LocalizationProvider";

interface PaymentQrCodeProps {
  paymentUrl: string | null;
}

export function PaymentQrCode({ paymentUrl }: PaymentQrCodeProps) {
  const { t } = useLocalization();
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function generateQrCode() {
      if (!paymentUrl) {
        setQrDataUrl("");
        return;
      }

      try {
        const nextDataUrl = await QRCode.toDataURL(paymentUrl, {
          width: 220,
          margin: 1,
          color: {
            dark: "#0f172a",
            light: "#fffef6",
          },
        });

        if (isMounted) {
          setQrDataUrl(nextDataUrl);
        }
      } catch (error) {
        console.error("QR code generation failed", error);
        if (isMounted) {
          setQrDataUrl("");
        }
      }
    }

    generateQrCode();

    return () => {
      isMounted = false;
    };
  }, [paymentUrl]);

  if (!qrDataUrl) {
    return null;
  }

  return (
    <div className="payment-qr">
      <img
        className="payment-qr__image"
        src={qrDataUrl}
        alt={t("renewal.qrAlt")}
      />
      <div className="payment-qr__caption">{t("renewal.qrHint")}</div>
    </div>
  );
}
