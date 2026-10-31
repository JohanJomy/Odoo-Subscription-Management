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

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    group: "Overview",
    items: [
      {
        title: "Revenue Radar",
        href: "/dashboard",
        iconName: "LayoutDashboard",
        roles: ["ADMIN", "STAFF"],
      },
      {
        title: "Renewal & Dunning Inbox",
        href: "/inbox",
        iconName: "Inbox",
        roles: ["ADMIN", "STAFF"],
      },
    ],
  },
  {
    group: "Core Operations",
    items: [
      {
        title: "Billing Run",
        href: "/billing",
        iconName: "PlayCircle",
        roles: ["ADMIN", "STAFF"],
      },
      {
        title: "Subscriptions",
        href: "/subscriptions",
        iconName: "Repeat",
        roles: ["ADMIN", "STAFF"],
      },
      {
        title: "Invoices Ledger",
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
        title: "Customers",
        href: "/customers",
        iconName: "Users",
        roles: ["ADMIN", "STAFF"],
      },
    ],
  },
  {
    group: "Product & Catalog",
    items: [
      {
        title: "Products & Variants",
        href: "/catalog/products",
        iconName: "Package",
        roles: ["ADMIN", "STAFF"],
      },
      {
        title: "Plans & Policies",
        href: "/catalog/plans",
        iconName: "Layers",
        roles: ["ADMIN", "STAFF"],
      },
      {
        title: "Quotation Templates",
        href: "/catalog/templates",
        iconName: "FileText",
        roles: ["ADMIN", "STAFF"],
      },
    ],
  },
  {
    group: "Settings & Administration",
    items: [
      {
        title: "Pricing & Taxes",
        href: "/pricing/taxes",
        iconName: "Tag",
        roles: ["ADMIN", "STAFF"],
      },
      {
        title: "Team & Staff",
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
    ],
  },
];

export const CUSTOMER_NAV_ITEMS: NavItem[] = [
  {
    title: "My Subscriptions",
    href: "/my/subscriptions",
    iconName: "Repeat",
    roles: ["CUSTOMER"],
  },
  {
    title: "My Invoices & Ledger",
    href: "/my/invoices",
    iconName: "Receipt",
    roles: ["CUSTOMER"],
  },
];

export function getFilteredNavGroups(role: UserRole): NavGroup[] {
  if (role === "CUSTOMER") {
    return [
      {
        group: "Customer Portal",
        items: CUSTOMER_NAV_ITEMS,
      },
    ];
  }

  return NAV_GROUPS.map((group) => ({
    group: group.group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}
