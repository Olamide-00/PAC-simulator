import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from './components/ui';
import { useGpsSimulation } from './lib/selectors';
import ExplorerLayout from './pages/ExplorerLayout';
import Home from './pages/explainer/Home';
import HowItWorks from './pages/explainer/HowItWorks';
import Architecture from './pages/explainer/Architecture';
import Integrations from './pages/explainer/Integrations';
import Rules from './pages/explainer/Rules';
import DesignSystem from './pages/explainer/DesignSystem';
import Delivery from './pages/explainer/Delivery';
import DemoConsole from './demo/DemoConsole';
import CustomerApp from './customer/CustomerApp';
import DriverApp from './driver/DriverApp';
import AdminLayout from './admin/AdminLayout';
import Overview from './admin/pages/Overview';
import Orders from './admin/pages/Orders';
import Tracking from './admin/pages/Tracking';
import Inventory from './admin/pages/Inventory';
import Payments from './admin/pages/Payments';
import Customers from './admin/pages/Customers';
import Drivers from './admin/pages/Drivers';
import Vehicles from './admin/pages/Vehicles';
import Complaints from './admin/pages/Complaints';
import Notifications from './admin/pages/Notifications';
import Reports from './admin/pages/Reports';
import AuditLogs from './admin/pages/AuditLogs';
import SettingsPage from './admin/pages/Settings';
import { PhoneStage } from './components/Phone';

export default function App() {
  useGpsSimulation();
  return (
    <>
      <Routes>
        <Route element={<ExplorerLayout />}>
          <Route index element={<Home />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="architecture" element={<Architecture />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="rules" element={<Rules />} />
          <Route path="design" element={<DesignSystem />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="demo" element={<DemoConsole />} />
        </Route>
        <Route path="customer" element={<PhoneStage title="Customer App"><CustomerApp /></PhoneStage>} />
        <Route path="driver" element={<PhoneStage title="Driver App"><DriverApp /></PhoneStage>} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="orders" element={<Orders />} />
          <Route path="dispatch" element={<Navigate to="/admin/orders" replace />} />
          <Route path="tracking" element={<Tracking />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="payments" element={<Payments />} />
          <Route path="customers" element={<Customers />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
