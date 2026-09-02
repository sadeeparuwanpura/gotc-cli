import { api, query } from './client';
import type {
  CalculationDTO,
  CreatedGarmentDTO,
  FabricDTO,
  FabricListResponse,
  GarmentDTO,
  GarmentListResponse,
  MachineTypeDTO,
  MachineTypeListResponse,
  NextStyleNumberResponse,
  OperationDTO,
  OrderDTO,
  OrderListResponse,
  Role,
  RolePermissionRow,
  RoundingMode,
  SessionResponse,
  ThreadDTO,
  ThreadListResponse,
  UserListItem,
  UserListResponse
} from './types';

/** Every call the screens make, in one place. Thin wrappers — no logic. */

// --- auth -------------------------------------------------------------------

export const login = (email: string, password: string): Promise<SessionResponse> =>
  api.post<SessionResponse>('/auth/login', { email, password });

export const logout = (): Promise<void> => api.post<void>('/auth/logout');

export const fetchSession = (signal?: AbortSignal): Promise<SessionResponse> =>
  api.get<SessionResponse>('/auth/me', signal);

// --- users and permissions --------------------------------------------------

export interface ListParams {
  page?: number;
  limit?: number;
  q?: string;
}

/** Big enough to cover every select that needs the whole set in one request. */
export const WHOLE_SET: ListParams = { page: 1, limit: 200 };

export const fetchUsers = (
  params: ListParams = {},
  signal?: AbortSignal
): Promise<UserListResponse> => api.get<UserListResponse>(`/users${query({ ...params })}`, signal);

export const createUser = (input: {
  name: string;
  email: string;
  role: Role;
}): Promise<UserListItem> => api.post<UserListItem>('/users', input);

export const updateUser = (
  id: string,
  input: { name?: string; email?: string; role?: Role; active?: boolean }
): Promise<UserListItem> => api.patch<UserListItem>(`/users/${id}`, input);

export const deleteUser = (id: string): Promise<void> => api.delete(`/users/${id}`);

export const fetchRolePermissions = (signal?: AbortSignal): Promise<RolePermissionRow[]> =>
  api.get<RolePermissionRow[]>('/role-permissions', signal);

export const updateRolePermissions = (
  role: Role,
  permissions: Record<string, boolean>
): Promise<RolePermissionRow> =>
  api.patch<RolePermissionRow>(`/role-permissions/${role}`, { permissions });

// --- threads ----------------------------------------------------------------

export const fetchThreads = (
  params: ListParams & { garmentId?: string } = {},
  signal?: AbortSignal
): Promise<ThreadListResponse> =>
  api.get<ThreadListResponse>(`/threads${query({ ...params })}`, signal);

export interface ThreadInput {
  brand: string;
  ticket: number;
  composition: string;
  colour: string;
  coneYieldM: number;
  unitPrice?: number;
}

export const createThread = (input: ThreadInput): Promise<ThreadDTO> =>
  api.post<ThreadDTO>('/threads', input);

export const updateThread = (id: string, input: Partial<ThreadInput>): Promise<ThreadDTO> =>
  api.patch<ThreadDTO>(`/threads/${id}`, input);

export const deleteThread = (id: string): Promise<void> => api.delete(`/threads/${id}`);

// --- machine types ----------------------------------------------------------

export const fetchMachineTypes = (
  params: ListParams = {},
  signal?: AbortSignal
): Promise<MachineTypeListResponse> =>
  api.get<MachineTypeListResponse>(`/machine-types${query({ ...params })}`, signal);

export const updatePositionRatio = (
  machineTypeId: string,
  positionId: string,
  consumptionRatio: number
): Promise<MachineTypeDTO> =>
  api.patch<MachineTypeDTO>(`/machine-types/${machineTypeId}/positions/${positionId}`, {
    consumptionRatio
  });

// --- fabrics ----------------------------------------------------------------

export const fetchFabrics = (
  params: ListParams = {},
  signal?: AbortSignal
): Promise<FabricListResponse> =>
  api.get<FabricListResponse>(`/fabrics${query({ ...params })}`, signal);

export interface FabricInput {
  name: string;
  composition: string;
  gsm: number | null;
  colour: string;
  supplier: string;
}

export const createFabric = (input: FabricInput): Promise<FabricDTO> =>
  api.post<FabricDTO>('/fabrics', input);

export const updateFabric = (id: string, input: FabricInput): Promise<FabricDTO> =>
  api.patch<FabricDTO>(`/fabrics/${id}`, input);

export const deleteFabric = (id: string): Promise<void> => api.delete(`/fabrics/${id}`);

// --- garments ---------------------------------------------------------------

export const fetchGarments = (
  params: ListParams = {},
  signal?: AbortSignal
): Promise<GarmentListResponse> =>
  api.get<GarmentListResponse>(`/garments${query({ ...params })}`, signal);

export const fetchGarment = (id: string, signal?: AbortSignal): Promise<GarmentDTO> =>
  api.get<GarmentDTO>(`/garments/${id}`, signal);

export const fetchNextStyleNumber = (signal?: AbortSignal): Promise<NextStyleNumberResponse> =>
  api.get<NextStyleNumberResponse>('/garments/next-style-number', signal);

export interface GarmentInput {
  name: string;
  styleNumber: string;
  buyer: string;
  orderQuantity: number;
  wastagePercent: number;
  fabrics: { fabricId: string; parts: string[] }[];
  garmentType?: string;
  season?: string;
  sizeRange?: string;
  status?: string;
  description?: string;
  copyOperationsFrom?: string;
}

export const createGarment = (input: GarmentInput): Promise<CreatedGarmentDTO> =>
  api.post<CreatedGarmentDTO>('/garments', input);

export const updateGarment = (
  id: string,
  input: Partial<Omit<GarmentInput, 'copyOperationsFrom'>>
): Promise<GarmentDTO> => api.patch<GarmentDTO>(`/garments/${id}`, input);

export const duplicateGarment = (id: string): Promise<CreatedGarmentDTO> =>
  api.post<CreatedGarmentDTO>(`/garments/${id}/duplicate`);

export const deleteGarment = (id: string): Promise<void> => api.delete(`/garments/${id}`);

export interface CalculationPreview {
  quantity?: number;
  wastagePercent?: number;
  roundingMode?: RoundingMode;
}

export const fetchCalculation = (
  id: string,
  preview: CalculationPreview = {},
  signal?: AbortSignal
): Promise<CalculationDTO> =>
  api.get<CalculationDTO>(`/garments/${id}/calculation${query({ ...preview })}`, signal);

// --- operations -------------------------------------------------------------

export const fetchOperations = (garmentId: string, signal?: AbortSignal): Promise<OperationDTO[]> =>
  api.get<OperationDTO[]>(`/garments/${garmentId}/operations`, signal);

export const createOperation = (
  garmentId: string,
  input: { name?: string; machineTypeId?: string | null; seamLengthCm?: number }
): Promise<OperationDTO> => api.post<OperationDTO>(`/garments/${garmentId}/operations`, input);

export const updateOperation = (
  id: string,
  input: { name?: string; machineTypeId?: string | null; seamLengthCm?: number; notes?: string }
): Promise<OperationDTO> => api.patch<OperationDTO>(`/operations/${id}`, input);

export const updateOperationThread = (
  id: string,
  positionId: string,
  threadId: string | null
): Promise<OperationDTO> => api.patch<OperationDTO>(`/operations/${id}/threads`, { positionId, threadId });

export const reorderOperations = (
  garmentId: string,
  orderedIds: string[]
): Promise<OperationDTO[]> =>
  api.patch<OperationDTO[]>(`/garments/${garmentId}/operations/order`, { orderedIds });

export const deleteOperation = (id: string): Promise<void> => api.delete(`/operations/${id}`);

// --- cone orders ------------------------------------------------------------

export const fetchOrders = (
  filter: { status?: string; q?: string; page?: number; limit?: number },
  signal?: AbortSignal
): Promise<OrderListResponse> =>
  api.get<OrderListResponse>(
    `/orders${query({
      status: filter.status === 'All' ? undefined : filter.status,
      q: filter.q,
      page: filter.page,
      limit: filter.limit
    })}`,
    signal
  );

export const fetchOrder = (id: string, signal?: AbortSignal): Promise<OrderDTO> =>
  api.get<OrderDTO>(`/orders/${id}`, signal);

export const createOrder = (input: {
  garmentId: string;
  quantity?: number;
  wastagePercent?: number;
  roundingMode?: RoundingMode;
}): Promise<OrderDTO> => api.post<OrderDTO>('/orders', input);

export const submitOrder = (id: string): Promise<OrderDTO> =>
  api.post<OrderDTO>(`/orders/${id}/submit`);

export const approveOrder = (id: string): Promise<OrderDTO> =>
  api.post<OrderDTO>(`/orders/${id}/approve`);

export const rejectOrder = (id: string, note?: string): Promise<OrderDTO> =>
  api.post<OrderDTO>(`/orders/${id}/reject`, note === undefined ? {} : { note });

export const placeOrder = (id: string, note?: string): Promise<OrderDTO> =>
  api.post<OrderDTO>(`/orders/${id}/place`, note === undefined ? {} : { note });
