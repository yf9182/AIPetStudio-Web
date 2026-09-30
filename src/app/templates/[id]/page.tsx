import Link from "next/link";
import { notFound } from "next/navigation";
import { TemplateActions } from "@/components/generate/TemplateActions";
import { TemplateGrid } from "@/components/catalog/TemplateCard";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumbs, Container, Panel, SectionHeading } from "@/components/ui/Layout";
import { fetchCatalog, fetchTemplate, MaterialHubError } from "@/lib/material-hub";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const template = await fetchTemplate(id);
    if (!template) return { title: "模板不存在" };
    return {
      title: template.title,
      description: template.prompt.slice(0, 160),
      openGraph: { title: template.title, description: template.prompt.slice(0, 160) }
    };
  } catch {
    return { title: "模板" };
  }
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let template = null;
  let related: Awaited<ReturnType<typeof fetchCatalog>>["templates"] = [];
  let unavailable: string | null = null;

  try {
    template = await fetchTemplate(id);
    if (template) {
      const catalog = await fetchCatalog();
      related = catalog.templates
        .filter((item) => item.id !== template!.id && item.kind === template!.kind)
        .slice(0, 3);
    }
  } catch (cause) {
    unavailable = cause instanceof MaterialHubError ? cause.message : "素材目录暂时不可用";
  }

  if (unavailable) {
    return (
      <Container className="py-20">
        <Panel className="flex flex-col items-start gap-3 p-8">
          <p className="text-base font-medium text-ink-50">素材目录暂时不可用</p>
          <p className="text-nav text-white/55">{unavailable}</p>
          <ButtonLink href="/" variant="secondary" size="md" className="mt-2">
            返回模板库
          </ButtonLink>
        </Panel>
      </Container>
    );
  }

  if (!template) notFound();

  const cost = template.kind === "image" ? 10 : 50;
  const media = template.previewUrl || template.coverUrl;

  return (
    <Container className="flex flex-col gap-16 py-10">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
        <div className="min-w-0 flex-1">
          <Breadcrumbs
            items={[
              { label: "模板库", href: "/" },
              { label: template.categoryName || (template.kind === "image" ? "图生图" : "图生视频") },
              { label: template.title }
            ]}
          />

          <h1 className="mt-6 text-3xl leading-[1.15] font-bold tracking-[-1.6px] text-ink-50 sm:text-headline">
            {template.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Tag>{template.kind === "image" ? "图生图" : "图生视频"}</Tag>
            <Tag>{cost} 积分 / 次</Tag>
            <Tag>需要 1 张参考图</Tag>
            {template.isHot ? <Tag tone="brand">热门</Tag> : null}
            {template.videoResolution ? <Tag>{template.videoResolution}</Tag> : null}
          </div>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/60">
            {template.kind === "image"
              ? "上传一张宠物照片，模板会按下面这条提示词生成一张效果图。"
              : "上传一张宠物照片，模板会按下面这条提示词生成一段短视频。"}
          </p>

          <div className="mt-8">
            <TemplateActions template={template} />
          </div>

          <div className="mt-10">
            <p className="text-micro text-white/50">模板提示词</p>
            <div className="mt-3 rounded-panel bg-ink-800 p-4">
              <p className="text-[15px] leading-6 text-white/85">{template.prompt}</p>
            </div>
            <p className="mt-3 text-micro leading-5 text-white/35">
              提示词由模板提供，生成时直接使用，不能在网页端修改。
            </p>
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-[380px]">
          <div className="relative overflow-hidden rounded-panel-lg bg-white/5">
            {template.kind === "video" ? (
              <video
                src={media}
                poster={template.coverUrl || undefined}
                className="w-full"
                controls
                playsInline
                loop
                muted
                preload="metadata"
              />
            ) : template.coverType === 1 && template.beforeImageUrl && template.afterImageUrl ? (
              <div className="grid grid-cols-2 gap-px">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element -- catalog CDN host is deploy-time configured */}
                  <img src={template.beforeImageUrl} alt={`${template.title} 原图`} className="w-full object-cover" />
                  <p className="py-2 text-center text-micro text-white/45">原图</p>
                </div>
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element -- catalog CDN host is deploy-time configured */}
                  <img src={template.afterImageUrl} alt={`${template.title} 效果`} className="w-full object-cover" />
                  <p className="py-2 text-center text-micro text-white/45">效果</p>
                </div>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- catalog CDN host is deploy-time configured
              <img src={media} alt={template.title} className="w-full object-cover" />
            )}
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="flex flex-col gap-8">
          <SectionHeading
            title="你可能也喜欢"
            action={
              <ButtonLink href="/" variant="outline" size="md">
                浏览全部模板
              </ButtonLink>
            }
          />
          <TemplateGrid templates={related} />
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <SectionHeading title="继续探索" />
          <p className="text-nav text-white/55">
            素材中心暂时没有同类模板。
            <Link href="/" className="ml-1 text-white underline-offset-2 hover:underline">
              返回模板库
            </Link>
          </p>
        </section>
      )}
    </Container>
  );
}

function Tag({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "brand" }) {
  return (
    <span
      className={
        tone === "brand"
          ? "rounded-full bg-brand-soft px-3 py-1 text-micro font-medium text-brand"
          : "rounded-full border border-white/15 px-3 py-1 text-micro text-ink-200"
      }
    >
      {children}
    </span>
  );
}
