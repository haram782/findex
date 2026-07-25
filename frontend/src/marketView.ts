export function formatSelectionTitle(speciesNames: string[]): string {
  const uniqueNames = [...new Set(speciesNames)];
  if (uniqueNames.length === 0) {
    return "어종을 선택하세요";
  }
  if (uniqueNames.length <= 2) {
    return uniqueNames.join(", ");
  }
  return `${uniqueNames[0]} 외 ${uniqueNames.length - 1}`;
}
