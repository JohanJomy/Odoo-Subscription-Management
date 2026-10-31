import { Plan, PlanSchema, PlanAction, PlanActionSchema } from "@/lib/schemas";
import { store } from "./storage";

/**
 * List all plans
 */
export function listPlans(options?: { activeOnly?: boolean; search?: string }): Plan[] {
  let list = store.plans;

  if (options?.activeOnly) {
    list = list.filter((p) => p.active);
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
 * Get plan by ID
 */
export function getPlanById(id: string): Plan | null {
  return store.plans.find((p) => p.id === id) || null;
}

/**
 * Create a new plan
 */
export function createPlan(input: Omit<Plan, "id">): Plan {
  const validated = PlanSchema.parse(input);

  const newPlan: Plan = {
    ...validated,
    id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };

  store.plans.unshift(newPlan);
  return newPlan;
}

/**
 * Update plan
 */
export function updatePlan(id: string, input: Partial<Plan>): Plan {
  const index = store.plans.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error(`Plan with ID ${id} not found`);
  }

  const existing = store.plans[index];
  const merged = { ...existing, ...input, id: existing.id };
  const validated = PlanSchema.parse(merged);

  store.plans[index] = validated;
  return validated;
}

/**
 * Execute plan action (activate, deactivate, close, pause, renew verification)
 */
export function executePlanAction(id: string, actionInput: PlanAction): { success: boolean; plan: Plan } {
  const validated = PlanActionSchema.parse(actionInput);
  const plan = getPlanById(id);
  if (!plan) {
    throw new Error(`Plan with ID ${id} not found`);
  }

  switch (validated.action) {
    case "activate":
      return { success: true, plan: updatePlan(id, { active: true }) };

    case "deactivate":
      return { success: true, plan: updatePlan(id, { active: false }) };

    case "close":
      if (!plan.closable) {
        throw new Error(`Plan "${plan.name}" does not permit closing (closable switch is disabled).`);
      }
      return { success: true, plan };

    case "pause":
      if (!plan.pausable) {
        throw new Error(`Plan "${plan.name}" does not permit pausing (pausable switch is disabled).`);
      }
      return { success: true, plan };

    case "renew":
      if (!plan.renewable) {
        throw new Error(`Plan "${plan.name}" does not permit renewal (renewable switch is disabled).`);
      }
      return { success: true, plan };

    default:
      return { success: true, plan };
  }
}
