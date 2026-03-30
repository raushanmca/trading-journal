import axios from "axios";
import { getAuthHeaders } from "../../utils/auth";
import { getApiBaseUrl } from "../../utils/api";
import type { StoredUser } from "../auth/types";

const BASE_URL = getApiBaseUrl();

interface RenewSubscriptionResponse {
  message: string;
  user: StoredUser;
  renewal: {
    amount: number;
    renewalCount: number;
  };
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
