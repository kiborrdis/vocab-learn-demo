import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "../../hooks/useAuth";
import styles from "./IndexScreen.module.css";
import { apiClient } from "../../api/api";
import { Button } from "../../components/Button/Button";

const IndexScreen: React.FC = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuthActions();

  const { data, isLoading, error } = useQuery({
    queryKey: ["vocabularyCount"],
    queryFn: async (): Promise<number> => {
      try {
        const result = await apiClient.get_vocabulary_count();

        if (result[0] !== 200) {
          throw new Error(result[1].error || "Failed to fetch vocabulary count");
        }

        return result[1].count;
      } catch (err) {
        // If it's an auth error, clear the auth state
        if (err instanceof Error && err.message.includes("401")) {
          clearAuth();
        }
        throw err;
      }
    },
  });

  if (error) {
    return (
      <div className={styles.indexContainer}>
        <div className={styles.errorContainer}>
          <h2>Unable to load vocabulary</h2>
          <p>Please try refreshing the page or authenticate again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.indexContainer}>
      <div className={styles.wordCountContainer}>
        <h1 className={styles.wordCount}>{isLoading ? "..." : (data ?? 0)}</h1>
        <p className={styles.wordCountLabel}>Words in your vocabulary</p>
      </div>
      <Button
        text="Start Training"
        disabled={isLoading}
        size="l"
        color="accent"
        onClick={() => navigate("/training")}
      />
    </div>
  );
};

export default IndexScreen;
