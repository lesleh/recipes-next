import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const recipes = pgTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    servings: integer("servings"),
    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    instructions: text("instructions"),
    // Vercel Blob returns both; the pathname is what we need to delete the file.
    imageUrl: text("image_url"),
    imagePathname: text("image_pathname"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("recipes_title_idx").on(table.title),
    uniqueIndex("recipes_slug_idx").on(table.slug),
  ],
);

// Every slug a recipe has ever held, including its current one. The primary
// key is what stops a second recipe taking a slug another recipe retired.
export const recipeSlugs = pgTable(
  "recipe_slugs",
  {
    slug: text("slug").primaryKey(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("recipe_slugs_recipe_id_idx").on(table.recipeId)],
);

export const ingredients = pgTable(
  "ingredients",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: text("quantity"),
    unit: text("unit"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ingredients_name_idx").on(table.name),
    index("ingredients_recipe_id_position_idx").on(table.recipeId, table.position),
  ],
);

export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(ingredients),
  slugs: many(recipeSlugs),
}));

export const recipeSlugsRelations = relations(recipeSlugs, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeSlugs.recipeId],
    references: [recipes.id],
  }),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [ingredients.recipeId],
    references: [recipes.id],
  }),
}));

export type Recipe = typeof recipes.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type RecipeSlug = typeof recipeSlugs.$inferSelect;
export type RecipeWithIngredients = Recipe & { ingredients: Ingredient[] };
