import { setInfiniteScrollHovered } from "~/client/utils";
import TranslatingGroup from "./TranslatingGroup";

export default function InfiniteScroll() {
  return (
    <div class="flex-none overflow-hidden">
      <div class="flex overflow-hidden group">
        <TranslatingGroup />
        <TranslatingGroup aria-hidden />
      </div>
    </div>
  );
}
