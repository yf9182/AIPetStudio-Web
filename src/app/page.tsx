import Link from "next/link";
import { PlanTable } from "@/components/billing/PricingTable";
import { TemplateBrowser } from "@/components/catalog/TemplateBrowser";
import { Faq } from "@/components/marketing/Faq";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Eyebrow, Panel, SectionHeading } from "@/components/ui/Layout";
import { loadPlanViews } from "@/lib/billing/prices";
import { fetchCatalog, MaterialHubError, type Catalog, type Template } from "@/lib/material-hub";

// The catalog is cached at the fetch layer for five minutes.
export const revalidate = 300;

const FAQ_ITEMS = [
  {
    question: "怎么用一张宠物照片生成效果图或视频？",
    answer:
      "在模板库里挑一个模板，上传一张清晰的宠物照片，确认积分后点开始生成。图生图通常一两分钟出结果，图生视频需要几分钟，可以在「我的作品」里随时查看进度。"
  },
  {
    question: "生成一次要花多少积分？",
    answer:
      "图生图固定 10 积分，图生视频固定 50 积分，与模板无关。积分价格由服务端统一执行，页面上显示的就是实际扣费。"
  },
  {
    question: "新账号有免费积分吗？",
    answer: "有。首次登录后会自动获得 20 积分，足够先体验两次图生图效果。"
  },
  {
    question: "什么样的照片效果最好？",
    answer:
      "光线均匀、主体清晰、宠物正面或侧面站立的照片效果最好。避免逆光、严重模糊或主体过小的照片。"
  },
  {
    question: "生成的图片和视频可以下载吗？",
    answer: "可以。生成完成后在结果页可以直接下载图片或视频文件，作品也会保留在「我的作品」中。"
  },
  {
    question: "可以取消订阅吗？",
    answer:
      "可以。订阅由 Stripe 处理，在账号页点「管理订阅与发票」即可随时取消或更换方案，已购买的积分包不会过期。"
  }
];

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ kind?: string; category?: string }>;
}) {
  const params = await searchParams;

  const [catalogResult, plans] = await Promise.all([
    loadCatalog(),
    loadPlanViews().catch(() => [])
  ]);

  const initialKind = params.kind === "image" || params.kind === "video" ? params.kind : "all";
  const featured = catalogResult.catalog.templates[0] ?? null;

  return (
    <div className="flex flex-col gap-20 pb-8 sm:gap-28">
      <Hero featured={featured} total={catalogResult.catalog.templates.length} />

      <Container>
        <SectionHeading
          title="宠物模板库"
          description="每个模板都是一条写好的提示词。挑一个、上传照片，其余交给 AI。"
          action={
            <ButtonLink href="/tasks" variant="outline" size="md">
              我的作品
            </ButtonLink>
          }
          className="mb-8"
        />

        {catalogResult.error ? (
          <CatalogUnavailable message={catalogResult.error} />
        ) : (
          <TemplateBrowser
            catalog={catalogResult.catalog}
            initialKind={initialKind}
            initialCategory={params.category ?? ""}
          />
        )}
      </Container>

      <Container>
        <HowItWorks />
      </Container>

      <Container>
        <section id="pricing" className="flex scroll-mt-24 flex-col gap-8">
          <SectionHeading title="简单定价" description="今天就免费开始，随时可以升级或取消。" />
          <PlanTable plans={plans} />
          <p className="text-micro text-white/40">
            图生图 10 积分 / 次，图生视频 50 积分 / 次。订阅与积分包均由 Stripe 处理，可随时在账号页取消。
          </p>
        </section>
      </Container>

      <Container>
        <section id="faq" className="flex scroll-mt-24 flex-col gap-8">
          <SectionHeading title="常见问题" />
          <Faq items={FAQ_ITEMS} />
        </section>
      </Container>
    </div>
  );
}

async function loadCatalog(): Promise<{ catalog: Catalog; error: string | null }> {
  try {
    return { catalog: await fetchCatalog(), error: null };
  } catch (cause) {
    const message =
      cause instanceof MaterialHubError
        ? cause.message
        : "素材目录暂时不可用，请稍后刷新。";
    console.error("Home page catalog load failed", cause);
    return { catalog: { categories: [], templates: [] }, error: message };
  }
}

/**
 * Hero.
 *
 * Reproduces the reference header block: 52px/700 title at -2.5px tracking, a
 * 60%-white supporting line, then a 40px white pill primary action beside a
 * translucent secondary one. The featured template sits in a 320px-wide,
 * 12px-radius tile at 5% white on the right.
 */
function Hero({ featured, total }: { featured: Template | null; total: number }) {
  return (
    <Container className="pt-14 sm:pt-20">
      <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-[624px]">
          <Eyebrow>
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            {total > 0 ? `${total} 个模板已上线` : "宠物图生图与图生视频"}
          </Eyebrow>

          <h1 className="mt-6 text-4xl leading-[1.12] font-bold tracking-[-2px] text-ink-50 sm:text-display">
            一张宠物照片，
            <br />
            生成图生图与图生视频
          </h1>

          <p className="mt-6 max-w-[560px] text-base leading-7 text-white/60">
            挑一个模板，上传一张照片，剩下的交给 AI。图生图 10 积分、图生视频 50 积分，
            生成结果随时在「我的作品」里查看和下载。
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="#templates" size="lg">
              开始创作
            </ButtonLink>
            <ButtonLink href="/pricing" variant="secondary" size="lg">
              查看定价
            </ButtonLink>
          </div>
        </div>

        {featured ? (
          <div className="w-full max-w-[320px] shrink-0 self-center lg:self-auto">
            <div className="relative overflow-hidden rounded-panel bg-white/5">
              <Link href={`/templates/${encodeURIComponent(featured.id)}`} className="group block">
                <div className="relative aspect-4/5">
                  {featured.kind === "video" ? (
                    <video
                      src={featured.previewUrl || featured.coverUrl}
                      poster={featured.coverUrl || undefined}
                      className="size-full object-cover"
                      muted
                      loop
                      playsInline
                      autoPlay
                      preload="metadata"
                    />
                  ) : (
                    // Catalog media hostnames are configured at deploy time.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featured.afterImageUrl || featured.previewUrl || featured.coverUrl}
                      alt={featured.title}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pt-12 pb-4">
                    <p className="text-micro text-white/60">
                      {featured.kind === "image" ? "图生图" : "图生视频"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-title text-ink-50">{featured.title}</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </Container>
  );
}

function HowItWorks() {
  const steps = [
    { title: "挑模板", body: "图生图做效果图，图生视频做短片。每个模板都带一条写好的提示词。" },
    { title: "传照片", body: "上传一张清晰的宠物照片，支持 JPEG、PNG 和 HEIC，最大 15MB。" },
    { title: "生成与下载", body: "确认积分后开始生成，进度实时可见，完成后直接下载成品。" }
  ];

  return (
    <section className="flex flex-col gap-8">
      <SectionHeading title="三步完成" description="不需要剪辑经验，也不需要写提示词。" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <Panel key={step.title} className="flex flex-col gap-3 p-6">
            <span className="flex size-7 items-center justify-center rounded-full bg-white/8 text-micro font-medium text-ink-100">
              {index + 1}
            </span>
            <p className="text-base font-medium text-ink-50">{step.title}</p>
            <p className="text-nav leading-6 text-white/55">{step.body}</p>
          </Panel>
        ))}
      </div>
    </section>
  );
}

function CatalogUnavailable({ message }: { message: string }) {
  return (
    <Panel className="flex flex-col gap-3 p-8">
      <p className="text-base font-medium text-ink-50">素材目录暂时不可用</p>
      <p className="max-w-xl text-nav leading-6 text-white/55">{message}</p>
      <p className="max-w-xl text-micro leading-5 text-white/35">
        如果这是本地开发环境，请确认已在 <code className="text-white/60">.env.local</code> 中配置
        MATERIAL_HUB_API_KEY（素材中心的产品只读 Key）。
      </p>
    </Panel>
  );
}
