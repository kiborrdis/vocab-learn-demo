import type { ChangeEventHandler } from "react";
import styles from "./Input.module.css";
import { cl } from "../../utils";

export const Input = ({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: "text" | "email" | "password";
  disabled?: boolean;
}) => {
  return (
    <input
      className={cl(styles.root)}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};
