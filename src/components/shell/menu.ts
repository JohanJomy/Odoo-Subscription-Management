import { UserRole } from "@/lib/constants";

export interface NavItem {
  title: string;
  href: string;
  iconName: string;
  roles: UserRole[];
  badge?: string;
  children?: {
    title: string;
    href: string;
  }[];
}

export const MAIN_MENU_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    iconName: "LayoutDashboard",
    roles: ["ADMIN", "STAFF"],
  },
  {
    title: "Inbox",
    href: "/inbox",
    iconName: "Inbox",
    roles: ["ADMIN", "STAFF"],
  },
  {
    title: "Customers",
    href: "/customers",
    iconName: "Users",
    roles: ["ADMIN", "STAFF"],
  },
  {
    title: "Subscriptions",
    href: "/subscriptions",
    iconName: "Repeat",
    roles: ["ADMIN", "STAFF"],
  },
  {
    title: "Invoices",
    href: "/invoices",
    iconName: "Receipt",
    roles: ["ADMIN", "STAFF"],
  },
  {
    title: "Payments",
    href: "/payments",
    iconName: "CreditCard",
    roles: ["ADMIN", "STAFF"],
  },
  {
    title: "Catalog",
    href: "/catalog/products",
    iconName: "Package",
    roles: ["ADMIN", "STAFF"],
    children: [
      { title: "Products & Variants", href: "/catalog/products" },
      { title: "Plans", href: "/catalog/plans" },
      { title: "Quotation Templates", href: "/catalog/templates" },
    ],
  },
  {
    title: "Pricing",
    href: "/pricing/taxes",
    iconName: "Tag",
    roles: ["ADMIN", "STAFF"],
    children: [
      { title: "Taxes (GST)", href: "/pricing/taxes" },
      { title: "Discounts", href: "/pricing/discounts" },
    ],
  },
  {
    title: "Billing Run",
    href: "/billing",
    iconName: "PlayCircle",
    roles: ["ADMIN", "STAFF"],
  },
];

export const ADMIN_MENU_ITEMS: NavItem[] = [
  {
    title: "Team",
    href: "/team",
    iconName: "UserCheck",
    roles: ["ADMIN"],
  },
  {
    title: "Audit Trail",
    href: "/audit",
    iconName: "ShieldAlert",
    roles: ["ADMIN"],
  },
];

export const CUSTOMER_MENU_ITEMS: NavItem[] = [
  {
    title: "My Subscriptions",
    href: "/my/subscriptions",
    iconName: "Repeat",
    roles: ["CUSTOMER"],
  },
  {
    title: "My Invoices",
    href: "/my/invoices",
    iconName: "Receipt",
    roles: ["CUSTOMER"],
  },
];

export function getMenuItemsForRole(role: UserRole) {
  if (role === "CUSTOMER") {
    return { main: CUSTOMER_MENU_ITEMS, admin: [] };
  }

  const main = MAIN_MENU_ITEMS.filter((item) => item.roles.includes(role));
  const admin = ADMIN_MENU_ITEMS.filter((item) => item.roles.includes(role));

  return { main, admin };
}
