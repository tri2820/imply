import { TbLoader2 } from "solid-icons/tb";

export default function Spinner(props: { size?: "sm" | "md" | "lg" }) {
  const sizeCls = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }[props.size ?? "md"];
  return (
    <div class="animate-fade-in">
      <TbLoader2 class={`${sizeCls} animate-spin `} />
    </div>
  );
}
