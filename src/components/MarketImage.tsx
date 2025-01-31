export default function MarketImage(props: { size?: "sm" | "md" }) {
  const sizeClass = {
    sm: "w-12 h-12",
    md: "w-24 h-24",
  }[props.size ?? "md"];
  return (
    <img
      src="/whitehouse.jpg"
      alt="market image"
      class={
        "bg-neutral-800 rounded border border-neutral-800 flex-none " +
        sizeClass
      }
    />
  );
}
