import {requireDemoPreview} from "../../lib/previewGuard";
import { StudentDashboard } from "../../components/StudentDashboard";
export default function Page() {requireDemoPreview();return <StudentDashboard/>;}
