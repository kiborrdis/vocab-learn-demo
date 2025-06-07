import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthActions } from "../hooks/useAuth";
import styles from "./AuthCallback.module.css";
import { apiClient } from "../api/api";
import { Button } from "../components/Button/Button";

const AuthCallback: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { refreshAuth } = useAuthActions();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const authenticatedRef = useRef(false);

  useEffect(() => {
    const authenticate = async () => {
      // Prevent multiple authentication attempts
      if (authenticatedRef.current) {
        return;
      }

      if (!token) {
        setStatus("error");
        setErrorMessage("Invalid authentication link");
        return;
      }

      authenticatedRef.current = true;

      try {
        const response = await apiClient.post_auth_telegram_token(
          {
            token,
          },
          {}
        );

        if (response[0] !== 200) {
          setStatus("error");
          setErrorMessage("Authentication failed");
        } else {
          setStatus("success");
          // Refresh auth state
          refreshAuth();
          // Redirect to home after a short delay
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 2000);
        }
      } catch {
        setStatus("error");
        setErrorMessage("Network error. Please check your connection and try again.");
      }
    };

    authenticate();
  }, [token, navigate, refreshAuth]);

  return (
    <div className={styles.callbackContainer}>
      <div className={styles.callbackCard}>
        {status === "loading" && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <h2>Authenticating...</h2>
            <p>Please wait while we verify your authentication.</p>
          </div>
        )}

        {status === "success" && (
          <div className={styles.success}>
            <div className={styles.successIcon}>✅</div>
            <h2>Authentication Successful!</h2>
            <p>Welcome to Language Learn. You will be redirected shortly.</p>
          </div>
        )}

        {status === "error" && (
          <div className={styles.error}>
            <div className={styles.errorIcon}>❌</div>
            <h2>Authentication Failed</h2>
            <p>{errorMessage}</p>
            <Button text="Go to Home" onClick={() => navigate("/", { replace: true })} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
