import { notFound } from "next/navigation";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { Breadcrumbs, Container } from "@/components/ui/Layout";
import { SignInRequired } from "@/components/site/SignInRequired";
import { getWorkerSessionOrNull } from "@/lib/worker-session";
import { fetchTask, WorkerError, type WorkerTask } from "@/lib/worker";

export const dynamic = "force-dynamic";

export const metadata = { title: "生成结果" };

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getWorkerSessionOrNull();

  if (!session) {
    return (
      <Container className="py-16">
        <SignInRequired title="登录后查看生成结果" description="作品保存在账号里，登录即可查看。" />
      </Container>
    );
  }

  let task: WorkerTask | null = null;
  let notFoundError = false;

  try {
    task = await fetchTask(session.token, id);
  } catch (cause) {
    if (cause instanceof WorkerError && cause.status === 404) notFoundError = true;
    else throw cause;
  }

  if (notFoundError || !task) notFound();

  return (
    <Container className="flex flex-col gap-8 py-10">
      <Breadcrumbs
        items={[
          { label: "我的作品", href: "/tasks" },
          { label: task.template_title || "自定义任务" }
        ]}
      />
      <TaskDetail initial={task} />
    </Container>
  );
}
