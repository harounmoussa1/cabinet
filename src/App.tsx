import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { DashboardPage } from './pages/Dashboard';
import { PatientsPage } from './pages/Patients';
import { AppointmentsPage } from './pages/Appointments';
import { ProstheticsPage } from './pages/Prosthetics';
import { SuppliersPage } from './pages/Suppliers';
import { SettingsPage } from './pages/Settings';
import TrashPage from './pages/Trash/TrashPage';

function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="patients" element={<PatientsPage />} />
                    <Route path="appointments" element={<AppointmentsPage />} />
                    <Route path="prosthetics" element={<ProstheticsPage />} />
                    <Route path="suppliers" element={<SuppliersPage />} />
                    <Route path="trash" element={<TrashPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Route>
            </Routes>
        </HashRouter>
    );
}

export default App;
