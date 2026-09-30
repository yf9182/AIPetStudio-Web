import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWorkerSessionOrNull } from "@/lib/worker-session";
import { isBillingConfigured, resolvePrice, stripe } from "@/lib/billing/stripe";
import { packById, planById } from "@/lib/billing/catalog";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Creates a Stripe Checkout Session for a credit pack or a subscription.
 *
 * The backend's RevenueCat webhook ignores anything that is not an App Store
 * purchase, so web purchases are credited by a dedicated Stripe webhook on the
 * backend. That handler reads `metadata.customer_id` and `metadata.credits`
 * from the session, which is why both are attached here and why the credits
 * amount is taken from this server-side catalog rather than from the request.
 */
export async function POST(request: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: { code: "BILLING_NOT_CONFIGURED", message: "支付尚未配置，请联系管理员" } },
      { status: 503 }
    );
  }

  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  const worker = await getWorkerSessionOrNull();
  if (!worker) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "账户服务暂时不可用，请稍后重试" } },
      { status: 503 }
    );
  }

  let body: { kind?: unknown; id?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION", message: "请求格式不正确" } }, { status: 422 });
  }

  const kind = body.kind === "plan" ? "plan" : body.kind === "pack" ? "pack" : null;
  const id = typeof body.id === "string" ? body.id : "";
  if (!kind || !id) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "缺少商品信息" } }, { status: 422 });
  }

  const client = stripe();
  if (!client) {
    return NextResponse.json(
      { error: { code: "BILLING_NOT_CONFIGURED", message: "支付尚未配置" } },
      { status: 503 }
    );
  }

  // Resolve the product and its Stripe price id per kind, keeping the two
  // catalogs' field names out of the shared code path.
  let credits: number;
  let priceId: string | undefined;

  if (kind === "pack") {
    const pack = packById(id);
    if (!pack) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "商品不存在" } }, { status: 404 });
    }
    credits = pack.credits;
    priceId = process.env[pack.priceEnv];
  } else {
    const plan = planById(id);
    if (!plan) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "商品不存在" } }, { status: 404 });
    }
    credits = plan.credits;
    priceId = process.env[plan.monthlyPriceEnv];
  }

  const resolved = await resolvePrice(priceId);
  if (!resolved) {
    return NextResponse.json(
      { error: { code: "BILLING_NOT_CONFIGURED", message: `商品 ${id} 尚未在 Stripe 中配置价格` } },
      { status: 503 }
    );
  }

  const metadata = {
    aipet_customer_id: worker.customerId,
    product_kind: kind,
    product_id: id,
    credits: String(credits)
  };

  const customer = await getOrCreateCustomer(email, worker.customerId);

  const checkout = await client.checkout.sessions.create({
    mode: kind === "pack" ? "payment" : "subscription",
    customer: customer.id,
    line_items: [{ price: resolved.id, quantity: 1 }],
    client_reference_id: worker.customerId,
    metadata,
    ...(kind === "plan" ? { subscription_data: { metadata } } : {}),
    allow_promotion_codes: true,
    success_url: absoluteUrl("/points?checkout=success&session_id={CHECKOUT_SESSION_ID}"),
    cancel_url: absoluteUrl(kind === "pack" ? "/points?checkout=cancelled" : "/pricing?checkout=cancelled")
  });

  if (!checkout.url) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "无法创建支付会话" } },
      { status: 502 }
    );
  }

  return NextResponse.json({ url: checkout.url });
}

/**
 * Finds or creates the Stripe customer for an account.
 *
 * The web app has no database, so the mapping is recovered from the account
 * email plus a metadata tag rather than stored locally. The metadata tag lets
 * the backend webhook resolve which wallet to credit even if the email changes.
 */
async function getOrCreateCustomer(email: string, customerId: string) {
  const client = stripe();
  if (!client) throw new Error("Stripe is not configured");

  const escaped = email.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const found = await client.customers.search({
    query: `email:'${escaped}'`,
    limit: 1
  });
  const existing = found.data[0];
  if (existing) return existing;

  return client.customers.create({
    email,
    metadata: { aipet_customer_id: customerId }
  });
}
