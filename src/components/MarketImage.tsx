export default function MarketImage(props: { size?: "sm" | "md" }) {
  const size = props.size ?? "md";
  return (
    <img
      src="/whitehouse.jpg"
      alt="logo"
      data-size={size}
      class="w-24 h-24 data-[size=sm]:w-12 data-[size=sm]:h-12 bg-neutral-800 rounded border border-neutral-800 flex-none"
    />
  );
}
