import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireSession } from './auth/RequireSession';
import { Shell } from './components/Shell/Shell';
import { SignIn } from './screens/SignIn/SignIn';
import { GarmentLibrary } from './screens/Garments/GarmentLibrary';
import { NewGarment } from './screens/NewGarment/NewGarment';
import { GarmentDetail } from './screens/GarmentDetail/GarmentDetail';
import { OperationBreakdown } from './screens/Breakdown/OperationBreakdown';
import { OrderRegister } from './screens/Orders/OrderRegister';
import { OrderRegisterPrint } from './screens/Orders/OrderRegisterPrint';
import { OrderDetail } from './screens/Orders/OrderDetail';
import { ThreadLibrary } from './screens/Threads/ThreadLibrary';
import { MachineTypes } from './screens/MachineTypes/MachineTypes';
import { FabricLibrary } from './screens/Fabrics/FabricLibrary';
import { Users } from './screens/Users/Users';
import { Roles } from './screens/Users/Roles';

/** Every screen has a real URL — the prototype's single-state switch was a limitation. */
export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<SignIn />} />

      <Route element={<RequireSession />}>
        <Route element={<Shell />}>
          <Route path="/garments" element={<GarmentLibrary />} />
          <Route path="/garments/new" element={<NewGarment />} />
          <Route path="/garments/:id" element={<GarmentDetail />} />
          <Route path="/garments/:id/breakdown" element={<OperationBreakdown />} />

          <Route path="/orders" element={<OrderRegister />} />
          <Route path="/orders/print" element={<OrderRegisterPrint />} />
          <Route path="/orders/:id" element={<OrderDetail />} />

          <Route path="/threads" element={<ThreadLibrary />} />
          <Route path="/machine-types" element={<MachineTypes />} />
          <Route path="/fabrics" element={<FabricLibrary />} />
          <Route path="/users" element={<Users />} />
          <Route path="/roles" element={<Roles />} />

          <Route path="/" element={<Navigate to="/garments" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/garments" replace />} />
    </Routes>
  );
}
