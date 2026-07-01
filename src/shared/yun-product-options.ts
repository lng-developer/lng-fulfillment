export const YUN_PRODUCT_OPTIONS = [
  {
    eName: "Paper napkins",
    cName: "餐巾纸",
    keywords: ["napkin", "napkins"],
  },
  {
    eName: "Wooden decor",
    cName: "木制装饰品",
    keywords: ["wood", "wooden", "decor"],
  },
  {
    eName: "Embroidered shirt",
    cName: "刺绣衬衫",
    keywords: ["embroidered", "embroidery", "shirt", "tee", "t-shirt", "top"],
  },
] as const;

export function chooseYunProductOption(value: string) {
  const normalized = value.toLowerCase();
  return (
    YUN_PRODUCT_OPTIONS.find((option) =>
      option.keywords.some((keyword) => normalized.includes(keyword)),
    ) ?? YUN_PRODUCT_OPTIONS[2]
  );
}
