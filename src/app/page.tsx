import NightDrive from "@/components/night-drive/NightDrive";
import { NIGHT_DRIVE_DISTRICTS } from "@/content/nightDrive";

export default function Home() {
  return <NightDrive districts={NIGHT_DRIVE_DISTRICTS} />;
}
