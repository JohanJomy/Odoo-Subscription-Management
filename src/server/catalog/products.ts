import { Product, ProductVariant, ProductSchema, ProductVariantSchema } from "@/lib/schemas";
import { store } from "./storage";

/**
 * List products with optional search query and active filter
 */
export function listProducts(options?: {
  search?: string;
  category?: string;
  activeOnly?: boolean;
}): Product[] {
  let list = store.products;

  if (options?.activeOnly) {
    list = list.filter((p) => p.active);
  }

  if (options?.category) {
    list = list.filter((p) => p.category === options.category);
  }

  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }

  return list;
}

/**
 * Get product by ID
 */
export function getProductById(id: string): Product | null {
  return store.products.find((p) => p.id === id) || null;
}

/**
 * Create a new product
 */
export function createProduct(input: Omit<Product, "id">): Product {
  const validated = ProductSchema.parse(input);

  const newProduct: Product = {
    ...validated,
    id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    variants: (validated.variants || []).map((v) => ({
      ...v,
      id: v.id || `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    })),
  };

  store.products.unshift(newProduct);
  return newProduct;
}

/**
 * Update product
 */
export function updateProduct(id: string, input: Partial<Product>): Product {
  const index = store.products.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error(`Product with ID ${id} not found`);
  }

  const existing = store.products[index];
  const merged = { ...existing, ...input, id: existing.id };
  const validated = ProductSchema.parse(merged);

  store.products[index] = validated;
  return validated;
}

/**
 * Activate or Deactivate product
 */
export function toggleProductStatus(id: string): Product {
  const product = getProductById(id);
  if (!product) {
    throw new Error(`Product with ID ${id} not found`);
  }
  return updateProduct(id, { active: !product.active });
}

/**
 * Add a variant to a product
 */
export function addVariant(
  productId: string,
  variantInput: Omit<ProductVariant, "id" | "productId">
): Product {
  const product = getProductById(productId);
  if (!product) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  const validatedVariant = ProductVariantSchema.parse({
    ...variantInput,
    productId,
    id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  });

  const updatedVariants = [...product.variants, validatedVariant];
  return updateProduct(productId, { variants: updatedVariants });
}

/**
 * Update an existing variant
 */
export function updateVariant(
  productId: string,
  variantId: string,
  variantInput: Partial<ProductVariant>
): Product {
  const product = getProductById(productId);
  if (!product) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  const vIndex = product.variants.findIndex((v) => v.id === variantId);
  if (vIndex === -1) {
    throw new Error(`Variant with ID ${variantId} not found`);
  }

  const existing = product.variants[vIndex];
  const merged = { ...existing, ...variantInput, id: existing.id, productId };
  const validated = ProductVariantSchema.parse(merged);

  const updatedVariants = [...product.variants];
  updatedVariants[vIndex] = validated;

  return updateProduct(productId, { variants: updatedVariants });
}

/**
 * Delete a variant.
 * CRITICAL RULE: Prevent deleting a variant already used by a subscription.
 */
export function deleteVariant(
  productId: string,
  variantId: string
): { success: boolean; message?: string } {
  // Check if variant is used in any active/existing subscriptions
  const isUsedInSubscription = store.subscriptions.some((sub) =>
    sub.lines.some((line) => line.variantId === variantId)
  );

  if (isUsedInSubscription) {
    throw new Error(
      "Cannot delete variant: This variant is currently referenced in an existing subscription."
    );
  }

  // Check if variant is used in any quotation templates
  const isUsedInTemplate = store.templates.some((tmpl) =>
    tmpl.lines.some((line) => line.variantId === variantId)
  );

  if (isUsedInTemplate) {
    throw new Error(
      "Cannot delete variant: This variant is currently referenced in a quotation template."
    );
  }

  const product = getProductById(productId);
  if (!product) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  const updatedVariants = product.variants.filter((v) => v.id !== variantId);
  updateProduct(productId, { variants: updatedVariants });

  return { success: true };
}
