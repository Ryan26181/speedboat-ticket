import { z } from "zod";

// ============================================
// SECURITY CONSTANTS
// ============================================
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 100;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;

// Password regex: at least 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

// Email regex for additional validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ============================================
// REGISTER SCHEMA
// ============================================
export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(NAME_MIN_LENGTH, `Name must be at least ${NAME_MIN_LENGTH} characters`)
      .max(NAME_MAX_LENGTH, `Name must be less than ${NAME_MAX_LENGTH} characters`)
      .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
    
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .regex(EMAIL_REGEX, "Please enter a valid email address")
      .max(255, "Email is too long"),
    
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
      .max(PASSWORD_MAX_LENGTH, `Password must be less than ${PASSWORD_MAX_LENGTH} characters`)
      .regex(
        PASSWORD_REGEX,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      )
      .refine(
        (password) => !/\s/.test(password),
        "Password cannot contain spaces"
      )
      .refine(
        (password) => !/(.)\1{2,}/.test(password),
        "Password cannot contain more than 2 repeated characters in a row"
      ),
    
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => !data.password.toLowerCase().includes(data.email.split("@")[0].toLowerCase()),
    {
      message: "Password cannot contain your email address",
      path: ["password"],
    }
  );

export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================
// LOGIN SCHEMA
// ============================================
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  
  password: z
    .string()
    .min(1, "Password is required")
    .max(PASSWORD_MAX_LENGTH, "Password is too long"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================
// FORGOT PASSWORD SCHEMA
// ============================================
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ============================================
// RESET PASSWORD SCHEMA
// ============================================
export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .min(1, "Reset token is required")
      .max(100, "Invalid token"),
    
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email")
      .max(255, "Email is too long"),
    
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
      .max(PASSWORD_MAX_LENGTH, `Password must be less than ${PASSWORD_MAX_LENGTH} characters`)
      .regex(
        PASSWORD_REGEX,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      )
      .refine(
        (password) => !/\s/.test(password),
        "Password cannot contain spaces"
      ),
    
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============================================
// VERIFY EMAIL SCHEMA
// ============================================
export const verifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, "Verification token is required")
    .max(100, "Invalid token"),
  
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email")
    .max(255, "Email is too long"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ============================================
// RESEND VERIFICATION SCHEMA
// ============================================
export const resendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

// ============================================
// CHANGE PASSWORD SCHEMA (for logged-in users)
// ============================================
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required"),
    
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
      .max(PASSWORD_MAX_LENGTH, `Password must be less than ${PASSWORD_MAX_LENGTH} characters`)
      .regex(
        PASSWORD_REGEX,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    
    confirmNewPassword: z
      .string()
      .min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================
// PROFILE SCHEMAS (kept from original)
// ============================================
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(NAME_MIN_LENGTH, `Name must be at least ${NAME_MIN_LENGTH} characters`)
    .max(NAME_MAX_LENGTH, `Name must be less than ${NAME_MAX_LENGTH} characters`)
    .optional(),
  phone: z
    .string()
    .regex(/^(\+62|62|0)[0-9]{9,12}$/, "Please enter a valid Indonesian phone number")
    .optional()
    .or(z.literal("")),
  image: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ============================================
// ADMIN SCHEMAS (kept from original)
// ============================================
export const changeRoleSchema = z.object({
  userId: z.string().cuid("Invalid user ID"),
  role: z.enum(["ADMIN", "OPERATOR", "USER"]),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
