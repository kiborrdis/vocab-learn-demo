# Chrome Extension Complementing App and Server

Small Chrome extension that complements the main app and server by providing ability to quickly add words to the user's vocabulary 

## Features

- **Authentication**: Users can authenticate through the extension popup using a token received from the Telegram bot.
- **Popup Behavior**: 
  - If the user is authenticated, the popup displays a message confirming authentication.
  - If the user is not authenticated, the popup provides instructions on how to acquire an authentication token and includes a "Paste & Login" button to initiate the login process. During authentication, a loader replaces the button.
- **Context Menu Integration**: Adds a context menu option for selected text, allowing users to send a selected word or phrase to the server to add it to their vocabulary.
- **Offline and Unauthenticated Handling**: 
  - If the user is not authenticated or lacks an internet connection, the extension queues words to be sent later.
- **Badge Indicators**: 
  - Displays a badge on the popup icon if the user is not authenticated.
  - Displays a badge if the user is authenticated but the data is not synced.

### Non-Functional Requirements

- **Efficient Authentication Checks**: 
  - The extension should minimize frequent authentication checks. The result of the authentication status should be cached in the extension's storage.
  - If a request fails due to the user being unauthenticated, the cached authentication state should be updated.
  - Periodic checks can be implemented to verify the authentication status.

### Error Handling

- **Invalid Token Handling**: If the authentication token is invalid or expired, the extension should notify the user and provide an option to re-authenticate. A message should be displayed below the login button.
- **Queue Management**: If the queue of offline words exceeds a certain limit, the oldest item in the queue should be replaced with the new one.
