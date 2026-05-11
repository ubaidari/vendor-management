import React from "react";
import { PortalPlaceholderScreen } from "@/components/PortalPlaceholderScreen";

const VendorHistoryScreen: React.FC = () => {
  return (
    <PortalPlaceholderScreen
      icon="history"
      title="History"
      subtitle="Review completed tasks and past activity."
      links={[
        { href: "/vendor/my-tasks", label: "Back to My Tasks" },
        { href: "/vendor/task-detail", label: "Open Task Detail" }
      ]}
    />
  );
};

export default VendorHistoryScreen;
