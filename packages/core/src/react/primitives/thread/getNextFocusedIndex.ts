export type GetNextFocusedIndexArgs = {
  key: string;
  current: number | null;
  length: number;
  pageSize?: number | undefined;
};

export const getNextFocusedIndex = ({
  key,
  current,
  length,
  pageSize = 5,
}: GetNextFocusedIndexArgs): number | null => {
  if (length <= 0) return null;

  const clamp = (index: number) => {
    if (index < 0) return 0;
    if (index > length - 1) return length - 1;
    return index;
  };

  const cur = current ?? length - 1;

  switch (key) {
    case "ArrowUp":
      return clamp(cur - 1);
    case "ArrowDown":
      return clamp(cur + 1);
    case "Home":
      return 0;
    case "End":
      return length - 1;
    case "PageUp":
      return clamp(cur - pageSize);
    case "PageDown":
      return clamp(cur + pageSize);
    default:
      return null;
  }
};
