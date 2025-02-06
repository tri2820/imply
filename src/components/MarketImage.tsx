import MaybeImage from "./Image";

export default function MarketImage(props: {
  src: string;
  size?: "sm" | "md";
}) {
  const sizeClass = {
    sm: "w-12 h-12",
    md: "w-24 h-24",
  }[props.size ?? "md"];
  return (
    <MaybeImage
      src={props.src}
      alt="market image"
      class={
        "object-cover bg-neutral-800 rounded border-2 border-white flex-none " +
        sizeClass
      }
    />
  );
}
