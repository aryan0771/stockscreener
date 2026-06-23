"use server";

import { UserService } from "@/services/userService";
import { registerSchema, RegisterInput } from "@/validators/user.validator";

export async function registerUserAction(data: RegisterInput) {
  try {
    const validatedData = registerSchema.parse(data);
    const user = await UserService.registerUser(validatedData);
    return { success: true, user };
  } catch (error: any) {
    if (error.name === "ZodError") {
      return { success: false, error: "Validation failed", details: error.errors };
    }
    return { success: false, error: error.message || "Failed to register user" };
  }
}

export async function updateProfileAction(data: { name: string; email: string }) {
  try {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const { updateProfileSchema } = await import("@/validators/user.validator");
    const validatedData = updateProfileSchema.parse(data);

    const user = await UserService.updateProfile(session.user.id, validatedData);
    return { success: true, user };
  } catch (error: any) {
    if (error.name === "ZodError") {
      return { success: false, error: "Validation failed", details: error.errors };
    }
    return { success: false, error: error.message || "Failed to update profile" };
  }
}

export async function changePasswordAction(data: any) {
  try {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const { changePasswordSchema } = await import("@/validators/user.validator");
    const validatedData = changePasswordSchema.parse(data);

    await UserService.changePassword(session.user.id, validatedData.currentPassword, validatedData.newPassword);
    return { success: true };
  } catch (error: any) {
    if (error.name === "ZodError") {
      return { success: false, error: "Validation failed", details: error.errors };
    }
    return { success: false, error: error.message || "Failed to change password" };
  }
}
