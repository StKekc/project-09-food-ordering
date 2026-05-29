import { reorder as reorderList } from '@hello-pangea/dnd'
import type { Category, MenuItem } from './data'
import type { CategoryGroup } from './menu-grouping'

export type FlatEntry =
  | { kind: 'category'; id: string }
  | { kind: 'item'; id: string }

export type DropTarget = {
  kind: 'category' | 'item'
  id: string
  position: 'before' | 'after'
}

export function buildFlatList(
  groupedItems: { category: Category; items: MenuItem[] }[]
): FlatEntry[] {
  const flat: FlatEntry[] = []
  for (const group of groupedItems) {
    flat.push({ kind: 'category', id: group.category.id })
    for (const item of group.items) {
      flat.push({ kind: 'item', id: item.id })
    }
  }
  return flat
}

export function getDropPosition(e: React.DragEvent): 'before' | 'after' {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  return e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

function findCategoryBlockEnd(flat: FlatEntry[], categoryIndex: number): number {
  let end = categoryIndex + 1
  while (end < flat.length && flat[end].kind === 'item') end++
  return end
}

function findInsertIndex(flat: FlatEntry[], target: DropTarget): number {
  const targetIndex = flat.findIndex(
    e => e.kind === target.kind && e.id === target.id
  )
  if (targetIndex === -1) return -1

  if (target.kind === 'category') {
    return target.position === 'before'
      ? targetIndex
      : findCategoryBlockEnd(flat, targetIndex)
  }

  return target.position === 'before' ? targetIndex : targetIndex + 1
}

function moveCategoryBlock(
  flat: FlatEntry[],
  draggedCategoryId: string,
  target: DropTarget
): FlatEntry[] {
  const start = flat.findIndex(
    e => e.kind === 'category' && e.id === draggedCategoryId
  )
  if (start === -1) return flat

  const end = findCategoryBlockEnd(flat, start)
  const block = flat.slice(start, end)
  const without = [...flat.slice(0, start), ...flat.slice(end)]

  const insertAt = findInsertIndex(without, target)
  if (insertAt === -1) return flat

  without.splice(insertAt, 0, ...block)
  return without
}

function moveItem(flat: FlatEntry[], draggedItemId: string, target: DropTarget): FlatEntry[] {
  const fromIndex = flat.findIndex(
    e => e.kind === 'item' && e.id === draggedItemId
  )
  if (fromIndex === -1) return flat

  const result = [...flat]
  const [removed] = result.splice(fromIndex, 1)

  const insertAt = findInsertIndex(result, target)
  if (insertAt === -1) return flat

  result.splice(insertAt, 0, removed)
  return result
}

export function reorderFlatList(
  flat: FlatEntry[],
  dragged: { type: 'category' | 'item'; id: string },
  target: DropTarget
): FlatEntry[] {
  if (dragged.type === 'category' && target.kind === 'item') {
    return flat
  }

  if (dragged.type === 'category') {
    return moveCategoryBlock(flat, dragged.id, target)
  }

  return moveItem(flat, dragged.id, target)
}

export function flatToLayout(
  flat: FlatEntry[],
  categories: Category[],
  menuItems: MenuItem[]
) {
  const categoryById = new Map(categories.map(c => [c.id, c]))
  const itemById = new Map(menuItems.map(i => [i.id, i]))

  const orderedCategoryIds = flat
    .filter((e): e is { kind: 'category'; id: string } => e.kind === 'category')
    .map(e => e.id)
    .filter(id => categoryById.has(id))

  const orderedItems: { id: string; categoryId: string }[] = []
  let currentCategoryId = categories[0]?.id ?? ''

  for (const entry of flat) {
    if (entry.kind === 'category') {
      const cat = categoryById.get(entry.id)
      if (cat) currentCategoryId = cat.id
    } else {
      if (itemById.has(entry.id)) {
        orderedItems.push({ id: entry.id, categoryId: currentCategoryId })
      }
    }
  }

  return { orderedCategoryIds, orderedItems }
}

export function layoutFromGroups(groups: CategoryGroup[]) {
  return {
    orderedCategoryIds: groups.map((g) => g.category.id),
    orderedItems: groups.flatMap((g) =>
      g.items.map((item) => ({ id: item.id, categoryId: g.category.id }))
    ),
  }
}

export function reorderCategoryGroups(
  groups: CategoryGroup[],
  sourceIndex: number,
  destinationIndex: number
): CategoryGroup[] {
  return reorderList(groups, sourceIndex, destinationIndex)
}

export function moveItemInGroups(
  groups: CategoryGroup[],
  source: { droppableId: string; index: number },
  destination: { droppableId: string; index: number }
): CategoryGroup[] {
  const sourceCategoryId = source.droppableId.replace(/^items-/, '')
  const destCategoryId = destination.droppableId.replace(/^items-/, '')

  const next = groups.map((g) => ({ ...g, items: [...g.items] }))
  const sourceGroup = next.find((g) => g.category.id === sourceCategoryId)
  const destGroup = next.find((g) => g.category.id === destCategoryId)
  if (!sourceGroup || !destGroup) return groups

  const [moved] = sourceGroup.items.splice(source.index, 1)
  if (!moved) return groups

  destGroup.items.splice(destination.index, 0, {
    ...moved,
    category_id: destCategoryId,
  })
  return next
}
