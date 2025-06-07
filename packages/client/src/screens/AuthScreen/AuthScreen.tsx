import React, { useState } from "react";
import styles from "./AuthScreen.module.css";
import { useAuthActions } from "../../hooks/useAuth";
import { apiClient } from "../../api/api";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Input/Input";

const AuthScreen: React.FC = () => {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const { refreshAuth } = useAuthActions();
  const navigate = useNavigate();

  const handleTokenAuth = async () => {
    if (!token) {
      return;
    }

    setStatus("loading");

    try {
      const response = await apiClient.post_auth_telegram_token({ token }, {});
      if (response[0] !== 200) {
        setStatus("error");
        setErrorMessage(response[1].error || "Authentication failed");
        return;
      }

      setStatus("success");
      refreshAuth();
      navigate("/", { replace: true });
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };
  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome to Language Learn</h1>
          <p className={styles.subtitle}>Your personal vocabulary learning companion</p>
        </div>

        <div className={styles.content}>
          <h2 className={styles.authTitle}>Authentication Required</h2>
          <p className={styles.description}>
            To access your vocabulary and start learning, you need to authenticate through our
            Telegram bot.
          </p>

          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3>Open Telegram</h3>
                <p>Launch the Telegram app on your device</p>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3>Find the Language Learn Bot</h3>
                <p>Search for our bot or use the link you received</p>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3>Send /auth Command</h3>
                <p>
                  Type <code className={styles.command}>/auth</code> in the bot chat
                </p>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepContent}>
                <h3>Click the Login Link</h3>
                <p>The bot will send you a secure login link. Click it to authenticate.</p>
              </div>
            </div>
          </div>

          <div className={styles.note}>
            <p>
              <strong>Note:</strong> The login link is valid for 10 minutes and can only be used
              once for security.
            </p>
          </div>
        </div>
        {/* Fallback: paste token if deep links aren’t supported */}
        <div className={styles.tokenContainer}>
          <p className={styles.description}>
            Can’t click the link? Paste your token below to authenticate:
          </p>
          <Input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter authentication token"
          />
          <Button
            text={status === "loading" ? "Authenticating..." : "Authenticate"}
            onClick={handleTokenAuth}
            disabled={status === "loading"}
          />
          {status === "error" && <p className={styles.errorMsg}>{errorMessage}</p>}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
