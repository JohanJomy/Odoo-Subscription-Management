import { QuotationTemplate, QuotationTemplateSchema } from "@/lib/schemas";
import { store } from "./storage";
import { getProductById } from "./products";
import { getPlanById } from "./plans";

/**
 * List quotation templates
 */
export function listTemplates(options?: { activeOnly?: boolean; search?: string }): QuotationTemplate[] {
  let list = store.templates;

  if (options?.activeOnly) {
    list = list.filter((t) => t.active);
  }

  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }

  return list;
}

/**
 * Get quotation template by ID
 */
export function getTemplateById(id: string): QuotationTemplate | null {
  return store.templates.find((t) => t.id === id) || null;
}

/**
 * Create quotation template
 */
export function createTemplate(input: Omit<QuotationTemplate, "id">): QuotationTemplate {
  const validated = QuotationTemplateSchema.parse(input);

  const plan = getPlanById(validated.planId);
  if (!plan) {
    throw new Error(`Plan with ID ${validated.planId} not found`);
  }

  // Enrich lines with current product and variant pricing
  const enrichedLines = validated.lines.map((line, idx) => {
    const product = getProductById(line.productId);
    if (!product) {
      throw new Error(`Product with ID ${line.productId} not found`);
    }

    let unitPrice = product.basePrice;
    let variantName = line.variantName || null;

    if (line.variantId) {
      const variant = product.variants.find((v) => v.id === line.variantId);
      if (!variant) {
        throw new Error(`Variant ${line.variantId} not found on product ${product.name}`);
      }
      unitPrice += variant.extraPrice;
      variantName = variant.name;
    }

    return {
      ...line,
      id: line.id || `tl-${Date.now()}-${idx}`,
      productName: product.name,
      variantName,
      unitPrice,
    };
  });

  const newTemplate: QuotationTemplate = {
    ...validated,
    id: `tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    planName: plan.name,
    lines: enrichedLines,
  };

  store.templates.unshift(newTemplate);
  return newTemplate;
}

/**
 * Update quotation template
 */
export function updateTemplate(id: string, input: Partial<QuotationTemplate>): QuotationTemplate {
  const index = store.templates.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error(`Template with ID ${id} not found`);
  }

  const existing = store.templates[index];
  const merged = { ...existing, ...input, id: existing.id };
  const validated = QuotationTemplateSchema.parse(merged);

  const plan = getPlanById(validated.planId);

  const enrichedLines = validated.lines.map((line, idx) => {
    const product = getProductById(line.productId);
    if (!product) {
      throw new Error(`Product with ID ${line.productId} not found`);
    }

    let unitPrice = product.basePrice;
    let variantName = line.variantName || null;

    if (line.variantId) {
      const variant = product.variants.find((v) => v.id === line.variantId);
      if (variant) {
        unitPrice += variant.extraPrice;
        variantName = variant.name;
      }
    }

    return {
      ...line,
      id: line.id || `tl-${Date.now()}-${idx}`,
      productName: product.name,
      variantName,
      unitPrice,
    };
  });

  const updated: QuotationTemplate = {
    ...validated,
    planName: plan?.name || existing.planName,
    lines: enrichedLines,
  };

  store.templates[index] = updated;
  return updated;
}

/**
 * Delete quotation template
 */
export function deleteTemplate(id: string): { success: boolean } {
  const index = store.templates.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error(`Template with ID ${id} not found`);
  }

  store.templates.splice(index, 1);
  return { success: true };
}
