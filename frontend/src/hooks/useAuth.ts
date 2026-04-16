import { useMutation } from "@tanstack/react-query";
import { 
  register, 
  verifyEmail, 
  AuthUserResponse, 
  RegisterPayload, 
  VerifyEmailPayload 
} from "@/lib/auth";
import { ApiError } from "@/lib/api";

export function useRegister() {
  return useMutation<AuthUserResponse, ApiError, RegisterPayload>({
    mutationFn: (payload: RegisterPayload) => register(payload),
  });
}

export function useVerifyEmail() {
  return useMutation<{ message: string }, ApiError, VerifyEmailPayload>({
    mutationFn: (payload: VerifyEmailPayload) => verifyEmail(payload),
  });
}
