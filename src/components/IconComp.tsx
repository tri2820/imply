export default function IconComp(props: {
  size?: "sm" | "md" | "lg" | "xs" | "tiny";
  inline?: boolean;
}) {
  const sizeCls = {
    tiny: "w-2 h-2",
    xs: "w-4 h-4",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  }[props.size ?? "md"];

  return (
    <img
      src="/logo.svg"
      class={`${sizeCls} flex-none ${props.inline ? "inline-block" : ""}`}
      style={{
        "border-radius": "20%",
      }}
    />
  );
}
