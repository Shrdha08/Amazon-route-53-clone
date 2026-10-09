import type { PropertyFilterProps } from "@cloudscape-design/components";

export const EMPTY_QUERY: PropertyFilterProps.Query = { tokens: [], operation: "and" };

/**
 * Translate a property-filter query into the API's search params: a `Type` token becomes
 * the type filter and the first remaining token (or free text) becomes the `q` search.
 */
export function queryToParams(query: PropertyFilterProps.Query): { q: string; type: string } {
  let type = "";
  let q = "";
  for (const token of query.tokens) {
    const value = String(token.value).trim();
    if (token.propertyKey === "type") type = value.toLowerCase();
    else if (!q) q = value;
  }
  return { q, type };
}

export const FILTER_PLACEHOLDER = "Filter records by property or value";

/** Spread onto PropertyFilter: labels in the console's wording. */
export const filterProps = {
  filteringAriaLabel: "Filter",
  filteringPlaceholder: FILTER_PLACEHOLDER,
  i18nStrings: {
    clearFiltersText: "Clear filters",
    cancelActionText: "Cancel",
    applyActionText: "Apply",
    operationAndText: "and",
    operationOrText: "or",
    operatorsText: "Operators",
    operatorContainsText: "Contains",
    operatorEqualsText: "Equals",
    allPropertiesLabel: "All properties",
    groupValuesText: "Values",
    groupPropertiesText: "Properties",
    removeTokenButtonAriaLabel: (token: { propertyLabel: unknown; value: unknown }) => `Remove token ${token.propertyLabel} ${token.value}`,
    enteredTextLabel: (text: string) => `Use: "${text}"`,
  },
};
