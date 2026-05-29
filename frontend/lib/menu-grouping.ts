import type { Category, MenuItem } from './data'

export interface CategoryGroup {
  category: Category
  items: MenuItem[]
}

/** Match dish.category_id to category.id (both normalized as strings). */
export function dishBelongsToCategory(item: MenuItem, category: Category): boolean {
  return String(item.category_id) === String(category.id)
}

/**
 * Group dishes under categories from the backend.
 * Only categories present in `categories` are used for section titles.
 */
export function groupItemsByCategory(
  categories: Category[],
  items: MenuItem[],
  options?: {
    hiddenCategoryIds?: Set<string>
    /** When true (default), omit sections with no dishes */
    hideEmpty?: boolean
  }
): CategoryGroup[] {
  const hidden = options?.hiddenCategoryIds
  const visible = hidden
    ? categories.filter((c) => !hidden.has(c.id))
    : categories

  const groups: CategoryGroup[] = visible.map((category) => ({
    category,
    items: items.filter((item) => dishBelongsToCategory(item, category)),
  }))

  if (options?.hideEmpty === false) {
    return groups
  }
  return groups.filter((g) => g.items.length > 0)
}
