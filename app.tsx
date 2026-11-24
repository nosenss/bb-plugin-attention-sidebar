import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { AttentionThreadList } from "./components/thread-list";
import { t } from "./lib/i18n";

export default definePluginApp((app) => {
  app.slots.experimental_threadList({
    id: "attention",
    title: t().slotTitle,
    description: t().slotDescription,
    component: AttentionThreadList,
  });
});
