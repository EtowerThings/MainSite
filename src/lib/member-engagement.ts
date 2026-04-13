type ProjectLike = { status?: string; teamMembers?: { uid: string }[] };
type ResourceLike = { uploadedBy?: string; uploadedById?: string | null };

/** Projects in the `projects` collection where the user is on the team. */
export function countMemberProjects(projects: ProjectLike[], memberId: string): number {
    if (!memberId) return 0;
    let n = 0;
    for (const p of projects) {
        if (p.teamMembers?.some((m) => m.uid === memberId)) n++;
    }
    return n;
}

/**
 * Resource rows this user created. Client uploads set `uploadedById`;
 * `/api/resources` stores the Firebase uid in `uploadedBy` only.
 * Falls back to matching `uploadedBy` to display name for older rows.
 */
export function countMemberUploads(
    resources: ResourceLike[],
    memberId: string,
    displayName?: string | null
): number {
    if (!memberId) return 0;
    const name = displayName?.trim();
    let n = 0;
    for (const r of resources) {
        if (r.uploadedById && r.uploadedById === memberId) {
            n++;
            continue;
        }
        if (r.uploadedBy === memberId) {
            n++;
            continue;
        }
        if (name && r.uploadedBy === name) {
            n++;
        }
    }
    return n;
}

/** Pitch proposals: team projects still in ideation. */
export function countMemberPitchProposals(projects: ProjectLike[], memberId: string): number {
    if (!memberId) return 0;
    let n = 0;
    for (const p of projects) {
        if (p.status?.toLowerCase() !== "ideation") continue;
        if (p.teamMembers?.some((m) => m.uid === memberId)) n++;
    }
    return n;
}
