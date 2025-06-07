import React from "react";
import styles from "./TrainingResultsScreen.module.css";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/Button/Button";

interface TrainingResultsScreenProps {
  rememberedCount: number;
  notRememberedCount: number;
}

const TrainingResultsScreen: React.FC<TrainingResultsScreenProps> = ({
  rememberedCount,
  notRememberedCount,
}) => {
  const navigate = useNavigate();

  return (
    <div className={styles.resultsContainer}>
      <h1 className={styles.title}>Training Results</h1>
      <div className={styles.statisticsContainer}>
        <div className={styles.statisticItem}>
          <h2 className={styles.statisticNumber}>{rememberedCount}</h2>
          <p className={styles.statisticLabel}>Remembered</p>
        </div>
        <div className={styles.statisticItem}>
          <h2 className={styles.statisticNumber}>{notRememberedCount}</h2>
          <p className={styles.statisticLabel}>Not Remembered</p>
        </div>
      </div>
      <div className={styles.buttonContainer}>
        <Button
          text="Start New Training"
          size="m"
          color="accent"
          onClick={() => window.location.reload()}
        />
        <Button text="Return to Main Screen" size="m" onClick={() => navigate("/")} />
      </div>
    </div>
  );
};

export default TrainingResultsScreen;
