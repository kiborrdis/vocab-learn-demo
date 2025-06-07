import type { MouseEventHandler, ReactNode } from "react";
import styles from "./Button.module.css";
import { cl } from "../../utils";

export const Button = ({
  disabled,
  text,
  onClick,
  color = "default",
  size = "m",
  variant = "regular",
}: {
  onClick?: MouseEventHandler;
  disabled?: boolean;
  text: ReactNode;
  color?: "accent" | "default";
  variant?: "regular" | "text";
  size?: "m" | "l";
}) => {
  return (
    <button
      className={cl(styles.root, styles[color], styles["size-" + size], styles[variant])}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
};
