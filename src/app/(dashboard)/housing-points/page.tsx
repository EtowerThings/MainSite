import { redirect } from "next/navigation";

/** Legacy URL: housing points now live under Admin → Housing PTS. */
export default function HousingPointsRedirectPage() {
    redirect("/admin?tab=housing");
}
