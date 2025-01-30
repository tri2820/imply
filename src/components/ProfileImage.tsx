export default function ProfileImage(props: {
  size?:
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl";
}) {
  const sizeClass = {
    xs: "h-4 w-4",
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
    "2xl": "h-20 w-20",
    "3xl": "h-24 w-24",
    "4xl": "h-28 w-28",
    "5xl": "h-32 w-32",
    "6xl": "h-36 w-36",
  }[props.size ?? "md"];

  return (
    <div
      class={
        " bg-neutral-800 border rounded-full border-neutral-800 flex-none " +
        sizeClass
      }
    />
  );
}
