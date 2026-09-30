import { TaskList } from "@/components/tasks/TaskList";
import { ButtonLink } from "@/components/ui/Button";
import { Container, SectionHeading } from "@/components/ui/Layout";
import { getWorkerSessionOrNull } from "@/lib/worker-session";
import { fetchTasks, WorkerError, type WorkerTaskList } from "@/lib/worker";
import { SignInRequired } from "@/components/site/SignInRequired";

export const dynamic = "force-dynamic";
export const metadata = { title: "我的作品" };

export default async function TasksPage() {
  const session = await getWorkerSessionOrNull();

  if (!session) {
    return (
      <Container className="py-16">
        <SignInRequired
          title="登录后查看你的作品"
          description="作品、生成进度和积分都保存在账号里，登录即可查看。"
        />
      </Container>
    );
  }

  let initial: WorkerTaskList | null = null;
  let error: string | null = null;

  try {
    initial = await fetchTasks(session.token, { limit: 50 });
  } catch (cause) {
    error = cause instanceof WorkerError ? cause.message : "暂时无法读取作品列表";
  }

  return (
    <Container className="flex flex-col gap-8 py-12">
      <SectionHeading
        title="我的作品"
        description="所有生成记录都在这里，进度会自动刷新。"
        action={
          <ButtonLink href="/#templates" size="md">
            新建作品
          </ButtonLink>
        }
      />

      {error || !initial ? (
        <div className="rounded-panel-lg bg-white/4 p-8">
          <p className="text-base font-medium text-ink-50">暂时无法读取作品列表</p>
          <p className="mt-2 text-nav text-white/55">{error}</p>
        </div>
      ) : (
        <TaskList initial={initial} />
      )}
    </Container>
  );
}
