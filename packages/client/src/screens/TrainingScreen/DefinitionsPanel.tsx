import React from "react";
import styles from "./DefinitionsPanel.module.css";
import { Button } from "../../components/Button/Button";

export type Meaning = {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
};

export type DefinitionData = {
  word: string;
  meanings: Meaning[];
};

export type UserDefinition = {
  name: string;
  data: DefinitionData;
};

interface DefinitionsPanelProps {
  definitions: UserDefinition[];
  isVisible: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const DefinitionsPanel: React.FC<DefinitionsPanelProps> = ({ definitions, onClose, onUpdate }) => {
  return (
    <div
      className={`${styles.definitionContainer} ${styles.scrollable} ${styles.definitionBackground}`}
      style={{
        height: "100%",
      }}
    >
      <div className={styles.definitionHeader}>
        <h3>Definitions</h3>
        <Button text="Close" variant="text" color="accent" onClick={onClose} />
        <Button text="Update" variant="text" color="accent" onClick={onUpdate} />
      </div>
      {definitions.map((definition: UserDefinition, i) => (
        <div key={i}>
          <h4 className={styles.definitionDictName}>{definition.name}</h4>
          {definition.data.meanings.map((meaning: Meaning, idx: number) => (
            <div key={idx}>
              <strong>{meaning.partOfSpeech}</strong>
              <ul>
                {meaning.definitions.map(
                  (def: { definition: string; example?: string }, dIdx: number) => (
                    <li key={dIdx}>
                      {def.definition}
                      {def.example && <em> (e.g., {def.example})</em>}
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default DefinitionsPanel;
