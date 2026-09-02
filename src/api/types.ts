/**
 * Hand-mirrored from `gotc-server/src/dto/api-types.ts`.
 *
 * DTOs only, no logic. When a zod schema or a DTO changes on the server, update this file
 * in the same session — two local repositories do not justify a published package, but
 * they do require the mirror to be kept honest.
 */

// --- domain vocabulary ------------------------------------------------------

export const ROLES = ['ADMIN', 'FABRIC_TECH', 'GARMENT_TECH', 'PROJECT_MANAGER'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'info',
  'fabrics',
  'operations',
  'master',
  'orders',
  'approve',
  'users'
] as const;
export type Permission = (typeof PERMISSIONS)[number];
export type PermissionMap = Record<Permission, boolean>;

export const POSITIONS = ['NEEDLE', 'UPPER_LOOPER', 'LOWER_LOOPER', 'BOBBIN', 'SPREADER'] as const;
export type PositionName = (typeof POSITIONS)[number];

export const GARMENT_STATUSES = ['Draft', 'In development', 'Approved'] as const;
export type GarmentStatus = (typeof GARMENT_STATUSES)[number];

export const ORDER_STATUSES = [
  'Draft',
  'Pending approval',
  'Approved',
  'Ordered',
  'Rejected'
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ROUNDING_MODES = ['PER_THREAD', 'PER_THREAD_PLUS_SAFETY', 'ORDER_TOTAL'] as const;
export type RoundingMode = (typeof ROUNDING_MODES)[number];

// --- paging -----------------------------------------------------------------

/** Every list endpoint answers in this envelope. */
export interface Paginated<T> {
  items: T[];
  /** Matching the filter, before paging. */
  total: number;
  page: number;
  limit: number;
}

// --- auth -------------------------------------------------------------------

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleLabel: string;
}

export interface SessionResponse {
  user: UserSummary;
  permissions: PermissionMap;
}

// --- users and permissions --------------------------------------------------

export interface UserListItem extends UserSummary {
  active: boolean;
  activity: { created: number; approved: number };
}

export type UserListResponse = Paginated<UserListItem>;

export interface RolePermissionRow {
  role: Role;
  roleLabel: string;
  permissions: PermissionMap;
  userCount: number;
}

// --- threads ----------------------------------------------------------------

export interface ThreadUsage {
  styles: number;
  /** Only present when the request carried `?garmentId=`. */
  operationsOnGarment?: number;
}

export interface ThreadDTO {
  id: string;
  brand: string;
  /** Inverse weight — a higher ticket is a finer thread. */
  ticket: number;
  composition: string;
  colour: string;
  coneYieldM: number;
  unitPrice: number;
  active: boolean;
  usage: ThreadUsage;
}

export type ThreadListResponse = Paginated<ThreadDTO>;

// --- machine types ----------------------------------------------------------

export interface MachinePositionDTO {
  id: string;
  position: PositionName;
  count: number;
  consumptionRatio: number;
}

export interface MachineTypeDTO {
  id: string;
  name: string;
  code: string;
  colour: string;
  positions: MachinePositionDTO[];
  totalThreads: number;
  active: boolean;
}

export type MachineTypeListResponse = Paginated<MachineTypeDTO>;

// --- fabrics ----------------------------------------------------------------

export interface FabricDTO {
  id: string;
  name: string;
  composition: string;
  gsm: number | null;
  colour: string;
  supplier: string;
  usedOn: string[];
}

export type FabricListResponse = Paginated<FabricDTO>;

// --- garments ---------------------------------------------------------------

export interface MachineTypeToken {
  id: string;
  name: string;
  code: string;
  colour: string;
}

export interface GarmentListItem {
  id: string;
  name: string;
  styleNumber: string;
  garmentType: string;
  buyer: string;
  season: string;
  orderQuantity: number;
  status: GarmentStatus;
  operationCount: number;
  machineTypesUsed: MachineTypeToken[];
  /** PER_THREAD preview; null when nothing is assignable. */
  totalCones: number | null;
  orderCount: number;
}

export interface GarmentListResponse extends Paginated<GarmentListItem> {
  /** Operations across the whole filter — the header reads "<n> styles · <n> operations". */
  operationTotal: number;
}

export interface GarmentFabricDTO {
  id: string;
  fabricId: string;
  name: string;
  composition: string;
  gsm: number | null;
  colour: string;
  supplier: string;
  parts: string[];
}

export interface GarmentDTO {
  id: string;
  name: string;
  styleNumber: string;
  garmentType: string;
  buyer: string;
  season: string;
  orderQuantity: number;
  sizeRange: string;
  status: GarmentStatus;
  wastagePercent: number;
  description: string;
  fabrics: GarmentFabricDTO[];
  createdAt: string;
  updatedAt: string;
}

/** `POST /garments` and `POST /garments/:id/duplicate` add these to the garment. */
export interface CreatedGarmentDTO extends GarmentDTO {
  operationsCopied: number;
  sourceStyleNumber?: string;
}

export interface NextStyleNumberResponse {
  styleNumber: string;
}

// --- the calculation --------------------------------------------------------

export interface ThreadConsumer {
  operationId: string;
  sequence: number;
  operationName: string;
  /** Upper and lower loopers both report as LOOPER. */
  position: string;
  metres: number;
}

export interface CalculationThread {
  threadId: string;
  brand: string;
  ticket: number;
  composition: string;
  colour: string;
  coneYieldM: number;
  metresPerGarment: number;
  metresOrder: number;
  metresWithWastage: number;
  rawCones: number;
  cones: number;
  consumers: ThreadConsumer[];
}

export interface CalculationOperation {
  id: string;
  sequence: number;
  name: string;
  operationMetres: number;
  isComplete: boolean;
  threadSummary: string;
}

export interface IncompleteOperationRef {
  id: string;
  sequence: number;
  name: string;
}

export interface CalculationDTO {
  quantity: number;
  wastagePercent: number;
  roundingMode: RoundingMode;
  totalMetres: number;
  totalCones: number;
  threadCount: number;
  operationCount: number;
  machineChangeovers: number;
  machineTypesUsed: MachineTypeToken[];
  canCreateOrder: boolean;
  incompleteOperations: IncompleteOperationRef[];
  threads: CalculationThread[];
  operations: CalculationOperation[];
}

// --- operations -------------------------------------------------------------

export interface OperationPositionDTO extends MachinePositionDTO {
  threadId: string | null;
  metresPerGarment: number;
}

export interface OperationDTO {
  id: string;
  garmentId: string;
  sequence: number;
  name: string;
  machineTypeId: string | null;
  machineTypeName: string | null;
  machineTypeCode: string | null;
  machineTypeColour: string | null;
  seamLengthCm: number;
  notes: string;
  isComplete: boolean;
  operationMetres: number;
  threadSummary: string;
  positions: OperationPositionDTO[];
}

// --- cone orders ------------------------------------------------------------

export interface OrderLineDTO {
  threadId: string;
  brand: string;
  ticket: number;
  composition: string;
  colour: string;
  coneYieldM: number;
  metresPerGarment: number;
  metresOrder: number;
  metresWithWastage: number;
  rawCones: number;
  cones: number;
}

export interface OrderRowDTO {
  sequence: number;
  name: string;
  machineName: string;
  cells: string[];
}

export interface OrderListItem {
  id: string;
  code: string;
  garmentId: string;
  styleNumber: string;
  garmentName: string;
  buyer: string;
  quantity: number;
  wastagePercent: number;
  roundingMode: RoundingMode;
  status: OrderStatus;
  totalMetres: number;
  totalCones: number;
  createdByName: string;
  createdAt: string;
  approvedByName: string | null;
  approvedAt: string | null;
  note: string;
}

export interface OrderDTO extends OrderListItem {
  lines: OrderLineDTO[];
  rows: OrderRowDTO[];
  /** The widest row — how many THREAD VARIETY columns the sheet prints. */
  maxCells: number;
}

export type OrderStatusCounts = Record<'All' | OrderStatus, number>;

export interface OrderListResponse {
  items: OrderListItem[];
  total: number;
  page: number;
  limit: number;
  counts: OrderStatusCounts;
  totals: { cones: number; orders: number };
}

// --- errors -----------------------------------------------------------------

export const ERROR_CODES = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'IN_USE',
  'DUPLICATE',
  'INVALID_TRANSITION',
  'LAST_ADMIN',
  'ADMIN_PERMISSIONS_FIXED',
  'INCOMPLETE_OPERATIONS',
  'INTERNAL'
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}
