import axios from "axios";
import { getAuthHeaders } from "../../utils/auth";
import { getApiBaseUrl } from "../../utils/api";
import type { PaymentRequestStatus, StoredUser } from "../auth/types";

const BASE_URL = getApiBaseUrl();

interface RenewSubscriptionResponse {
  message: string;
  user: StoredUser;
  renewal: {
    amount: number;
    renewalCount: number;
  };
}

interface PaymentApprovalResponse {
  message: string;
  paymentRequest?: {
    _id: string;
    paymentReference: string;
    status: string;
  };
}

interface PaymentApprovalStatusResponse {
  user: StoredUser;
  paymentRequest?: PaymentRequestStatus | null;
}

export async function renewSubscription(paymentReference = "") {
  const authHeaders = getAuthHeaders();

  const response = await axios.post<RenewSubscriptionResponse>(
    `${BASE_URL}/api/subscription/renew`,
    { paymentReference },
    {
      headers: authHeaders,
    },
  );

  localStorage.setItem("user", JSON.stringify(response.data.user));
  window.dispatchEvent(new Event("auth-changed"));

  return response.data;
}

export async function requestPaymentApproval(paymentReference = "") {
  const authHeaders = getAuthHeaders();

  const response = await axios.post<PaymentApprovalResponse>(
    `${BASE_URL}/api/payment-request/request-approval`,
    { paymentReference },
    {
      headers: authHeaders,
    },
  );

  return response.data;
}

export async function getPaymentApprovalStatus() {
  const authHeaders = getAuthHeaders();

  const response = await axios.get<PaymentApprovalStatusResponse>(
    `${BASE_URL}/api/payment-request/my-status`,
    {
      headers: authHeaders,
    },
  );

  if (response.data.user) {
    localStorage.setItem("user", JSON.stringify(response.data.user));
    window.dispatchEvent(new Event("auth-changed"));
  }

  return response.data;
}
