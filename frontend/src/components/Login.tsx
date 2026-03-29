import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // if you're using react-router

export default function Login() {
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await axios.post(`${apiUrl}/api/auth/google`, {
        token: credentialResponse.credential, // Google ID token
      });

      // Save token (use httpOnly cookie on backend is more secure, but localStorage for simplicity)
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      window.dispatchEvent(new Event("auth-changed"));

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
    <div
      style={{
        maxWidth: "400px",
        margin: "80px auto",
        padding: "40px",
        background: "white",
        borderRadius: "14px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        textAlign: "center",
      }}
    >
      <h2>Welcome to Trading Journal</h2>
      <p style={{ color: "#64748b", marginBottom: "30px" }}>
        Sign in to continue
      </p>

      <div style={{ marginBottom: "20px" }}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap
          theme="filled_blue"
          size="large"
          text="continue_with"
        />
      </div>

      {/* GitHub Button (we'll implement below) */}
      <button
        onClick={() => (window.location.href = `${apiUrl}/api/auth/github`)}
        style={{
          width: "100%",
          padding: "12px",
          background: "#333",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Continue with GitHub
      </button>

      <p style={{ marginTop: "20px", fontSize: "13px", color: "#94a3b8" }}>
        By signing in, you agree to our Terms
      </p>
    </div>
  );
}
