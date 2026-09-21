import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { ingredients, recipes } from "@/db/schema";
import { storeImage } from "@/lib/storage";

type SeedIngredient = { quantity: string; unit: string; name: string };

type SeedRecipe = {
  title: string;
  description: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number | null;
  instructions: string;
  image: string;
  ingredients: SeedIngredient[];
};

const SEED_RECIPES: SeedRecipe[] = [
  {
    title: "Lemon Garlic Roast Chicken",
    description: "A whole chicken roasted with lemon and garlic until the skin crisps.",
    servings: 4,
    prepTimeMinutes: 20,
    cookTimeMinutes: 90,
    instructions: [
      "Heat the oven to 200C.",
      "Halve the lemon and stuff it into the cavity with the garlic and thyme.",
      "Rub the skin with olive oil and season generously.",
      "Roast for 90 minutes, basting halfway through.",
      "Rest for 15 minutes before carving.",
    ].join("\n"),
    image: "lemon-garlic-roast-chicken.jpeg",
    ingredients: [
      { quantity: "1.6", unit: "kg", name: "whole chicken" },
      { quantity: "1", unit: "", name: "lemon" },
      { quantity: "6", unit: "cloves", name: "garlic" },
      { quantity: "4", unit: "sprigs", name: "thyme" },
      { quantity: "2", unit: "tbsp", name: "olive oil" },
    ],
  },
  {
    title: "Weeknight Tomato Pasta",
    description: "Twenty minutes, one pan, mostly cupboard ingredients.",
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 15,
    instructions: [
      "Boil the pasta in well salted water.",
      "Soften the garlic in olive oil over a low heat.",
      "Add the tomatoes and chilli, simmer for 10 minutes.",
      "Toss the drained pasta through the sauce with the basil.",
    ].join("\n"),
    image: "weeknight-tomato-pasta.jpeg",
    ingredients: [
      { quantity: "200", unit: "g", name: "spaghetti" },
      { quantity: "400", unit: "g", name: "tinned tomatoes" },
      { quantity: "3", unit: "cloves", name: "garlic" },
      { quantity: "1", unit: "pinch", name: "chilli flakes" },
      { quantity: "1", unit: "handful", name: "basil" },
    ],
  },
  {
    title: "Overnight Oats",
    description: "Assemble at night, eat straight from the fridge.",
    servings: 1,
    prepTimeMinutes: 5,
    cookTimeMinutes: null,
    instructions: [
      "Stir the oats, milk and yoghurt together in a jar.",
      "Add the honey and a pinch of salt.",
      "Refrigerate overnight and top with berries before eating.",
    ].join("\n"),
    image: "overnight-oats.jpeg",
    ingredients: [
      { quantity: "50", unit: "g", name: "rolled oats" },
      { quantity: "120", unit: "ml", name: "milk" },
      { quantity: "2", unit: "tbsp", name: "natural yoghurt" },
      { quantity: "1", unit: "tsp", name: "honey" },
      { quantity: "1", unit: "handful", name: "berries" },
    ],
  },
];

// Photos follow the database. Seeding a remote database from a checkout with
// no blob token would write them to local disk and store paths that resolve
// nowhere once deployed, so refuse rather than quietly corrupt the data.
const LOCAL_DATABASE = /@(localhost|127\.0\.0\.1|postgres)[:/]/;

if (
  !LOCAL_DATABASE.test(process.env.DATABASE_URL ?? "") &&
  !process.env.BLOB_READ_WRITE_TOKEN
) {
  throw new Error(
    "Refusing to seed a remote database without BLOB_READ_WRITE_TOKEN: the photos " +
      "would be written to local disk and their paths would not resolve when deployed.",
  );
}

async function uploadImage(filename: string) {
  const body = await readFile(join(process.cwd(), "seed", "images", filename));

  return storeImage(new Blob([body]), filename, "image/jpeg");
}

// Matched on title, so running this more than once will not create duplicates.
for (const seed of SEED_RECIPES) {
  const existing = await db.query.recipes.findFirst({ where: eq(recipes.title, seed.title) });
  const image = existing?.imageUrl ? {} : await uploadImage(seed.image);

  const values = {
    title: seed.title,
    description: seed.description,
    servings: seed.servings,
    prepTimeMinutes: seed.prepTimeMinutes,
    cookTimeMinutes: seed.cookTimeMinutes,
    instructions: seed.instructions,
    updatedAt: new Date(),
    ...image,
  };

  const recipeId = await db.transaction(async (tx) => {
    if (existing) {
      await tx.update(recipes).set(values).where(eq(recipes.id, existing.id));
      await tx.delete(ingredients).where(eq(ingredients.recipeId, existing.id));
      return existing.id;
    }

    const [created] = await tx.insert(recipes).values(values).returning({ id: recipes.id });
    return created.id;
  });

  await db.insert(ingredients).values(
    seed.ingredients.map((ingredient, index) => ({
      recipeId,
      name: ingredient.name,
      quantity: ingredient.quantity || null,
      unit: ingredient.unit || null,
      position: index + 1,
    })),
  );

  console.log(`Seeded ${seed.title}`);
}

process.exit(0);
