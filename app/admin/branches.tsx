import React from "react";
import { PortalPlaceholderScreen } from "@/components/PortalPlaceholderScreen";

const AdminBranchesScreen: React.FC = () => {
  return (
    <PortalPlaceholderScreen
      icon="account-tree"
      title="Branches"
      subtitle="Manage branch-level operations and configurations."
      links={[
        { href: "/admin/dashboard", label: "Back to Dashboard" },
        { href: "/admin/tasks", label: "Open Tasks" }
      ]}
    />
  );
};

export default AdminBranchesScreen;
