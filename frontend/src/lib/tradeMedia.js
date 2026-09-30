export const MAX_TRADE_SCREENSHOTS = 6;
export const MAX_TRADE_SCREENSHOT_BYTES = 10 * 1024 * 1024;
export const TRADE_SCREENSHOT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const validateTradeScreenshots = (files, existingCount = 0) => {
  const selected = Array.from(files || []);
  if (existingCount + selected.length > MAX_TRADE_SCREENSHOTS) {
    return { files: [], error: `Maximum ${MAX_TRADE_SCREENSHOTS} captures par trade.` };
  }
  const invalidType = selected.find((file) => !TRADE_SCREENSHOT_TYPES.has(file.type));
  if (invalidType) return { files: [], error: "Formats acceptés : JPEG, PNG ou WebP." };
  const oversized = selected.find((file) => file.size > MAX_TRADE_SCREENSHOT_BYTES);
  if (oversized) return { files: [], error: "Chaque capture doit faire 10 Mo maximum." };
  return { files: selected, error: "" };
};

export const isRemoteImageUrl = (value) => /^https?:\/\//i.test(String(value || ""));
