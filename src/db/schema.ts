import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
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
    // Two fields search engines ask a recipe for: the course and the cooking
    // tradition. The other terms they ask for are the recipe's tags.
    category: text("category"),
    cuisine: text("cuisine"),
    servings: integer("servings"),
    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    instructions: text("instructions"),
    // Vercel Blob returns both; the pathname is what we need to delete the file.
    imageUrl: text("image_url"),
    imagePathname: text("image_pathname"),
    // The cut-paper drawing, as pieces rather than markup. Read it through
    // readIllustration, which parses it again rather than trusting the column.
    illustration: jsonb("illustration"),
    illustratedAt: timestamp("illustrated_at", { withTimezone: true }),
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

/**
 * A tag belongs to nobody. Two tags are the same tag when their slugs match,
 * so `Weeknight` and `week night` are one row, holding the name as it was
 * first typed.
 */
export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tags_slug_idx").on(table.slug)],
);

export const recipeTags = pgTable(
  "recipe_tags",
  {
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.recipeId, table.tagId] }),
    // The recipe side is the primary key's own index. This is the other
    // direction: every recipe carrying one tag, which is what filtering and
    // the sidebar counts read.
    index("recipe_tags_tag_id_idx").on(table.tagId),
  ],
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
  tags: many(recipeTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  recipes: many(recipeTags),
}));

export const recipeTagsRelations = relations(recipeTags, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeTags.recipeId],
    references: [recipes.id],
  }),
  tag: one(tags, {
    fields: [recipeTags.tagId],
    references: [tags.id],
  }),
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
export type Tag = typeof tags.$inferSelect;
export type RecipeWithIngredients = Recipe & { ingredients: Ingredient[]; tags: Tag[] };
