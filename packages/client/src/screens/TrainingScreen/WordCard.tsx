import React from "react";
import styles from "./WordCard.module.css";

interface WordCardProps {
  word: string;
  level: number;
}

const WordCard: React.FC<WordCardProps> = ({ word, level }) => {
  return (
    <div className={styles.root}>
      <div>
        <h3 className={styles.trainingWordCardText}>{word}</h3>
      </div>
      <div className={styles.learnedLevel}>{level}</div>
    </div>
  );
};

export default WordCard;
