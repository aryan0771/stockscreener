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
