/** The query keys listed in the handoff README.md §State management. */
export const queryKeys = {
  session: ['session'] as const,
  users: (page = 1, search = '', limit = 25) => ['users', page, search, limit] as const,
  allUsers: ['users'] as const,
  permissions: ['permissions'] as const,
  threads: (page = 1, search = '', limit = 25, garmentId = '') =>
    ['threads', page, search, limit, garmentId] as const,
  allThreads: ['threads'] as const,
  machineTypes: (page = 1, search = '', limit = 25) =>
    ['machineTypes', page, search, limit] as const,
  allMachineTypes: ['machineTypes'] as const,
  fabrics: (page = 1, search = '', limit = 25) => ['fabrics', page, search, limit] as const,
  allFabrics: ['fabrics'] as const,
  /** Page and search are part of the key, so each page caches on its own. */
  garments: (page = 1, search = '', limit = 25) => ['garments', page, search, limit] as const,
  /** Prefix for invalidating every page at once after a mutation. */
  allGarments: ['garments'] as const,
  garment: (id: string) => ['garment', id] as const,
  garmentCalculation: (id: string) => ['garmentCalculation', id] as const,
  /**
   * Prefix for every garment's calculation. Master data is shared, so changing a cone yield
   * or a consumption ratio can move a number on any garment, not just the one on screen.
   */
  allCalculations: ['garmentCalculation'] as const,
  nextStyleNumber: ['nextStyleNumber'] as const,
  operations: (garmentId: string) => ['operations', garmentId] as const,
  orders: (status: string, search: string, page = 1) => ['orders', status, search, page] as const,
  allOrders: ['orders'] as const,
  order: (id: string) => ['order', id] as const
};
