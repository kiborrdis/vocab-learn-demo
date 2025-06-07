import styles from "./ColorScreen.module.css";

export const ColorScreen = ({ color }: { color: "success" | "error" }) => {
  return <div className={styles.root + " " + styles[color]} />;
};

export default ColorScreen;
