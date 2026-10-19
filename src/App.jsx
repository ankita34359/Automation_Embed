import { Navigate, Route, Routes } from "react-router-dom";
import Register from "./pages/Register.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminLayout from "./pages/AdminLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Integrations from "./pages/Integrations.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Register />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="integrations" element={<Integrations />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
