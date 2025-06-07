// Background script for the Chrome extension

import { apiClient } from "./api/api";

// Constants
const MAX_QUEUE_SIZE = 100;
const AUTH_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
const RETRY_QUEUE_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  // Add a context menu option for selected text
  chrome.contextMenus.create({
    id: "add-to-vocabulary",
    title: "Add '%s' to vocabulary",
    contexts: ["selection"],
  });

  // Initialize storage with default values
  chrome.storage.local.get(
    {
      authState: { authenticated: false, lastCheck: 0 },
      failedWordsQueue: [],
    },
    () => {
      checkAuthStatus();
      updateBadge();
    }
  );
});

// Periodic auth check
setInterval(() => {
  chrome.storage.local.get({ authState: { authenticated: false, lastCheck: 0 } }, (result) => {
    const authState = result.authState as AuthState;
    const now = Date.now();

    // Check if it's been more than AUTH_CHECK_INTERVAL since last check
    if (now - authState.lastCheck > AUTH_CHECK_INTERVAL) {
      checkAuthStatus();
    }
  });
}, AUTH_CHECK_INTERVAL);

// Periodic retry of failed words
setInterval(() => {
  retryFailedQueue();
}, RETRY_QUEUE_INTERVAL);

// Types
interface AuthState {
  authenticated: boolean;
  lastCheck: number;
  user?: unknown;
}

// Check authentication status
async function checkAuthStatus() {
  try {
    const res = await apiClient.get_identity();

    if (res[0] !== 200) {
      updateAuthState(false);
      return;
    }

    const identity = res[1];

    updateAuthState(true, identity);
  } catch (error) {
    console.error("Auth check failed:", error);
    updateAuthState(false);
  }
}

// Update authentication state in storage
function updateAuthState(authenticated: boolean, user?: unknown) {
  const authState: AuthState = {
    authenticated,
    lastCheck: Date.now(),
    user,
  };

  chrome.storage.local.set({ authState }, () => {
    updateBadge();

    // Notify any listeners
    chrome.runtime
      .sendMessage({
        type: "AUTH_STATE_CHANGED",
        authenticated,
        user,
      })
      .catch(() => {
        // Ignore errors if no listeners
      });
  });
}

// Update badge based on current state
function updateBadge() {
  chrome.storage.local.get(
    {
      authState: { authenticated: false, lastCheck: 0 },
      failedWordsQueue: [],
    },
    (result) => {
      const authState = result.authState as AuthState;
      const queue = result.failedWordsQueue as string[];

      if (!authState.authenticated) {
        // Not authenticated - show red badge
        chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
        chrome.action.setBadgeText({ text: "!" });
      } else if (queue.length > 0) {
        // Authenticated but has unsynced words - show yellow badge
        chrome.action.setBadgeBackgroundColor({ color: "#FFA500" });
        chrome.action.setBadgeText({ text: queue.length.toString() });
      } else {
        // All good - no badge
        chrome.action.setBadgeText({ text: "" });
      }
    }
  );
}

// Function to add a word to the failed words queue
function addToFailedQueue(word: string) {
  chrome.storage.local.get({ failedWordsQueue: [] }, (result) => {
    const queue = result.failedWordsQueue as string[];

    // If queue is at max size, remove oldest item
    if (queue.length >= MAX_QUEUE_SIZE) {
      queue.shift();
    }

    queue.push(word);
    chrome.storage.local.set({ failedWordsQueue: queue }, () => {
      console.log(`Word added to failed queue: ${word}`);
      updateBadge();
    });
  });
}

// Retry sending failed words
async function retryFailedQueue() {
  chrome.storage.local.get(
    {
      authState: { authenticated: false, lastCheck: 0 },
      failedWordsQueue: [],
    },
    async (result) => {
      const authState = result.authState as AuthState;
      const queue = result.failedWordsQueue as string[];

      if (!authState.authenticated || queue.length === 0) {
        return;
      }

      console.log(`Retrying ${queue.length} failed words...`);
      const failedWords: string[] = [];

      for (const word of queue) {
        try {
          const res = await apiClient.post_words_add({ word });

          if (res[0] !== 200) {
            throw new Error("Failed to add word");
          }

          console.log(`Successfully sent word: ${word}`);
        } catch (error) {
          console.error(`Failed to send word: ${word}`, error);
          failedWords.push(word);
        }
      }

      chrome.storage.local.set({ failedWordsQueue: failedWords }, () => {
        updateBadge();
      });
    }
  );
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "add-to-vocabulary" && info.selectionText) {
    // Check if authenticated
    const result = await chrome.storage.local.get({
      authState: { authenticated: false, lastCheck: 0 },
    });
    const authState = result.authState as AuthState;

    if (!authState.authenticated) {
      console.log("User not authenticated, adding to queue");
      addToFailedQueue(info.selectionText);
      return;
    }

    try {
      const res = await apiClient.post_words_add({ word: info.selectionText });
      if (res[0] !== 200) {
        throw new Error("Failed to add word");
      }
      console.log(`Word successfully added: ${info.selectionText}`);
    } catch (error) {
      console.error(`Failed to add word: ${info.selectionText}`, error);
      addToFailedQueue(info.selectionText);
    }
  }
});

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === "CHECK_AUTH") {
    chrome.storage.local.get(
      {
        authState: { authenticated: false, lastCheck: 0 },
      },
      async (result) => {
        const authState = result.authState as AuthState;
        const now = Date.now();

        // If cached and recent, use it
        if (authState.lastCheck && now - authState.lastCheck < 5 * 60 * 1000) {
          chrome.runtime.sendMessage({
            type: "CHECK_AUTH_DONE",
            authenticated: authState.authenticated,
            user: authState.user,
          });
          return;
        }

        // Otherwise, check with server
        try {
          const identity = await apiClient.get_identity();

          if ("error" in identity) {
            updateAuthState(false);
            chrome.runtime.sendMessage({
              type: "CHECK_AUTH_DONE",
              authenticated: false,
            });
          } else {
            updateAuthState(true, identity);
            chrome.runtime.sendMessage({
              type: "CHECK_AUTH_DONE",
              authenticated: true,
              user: identity,
            });
          }
        } catch {
          updateAuthState(false);
          chrome.runtime.sendMessage({
            type: "CHECK_AUTH_DONE",
            authenticated: false,
          });
        }
      }
    );

    return true;
  }

  if (message.type === "LOGIN") {
    (async () => {
      try {
        const response = await apiClient.post_auth_telegram_token(
          { token: message.payload },
          {},
          {}
        );

        if (response[0] !== 200) {
          chrome.runtime.sendMessage({
            type: "LOGIN_RESULT",
            success: false,
            error: "Invalid or expired token",
          });
        } else {
          // Login successful, update auth state
          await checkAuthStatus();
          chrome.runtime.sendMessage({ type: "LOGIN_RESULT", success: true });

          // Try to send any queued words
          retryFailedQueue();
        }
      } catch (error: unknown) {
        console.error("Login error:", error);
        chrome.runtime.sendMessage({
          type: "LOGIN_RESULT",
          success: false,
          error: (error as Error).message || "Login failed",
        });
      }
    })();

    return true;
  }

  if (message.type === "GET_QUEUE_STATUS") {
    chrome.storage.local.get({ failedWordsQueue: [] }, (result) => {
      const queue = result.failedWordsQueue as string[];
      sendResponse({ queueSize: queue.length });
    });
    return true;
  }

  // Fixing the `sendText` method issue by using the extendedApiClient
  if (message.type === "SEND_SELECTED_TEXT") {
    (async () => {
      try {
        await apiClient.post_words_add({ word: message.text });
        sendResponse({ success: true });
      } catch (error: unknown) {
        console.error("Error sending selected text:", error);
        addToFailedQueue(message.text);
        sendResponse({ success: false, error: (error as Error).message });
      }
    })();

    // Indicate that the response will be sent asynchronously
    return true;
  }
});
