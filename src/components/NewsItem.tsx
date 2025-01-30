import { BsNewspaper } from "solid-icons/bs";

export default function NewsItem(props: {
  n: { title: string; "aria-hidden"?: boolean };
}) {
  return (
    <a
      href="https://google.com"
      class="hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div
        class="flex items-center space-x-2 px-2  py-1"
        aria-hidden={props.n["aria-hidden"]}
      >
        <BsNewspaper />
        <div class="whitespace-nowrap">{props.n.title}</div>
      </div>
    </a>
  );
}
