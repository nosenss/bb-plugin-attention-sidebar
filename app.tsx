import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { AttentionThreadList } from "./components/thread-list";

export default definePluginApp((app) => {
  app.slots.experimental_threadList({
    id: "attention",
    title: "Ждут вас + папки проектов",
    description:
      "«Ждут вас» и «В работе» из всех проектов над сворачиваемыми папками проектов; аватары проектов вместо иконок провайдеров.",
    component: AttentionThreadList,
  });
});
