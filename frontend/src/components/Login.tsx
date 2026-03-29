import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // if you're using react-router
import { getApiBaseUrl } from "../utils/api";

export default function Login() {
  const navigate = useNavigate();
  const apiUrl = getApiBaseUrl();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await axios.post(`${apiUrl}/api/auth/google`, {
        token: credentialResponse.credential, // Google ID token
      });

      // Save token (use httpOnly cookie on backend is more secure, but localStorage for simplicity)
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      window.dispatchEvent(new Event("auth-changed"));

      if (res.data.user?.isTrialExpired) {
        alert("Your 30-day trial has expired. Please contact support.");
        navigate("/dashboard");
        return;
      }

      alert("Login successful!");
      navigate("/dashboard"); // or wherever your main app is
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.message || "Login failed");
        return;
      }

      alert("Login failed");
    }
  };

  const handleGoogleError = () => {
    alert("Google login failed");
  };

  return (
    <div className="login-page">
      <section className="login-hero">
        <div>
          <span className="login-hero__eyebrow">Deploy-ready journal</span>
          <h1>Trade with memory, not guesswork.</h1>
          <p>
            Build a repeatable review habit with drag-and-drop journaling,
            quick setup notes, and a dashboard that surfaces your real edge.
          </p>
        </div>

        <div className="login-hero__grid">
          <div className="login-hero__metric">
            <span>Journal</span>
            <small>Capture PnL, rating, and mistakes in seconds.</small>
          </div>
          <div className="login-hero__metric">
            <span>Review</span>
            <small>Spot patterns before they become expensive habits.</small>
          </div>
          <div className="login-hero__metric">
            <span>Improve</span>
            <small>Turn each session into cleaner next-day execution.</small>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-panel__eyebrow">Sign in</div>
        <h2>Welcome back</h2>
        <p className="login-panel__lead">
          Continue with Google or GitHub to open your trading workspace.
        </p>

        <div className="login-panel__stack">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
            theme="filled_blue"
            size="large"
            text="continue_with"
          />

          <button
            onClick={() => (window.location.href = `${apiUrl}/api/auth/github`)}
            className="login-panel__github"
          >
            Continue with GitHub
          </button>
        </div>

        <p className="login-panel__note">
          By signing in, you agree to continue your journal with the account
          linked to your trading history.
        </p>
      </section>
    </div>
  );
}
