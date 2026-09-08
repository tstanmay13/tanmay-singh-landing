import type { Metadata } from "next";
import Underworld from "@/components/underworld/Underworld";
export const metadata: Metadata = {
  title: "Underworld · Tanmay’s Arcade",
  description:
    "A little browser love letter to Hades. Twelve chambers, Olympian boons, and one more escape attempt.",
};
export default function UnderworldPage() {
  return <Underworld />;
}
