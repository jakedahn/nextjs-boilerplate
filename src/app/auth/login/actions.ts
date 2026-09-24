"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { credentialsSchema } from "@/lib/auth/schemas"

export type AuthFormState = {
  errors?: Record<string, string[]>
  success?: boolean
  message?: string
}

export const signIn = async (
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> => {
  const validated = credentialsSchema.safeParse(Object.fromEntries(formData))

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(validated.data)

  if (error) {
    return { errors: { form: [error.message] } }
  }

  revalidatePath("/", "layout")
  redirect("/")
}

export const signUp = async (
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> => {
  const validated = credentialsSchema.safeParse(Object.fromEntries(formData))

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp(validated.data)

  if (error) {
    return { errors: { form: [error.message] } }
  }

  return {
    success: true,
    message: "Check your email to confirm your account.",
  }
}

export const signOut = async () => {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/auth/login")
}
