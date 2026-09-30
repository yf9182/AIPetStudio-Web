import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isBillingConfigured, stripe } from "@/lib/billing/stripe";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Opens the Stripe Billing Portal so subscribers can change or cancel a plan. */
export async function POST() {
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: { code: "BILLING_NOT_CONFIGURED", message: "支付尚未配置" } },
      { status: 503 }
    );
  }

  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  const client = stripe();
  if (!client) {
    return NextResponse.json({ error: { code: "BILLING_NOT_CONFIGURED", message: "支付尚未配置" } }, { status: 503 });
  }

  const escaped = email.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const found = await client.customers.search({ query: `email:'${escaped}'`, limit: 1 });
  const customer = found.data[0];

  if (!customer) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "还没有可管理的订阅" } },
      { status: 404 }
    );
  }

  const portal = await client.billingPortal.sessions.create({
    customer: customer.id,
    return_url: absoluteUrl("/account")
  });

  return NextResponse.json({ url: portal.url });
}
