import type { RecipeFormError } from "@/app/recipes/actions";

export function messagesFor(errors: RecipeFormError[], field: string) {
  return errors.filter((error) => error.field === field).map((error) => error.message);
}

export function FieldError({ errors, field }: { errors: RecipeFormError[]; field: string }) {
  const messages = messagesFor(errors, field);
  if (messages.length === 0) return null;

  return (
    <p className="field__error" id={`${field}-error`}>
      {messages.join(". ")}
    </p>
  );
}
