import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileClient } from "./ProfileClient";
import { UserService } from "@/services/userService";

export const metadata = {
  title: "Profile Settings | InvestIQ",
  description: "Manage your profile and security settings.",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await UserService.getUserById(session.user.id);

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal information and security preferences.
        </p>
      </div>
      
      <ProfileClient user={{ id: user.id, name: user.name || "", email: user.email || "" }} />
    </div>
  );
}
