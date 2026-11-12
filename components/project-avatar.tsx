import { memo } from "react";
import { projectAvatarStyle, projectInitials } from "../lib/avatar";

export const ProjectAvatar = memo(function ProjectAvatar({
  projectId,
  name,
  isPersonal,
}: {
  projectId: string;
  name: string;
  isPersonal: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      title={name}
      data-project-avatar={projectId}
      className="inline-flex size-[18px] shrink-0 select-none items-center justify-center rounded-full text-[9px] font-semibold leading-none tracking-tight"
      style={projectAvatarStyle(projectId)}
    >
      {projectInitials(name, isPersonal)}
    </span>
  );
});
