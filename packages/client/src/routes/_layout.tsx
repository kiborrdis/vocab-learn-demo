import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import styles from "./Layout.module.css";
import { Button } from "../components/Button/Button";

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const renderNavBar = () => {
    return (
      <div className={styles.navbar}>
        <div className={styles.backContainer}>
          {location.pathname === "/training" && (
            <Button text="<-" variant="text" color="accent" onClick={() => navigate(-1)} />
          )}
        </div>
        <div className={styles.navbarContent}>
          <span className={styles.appName}>Language Learn</span>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.layoutContainer}>
      {renderNavBar()}
      <ProtectedRoute>
        <Outlet />
      </ProtectedRoute>
    </div>
  );
};

export default Layout;
