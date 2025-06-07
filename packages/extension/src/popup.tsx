/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import styles from "./popup.module.css";

const Authentication = ({ onAuthCheck }: { onAuthCheck: () => void }) => {
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasteAndLogin = async () => {
    setIsLoading(true);
    setLoginError(null);

    try {
      const text = await navigator.clipboard.readText();

      const handleLoginResult = (message: any) => {
        if (message.type === "LOGIN_RESULT") {
          setIsLoading(false);

          if (message.success) {
            onAuthCheck(); // Trigger auth check callback upon successful login
          } else {
            setLoginError(message.error || "Invalid or expired token. Please try again.");
          }
          chrome.runtime.onMessage.removeListener(handleLoginResult);
        }
      };

      chrome.runtime.onMessage.addListener(handleLoginResult);
      chrome.runtime.sendMessage({ type: "LOGIN", payload: text });
    } catch (error) {
      setIsLoading(false);
      setLoginError(
        "Failed to read clipboard contents. Please make sure you have copied the token."
      );
      console.error("Failed to read clipboard contents:", error);
    }
  };

  return (
    <div className={styles.authSectionContainer}>
      <div className={styles.instructionBox}>
        <strong className={styles.instructionTitle}>To authenticate:</strong>
        <ol className={styles.instructionList}>
          <li>Send /auth to bot</li>
          <li>Copy the token</li>
          <li>Click button below</li>
        </ol>
      </div>

      <button onClick={handlePasteAndLogin} disabled={isLoading} className={styles.button}>
        {isLoading ? "Logging in..." : "Paste & Login"}
      </button>

      {loginError && <p className={styles.errorText}>{loginError}</p>}
    </div>
  );
};

const PopupContent = () => {
  const [authStatus, setAuthStatus] = useState<{ authenticated: boolean; user?: unknown } | null>(
    null
  );
  const [queueSize, setQueueSize] = useState<number>(0);

  const checkAuth = () => {
    const timeoutId = setTimeout(() => {
      setAuthStatus({ authenticated: false }); // Set default status if no response is received
      chrome.runtime.onMessage.removeListener(handleAuthMessage);
    }, 5000);

    const handleAuthMessage = (message: any) => {
      if (message.type === "CHECK_AUTH_DONE") {
        clearTimeout(timeoutId);
        setAuthStatus(message);
        chrome.runtime.onMessage.removeListener(handleAuthMessage);
      }
    };

    chrome.runtime.onMessage.addListener(handleAuthMessage);
    chrome.runtime.sendMessage({ type: "CHECK_AUTH" });

    return () => {
      clearTimeout(timeoutId);
      chrome.runtime.onMessage.removeListener(handleAuthMessage);
    };
  };

  const checkQueueStatus = () => {
    chrome.runtime.sendMessage({ type: "GET_QUEUE_STATUS" }, (response) => {
      if (response) {
        setQueueSize(response.queueSize);
      }
    });
  };

  useEffect(() => {
    checkAuth();
    checkQueueStatus();

    // Listen for auth state changes
    const handleAuthStateChange = (message: any) => {
      if (message.type === "AUTH_STATE_CHANGED") {
        setAuthStatus({
          authenticated: message.authenticated,
          user: message.user,
        });
      }
    };

    chrome.runtime.onMessage.addListener(handleAuthStateChange);

    // Periodically check queue status
    const interval = setInterval(checkQueueStatus, 5000);

    return () => {
      chrome.runtime.onMessage.removeListener(handleAuthStateChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Language Learn</h1>

      {authStatus === null ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Checking...</p>
        </div>
      ) : authStatus.authenticated ? (
        <div>
          <div className={styles.authenticatedBox}>
            <p className={styles.authenticatedText}>✓ Authenticated</p>
          </div>

          {queueSize > 0 && (
            <div className={styles.queueBox}>
              <p className={styles.queueText}>
                ⚠ {queueSize} word{queueSize !== 1 ? "s" : ""} syncing
              </p>
            </div>
          )}

          <div className={styles.infoBox}>
            <p className={styles.infoText}>
              <strong>Tip:</strong> Right-click text on any page and select "Add to vocabulary".
            </p>
          </div>
        </div>
      ) : (
        <div>
          <p className={styles.notAuthenticatedText}>Not authenticated</p>
          <Authentication onAuthCheck={checkAuth} />
        </div>
      )}
    </div>
  );
};

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <PopupContent />
  </React.StrictMode>
);
