export const cl = (...classes: (string | Record<string, boolean>)[]): string => {
  return classes
    .reduce<string[]>((acc, curr) => {
      if (typeof curr === "string") {
        acc.push(curr);
      } else {
        Object.entries(curr).forEach(([key, value]) => {
          if (value) {
            acc.push(key);
          }
        });
      }

      return acc;
    }, [])
    .join(" ");
};
