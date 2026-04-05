export type AppToastTone = "info" | "success" | "warning" | "error";

export interface AppToastDetail {
  message: string;
  tone?: AppToastTone;
}

export function showToast(message: string, tone: AppToastTone = "info") {
  window.dispatchEvent(
    new CustomEvent<AppToastDetail>("app-toast", {
      detail: {
        message,
        tone,
      },
    }),
  );
}
