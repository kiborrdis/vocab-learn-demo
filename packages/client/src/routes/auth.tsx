import React from "react";
import AuthScreen from "../screens/AuthScreen/AuthScreen";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const AuthRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
          fontSize: "18px",
          color: "var(--subtle-text-color)",
          backgroundColor: "var(--background-color)",
        }}
      >
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <AuthScreen />;
};

export default AuthRoute;
