import {requireDemoPreview} from "../../lib/previewGuard";
import {AdminDashboard} from "../../components/AdminDashboard";
export default function Page() {requireDemoPreview(); return <AdminDashboard />;}
