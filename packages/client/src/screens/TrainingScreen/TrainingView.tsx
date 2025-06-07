import { useState } from "react";
import styles from "./TrainingView.module.css";
import WordCard from "./WordCard";
import ChallengeCard from "./ChallengeCard";
import SwipeSlider from "./SwipeSlider";
import DefinitionsPanel from "./DefinitionsPanel";
import DragUpPanel from "./DragUpPanel";
import TrainingResultsScreen from "./TrainingResultsScreen";
import { apiClient } from "../../api/api";
import type { SwipeDirection } from "./SwipeSlider";
import type { UserDefinition } from "./DefinitionsPanel";
import ColorScreen from "./ColorScreen";

// swipe thresholds
const SWIPE_THRESHOLD = 100;
const DEFINITION_SWIPE_THRESHOLD = 50;

// mastery threshold (should match server-side constant)
const MASTERED_THRESHOLD = 3;

interface TrainingItem {
  userWordId: number;
  lemma: string;
  learnedScore: number;
  definitions: UserDefinition[];
}

interface TrainingSetResponse {
  trainingSet: TrainingItem[];
}

interface TrainingViewProps {
  trainingData: TrainingSetResponse;
}

export default function TrainingView({ trainingData }: TrainingViewProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState({ remembered: 0, notRemembered: 0 });
  const [showDefinition, setShowDefinition] = useState(false);
  const [updatedDefinitions, setUpdatedDefinitions] = useState<Record<number, UserDefinition[]>>(
    {}
  );

  const handleSlideComplete = (_: SwipeDirection, remembered: boolean) => {
    const currentWord = trainingSet[currentIdx];
    if (!currentWord) {
      return;
    }

    apiClient.post_training_set_mark({
      remembered,
      userWordId: currentWord.userWordId,
    });

    setResults((prevResults) => ({
      remembered: prevResults.remembered + (remembered ? 1 : 0),
      notRemembered: prevResults.notRemembered + (remembered ? 0 : 1),
    }));

    setCurrentIdx((prev) => prev + 1);
    setShowDefinition(false);
  };

  const handleUpdateDefinitions = async () => {
    const current = trainingSet[currentIdx];
    if (!current) {
      return;
    }
    const userWordId = current.userWordId;
    try {
      const resp = await apiClient.post_definitions_update({
        userWordId,
      });
      if ("definitions" in resp && resp.definitions && Array.isArray(resp.definitions)) {
        const defs = resp.definitions.map((def) => ({
          ...def,
          // Add any additional properties or modifications here
        }));
        // Update the definitions in the state
        setUpdatedDefinitions((prev) => ({ ...prev, [userWordId]: defs }));
      }
    } catch (err) {
      console.error("Failed to update definitions", err);
    }
  };

  const trainingSet = trainingData.trainingSet;
  const word = trainingSet[currentIdx];
  const nextWord = trainingSet[currentIdx + 1];

  if (!word) {
    return (
      <TrainingResultsScreen
        rememberedCount={results.remembered}
        notRememberedCount={results.notRemembered}
      />
    );
  }

  const currentWordChallenge =
    word.learnedScore >= MASTERED_THRESHOLD ? (
      <MasteredWordChallenge
        key={word.lemma}
        learnedScore={word.learnedScore}
        definitions={updatedDefinitions[word.userWordId] ?? word.definitions}
        expectedWord={word.lemma}
      />
    ) : (
      <NonMasteredWordChallenge word={word.lemma} learnedScore={word.learnedScore} />
    );

  return (
    <div className={styles.trainingContainer}>
      <SwipeSlider onSlideComplete={handleSlideComplete} swipeThreshold={SWIPE_THRESHOLD}>
        <NextWordChallenge item={nextWord} updatedDefinitions={updatedDefinitions} />
        {currentWordChallenge}
      </SwipeSlider>

      <DragUpPanel
        isVisible={showDefinition}
        onVisibilityChange={setShowDefinition}
        dragThreshold={DEFINITION_SWIPE_THRESHOLD}
      >
        <DefinitionsPanel
          definitions={updatedDefinitions[word.userWordId] ?? word.definitions}
          isVisible={showDefinition}
          onClose={() => setShowDefinition(false)}
          onUpdate={handleUpdateDefinitions}
        />
      </DragUpPanel>
    </div>
  );
}

const MasteredWordChallenge = ({
  learnedScore,
  definitions,
  expectedWord,
}: {
  learnedScore: number;
  definitions: UserDefinition[];
  expectedWord: string;
}) => {
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);

  const handleChallengeAnswer = (userInput: string) => {
    const isCorrect = userInput.toLowerCase().trim() === expectedWord.toLowerCase().trim();
    setIsCorrectAnswer(isCorrect);
  };

  return (
    <>
      <SwipeSlider.TransitionContentLeft value={isCorrectAnswer}>
        <ColorScreen color={isCorrectAnswer ? "success" : "error"} />
      </SwipeSlider.TransitionContentLeft>
      <SwipeSlider.TransitionContentRight value={isCorrectAnswer}>
        <ColorScreen color={isCorrectAnswer ? "success" : "error"} />
      </SwipeSlider.TransitionContentRight>
      <SwipeSlider.CurrentContent>
        <ChallengeCard
          definitions={definitions}
          level={learnedScore}
          onAnswer={handleChallengeAnswer}
        />
      </SwipeSlider.CurrentContent>
    </>
  );
};

const NonMasteredWordChallenge = ({
  word,
  learnedScore,
}: {
  word: string;
  learnedScore: number;
}) => {
  return (
    <>
      <SwipeSlider.TransitionContentLeft value={false}>
        <ColorScreen color="error" />
      </SwipeSlider.TransitionContentLeft>
      <SwipeSlider.TransitionContentRight value={true}>
        <ColorScreen color="success" />
      </SwipeSlider.TransitionContentRight>
      <SwipeSlider.CurrentContent>
        <WordCard word={word} level={learnedScore} />
      </SwipeSlider.CurrentContent>
    </>
  );
};

const NextWordChallenge = ({
  item,
  updatedDefinitions,
}: {
  item: TrainingItem | null;
  updatedDefinitions: Record<number, UserDefinition[]>;
}) => {
  let content = null;

  if (item) {
    const isMasteredWord = item.learnedScore >= MASTERED_THRESHOLD;

    if (isMasteredWord) {
      // Show challenge card for mastered words
      content = (
        <ChallengeCard
          definitions={updatedDefinitions[item.userWordId] ?? item.definitions}
          level={item.learnedScore}
          onAnswer={() => {}} // Empty handler for next word preview
        />
      );
    } else {
      // Show normal word card for non-mastered words
      content = <WordCard word={item.lemma} level={item.learnedScore} />;
    }
  } else {
    content = <div className={styles.noMoreWords}>No more words</div>;
  }

  return (
    <>
      <SwipeSlider.NextContentLeft>{content}</SwipeSlider.NextContentLeft>
      <SwipeSlider.NextContentRight>{content}</SwipeSlider.NextContentRight>
    </>
  );
};
