import { redirect } from "next/navigation";

export default function RedirectHome() {
  redirect("/en/inbox"); // ou toute route que tu sais valide
}
