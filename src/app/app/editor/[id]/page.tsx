import { redirect } from "next/navigation";
import { db } from "@/lib/db";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClipEditorRedirect({ params }: PageProps) {
  const { id } = await params;
  const result = db.getClip(id);
  if (result) {
    redirect(`/project/${result.project.id}#${id}`);
  }
  redirect("/app");
}
