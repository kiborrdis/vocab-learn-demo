import React, { useState } from "react";
import styles from "./ChallengeCard.module.css";
import { Input } from "../../components/Input/Input";
import type { UserDefinition } from "./DefinitionsPanel";

interface ChallengeCardProps {
  definitions: UserDefinition[];
  level: number;
  onAnswer: (userInput: string) => void;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({ definitions, level, onAnswer }) => {
  const [userInput, setUserInput] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);
    onAnswer(value);
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.inputContainer}>
          <Input
            value={userInput}
            onChange={handleInputChange}
            placeholder="Type the word that matches these definitions..."
          />
        </div>
        <div className={styles.learnedLevel}>{level}</div>
      </div>

      <div className={styles.definitionsContainer}>
        {definitions.map((definition: UserDefinition, i) => (
          <div key={i} className={styles.definitionGroup}>
            <h4 className={styles.definitionDictName}>{definition.name}</h4>
            {definition.data.meanings.map((meaning, idx: number) => (
              <div key={idx} className={styles.meaning}>
                <strong className={styles.partOfSpeech}>{meaning.partOfSpeech}</strong>
                <ul className={styles.definitionsList}>
                  {meaning.definitions.map(
                    (def: { definition: string; example?: string }, dIdx: number) => (
                      <li key={dIdx} className={styles.definitionItem}>
                        {def.definition}
                      </li>
                    )
                  )}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChallengeCard;
