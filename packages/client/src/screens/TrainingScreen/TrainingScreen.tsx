import { useQuery } from "@tanstack/react-query";
import TrainingView from "./TrainingView";
import { apiClient } from "../../api/api";
import styles from "./TrainingScreen.module.css";

export default function TrainingScreen() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["training-set"],
    queryFn: async () => {
      const res = await apiClient.get_training_set();

      if (res[0] !== 200) {
        throw new Error(res[1].error);
      }

      return res[1];
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (isLoading) {
    return <div className={styles.loadingContainer}>Loading...</div>;
  }

  if (isError || !data || !Array.isArray(data.trainingSet) || data.trainingSet.length === 0) {
    return <div className={styles.errorContainer}>No words to train.</div>;
  }

  return <TrainingView trainingData={data} />;
}
